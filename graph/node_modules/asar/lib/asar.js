'use strict'
const fs = process.versions.electron ? require('original-fs') : require('fs')
const path = require('path')
const minimatch = require('minimatch')
const mkdirp = require('mkdirp')

const Filesystem = require('./filesystem')
const disk = require('./disk')
const crawlFilesystem = require('./crawlfs')
const createSnapshot = require('./snapshot')

// Return whether or not a directory should be excluded from packing due to
// "--unpack-dir" option
//
// @param {string} path - diretory path to check
// @param {string} pattern - literal prefix [for backward compatibility] or glob pattern
// @param {array} unpackDirs - Array of directory paths previously marked as unpacked
//
const isUnpackDir = function (path, pattern, unpackDirs) {
  if (path.indexOf(pattern) === 0 || minimatch(path, pattern)) {
    if (unpackDirs.indexOf(path) === -1) {
      unpackDirs.push(path)
    }
    return true
  } else {
    for (let i = 0; i < unpackDirs.length; i++) {
      if (path.indexOf(unpackDirs[i]) === 0) {
        return true
      }
    }
    return false
  }
}

module.exports.createPackage = function (src, dest, callback) {
  return module.exports.createPackageWithOptions(src, dest, {}, callback)
}

module.exports.createPackageWithOptions = function (src, dest, options, callback) {
  const globOptions = options.globOptions ? options.globOptions : {}
  globOptions.dot = options.dot === undefined ? true : options.dot

  let pattern = src + '/**/*'
  if (options.pattern) {
    pattern = src + options.pattern
  }

  return crawlFilesystem(pattern, globOptions, function (error, filenames, metadata) {
    if (error) { return callback(error) }
    module.exports.createPackageFromFiles(src, dest, filenames, metadata, options, callback)
  })
}

/*
createPackageFromFiles - Create an asar-archive from a list of filenames
src: Base path. All files are relative to this.
dest: Archive filename (& path).
filenames: Array of filenames relative to src.
metadata: Object with filenames as keys and {type='directory|file|link', stat: fs.stat} as values. (Optional)
options: The options.
callback: The callback function. Accepts (err).
*/
module.exports.createPackageFromFiles = function (src, dest, filenames, metadata, options, callback) {
  if (typeof metadata === 'undefined' || metadata === null) { metadata = {} }
  const filesystem = new Filesystem(src)
  const files = []
  const unpackDirs = []

  let filenamesSorted = []
  if (options.ordering) {
    const orderingFiles = fs.readFileSync(options.ordering).toString().split('\n').map(function (line) {
      if (line.includes(':')) { line = line.split(':').pop() }
      line = line.trim()
      if (line.startsWith('/')) { line = line.slice(1) }
      return line
    })

    const ordering = []
    for (const file of orderingFiles) {
      const pathComponents = file.split(path.sep)
      let str = src
      for (const pathComponent of pathComponents) {
        str = path.join(str, pathComponent)
        ordering.push(str)
      }
    }

    let missing = 0
    const total = filenames.length

    for (const file of ordering) {
      if (!filenamesSorted.includes(file) && filenames.includes(file)) {
        filenamesSorted.push(file)
      }
    }

    for (const file of filenames) {
      if (!filenamesSorted.includes(file)) {
        filenamesSorted.push(file)
        missing += 1
      }
    }

    console.log(`Ordering file has ${((total - missing) / total) * 100}% coverage.`)
  } else {
    filenamesSorted = filenames
  }

  const handleFile = function (filename, done) {
    let file = metadata[filename]
    let type
    if (!file) {
      const stat = fs.lstatSync(filename)
      if (stat.isDirectory()) { type = 'directory' }
      if (stat.isFile()) { type = 'file' }
      if (stat.isSymbolicLink()) { type = 'link' }
      file = {stat, type}
    }

    let shouldUnpack
    switch (file.type) {
      case 'directory':
        shouldUnpack = options.unpackDir
          ? isUnpackDir(path.relative(src, filename), options.unpackDir, unpackDirs)
          : false
        filesystem.insertDirectory(filename, shouldUnpack)
        break
      case 'file':
        shouldUnpack = false
        if (options.unpack) {
          shouldUnpack = minimatch(filename, options.unpack, {matchBase: true})
        }
        if (!shouldUnpack && options.unpackDir) {
          const dirName = path.relative(src, path.dirname(filename))
          shouldUnpack = isUnpackDir(dirName, options.unpackDir, unpackDirs)
        }
        files.push({filename: filename, unpack: shouldUnpack})
        filesystem.insertFile(filename, shouldUnpack, file, options, done)
        return
      case 'link':
        filesystem.insertLink(filename, file.stat)
        break
    }
    return process.nextTick(done)
  }

  const insertsDone = function () {
    return mkdirp(path.dirname(dest), function (error) {
      if (error) { return callback(error) }
      return disk.writeFilesystem(dest, filesystem, files, metadata, function (error) {
        if (error) { return callback(error) }
        if (options.snapshot) {
          return createSnapshot(src, dest, filenames, metadata, options, callback)
        } else {
          return callback(null)
        }
      })
    })
  }

  const names = filenamesSorted.slice()

  const next = function (name) {
    if (!name) { return insertsDone() }

    return handleFile(name, function () {
      return next(names.shift())
    })
  }

  return next(names.shift())
}

module.exports.statFile = function (archive, filename, followLinks) {
  const filesystem = disk.readFilesystemSync(archive)
  return filesystem.getFile(filename, followLinks)
}

module.exports.listPackage = function (archive) {
  return disk.readFilesystemSync(archive).listFiles()
}

module.exports.extractFile = function (archive, filename) {
  const filesystem = disk.readFilesystemSync(archive)
  return disk.readFileSync(filesystem, filename, filesystem.getFile(filename))
}

module.exports.extractAll = function (archive, dest) {
  const filesystem = disk.readFilesystemSync(archive)
  const filenames = filesystem.listFiles()

  // under windows just extract links as regular files
  const followLinks = process.platform === 'win32'

  // create destination directory
  mkdirp.sync(dest)

  return filenames.map((filename) => {
    filename = filename.substr(1)  // get rid of leading slash
    const destFilename = path.join(dest, filename)
    const file = filesystem.getFile(filename, followLinks)
    if (file.files) {
      // it's a directory, create it and continue with the next entry
      mkdirp.sync(destFilename)
    } else if (file.link) {
      // it's a symlink, create a symlink
      const linkSrcPath = path.dirname(path.join(dest, file.link))
      const linkDestPath = path.dirname(destFilename)
      const relativePath = path.relative(linkDestPath, linkSrcPath);
      // try to delete output file, because we can't overwrite a link
      (() => {
        try {
          fs.unlinkSync(destFilename)
        } catch (error) {}
      })()
      const linkTo = path.join(relativePath, path.basename(file.link))
      fs.symlinkSync(linkTo, destFilename)
    } else {
      // it's a file, extract it
      const content = disk.readFileSync(filesystem, filename, file)
      fs.writeFileSync(destFilename, content)
    }
  })
}

module.exports.uncache = function (archive) {
  return disk.uncacheFilesystem(archive)
}

module.exports.uncacheAll = function () {
  disk.uncacheAll()
}
