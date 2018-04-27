'use strict'

const debug = require('debug')('electron-download')
const envPaths = require('env-paths')
const fs = require('fs-extra')
const rc = require('rc')
const nugget = require('nugget')
const os = require('os')
const path = require('path')
const pathExists = require('path-exists')
const semver = require('semver')
const sumchecker = require('sumchecker')

class ElectronDownloader {
  constructor (opts) {
    this.opts = opts

    this.npmrc = {}
    try {
      rc('npm', this.npmrc)
    } catch (error) {
      console.error(`Error reading npm configuration: ${error.message}`)
    }
  }

  get baseUrl () {
    return process.env.NPM_CONFIG_ELECTRON_MIRROR ||
      process.env.npm_config_electron_mirror ||
      process.env.ELECTRON_MIRROR ||
      this.opts.mirror ||
      'https://github.com/electron/electron/releases/download/v'
  }

  get middleUrl () {
    return process.env.ELECTRON_CUSTOM_DIR || this.opts.customDir || this.version
  }

  get urlSuffix () {
    return process.env.ELECTRON_CUSTOM_FILENAME || this.opts.customFilename || this.filename
  }

  get arch () {
    return this.opts.arch || os.arch()
  }

  get cache () {
    if (this.opts.cache) return this.opts.cache

    const oldCacheDirectory = path.join(os.homedir(), './.electron')
    if (pathExists.sync(path.join(oldCacheDirectory, this.filename))) {
      return oldCacheDirectory
    }
    // use passed argument or XDG environment variable fallback to OS default
    return envPaths('electron', {suffix: ''}).cache
  }

  get cachedChecksum () {
    return path.join(this.cache, `${this.checksumFilename}-${this.version}`)
  }

  get cachedZip () {
    return path.join(this.cache, this.filename)
  }

  get checksumFilename () {
    return 'SHASUMS256.txt'
  }

  get checksumUrl () {
    return `${this.baseUrl}${this.middleUrl}/${this.checksumFilename}`
  }

  get filename () {
    const type = `${this.platform}-${this.arch}`
    const suffix = `v${this.version}-${type}`

    if (this.chromedriver) {
      // Chromedriver started using Electron's version in asset name in 1.7.0
      if (semver.gte(this.version, '1.7.0')) {
        return `chromedriver-${suffix}.zip`
      } else {
        return `chromedriver-v2.21-${type}.zip`
      }
    } else if (this.mksnapshot) {
      return `mksnapshot-${suffix}.zip`
    } else if (this.ffmpeg) {
      return `ffmpeg-${suffix}.zip`
    } else if (this.symbols) {
      return `electron-${suffix}-symbols.zip`
    } else if (this.dsym) {
      return `electron-${suffix}-dsym.zip`
    } else {
      return `electron-${suffix}.zip`
    }
  }

  get platform () {
    return this.opts.platform || os.platform()
  }

  get proxy () {
    let proxy
    if (this.npmrc && this.npmrc.proxy) proxy = this.npmrc.proxy
    if (this.npmrc && this.npmrc['https-proxy']) proxy = this.npmrc['https-proxy']

    return proxy
  }

  get quiet () {
    return this.opts.quiet || process.stdout.rows < 1
  }

  get strictSSL () {
    let strictSSL = true
    if (this.opts.strictSSL === false || this.npmrc['strict-ssl'] === false) {
      strictSSL = false
    }

    return strictSSL
  }

  get force () {
    return this.opts.force || false
  }

  get symbols () {
    return this.opts.symbols || false
  }

  get dsym () {
    return this.opts.dsym || false
  }

  get chromedriver () {
    return this.opts.chromedriver || false
  }

  get mksnapshot () {
    return this.opts.mksnapshot || false
  }

  get ffmpeg () {
    return this.opts.ffmpeg || false
  }

  get url () {
    return `${this.baseUrl}${this.middleUrl}/${this.urlSuffix}`
  }

  get verifyChecksumNeeded () {
    return semver.gte(this.version, '1.3.2')
  }

  get version () {
    return this.opts.version
  }

  checkForCachedChecksum (cb) {
    pathExists(this.cachedChecksum)
      .then(exists => {
        if (exists && !this.force) {
          this.verifyChecksum(cb)
        } else {
          this.downloadChecksum(cb)
        }
      })
  }

