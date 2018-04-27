'use strict'

const common = require('./common')
const debug = require('debug')('electron-packager')
const download = require('electron-download')
const pify = require('pify')
const semver = require('semver')
const targets = require('./targets')

function createDownloadOpts (opts, platform, arch) {
  let downloadOpts = Object.assign({}, opts.download)

  common.subOptionWarning(downloadOpts, 'download', 'platform', platform, opts.quiet)
  common.subOptionWarning(downloadOpts, 'download', 'arch', arch, opts.quiet)
  common.subOptionWarning(downloadOpts, 'download', 'version', opts.electronVersion, opts.quiet)

  return downloadOpts
}

module.exports = {
  createDownloadCombos: function createDownloadCombos (opts, selectedPlatforms, selectedArchs, ignoreFunc) {
    return targets.createPlatformArchPairs(opts, selectedPlatforms, selectedArchs, ignoreFunc).map(combo => {
      const platform = combo[0]
      const arch = combo[1]
      return createDownloadOpts(opts, platform, arch)
    })
  },
  createDownloadOpts: createDownloadOpts,
  downloadElectronZip: function downloadElectronZip (downloadOpts) {
    // armv7l builds have only been backfilled for Electron >= 1.0.0.
    // See: https://github.com/electron/electron/pull/6986
    /* istanbul ignore if */
    if (downloadOpts.arch === 'armv7l' && semver.lt(downloadOpts.version, '1.0.0')) {
      downloadOpts.arch = 'arm'
    }
    debug(`Downloading Electron with options ${JSON.stringify(downloadOpts)}`)
    return pify(download)(downloadOpts)
  }
}
