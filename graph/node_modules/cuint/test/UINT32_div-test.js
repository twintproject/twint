var assert = require('assert')
var UINT32 = require('..').UINT32

describe('div method', function () {

  describe('1/0', function () {

    it('should throw', function (done) {
      assert.throws(
          function () {
            UINT32(1).div( UINT32(0) )
          }
        , function (err) {
            if (err instanceof Error) return true
          }
        )


      done()
    })

  })

  describe('0/1', function () {

    it('should return 0', function (done) {
      var u = UINT32(2).div( UINT32(1) )

      assert.equal( u.toNumber(), 2 )
      done()
    })

  })

  describe('2/1', function () {

    it('should return 2', function (done) {
      var u = UINT32(0).div( UINT32(1) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('1/2', function () {

    it('should return 0', function (done) {
      var u = UINT32(1).div( UINT32(2) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('low bit/high bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(3).div( UINT32(n) )

      assert.equal( u.toNumber(), 0 )
      done()
    })

  })

  describe('high bit/low bit', function () {

    it('should return n', function (done) {
      var n = Math.pow(2, 17)
      var u = UINT32(n).div( UINT32(3) )

      assert.equal( u.toNumber(), (n/3)|0 )
      assert.equal( u.remainder.toNumber(), 2 )
      done()
    })

  })

  describe('high bit/high bit', function () {

    it('should return n', function (done) {
      var n = 'FFFFFFFF'
      var u = UINT32(n, 16).div( UINT32(n, 16) )

      assert.equal( u.toNumber(), 1 )
      done()
    })

  })

  describe('high bit/high bit 2', function () {

    it('should return n', function (done) {
      var u = UINT32('3266489917').div( UINT32('668265263') )

      assert.equal( u.toNumber(), 4 )
      done()
    })

  })

  describe('374761393/(16^3)', function () {
    it('should return 91494', function (done) {
      var u = UINT32('374761393').div( UINT32(16*16*16) )

      assert.equal( u.toNumber(), 91494 )
      done()
    })
  })

})
