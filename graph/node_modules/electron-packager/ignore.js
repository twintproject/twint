'use strict'

const common = require('./common')
const debug = require('debug')('electron-packager')
const path = require('path')
const prune = require('./prune')
const targets = require('./targets')

const DEFAULT_IGNORES = [
  '/\\.git($|/)',
  '/node_modules/\\.bin($|/)',
  '\\.o(bj)?$'
]

function generateIgnores (opts) {
  if (typeof (opts.ignore) !== 'function') {
    if (opts.ignore) {
      opts.ignore = common.ensureArray(opts.ignore).concat(DEFAULT_IGNORES)
    } else {
      opts.ignore = [].concat(DEFAULT_IGNORES)
    }
    if (process.platform === 'linux') {
      opts.ignore.push(common.baseTempDir(opts))
    }

    debug('Ignored path regular expressions:', opts.ignore)
  }
}

function generateOutIgnores (opts) {
  const normalizedOut = opts.out ? path.resolve(opts.out) : null
  const outIgnores = []
  if (normalizedOut === null || normalizedOut === process.cwd()) {
    for (const platform of Object.keys(targets.officialPlatformArchCombos)) {
      for (const arch of targets.officialPlatformArchCombos[platform]) {
        let basenameOpts = {
          arch: arch,
          name: opts.name,
          platform: platform
        }
        outIgnores.push(path.join(process.cwd(), common.generateFinalBasename(basenameOpts)))
      }
    }
  } else {
    outIgnores.push(normalizedOut)
  }

  debug('Ignored paths based on the out param:', outIgnores)

  return outIgnores
}

function userIgnoreFilter (opts) {
  let ignore = opts.ignore || []
  let ignoreFunc = null

  if (typeof (ignore) === 'function') {
    ignoreFunc = file => { return !ignore(file) }
  } else {
    ignore = common.ensureArray(ignore)

    ignoreFunc = function filterByRegexes (file) {
      return !ignore.some(regex => file.match(regex))
    }
  }

  const outIgnores = generateOutIgnores(opts)
  const pruner = opts.prune ? new prune.Pruner(opts.dir) : null

  return function filter (file) {
    if (outIgnores.indexOf(file) !== -1) {
      return false
    }

    let name = file.split(path.resolve(opts.dir))[1]

    if (path.sep === '\\') {
      name = common.normalizePath(name)
    }

    if (pruner && name.startsWith('/node_modules/')) {
      return prune.isModule(file)
        .then(isModule => isModule ? pruner.pruneModule(name) : ignoreFunc(name))
    }

    return ignoreFunc(name)
  }
}

module.exports = {
  generateIgnores: generateIgnores,
  generateOutIgnores: generateOutIgnores,
  userIgnoreFilter: userIgnoreFilter
}
