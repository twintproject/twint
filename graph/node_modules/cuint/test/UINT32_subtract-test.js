var assert = require('assert')
var UINT32 = require('..').UINT32

describe('subtract method', function () {

  describe('0-0', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).subtract( UINT32(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1-0', function () {

    it('should return 1', function (done) {
      var u = UINT32(1).subtract( UINT32(0) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('0-1', function () {

    it('should return -1', function (done) {
      var u = UINT32(0).subtract( UINT32(1) )

      assert.equal( u.toNumber(), -1 )
      done()
    })

  })

  describe('low bit-high bit', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(1).subtract( UINT32(n) )

      assert.equal( u.toNumber(), 1-n )
      done()
    })

  })

  describe('high bit-low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).subtract( UINT32(123) )

      assert.equal( u.toNumber(), n - 123 )
      done()
    })

  })

  describe('high bit-high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n+1).subtract( UINT32(n) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

})
