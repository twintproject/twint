'use strict'

const config = require('./config.json')
const exec = require('mz/child_process').exec
const fs = require('fs-extra')
const mac = require('../mac')
const packager = require('..')
const path = require('path')
const plist = require('plist')
const test = require('ava')
const util = require('./_util')

const darwinOpts = {
  name: 'darwinTest',
  dir: util.fixtureSubdir('basic'),
  electronVersion: config.version,
  arch: 'x64',
  platform: 'darwin'
}

const el0374Opts = Object.assign({}, darwinOpts, {
  name: 'el0374Test',
  dir: util.fixtureSubdir('el-0374'),
  electronVersion: '0.37.4'
})

function testWrapper (testName, extraOpts, testFunction/*, ...extraArgs */) {
  const extraArgs = Array.prototype.slice.call(arguments, 3)

  util.packagerTest(testName, (t, baseOpts) => {
    const opts = Object.assign({}, baseOpts, extraOpts)

    return testFunction.apply(null, [t, opts].concat(extraArgs))
  })
}

function darwinTest (testName, testFunction/*, ...extraArgs */) {
  const extraArgs = Array.prototype.slice.call(arguments, 2)
  return testWrapper.apply(null, [testName, darwinOpts, testFunction].concat(extraArgs))
}

function electron0374Test (testName, testFunction) {
  const extraArgs = Array.prototype.slice.call(arguments, 2)
  return testWrapper.apply(null, [testName, el0374Opts, testFunction].concat(extraArgs))
}

function getHelperExecutablePath (helperName) {
  return path.join(`${helperName}.app`, 'Contents', 'MacOS', helperName)
}

function parseInfoPlist (t, opts, basePath) {
  const plistPath = path.join(basePath, `${opts.name}.app`, 'Contents', 'Info.plist')

  return fs.stat(plistPath)
    .then(stats => {
      t.true(stats.isFile(), 'The expected Info.plist file should exist')
      return fs.readFile(plistPath, 'utf8')
    }).then(file => plist.parse(file))
}

function packageAndParseInfoPlist (t, opts) {
  return packager(opts)
    .then(paths => parseInfoPlist(t, opts, paths[0]))
}

function helperAppPathsTest (t, baseOpts, extraOpts, expectedName) {
  const opts = Object.assign(baseOpts, extraOpts)
  let frameworksPath

  if (!expectedName) {
    expectedName = opts.name
  }

  return packager(opts)
    .then(paths => {
      frameworksPath = path.join(paths[0], `${expectedName}.app`, 'Contents', 'Frameworks')
      // main Helper.app is already tested in basic test suite; test its executable and the other helpers
      return fs.stat(path.join(frameworksPath, getHelperExecutablePath(`${expectedName} Helper`)))
    }).then(stats => {
      t.true(stats.isFile(), 'The Helper.app executable should reflect sanitized opts.name')
      return fs.stat(path.join(frameworksPath, `${expectedName} Helper EH.app`))
    }).then(stats => {
      t.true(stats.isDirectory(), 'The Helper EH.app should reflect sanitized opts.name')
      return fs.stat(path.join(frameworksPath, getHelperExecutablePath(`${expectedName} Helper EH`)))
    }).then(stats => {
      t.true(stats.isFile(), 'The Helper EH.app executable should reflect sanitized opts.name')
      return fs.stat(path.join(frameworksPath, `${expectedName} Helper NP.app`))
    }).then(stats => {
      t.true(stats.isDirectory(), 'The Helper NP.app should reflect sanitized opts.name')
      return fs.stat(path.join(frameworksPath, getHelperExecutablePath(`${expectedName} Helper NP`)))
    }).then(stats => t.true(stats.isFile(), 'The Helper NP.app executable should reflect sanitized opts.name'))
}

function iconTest (t, opts, icon, iconPath) {
  opts.icon = icon

  let resourcesPath

  return util.packageAndEnsureResourcesPath(t, opts)
    .then(generatedResourcesPath => {
      resourcesPath = generatedResourcesPath
      const outputPath = resourcesPath.replace(`${path.sep}${util.generateResourcesPath(opts)}`, '')
      return parseInfoPlist(t, opts, outputPath)
    }).then(obj => {
      return util.areFilesEqual(iconPath, path.join(resourcesPath, obj.CFBundleIconFile))
    }).then(equal => t.true(equal, 'installed icon file should be identical to the specified icon file'))
}

