'use strict'

const common = require('../common')
const test = require('ava')

test('CLI argument test: --electron-version populates opts.electronVersion', t => {
  let args = common.parseCLIArgs([])
  t.is(args.electronVersion, undefined)
  args = common.parseCLIArgs(['--electron-version=1.2.3'])
  t.is(args.electronVersion, '1.2.3')
})

test('CLI argument test: --download.strictSSL default', t => {
  const args = common.parseCLIArgs([])
  t.true(args.download.strictSSL, 'default for --download.strictSSL is true')
})

test('CLI argument test: --asar=true', t => {
  const args = common.parseCLIArgs(['--asar=true'])
  t.true(args.asar)
})

test('CLI argument test: using --asar overrides other --asar.options', t => {
  let args = common.parseCLIArgs(['--asar', '--asar.unpack=*.node'])
  t.true(args.asar)
  args = common.parseCLIArgs(['--asar.unpack=*.node', '--asar'])
  t.true(args.asar)
})

test('CLI argument test: --osx-sign=true', t => {
  const args = common.parseCLIArgs(['--osx-sign=true'])
  t.true(args.osxSign)
})

test('CLI argument test: --tmpdir=false', t => {
  const args = common.parseCLIArgs(['--tmpdir=false'])
  t.false(args.tmpdir)
})

test('CLI argument test: --deref-symlinks default', t => {
  const args = common.parseCLIArgs([])
  t.true(args.derefSymlinks)
})

test('CLI argument test: --out always resolves to a string', t => {
  const args = common.parseCLIArgs(['--out=1'])
  t.is(args.out, '1')
})

test('CLI argument test: --out without a value is the same as not passing --out', t => {
  const args = common.parseCLIArgs(['--out'])
  t.is(args.out, null)
})

test('CLI argument test: --protocol with a corresponding --protocol-name', t => {
  const args = common.parseCLIArgs(['--protocol=foo', '--protocol-name=Foo'])
  t.deepEqual(args.protocols, [{schemes: ['foo'], name: 'Foo'}])
})

test('CLI argument test: --protocol without a corresponding --protocol-name', t => {
  const args = common.parseCLIArgs(['--protocol=foo'])
  t.deepEqual(args.protocols, undefined, 'no protocols have been fully defined')
})

test('CLI argument test: multiple --protocol/--protocol-name argument pairs', t => {
  const args = common.parseCLIArgs(['--protocol=foo', '--protocol-name=Foo', '--protocol=bar', '--protocol-name=Bar'])
  t.deepEqual(args.protocols, [{schemes: ['foo'], name: 'Foo'}, {schemes: ['bar'], name: 'Bar'}])
})
