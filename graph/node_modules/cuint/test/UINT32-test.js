var assert = require('assert')
var UINT32 = require('..').UINT32

describe('UINT32 constructor', function () {

  describe('with no parameters', function () {

    it('should properly initialize', function (done) {
      var u = UINT32()

      assert.equal( u._low, 0 )
      assert.equal( u._high, 0 )
      done()
    })

  })

  describe('with low and high bits', function () {

    describe('0, 0', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(0, 0)

        assert.equal( u._low, 0 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('1, 0', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(1, 0)

        assert.equal( u._low, 1 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('0, 1', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(0, 1)

        assert.equal( u._low, 0 )
        assert.equal( u._high, 1 )
        done()
      })
    })

    describe('3, 5', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(3, 5)

        assert.equal( u._low, 3 )
        assert.equal( u._high, 5 )
        done()
      })
    })

  })

  describe('with number', function () {

    describe('0', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(0)

        assert.equal( u._low, 0 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('1', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(1)

        assert.equal( u._low, 1 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('3', function () {
      it('should properly initialize', function (done) {
        var u = UINT32(3)

        assert.equal( u._low, 3 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('with high bit', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( Math.pow(2,17)+123 )

        assert.equal( u._low, 123 )
        assert.equal( u._high, 2 )
        done()
      })
    })

  })

  describe('with string', function () {

    describe('"0"', function () {
      it('should properly initialize', function (done) {
        var u = UINT32('0')

        assert.equal( u._low, 0 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('"1"', function () {
      it('should properly initialize', function (done) {
        var u = UINT32('1')

        assert.equal( u._low, 1 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('10', function () {
      it('should properly initialize', function (done) {
        var u = UINT32('10')

        assert.equal( u._low, 10 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('with high bit', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '' + (Math.pow(2,17)+123) )

        assert.equal( u._low, 123 )
        assert.equal( u._high, 2 )
        done()
      })
    })

    describe('with radix 10', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '123', 10 )

        assert.equal( u._low, 123 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('with radix 2', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '1111011', 2 )

        assert.equal( u._low, 123 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '7B', 16 )

        assert.equal( u._low, 123 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('8000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '8000', 16 )

        assert.equal( u._low, 32768 )
        assert.equal( u._high, 0 )
        done()
      })
    })

    describe('80000000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( '80000000', 16 )

        assert.equal( u._low, 0 )
        assert.equal( u._high, 32768 )
        done()
      })
    })

    describe('maximum unsigned 32 bits value in base 2', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( Array(33).join('1'), 2 )

        assert.equal( u._low, 65535 )
        assert.equal( u._high, 65535 )
        done()
      })
    })

    describe('maximum unsigned 32 bits value in base 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT32( Array(9).join('F'), 16 )

        assert.equal( u._low, 65535 )
        assert.equal( u._high, 65535 )
        done()
      })
    })

  })

})
