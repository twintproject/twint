var assert = require('assert')
var UINT32 = require('..').UINT32

describe('and method', function () {

  describe('0&1', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).and( UINT32(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1&2', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).and( UINT32(2) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1&2^16', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(1).and( UINT32(n) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('2^16&1', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).and( UINT32(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('2^16&2^16', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT32(n).and( UINT32(n) )

      assert.equal( u.toNumber(), n )
      done()
    })

  })

})
