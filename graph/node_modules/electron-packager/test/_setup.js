'use strict'

const common = require('../common')
const download = require('../download')
const config = require('./config.json')
const exec = require('mz/child_process').exec
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const targets = require('../targets')

function fixtureSubdir (subdir) {
  return path.join(__dirname, 'fixtures', subdir)
}

/**
 * Skip testing darwin/mas target on Windows since Electron Packager itself skips it
 * (see https://github.com/electron-userland/electron-packager/issues/71)
 */
function skipDownloadingMacZips (platform, arch) {
  return common.isPlatformMac(platform) && process.platform === 'win32'
}

function downloadAll (version) {
  console.log(`Calling electron-download for ${version} before running tests...`)
  const combinations = download.createDownloadCombos({electronVersion: config.version, all: true}, targets.officialPlatforms, targets.officialArchs, skipDownloadingMacZips)

  return Promise.all(combinations.map(combination => downloadElectronZip(version, combination)))
}

function downloadElectronZip (version, options) {
  return download.downloadElectronZip(Object.assign({}, options, {
    cache: path.join(os.homedir(), '.electron'),
    quiet: !!process.env.CI,
    version: version
  }))
}

function downloadMASLoginHelperElectronZip () {
  if (process.platform !== 'win32') {
    const version = '2.0.0-beta.1'
    console.log(`Calling electron-download for ${version} (MAS only) before running tests...`)
    return downloadElectronZip(version, { platform: 'mas', arch: 'x64' })
  }
}

/**
 * Download all Electron distributions before running tests to avoid timing out due to network
 * speed. Most tests run with the config.json version, but we have some tests using 0.37.4, an
 * `electron` module specific test using 1.3.1., and an MAS-specific test using 2.0.0-beta.1.
 */
function preDownloadElectron () {
  const versions = [
    config.version,
    '0.37.4',
    '1.3.1'
  ]
  return Promise.all(versions.map(downloadAll))
    .then(downloadMASLoginHelperElectronZip)
}

function npmInstallForFixture (fixture) {
  const fixtureDir = fixtureSubdir(fixture)
  return fs.exists(path.join(fixtureDir, 'node_modules'))
    .then(exists => {
      if (exists) {
        return true
      } else {
        console.log(`Running npm install in fixtures/${fixture}...`)
        return exec('npm install --no-bin-links', {cwd: fixtureDir})
      }
    })
}

function npmInstallForFixtures () {
  const fixtures = [
    'basic',
    'basic-renamed-to-electron',
    'electron-in-dependencies',
    'infer-missing-version-only',
    'el-0374'
  ]
  return Promise.all(fixtures.map(npmInstallForFixture))
}

const WORK_CWD = path.join(__dirname, 'work')

function ensureEmptyWorkDirExists () {
  return fs.remove(WORK_CWD)
    .then(() => fs.mkdirs(WORK_CWD))
}

module.exports = {
  fixtureSubdir: fixtureSubdir,
  setupTestsuite: function setupTestsuite () {
    return preDownloadElectron()
      .then(npmInstallForFixtures)
      .catch(error => {
        console.error(error.stack || error)
        return process.exit(1)
      })
      .then(ensureEmptyWorkDirExists)
  },
  WORK_CWD: WORK_CWD
}
