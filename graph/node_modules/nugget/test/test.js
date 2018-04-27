var fs = require('fs')
var http = require('http')
var nugget = require('../')
var path = require('path')
var test = require('tape')

var testServer = http.createServer(function (req, res) {
  res.end('hello')
})

var target = path.join(__dirname, 'resume.html')
if (fs.existsSync(target)) fs.unlinkSync(target)

testServer.listen(0, function () {
  var port = this.address().port
  test('fetches file', function (t) {
    nugget('http://localhost:' + port + '/resume.html', {dir: __dirname, quiet: true}, function (err) {
      if (err) t.ifErr(err)
      t.ok(fs.existsSync(target), 'downloaded file')
      if (fs.existsSync(target)) fs.unlinkSync(target)
      t.end()
    })
  })

  test('has progress events', function (t) {
    var gotProgress = false
    var dl = nugget('http://localhost:' + port + '/resume.html', {dir: __dirname, quiet: true}, function (err) {
      t.notOk(err, 'no error')
      t.ok(gotProgress, 'got progress event')
      t.end()
      testServer.close()
    })
    dl.once('progress', function (data) {
      t.ok(data.hasOwnProperty('percentage'), 'has percentage')
      gotProgress = true
    })
  })
})
