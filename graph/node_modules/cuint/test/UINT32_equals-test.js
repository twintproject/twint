var assert = require('assert')
var UINT32 = require('..').UINT32

describe('equals method', function () {

  describe('0==0', function () {

    it('should return true', function (done) {
      var u = UINT32(0).equals( UINT32(0) )

      assert( u )
      done()
    })

  })

  describe('1==1', function () {

    it('should return true', function (done) {
      var u = UINT32(1).equals( UINT32(1) )

      assert( u )
      done()
    })

  })

  describe('low bit', function () {

    it('should return true', function (done) {
      var u = UINT32(3).equals( UINT32(3) )

      assert( u )
      done()
    })

  })

  describe('high bit', function () {

    it('should return true', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).equals( UINT32(n) )

      assert( u )
      done()
    })

  })

  describe('1!=2', function () {

    it('should return false', function (done) {
      var u = UINT32(1).equals( UINT32(2) )

      assert( !u )
      done()
    })

  })

})
