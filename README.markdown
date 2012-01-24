# defer.js #

**Async Everything**

defer.js is a tiny boot-strapper that allows you to make all loading of JavaScript on your page asynchronous. Yes, everything.

Packed in less than 2kB (gzipped), defer.js is a predicate-based execution engine. You give it a rule, and once the condition is met, any hunk of JS you've got will be run. It's that simple.

Using predicates to let all your JS load asynchronously is just a welcome side-effect.

An example:

    defer( {
        predicate:  function(){ return condition === true; } ,
        handler:    function(){ runThisCode(); } ,
        options:    {}
    } );
    // you can load the external script you just referenced, even after-the-fact

## Huh? ##
 * Load any script you'd like asynchronously, even libraries like jQuery
 * With all-async code, the 'meat' of your page will **load faster**, especially on mobile devices. Text and images don't have to wait for scripts before loading.
 * Put code on the page where you need to, even if that's *before your libraries!*

## Why async & deferred JS is important ##

**Make pages feel _faster_.**

Loading your code asynchronously allows your browser to load every resource it can as quickly as possible, often in parallel. This includes images, stylesheets, etc. It also means no blocking &#8212; your browsing experience needn't wait for code you may not need yet.

Google's Page Speed documentation explains the benefits of [asynchronous](http://code.google.com/speed/page-speed/docs/rtt.html#PreferAsyncResources) and [deferred](http://code.google.com/speed/page-speed/docs/payload.html#DeferLoadingJS) loading in more technical detail.

## Origin ##

A year ago, I was considering how Google Analytics stores data in-page  before its own code had loaded. If you've never seen it before, it looks like this:

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-XXXXXXX-X']);
    _gaq.push(['_trackPageview']);
		
    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();

By cleverly abusing an array, they store your configuration information while only using a single, oddly-named global variable. Not bad.

