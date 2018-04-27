[![Build Status](https://img.shields.io/travis/then/nodeify/master.svg)](https://travis-ci.org/then/nodeify)
# Nodeify

  Convert promised code to use node style callbacks.  If no callback is provided it will just return the original promise.

## Installation

  Server:

    $ npm install nodeify

## Usage

### Functional

  Call `nodeify` directly passing the `promise` and an optional `callback` as arguments.  If a `callback` is provided it will be called as `callback(error, result)`.  If `callback` is not a function, `promise` is returned.

```javascript
var nodeify = require('nodeify');

function myAsyncMethod(arg, callback) {
  return nodeify(myPromiseMethod(arg), callback);
}
```

### Constructor / Method

  The `nodeify.Promise` constructor returns a promise with a `.nodeify` method which behaves just like the functional version above except that the first argument is implicitly `this`.

```javascript
var Promise = require('nodeify').Promise;

function myAsyncMethod(arg, callback) {
  return new Promise(function (resolver) {
    //do async work
  })
  .nodeify(callback);
}
```

### Extend

#### Extend(promise)

  Takes a promise and extends it to support the `.nodeify` method.  It will still support the nodeify method after calls to `.then`.

```javascript
var Promise = require('promise');
var nodeify = require('nodeify');

function myAsyncMethod(arg, callback) {
  return nodeify.extend(myPromiseMethod(arg))
    .nodeify(callback);
}
```

#### Extend(PromiseConstructor)

  Takes a PromiseConstructor and extends it to support the `.nodeify` method.

```javascript
var PromiseConstructor = require('promise-constructor-used-by-my-promise-method');

require('nodeify').extend(PromiseConstructor);

function myAsyncMethod(arg, callback) {
  return myPromiseMethod(arg).nodeify(callback);
}
```

#### Extend()

  Extends the default promise constructor (returned by calling `require('promise')`) and extends it to support `.nodeify`.

```javascript
require('nodeify').extend();

function myAsyncMethod(arg, callback) {
  //assuming myPromiseMethod uses `promise` as its promise library
  return myPromiseMethod(arg).nodeify(callback);
}
```

## Licence

  MIT

![viewcount](https://viewcount.jepso.com/count/then/nodeify.png)