function extendInfoTest (t, baseOpts, extraPathOrParams) {
  const opts = Object.assign({}, baseOpts, {
    appBundleId: 'com.electron.extratest',
    appCategoryType: 'public.app-category.music',
    buildVersion: '3.2.1',
    extendInfo: extraPathOrParams
  })

  return packageAndParseInfoPlist(t, opts)
    .then(obj => {
      t.is(obj.TestKeyString, 'String data', 'TestKeyString should come from extendInfo')
      t.is(obj.TestKeyInt, 12345, 'TestKeyInt should come from extendInfo')
      t.is(obj.TestKeyBool, true, 'TestKeyBool should come from extendInfo')
      t.deepEqual(obj.TestKeyArray, ['public.content', 'public.data'], 'TestKeyArray should come from extendInfo')
      t.deepEqual(obj.TestKeyDict, { Number: 98765, CFBundleVersion: '0.0.0' }, 'TestKeyDict should come from extendInfo')
      t.is(obj.CFBundleVersion, opts.buildVersion, 'CFBundleVersion should reflect buildVersion argument')
      t.is(obj.CFBundleIdentifier, 'com.electron.extratest', 'CFBundleIdentifier should reflect appBundleId argument')
      t.is(obj.LSApplicationCategoryType, 'public.app-category.music', 'LSApplicationCategoryType should reflect appCategoryType argument')
      return t.is(obj.CFBundlePackageType, 'APPL', 'CFBundlePackageType should be Electron default')
    })
}

function binaryNameTest (t, baseOpts, extraOpts, expectedExecutableName, expectedAppName) {
  const opts = Object.assign({}, baseOpts, extraOpts)
  const appName = expectedAppName || expectedExecutableName || opts.name
  const executableName = expectedExecutableName || opts.name

  let binaryPath

  return packager(opts)
    .then(paths => {
      binaryPath = path.join(paths[0], `${appName}.app`, 'Contents', 'MacOS')
      return fs.stat(path.join(binaryPath, executableName))
    }).then(stats => t.true(stats.isFile(), 'The binary should reflect a sanitized opts.name'))
}

function appVersionTest (t, opts, appVersion, buildVersion) {
  opts.appVersion = appVersion
  opts.buildVersion = buildVersion || appVersion

  return packageAndParseInfoPlist(t, opts)
    .then(obj => {
      t.is(obj.CFBundleVersion, '' + opts.buildVersion, 'CFBundleVersion should reflect buildVersion')
      t.is(obj.CFBundleShortVersionString, '' + opts.appVersion, 'CFBundleShortVersionString should reflect appVersion')
      t.is(typeof obj.CFBundleVersion, 'string', 'CFBundleVersion should be a string')
      return t.is(typeof obj.CFBundleShortVersionString, 'string', 'CFBundleShortVersionString should be a string')
    })
}

