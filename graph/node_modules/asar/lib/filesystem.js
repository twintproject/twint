'use strict'
const fs = process.versions.electron ? require('original-fs') : require('fs')
const path = require('path')
const tmp = require('tmp')
const UINT64 = require('cuint').UINT64

class Filesystem {
  constructor (src) {
    this.src = path.resolve(src)
    this.header = {files: {}}
    this.offset = UINT64(0)
  }

  searchNodeFromDirectory (p) {
    let json = this.header
    const dirs = p.split(path.sep)
    for (const dir of dirs) {
      if (dir !== '.') {
        json = json.files[dir]
      }
    }
    return json
  }

  searchNodeFromPath (p) {
    p = path.relative(this.src, p)
    if (!p) { return this.header }
    const name = path.basename(p)
    const node = this.searchNodeFromDirectory(path.dirname(p))
    if (node.files == null) {
      node.files = {}
    }
    if (node.files[name] == null) {
      node.files[name] = {}
    }
    return node.files[name]
  }

  insertDirectory (p, shouldUnpack) {
    const node = this.searchNodeFromPath(p)
    if (shouldUnpack) {
      node.unpacked = shouldUnpack
    }
    node.files = {}
    return node.files
  }

  insertFile (p, shouldUnpack, file, options, callback) {
    const dirNode = this.searchNodeFromPath(path.dirname(p))
    const node = this.searchNodeFromPath(p)
    if (shouldUnpack || dirNode.unpacked) {
      node.size = file.stat.size
      node.unpacked = true
      process.nextTick(callback)
      return
    }

    const handler = () => {
      const size = file.transformed ? file.transformed.stat.size : file.stat.size

      // JavaScript can not precisely present integers >= UINT32_MAX.
      if (size > 4294967295) {
        throw new Error(`${p}: file size can not be larger than 4.2GB`)
      }

      node.size = size
      node.offset = this.offset.toString()
      if (process.platform !== 'win32' && (file.stat.mode & 0o100)) {
        node.executable = true
      }
      this.offset.add(UINT64(size))

      return callback()
    }

    const tr = options.transform && options.transform(p)
    if (tr) {
      return tmp.file(function (err, path) {
        if (err) { return handler() }
        const out = fs.createWriteStream(path)
        const stream = fs.createReadStream(p)

        stream.pipe(tr).pipe(out)
        return out.on('close', function () {
          file.transformed = {
            path,
            stat: fs.lstatSync(path)
          }
          return handler()
        })
      })
    } else {
      return process.nextTick(handler)
    }
  }

  insertLink (p, stat) {
    const link = path.relative(fs.realpathSync(this.src), fs.realpathSync(p))
    if (link.substr(0, 2) === '..') {
      throw new Error(`${p}: file links out of the package`)
    }
    const node = this.searchNodeFromPath(p)
    node.link = link
    return link
  }

  listFiles () {
    const files = []
    const fillFilesFromHeader = function (p, json) {
      if (!json.files) {
        return
      }
      return (() => {
        const result = []
        for (const f in json.files) {
          const fullPath = path.join(p, f)
          files.push(fullPath)
          result.push(fillFilesFromHeader(fullPath, json.files[f]))
        }
        return result
      })()
    }

    fillFilesFromHeader('/', this.header)
    return files
  }

  getNode (p) {
    const node = this.searchNodeFromDirectory(path.dirname(p))
    const name = path.basename(p)
    if (name) {
      return node.files[name]
    } else {
      return node
    }
  }

  getFile (p, followLinks) {
    followLinks = typeof followLinks === 'undefined' ? true : followLinks
    const info = this.getNode(p)

    // if followLinks is false we don't resolve symlinks
    if (info.link && followLinks) {
      return this.getFile(info.link)
    } else {
      return info
    }
  }
}

module.exports = Filesystem
