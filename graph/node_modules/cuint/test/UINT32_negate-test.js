var assert = require('assert')
var UINT32 = require('..').UINT32

describe('negate method', function () {

  describe('0', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).negate()

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1', function () {

    it('should return -1', function (done) {
      var u = UINT32(1).negate()

      assert.equal( u.toNumber(), -1 )
      done()
    })

  })

  describe('low bit', function () {

    it('should return -n', function (done) {
      var u = UINT32(3).negate()

      assert.equal( u.toNumber(), -3 )
      done()
    })

  })

  describe('high bit', function () {

    it('should return -n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).negate()

      assert.equal( u.toNumber(), -n )
      done()
    })

  })

})
