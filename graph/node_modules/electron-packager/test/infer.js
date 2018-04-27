'use strict'

const fs = require('fs-extra')
const getMetadataFromPackageJSON = require('../infer')
const packager = require('..')
const path = require('path')
const pkgUp = require('pkg-up')
const util = require('./_util')

function inferElectronVersionTest (t, opts, fixture, packageName) {
  delete opts.electronVersion
  opts.dir = util.fixtureSubdir(fixture)

  return getMetadataFromPackageJSON([], opts, opts.dir)
    .then(() => {
      const packageJSON = require(path.join(opts.dir, 'package.json'))
      return t.is(opts.electronVersion, packageJSON.devDependencies[packageName], `The version should be inferred from installed ${packageName} version`)
    })
}

function copyFixtureToTempDir (t, fixtureSubdir) {
  const tmpdir = path.join(t.context.tempDir, fixtureSubdir)
  const fixtureDir = util.fixtureSubdir(fixtureSubdir)
  const tmpdirPkg = pkgUp.sync(path.join(tmpdir, '..'))

  if (tmpdirPkg) {
    throw new Error(`Found package.json in parent of temp directory, which will interfere with test results. Please remove package.json at ${tmpdirPkg}`)
  }

  return fs.emptyDir(tmpdir)
    .then(() => fs.copy(fixtureDir, tmpdir))
    .then(() => tmpdir)
}

function inferFailureTest (t, opts, fixtureSubdir) {
  return copyFixtureToTempDir(t, fixtureSubdir)
    .then(dir => {
      delete opts.name
      delete opts.electronVersion
      opts.dir = dir

      return t.throws(packager(opts))
    })
}

function inferMissingVersionTest (t, opts) {
  return copyFixtureToTempDir(t, 'infer-missing-version-only')
    .then(dir => {
      delete opts.electronVersion
      opts.dir = dir

      return getMetadataFromPackageJSON([], opts, dir)
    }).then(() => {
      const packageJSON = require(path.join(opts.dir, 'package.json'))
      return t.is(opts.electronVersion, packageJSON.devDependencies['electron'], 'The version should be inferred from installed electron module version')
    })
}

function testInferWin32metadata (t, opts, expected, assertionMessage) {
  return copyFixtureToTempDir(t, 'infer-win32metadata')
    .then(dir => {
      opts.dir = dir

      return getMetadataFromPackageJSON(['win32'], opts, dir)
    }).then(() => t.deepEqual(opts.win32metadata, expected, assertionMessage))
}

function testInferWin32metadataAuthorObject (t, opts, author, expected, assertionMessage) {
  let packageJSONFilename

  delete opts.name

  return copyFixtureToTempDir(t, 'infer-win32metadata')
    .then(dir => {
      opts.dir = dir

      packageJSONFilename = path.join(dir, 'package.json')
      return fs.readJson(packageJSONFilename)
    }).then(packageJSON => {
      packageJSON.author = author
      return fs.writeJson(packageJSONFilename, packageJSON)
    }).then(() => getMetadataFromPackageJSON(['win32'], opts, opts.dir))
    .then(() => t.deepEqual(opts.win32metadata, expected, assertionMessage))
}

util.testSinglePlatformParallel('infer using `electron-prebuilt` package', inferElectronVersionTest, 'basic', 'electron-prebuilt')
util.testSinglePlatformParallel('infer using `electron-prebuilt-compile` package', inferElectronVersionTest, 'infer-electron-prebuilt-compile', 'electron-prebuilt-compile')
util.testSinglePlatformParallel('infer using `electron` package only', inferMissingVersionTest)
util.testSinglePlatformParallel('infer where `electron` version is preferred over `electron-prebuilt`', inferElectronVersionTest, 'basic-renamed-to-electron', 'electron')
util.testSinglePlatformParallel('infer win32metadata', (t, opts) => {
  const expected = {CompanyName: 'Foo Bar'}

  return testInferWin32metadata(t, opts, expected, 'win32metadata matches package.json values')
})
util.testSinglePlatformParallel('do not infer win32metadata if it already exists', (t, opts) => {
  opts.win32metadata = {CompanyName: 'Existing'}
  const expected = Object.assign({}, opts.win32metadata)

  return testInferWin32metadata(t, opts, expected, 'win32metadata did not update with package.json values')
})
util.testSinglePlatformParallel('infer win32metadata when author is an object', (t, opts) => {
  const author = {
    name: 'Foo Bar Object',
    email: 'foobar@example.com'
  }
  const expected = {CompanyName: 'Foo Bar Object'}

  return testInferWin32metadataAuthorObject(t, opts, author, expected, 'win32metadata did not update with package.json values')
})
util.testSinglePlatformParallel('do not infer win32metadata.CompanyName when author is an object without a name', (t, opts) => {
  const author = {
    email: 'foobar@example.com'
  }
  const expected = {}

  return testInferWin32metadataAuthorObject(t, opts, author, expected, 'win32metadata.CompanyName should not have been inferred')
})
util.testSinglePlatformParallel('infer missing fields test', inferFailureTest, 'infer-missing-fields')
util.testSinglePlatformParallel('infer with bad fields test', inferFailureTest, 'infer-bad-fields')
util.testSinglePlatformParallel('infer with malformed JSON test', inferFailureTest, 'infer-malformed-json')
util.testSinglePlatformParallel('infer using a non-specific `electron-prebuilt-compile` package version', inferFailureTest, 'infer-non-specific-electron-prebuilt-compile')
