var assert = require('assert')
var UINT64 = require('..').UINT64

describe('and method', function () {

  describe('0&1', function () {

    it('should return 0', function (done) {
      var u = UINT64(0).and( UINT64(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1&2', function () {

    it('should return 0', function (done) {
      var u = UINT64(1).and( UINT64(2) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1&2^16', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT64(1).and( UINT64(n) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('2^16&1', function () {

    it('should return 0', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT64(n).and( UINT64(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('2^16&2^16', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 16)
      var u = UINT64(n).and( UINT64(n) )

      assert.equal( u.toNumber(), n )
      done()
    })

  })

})
