(function() {
  var REPO_URL, downloadFileToLocation, fs, getPathOfMksnapshot, path, request, unzipFile;

  fs = require('fs-extra');

  path = require('path');

  request = require('request');

  REPO_URL = 'https://github.com/electron/electron';

  downloadFileToLocation = function(url, filename, callback) {
    var requestStream, stream;
    stream = fs.createWriteStream(filename);
    stream.on('close', callback);
    stream.on('error', callback);
    requestStream = request.get(url);
    requestStream.on('error', callback);
    return requestStream.on('response', function(response) {
      if (response.statusCode === 200) {
        return requestStream.pipe(stream);
      } else {
        return callback(new Error("Server responded " + response.statusCode));
      }
    });
  };

  unzipFile = function(zipPath, callback) {
    var DecompressZip, unzipper;
    DecompressZip = require('decompress-zip');
    unzipper = new DecompressZip(zipPath);
    unzipper.on('error', callback);
    unzipper.on('extract', function() {
      return callback(null);
    });
    return unzipper.extract({
      path: path.dirname(zipPath)
    });
  };

  getPathOfMksnapshot = function(version, arch, builddir, callback) {
    var mksnapshot, versionFile;
    mksnapshot = path.resolve(builddir, 'mksnapshot');
    if (process.platform === 'win32') {
      mksnapshot += '.exe';
    }
    versionFile = path.join(builddir, '.mksnapshot_version');
    return fs.readFile(versionFile, function(error, currentVersion) {
      if (!error && String(currentVersion).trim() === version) {
        return callback(null, mksnapshot);
      }
      return fs.mkdirp(builddir, function(error) {
        var filename, target, url;
        if (error) {
          return callback(error);
        }
        filename = "mksnapshot-v" + version + "-" + process.platform + "-" + arch + ".zip";
        url = "" + REPO_URL + "/releases/download/v" + version + "/" + filename;
        target = path.join(builddir, filename);
        return downloadFileToLocation(url, target, function(error) {
          if (error) {
            return callback(error);
          }
          return unzipFile(target, function(error) {
            if (error) {
              return callback(error);
            }
            try {
              if (process.platform !== 'win32') {
                fs.chmodSync(mksnapshot, '755');
              }
              fs.writeFileSync(versionFile, version);
            } catch (_error) {
              error = _error;
              return callback(error);
            }
            return callback(null, mksnapshot);
          });
        });
      });
    });
  };

  module.exports = getPathOfMksnapshot;

}).call(this);
