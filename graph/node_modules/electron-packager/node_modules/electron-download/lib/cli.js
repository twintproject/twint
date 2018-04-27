#!/usr/bin/env node

'use strict'

const download = require('./')
const minimist = require('minimist')

let opts = minimist(process.argv.slice(2))

if (opts['strict-ssl'] === false) {
  opts.strictSSL = false
}

download(opts, (err, zipPath) => {
  if (err) throw err
  console.log('Downloaded zip:', zipPath)
  process.exit(0)
})
