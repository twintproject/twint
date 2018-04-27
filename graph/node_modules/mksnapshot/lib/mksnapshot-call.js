(function() {
  var callMksnapshot, fs, path, spawn;

  fs = require('fs-extra');

  path = require('path');

  spawn = require('child_process').spawn;

  callMksnapshot = function(mksnapshot, content, target, builddir, callback) {
    return fs.writeFile(path.join(builddir, 'out.js'), content, function(error) {
      var child;
      if (error) {
        return callback(error);
      }
      child = spawn(mksnapshot, ['out.cc', '--startup_blob', 'out.bin', 'out.js'], {
        cwd: builddir
      });
      child.on('error', callback);
      return child.on('close', function(code) {
        if (code !== 0) {
          return callback(new Error("mksnapshot returned " + code));
        }
        try {
          fs.copySync(path.join(builddir, 'out.bin'), target);
        } catch (_error) {
          error = _error;
          return callback(error);
        }
        return callback(null);
      });
    });
  };

  module.exports = callMksnapshot;

}).call(this);
