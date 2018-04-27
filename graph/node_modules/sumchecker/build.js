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

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var debug = require('debug')('sumchecker');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var Promise = global.Promise || require('es6-promise').Promise;

var CHECKSUM_LINE = /^([\da-fA-F]+) ([ *])(.+)$/;

var ErrorWithFilename = function (_Error) {
  _inherits(ErrorWithFilename, _Error);

  function ErrorWithFilename(filename) {
    _classCallCheck(this, ErrorWithFilename);

    var _this = _possibleConstructorReturn(this, (ErrorWithFilename.__proto__ || Object.getPrototypeOf(ErrorWithFilename)).call(this));

    _this.filename = filename;
    return _this;
  }

  return ErrorWithFilename;
}(Error);

var ChecksumMismatchError = function (_ErrorWithFilename) {
  _inherits(ChecksumMismatchError, _ErrorWithFilename);

  function ChecksumMismatchError(filename) {
    _classCallCheck(this, ChecksumMismatchError);

    var _this2 = _possibleConstructorReturn(this, (ChecksumMismatchError.__proto__ || Object.getPrototypeOf(ChecksumMismatchError)).call(this, filename));

    _this2.message = 'Generated checksum for "' + filename + '" did not match expected checksum.';
    return _this2;
  }

  return ChecksumMismatchError;
}(ErrorWithFilename);

var ChecksumParseError = function (_Error2) {
  _inherits(ChecksumParseError, _Error2);

  function ChecksumParseError(lineNumber, line) {
    _classCallCheck(this, ChecksumParseError);

    var _this3 = _possibleConstructorReturn(this, (ChecksumParseError.__proto__ || Object.getPrototypeOf(ChecksumParseError)).call(this));

    _this3.lineNumber = lineNumber;
    _this3.line = line;
    _this3.message = 'Could not parse checksum file at line ' + lineNumber + ': ' + line;
    return _this3;
  }

  return ChecksumParseError;
}(Error);

var NoChecksumFoundError = function (_ErrorWithFilename2) {
  _inherits(NoChecksumFoundError, _ErrorWithFilename2);

  function NoChecksumFoundError(filename) {
    _classCallCheck(this, NoChecksumFoundError);

    var _this4 = _possibleConstructorReturn(this, (NoChecksumFoundError.__proto__ || Object.getPrototypeOf(NoChecksumFoundError)).call(this, filename));

    _this4.message = 'No checksum found in checksum file for "' + filename + '".';
    return _this4;
  }

  return NoChecksumFoundError;
}(ErrorWithFilename);

var ChecksumValidator = function () {
  function ChecksumValidator(algorithm, checksumFilename, options) {
    _classCallCheck(this, ChecksumValidator);

    this.algorithm = algorithm;
    this.checksumFilename = checksumFilename;
    this.checksums = null;

    if (options && options.defaultTextEncoding) {
      this.defaultTextEncoding = options.defaultTextEncoding;
    } else {
      this.defaultTextEncoding = 'utf8';
    }
  }

  _createClass(ChecksumValidator, [{
    key: 'encoding',
    value: function encoding(binary) {
      return binary ? 'binary' : this.defaultTextEncoding;
    }
  }, {
    key: 'parseChecksumFile',
    value: function parseChecksumFile(data) {
      var that = this;
      return new Promise(function (resolve, reject) {
        debug('Parsing checksum file');
        that.checksums = {};
        var lineNumber = 0;
        data.trim().split(/[\r\n]+/).forEach(function (line) {
          lineNumber += 1;
          var result = CHECKSUM_LINE.exec(line);
          if (result === null) {
            debug('Could not parse line number ' + lineNumber);
            reject(new ChecksumParseError(lineNumber, line));
          } else {
            // destructuring isn't available until Node 6
            var filename = result[3];
            var isBinary = result[2] === '*';
            var checksum = result[1];

            that.checksums[filename] = [checksum, isBinary];
          }
        });
        debug('Parsed checksums:', that.checksums);
        resolve();
      });
    }
  }, {
    key: 'readFile',
    value: function readFile(filename, binary) {
      var _this5 = this;

      debug('Reading "' + filename + ' (binary mode: ' + binary + ')"');
      return new Promise(function (resolve, reject) {
        fs.readFile(filename, _this5.encoding(binary), function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }
  }, {
    key: 'validate',
    value: function validate(baseDir, filesToCheck) {
      var _this6 = this;

      if (typeof filesToCheck === 'string') {
        filesToCheck = [filesToCheck];
      }

      return this.readFile(this.checksumFilename, false).then(this.parseChecksumFile.bind(this)).then(function () {
        return _this6.validateFiles(baseDir, filesToCheck);
      });
    }
  }, {
    key: 'validateFile',
    value: function validateFile(baseDir, filename) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        debug('validateFile: ' + filename);

        var metadata = _this7.checksums[filename];
        if (!metadata) {
          return reject(new NoChecksumFoundError(filename));
        }

        // destructuring isn't available until Node 6
        var checksum = metadata[0];
        var binary = metadata[1];

        var fullPath = path.resolve(baseDir, filename);
        debug('Reading file with "' + _this7.encoding(binary) + '" encoding');
        var stream = fs.createReadStream(fullPath, { encoding: _this7.encoding(binary) });
        var hasher = crypto.createHash(_this7.algorithm, { defaultEncoding: 'binary' });
        hasher.on('readable', function () {
          var data = hasher.read();
          if (data) {
            var calculated = data.toString('hex');

            debug('Expected checksum: ' + checksum + '; Actual: ' + calculated);
            if (calculated === checksum) {
              resolve();
            } else {
              reject(new ChecksumMismatchError(filename));
            }
          }
        });
        stream.pipe(hasher);
      });
    }
  }, {
    key: 'validateFiles',
    value: function validateFiles(baseDir, filesToCheck) {
      var that = this;
      return Promise.all(filesToCheck.map(function (filename) {
        return that.validateFile(baseDir, filename);
      }));
    }
  }]);

  return ChecksumValidator;
}();

var sumchecker = function sumchecker(algorithm, checksumFilename, baseDir, filesToCheck) {
  return new ChecksumValidator(algorithm, checksumFilename).validate(baseDir, filesToCheck);
};

sumchecker.ChecksumMismatchError = ChecksumMismatchError;
sumchecker.ChecksumParseError = ChecksumParseError;
sumchecker.ChecksumValidator = ChecksumValidator;
sumchecker.NoChecksumFoundError = NoChecksumFoundError;

module.exports = sumchecker;
