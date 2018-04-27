'use strict'

const common = require('../common')
const fs = require('fs-extra')
const path = require('path')
const test = require('ava')
const util = require('./_util')

test('asar argument test: asar is not set', t => {
  const asarOpts = common.createAsarOpts({})
  t.false(asarOpts, 'createAsarOpts returns false')
})

test('asar argument test: asar is true', t => {
  t.deepEqual(common.createAsarOpts({asar: true}), {})
})

test('asar argument test: asar is not an Object or a bool', t => {
  t.false(common.createAsarOpts({asar: 'string'}), 'createAsarOpts returns false')
})

util.testSinglePlatform('default_app.asar removal test', (t, opts) => {
  opts.name = 'default_appASARTest'
  opts.dir = util.fixtureSubdir('el-0374')
  opts.electronVersion = '0.37.4'

  return util.packageAndEnsureResourcesPath(t, opts)
    .then(resourcesPath => fs.pathExists(path.join(resourcesPath, 'default_app.asar')))
    .then(exists => t.false(exists, 'The output directory should not contain the Electron default_app.asar file'))
})

util.testSinglePlatform('asar test', (t, opts) => {
  opts.name = 'asarTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.asar = {
    'unpack': '*.pac',
    'unpackDir': 'dir_to_unpack'
  }
  let resourcesPath

  return util.packageAndEnsureResourcesPath(t, opts)
    .then(generatedResourcesPath => {
      resourcesPath = generatedResourcesPath
      return fs.stat(path.join(resourcesPath, 'app.asar'))
    }).then(stats => {
      t.true(stats.isFile(), 'app.asar should exist under the resources subdirectory when opts.asar is true')
      return fs.pathExists(path.join(resourcesPath, 'app'))
    }).then(exists => {
      t.false(exists, 'app subdirectory should NOT exist when app.asar is built')
      return fs.stat(path.join(resourcesPath, 'app.asar.unpacked'))
    }).then(stats => {
      t.true(stats.isDirectory(), 'app.asar.unpacked should exist under the resources subdirectory when opts.asar_unpack is set some expression')
      return fs.stat(path.join(resourcesPath, 'app.asar.unpacked', 'dir_to_unpack'))
    }).then(stats => t.true(stats.isDirectory(), 'dir_to_unpack should exist under app.asar.unpacked subdirectory when opts.asar-unpack-dir is set dir_to_unpack'))
})
