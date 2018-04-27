'use strict'
var os = require('os')

/**
* Cross-platform home directory retriever, tested on Windows XP and above, Mac OSX and Linux.
*
* With node versions 2.3.0 (iojs) or higher, the built-in [`os.homedir`](https://nodejs.org/api/os.html#os_os_homedir) method is used.
*
* @module home-path
* @example
* var getHomePath = require('home-path')
*/
module.exports = os.homedir ? os.homedir : getHomePath

/**
* @alias module:home-path
* @example
* Mac OSX
* ```js
* > getHomePath()
* '/Users/Lloyd'
* ```
*
* Ubuntu Linux
* ```js
* > getHomePath()
* '/home/lloyd'
* ```
*
* Windows 8.1
* ```js
* > getHomePath()
* 'C:\\Users\\Lloyd'
* ```
*/
function getHomePath () {
  if (process.platform === 'win32') {
    return process.env.USERPROFILE || process.env.HOMEDRIVE + process.env.HOMEPATH || process.env.HOME
  } else {
    return process.env.HOME
  }
}
