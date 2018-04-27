var assert = require('assert')
var UINT64 = require('..').UINT64

describe('multiply method', function () {

  describe('0*0', function () {

    it('should return 0', function (done) {
      var u = UINT64(0).multiply( UINT64(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1*0', function () {

    it('should return 0', function (done) {
      var u = UINT64(1).multiply( UINT64(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('0*1', function () {

    it('should return 0', function (done) {
      var u = UINT64(0).multiply( UINT64(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('low bit*high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(3).multiply( UINT64(n) )

      assert.equal( u.toNumber(), 3*n )
      done()
    })

  })

  describe('high bit*low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(n).multiply( UINT64(3) )

      assert.equal( u.toNumber(), 3*n )
      done()
    })

  })

  describe('high bit*high bit', function () {

    it('should return n', function (done) {
      var n = 'FFFFFFFF'
      var u = UINT64(n, 16).multiply( UINT64(n, 16) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

})