function appBundleTest (t, opts, appBundleId) {
  if (appBundleId) {
    opts.appBundleId = appBundleId
  }

  const defaultBundleName = `com.electron.${opts.name.toLowerCase()}`
  const appBundleIdentifier = mac.filterCFBundleIdentifier(opts.appBundleId || defaultBundleName)

  return packageAndParseInfoPlist(t, opts)
    .then(obj => {
      t.is(obj.CFBundleDisplayName, opts.name, 'CFBundleDisplayName should reflect opts.name')
      t.is(obj.CFBundleName, opts.name, 'CFBundleName should reflect opts.name')
      t.is(obj.CFBundleIdentifier, appBundleIdentifier, 'CFBundleName should reflect opts.appBundleId or fallback to default')
      t.is(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string')
      t.is(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string')
      t.is(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string')
      return t.is(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
    })
}

function appHelpersBundleTest (t, opts, helperBundleId, appBundleId) {
  let tempPath, plistPath

  if (helperBundleId) {
    opts.helperBundleId = helperBundleId
  }
  if (appBundleId) {
    opts.appBundleId = appBundleId
  }
  const defaultBundleName = `com.electron.${opts.name.toLowerCase()}`
  const appBundleIdentifier = mac.filterCFBundleIdentifier(opts.appBundleId || defaultBundleName)
  const helperBundleIdentifier = mac.filterCFBundleIdentifier(opts.helperBundleId || appBundleIdentifier + '.helper')

  return packager(opts)
    .then(paths => {
      tempPath = paths[0]
      plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper.app', 'Contents', 'Info.plist')
      return fs.stat(plistPath)
    }).then(stats => {
      t.true(stats.isFile(), 'The expected Info.plist file should exist in helper app')
      return fs.readFile(plistPath, 'utf8')
    }).then(file => {
      const obj = plist.parse(file)
      t.is(obj.CFBundleName, opts.name, 'CFBundleName should reflect opts.name in helper app')
      t.is(obj.CFBundleIdentifier, helperBundleIdentifier, 'CFBundleIdentifier should reflect opts.helperBundleId, opts.appBundleId or fallback to default in helper app')
      t.is(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper app')
      t.is(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper app')
      t.is(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
      // check helper EH
      plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper EH.app', 'Contents', 'Info.plist')
      return fs.stat(plistPath)
    }).then(stats => {
      t.true(stats.isFile(), 'The expected Info.plist file should exist in helper EH app')
      return fs.readFile(plistPath, 'utf8')
    }).then(file => {
      const obj = plist.parse(file)
      t.is(obj.CFBundleName, opts.name + ' Helper EH', 'CFBundleName should reflect opts.name in helper EH app')
      t.is(obj.CFBundleDisplayName, opts.name + ' Helper EH', 'CFBundleDisplayName should reflect opts.name in helper EH app')
      t.is(obj.CFBundleExecutable, opts.name + ' Helper EH', 'CFBundleExecutable should reflect opts.name in helper EH app')
      t.is(obj.CFBundleIdentifier, helperBundleIdentifier + '.EH', 'CFBundleName should reflect opts.helperBundleId, opts.appBundleId or fallback to default in helper EH app')
      t.is(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper EH app')
      t.is(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string in helper EH app')
      t.is(typeof obj.CFBundleExecutable, 'string', 'CFBundleExecutable should be a string in helper EH app')
      t.is(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper EH app')
      t.is(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
      // check helper NP
      plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper NP.app', 'Contents', 'Info.plist')
      return fs.stat(plistPath)
    }).then(stats => {
      t.true(stats.isFile(), 'The expected Info.plist file should exist in helper NP app')
      return fs.readFile(plistPath, 'utf8')
    }).then(file => {
      const obj = plist.parse(file)
      t.is(obj.CFBundleName, opts.name + ' Helper NP', 'CFBundleName should reflect opts.name in helper NP app')
      t.is(obj.CFBundleDisplayName, opts.name + ' Helper NP', 'CFBundleDisplayName should reflect opts.name in helper NP app')
      t.is(obj.CFBundleExecutable, opts.name + ' Helper NP', 'CFBundleExecutable should reflect opts.name in helper NP app')
      t.is(obj.CFBundleIdentifier, helperBundleIdentifier + '.NP', 'CFBundleName should reflect opts.helperBundleId, opts.appBundleId or fallback to default in helper NP app')
      t.is(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper NP app')
      t.is(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string in helper NP app')
      t.is(typeof obj.CFBundleExecutable, 'string', 'CFBundleExecutable should be a string in helper NP app')
      t.is(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper NP app')
      return t.is(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
    })
}

if (!(process.env.CI && process.platform === 'win32')) {
  darwinTest('helper app paths test', helperAppPathsTest)
  darwinTest('helper app paths test with app name needing sanitization', helperAppPathsTest, {name: '@username/package-name'}, '@username-package-name')

  const iconBase = path.join(__dirname, 'fixtures', 'monochrome')
  const icnsPath = `${iconBase}.icns`

  darwinTest('icon test: .icns specified', iconTest, icnsPath, icnsPath)
  // This test exists because the .icns file basename changed as of 0.37.4
  electron0374Test('icon test: Electron 0.37.4, .icns specified', iconTest, icnsPath, icnsPath)
  darwinTest('icon test: .ico specified (should replace with .icns)', iconTest, `${iconBase}.ico`, icnsPath)
  darwinTest('icon test: basename only (should add .icns)', iconTest, iconBase, icnsPath)

  const extraInfoPath = path.join(__dirname, 'fixtures', 'extrainfo.plist')
  const extraInfoParams = plist.parse(fs.readFileSync(extraInfoPath).toString())

  darwinTest('extendInfo by filename test', extendInfoTest, extraInfoPath)
  darwinTest('extendInfo by params test', extendInfoTest, extraInfoParams)

  darwinTest('protocol/protocol-name argument test', (t, opts) => {
    opts.protocols = [
      {
        name: 'Foo',
        schemes: ['foo']
      },
      {
        name: 'Bar',
        schemes: ['bar', 'baz']
      }
    ]

    return packageAndParseInfoPlist(t, opts)
      .then(obj =>
        t.deepEqual(obj.CFBundleURLTypes, [{
          CFBundleURLName: 'Foo',
          CFBundleURLSchemes: ['foo']
        }, {
          CFBundleURLName: 'Bar',
          CFBundleURLSchemes: ['bar', 'baz']
        }], 'CFBundleURLTypes did not contain specified protocol schemes and names')
      )
  })

  test('osxSign argument test: default args', t => {
    const args = true
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {identity: null, app: 'out', platform: 'darwin', version: 'version'})
  })

  test('osxSign argument test: identity=true sets autodiscovery mode', t => {
    const args = {identity: true}
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {identity: null, app: 'out', platform: 'darwin', version: 'version'})
  })

  test('osxSign argument test: entitlements passed to electron-osx-sign', t => {
    const args = {entitlements: 'path-to-entitlements'}
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {app: 'out', platform: 'darwin', version: 'version', entitlements: args.entitlements})
  })

  test('osxSign argument test: app not overwritten', t => {
    const args = {app: 'some-other-path'}
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {app: 'out', platform: 'darwin', version: 'version'})
  })

  test('osxSign argument test: platform not overwritten', t => {
    const args = {platform: 'mas'}
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {app: 'out', platform: 'darwin', version: 'version'})
  })

  test('osxSign argument test: binaries not set', t => {
    const args = {binaries: ['binary1', 'binary2']}
    const signOpts = mac.createSignOpts(args, 'darwin', 'out', 'version')
    t.deepEqual(signOpts, {app: 'out', platform: 'darwin', version: 'version'})
  })

  darwinTest('codesign test', (t, opts) => {
    opts.osxSign = {identity: 'Developer CodeCert'}

    let appPath

    return packager(opts)
      .then(paths => {
        appPath = path.join(paths[0], opts.name + '.app')
        return fs.stat(appPath)
      }).then(stats => {
        t.true(stats.isDirectory(), 'The expected .app directory should exist')
        return exec(`codesign -v ${appPath}`)
      }).then(
        (stdout, stderr) => t.pass('codesign should verify successfully'),
        err => {
          const notFound = err && err.code === 127

          if (notFound) {
            console.log('codesign not installed; skipped')
          } else {
            throw err
          }
        }
      )
  })

  darwinTest('binary naming test', binaryNameTest)
  darwinTest('sanitized binary naming test', binaryNameTest, {name: '@username/package-name'}, '@username-package-name')
  darwinTest('executableName test', binaryNameTest, {executableName: 'app-name', name: 'MyAppName'}, 'app-name', 'MyAppName')

  darwinTest('CFBundleName is the sanitized app name and CFBundleDisplayName is the non-sanitized app name', (t, opts) => {
    const appBundleIdentifier = 'com.electron.username-package-name'
    const expectedSanitizedName = '@username-package-name'

    let plistPath

    opts.name = '@username/package-name'

    return packager(opts)
      .then(paths => {
        plistPath = path.join(paths[0], `${expectedSanitizedName}.app`, 'Contents', 'Info.plist')
        return fs.stat(plistPath)
      }).then(stats => {
        t.true(stats.isFile(), 'The expected Info.plist file should exist')
        return fs.readFile(plistPath, 'utf8')
      }).then(file => {
        const obj = plist.parse(file)
        t.is(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string')
        t.is(obj.CFBundleDisplayName, opts.name, 'CFBundleDisplayName should reflect opts.name')
        t.is(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string')
        t.is(obj.CFBundleName, expectedSanitizedName, 'CFBundleName should reflect a sanitized opts.name')
        t.is(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string')
        t.is(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
        return t.is(obj.CFBundleIdentifier, appBundleIdentifier, 'CFBundleIdentifier should reflect the sanitized opts.name')
      })
  })

  darwinTest('app and build version test', appVersionTest, '1.1.0', '1.1.0.1234')
  darwinTest('app version test', appVersionTest, '1.1.0')
  darwinTest('app and build version integer test', appVersionTest, 12, 1234)
  darwinTest('infer app version from package.json test', (t, opts) =>
    packageAndParseInfoPlist(t, opts)
      .then(obj => {
        t.is(obj.CFBundleVersion, '4.99.101', 'CFBundleVersion should reflect package.json version')
        return t.is(obj.CFBundleShortVersionString, '4.99.101', 'CFBundleShortVersionString should reflect package.json version')
      })
  )

  darwinTest('app categoryType test', (t, opts) => {
    const appCategoryType = 'public.app-category.developer-tools'
    opts.appCategoryType = appCategoryType

    return packageAndParseInfoPlist(t, opts)
      .then(obj => t.is(obj.LSApplicationCategoryType, appCategoryType, 'LSApplicationCategoryType should reflect opts.appCategoryType'))
  })

  darwinTest('app bundle test', appBundleTest, 'com.electron.basetest')
  darwinTest('app bundle (w/ special characters) test', appBundleTest, 'com.electron."bãśè tëßt!@#$%^&*()?\'')
  darwinTest('app bundle app-bundle-id fallback test', appBundleTest)

  darwinTest('app bundle framework symlink test', (t, opts) => {
    let frameworkPath

    return packager(opts)
      .then(paths => {
        frameworkPath = path.join(paths[0], `${opts.name}.app`, 'Contents', 'Frameworks', 'Electron Framework.framework')
        return fs.stat(frameworkPath)
      }).then(stats => {
        t.true(stats.isDirectory(), 'Expected Electron Framework.framework to be a directory')
        return fs.lstat(path.join(frameworkPath, 'Electron Framework'))
      }).then(stats => {
        t.true(stats.isSymbolicLink(), 'Expected Electron Framework.framework/Electron Framework to be a symlink')
        return fs.lstat(path.join(frameworkPath, 'Versions', 'Current'))
      }).then(stats => t.true(stats.isSymbolicLink(), 'Expected Electron Framework.framework/Versions/Current to be a symlink'))
  })

  darwinTest('app helpers bundle test', appHelpersBundleTest, 'com.electron.basetest.helper')
  darwinTest('app helpers bundle (w/ special characters) test', appHelpersBundleTest, 'com.electron."bãśè tëßt!@#$%^&*()?\'.hęłpėr')
  darwinTest('app helpers bundle helper-bundle-id fallback to app-bundle-id test', appHelpersBundleTest, null, 'com.electron.basetest')
  darwinTest('app helpers bundle helper-bundle-id fallback to app-bundle-id (w/ special characters) test', appHelpersBundleTest, null, 'com.electron."bãśè tëßt!!@#$%^&*()?\'')
  darwinTest('app helpers bundle helper-bundle-id & app-bundle-id fallback test', appHelpersBundleTest)

  darwinTest('appCopyright/NSHumanReadableCopyright test', (t, baseOpts) => {
    const copyright = 'Copyright © 2003–2015 Organization. All rights reserved.'
    const opts = Object.assign({}, baseOpts, {appCopyright: copyright})

    return packageAndParseInfoPlist(t, opts)
      .then(info => t.is(info.NSHumanReadableCopyright, copyright, 'NSHumanReadableCopyright should reflect opts.appCopyright'))
  })

  darwinTest('app named Electron packaged successfully', (t, baseOpts) => {
    const opts = Object.assign({}, baseOpts, {name: 'Electron'})
    let appPath

    return packager(opts)
      .then(paths => {
        appPath = path.join(paths[0], 'Electron.app')
        return fs.stat(appPath)
      }).then(stats => {
        t.true(stats.isDirectory(), 'The Electron.app folder exists')
        return fs.stat(path.join(appPath, 'Contents', 'MacOS', 'Electron'))
      }).then(stats => t.true(stats.isFile(), 'The Electron.app/Contents/MacOS/Electron binary exists'))
  })
}
