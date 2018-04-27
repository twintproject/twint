#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var nugget = require('./')
var args = require('minimist')(process.argv.slice(2))

var urls = args._
if (urls.length === 0) {
  console.log(fs.readFileSync(path.join(__dirname, 'usage.txt')).toString())
  process.exit(1)
}

var opts = {
  target: args.o || args.O || args.out,
  dir: args.d || args.dir,
  resume: args.c || args.continue,
  force: args.f || args.force,
  sockets: args.s || args.sockets,
  quiet: args.q || args.quiet,
  frequency: args.frequency ? +args.frequency : null,
  proxy: args.proxy ? args.proxy : null,
  strictSSL: args['strict-ssl']
}

nugget(urls, opts, function (err) {
  if (err) {
    console.error('Error:', err)
    process.exit(1)
  }
  process.exit(0)
})