  checkForCachedZip (cb) {
    pathExists(this.cachedZip).then(exists => {
      if (exists && !this.force) {
        debug('zip exists', this.cachedZip)
        this.checkIfZipNeedsVerifying(cb)
      } else {
        this.ensureCacheDir(cb)
      }
    })
  }

  checkIfZipNeedsVerifying (cb) {
    if (this.verifyChecksumNeeded) {
      debug('Verifying zip with checksum')
      return this.checkForCachedChecksum(cb)
    }
    return cb(null, this.cachedZip)
  }

  createCacheDir (cb) {
    fs.mkdirs(this.cache, (err) => {
      if (err) {
        if (err.code !== 'EACCES') return cb(err)
        // try local folder if homedir is off limits (e.g. some linuxes return '/' as homedir)
        let localCache = path.resolve('./.electron')
        return fs.mkdirs(localCache, function (err) {
          if (err) return cb(err)
          cb(null, localCache)
        })
      }
      cb(null, this.cache)
    })
  }

  downloadChecksum (cb) {
    this.downloadFile(this.checksumUrl, this.cachedChecksum, cb, this.verifyChecksum.bind(this))
  }

  downloadFile (url, cacheFilename, cb, onSuccess) {
    const tempFileName = `tmp-${process.pid}-${(ElectronDownloader.tmpFileCounter++).toString(16)}-${path.basename(cacheFilename)}`
    debug('downloading', url, 'to', this.cache)
    let nuggetOpts = {
      target: tempFileName,
      dir: this.cache,
      resume: true,
      quiet: this.quiet,
      strictSSL: this.strictSSL,
      proxy: this.proxy
    }
    nugget(url, nuggetOpts, (errors) => {
      if (errors) {
        // nugget returns an array of errors but we only need 1st because we only have 1 url
        return this.handleDownloadError(cb, errors[0])
      }

      this.moveFileToCache(tempFileName, cacheFilename, cb, onSuccess)
    })
  }

  downloadIfNotCached (cb) {
    if (!this.version) return cb(new Error('must specify version'))
    debug('info', {cache: this.cache, filename: this.filename, url: this.url})
    this.checkForCachedZip(cb)
  }

  downloadZip (cb) {
    this.downloadFile(this.url, this.cachedZip, cb, this.checkIfZipNeedsVerifying.bind(this))
  }

  ensureCacheDir (cb) {
    debug('creating cache dir')
    this.createCacheDir((err, actualCache) => {
      if (err) return cb(err)
      this.opts.cache = actualCache // in case cache dir changed
      this.downloadZip(cb)
    })
  }

  handleDownloadError (cb, error) {
    if (error.message.indexOf('404') === -1) return cb(error)
    if (this.symbols) {
      error.message = `Failed to find Electron symbols v${this.version} for ${this.platform}-${this.arch} at ${this.url}`
    } else {
      error.message = `Failed to find Electron v${this.version} for ${this.platform}-${this.arch} at ${this.url}`
    }

    return cb(error)
  }

  moveFileToCache (filename, target, cb, onSuccess) {
    const cache = this.cache
    debug('moving', filename, 'from', cache, 'to', target)
    fs.rename(path.join(cache, filename), target, (err) => {
      if (err) {
        fs.unlink(cache, cleanupError => {
          try {
            if (cleanupError) {
              console.error(`Error deleting cache file: ${cleanupError.message}`)
            }
          } finally {
            cb(err)
          }
        })
      } else {
        onSuccess(cb)
      }
    })
  }

  verifyChecksum (cb) {
    let options = {}
    if (semver.lt(this.version, '1.3.5')) {
      options.defaultTextEncoding = 'binary'
    }
    let checker = new sumchecker.ChecksumValidator('sha256', this.cachedChecksum, options)
    checker.validate(this.cache, this.filename).then(() => {
      cb(null, this.cachedZip)
    }, (err) => {
      fs.unlink(this.cachedZip, (fsErr) => {
        if (fsErr) return cb(fsErr)
        cb(err)
      })
    })
  }
}

ElectronDownloader.tmpFileCounter = 0

module.exports = function download (opts, cb) {
  let downloader = new ElectronDownloader(opts)
  downloader.downloadIfNotCached(cb)
}
