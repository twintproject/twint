'use strict'

const config = require('./config.json')
const fs = require('fs-extra')
const packager = require('..')
const path = require('path')
const test = require('ava')
const util = require('./_util')
const win32 = require('../win32')

const win32Opts = {
  name: 'basicTest',
  dir: util.fixtureSubdir('basic'),
  electronVersion: config.version,
  arch: 'x64',
  platform: 'win32'
}

function generateRceditOptionsSansIcon (opts) {
  return new win32.App(opts).generateRceditOptionsSansIcon()
}

function generateVersionStringTest (metadataProperties, extraOpts, expectedValues, assertionMsgs) {
  return t => {
    const opts = Object.assign({}, win32Opts, extraOpts)
    const rcOpts = generateRceditOptionsSansIcon(opts)

    metadataProperties = [].concat(metadataProperties)
    expectedValues = [].concat(expectedValues)
    assertionMsgs = [].concat(assertionMsgs)
    metadataProperties.forEach((property, i) => {
      const value = expectedValues[i]
      const msg = assertionMsgs[i]
      if (property === 'version-string') {
        for (const subkey in value) {
          t.is(rcOpts[property][subkey], value[subkey], `${msg} (${subkey})`)
        }
      } else {
        t.is(rcOpts[property], value, msg)
      }
    })
  }
}

function setFileVersionTest (buildVersion) {
  const appVersion = '4.99.101.0'
  const opts = {
    appVersion: appVersion,
    buildVersion: buildVersion
  }

  return generateVersionStringTest(
    ['product-version', 'file-version'],
    opts,
    [appVersion, buildVersion],
    ['Product version should match app version',
      'File version should match build version']
  )
}

function setProductVersionTest (appVersion) {
  return generateVersionStringTest(
    ['product-version', 'file-version'],
    { appVersion: appVersion },
    [appVersion, appVersion],
    ['Product version should match app version',
      'File version should match app version']
  )
}

function setCopyrightTest (appCopyright) {
  const opts = {
    appCopyright: appCopyright
  }

  return generateVersionStringTest('version-string', opts, {LegalCopyright: appCopyright}, 'Legal copyright should match app copyright')
}

function setCopyrightAndCompanyNameTest (appCopyright, companyName) {
  const opts = {
    appCopyright: appCopyright,
    win32metadata: {
      CompanyName: companyName
    }
  }

  return generateVersionStringTest(
    'version-string',
    opts,
    {LegalCopyright: appCopyright, CompanyName: companyName},
    'Legal copyright should match app copyright and Company name should match win32metadata value'
  )
}

function setRequestedExecutionLevelTest (requestedExecutionLevel) {
  const opts = {
    win32metadata: {
      'requested-execution-level': requestedExecutionLevel
    }
  }

  return generateVersionStringTest(
    'requested-execution-level',
    opts,
    requestedExecutionLevel,
    'requested-execution-level in win32metadata should match rcOpts value'
  )
}

function setApplicationManifestTest (applicationManifest) {
  const opts = {
    win32metadata: {
      'application-manifest': applicationManifest
    }
  }

  return generateVersionStringTest(
    'application-manifest',
    opts,
    applicationManifest,
    'application-manifest in win32metadata should match rcOpts value'
  )
}

function setCompanyNameTest (companyName) {
  const opts = {
    win32metadata: {
      CompanyName: companyName
    }
  }

  return generateVersionStringTest('version-string',
                                   opts,
                                   {CompanyName: companyName},
                                   `Company name should match win32metadata value`)
}

test('better error message when wine is not found', (t) => {
  let err = Error('spawn wine ENOENT')
  err.code = 'ENOENT'
  err.syscall = 'spawn wine'

  t.is(err.message, 'spawn wine ENOENT')
  err = win32.updateWineMissingException(err)
  t.not(err.message, 'spawn wine ENOENT')
})

test('error message unchanged when error not about wine', t => {
  let errNotEnoent = Error('unchanged')
  errNotEnoent.code = 'ESOMETHINGELSE'
  errNotEnoent.syscall = 'spawn wine'

  t.is(errNotEnoent.message, 'unchanged')
  errNotEnoent = win32.updateWineMissingException(errNotEnoent)
  t.is(errNotEnoent.message, 'unchanged')

  let errNotSpawnWine = Error('unchanged')
  errNotSpawnWine.code = 'ENOENT'
  errNotSpawnWine.syscall = 'spawn foo'

  t.is(errNotSpawnWine.message, 'unchanged')
  errNotSpawnWine = win32.updateWineMissingException(errNotSpawnWine)
  t.is(errNotSpawnWine.message, 'unchanged')
})

test('win32metadata defaults', t => {
  const opts = { name: 'Win32 App' }
  const rcOpts = generateRceditOptionsSansIcon(opts)

  t.is(rcOpts['version-string'].FileDescription, opts.name, 'default FileDescription')
  t.is(rcOpts['version-string'].InternalName, opts.name, 'default InternalName')
  t.is(rcOpts['version-string'].OriginalFilename, 'Win32 App.exe', 'default OriginalFilename')
  t.is(rcOpts['version-string'].ProductName, opts.name, 'default ProductName')
})

util.packagerTest('win32 executable name is based on sanitized app name', (t, opts) => {
  Object.assign(opts, win32Opts, { name: '@username/package-name' })

  return packager(opts)
    .then(paths => {
      t.is(1, paths.length, '1 bundle created')
      const appExePath = path.join(paths[0], '@username-package-name.exe')
      return fs.pathExists(appExePath)
    }).then(exists => t.true(exists, 'The sanitized EXE filename should exist'))
})

util.packagerTest('win32 executable name uses executableName when available', (t, opts) => {
  Object.assign(opts, win32Opts, { name: 'PackageName', executableName: 'my-package' })

  return packager(opts)
    .then(paths => {
      t.is(1, paths.length, '1 bundle created')
      const appExePath = path.join(paths[0], 'my-package.exe')
      return fs.pathExists(appExePath)
    }).then(exists => t.true(exists, 'the executableName-based filename should exist'))
})

util.packagerTest('win32 icon set', (t, opts) => {
  Object.assign(opts, win32Opts, { executableName: 'iconTest', arch: 'ia32', icon: path.join(__dirname, 'fixtures', 'monochrome') })

  return packager(opts)
    .then(paths => {
      t.is(1, paths.length, '1 bundle created')
      const appExePath = path.join(paths[0], 'iconTest.exe')
      return fs.pathExists(appExePath)
    }).then(exists => t.true(exists, 'the Electron executable should exist'))
})

test('win32 build version sets FileVersion test', setFileVersionTest('2.3.4.5'))
test('win32 app version sets ProductVersion test', setProductVersionTest('5.4.3.2'))
test('win32 app copyright sets LegalCopyright test', setCopyrightTest('Copyright Bar'))
test('win32 set LegalCopyright and CompanyName test', setCopyrightAndCompanyNameTest('Copyright Bar', 'MyCompany LLC'))
test('win32 set CompanyName test', setCompanyNameTest('MyCompany LLC'))
test('win32 set requested-execution-level test', setRequestedExecutionLevelTest('asInvoker'))
test('win32 set application-manifest test', setApplicationManifestTest('/path/to/manifest.xml'))
