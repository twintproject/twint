'use strict'

const App = require('./platform')
const common = require('./common')
const debug = require('debug')('electron-packager')
const fs = require('fs-extra')
const path = require('path')
const plist = require('plist')
const sign = require('electron-osx-sign').signAsync

class MacApp extends App {
  constructor (opts, templatePath) {
    super(opts, templatePath)

    this.appName = opts.name
  }

  get appCategoryType () {
    return this.opts.appCategoryType
  }

  get appCopyright () {
    return this.opts.appCopyright
  }

  get appVersion () {
    return this.opts.appVersion
  }

  get buildVersion () {
    return this.opts.buildVersion
  }

  get protocols () {
    return this.opts.protocols.map((protocol) => {
      return {
        CFBundleURLName: protocol.name,
        CFBundleURLSchemes: [].concat(protocol.schemes)
      }
    })
  }

  get dotAppName () {
    return `${common.sanitizeAppName(this.appName)}.app`
  }

  get defaultBundleName () {
    return `com.electron.${common.sanitizeAppName(this.appName).toLowerCase()}`
  }

  get originalResourcesDir () {
    return path.join(this.contentsPath, 'Resources')
  }

  get resourcesDir () {
    return path.join(this.dotAppName, 'Contents', 'Resources')
  }

  get electronBinaryDir () {
    return path.join(this.contentsPath, 'MacOS')
  }

  get originalElectronName () {
    return 'Electron'
  }

  get newElectronName () {
    return this.appPlist.CFBundleExecutable
  }

  get renamedAppPath () {
    return path.join(this.stagingPath, this.dotAppName)
  }

  get electronAppPath () {
    return path.join(this.stagingPath, `${this.originalElectronName}.app`)
  }

  get contentsPath () {
    return path.join(this.electronAppPath, 'Contents')
  }

  get frameworksPath () {
    return path.join(this.contentsPath, 'Frameworks')
  }

  get loginItemsPath () {
    return path.join(this.contentsPath, 'Library', 'LoginItems')
  }

  get loginHelperPath () {
    return path.join(this.loginItemsPath, 'Electron Login Helper.app')
  }

  updatePlist (base, displayName, identifier, name) {
    return Object.assign(base, {
      CFBundleDisplayName: displayName,
      CFBundleExecutable: common.sanitizeAppName(displayName),
      CFBundleIdentifier: identifier,
      CFBundleName: common.sanitizeAppName(name)
    })
  }

  updateHelperPlist (base, suffix) {
    let helperSuffix, identifier, name
    if (suffix) {
      helperSuffix = `Helper ${suffix}`
      identifier = `${this.helperBundleIdentifier}.${suffix}`
      name = `${this.appName} ${helperSuffix}`
    } else {
      helperSuffix = 'Helper'
      identifier = this.helperBundleIdentifier
      name = this.appName
    }
    return this.updatePlist(base, `${this.appName} ${helperSuffix}`, identifier, name)
  }

  extendAppPlist (propsOrFilename) {
    if (!propsOrFilename) {
      return Promise.resolve()
    }

    if (typeof propsOrFilename === 'string') {
      return this.loadPlist(propsOrFilename)
        .then(plist => Object.assign(this.appPlist, plist))
    } else {
      return Promise.resolve(Object.assign(this.appPlist, propsOrFilename))
    }
  }

  loadPlist (filename, propName) {
    return fs.readFile(filename)
      .then(buffer => plist.parse(buffer.toString()))
      .then(plist => {
        if (propName) this[propName] = plist
        return plist
      })
  }

  ehPlistFilename (helper) {
    return this.helperPlistFilename(path.join(this.frameworksPath, helper))
  }

  helperPlistFilename (helperApp) {
    return path.join(helperApp, 'Contents', 'Info.plist')
  }

  determinePlistFilesToUpdate () {
    const appPlistFilename = path.join(this.contentsPath, 'Info.plist')
    const helperPlistFilename = this.ehPlistFilename('Electron Helper.app')
    const helperEHPlistFilename = this.ehPlistFilename('Electron Helper EH.app')
    const helperNPPlistFilename = this.ehPlistFilename('Electron Helper NP.app')
    const loginHelperPlistFilename = this.helperPlistFilename(this.loginHelperPath)

    const plists = [
      [appPlistFilename, 'appPlist'],
      [helperPlistFilename, 'helperPlist'],
      [helperEHPlistFilename, 'helperEHPlist'],
      [helperNPPlistFilename, 'helperNPPlist']
    ]

    return fs.pathExists(loginHelperPlistFilename)
      .then(exists => {
        if (exists) {
          plists.push([loginHelperPlistFilename, 'loginHelperPlist'])
        }
        return plists
      })
  }

