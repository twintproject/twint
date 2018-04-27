var test = require('tape')
var getHomePath = require('../')

test('returns string', function (t) {
  t.equal(typeof getHomePath(), 'string')
  t.end()
})
