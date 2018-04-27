var assert = require('assert')
var UINT32 = require('..').UINT32

describe('shiftRight method', function () {

  describe('0>>1', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).shiftRight(1)

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('4>>2', function () {

    it('should return 1', function (done) {
      var u = UINT32(4).shiftRight(2)

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('2^16>>16', function () {

    it('should return 1', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).shiftRight(16)

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1>>32', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).shiftRight(32)

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('2^31>>31', function () {

    it('should return 1', function (done) {
      var u = UINT32('80000000', 16).shiftRight(31)

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('2^28>>28', function () {

    it('should return 1', function (done) {
      var u = UINT32('10000000', 16).shiftRight(28)

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('2^31+2^28>>31', function () {

    it('should return 1', function (done) {
      var u = UINT32('90000000', 16).shiftRight(31)

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('2^31+2^28>>28', function () {

    it('should return 9', function (done) {
      var u = UINT32('90000000', 16).shiftRight(28)

      assert.equal( u.toNumber(), 9 )
      done()
    })

  })

})
