var assert = require('assert')
var UINT32 = require('..').UINT32

describe('toString method', function () {

  describe('from 0', function () {

    it('should return "0"', function (done) {
      var u = UINT32(0).toString()

      assert.equal( u, '0' )
      done()
    })

  })

  describe('from low bit number', function () {

    it('should return the number', function (done) {
      var u = UINT32(123).toString()

      assert.equal( u, '123' )
      done()
    })

  })

  describe('from high bit number', function () {

    it('should return the number', function (done) {
      var n = Math.pow(2,17)
      var u = UINT32(n).toString()

      assert.equal( u, ''+n )
      done()
    })

  })

  describe('from high and low bit number', function () {

    it('should return the number', function (done) {
      var n = Math.pow(2,17) + 123
      var u = UINT32(n).toString()

      assert.equal( u, ''+n )
      done()
    })

  })

  describe('< radix', function () {

    it('should return the number', function (done) {
      var u = UINT32(4).toString()

      assert.equal( u, '4' )
      done()
    })

  })

  describe('= radix', function () {

    it('should return the number', function (done) {
      var u = UINT32(2).toString(2)

      assert.equal( u, '10' )
      done()
    })

  })

})
