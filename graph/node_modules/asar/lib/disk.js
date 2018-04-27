'use strict'
const fs = process.versions.electron ? require('original-fs') : require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const pickle = require('chromium-pickle-js')

const Filesystem = require('./filesystem')
let filesystemCache = {}

const copyFileToSync = function (dest, src, filename) {
  const srcFile = path.join(src, filename)
  const targetFile = path.join(dest, filename)

  const content = fs.readFileSync(srcFile)
  const stats = fs.statSync(srcFile)
  mkdirp.sync(path.dirname(targetFile))
  return fs.writeFileSync(targetFile, content, {mode: stats.mode})
}

const writeFileListToStream = function (dest, filesystem, out, list, metadata, callback) {
  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    if (file.unpack) {
      // the file should not be packed into archive.
      const filename = path.relative(filesystem.src, file.filename)
      try {
        copyFileToSync(`${dest}.unpacked`, filesystem.src, filename)
      } catch (error) {
        return callback(error)
      }
    } else {
      const tr = metadata[file.filename].transformed
      const stream = fs.createReadStream((tr ? tr.path : file.filename))
      stream.pipe(out, {end: false})
      stream.on('error', callback)
      return stream.on('end', function () {
        return writeFileListToStream(dest, filesystem, out, list.slice(i + 1), metadata, callback)
      })
    }
  }
  out.end()
  return callback(null)
}

module.exports.writeFilesystem = function (dest, filesystem, files, metadata, callback) {
  let sizeBuf
  let headerBuf
  try {
    const headerPickle = pickle.createEmpty()
    headerPickle.writeString(JSON.stringify(filesystem.header))
    headerBuf = headerPickle.toBuffer()

    const sizePickle = pickle.createEmpty()
    sizePickle.writeUInt32(headerBuf.length)
    sizeBuf = sizePickle.toBuffer()
  } catch (error) {
    return callback(error)
  }

  const out = fs.createWriteStream(dest)
  out.on('error', callback)
  out.write(sizeBuf)
  return out.write(headerBuf, function () {
    return writeFileListToStream(dest, filesystem, out, files, metadata, callback)
  })
}

module.exports.readArchiveHeaderSync = function (archive) {
  const fd = fs.openSync(archive, 'r')
  let size
  let headerBuf
  try {
    const sizeBuf = new Buffer(8)
    if (fs.readSync(fd, sizeBuf, 0, 8, null) !== 8) {
      throw new Error('Unable to read header size')
    }

    const sizePickle = pickle.createFromBuffer(sizeBuf)
    size = sizePickle.createIterator().readUInt32()
    headerBuf = new Buffer(size)
    if (fs.readSync(fd, headerBuf, 0, size, null) !== size) {
      throw new Error('Unable to read header')
    }
  } finally {
    fs.closeSync(fd)
  }

  const headerPickle = pickle.createFromBuffer(headerBuf)
  const header = headerPickle.createIterator().readString()
  return {header: JSON.parse(header), headerSize: size}
}

module.exports.readFilesystemSync = function (archive) {
  if (!filesystemCache[archive]) {
    const header = this.readArchiveHeaderSync(archive)
    const filesystem = new Filesystem(archive)
    filesystem.header = header.header
    filesystem.headerSize = header.headerSize
    filesystemCache[archive] = filesystem
  }
  return filesystemCache[archive]
}

module.exports.uncacheFilesystem = function (archive) {
  if (filesystemCache[archive]) {
    filesystemCache[archive] = undefined
    return true
  }
  return false
}

module.exports.uncacheAll = function () {
  filesystemCache = {}
}

module.exports.readFileSync = function (filesystem, filename, info) {
  let buffer = new Buffer(info.size)
  if (info.size <= 0) { return buffer }
  if (info.unpacked) {
    // it's an unpacked file, copy it.
    buffer = fs.readFileSync(path.join(`${filesystem.src}.unpacked`, filename))
  } else {
    // Node throws an exception when reading 0 bytes into a 0-size buffer,
    // so we short-circuit the read in this case.
    const fd = fs.openSync(filesystem.src, 'r')
    try {
      const offset = 8 + filesystem.headerSize + parseInt(info.offset)
      fs.readSync(fd, buffer, 0, info.size, offset)
    } finally {
      fs.closeSync(fd)
    }
  }
  return buffer
}
