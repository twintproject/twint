'use strict'

const assign = require('./util/assign')

const fse = {}
const gfs = require('graceful-fs')

// attach fs methods to fse
Object.keys(gfs).forEach(key => {
  fse[key] = gfs[key]
})

const fs = fse

assign(fs, require('./copy'))
assign(fs, require('./copy-sync'))
assign(fs, require('./mkdirs'))
assign(fs, require('./remove'))
assign(fs, require('./json'))
assign(fs, require('./move'))
assign(fs, require('./move-sync'))
assign(fs, require('./empty'))
assign(fs, require('./ensure'))
assign(fs, require('./output'))

module.exports = fs

// maintain backwards compatibility for awhile
const jsonfile = {}
Object.defineProperty(jsonfile, 'spaces', {
  get: () => fs.spaces, // found in ./json
  set: val => {
    fs.spaces = val
  }
})

module.exports.jsonfile = jsonfile // so users of fs-extra can modify jsonFile.spaces
