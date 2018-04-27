/*
Copyright 2016 Mark Lee

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict'

const debug = require('debug')('sumchecker')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Promise = global.Promise || require('es6-promise').Promise

const CHECKSUM_LINE = /^([\da-fA-F]+) ([ *])(.+)$/

class ErrorWithFilename extends Error {
  constructor (filename) {
    super()
    this.filename = filename
  }
}

class ChecksumMismatchError extends ErrorWithFilename {
  constructor (filename) {
    super(filename)
    this.message = `Generated checksum for "${filename}" did not match expected checksum.`
  }
}

class ChecksumParseError extends Error {
  constructor (lineNumber, line) {
    super()
    this.lineNumber = lineNumber
    this.line = line
    this.message = `Could not parse checksum file at line ${lineNumber}: ${line}`
  }
}

class NoChecksumFoundError extends ErrorWithFilename {
  constructor (filename) {
    super(filename)
    this.message = `No checksum found in checksum file for "${filename}".`
  }
}

class ChecksumValidator {
  constructor (algorithm, checksumFilename, options) {
    this.algorithm = algorithm
    this.checksumFilename = checksumFilename
    this.checksums = null

    if (options && options.defaultTextEncoding) {
      this.defaultTextEncoding = options.defaultTextEncoding
    } else {
      this.defaultTextEncoding = 'utf8'
    }
  }

  encoding (binary) {
    return binary ? 'binary' : this.defaultTextEncoding
  }

  parseChecksumFile (data) {
    let that = this
    return new Promise((resolve, reject) => {
      debug('Parsing checksum file')
      that.checksums = {}
      let lineNumber = 0
      data.trim().split(/[\r\n]+/).forEach(line => {
        lineNumber += 1
        let result = CHECKSUM_LINE.exec(line)
        if (result === null) {
          debug(`Could not parse line number ${lineNumber}`)
          reject(new ChecksumParseError(lineNumber, line))
        } else {
          // destructuring isn't available until Node 6
          let filename = result[3]
          let isBinary = result[2] === '*'
          let checksum = result[1]

          that.checksums[filename] = [checksum, isBinary]
        }
      })
      debug('Parsed checksums:', that.checksums)
      resolve()
    })
  }

  readFile (filename, binary) {
    debug(`Reading "${filename} (binary mode: ${binary})"`)
    return new Promise((resolve, reject) => {
      fs.readFile(filename, this.encoding(binary), (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  validate (baseDir, filesToCheck) {
    if (typeof filesToCheck === 'string') {
      filesToCheck = [filesToCheck]
    }

    return this.readFile(this.checksumFilename, false)
      .then(this.parseChecksumFile.bind(this))
      .then(() => {
        return this.validateFiles(baseDir, filesToCheck)
      })
  }

  validateFile (baseDir, filename) {
    return new Promise((resolve, reject) => {
      debug(`validateFile: ${filename}`)

      let metadata = this.checksums[filename]
      if (!metadata) {
        return reject(new NoChecksumFoundError(filename))
      }

      // destructuring isn't available until Node 6
      let checksum = metadata[0]
      let binary = metadata[1]

      let fullPath = path.resolve(baseDir, filename)
      debug(`Reading file with "${this.encoding(binary)}" encoding`)
      let stream = fs.createReadStream(fullPath, {encoding: this.encoding(binary)})
      let hasher = crypto.createHash(this.algorithm, {defaultEncoding: 'binary'})
      hasher.on('readable', () => {
        let data = hasher.read()
        if (data) {
          let calculated = data.toString('hex')

          debug(`Expected checksum: ${checksum}; Actual: ${calculated}`)
          if (calculated === checksum) {
            resolve()
          } else {
            reject(new ChecksumMismatchError(filename))
          }
        }
      })
      stream.pipe(hasher)
    })
  }

  validateFiles (baseDir, filesToCheck) {
    let that = this
    return Promise.all(filesToCheck.map((filename) => {
      return that.validateFile(baseDir, filename)
    }))
  }
}

let sumchecker = function sumchecker (algorithm, checksumFilename, baseDir, filesToCheck) {
  return new ChecksumValidator(algorithm, checksumFilename).validate(baseDir, filesToCheck)
}

sumchecker.ChecksumMismatchError = ChecksumMismatchError
sumchecker.ChecksumParseError = ChecksumParseError
sumchecker.ChecksumValidator = ChecksumValidator
sumchecker.NoChecksumFoundError = NoChecksumFoundError

module.exports = sumchecker
