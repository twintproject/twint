/**
 * @module util-provisioning-profiles
 */

'use strict'

const path = require('path')

const Promise = require('bluebird')
const plist = require('plist')

const util = require('./util')
const debuglog = util.debuglog
const debugwarn = util.debugwarn
const getAppContentsPath = util.getAppContentsPath
const flatList = util.flatList
const copyFileAsync = util.copyFileAsync
const execFileAsync = util.execFileAsync
const lstatAsync = util.lstatAsync
const readdirAsync = util.readdirAsync

/**
 * @constructor
 * @param {string} filePath - Path to provisioning profile.
 * @param {Object} message - Decoded message in provisioning profile.
 */
var ProvisioningProfile = module.exports.ProvisioningProfile = function (filePath, message) {
  this.filePath = filePath
  this.message = message
}

Object.defineProperty(ProvisioningProfile.prototype, 'name', {
  get: function () {
    return this.message['Name']
  }
})

Object.defineProperty(ProvisioningProfile.prototype, 'platforms', {
  get: function () {
    if ('ProvisionsAllDevices' in this.message) return ['darwin'] // Developer ID
    else if (this.type === 'distribution') return ['mas'] // Mac App Store
    else return ['darwin', 'mas'] // Mac App Development
  }
})

Object.defineProperty(ProvisioningProfile.prototype, 'type', {
  get: function () {
    if ('ProvisionedDevices' in this.message) return 'development' // Mac App Development
    else return 'distribution' // Developer ID or Mac App Store
  }
})

/**
 * Returns a promise resolving to a ProvisioningProfile instance based on file.
 * @function
 * @param {string} filePath - Path to provisioning profile.
 * @returns {Promise} Promise.
 */
var getProvisioningProfileAsync = module.exports.getProvisioningProfileAsync = function (filePath) {
  return execFileAsync('security', [
    'cms',
    '-D', // Decode a CMS message
    '-i', filePath // Use infile as source of data
  ])
    .then(function (result) {
      var provisioningProfile = new ProvisioningProfile(filePath, plist.parse(result))
      debuglog('Provisioning profile:', '\n',
        '> Name:', provisioningProfile.name, '\n',
        '> Platforms:', provisioningProfile.platforms, '\n',
        '> Type:', provisioningProfile.type, '\n',
        '> Path:', provisioningProfile.filePath, '\n',
        '> Message:', provisioningProfile.message)
      return provisioningProfile
    })
}

/**
 * Returns a promise resolving to a list of suitable provisioning profile within the current working directory.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
var findProvisioningProfilesAsync = module.exports.findProvisioningProfilesAsync = function (opts) {
  return Promise.map([
    process.cwd() // Current working directory
  ], function (dirPath) {
    return readdirAsync(dirPath)
      .map(function (name) {
        var filePath = path.join(dirPath, name)
        return lstatAsync(filePath)
          .then(function (stat) {
            if (stat.isFile()) {
              switch (path.extname(filePath)) {
                case '.provisionprofile':
                  return filePath
              }
            }
            return undefined
          })
      })
  })
    .then(flatList)
    .map(function (filePath) {
      return getProvisioningProfileAsync(filePath)
        .then(function (provisioningProfile) {
          if (provisioningProfile.platforms.indexOf(opts.platform) >= 0 && provisioningProfile.type === opts.type) return provisioningProfile
          debugwarn('Provisioning profile above ignored, not for ' + opts.platform + ' ' + opts.type + '.')
          return undefined
        })
    })
    .then(flatList)
}

/**
 * Returns a promise embedding the provisioning profile in the app Contents folder.
 * @function
 * @param {Object} opts - Options.
 * @returns {Promise} Promise.
 */
module.exports.preEmbedProvisioningProfile = function (opts) {
  function embedProvisioningProfile () {
    if (opts['provisioning-profile']) {
      debuglog('Looking for existing provisioning profile...')
      var embeddedFilePath = path.join(getAppContentsPath(opts), 'embedded.provisionprofile')
      return lstatAsync(embeddedFilePath)
        .then(function (stat) {
          debuglog('Found embedded provisioning profile:', '\n',
            '* Please manually remove the existing file if not wanted.', '\n',
            '* Current file at:', embeddedFilePath)
        })
        .catch(function (err) {
          if (err.code === 'ENOENT') {
            // File does not exist
            debuglog('Embedding provisioning profile...')
            return copyFileAsync(opts['provisioning-profile'].filePath, embeddedFilePath)
          } else throw err
        })
    }
  }

  if (opts['provisioning-profile']) {
    // User input provisioning profile
    debuglog('`provisioning-profile` passed in arguments.')
    if (opts['provisioning-profile'] instanceof ProvisioningProfile) {
      return embedProvisioningProfile()
    } else {
      return getProvisioningProfileAsync(opts['provisioning-profile'])
        .then(function (provisioningProfile) {
          opts['provisioning-profile'] = provisioningProfile
        })
        .then(embedProvisioningProfile)
    }
  } else {
    // Discover provisioning profile
    debuglog('No `provisioning-profile` passed in arguments, will find in current working directory and in user library...')
    return findProvisioningProfilesAsync(opts)
      .then(function (provisioningProfiles) {
        if (provisioningProfiles.length > 0) {
          // Provisioning profile(s) found
          if (provisioningProfiles.length > 1) {
            debuglog('Multiple provisioning profiles found, will use the first discovered.')
          } else {
            debuglog('Found 1 provisioning profile.')
          }
          opts['provisioning-profile'] = provisioningProfiles[0]
        } else {
          // No provisioning profile found
          debuglog('No provisioning profile found, will not embed profile in app contents.')
        }
      })
      .then(embedProvisioningProfile)
  }
}
