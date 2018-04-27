var assert = require('assert')
var UINT32 = require('..').UINT32

describe('not method', function () {

  describe('0', function () {

    it('should return 2^32-1', function (done) {
      var u = UINT32(0).not()

      assert.equal( u.toString(16), 'ffffffff' )
      done()
    })

  })

  describe('1', function () {

    it('should return 2^32-2', function (done) {
      var u = UINT32(1).not()

      assert.equal( u.toString(16), 'fffffffe' )
      done()
    })

  })

  describe('2^31', function() {
    var u = UINT32(0x7FFFFFFF).not()

    assert.equal( u.toString(16), '80000000')
  })

  describe('all bits set', function () {

    it('should return 0', function (done) {
      var u = UINT32(0xFFFFFFFF).not()

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

})
