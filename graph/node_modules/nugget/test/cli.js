var fs = require('fs')
var path = require('path')
var spawn = require('tape-spawn')
var test = require('tape')

test('usage', function (t) {
  var child = spawn(t, path.join(__dirname, '..', 'bin.js'))
  child.stdout.match(fs.readFileSync(path.join(__dirname, '..', 'usage.txt')).toString() + '\n')
  child.stderr.empty()
  child.end()
})
