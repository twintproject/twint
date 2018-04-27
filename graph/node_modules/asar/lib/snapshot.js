'use strict'
const fs = process.versions.electron ? require('original-fs') : require('fs')
const path = require('path')
const mksnapshot = require('mksnapshot')
const vm = require('vm')

const stripBOM = function (content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }
  return content
}

const wrapModuleCode = function (script) {
  script = script.replace(/^#!.*/, '')
  return `(function(exports, require, module, __filename, __dirname) { ${script} \n});`
}

const dumpObjectToJS = function (content) {
  let result = 'var __ATOM_SHELL_SNAPSHOT = {\n'
  for (const filename in content) {
    const func = content[filename].toString()
    result += `  '${filename}': ${func},\n`
  }
  result += '};\n'
  return result
}

const createSnapshot = function (src, dest, filenames, metadata, options, callback) {
  const content = {}
  try {
    src = path.resolve(src)
    for (const filename of filenames) {
      const file = metadata[filename]
      if ((file.type === 'file' || file.type === 'link') && filename.substr(-3) === '.js') {
        const script = wrapModuleCode(stripBOM(fs.readFileSync(filename, 'utf8')))
        const relativeFilename = path.relative(src, filename)
        try {
          const compiled = vm.runInThisContext(script, {filename: relativeFilename})
          content[relativeFilename] = compiled
        } catch (error) {
          console.error('Ignoring ' + relativeFilename + ' for ' + error.name)
        }
      }
    }
  } catch (error) {
    return callback(error)
  }

  // run mksnapshot
  const str = dumpObjectToJS(content)
  const version = options.version
  const arch = options.arch
  const builddir = options.builddir
  let snapshotdir = options.snapshotdir

  if (typeof snapshotdir === 'undefined' || snapshotdir === null) { snapshotdir = path.dirname(dest) }
  const target = path.resolve(snapshotdir, 'snapshot_blob.bin')
  return mksnapshot(str, target, version, arch, builddir, callback)
}

module.exports = createSnapshot
