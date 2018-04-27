'use strict'

const common = require('./common')
const debug = require('debug')('electron-packager')
const download = require('./download')
const extract = require('extract-zip')
const fs = require('fs-extra')
const getMetadataFromPackageJSON = require('./infer')
const hooks = require('./hooks')
const ignore = require('./ignore')
const metadata = require('./package.json')
const nodeify = require('nodeify')
const path = require('path')
const pify = require('pify')
const targets = require('./targets')

function debugHostInfo () {
  debug(`Electron Packager ${metadata.version}`)
  debug(`Node ${process.version}`)
  debug(`Host Operating system: ${process.platform} (${process.arch})`)
}

class Packager {
  constructor (opts) {
    this.opts = opts
    this.tempBase = common.baseTempDir(opts)
    this.useTempDir = opts.tmpdir !== false
    this.canCreateSymlinks = undefined
  }

  ensureTempDir () {
    if (this.useTempDir) {
      return fs.remove(this.tempBase)
    } else {
      return Promise.resolve()
    }
  }

  testSymlink (comboOpts, zipPath) {
    const testPath = path.join(this.tempBase, 'symlink-test')
    const testFile = path.join(testPath, 'test')
    const testLink = path.join(testPath, 'testlink')

    const cleanup = (symlinksWork) =>
      fs.remove(testPath).then(() => symlinksWork)

    return fs.outputFile(testFile, '')
      .then(() => fs.symlink(testFile, testLink))
      .then(() => cleanup(true))
      .catch(/* istanbul ignore next */ () => cleanup(false))
      .then(result => {
        this.canCreateSymlinks = result
        if (this.canCreateSymlinks) return this.checkOverwrite(comboOpts, zipPath)

        /* istanbul ignore next */
        return this.skipHostPlatformSansSymlinkSupport(comboOpts)
      })
  }

  /* istanbul ignore next */
  skipHostPlatformSansSymlinkSupport (comboOpts) {
    common.info(`Cannot create symlinks (on Windows hosts, it requires admin privileges); skipping ${comboOpts.platform} platform`, this.opts.quiet)
    return Promise.resolve()
  }

  overwriteAndCreateApp (outDir, comboOpts, zipPath) {
    debug(`Removing ${outDir} due to setting overwrite: true`)
    return fs.remove(outDir)
      .then(() => this.createApp(comboOpts, zipPath))
  }

  extractElectronZip (comboOpts, zipPath, buildDir) {
    debug(`Extracting ${zipPath} to ${buildDir}`)
    return pify(extract)(zipPath, { dir: buildDir })
      .then(() => hooks.promisifyHooks(this.opts.afterExtract, [buildDir, comboOpts.electronVersion, comboOpts.platform, comboOpts.arch]))
  }

  createApp (comboOpts, zipPath) {
    let buildParentDir
    if (this.useTempDir) {
      buildParentDir = this.tempBase
    } else {
      buildParentDir = this.opts.out || process.cwd()
    }
    const buildDir = path.resolve(buildParentDir, `${comboOpts.platform}-${comboOpts.arch}-template`)
    common.info(`Packaging app for platform ${comboOpts.platform} ${comboOpts.arch} using electron v${comboOpts.electronVersion}`, this.opts.quiet)

    debug(`Creating ${buildDir}`)
    return fs.ensureDir(buildDir)
      .then(() => this.extractElectronZip(comboOpts, zipPath, buildDir))
      .then(() => {
        const os = require(targets.osModules[comboOpts.platform])
        const app = new os.App(comboOpts, buildDir)
        return app.create()
      })
  }

  checkOverwrite (comboOpts, zipPath) {
    const finalPath = common.generateFinalPath(comboOpts)
    return fs.pathExists(finalPath)
      .then(exists => {
        if (exists) {
          if (this.opts.overwrite) {
            return this.overwriteAndCreateApp(finalPath, comboOpts, zipPath)
          } else {
            common.info(`Skipping ${comboOpts.platform} ${comboOpts.arch} (output dir already exists, use --overwrite to force)`, this.opts.quiet)
            return true
          }
        } else {
          return this.createApp(comboOpts, zipPath)
        }
      })
  }

  packageForPlatformAndArch (downloadOpts) {
    return download.downloadElectronZip(downloadOpts)
      .then(zipPath => {
        // Create delegated options object with specific platform and arch, for output directory naming
        const comboOpts = Object.assign({}, this.opts, {
          arch: downloadOpts.arch,
          platform: downloadOpts.platform,
          electronVersion: downloadOpts.version
        })

        if (!this.useTempDir) {
          return this.createApp(comboOpts, zipPath)
        }

        if (common.isPlatformMac(comboOpts.platform)) {
          /* istanbul ignore else */
          if (this.canCreateSymlinks === undefined) {
            return this.testSymlink(comboOpts, zipPath)
          } else if (!this.canCreateSymlinks) {
            return this.skipHostPlatformSansSymlinkSupport(comboOpts)
          }
        }

        return this.checkOverwrite(comboOpts, zipPath)
      })
  }
}

function packageAllSpecifiedCombos (opts, archs, platforms) {
  const packager = new Packager(opts)
  return packager.ensureTempDir()
    .then(() => Promise.all(download.createDownloadCombos(opts, platforms, archs).map(
      downloadOpts => packager.packageForPlatformAndArch(downloadOpts)
    )))
}

function packagerPromise (opts) {
  debugHostInfo()
  if (debug.enabled) debug(`Packager Options: ${JSON.stringify(opts)}`)

  const archs = targets.validateListFromOptions(opts, 'arch')
  const platforms = targets.validateListFromOptions(opts, 'platform')
  if (!Array.isArray(archs)) return Promise.reject(archs)
  if (!Array.isArray(platforms)) return Promise.reject(platforms)

  debug(`Target Platforms: ${platforms.join(', ')}`)
  debug(`Target Architectures: ${archs.join(', ')}`)

  const packageJSONDir = path.resolve(process.cwd(), opts.dir) || process.cwd()

  return getMetadataFromPackageJSON(platforms, opts, packageJSONDir)
    .then(() => {
      if (opts.name.endsWith(' Helper')) {
        throw new Error('Application names cannot end in " Helper" due to limitations on macOS')
      }

      debug(`Application name: ${opts.name}`)
      debug(`Target Electron version: ${opts.electronVersion}`)

      ignore.generateIgnores(opts)

      return packageAllSpecifiedCombos(opts, archs, platforms)
    })
    // Remove falsy entries (e.g. skipped platforms)
    .then(appPaths => appPaths.filter(appPath => appPath))
}

module.exports = function packager (opts, cb) {
  return nodeify(packagerPromise(opts), cb)
}
