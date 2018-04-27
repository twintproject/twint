var assert = require('assert')
var UINT64 = require('..').UINT64

describe('add method', function () {

  describe('0+0', function () {

    it('should return 0', function (done) {
      var u = UINT64(0).add( UINT64(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('0+1', function () {

    it('should return 1', function (done) {
      var u = UINT64(0).add( UINT64(1) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1+0', function () {

    it('should return 0', function (done) {
      var u = UINT64(1).add( UINT64(0) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1+1', function () {

    it('should return 2', function (done) {
      var u = UINT64(1).add( UINT64(1) )

      assert.equal( u.toNumber(), 2 )
      done()
    })

  })

  describe('low bit+high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(123).add( UINT64(n) )

      assert.equal( u.toNumber(), 123 + n )
      done()
    })

  })

  describe('high bit+low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(n).add( UINT64(123) )

      assert.equal( u.toNumber(), 123 + n )
      done()
    })

  })

  describe('high bit+high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT64(n).add( UINT64(n) )

      assert.equal( u.toNumber(), n + n )
      done()
    })

  })

  describe('overflow', function () {

    it('should return n', function (done) {
      var n = 'FFFFFFFF'
      var u = UINT64(n, 16).add( UINT64(n, 16) )

      assert.equal( u.toNumber(), -2 )
      done()
    })

  })

  describe('high bit+high bit 2', function () {

    it('should return n', function (done) {
      var u = UINT64('326648991').add( UINT64('265443576') )

      assert.equal( u.toNumber(), 592092567 )
      done()
    })

  })

  describe('high bit+high bit 3', function () {

    it('should return n', function (done) {
      var u = UINT64('800000000000', 16).add( UINT64('100000000000', 16) )

      assert.equal( u.toString(16), '900000000000' )
      done()
    })

  })

})
