var assert = require('assert')
var UINT64 = require('..').UINT64

describe('toNumber method', function () {

  describe('from 0', function () {

    it('should return 0', function (done) {
      var u = UINT64(0).toNumber()

      assert.equal( u, 0 )
      done()
    })

  })

  describe('from low bit number', function () {

    it('should return the number', function (done) {
      var u = UINT64(123).toNumber()

      assert.equal( u, 123 )
      done()
    })

  })

  describe('from high bit number', function () {

    it('should return the number', function (done) {
      var n = Math.pow(2,17)
      var u = UINT64(n).toNumber()

      assert.equal( u, n )
      done()
    })

  })

  describe('from high and low bit number', function () {

    it('should return the number', function (done) {
      var n = Math.pow(2,17) + 123
      var u = UINT64(n).toNumber()

      assert.equal( u, n )
      done()
    })

  })

  describe('toNumber and toString', function () {

    it('should return the same result for 100 random numbers', function () {
      for (var i=0; i<100; i++) {
        var u = UINT64(Math.floor(Math.random() * 0xffffffff), 0);
        assert.equal(u.toNumber(), parseInt(u.toString()));
      }
    })

  })

})