  updatePlistFiles () {
    let plists

    const appBundleIdentifier = filterCFBundleIdentifier(this.opts.appBundleId || this.defaultBundleName)
    this.helperBundleIdentifier = filterCFBundleIdentifier(this.opts.helperBundleId || `${appBundleIdentifier}.helper`)

    return this.determinePlistFilesToUpdate()
      .then(plistsToUpdate => {
        plists = plistsToUpdate
        return Promise.all(plists.map(plistArgs => this.loadPlist.apply(this, plistArgs)))
      }).then(() => this.extendAppPlist(this.opts.extendInfo))
      .then(() => {
        this.appPlist = this.updatePlist(this.appPlist, this.executableName, appBundleIdentifier, this.appName)
        this.helperPlist = this.updateHelperPlist(this.helperPlist)
        this.helperEHPlist = this.updateHelperPlist(this.helperEHPlist, 'EH')
        this.helperNPPlist = this.updateHelperPlist(this.helperNPPlist, 'NP')

        if (this.loginHelperPlist) {
          const loginHelperName = common.sanitizeAppName(`${this.appName} Login Helper`)
          this.loginHelperPlist.CFBundleExecutable = loginHelperName
          this.loginHelperPlist.CFBundleIdentifier = `${appBundleIdentifier}.loginhelper`
          this.loginHelperPlist.CFBundleName = loginHelperName
        }

        if (this.appVersion) {
          this.appPlist.CFBundleShortVersionString = this.appPlist.CFBundleVersion = '' + this.appVersion
        }

        if (this.buildVersion) {
          this.appPlist.CFBundleVersion = '' + this.buildVersion
        }

        if (this.opts.protocols && this.opts.protocols.length) {
          this.appPlist.CFBundleURLTypes = this.protocols
        }

        if (this.appCategoryType) {
          this.appPlist.LSApplicationCategoryType = this.appCategoryType
        }

        if (this.appCopyright) {
          this.appPlist.NSHumanReadableCopyright = this.appCopyright
        }

        return Promise.all(plists.map(plistArgs => {
          const filename = plistArgs[0]
          const varName = plistArgs[1]
          return fs.writeFile(filename, plist.build(this[varName]))
        }))
      })
  }

  moveHelpers () {
    const helpers = [' Helper', ' Helper EH', ' Helper NP']
    return Promise.all(helpers.map(suffix => this.moveHelper(this.frameworksPath, suffix)))
      .then(() => fs.pathExists(this.loginItemsPath))
      .then(exists => exists ? this.moveHelper(this.loginItemsPath, ' Login Helper') : null)
  }

  moveHelper (helperDirectory, suffix) {
    const originalBasename = `Electron${suffix}`
    const newBasename = `${common.sanitizeAppName(this.appName)}${suffix}`
    const originalAppname = `${originalBasename}.app`
    const executableBasePath = path.join(helperDirectory, originalAppname, 'Contents', 'MacOS')

    return this.relativeRename(executableBasePath, originalBasename, newBasename)
      .then(() => this.relativeRename(helperDirectory, originalAppname, `${newBasename}.app`))
  }

  copyIcon () {
    if (!this.opts.icon) {
      return Promise.resolve()
    }

    return this.normalizeIconExtension('.icns')
      // Ignore error if icon doesn't exist, in case it's only available for other OS
      .catch(Promise.resolve)
      .then(icon => {
        debug(`Copying icon "${icon}" to app's Resources as "${this.appPlist.CFBundleIconFile}"`)
        return fs.copy(icon, path.join(this.originalResourcesDir, this.appPlist.CFBundleIconFile))
      })
  }

  renameAppAndHelpers () {
    return this.moveHelpers()
      .then(() => fs.rename(this.electronAppPath, this.renamedAppPath))
  }

  signAppIfSpecified () {
    let osxSignOpt = this.opts.osxSign
    let platform = this.opts.platform
    let version = this.opts.electronVersion

    if ((platform === 'all' || platform === 'mas') &&
        osxSignOpt === undefined) {
      common.warning('signing is required for mas builds. Provide the osx-sign option, ' +
                     'or manually sign the app later.')
    }

    if (osxSignOpt) {
      const signOpts = createSignOpts(osxSignOpt, platform, this.renamedAppPath, version, this.opts.quiet)
      debug(`Running electron-osx-sign with the options ${JSON.stringify(signOpts)}`)
      return sign(signOpts)
      // Although not signed successfully, the application is packed.
        .catch(err => common.warning(`Code sign failed; please retry manually. ${err}`))
    } else {
      return Promise.resolve()
    }
  }

  create () {
    return this.initialize()
      .then(() => this.updatePlistFiles())
      .then(() => this.copyIcon())
      .then(() => this.renameElectron())
      .then(() => this.renameAppAndHelpers())
      .then(() => this.copyExtraResources())
      .then(() => this.signAppIfSpecified())
      .then(() => this.move())
  }
}

/**
 * Remove special characters and allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)
 * Apple documentation:
 * https://developer.apple.com/library/mac/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html#//apple_ref/doc/uid/20001431-102070
 */
function filterCFBundleIdentifier (identifier) {
  return identifier.replace(/ /g, '-').replace(/[^a-zA-Z0-9.-]/g, '')
}

function createSignOpts (properties, platform, app, version, quiet) {
  // use default sign opts if osx-sign is true, otherwise clone osx-sign object
  let signOpts = properties === true ? {identity: null} : Object.assign({}, properties)

  // osx-sign options are handed off to sign module, but
  // with a few additions from the main options
  // user may think they can pass platform, app, or version, but they will be ignored
  common.subOptionWarning(signOpts, 'osx-sign', 'platform', platform, quiet)
  common.subOptionWarning(signOpts, 'osx-sign', 'app', app, quiet)
  common.subOptionWarning(signOpts, 'osx-sign', 'version', version, quiet)

  if (signOpts.binaries) {
    common.warning('osx-sign.binaries is not an allowed sub-option. Not passing to electron-osx-sign.')
    delete signOpts.binaries
  }

  // Take argument osx-sign as signing identity:
  // if opts.osxSign is true (bool), fallback to identity=null for
  // autodiscovery. Otherwise, provide signing certificate info.
  if (signOpts.identity === true) {
    signOpts.identity = null
  }

  return signOpts
}

module.exports = {
  App: MacApp,
  createSignOpts: createSignOpts,
  filterCFBundleIdentifier: filterCFBundleIdentifier
}
