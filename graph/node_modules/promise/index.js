var isPromise = require('is-promise')

var nextTick;
if (typeof setImediate === 'function') nextTick = setImediate
else if (typeof process === 'object' && process && process.nextTick) nextTick = process.nextTick
else nextTick = function (cb) { setTimeout(cb, 0) }

var extensions = [];

module.exports = Promise
function Promise(fn) {
  if (!(this instanceof Promise)) {
    return typeof fn === 'function' ? new Promise(fn) : defer()
  }
  var isResolved = false
  var isFulfilled = false
  var value
  var waiting = []
  var running = false

  function next(skipTimeout) {
    if (waiting.length) {
      running = true
      waiting.shift()(skipTimeout || false)
    } else {
      running = false
    }
  }
  this.then = then;
  function then(cb, eb) {
    return new Promise(function (resolver) {
      function done(skipTimeout) {
        var callback = isFulfilled ? cb : eb
        if (typeof callback === 'function') {
          function timeoutDone() {
            var val;
            try {
              val = callback(value)
            } catch (ex) {
              resolver.reject(ex)
              return next()
            }
            resolver.fulfill(val);
            next(true);
          }
          if (skipTimeout) timeoutDone()
          else nextTick(timeoutDone)
        } else if (isFulfilled) {
          resolver.fulfill(value)
          next(skipTimeout)
        } else {
          resolver.reject(value)
          next(skipTimeout)
        }
      }
      waiting.push(done)
      if (isResolved && !running) next()
    });
  }
  
  (function () {
    function fulfill(val) {
      if (isResolved) return
      if (isPromise(val)) val.then(fulfill, reject)
      else {
        isResolved = isFulfilled = true
        value = val
        next()
      }
    }
    function reject(err) {
      if (isResolved) return
      isResolved = true
      isFulfilled = false
      value = err
      next()
    }
    var resolver = {fulfill: fulfill, reject: reject};
    for (var i = 0; i < extensions.length; i++) {
      extensions[i](this, resolver);
    }
    if (typeof fn === 'function') {
      try {
        fn(resolver)
      } catch (ex) {
        resolver.reject(ex);
      }
    }
  }());
}
function defer() {
  var resolver
  var promise = new Promise(function (res) { resolver = res })
  return {resolver: resolver, promise: promise}
}
Promise.use = function (extension) {
  extensions.push(extension);
};