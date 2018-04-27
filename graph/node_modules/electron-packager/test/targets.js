'use strict'

const config = require('./config.json')
const sinon = require('sinon')
const targets = require('../targets')
const test = require('ava')
const util = require('./_util')

function createMultiTargetOptions (extraOpts) {
  return Object.assign({
    name: 'targetTest',
    dir: util.fixtureSubdir('basic'),
    electronVersion: config.version
  }, extraOpts)
}

function testMultiTarget (testcaseDescription, extraOpts, expectedPackageCount, packageExistenceMessage) {
  test(testcaseDescription, t => {
    const opts = createMultiTargetOptions(extraOpts)
    const platforms = targets.validateListFromOptions(opts, 'platform')
    const archs = targets.validateListFromOptions(opts, 'arch')
    const combinations = targets.createPlatformArchPairs(opts, platforms, archs)

    t.is(combinations.length, expectedPackageCount, packageExistenceMessage)
  })
}

function testCombinations (testcaseDescription, arch, platform) {
  testMultiTarget(testcaseDescription, {arch: arch, platform: platform}, 4,
                  'Packages should be generated for all combinations of specified archs and platforms')
}

test('allOfficialArchsForPlatformAndVersion is undefined for unknown platforms', t => {
  t.is(targets.allOfficialArchsForPlatformAndVersion('unknown', '1.0.0'), undefined)
})

test('allOfficialArchsForPlatformAndVersion returns the correct arches for a known platform', t => {
  t.deepEqual(targets.allOfficialArchsForPlatformAndVersion('darwin', '1.0.0'), ['x64'])
})

test('allOfficialArchsForPlatformAndVersion returns arm64 when the correct version is specified', t => {
  t.not(targets.allOfficialArchsForPlatformAndVersion('linux', '1.8.0').indexOf('arm64'), -1,
        'should be found when version is >= 1.8.0')
  t.is(targets.allOfficialArchsForPlatformAndVersion('linux', '1.7.0').indexOf('arm64'), -1,
       'should not be found when version is < 1.8.0')
})

test('allOfficialArchsForPlatformAndVersion returns mips64el when the correct version is specified', t => {
  t.not(targets.allOfficialArchsForPlatformAndVersion('linux', '1.8.2').indexOf('mips64el'), -1,
        'should be found when version is >= 1.8.2-beta.5')
  t.is(targets.allOfficialArchsForPlatformAndVersion('linux', '1.8.0').indexOf('mips64el'), -1,
       'should not be found when version is < 1.8.2-beta.5')
})

test('validateListFromOptions does not take non-Array/String values', t => {
  targets.supported.digits = new Set(['64', '65'])
  t.false(targets.validateListFromOptions({digits: 64}, 'digits') instanceof Array,
          'should not be an Array')
  delete targets.supported.digits
})

test('validateListFromOptions works for armv7l host and target arch', t => {
  const sandbox = sinon.createSandbox()

  sandbox.stub(process, 'arch').value('arm')
  sandbox.stub(process, 'config').value({variables: {arm_version: '7'}})

  t.deepEqual(targets.validateListFromOptions({}, 'arch'), ['armv7l'])

  sandbox.restore()
})

testMultiTarget('build for all available official targets', {all: true, electronVersion: '1.8.2'},
                util.allPlatformArchCombosCount,
                'Packages should be generated for all possible platforms')
testMultiTarget('build for all available official targets for a version without arm64 or mips64el support',
                {all: true},
                util.allPlatformArchCombosCount - 2,
                'Packages should be generated for all possible platforms (except arm64 and mips64el)')
testMultiTarget('platform=all (one arch)', {arch: 'ia32', platform: 'all'}, 2,
                'Packages should be generated for both 32-bit platforms')
testMultiTarget('arch=all test (one platform)', {arch: 'all', platform: 'linux'}, 3,
                'Packages should be generated for all expected architectures')

testCombinations('multi-platform / multi-arch test, from arrays', ['ia32', 'x64'], ['linux', 'win32'])
testCombinations('multi-platform / multi-arch test, from strings', 'ia32,x64', 'linux,win32')
testCombinations('multi-platform / multi-arch test, from strings with spaces', 'ia32, x64', 'linux, win32')

test('fails with invalid arch', util.invalidOptionTest({
  arch: 'z80',
  platform: 'linux'
}))
test('fails with invalid platform', util.invalidOptionTest({
  arch: 'ia32',
  platform: 'dos'
}))

test('hostArch detects incorrectly configured armv7l Node', t => {
  const sandbox = sinon.createSandbox()

  sandbox.stub(targets, 'unameArch').returns('armv7l')
  sandbox.stub(process, 'arch').value('arm')
  sandbox.stub(process, 'config').value({variables: {arm_version: '6'}})

  t.is(targets.hostArch(), 'armv7l')

  sandbox.restore()
})

test('hostArch detects correctly configured armv7l Node', t => {
  const sandbox = sinon.createSandbox()

  sandbox.stub(process, 'arch').value('arm')
  sandbox.stub(process, 'config').value({variables: {arm_version: '7'}})

  t.is(targets.hostArch(), 'armv7l')

  sandbox.restore()
})

test('hostArch cannot determine ARM version', t => {
  const sandbox = sinon.createSandbox()

  sandbox.stub(process, 'arch').value('arm')
  sandbox.stub(process, 'config').value({variables: {arm_version: '99'}})

  t.is(targets.hostArch(), 'arm')

  sandbox.restore()
})

testMultiTarget('invalid official combination', {arch: 'ia32', platform: 'darwin'}, 0, 'Package should not be generated for invalid official combination')
testMultiTarget('platform=linux and arch=arm64 with a supported official Electron version', {arch: 'arm64', platform: 'linux', electronVersion: '1.8.0'}, 1, 'Package should be generated for arm64')
testMultiTarget('platform=linux and arch=arm64 with an unsupported official Electron version', {arch: 'arm64', platform: 'linux'}, 0, 'Package should not be generated for arm64')
testMultiTarget('platform=linux and arch=mips64el with a supported official Electron version', {arch: 'mips64el', platform: 'linux', electronVersion: '1.8.2-beta.5'}, 1, 'Package should be generated for mips64el')
testMultiTarget('platform=linux and arch=mips64el with an unsupported official Electron version', {arch: 'mips64el', platform: 'linux'}, 0, 'Package should not be generated for mips64el')
testMultiTarget('unofficial arch', {arch: 'z80', platform: 'linux', download: {mirror: 'mirror'}}, 1,
                'Package should be generated for non-standard arch from non-official mirror')
testMultiTarget('unofficial platform', {arch: 'ia32', platform: 'minix', download: {mirror: 'mirror'}}, 1,
                'Package should be generated for non-standard platform from non-official mirror')
