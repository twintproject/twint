'use strict'

const pify = require('pify')

module.exports = {
  promisifyHooks: function promisifyHooks (hooks, args) {
    if (!hooks || !Array.isArray(hooks)) {
      return Promise.resolve()
    }

    return Promise.all(hooks.map(hookFn => pify(hookFn).apply(this, args)))
  },
  serialHooks: function serialHooks (hooks) {
    return function () {
      const args = Array.prototype.splice.call(arguments, 0, arguments.length - 1)
      const done = arguments[arguments.length - 1]
      let result = Promise.resolve()
      for (const hook of hooks) {
        result = result.then(() => hook.apply(this, args))
      }

      return result.then(() => done()) // eslint-disable-line promise/no-callback-in-promise
    }
  }
}
