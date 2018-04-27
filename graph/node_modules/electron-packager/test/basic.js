'use strict'

const common = require('../common')
const download = require('../download')
const fs = require('fs-extra')
const hostArch = require('../targets').hostArch
const packager = require('..')
const path = require('path')
const test = require('ava')
const util = require('./_util')

// Generates a path to the generated app that reflects the name given in the options.
// Returns the Helper.app location on darwin since the top-level .app is already tested for the
// resources path; on other OSes, returns the executable.
function generateNamePath (opts) {
  if (common.isPlatformMac(opts.platform)) {
    return path.join(`${opts.name}.app`, 'Contents', 'Frameworks', `${opts.name} Helper.app`)
  }

  return opts.name + (opts.platform === 'win32' ? '.exe' : '')
}

test('setting the quiet option does not print messages', (t) => {
  const errorLog = console.error
  const warningLog = console.warn
  let output = ''
  console.error = (message) => { output += message }
  console.warn = (message) => { output += message }

  common.warning('warning', true)
  t.is('', output, 'quieted common.warning should not call console.warn')
  common.info('info', true)
  t.is('', output, 'quieted common.info should not call console.error')

  console.error = errorLog
  console.warn = warningLog
})

test('download argument test: download.{arch,platform,version} does not overwrite {arch,platform,version}', t => {
  const opts = {
    download: {
      arch: 'ia32',
      platform: 'win32',
      version: '0.30.0'
    },
    electronVersion: '0.36.0'
  }

  const downloadOpts = download.createDownloadOpts(opts, 'linux', 'x64')
  t.deepEqual(downloadOpts, {arch: 'x64', platform: 'linux', version: '0.36.0'})
})

test('sanitize app name for use in file/directory names', t => {
  t.is('@username-package', common.sanitizeAppName('@username/package'), 'slash should be replaced')
})

test('sanitize app name for use in the out directory name', t => {
  let opts = {
    arch: 'x64',
    name: '@username/package-name',
    platform: 'linux'
  }
  t.is('@username-package-name-linux-x64', common.generateFinalBasename(opts), 'generateFinalBasename output should be sanitized')
})

test('cannot build apps where the name ends in " Helper"', (t) => {
  const opts = {
    arch: 'x64',
    dir: path.join(__dirname, 'fixtures', 'el-0374'),
    name: 'Bad Helper',
    platform: 'linux'
  }

  return packager(opts)
    .then(
      () => { throw new Error('should not finish') },
      (err) => t.is(err.message, 'Application names cannot end in " Helper" due to limitations on macOS')
    )
})

test('deprecatedParameter moves value in deprecated param to new param if new param is not set', (t) => {
  let opts = {
    old: 'value'
  }
  common.deprecatedParameter(opts, 'old', 'new', 'new-value')

  t.false(opts.hasOwnProperty('old'), 'old property is not set')
  t.true(opts.hasOwnProperty('new'), 'new property is set')

  opts.not_overwritten_old = 'another'
  common.deprecatedParameter(opts, 'not_overwritten_old', 'new', 'new-value')

  t.false(opts.hasOwnProperty('not_overwritten_old'), 'not_overwritten_old property is not set')
  t.true(opts.hasOwnProperty('new'), 'new property is set')
  t.is('value', opts.new, 'new property is not overwritten')
})

