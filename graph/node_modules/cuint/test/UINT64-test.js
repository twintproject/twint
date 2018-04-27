var assert = require('assert')
var UINT64 = require('..').UINT64

describe('UINT64 constructor', function () {

  describe('with no parameters', function () {

    it('should properly initialize', function (done) {
      var u = UINT64()

      assert.equal( u._a00, 0 )
      assert.equal( u._a16, 0 )
      assert.equal( u._a32, 0 )
      assert.equal( u._a48, 0 )
      done()
    })

  })

  describe('with low and high bits', function () {

    describe('0, 0', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(0, 0)

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('1, 0', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(1, 0)

        assert.equal( u._a00, 1 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('0, 1', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(0, 1)

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 1 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('3, 5', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(3, 5)

        assert.equal( u._a00, 3 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 5 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

  })

  describe('with number', function () {

    describe('0', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(0)

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('1', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(1)

        assert.equal( u._a00, 1 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('3', function () {
      it('should properly initialize', function (done) {
        var u = UINT64(3)

        assert.equal( u._a00, 3 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('with high bit', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( Math.pow(2,17)+123 )

        assert.equal( u._a00, 123 )
        assert.equal( u._a16, 2 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

  })

  describe('with string', function () {

    describe('"0"', function () {
      it('should properly initialize', function (done) {
        var u = UINT64('0')

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('"1"', function () {
      it('should properly initialize', function (done) {
        var u = UINT64('1')

        assert.equal( u._a00, 1 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('10', function () {
      it('should properly initialize', function (done) {
        var u = UINT64('10')

        assert.equal( u._a00, 10 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('with high bit', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '' + (Math.pow(2,17)+123) )

        assert.equal( u._a00, 123 )
        assert.equal( u._a16, 2 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('with radix 10', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '123', 10 )

        assert.equal( u._a00, 123 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('with radix 2', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '1111011', 2 )

        assert.equal( u._a00, 123 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '7B', 16 )

        assert.equal( u._a00, 123 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('8000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '8000', 16 )

        assert.equal( u._a00, 32768 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('80000000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '80000000', 16 )

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 32768 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('800000000000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '800000000000', 16 )

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 32768 )
        assert.equal( u._a48, 0 )
        done()
      })
    })

    describe('8000000000000000 with radix 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( '8000000000000000', 16 )

        assert.equal( u._a00, 0 )
        assert.equal( u._a16, 0 )
        assert.equal( u._a32, 0 )
        assert.equal( u._a48, 32768 )
        done()
      })
    })

    describe('maximum unsigned 64 bits value in base 2', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( Array(65).join('1'), 2 )

        assert.equal( u._a00, 65535 )
        assert.equal( u._a16, 65535 )
        assert.equal( u._a32, 65535 )
        assert.equal( u._a48, 65535 )
        done()
      })
    })

    describe('maximum unsigned 64 bits value in base 16', function () {
      it('should properly initialize', function (done) {
        var u = UINT64( Array(17).join('F'), 16 )

        assert.equal( u._a00, 65535 )
        assert.equal( u._a16, 65535 )
        assert.equal( u._a32, 65535 )
        assert.equal( u._a48, 65535 )
        done()
      })
    })

  })

})
