var path = require('path')
var spawn = require('child_process').spawn

var pairSettings = ['version-string']
var singleSettings = ['file-version', 'product-version', 'icon', 'requested-execution-level']
var noPrefixSettings = ['application-manifest']

module.exports = function (exe, options, callback) {
  var rcedit = path.resolve(__dirname, '..', 'bin', 'rcedit.exe')
  var args = [exe]

  pairSettings.forEach(function (name) {
    if (options[name] != null) {
      for (var key in options[name]) {
        var value = options[name][key]
        args.push('--set-' + name)
        args.push(key)
        args.push(value)
      }
    }
  })

  singleSettings.forEach(function (name) {
    if (options[name] != null) {
      args.push('--set-' + name)
      args.push(options[name])
    }
  })

  noPrefixSettings.forEach(function (name) {
    if (options[name] != null) {
      args.push('--' + name)
      args.push(options[name])
    }
  })

  var spawnOptions = {}
  spawnOptions.env = Object.create(process.env)

  if (process.platform !== 'win32') {
    args.unshift(rcedit)
    rcedit = 'wine'
    // Supress fixme: stderr log messages
    spawnOptions.env.WINEDEBUG = '-all'
  }

  var child = spawn(rcedit, args, spawnOptions)
  var stderr = ''
  var error = null

  child.on('error', function (err) {
    if (error == null) error = err
  })

  child.stderr.on('data', function (data) {
    stderr += data
  })

  child.on('close', function (code) {
    if (error != null) {
      callback(error)
    } else if (code === 0) {
      callback()
    } else {
      var message = 'rcedit.exe failed with exit code ' + code
      stderr = stderr.trim()
      if (stderr) message += '. ' + stderr
      callback(new Error(message))
    }
  })
}
