'use strict'

const debug = require('debug')('electron-packager')
const path = require('path')
const pify = require('pify')

const App = require('./platform')
const common = require('./common')

function updateWineMissingException (err) {
  if (err && err.code === 'ENOENT' && err.syscall === 'spawn wine') {
    err.message = 'Could not find "wine" on your system.\n\n' +
      'Wine is required to use the appCopyright, appVersion, buildVersion, icon, and \n' +
      'win32metadata parameters for Windows targets.\n\n' +
      'Make sure that the "wine" executable is in your PATH.\n\n' +
      'See https://github.com/electron-userland/electron-packager#building-windows-apps-from-non-windows-platforms for details.'
  }

  return err
}

class WindowsApp extends App {
  get originalElectronName () {
    return 'electron.exe'
  }

  get newElectronName () {
    return `${common.sanitizeAppName(this.executableName)}.exe`
  }

  get electronBinaryPath () {
    return path.join(this.stagingPath, this.newElectronName)
  }

  generateRceditOptionsSansIcon () {
    const win32metadata = Object.assign({
      FileDescription: this.opts.name,
      InternalName: this.opts.name,
      OriginalFilename: this.newElectronName,
      ProductName: this.opts.name
    }, this.opts.win32metadata)

    let rcOpts = {'version-string': win32metadata}

    if (this.opts.appVersion) {
      rcOpts['product-version'] = rcOpts['file-version'] = this.opts.appVersion
    }

    if (this.opts.buildVersion) {
      rcOpts['file-version'] = this.opts.buildVersion
    }

    if (this.opts.appCopyright) {
      rcOpts['version-string'].LegalCopyright = this.opts.appCopyright
    }

    const manifestProperties = ['application-manifest', 'requested-execution-level']
    for (const manifestProperty of manifestProperties) {
      if (win32metadata[manifestProperty]) {
        rcOpts[manifestProperty] = win32metadata[manifestProperty]
      }
    }

    return rcOpts
  }

  getIconPath () {
    if (!this.opts.icon) {
      return Promise.resolve()
    }

    return this.normalizeIconExtension('.ico')
  }

  needsRcedit () {
    return this.opts.icon || this.opts.win32metadata || this.opts.appCopyright || this.opts.appVersion || this.opts.buildVersion
  }

  runRcedit () {
    /* istanbul ignore if */
    if (!this.needsRcedit()) {
      return Promise.resolve()
    }

    const rcOpts = this.generateRceditOptionsSansIcon()

    return this.getIconPath()
      .then(icon => {
        // Icon might be omitted or only exist in one OS's format, so skip it if normalizeExt reports an error
        if (icon) {
          rcOpts.icon = icon
        }

        debug(`Running rcedit with the options ${JSON.stringify(rcOpts)}`)
        return pify(require('rcedit'))(this.electronBinaryPath, rcOpts)
      }).catch(err => {
        /* istanbul ignore next */
        throw updateWineMissingException(err)
      })
  }

  create () {
    return this.initialize()
      .then(() => this.renameElectron())
      .then(() => this.copyExtraResources())
      .then(() => this.runRcedit())
      .then(() => this.move())
  }
}

module.exports = {
  App: WindowsApp,
  updateWineMissingException: updateWineMissingException
}
