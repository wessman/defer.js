// ==ClosureCompiler==
// @output_file_name defer.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

/** @license
 * "defer.js" is a trademark of Ian J. Wessman
 *
 * Copyright 2011-2012 Ian J. Wessman
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * v.1.1
 */

/*  // This error struct exists for developer documentation,
    // and needn't be included for production purposes.
	errors
	enum {string}

var deferErrors =
{
	"defer:01" : "defer: invalid predicate (must be a function)" ,
	"defer:02" : "defer: handler must be a function" ,
	"defer:03" : "defer: an interval of less than 10ms is inadvisable" ,
	"defer:04" : "defer: execution of handler instance failed" ,
};*/


/**
	@define {boolean}
*/
var _debug = false;

/**
	@define {boolean}
*/
var _robustIEReady = true;

(function(window,deferQueue){
	/**
		@const 
		@type {boolean}
	*/
	var YES = true;
	
	/**
		@const 
		@type {boolean}
	*/
	var NO = false;
	
	/**
		@const 
		@type {undefined}
	*/
	var undefined;
	
	/**
		@const 
		@type {string}
	*/
	var kVersion = "1.1";
	
	/**
		@const 
		@type {string}
	*/
	var kErrorPrefix = "defer:";

	
	
	// CLOSURE VARS
	
	/** @type {Object} */
	var _deferences = {};				// hash for active _deferInstances.
	
	/** @type {number} */
	var _deferenceCounter = 100;		// for generating non-conflicting _deferInstance IDs
	
	/** @type {boolean} */
	var _isReady = NO;				// is the DOM in a ready/usable state?
	
	/** @type {boolean} */
	var _isIE = (!!window.document.detachEvent);
	
	// CONSTANTS
	
	/** @const @type {string} */
	var kDOMContentLoaded = "DOMContentLoaded";
	
	/** @const @type {string} */
	var kReadyStateChange = "readystatechange";
	
	/** @const @type {string} */
	var kOnReadyStateChange = "on"+kReadyStateChange;
	
	/** @const @type {string} */
	var kComplete = "complete";
	
	/** @const @type {string} */
	var kLoad = "load";
	
	/** @const @type {string} */
	var kType = "type";
	
	/** @const @type {string} */
	var kReady = "ready";
	
	/** @const @type {string} */
	var kP = "p";
	
	/** @const @type {string} */
	var kPredicate = "predicate";
	
	/** @const @type {string} */
	var kH = "h";
	
	/** @const @type {string} */
	var kHandler = "handler";
	
	/** @const @type {string} */
	var kO = "o";
	
	/** @const @type {string} */
	var kOptions = "options";
	
	/*#pragma mark utility functions */
	
	/**
		@param {*} item
		@return {boolean}
	*/
	var isNil = function isNil( item )
	{
		return item === undefined || item === null;
	};
	
	/**
		@param {*} func
		@return {boolean}
	*/
	function isFunction( func )
	{
		// instanceof Function ???
		return !isNil( func ) && ( func instanceof Object ) && ( isNil( func.__proto__ ) ? !isNil( func.call ) : !isNil( func.__proto__.call ) );
	};
	
	/**
		@param {string} message
		@param {*=} obj opt_argument
	*/
	function log( message , obj )
	{
		if( _debug === YES )
		{
			var console = window.console;
			if( !isNil(console) && isFunction(console.log) )
			{
				if( isNil(obj) )
				{
					console.log( message );
				} else {
					console.log( message , obj );
				};
				
				//if( _debug === YES && !isNil(console["trace"] ) ) console["trace"]();
			};
		};
	};
	
	/**
		@param {*} context
		@param {Object} dictionary
		@param {*} handler
	*/
	function forIn( context , dictionary , handler )
	{
		for( var key in dictionary )
		{
			if( Object.prototype.hasOwnProperty.call( dictionary , key ) === YES )
			{
				handler.call( context , key , dictionary[key] );
			};
		};
	};
	
	/**
		@param {*} obj
		@param {string} type
		@param {*} listener
		@param {boolean} capture
		@return {boolean}
	*/
	function addEventListener( obj , type , listener , capture )
	{
		var useCapture = !!capture;
	
		if( !isNil( obj.addEventListener ) )
		{
			// WebKit, Moz, etc.
			obj.addEventListener( type , listener , useCapture );
		} else if (_isIE) {
			useCapture = NO;
			obj.attachEvent( type , listener );
		};
		
		return useCapture;
	};
	
	
	/**
		@param {*} obj
		@param {string} type
		@param {*} listener
		@param {boolean} capture
		@return {boolean}
	*/
	function removeEventListener( obj , type , listener , capture )
	{	
		var useCapture = !!capture;
		
		if( !isNil( obj.removeEventListener ) )
		{
			// WebKit, Moz, etc.
			obj.addEventListener( type , listener , useCapture );
		} else if (_isIE) {
			useCapture = NO;
			obj.detachEvent( type , listener );
		};
		
		return useCapture;
	};
	
	/**
		@param {string} src
		@param {string} async
	*/
	function appendScript( src , async )
	{
		var script	= document.createElement( "script" );
		
		if( !!script )
		{
			script.type	= "text/javascript";
			script.src	= src;
			
			if( !isNil( async ) && ( async === "async" || async === "defer" ) )
			{
				script[async] = async;
			};
			
			document.body.appendChild( script );
		} else {
			log( "Unable to append script" );
		};
	};
	
	/*#pragma mark objects & methods */
	
	/** 
		@param {Object|string} predicate
		@param {Object} handler
		@param {Object} options
		@return {number} The defer instance id
	*/
	function defer( predicate , handler , options )
	{
		/** @type {_deferInstance} */
		var newDefer = new _deferInstance( predicate , handler , options );
		
		if( newDefer.completed === YES  )
		{
			// if we're already good, no need to defer
			return 0;
		} else {	// nope, defer.
			_deferences[newDefer.id] = newDefer;
			return newDefer.id;
		};
	};
	
	/**
		@protected
		@param {number} deferID
		@return {boolean}
	*/
	function cancelInstance( deferID )
	{
		log("defer.cancel");
		
		var success = NO;
		
		var instance = _deferences[deferID];
		
		if( !isNil( instance ) )
		{
			instance.completed = YES;
			success = YES;
		};
		
		return success;
	};
	
	/** 
		@protected 
		@param {number} id
	*/
	function destroyInstance( id )
	{
		window.setTimeout( 	function destroyInstanceImmediately(){_deferences[id]=null; delete _deferences[id];} , 0 );
	};
	
	/**
		@protected
		@return {boolean}
	*/
	function returnTrue()
	{
		return true;
	};
	
	/**
		@protected
		@param {Object} func
		@param {Object} context
		@param {boolean} shouldThrowError
		@param {string} errorText
	*/
	function safeCall( func , context , shouldThrowError , errorText )
	{
		var result = NO;
		
		if( isNil(context) ) context = window;
	
		try
		{
			result = func.call(context);
		} catch(e) {
			if( _debug === YES )
			{
				log( e );
			};
		
			if( shouldThrowError === YES )
			{
				//log( func.toString() , e );
				var err = new Error(errorText);
				err.originalError = e;
				//log( func.toString() , e , func );
				//throw err;
				throw e;
			};
		};
		
		return result;
	};
	
	/** 
		@constructor 
		@protected
		@param {Object|string} thePredicate
		@param {Object} theHandler
		@param {Object} theOptions
	*/
	function _deferInstance( thePredicate , theHandler, theOptions ){

		if( thePredicate === kReady )
		{
			thePredicate = returnTrue;
		} else if( !isFunction(thePredicate) ) {
			throw new Error( kErrorPrefix+"01" );
		};
		if( !isFunction(theHandler) ) throw new Error( kErrorPrefix+"02" );

		var self = this, timeoutValue = null, selfOptions = theOptions || {};
		
		/** protected */
		self.id				= _deferenceCounter++;
		/** protected */
		self.predicate		= thePredicate;
		/** protected */
		self.handler		= theHandler;
		
		//OPTIONS
		
		/** protected */
		selfOptions.interval = theOptions["interval"] || 50;//ms
		if( selfOptions.interval < 10 ) log( kErrorPrefix+"03" );
		//log( "interval: " + self.options.interval );
		/** protected */
		selfOptions.timeout = theOptions["timeout"] || 15000;//ms
		//log( "timeout: " + self.options.timeout );
		
		self.options = selfOptions;
		
		
		/** protected */
		self.testDOMReady	= isNil(theOptions["testDOMReady"]) ? YES : !!theOptions["testDOMReady"];	// defaults to YES
		/** protected */
		self.timeoutID		= null;
		/** protected */
		self.timeoutMS		= null;
		/** protected */
		self.completed		= NO;
		/** protected */
		self.readyBlocked	= NO;

		var firstTest;

		if( self.testDOMReady === YES && _isReady === YES )		// check DOM state first
		{
			firstTest = self.test();
		};
		
		if( firstTest === YES )
		{	// no need to defer
			log( "firstTest, not deferred" );
			self.resultHandler(firstTest);
		} else {
			self.setTimeout();
		};
		delete firstTest;

	};
	
	/*
		@protected
		@return {boolean}
	*/
	_deferInstance.prototype.test = function _deferInstance_test()
	{
		return safeCall( this.predicate , null , NO , "" );
	};
	
	/**
		@protected
		@param {boolean} result
	*/
	_deferInstance.prototype.resultHandler = function _deferInstance_resultHandler(result)
	{
		var self = this;
		if( result === YES )
		{			
			//clear settimeout (if any)
			self.clearTimeout();
			
			//execute handler

			try
			{
				safeCall( self.handler , self.options["handlerContext"] , YES , kErrorPrefix+"04:" + self.id );
			} catch(e) {
				// bubble up
				throw e;
			};

			self.completed = YES;
			
			//remove self from deferences
			destroyInstance( self.id );
		} else {
			// clear old timeout
			self.clearTimeout();
			// wind up again
			self.timeoutID = self.setTimeout();
		};
	};
	
	/** @protected */
	_deferInstance.prototype.setTimeout = function _deferInstance_setTimeout()
	{
	
		var self = this , timeout = self.options["timeout"];
		if( timeout != undefined && !isNaN(timeout) )
		{
			//log( "hastimeout" );						
			if( self.timeoutMS === null )
			{
				// set this on first run
				self.timeoutMS = (+new Date())+timeout;
			};
			
			if( self.timeoutMS > (+new Date()) )
			{
				if( self.completed === NO )
				{
					// do it again				
					self.timeoutID = window.setTimeout( function _deferInstance_setTimeout_impl_set(){self.resultHandler(self.test());} , self.options.interval );
					
					log( "setTimeout" );
				};
			} else {
				log("timed out" , this);
				
				var failedHandler = self.options["onFail"];
				
				if( isFunction(failedHandler) )
				{
					safeCall( failedHandler , null , NO , "" );
				};

				destroyInstance( self.id );
			};
		};
		
	};
	
	/** @protected */
	_deferInstance.prototype.clearTimeout = function()
	{
		if( !isNaN(this.timeoutID) ) window.clearTimeout(this.timeoutID);
	};
	
	defer["isFunction"]			= isFunction;
	defer["isNil"]				= isNil;
	defer["log"]				= log;
	defer["forOwnIn"]			= forIn;
	defer["cancel"]				= cancelInstance;
	defer["appendScript"]		= appendScript;
	defer["addEventListener"]	= addEventListener;
	defer["removeEventListener"]= removeEventListener;
	
	
	/*#pragma mark readystate */

	/**
		@protected
	*/
	function runReadyBlocked()
	{
		log("runReadyBlocked, remaining:" ,_deferences );
		
		forIn( this , _deferences , function enumerateDeferences(key,instance){
				if( !isNil(instance) && instance.completed === NO && instance.readyBlocked === YES )
				{	log( "readyBlocked:continue",instance );
					instance.setTimeout();
				};
			} );
			
		log( "runReadyBlocked completed:" , _deferences );
	};
	
	/**
		@protected
		@param {Object=} ev opt_argument
		@return {boolean}
	*/
	var isReady = function isReady( ev )
	{
		return ( _isReady === YES ) ? YES : setReady(handleReady(ev));
	};
	defer["isReady"] = isReady;
	
	/**
		@protected
		@return {string}
	*/
	function defer_version(){
		return kVersion;
	};
	defer["version"] = defer_version;
	
	/**
		@protected
		@param {boolean} value
	*/
	function setReady(value)
	{
		var oldReady = !!_isReady;
		if( value === YES )
		{
			_isReady = YES;
			
			if( oldReady != _isReady )		// if ready state changed
			{
				//assert( oldReady === NO );
				//assert( _isReady === YES );
				
				//restart all _deferInstances, if they're ready-blocked
				runReadyBlocked();
			};
		};
		
		delete oldReady;
		return _isReady;
	};
	
	/**
		@protected
		@param {Object=} ev opt_argument
	*/
	function handleReady( ev )
	{	//log(ev);
		// insubstantial portions of ready code inspired by jQuery, under the MIT license
		// <https://github.com/jquery/jquery/blob/master/src/core.js>
		
		var doc = window.document;
    		
		if( _isReady === YES || doc.readyState === kComplete )
		{	//log("DOM Ready");
			return YES;
		};
        
        
		
		if( !isNil(ev) && !isNil(ev[kType]) )
		{
			var returnValue = NO;
			switch( ev[kType] )
			{
				case	kDOMContentLoaded:
				case	kLoad :
						returnValue = ( ev.returnValue === YES ); break;
				case	kReadyStateChange :
						if( ev.readyState === kComplete ) returnValue = YES;
						break;
			};
			
			if( returnValue === YES )
			{
				// clean up event handlers
				
				removeEventListener( doc , ( !!_isIE ? kDOMContentLoaded : kOnReadyStateChange ) , handleReady , NO );
				removeEventListener( window , kLoad , handleReady , NO );
			};
				
			return returnValue;
		} else {	// add event handlers
		
			// A fallback to window.onload, that will always work
			addEventListener( window , kLoad , handleReady , NO );
		
			// Mozilla, Opera and webkit nightlies currently support this event
			if ( !!(doc.addEventListener) ) {
				// Use the handy event callback
				addEventListener( doc , kDOMContentLoaded , handleReady , NO );
	
			// If IE event model is used
			} else if ( _isIE ) {
				// ensure firing before onload,
				// maybe late but safe also for iframes
				addEventListener( doc , kOnReadyStateChange , handleReady , NO );
				
				if( _robustIEReady === YES )
				{
					// If IE and not a frame
					// continually check to see if the document is ready
					var toplevel = NO;
		
					try {
						toplevel = window.frameElement === null;
					} catch(e) {;}
					
					// IE Scroll hack
					if( toplevel === YES )
					{
						defer( 
							function IEScrollHackPredicate(){
								doc.documentElement.doScroll("left");
								/* failure of the line above will result in a failed predicate test */
								return YES;
							} , 
							function IEScrollHackHandler(){ setReady(YES); } , 
							{ testDOMReady:NO }
						);
					};
				};
			};
		};
		
		return NO;
	};
	
	//#pragma init
	
	defer( function DOMReadyDeference(){ return !!window.document } , isReady , { interval:10 , testDOMReady:NO } );
	
	//#pragma deferQueue
	
		/**
			@type {Array}
		*/
		deferQueue = deferQueue || [];
		
		/** 
			@protected
		*/
		function acceptDeferQueue()
		{		
			for( var i=0 ; i < deferQueue.length ; i++ )
			{
				processDeferQueueItem( deferQueue.shift() );
			};
		};
		
		/** 
			@protected
			@return {boolean}
		*/
		function processDeferQueueItem( item )
		{
			/** @type {boolean} */
			var success = NO;
		
			/** @type {Object|string} */
			var predicate;
			/** @type {Object} */
			var handler;
			/** @type {Object} */
			var options;
			
			if( item[kPredicate] === kReady || item[kP] === kReady )
			{
				// pass-through so we don't have to do extraneous isFunction tests later
				predicate = kReady;
			}
			else if( !isNil(item[kPredicate]) )
			{
				predicate = item[kPredicate];
			} else if( !isNil( item[kP] ) ) {
				predicate = item[kP]
			} else {
				//todo: assert !isNil(predicate);
				return success;
			};
			
			if( !isNil(item[kHandler]) )
			{
				handler = item[kHandler];
			} else if( !isNil( item[kH] ) ) {
				handler = item[kH]
			} else {
				//todo: assert !isNil(predicate);
				return success;
			};
			
			if( !isNil(item[kOptions]) )
			{
				options = item[kOptions];
			} else if( !isNil( item[kO] ) ) {
				options = item[kO]
			} else {
				//todo: assert !isNil(predicate);
				return success;
			};
			
			defer( predicate , handler , options );
			
			success = YES;			
			log( "successful processDeferQueueItem" );
			return success;
		};

		log("begin first accept");
		while( deferQueue.length > 0)	//process in batches, until we're sure no one gets forgotten. necessary when we're loading defer.js itself asynchronously
		{
			acceptDeferQueue();
		};
		log("end first accept");
		
		if( _debug === YES && deferQueue.length > 0 )
		{
				alert( "leftover:\t" + deferQueue.length );
				log( "leftover:\t" + deferQueue.length , deferQueue );
		};
		
		defer.push = processDeferQueueItem;
		
	window["defer"]		= defer;
})(window,window["defer"]);
