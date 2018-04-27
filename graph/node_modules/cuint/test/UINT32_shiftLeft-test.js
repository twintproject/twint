var assert = require('assert')
var UINT32 = require('..').UINT32

describe('shiftLeft method', function () {

  describe('0<<1', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).shiftLeft(1)

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1<<2', function () {

    it('should return 4', function (done) {
      var u = UINT32(1).shiftLeft(2)

      assert.equal( u.toNumber(), 4 )
      done()
    })

  })

  describe('1<<16', function () {

    it('should return 2^16', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(1).shiftLeft(16)

      assert.equal( u.toNumber(), n )
      done()
    })

  })

  describe('1<<32', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).shiftLeft(32)

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1<<31', function () {

    it('should return 2^31', function (done) {
      var u = UINT32(1).shiftLeft(31)

      assert.equal( u.toString(16), '80000000' )
      done()
    })

  })

  describe('9<<28', function () {

    it('should return 2^31', function (done) {
      var u = UINT32(9).shiftLeft(28)

      assert.equal( u.toString(16), '90000000' )
      done()
    })

  })

})
