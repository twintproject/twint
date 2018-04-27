#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var args = require('minimist')(process.argv.slice(2), {
  'boolean': [
    'help',
    'pre-auto-entitlements',
    'pre-embed-provisioning-profile',
    'gatekeeper-assess'
  ],
  'default': {
    'pre-auto-entitlements': true,
    'pre-embed-provisioning-profile': true,
    'gatekeeper-assess': true
  }
})
var usage = fs.readFileSync(path.join(__dirname, 'electron-osx-sign-usage.txt')).toString()
var sign = require('../').sign

args.app = args._.shift()
args.binaries = args._

if (!args.app || args.help) {
  console.log(usage)
  process.exit(0)
}

// Remove excess arguments
delete args._
delete args.help

sign(args, function done (err) {
  if (err) {
    console.error('Sign failed:')
    if (err.message) console.error(err.message)
    else if (err.stack) console.error(err.stack)
    else console.log(err)
    process.exit(1)
  }
  console.log('Application signed:', args.app)
  process.exit(0)
})
