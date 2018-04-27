const Transform = require('stream').Transform || require('readable-stream/transform')
    , inherits  = require('util').inherits
    , xtend     = require('xtend')

function noop (chunk, enc, callback) {
  callback(null, chunk)
}

function ctor (options, transform, flush) {
  if (typeof options == 'function') {
    flush     = transform
    transform = options
    options   = {}
  }

  if (typeof transform != 'function')
    transform = noop

  function Through2 (override) {
    if (!(this instanceof Through2))
      return new Through2(override)

    this.options = xtend(options, override)
    Transform.call(this, this.options)
  }

  inherits(Through2, Transform)

  Through2.prototype._transform = transform

  if (typeof flush == 'function')
    Through2.prototype._flush = flush

  return Through2
}

function make (options, transform, flush) {
  return ctor(options, transform, flush)()
}

module.exports      = make
module.exports.ctor = ctor