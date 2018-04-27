'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('electron-download');
var fs = require('fs-extra');
var homePath = require('home-path');
var rc = require('rc');
var nugget = require('nugget');
var os = require('os');
var path = require('path');
var pathExists = require('path-exists');
var semver = require('semver');
var sumchecker = require('sumchecker');

var ElectronDownloader = function () {
  function ElectronDownloader(opts) {
    _classCallCheck(this, ElectronDownloader);

    this.opts = opts;

    this.npmrc = {};
    try {
      rc('npm', this.npmrc);
    } catch (error) {
      console.error('Error reading npm configuration: ' + error.message);
    }
  }

  _createClass(ElectronDownloader, [{
    key: 'checkForCachedChecksum',
    value: function checkForCachedChecksum(cb) {
      var _this = this;

      pathExists(this.cachedChecksum).then(function (exists) {
        if (exists && !_this.force) {
          _this.verifyChecksum(cb);
        } else if (_this.tmpdir) {
          _this.downloadChecksum(cb);
        } else {
          _this.createTempDir(cb, function (callback) {
            _this.downloadChecksum(callback);
          });
        }
      });
    }
  }, {
    key: 'checkForCachedZip',
    value: function checkForCachedZip(cb) {
      var _this2 = this;

      pathExists(this.cachedZip).then(function (exists) {
        if (exists && !_this2.force) {
          debug('zip exists', _this2.cachedZip);
          _this2.checkIfZipNeedsVerifying(cb);
        } else {
          _this2.ensureCacheDir(cb);
        }
      });
    }
  }, {
    key: 'checkIfZipNeedsVerifying',
    value: function checkIfZipNeedsVerifying(cb) {
      if (this.verifyChecksumNeeded) {
        debug('Verifying zip with checksum');
        return this.checkForCachedChecksum(cb);
      }
      return cb(null, this.cachedZip);
    }
  }, {
    key: 'createCacheDir',
    value: function createCacheDir(cb) {
      var _this3 = this;

      fs.mkdirs(this.cache, function (err) {
        if (err) {
          var _ret = function () {
            if (err.code !== 'EACCES') return {
                v: cb(err)
              };
            // try local folder if homedir is off limits (e.g. some linuxes return '/' as homedir)
            var localCache = path.resolve('./.electron');
            return {
              v: fs.mkdirs(localCache, function (err) {
                if (err) return cb(err);
                cb(null, localCache);
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
        cb(null, _this3.cache);
      });
    }
  }, {
    key: 'createTempDir',
    value: function createTempDir(cb, onSuccess) {
      this.tmpdir = path.join(os.tmpdir(), 'electron-tmp-download-' + process.pid + '-' + Date.now());
      fs.mkdirs(this.tmpdir, function (err) {
        if (err) return cb(err);
        onSuccess(cb);
      });
    }
  }, {
    key: 'downloadChecksum',
    value: function downloadChecksum(cb) {
      this.downloadFile(this.checksumUrl, this.checksumFilename, this.cachedChecksum, cb, this.verifyChecksum.bind(this));
    }
  }, {
    key: 'downloadFile',
    value: function downloadFile(url, filename, cacheFilename, cb, onSuccess) {
      var _this4 = this;

      debug('downloading', url, 'to', this.tmpdir);
      var nuggetOpts = {
        target: filename,
        dir: this.tmpdir,
        resume: true,
        quiet: this.quiet,
        strictSSL: this.strictSSL,
        proxy: this.proxy
      };
      nugget(url, nuggetOpts, function (errors) {
        if (errors) {
          // nugget returns an array of errors but we only need 1st because we only have 1 url
          return _this4.handleDownloadError(cb, errors[0]);
        }

        _this4.moveFileToCache(filename, cacheFilename, cb, onSuccess);
      });
    }
  }, {
    key: 'downloadIfNotCached',
    value: function downloadIfNotCached(cb) {
      if (!this.version) return cb(new Error('must specify version'));
      debug('info', { cache: this.cache, filename: this.filename, url: this.url });
      this.checkForCachedZip(cb);
    }
  }, {
    key: 'downloadZip',
    value: function downloadZip(cb) {
      this.downloadFile(this.url, this.filename, this.cachedZip, cb, this.checkIfZipNeedsVerifying.bind(this));
    }
  }, {
    key: 'ensureCacheDir',
    value: function ensureCacheDir(cb) {
      var _this5 = this;

      debug('creating cache/tmp dirs');
      this.createCacheDir(function (err, actualCache) {
        if (err) return cb(err);
        _this5.opts.cache = actualCache; // in case cache dir changed
        _this5.createTempDir(cb, _this5.downloadZip.bind(_this5));
      });
    }
  }, {
    key: 'handleDownloadError',
    value: function handleDownloadError(cb, error) {
      if (error.message.indexOf('404') === -1) return cb(error);
      if (this.symbols) {
        error.message = 'Failed to find Electron symbols v' + this.version + ' for ' + this.platform + '-' + this.arch + ' at ' + this.url;
      } else {
        error.message = 'Failed to find Electron v' + this.version + ' for ' + this.platform + '-' + this.arch + ' at ' + this.url;
      }

      return cb(error);
    }
  }, {
    key: 'moveFileToCache',
    value: function moveFileToCache(filename, target, cb, onSuccess) {
      var _this6 = this;

      debug('moving', filename, 'from', this.tmpdir, 'to', target);
      fs.unlink(target, function (err) {
        if (err != null && err.code !== 'ENOENT') return cb(err);
        fs.move(path.join(_this6.tmpdir, filename), target, function (err) {
          if (err) return cb(err);
          onSuccess(cb);
        });
      });
    }
  }, {
    key: 'verifyChecksum',
    value: function verifyChecksum(cb) {
      var _this7 = this;

      var options = {};
      if (semver.lt(this.version, '1.3.5')) {
        options.defaultTextEncoding = 'binary';
      }
      var checker = new sumchecker.ChecksumValidator('sha256', this.cachedChecksum, options);
      checker.validate(this.cache, this.filename).then(function () {
        cb(null, _this7.cachedZip);
      }, function (err) {
        fs.unlink(_this7.cachedZip, function (fsErr) {
          if (fsErr) return cb(fsErr);
          cb(err);
        });
      });
    }
  }, {
    key: 'baseUrl',
    get: function get() {
      return process.env.NPM_CONFIG_ELECTRON_MIRROR || process.env.npm_config_electron_mirror || process.env.ELECTRON_MIRROR || this.opts.mirror || 'https://github.com/electron/electron/releases/download/v';
    }
  }, {
    key: 'middleUrl',
    get: function get() {
      return process.env.ELECTRON_CUSTOM_DIR || this.opts.customDir || this.version;
    }
  }, {
    key: 'urlSuffix',
    get: function get() {
      return process.env.ELECTRON_CUSTOM_FILENAME || this.opts.customFilename || this.filename;
    }
  }, {
    key: 'arch',
    get: function get() {
      return this.opts.arch || os.arch();
    }
  }, {
    key: 'cache',
    get: function get() {
      return this.opts.cache || path.join(homePath(), './.electron');
    }
  }, {
    key: 'cachedChecksum',
    get: function get() {
      return path.join(this.cache, this.checksumFilename + '-' + this.version);
    }
  }, {
    key: 'cachedZip',
    get: function get() {
      return path.join(this.cache, this.filename);
    }
  }, {
    key: 'checksumFilename',
    get: function get() {
      return 'SHASUMS256.txt';
    }
  }, {
    key: 'checksumUrl',
    get: function get() {
      return '' + this.baseUrl + this.middleUrl + '/' + this.checksumFilename;
    }
  }, {
    key: 'filename',
    get: function get() {
      var type = this.platform + '-' + this.arch;
      var suffix = 'v' + this.version + '-' + type;

      if (this.chromedriver) {
        return 'chromedriver-v2.21-' + type + '.zip';
      } else if (this.mksnapshot) {
        return 'mksnapshot-' + suffix + '.zip';
      } else if (this.ffmpeg) {
        return 'ffmpeg-' + suffix + '.zip';
      } else if (this.symbols) {
        return 'electron-' + suffix + '-symbols.zip';
      } else if (this.dsym) {
        return 'electron-' + suffix + '-dsym.zip';
      } else {
        return 'electron-' + suffix + '.zip';
      }
    }
  }, {
    key: 'platform',
    get: function get() {
      return this.opts.platform || os.platform();
    }
  }, {
    key: 'proxy',
    get: function get() {
      var proxy = void 0;
      if (this.npmrc && this.npmrc.proxy) proxy = this.npmrc.proxy;
      if (this.npmrc && this.npmrc['https-proxy']) proxy = this.npmrc['https-proxy'];

      return proxy;
    }
  }, {
    key: 'quiet',
    get: function get() {
      return this.opts.quiet || process.stdout.rows < 1;
    }
  }, {
    key: 'strictSSL',
    get: function get() {
      var strictSSL = true;
      if (this.opts.strictSSL === false || this.npmrc['strict-ssl'] === false) {
        strictSSL = false;
      }

      return strictSSL;
    }
  }, {
    key: 'force',
    get: function get() {
      return this.opts.force || false;
    }
  }, {
    key: 'symbols',
    get: function get() {
      return this.opts.symbols || false;
    }
  }, {
    key: 'dsym',
    get: function get() {
      return this.opts.dsym || false;
    }
  }, {
    key: 'chromedriver',
    get: function get() {
      return this.opts.chromedriver || false;
    }
  }, {
    key: 'mksnapshot',
    get: function get() {
      return this.opts.mksnapshot || false;
    }
  }, {
    key: 'ffmpeg',
    get: function get() {
      return this.opts.ffmpeg || false;
    }
  }, {
    key: 'url',
    get: function get() {
      return '' + this.baseUrl + this.middleUrl + '/' + this.urlSuffix;
    }
  }, {
    key: 'verifyChecksumNeeded',
    get: function get() {
      return semver.gte(this.version, '1.3.2');
    }
  }, {
    key: 'version',
    get: function get() {
      return this.opts.version;
    }
  }]);

  return ElectronDownloader;
}();

module.exports = function download(opts, cb) {
  var downloader = new ElectronDownloader(opts);
  downloader.downloadIfNotCached(cb);
};