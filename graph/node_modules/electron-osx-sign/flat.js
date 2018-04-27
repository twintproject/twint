/**
 * @module flat
 */

'use strict'

const path = require('path')

const Promise = require('bluebird')

const pkg = require('./package.json')
const util = require('./util')
const debuglog = util.debuglog
const debugwarn = util.debugwarn
const execFileAsync = util.execFileAsync
const validateOptsAppAsync = util.validateOptsAppAsync
const validateOptsPlatformAsync = util.validateOptsPlatformAsync
const Identity = require('./util-identities').findIdentitiesAsync
const findIdentitiesAsync = require('./util-identities').findIdentitiesAsync

/**
 * This function returns a promise validating all options passed in opts.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
function validateFlatOptsAsync (opts) {
  if (opts.pkg) {
    if (typeof opts.pkg !== 'string') return Promise.reject(new Error('`pkg` must be a string.'))
    if (path.extname(opts.pkg) !== '.pkg') return Promise.reject(new Error('Extension of output package must be `.pkg`.'))
  } else {
    debugwarn('No `pkg` passed in arguments, will fallback to default inferred from the given application.')
    opts.pkg = path.join(path.dirname(opts.app), path.basename(opts.app, '.app') + '.pkg')
  }

  if (opts.install) {
    if (typeof opts.install !== 'string') return Promise.reject(new Error('`install` must be a string.'))
  } else {
    debugwarn('No `install` passed in arguments, will fallback to default `/Applications`.')
    opts.install = '/Applications'
  }

  return Promise.map([
    validateOptsAppAsync,
    validateOptsPlatformAsync
  ], function (validate) {
    return validate(opts)
  })
}

/**
 * This function returns a promise flattening the application.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
function flatApplicationAsync (opts) {
  var args = [
    '--component', opts.app, opts.install,
    '--sign', opts.identity.name,
    opts.pkg
  ]
  if (opts.keychain) {
    args.unshift('--keychain', opts.keychain)
  }
  if (opts.scripts) {
    args.unshift('--scripts', opts.scripts)
  }

  debuglog('Flattening... ' + opts.app)
  return execFileAsync('productbuild', args)
    .thenReturn(undefined)
}

/**
 * This function is exported and returns a promise flattening the application.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
var flatAsync = module.exports.flatAsync = function (opts) {
  debuglog('electron-osx-sign@%s', pkg.version)
  return validateFlatOptsAsync(opts)
    .then(function () {
      var promise
      if (opts.identity) {
        debuglog('`identity` passed in arguments.')
        if (opts['identity-validation'] === false || opts.identity instanceof Identity) {
          return Promise.resolve()
        }
        promise = findIdentitiesAsync(opts, opts.identity)
      } else {
        debugwarn('No `identity` passed in arguments...')
        if (opts.platform === 'mas') {
          debuglog('Finding `3rd Party Mac Developer Installer` certificate for flattening app distribution in the Mac App Store...')
          promise = findIdentitiesAsync(opts, '3rd Party Mac Developer Installer:')
        } else {
          debuglog('Finding `Developer ID Application` certificate for distribution outside the Mac App Store...')
          promise = findIdentitiesAsync(opts, 'Developer ID Installer:')
        }
      }
      return promise
        .then(function (identities) {
          if (identities.length > 0) {
            // Provisioning profile(s) found
            if (identities.length > 1) {
              debugwarn('Multiple identities found, will use the first discovered.')
            } else {
              debuglog('Found 1 identity.')
            }
            opts.identity = identities[0]
          } else {
            // No identity found
            return Promise.reject(new Error('No identity found for signing.'))
          }
        })
    })
    .then(function () {
      // Pre-flat operations
    })
    .then(function () {
      debuglog('Flattening application...', '\n',
        '> Application:', opts.app, '\n',
        '> Package output:', opts.pkg, '\n',
        '> Install path:', opts.install, '\n',
        '> Identity:', opts.identity, '\n',
        '> Scripts:', opts.scripts)
      return flatApplicationAsync(opts)
    })
    .then(function () {
      // Post-flat operations
      debuglog('Application flattened.')
    })
}

/**
 * This function is exported with normal callback implementation.
 * @function
 * @param {Object} opts - Options.
 * @param {RequestCallback} cb - Callback.
 */
module.exports.flat = function (opts, cb) {
  flatAsync(opts)
    .then(function () {
      debuglog('Application flattened, saved to: ' + opts.app)
      if (cb) cb()
    })
    .catch(function (err) {
      debuglog('Flat failed:')
      if (err.message) debuglog(err.message)
      else if (err.stack) debuglog(err.stack)
      else debuglog(err)
      if (cb) cb(err)
    })
}
