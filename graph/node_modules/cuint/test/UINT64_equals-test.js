var assert = require('assert')
var UINT64 = require('..').UINT64

describe('equals method', function () {

  describe('0==0', function () {

    it('should return true', function (done) {
      var u = UINT64(0).equals( UINT64(0) )

      assert( u )
      done()
    })

  })

  describe('1==1', function () {

    it('should return true', function (done) {
      var u = UINT64(1).equals( UINT64(1) )

      assert( u )
      done()
    })

  })

  describe('low bit', function () {

    it('should return true', function (done) {
      var u = UINT64(3).equals( UINT64(3) )

      assert( u )
      done()
    })

  })

  describe('high bit', function () {

    it('should return true', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(n).equals( UINT64(n) )

      assert( u )
      done()
    })

  })

  describe('1!=2', function () {

    it('should return false', function (done) {
      var u = UINT64(1).equals( UINT64(2) )

      assert( !u )
      done()
    })

  })

})
