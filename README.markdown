# defer.js #

**Async Everything**

defer.js is a tiny boot-strapper that allows you to make all loading of JavaScript on your page asynchronous. Yes, everything.

Packed in less than 2kB (gzipped), defer.js is a predicate-based execution engine. You give it a rule, and once the condition is met, any hunk of JS you've got will be run. It's that simple.

Using predicates to let all your JS load asynchronously is just a welcome side-effect.

An example:

    defer( {
        predicate:    function(){ return condition === true; } ,
        handler:    function(){ runThisCode(); } ,
        options:    {}
    } );
    // you can load the external script you just referenced, even after-the-fact

## Huh? ##
 * Load any script you'd like asynchronously, even libraries like jQuery
 * With all-async code, the 'meat' of your page will load faster, especially on mobile devices. Text and images don't have to wait for scripts before rendering.
 * Put code on the page where you need to, even if that's *before your libraries!*

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

defer.js uses a single global variable for everything: window.defer. If this code has been loaded, you can use it just as in the example above. If not, you can still use it right now.

defer.js uses a variant on the abuse-an-array idea, but to a higher degree. Once defer.js loads, it runs all the things you've put into the array, *then it becomes the array*.

    <script type="text/javascript">
        window.defer = window.defer || [];    // in case defer.js hasn't loaded yet
        window.defer.push( {                         // oddly familiar
            p:    function(){ return condition === true; } ,
            h:    function(){ runThisCode(); } ,
            o:    {}
        } );
    </script>
    <script type="text/javascript" async="async" src="defer.js"></script>

Yes, that totally works.

Note that we use `window.defer` instead of simply `defer`, since this works better inside of closures, and in certain browsers.

Also note the use of single-character shorthands for predicate, handler, and options. You're welcome.

## Are you ready? ##

defer.js sure is. It loads code as soon as the DOM is manipulable, much like jQuery's `$.ready()`.

## Race Conditions? You Win! ##

One of the hazards in asynchronous script loading is creating a race condition. What if your code runs before the library it depends on? An error, and a broken page.

As long as your predicate logic is sound, you'll never run afoul of an async-based race condition.

Async Everything!

## Try it out ##

Want to see it in action, against loading an image and jQuery? [Test defer.js now!](http://wessman.github.com/deferjs/test/test0.html)

Judiciously clearing your cache, along with manipulating your connection (I use Network Link Conditioner) will give you a more complete picture of defer.js's performance.

## Methods ##

<dl>
<dt>`defer( {p:... , h:... , o:...} )`</dt>
<dd>Use this to create a new item to defer. Returns a unique sequence ID number.</dd>
<dt>`defer.push( {p:... , h:... , o:...} )`</dt>
<dd>The asynchronous way to defer your code, as if you were adding to an array.</dd>
<dt>`defer.cancel( sequenceID )`</dt>
<dd>Pass in the sequence ID from the non-asynchronous `defer()` method, and you can cancel a deferred block of code. This is not guaranteed to prevent execution, that depends on the runloop's whims.</dd>
<dt>`defer.version()`</dt>
<dd>Returns a string of defer.js's version.</dd>
<dt>`defer.isReady()`</dt>
<dd>Returns a boolean indicating whether the DOM is ready for manipulation.</dd>
</dl>

## Options ##

    options: { timeout: 30000 , interval: 100 , onFail: function(){ alert("failed"); } }

<dl>
<dt>`timeout`</dt>
<dd>How long, in milliseconds, until defer.js gives up on running your handler. The default is 15000ms (15 seconds).</dd>
<dt>`interval`</dt>
<dd>How long, in milliseconds, between attempts to validate your predicate. The default is 50ms.</dd>
<dt>`onFail`</dt>
<dd>Your very own custom failure handler. If deferred your code within a closure, you can use your own references and variables in here. Note that `this` isn't safe to use here.</dd>
</dl>

## Sugar ##

There's *more?*

defer.js uses a few small helper functions, which have been externalized for your convenience.

<dl>
<dt>`defer.log()`<dt>
<dd>This is a safe way to reference console.log, even in browsers that don't support the console. If you're using a production version of defer.js, your logs go straight to `\dev\null`. If you use the debug version, errors will route correctly to the browser's JS console. Easy.</dd>
<dt>`defer.isNil( objToTest )`<dt>
<dd>Test if the first parameter is `undefined` or `null`. Returns `false` if it's a dud.</dd>
<dt>`defer.isFunction( functionToTest )`<dt>
<dd>Test if the first parameter is a usable function. Returns `false` if not.</dd>
<dt>`defer.forOwnIn( context , dictionary , handler )`<dt>
<dd>Use this for testing every property on a custom dictionary/hash object without typing the whole `hasOwnProperty` stuff. The `context` is `this`, and `dictionary` is your object. The function you pass to `handler` has two parameters, `key` and `value`. Example:
<code>
    defer.forOwnIn( 
        this ,                                                // context
        { 'key1' : 'val1' , 'key2' : 'val2' } ,       // dictionary
        function( key , value ){
            defer.log( key + "=" + value );
        }
    );
</code>
</dd>
<dt>`defer.appendScript( src , async )`<dt>
<dd>If you want to load code asynchronously, in code, use this. It simply attaches a `&lt;script&gt;` tag to the end of the page's body. The `async` parameter accepts either `async` or `defer`.</dd>
</dl>

## License, Copyright  &amp; Trademark ##

defer.js is made available under the Apache 2.0 License.

All code in this repository is copyright 2011-2012 Ian J. Wessman.

"defer.js" and the defer.js logo are trademarks of Ian J. Wessman.

There's a 99.9% chance you can use it for your site.