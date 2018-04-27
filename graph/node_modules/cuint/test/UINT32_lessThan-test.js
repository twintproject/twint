var assert = require('assert')
var UINT32 = require('..').UINT32

describe('lessThan method', function () {

  describe('0<1', function () {

    it('should return true', function (done) {
      var u = UINT32(0).lessThan( UINT32(1) )

      assert( u )
      done()
    })

  })

  describe('1<2', function () {

    it('should return true', function (done) {
      var u = UINT32(1).lessThan( UINT32(2) )

      assert( u )
      done()
    })

  })

  describe('1<2^16', function () {

    it('should return true', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(1).lessThan( UINT32(n) )

      assert( u )
      done()
    })

  })

  describe('2^16<1', function () {

    it('should return false', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).lessThan( UINT32(1) )

      assert( !u )
      done()
    })

  })

})
