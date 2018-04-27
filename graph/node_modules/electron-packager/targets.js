'use strict'

const common = require('./common')
const execSync = require('child_process').execSync
const semver = require('semver')

const officialArchs = ['ia32', 'x64', 'armv7l', 'arm64', 'mips64el']
const officialPlatforms = ['darwin', 'linux', 'mas', 'win32']
const officialPlatformArchCombos = {
  darwin: ['x64'],
  linux: ['ia32', 'x64', 'armv7l', 'arm64', 'mips64el'],
  mas: ['x64'],
  win32: ['ia32', 'x64']
}

const minimumLinuxArchBuildVersions = {
  arm64: '1.8.0',
  mips64el: '1.8.2-beta.5'
}

// Maps to module filename for each platform (lazy-required if used)
const osModules = {
  darwin: './mac',
  linux: './linux',
  mas: './mac', // map to darwin
  win32: './win32'
}

const supported = {
  arch: new Set(officialArchs),
  platform: new Set(officialPlatforms)
}

function createPlatformArchPairs (opts, selectedPlatforms, selectedArchs, ignoreFunc) {
  let combinations = []
  for (const arch of selectedArchs) {
    for (const platform of selectedPlatforms) {
      if (usingOfficialElectronPackages(opts)) {
        if (!validOfficialPlatformArch(opts, platform, arch)) {
          warnIfAllNotSpecified(opts, `The platform/arch combination ${platform}/${arch} is not currently supported by Electron Packager`)
          continue
        } else if (platform === 'linux') {
          const minimumBuildVersion = minimumLinuxArchBuildVersions[arch]
          if (minimumBuildVersion && !officialLinuxBuildExists(opts, minimumBuildVersion)) {
            warnIfAllNotSpecified(opts, `Official linux/${arch} support only exists in Electron ${minimumBuildVersion} and above`)
            continue
          }
        }
        if (typeof ignoreFunc === 'function' && ignoreFunc(platform, arch)) continue
      }
      combinations.push([platform, arch])
    }
  }

  return combinations
}

function unsupportedListOption (name, value, supported) {
  return new Error(`Unsupported ${name}=${value} (${typeof value}); must be a string matching: ${Array.from(supported.values()).join(', ')}`)
}

function usingOfficialElectronPackages (opts) {
  return !opts.download || !opts.download.hasOwnProperty('mirror')
}

function validOfficialPlatformArch (opts, platform, arch) {
  return officialPlatformArchCombos[platform] && officialPlatformArchCombos[platform].indexOf(arch) !== -1
}

function officialLinuxBuildExists (opts, minimumBuildVersion) {
  return semver.gte(opts.electronVersion, minimumBuildVersion)
}

function allPlatformsOrArchsSpecified (opts) {
  return opts.all || opts.arch === 'all' || opts.platform === 'all'
}

function warnIfAllNotSpecified (opts, message) {
  if (!allPlatformsOrArchsSpecified(opts)) {
    common.warning(message)
  }
}

function hostArch () {
  if (process.arch === 'arm') {
    switch (process.config.variables.arm_version) {
      case '6':
        return module.exports.unameArch()
      case '7':
        return 'armv7l'
      default:
        common.warning(`Could not determine specific ARM arch. Detected ARM version: ${JSON.stringify(process.config.variables.arm_version)}`)
    }
  }

  return process.arch
}

module.exports = {
  allOfficialArchsForPlatformAndVersion: function allOfficialArchsForPlatformAndVersion (platform, electronVersion) {
    const archs = officialPlatformArchCombos[platform]
    if (platform === 'linux') {
      const excludedArchs = Object.keys(minimumLinuxArchBuildVersions)
        .filter(arch => !officialLinuxBuildExists({electronVersion: electronVersion}, minimumLinuxArchBuildVersions[arch]))
      return archs.filter(arch => excludedArchs.indexOf(arch) === -1)
    }

    return archs
  },
  createPlatformArchPairs: createPlatformArchPairs,
  hostArch: hostArch,
  officialArchs: officialArchs,
  officialPlatformArchCombos: officialPlatformArchCombos,
  officialPlatforms: officialPlatforms,
  osModules: osModules,
  supported: supported,
  /**
   * Returns the arch name from the `uname` utility.
   */
  unameArch: function unameArch () {
    /* istanbul ignore next */
    return execSync('uname -m').toString().trim()
  },
  // Validates list of architectures or platforms.
  // Returns a normalized array if successful, or throws an Error.
  validateListFromOptions: function validateListFromOptions (opts, name) {
    if (opts.all) return Array.from(supported[name].values())

    let list = opts[name]
    if (!list) {
      if (name === 'arch') {
        list = hostArch()
      } else {
        list = process[name]
      }
    } else if (list === 'all') {
      return Array.from(supported[name].values())
    }

    if (!Array.isArray(list)) {
      if (typeof list === 'string') {
        list = list.split(/,\s*/)
      } else {
        return unsupportedListOption(name, list, supported[name])
      }
    }

    const officialElectronPackages = usingOfficialElectronPackages(opts)

    for (let value of list) {
      if (officialElectronPackages && !supported[name].has(value)) {
        return unsupportedListOption(name, value, supported[name])
      }
    }

    return list
  }
}
