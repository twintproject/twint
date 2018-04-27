'use strict'

// Keeping this module because it handles non-buffers gracefully
const bufferEqual = require('buffer-equal')
const common = require('../common')
const config = require('./config.json')
const fs = require('fs-extra')
const packager = require('../index')
const path = require('path')
const setup = require('./_setup')
const tempy = require('tempy')
const test = require('ava')

const ORIGINAL_CWD = process.cwd()

test.before(t => {
  if (!process.env.CI) {
    return setup.setupTestsuite()
      .then(() => process.chdir(setup.WORK_CWD))
  }
  return Promise.resolve(process.chdir(setup.WORK_CWD))
})

test.after.always(t => {
  process.chdir(ORIGINAL_CWD)
  return fs.remove(setup.WORK_CWD)
})

test.beforeEach(t => {
  t.context.workDir = tempy.directory()
  t.context.tempDir = tempy.directory()
})

test.afterEach.always(t => {
  return fs.remove(t.context.workDir)
    .then(() => fs.remove(t.context.tempDir))
})

function testSinglePlatform (name, testFunction, testFunctionArgs, parallel) {
  module.exports.packagerTest(name, (t, opts) => {
    Object.assign(opts, module.exports.singlePlatformOptions())
    return testFunction.apply(null, [t, opts].concat(testFunctionArgs))
  }, parallel)
}

module.exports = {
  allPlatformArchCombosCount: 9,
  areFilesEqual: function areFilesEqual (file1, file2) {
    let buffer1, buffer2

    return fs.readFile(file1)
      .then((data) => {
        buffer1 = data
        return fs.readFile(file2)
      }).then((data) => {
        buffer2 = data
        return bufferEqual(buffer1, buffer2)
      })
  },
  fixtureSubdir: setup.fixtureSubdir,
  generateResourcesPath: function generateResourcesPath (opts) {
    return common.isPlatformMac(opts.platform)
      ? path.join(opts.name + '.app', 'Contents', 'Resources')
      : 'resources'
  },
  invalidOptionTest: function invalidOptionTest (opts) {
    return t => t.throws(packager(opts))
  },
  packageAndEnsureResourcesPath: function packageAndEnsureResourcesPath (t, opts) {
    let resourcesPath

    return packager(opts)
      .then(paths => {
        resourcesPath = path.join(paths[0], module.exports.generateResourcesPath(opts))
        return fs.stat(resourcesPath)
      }).then(stats => {
        t.true(stats.isDirectory(), 'The output directory should contain the expected resources subdirectory')
        return resourcesPath
      })
  },
  packagerTest: function packagerTest (name, testFunction, parallel) {
    const testDefinition = parallel ? test : test.serial
    testDefinition(name, t => {
      return testFunction(t, {
        name: 'packagerTest',
        out: t.context.workDir,
        tmpdir: t.context.tempDir
      })
    })
  },
  singlePlatformOptions: function singlePlatformOptions () {
    return {
      platform: 'linux',
      arch: 'x64',
      electronVersion: config.version
    }
  },
  // Rest parameters are added (not behind a feature flag) in Node 6
  testSinglePlatform: function (name, testFunction /*, ...testFunctionArgs */) {
    const testFunctionArgs = Array.prototype.slice.call(arguments, 2)
    return testSinglePlatform(name, testFunction, testFunctionArgs, false)
  },
  // Rest parameters are added (not behind a feature flag) in Node 6
  testSinglePlatformParallel: function (name, testFunction /*, ...testFunctionArgs */) {
    const testFunctionArgs = Array.prototype.slice.call(arguments, 2)
    return testSinglePlatform(name, testFunction, testFunctionArgs, true)
  },
  verifyPackageExistence: function verifyPackageExistence (finalPaths) {
    return Promise.all(finalPaths.map((finalPath) => {
      return fs.stat(finalPath)
        .then(
          stats => stats.isDirectory(),
          () => false
        )
    }))
  }
}
