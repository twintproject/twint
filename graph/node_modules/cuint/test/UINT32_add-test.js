var assert = require('assert')
var UINT32 = require('..').UINT32

describe('add method', function () {

  describe('0+0', function () {

    it('should return 0', function (done) {
      var u = UINT32(0).add( UINT32(0) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('0+1', function () {

    it('should return 1', function (done) {
      var u = UINT32(0).add( UINT32(1) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1+0', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).add( UINT32(0) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('1+1', function () {

    it('should return 2', function (done) {
      var u = UINT32(1).add( UINT32(1) )

      assert.equal( u.toNumber(), 2 )
      done()
    })

  })

  describe('low bit+high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(123).add( UINT32(n) )

      assert.equal( u.toNumber(), 123 + n )
      done()
    })

  })

  describe('high bit+low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).add( UINT32(123) )

      assert.equal( u.toNumber(), 123 + n )
      done()
    })

  })

  describe('high bit+high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).add( UINT32(n) )

      assert.equal( u.toNumber(), n + n )
      done()
    })

  })

  describe('overflow', function () {

    it('should return n', function (done) {
      var n = 'FFFFFFFF'
      var u = UINT32(n, 16).add( UINT32(n, 16) )

      assert.equal( u.toNumber(), -2 )
      done()
    })

  })

  describe('high bit+high bit 2', function () {

    it('should return n', function (done) {
      var u = UINT32('326648991').add( UINT32('265443576') )

      assert.equal( u.toNumber(), 592092567 )
      done()
    })

  })

})
