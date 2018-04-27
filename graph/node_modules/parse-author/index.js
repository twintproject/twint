/*!
 * parse-author <https://github.com/jonschlinkert/parse-author>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

var regex = require('author-regex');

module.exports = function(str) {
  if (typeof str !== 'string') {
    throw new TypeError('expected author to be a string');
  }

  if (!str || !/\w/.test(str)) {
    return {};
  }

  var match = [].concat.apply([], regex().exec(str));
  var author = {};

  if (match[1]) {
    author.name = match[1];
  }

  for (var i = 2; i < match.length; i++) {
    var val = match[i];

    if (i % 2 === 0 && val && match[i + 1]) {
      if (val.charAt(0) === '<') {
        author.email = match[i + 1];
        i++;

      } else if (val.charAt(0) === '(') {
        author.url = match[i + 1];
        i++;
      }
    }
  }
  return author;
};
