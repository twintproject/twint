'use strict';

var Promise = require('bluebird');
var get = require('lodash.get');
var readPkgUp = require('read-pkg-up');
var path = require('path');
var debug = require('debug')('get-package-info');

var getInfo = function getInfo(props, dir, result) {
  if (!Array.isArray(props)) return Promise.reject(new Error('First argument must be array of properties to retrieve.'));
  if (!props.length) return Promise.resolve(result);

  debug('Getting props: ', props);
  debug('Looking up starting from directory: ', dir);
  debug('Result so far:', result);

  return Promise.resolve(readPkgUp({ cwd: dir, normalize: false })).then(function (_ref) {
    var src = _ref.path;
    var pkg = _ref.pkg;

    if (!src) {
      debug('Couldn\'t find any more package.json files');
      var err = new Error('Unable to find all properties in parent package.json files. Missing props: ' + props.map(function (prop) {
        return JSON.stringify(prop);
      }).join(', '));
      err.missingProps = props;
      err.result = result;
      throw err;
    }

    debug('Checking props in package.json found at:', src);
    var nextProps = [];

    props.forEach(function (prop) {
      // For props given as array
      // Look for props in that order, and when found
      // save value under all given props
      if (Array.isArray(prop)) {
        (function () {
          var value = void 0,
              sourceProp = void 0;

          prop.some(function (p) {
            sourceProp = p;
            value = get(pkg, p);
            return value;
          });

          if (value !== undefined) {
            debug('Found prop:', prop);
            prop.forEach(function (p) {
              result.values[p] = value;
              result.source[p] = { src: src, pkg: pkg, prop: sourceProp };
            });
          } else {
            debug('Couldn\'t find prop:', prop);
            nextProps.push(prop);
          }
        })();
      } else {
        // For regular string props, just look normally
        var _value = get(pkg, prop);

        if (_value !== undefined) {
          debug('Found prop:', prop);
          result.values[prop] = _value;
          result.source[prop] = { src: src, pkg: pkg, prop: prop };
        } else {
          debug('Couldn\'t find prop:', prop);
          nextProps.push(prop);
        }
      }
    });

    // Still have props to look for, look at another package.json above this one
    if (nextProps.length) {
      debug('Not all props satisfied, looking for parent package.json');
      return getInfo(nextProps, path.join(path.dirname(src), '..'), result);
    }

    debug('Found all props!');
    return result;
  });
};

module.exports = function (props, dir, cb) {
  return getInfo(props, dir, { values: {}, source: {} }).nodeify(cb);
};