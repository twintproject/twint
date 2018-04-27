var path = require('path')
var test = require('tape')

var download = require('electron-download')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var series = require('run-series')
var compareVersion = require('compare-version')
var extract = require('extract-zip')

var config = require('./config')

var ORIGINAL_CWD = process.cwd()
var WORK_CWD = path.join(__dirname, 'work')

var versions = config.versions
var archs = ['x64']
var platforms = ['darwin', 'mas']
var slice = Array.prototype.slice

var releases = []
versions.forEach(function (version) {
  archs.forEach(function (arch) {
    platforms.forEach(function (platform) {
      // Only versions later than 0.34.0 offer mas builds
      if (platform !== 'mas' || compareVersion(version, '0.34.0') >= 0) {
        releases.push({
          arch: arch,
          platform: platform,
          version: version
        })
      }
    })
  })
})

exports.generateReleaseName = function getExtractName (release) {
  return 'v' + release.version + '-' + release.platform + '-' + release.arch
}

exports.generateAppPath = function getExtractName (release) {
  return path.join(exports.generateReleaseName(release), 'Electron.app')
}

exports.downloadElectrons = function downloadElectrons (callback) {
  series(releases.map(function (release) {
    return function (cb) {
      download(release, function (err, zipPath) {
        if (err) return callback(err)
        extract(zipPath, {dir: path.join(WORK_CWD, exports.generateReleaseName(release))}, cb)
      })
    }
  }), callback)
}

exports.setup = function setup () {
  test('setup', function (t) {
    mkdirp(WORK_CWD, function (err) {
      if (err) {
        t.end(err)
      } else {
        process.chdir(WORK_CWD)
        t.end()
      }
    })
  })
}

exports.teardown = function teardown () {
  test('teardown', function (t) {
    process.chdir(ORIGINAL_CWD)
    rimraf(WORK_CWD, function (err) {
      t.end(err)
    })
  })
}

exports.forEachRelease = function forEachRelease (cb) {
  releases.forEach(cb)
}

exports.testAllReleases = function testAllReleases (name, createTest /*, ...createTestArgs */) {
  var args = slice.call(arguments, 2)
  exports.setup()
  exports.forEachRelease(function (release) {
    test(name + ':' + exports.generateReleaseName(release),
      createTest.apply(null, [release].concat(args)))
  })
  exports.teardown()
}
