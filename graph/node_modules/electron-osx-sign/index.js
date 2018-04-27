/**
 * @module electron-osx-sign
 */

'use strict'

const sign = require('./sign')
const flat = require('./flat')

/**
 * This function is a normal callback implementation.
 * @param {Object} opts - Options.
 * @param {RequestCallback} cb - Callback.
 */
module.exports = sign.sign // Aliasing

/**
 * This function is a normal callback implementation.
 * @function
 * @param {Object} opts - Options.
 * @param {RequestCallback} cb - Callback.
 */
module.exports.sign = sign.sign

/**
 * This function returns a promise signing the application.
 * @function
 * @param {mixed} opts - Options.
 * @returns {Promise} Promise.
 */
module.exports.signAsync = sign.signAsync

/**
 * This function is exported with normal callback implementation.
 * @function
 * @param {Object} opts - Options.
 * @param {RequestCallback} cb - Callback.
 */
module.exports.flat = flat.flat

/**
 * This function is exported and returns a promise flattening the application.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
module.exports.flatAsync = flat.flatAsync
