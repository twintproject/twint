[![Build Status](https://travis-ci.org/then/promise.png)](https://travis-ci.org/then/promise)
<a href="http://promises-aplus.github.com/promises-spec"><img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" align="right" /></a>
# promise

  This a bare bones [Promises/A+](http://promises-aplus.github.com/promises-spec/) implementation.

  It is designed to get the basics spot on correct, so that you can build extended promise implementations on top of it.

## Installation

  Client:

    $ component install then/promise

  Server:

    $ npm install promise

## API

  In the example below shows how you can load the promise library (in a way that works on both client and server).  It then demonstrates creating a promise from scratch.  You simply call `new Promise(fn)`.  There is a complete specification for what is returned by this method in [Promises/A+](http://promises-aplus.github.com/promises-spec/).  The resolver object has two methods `reject` and `fulfill` and their use is demonstrated here:

```javascript
var Promise = require('promise');

var promise = new Promise(function (resolver) {
    get('http://www.google.com', function (err, res) {
      if (err) resolver.reject(err);
      else resolver.fulfill(res);
    });
  });
```

## Extending Promises

  There are two options for extending the promises created by this library.

### Inheritance

  You can use inheritance if you want to create your own complete promise library with this as your basic starting point, perfect if you have lots of cool features you want to add.  Here is an example of a promise library called `Awesome`, which is built on top of `Promise` correctly.

```javascript
var Promise = require('promise');
function Awesome(fn) {
  Promise.call(this, fn);
}
Awesome.prototype = Object.create(Promise.prototype);
Awesome.prototype.constructor = Awesome;

//Awesome extension
Awesome.prototype.spread = function (cb) {
  return this.then(function (arr) {
    return cb.apply(this, arr);
  })
};
```

  N.B. if you fail to set the prototype and constructor properly or fail to do Promise.call, things can fail in really subtle ways.

### Extending the Prototype

  In general, you should never extend the prototype of this promise implimenation because your extensions could easily conflict with someone elses extensions.  However, this organisation will host a library of extensions which do not conflict with each other, so you can safely enable any of those.  If you think of an extension that we don't provide and you want to write it, submit an issue on this repository and (if I agree) I'll set you up with a repository and give you permission to commit to it.

## License

  MIT
