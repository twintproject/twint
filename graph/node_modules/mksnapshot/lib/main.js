(function() {
  var callMksnapshot, getPathOfMksnapshot, mksnapshot, stripVersion;

  callMksnapshot = require('./mksnapshot-call');

  getPathOfMksnapshot = require('./mksnapshot-path');

  stripVersion = function(version) {
    var versions;
    if (version[0] === 'v') {
      version = version.substr(1);
    }
    versions = version.split('.');
    versions[2] = '0';
    return versions.join('.');
  };

  mksnapshot = function(content, target, version, arch, builddir, callback) {
    version = stripVersion(version);
    return getPathOfMksnapshot(version, arch, builddir, function(error, mksnapshot) {
      if (error) {
        return callback(error);
      }
      return callMksnapshot(mksnapshot, content, target, builddir, callback);
    });
  };

  module.exports = mksnapshot;

}).call(this);
