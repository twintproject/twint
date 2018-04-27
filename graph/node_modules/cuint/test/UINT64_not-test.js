var assert = require('assert')
var UINT64 = require('..').UINT64

describe('not method', function () {

  describe('0', function () {

    it('should return 2^64-1', function (done) {
      var u = UINT64(0).not()

      assert.equal( u.toString(16), 'ffffffffffffffff' )
      done()
    })

  })

  describe('1', function () {

    it('should return 2^64-2', function (done) {
      var u = UINT64(1).not()

      assert.equal( u.toString(16), 'fffffffffffffffe' )
      done()
    })

  })

  describe('2^63', function() {
    var u = UINT64(0xFFFF, 0xFFFF, 0xFFFF, 0x7FFF).not()

    assert.equal( u.toString(16), '8000000000000000')
  })

  describe('all bits set', function () {

    it('should return 0', function (done) {
      var u = UINT64(0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF).not()

      assert.equal( u.toString(), '0' )
      done()
    })

  })

})