On a separate tangent, I had stuck in my head a problem that popped up in a recent project. The site in question broke various page elements into components. Sometimes, data was fetched in the execution of these components, and needed to be passed to JS on that page. Someone proposed that we load the data via AJAX, but that seemed horrible. We didn't need a second HTTP roundtrip, or a second fetch of data from the DB. Data attributes weren't (and still aren't) sufficiently widespread to be of use. We threw the data in a custom object, in-page, referenced later by other code and called it a day.

We had wasted a global variable (not ideal), but it worked. Of course, this only worked for storing simple data, unless the massive site code got loaded first. Doing so isn't great for performance.

I wanted a way to defer executing that code until the framework code it depended on was good and ready. To make it universal, a custom function's return value could be used as the predicate.

The first draft of defer.js was all about predicates. Then, I realized we could use those facilities to let defer.js load itself.

##Wait, it loads itself? ##

More or less, yes.

defer.js uses a single global variable for everything: <code>window.defer</code>. If this code has been loaded, you can use it just as in the example above. If not, you can still use it right now.

defer.js uses a variant on the abuse-an-array idea, but to a higher degree. Once defer.js loads, it runs all the things you've put into the array, *then it becomes the array*.\*

    <script type="text/javascript">
        window.defer = window.defer || [];                    // in case defer.js hasn't loaded yet
        window.defer.push( {                                  // oddly familiar
            p:    function(){ return condition === true; } ,
            h:    function(){ runThisCode(); } ,
            o:    {}
        } );
    </script>
    <script type="text/javascript" async="async" src="defer.js"></script>

Yes, that totally works.

\* JS doesn't offer operator overloading, so <code>defer.push()</code> is the only way in which you'll interact with defer.js like an array. None of that bracket business.

Note that we use <code>window.defer</code> instead of simply <code>defer</code>, since this is more reliable inside of closures, and in certain browsers.

Also note the use of single-character shorthands for predicate, handler, and options. You're welcome.

## Are you ready? ##

defer.js sure is. It loads code as soon as the DOM is manipulable, much like jQuery's <code>$.ready()</code>.

## Out of Order? ##

By the time you ask the browser to evaluate any JavaScript, any other code it depends on must already be loaded. In a pre-asynchronous JS world, knowing what to load and when was easy enough (unless you had little control over the page's overall HTML). When you use use async out-of-the-box, things aren't so easy. It's tougher to know which will load first, a given chunk of code or the code it depends on.

If your dependent code tries to load first, you'll get a nasty error and likely a broken page. This out-of-order error is a race condition. With defer.js, it's also a thing of the past.

As long as your predicate logic is sound, you'll never again run afoul of an async-based race condition. At worst, it'll timeout (which you can adjust, and indicates issues in some other part of your infrastructure). A nice side-effect of defer.js's failure handling is that, for the first time, you can recover from code loading failures without the use of XMLHttpRequest.

## Compatibility? ##

Yes.

If it's a browser, it'll work. defer.js has been tested on every browser I can get my mitts on, even those that don't support asynchronous loading of JS. In those cases, it does no harm.



That said, I assume no liability for the use of defer.js. Read the license for more details.

## Resources ##

Besides its sub-2kB download size, defer.js is very respectful of browser resources. defer.js only runs when you ask it to, and does not leave any timers or event handlers 'dangling' thereafter.

As with all static scripts, be sure to [set your cache-related headers correctly](http://code.google.com/speed/page-speed/docs/caching.html). Even 1kB is 1kB too much when it could be in cache.

## Try it out ##

Want to see it in action, against loading an image and jQuery? [Test defer.js now!](http://wessman.github.com/defer.js/test/test0.html)

Pay special attention to the image load time &amp; order. Note that the load times for both defer.js and jQuery in these test pages are based on the DOM being ready. Use Webkit Inspector's Timeline or your browser's equivalent to verify the numbers yourself.

Judiciously clearing your cache, along with manipulating your connection (I use Network Link Conditioner) will give you a more complete picture of defer.js's performance.

The benefits of defer.js are most pronounced on real-world-sized pages, and on slower network links (like mobile).

## Methods ##

<dl>
<dt><code>defer( {p:... , h:... , o:...} )</code></dt>
<dd>Use this to create a new item to defer. Returns a unique sequence ID number.</dd>
<dt><code>defer.push( {p:... , h:... , o:...} )</code></dt>
<dd>The asynchronous way to defer your code, as if you were adding to an array.</dd>
<dt><code>defer.cancel( sequenceID )</code></dt>
<dd>Pass in the sequence ID from the non-asynchronous <code>defer()</code> method, and you can cancel a deferred block of code. This is not guaranteed to prevent execution, that depends on the runloop's whims.</dd>
<dt><code>defer.version()</code></dt>
<dd>Returns a string of defer.js's version.</dd>
<dt><code>defer.isReady()</code></dt>
<dd>Returns a boolean indicating whether the DOM is ready for manipulation.</dd>
</dl>

## Options ##

    options: { timeout: 30000 , interval: 100 , onFail: function(){ alert("failed"); } }

<dl>
<dt><code>timeout</code></dt>
<dd>How long, in milliseconds, until defer.js gives up on running your handler. The default is 15000ms (15 seconds).</dd>
<dt><code>interval</code></dt>
<dd>How long, in milliseconds, between attempts to validate your predicate. The default is 50ms.</dd>
<dt><code>onFail</code></dt>
<dd>Your very own custom failure handler. If deferred your code within a closure, you can use your own references and variables in here. Note that <code>this</code> isn't safe to use here.</dd>
</dl>

## Sugar ##

There's *more?*

defer.js uses a few small helper functions, which have been externalized for your convenience.

<dl>
<dt><code>defer.log()</code><dt>
<dd>This is a safe way to reference console.log, even in browsers that don't support the console. If you're using a production version of defer.js, your logs go straight to <code>\dev\null</code>. If you use the debug version, errors will route correctly to the browser's JS console. Easy.</dd>
<dt><code>defer.isNil( objToTest )</code><dt>
<dd>Test if the first parameter is <code>undefined</code> or <code>null</code>. Returns <code>false</code> if it's a dud.</dd>
<dt><code>defer.isFunction( functionToTest )</code><dt>
<dd>Test if the first parameter is a usable function. Returns <code>false</code> if not.</dd>
<dt><code>defer.forOwnIn( context , dictionary , handler )</code><dt>
<dd>Use this for testing every property on a custom dictionary/hash object without typing the whole <code>hasOwnProperty</code> stuff. The <code>context</code> is <code>this</code>, and <code>dictionary</code> is your object. The function you pass to <code>handler</code> has two parameters, <code>key</code> and <code>value</code>. Example:
<pre><code>    defer.forOwnIn( 
        this ,                                        // context
        { 'key1' : 'val1' , 'key2' : 'val2' } ,       // dictionary
        function( key , value ){
            defer.log( key + "=" + value );
        }
    );
</code></pre>
</dd>
<dt><code>defer.appendScript( src , async )</code><dt>
<dd>If you want to load code asynchronously, in code, use this. It simply attaches a <code>&lt;script&gt;</code> tag to the end of the page's body. The <code>async</code> parameter accepts either <code>async</code> or <code>defer</code>.</dd>
</dl>

## Compared To... ##

I looked at a few projects with vaguely similar aspirations before starting this project. I didn't want to re-invent the wheel.

Nothing I found had the combination of super-small load size, conceptual simplicity, zero dependencies, and pervasive asynchronicity.

Since then, a number of others JS loaders have popped up. Here's a little comparison:

<table id="deferjs-comparison">
	<thead style="margin: 15px 0;">
		<tr>
			<th title="Loader Name">Loader</th>
			<th title="minimized &amp; gzipped size, rounded up to the nearest tenth">min+gzip</th>
			<th title="minimized &amp; gzipped size, including minimum valid license boilerplate, rounded up to the nearest tenth">min+gzip+license</th>
			<th title="Async Itself: Can the loader be referenced in page scripts prior to load?">Async Itself</th>
			<th title="">Dependency Ordering</th>
			<th title="Dependency-Free: Is other, unnecessary-for-loading code required first?">Dependency-Free</th>
			<th title="JS-Free Load: Can the browser start file downloads before script execution occurs?">JS-Free Load</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>defer.js</td>
			<td>1.4kB</td>
			<td>1.8kB</td>
			<td>Yes!</td>
			<td>Yes (use predicates)</td>
			<td>Yes!</td>
			<td>Yes!</td>
		</tr>
		<tr>
			<td><a href="http://bdframework.org/bdLoad/">bdLoad</a></td>
			<td>3.7kB</td>
			<td>4.7kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="https://bitbucket.org/scott_koon/bootstrap">Bootstrap</a></td>
			<td>0.7kB</td>
			<td>1.1kB</td>
			<td>No</td>
			<td>No</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://code.google.com/p/bravojs/">BravoJS</a></td>
			<td>6.5kB</td>
			<td>7.2kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="https://github.com/unscriptable/curl" title="Curl.js: with-js-and-domReady">Curl.js*</a></td>
			<td>3.5kB</td>
			<td>4.3kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://stevesouders.com/controljs/">ControlJS</a></td>
			<td>1.9kB</td>
			<td>2.2kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="https://github.com/cdata/dominatejs">dominatejs</a></td>
			<td>11.4kB</td>
			<td>12kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://headjs.com/">head.js</a></td>
			<td>1.3kB</td>
			<td>2.1kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://www.andresvidal.com/jsl">JSL</a></td>
			<td>0.8kB</td>
			<td>1.5kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://code.google.com/p/jsload/">JSLoad</a></td>
			<td>1.1kB</td>
			<td>1.6kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>Yes</td>
		</tr>
		<tr>
			<td><a href="https://github.com/Cerdic/jQl">jQl</a></td>
			<td>0.8kB</td>
			<td>1.3kB</td>
			<td>Sort of</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://labjs.com/">LABjs</a></td>
			<td>2.3kB</td>
			<td>2.9kB</td>
			<td><a href="https://gist.github.com/603980">Sort of</a></td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="https://github.com/rgrove/lazyload/">LazyLoad</a></td>
			<td>1kB</td>
			<td>1.7kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://berklee.github.com/nbl/">NBL</a></td>
			<td>0.6kB</td>
			<td>1.3kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://requirejs.org/">RequireJS</a></td>
			<td>5.5kB</td>
			<td>6.2kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://www.dustindiaz.com/scriptjs/">$script.js</a></td>
			<td>0.9kB</td>
			<td>1.5kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://jupiterjs.com/news/stealjs-script-manager">Steal</a></td>
			<td>4kB</td>
			<td>none specified</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://yepnopejs.com/">yepnope.js</a></td>
			<td>1.7kB</td>
			<td>1.7kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://developer.yahoo.com/yui/yuiloader/">YUI 2 Loader</a></td>
			<td>9.9kB</td>
			<td>10kB</td>
			<td>No</td>
			<td>Yes</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
		<tr>
			<td><a href="http://yuilibrary.com/yui/docs/yui/">YUI 3 Seed</a></td>
			<td>20.7kB</td>
			<td>20.7kB</td>
			<td>No</td>
			<td>Yes?</td>
			<td>Yes</td>
			<td>No</td>
		</tr>
	</tbody>
</table>

Honestly, I had no idea many of these loaders existed until I was revising this README. My thanks to <a href="http://webification.com/12-javascript-loaders-to-speed-up-your-web-applications">Simone D'Amico</a> and <a href="https://spreadsheets.google.com/lv?key=tDdcrv9wNQRCNCRCflWxhYQ">Éric Daspet</a>, whose lists of JS loaders inspired the table above.

defer.js doesn't offer the kind of extensive dependency ordering that a lot of the others offer, for two reasons. First, it offers a new way around the async loading race condition that makes these other systems necessary. Second, defer.js exists to speed loading on the majority of web pages, and is not optimized for the Photoshop-in-the-browser class of web applications (though it ought to be of good use there, too!).

Regarding the filesizes listed: Some weren't minimized, so I minimized them using the Closure Compiler, at the highest level of optimization that wouldn't throw warnings or errors. Also, quite a few projects didn't include valid license boilerplate, so I included it where necessary. Specifically, MIT- and GPL-licensed code requires at least the boilerplate attached to each and every file. Persuant to these licenses, you technically have no rights to use the code without the proper boilerplate attached. (I am not a lawyer.)

## License, Copyright  &amp; Trademark ##

defer.js is made available under the Apache License, Version 2.0.

All code in this repository is copyright 2011-2012 Ian J. Wessman.

"defer.js" and the defer.js logo are trademarks of Ian J. Wessman.