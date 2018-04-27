# chromium-pickle-js [![Build Status](https://travis-ci.org/electron/node-chromium-pickle-js.svg?branch=master)](https://travis-ci.org/electron/node-chromium-pickle-js)

This module ports Chromium's `Pickle` class to Node, see `Pickle`'s header for
introduction:

> This class provides facilities for basic binary value packing and unpacking.
>
> The Pickle class supports appending primitive values (ints, strings, etc.)
> to a pickle instance.  The Pickle instance grows its internal memory buffer
> dynamically to hold the sequence of primitive values.   The internal memory
> buffer is exposed as the "data" of the Pickle.  This "data" can be passed
> to a Pickle object to initialize it for reading.
>
> When reading from a Pickle object, it is important for the consumer to know
> what value types to read and in what order to read them as the Pickle does
> not keep track of the type of data written to it.
>
> The Pickle's data has a header which contains the size of the Pickle's
> payload.  It can optionally support additional space in the header.  That
> space is controlled by the header_size parameter passed to the Pickle
> constructor.

## Install

```bash
$ npm install chromium-pickle-js
```

## Usage

### createEmpty()

Returns an empty `Pickle` object.

### createFromBuffer(buffer)

* `buffer` Buffer

Returns a `Pickle` object that initialized from a `buffer`. The data is not
copied so you have to ensure the `buffer` lives when using the Pickle object,
and you should never modify the Pickle object created this way.

### Pickle.createIterator()

Returns a `PickleIterator` object that can be used to read data from this
`Pickle` object.

### Pickle.toBuffer()

Returns a `Buffer` object that contains this `Pickle` object's data.

### Pickle.writeBool(value)

Writes `value` to `Pickle` object as `bool`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeInt(value)

Writes `value` to `Pickle` object as `int`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeUInt32(value)

Writes `value` to `Pickle` object as `uint32`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeInt64(value)

Writes `value` to `Pickle` object as `int64`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeUInt64(value)

Writes `value` to `Pickle` object as `uint64`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeFloat(value)

Writes `value` to `Pickle` object as `float`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeDouble(value)

Writes `value` to `Pickle` object as `Double`. Returns `true` when succeeded and
returns `false` when failed.

### Pickle.writeString(str)

* `str` String

Writes `str` to `Pickle` object. Returns `true` when succeeded and returns
`false` when failed.

### PickleIterator.readBool()

Returns current value as `bool` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readInt()

Returns current value as `int` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readUInt32()

Returns current value as `uint32` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readInt64()

Returns current value as `int64` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readUInt64()

Returns current value as `uint64` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readFloat()

Returns current value as `float` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readDouble()

Returns current value as `double` and seeks to next data. A`TypeError` exception
would be thrown when failed.

### PickleIterator.readString()

Returns current value as `String` and seeks to next data. A`TypeError` exception
would be thrown when failed.
