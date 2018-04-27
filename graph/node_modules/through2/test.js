const test     = require('tape')
    , through2 = require('./')
    , crypto   = require('crypto')
    , bl       = require('bl')
    , spigot   = require('stream-spigot')

test('plain through', function (t) {
  var th2 = through2(function (chunk, enc, callback) {
    if (!this._i)
      this._i = 97 // 'a'
    else
      this._i++
    var b = new Buffer(chunk.length)
    for (var i = 0; i < chunk.length; i++)
      b[i] = this._i
    this.push(b)
    callback()
  })

  th2.pipe(bl(function (err, b) {
    var s = b.toString('ascii')
    t.equal('aaaaaaaaaabbbbbcccccccccc', s, 'got transformed string')
    t.end()
  }))

  th2.write(crypto.randomBytes(10))
  th2.write(crypto.randomBytes(5))
  th2.write(crypto.randomBytes(10))
  th2.end()
})

test('pipeable through', function (t) {
  var th2 = through2(function (chunk, enc, callback) {
    if (!this._i)
      this._i = 97 // 'a'
    else
      this._i++
    var b = new Buffer(chunk.length)
    for (var i = 0; i < chunk.length; i++)
      b[i] = this._i
    this.push(b)
    callback()
  })

  th2.pipe(bl(function (err, b) {
    var s = b.toString('ascii')
    // bl() acts like a proper streams2 stream and passes as much as it's
    // asked for, so we really only get one write with such a small amount
    // of data
    t.equal(s, 'aaaaaaaaaaaaaaaaaaaaaaaaa', 'got transformed string')
    t.end()
  }))

  var bufs = bl()
  bufs.append(crypto.randomBytes(10))
  bufs.append(crypto.randomBytes(5))
  bufs.append(crypto.randomBytes(10))
  bufs.pipe(th2)
})

test('object through', function (t) {
  t.plan(3)

  var th2 = through2({ objectMode: true}, function (chunk, enc, callback) {
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})

test('flushing through', function (t) {
  var th2 = through2(function (chunk, enc, callback) {
    if (!this._i)
      this._i = 97 // 'a'
    else
      this._i++
    var b = new Buffer(chunk.length)
    for (var i = 0; i < chunk.length; i++)
      b[i] = this._i
    this.push(b)
    callback()
  }, function (callback) {
    this.push(new Buffer([ 101, 110, 100 ]))
    callback()
  })

  th2.pipe(bl(function (err, b) {
    var s = b.toString('ascii')
    t.equal(s, 'aaaaaaaaaabbbbbccccccccccend', 'got transformed string')
    t.end()
  }))

  th2.write(crypto.randomBytes(10))
  th2.write(crypto.randomBytes(5))
  th2.write(crypto.randomBytes(10))
  th2.end()
})

test('plain through ctor', function (t) {
  var Th2 = through2.ctor(function (chunk, enc, callback) {
    if (!this._i)
      this._i = 97 // 'a'
    else
      this._i++
    var b = new Buffer(chunk.length)
    for (var i = 0; i < chunk.length; i++)
      b[i] = this._i
    this.push(b)
    callback()
  })

  var th2 = new Th2()

  th2.pipe(bl(function (err, b) {
    var s = b.toString('ascii')
    t.equal('aaaaaaaaaabbbbbcccccccccc', s, 'got transformed string')
    t.end()
  }))

  th2.write(crypto.randomBytes(10))
  th2.write(crypto.randomBytes(5))
  th2.write(crypto.randomBytes(10))
  th2.end()
})

test('reuse through ctor', function (t) {
  t.plan(4)

  var Th2 = through2.ctor(function (chunk, enc, callback) {
    if (!this._i) {
      t.ok(1, 'did not contain previous instance data (this._i)')
      this._i = 97 // 'a'
    } else
      this._i++
    var b = new Buffer(chunk.length)
    for (var i = 0; i < chunk.length; i++)
      b[i] = this._i
    this.push(b)
    callback()
  })

  var th2 = Th2()

  th2.pipe(bl(function (err, b) {
    var s = b.toString('ascii')
    t.equal('aaaaaaaaaabbbbbcccccccccc', s, 'got transformed string')

    var newInstance = Th2()
    newInstance.pipe(bl(function (err, b) {
      var s = b.toString('ascii')
      t.equal('aaaaaaabbbbccccccc', s, 'got transformed string')
    }))

    newInstance.write(crypto.randomBytes(7))
    newInstance.write(crypto.randomBytes(4))
    newInstance.write(crypto.randomBytes(7))
    newInstance.end()
  }))

  th2.write(crypto.randomBytes(10))
  th2.write(crypto.randomBytes(5))
  th2.write(crypto.randomBytes(10))
  th2.end()
})

test('object through ctor', function (t) {
  t.plan(3)

  var Th2 = through2.ctor({ objectMode: true}, function (chunk, enc, callback) {
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var th2 = new Th2()

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})

test('pipeable object through ctor', function (t) {
  t.plan(4)

  var Th2 = through2.ctor({ objectMode: true}, function (record, enc, callback) {
    if (record.temp != null && record.unit == 'F') {
      record.temp = ( ( record.temp - 32 ) * 5 ) / 9
      record.unit = 'C'
    }
    this.push(record)
    callback()
  })

  var th2 = Th2()

  var expect = [-19, -40, 100, 22]
  th2.on('data', function (o) {
    t.deepEqual(o, { temp: expect.shift(), unit: 'C' }, 'got transformed object')
  })

  spigot({objectMode: true}, [
    {temp: -2.2, unit: 'F'},
    {temp: -40, unit: 'F'},
    {temp: 212, unit: 'F'},
    {temp: 22, unit: 'C'}
  ]).pipe(th2)
})

test('object through ctor override', function (t) {
  t.plan(3)

  var Th2 = through2.ctor(function (chunk, enc, callback) {
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var th2 = Th2({objectMode: true})

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})

test('object settings available in transform', function (t) {
  t.plan(6)

  var Th2 = through2.ctor({objectMode: true, peek: true}, function (chunk, enc, callback) {
    t.ok(this.options.peek, "reading options from inside _transform")
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var th2 = Th2()

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})

test('object settings available in transform override', function (t) {
  t.plan(6)

  var Th2 = through2.ctor(function (chunk, enc, callback) {
    t.ok(this.options.peek, "reading options from inside _transform")
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var th2 = Th2({objectMode: true, peek: true})

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})

test('object override extends options', function (t) {
  t.plan(6)

  var Th2 = through2.ctor({objectMode: true}, function (chunk, enc, callback) {
    t.ok(this.options.peek, "reading options from inside _transform")
    this.push({ out: chunk.in + 1 })
    callback()
  })

  var th2 = Th2({peek: true})

  var e = 0
  th2.on('data', function (o) {
    t.deepEqual(o, { out: e === 0 ? 102 : e == 1 ? 203 : -99 }, 'got transformed object')
    e++
  })

  th2.write({ in: 101 })
  th2.write({ in: 202 })
  th2.write({ in: -100 })
  th2.end()
})