util.testSinglePlatform('defaults test', (t, opts) => {
  opts.name = 'defaultsTest'
  opts.dir = util.fixtureSubdir('basic')
  delete opts.platform
  delete opts.arch

  let defaultOpts = {
    arch: hostArch(),
    name: opts.name,
    platform: process.platform
  }

  let finalPath
  let resourcesPath

  return packager(opts)
    .then(paths => {
      t.true(Array.isArray(paths), 'packager call should resolve to an array')
      t.is(paths.length, 1, 'Single-target run should resolve to a 1-item array')

      finalPath = paths[0]
      t.is(finalPath, path.join(t.context.workDir, common.generateFinalBasename(defaultOpts)),
           'Path should follow the expected format and be in the cwd')
      return fs.stat(finalPath)
    }).then(stats => {
      t.true(stats.isDirectory(), 'The expected output directory should exist')
      resourcesPath = path.join(finalPath, util.generateResourcesPath(defaultOpts))
      return fs.stat(path.join(finalPath, generateNamePath(defaultOpts)))
    }).then(stats => {
      if (common.isPlatformMac(defaultOpts.platform)) {
        t.true(stats.isDirectory(), 'The Helper.app should reflect opts.name')
      } else {
        t.true(stats.isFile(), 'The executable should reflect opts.name')
      }
      return fs.stat(resourcesPath)
    }).then(stats => {
      t.true(stats.isDirectory(), 'The output directory should contain the expected resources subdirectory')
      return fs.pathExists(path.join(resourcesPath, 'app', 'node_modules', 'run-waterfall'))
    }).then(exists => {
      t.false(exists, 'The output directory should NOT contain devDependencies by default (prune=true)')
      return util.areFilesEqual(path.join(opts.dir, 'main.js'), path.join(resourcesPath, 'app', 'main.js'))
    }).then(equal => {
      t.true(equal, 'File under packaged app directory should match source file')
      return util.areFilesEqual(path.join(opts.dir, 'ignore', 'this.txt'),
                                path.join(resourcesPath, 'app', 'ignore', 'this.txt'))
    }).then(equal => {
      t.true(equal, 'File under subdirectory of packaged app directory should match source file and not be ignored by default')
      return fs.pathExists(path.join(resourcesPath, 'default_app'))
    }).then(exists => {
      t.false(exists, 'The output directory should not contain the Electron default_app directory')
      return fs.pathExists(path.join(resourcesPath, 'default_app.asar'))
    }).then(exists => t.false(exists, 'The output directory should not contain the Electron default_app.asar file'))
})

util.testSinglePlatform('out test', (t, opts) => {
  opts.name = 'outTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.out = 'dist'

  let finalPath

  return packager(opts)
    .then(paths => {
      finalPath = paths[0]
      t.is(finalPath, path.join('dist', common.generateFinalBasename(opts)),
           'Path should follow the expected format and be under the folder specified in `out`')
      return fs.stat(finalPath)
    }).then(stats => {
      t.true(stats.isDirectory(), 'The expected output directory should exist')
      return fs.stat(path.join(finalPath, util.generateResourcesPath(opts)))
    }).then(stats => t.true(stats.isDirectory(), 'The output directory should contain the expected resources subdirectory'))
})

util.testSinglePlatform('overwrite test', (t, opts) => {
  opts.name = 'overwriteTest'
  opts.dir = util.fixtureSubdir('basic')

  let finalPath
  let testPath

  return packager(opts)
    .then(paths => {
      finalPath = paths[0]
      return fs.stat(finalPath)
    }).then(stats => {
      t.true(stats.isDirectory(), 'The expected output directory should exist')
      // Create a dummy file to detect whether the output directory is replaced in subsequent runs
      testPath = path.join(finalPath, 'test.txt')
      return fs.writeFile(testPath, 'test')
    }).then(() => packager(opts)) // Run again, defaulting to overwrite false
    .then(paths => fs.stat(testPath))
    .then(stats => {
      t.true(stats.isFile(), 'The existing output directory should exist as before (skipped by default)')
      // Run a third time, explicitly setting overwrite to true
      opts.overwrite = true
      return packager(opts)
    }).then(paths => fs.pathExists(testPath))
    .then(exists => t.false(exists, 'The output directory should be regenerated when overwrite is true'))
})

util.testSinglePlatform('overwrite test sans platform/arch set', (t, opts) => {
  delete opts.platfrom
  delete opts.arch
  opts.dir = util.fixtureSubdir('basic')
  opts.overwrite = true

  return packager(opts)
    .then(paths => fs.pathExists(paths[0]))
    .then(exists => {
      t.true(exists, 'The output directory exists')
      return packager(opts)
    }).then(paths => fs.pathExists(paths[0]))
    .then(exists => t.true(exists, 'The output directory exists'))
})

util.testSinglePlatform('tmpdir test', (t, opts) => {
  opts.name = 'tmpdirTest'
  opts.dir = path.join(__dirname, 'fixtures', 'basic')
  opts.out = 'dist'
  opts.tmpdir = path.join(t.context.workDir, 'tmp')

  return packager(opts)
    .then(paths => fs.stat(path.join(opts.tmpdir, 'electron-packager')))
    .then(stats => t.true(stats.isDirectory(), 'The expected temp directory should exist'))
})

util.testSinglePlatform('disable tmpdir test', (t, opts) => {
  opts.name = 'disableTmpdirTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.out = 'dist'
  opts.tmpdir = false

  return packager(opts)
    .then(paths => fs.stat(paths[0]))
    .then(stats => t.true(stats.isDirectory(), 'The expected out directory should exist'))
})

