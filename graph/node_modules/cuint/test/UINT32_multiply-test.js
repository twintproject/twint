var assert = require('assert')
var UINT32 = require('..').UINT32

describe('multiply method', function () {

  describe('0*0', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).multiply( UINT32(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1*0', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).multiply( UINT32(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('0*1', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).multiply( UINT32(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('low bit*high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(3).multiply( UINT32(n) )

      assert.equal( u.toNumber(), 3*n )
      done()
    })

  })

  describe('high bit*low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).multiply( UINT32(3) )

      assert.equal( u.toNumber(), 3*n )
      done()
    })

  })

  describe('high bit*high bit', function () {

    it('should return n', function (done) {
      var n = 'FFFFFFFF'
      var u = UINT32(n, 16).multiply( UINT32(n, 16) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

})
