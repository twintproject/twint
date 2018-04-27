'use strict'

const path = require('path')
const fs = require('graceful-fs')
const mkdir = require('../mkdirs')

function createFile (file, callback) {
  function makeFile () {
    fs.writeFile(file, '', err => {
      if (err) return callback(err)
      callback()
    })
  }

  fs.exists(file, fileExists => {
    if (fileExists) return callback()
    const dir = path.dirname(file)
    fs.exists(dir, dirExists => {
      if (dirExists) return makeFile()
      mkdir.mkdirs(dir, err => {
        if (err) return callback(err)
        makeFile()
      })
    })
  })
}

function createFileSync (file) {
  if (fs.existsSync(file)) return

  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    mkdir.mkdirsSync(dir)
  }

  fs.writeFileSync(file, '')
}

module.exports = {
  createFile,
  createFileSync,
  // alias
  ensureFile: createFile,
  ensureFileSync: createFileSync
}