util.testSinglePlatform('deref symlink test', (t, opts) => {
  opts.name = 'disableSymlinkDerefTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.derefSymlinks = false

  const src = path.join(opts.dir, 'main.js')
  const dest = path.join(opts.dir, 'main-link.js')

  return fs.ensureSymlink(src, dest)
    .then(() => packager(opts))
    .then(paths => {
      const destLink = path.join(paths[0], 'resources', 'app', 'main-link.js')
      return fs.lstat(destLink)
    }).then(stats => {
      t.true(stats.isSymbolicLink(), 'The expected file should still be a symlink')
      return fs.remove(dest)
    })
})

function createExtraResourceStringTest (t, opts, platform) {
  const extra1Base = 'data1.txt'
  const extra1Path = path.join(__dirname, 'fixtures', extra1Base)

  opts.name = 'extraResourceStringTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.out = 'dist'
  opts.platform = platform
  opts.extraResource = extra1Path

  return util.packageAndEnsureResourcesPath(t, opts)
    .then(resourcesPath => util.areFilesEqual(extra1Path, path.join(resourcesPath, extra1Base)))
    .then(equal => t.true(equal, 'resource file data1.txt should match'))
}

function createExtraResourceArrayTest (t, opts, platform) {
  const extra1Base = 'data1.txt'
  const extra1Path = path.join(__dirname, 'fixtures', extra1Base)
  const extra2Base = 'extrainfo.plist'
  const extra2Path = path.join(__dirname, 'fixtures', extra2Base)

  opts.name = 'extraResourceArrayTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.out = 'dist'
  opts.platform = platform
  opts.extraResource = [extra1Path, extra2Path]

  let extra1DistPath
  let extra2DistPath

  return util.packageAndEnsureResourcesPath(t, opts)
    .then(resourcesPath => {
      extra1DistPath = path.join(resourcesPath, extra1Base)
      extra2DistPath = path.join(resourcesPath, extra2Base)
      return fs.pathExists(extra1DistPath)
    }).then(exists => {
      t.true(exists, 'resource file data1.txt exists')
      return util.areFilesEqual(extra1Path, extra1DistPath)
    }).then(equal => {
      t.true(equal, 'resource file data1.txt should match')
      return fs.pathExists(extra2DistPath)
    }).then(exists => {
      t.true(exists, 'resource file extrainfo.plist exists')
      return util.areFilesEqual(extra2Path, extra2DistPath)
    }).then(equal => t.true(equal, 'resource file extrainfo.plist should match'))
}

for (const platform of ['darwin', 'linux']) {
  util.testSinglePlatform(`extraResource test: string (${platform})`, createExtraResourceStringTest, platform)
  util.testSinglePlatform(`extraResource test: array (${platform})`, createExtraResourceArrayTest, platform)
}

util.testSinglePlatform('building for Linux target sanitizes binary name', (t, opts) => {
  opts.name = '@username/package-name'
  opts.dir = util.fixtureSubdir('basic')

  return packager(opts)
    .then(paths => {
      t.is(1, paths.length, '1 bundle created')
      return fs.stat(path.join(paths[0], '@username-package-name'))
    }).then(stats => t.true(stats.isFile(), 'The sanitized binary filename should exist'))
})

util.testSinglePlatform('executableName honored when building for Linux target', (t, opts) => {
  opts.name = 'PackageName'
  opts.executableName = 'my-package'
  opts.dir = util.fixtureSubdir('basic')

  return packager(opts)
    .then(paths => {
      t.is(1, paths.length, '1 bundle created')
      return fs.stat(path.join(paths[0], 'my-package'))
    }).then(stats => t.true(stats.isFile(), 'The executableName-based filename should exist'))
})

util.packagerTest('fails with invalid version', util.invalidOptionTest({
  name: 'invalidElectronTest',
  dir: util.fixtureSubdir('el-0374'),
  electronVersion: '0.0.1',
  arch: 'x64',
  platform: 'linux',
  download: {
    quiet: !!process.env.CI
  }
}))

util.testSinglePlatform('dir argument test: should work with relative path', (t, opts) => {
  opts.name = 'ElectronTest'
  opts.dir = path.join('..', 'fixtures', 'el-0374')
  opts.electronVersion = '0.37.4'

  return packager(opts)
    .then(paths => t.is(path.join(t.context.workDir, 'ElectronTest-linux-x64'), paths[0], 'paths returned'))
})
