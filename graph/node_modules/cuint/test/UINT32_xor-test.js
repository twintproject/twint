var assert = require('assert')
var UINT32 = require('..').UINT32

describe('xor method', function () {

  describe('0^1', function () {

    it('should return 1', function (done) {
      var u = UINT32(0).xor( UINT32(1) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1^2', function () {

    it('should return 3', function (done) {
      var u = UINT32(1).xor( UINT32(2) )

      assert.equal( u.toNumber(), 3 )
      done()
    })

  })

  describe('1^2^16', function () {

    it('should return n+1', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(1).xor( UINT32(n) )

      assert.equal( u.toNumber(), n+1 )
      done()
    })

  })

  describe('2^16^1', function () {

    it('should return n+1', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).xor( UINT32(1) )

      assert.equal( u.toNumber(), n+1 )
      done()
    })

  })

  describe('2^16^2^16', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).xor( UINT32(n) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

})
