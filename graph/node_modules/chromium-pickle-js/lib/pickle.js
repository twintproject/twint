// sizeof(T).
var SIZE_INT32 = 4
var SIZE_UINT32 = 4
var SIZE_INT64 = 8
var SIZE_UINT64 = 8
var SIZE_FLOAT = 4
var SIZE_DOUBLE = 8

// The allocation granularity of the payload.
var PAYLOAD_UNIT = 64

// Largest JS number.
var CAPACITY_READ_ONLY = 9007199254740992

// Aligns 'i' by rounding it up to the next multiple of 'alignment'.
var alignInt = function (i, alignment) {
  return i + (alignment - (i % alignment)) % alignment
}

// PickleIterator reads data from a Pickle. The Pickle object must remain valid
// while the PickleIterator object is in use.
var PickleIterator = (function () {
  function PickleIterator (pickle) {
    this.payload = pickle.header
    this.payloadOffset = pickle.headerSize
    this.readIndex = 0
    this.endIndex = pickle.getPayloadSize()
  }

  PickleIterator.prototype.readBool = function () {
    return this.readInt() !== 0
  }

  PickleIterator.prototype.readInt = function () {
    return this.readBytes(SIZE_INT32, Buffer.prototype.readInt32LE)
  }

  PickleIterator.prototype.readUInt32 = function () {
    return this.readBytes(SIZE_UINT32, Buffer.prototype.readUInt32LE)
  }

  PickleIterator.prototype.readInt64 = function () {
    return this.readBytes(SIZE_INT64, Buffer.prototype.readInt64LE)
  }

  PickleIterator.prototype.readUInt64 = function () {
    return this.readBytes(SIZE_UINT64, Buffer.prototype.readUInt64LE)
  }

  PickleIterator.prototype.readFloat = function () {
    return this.readBytes(SIZE_FLOAT, Buffer.prototype.readFloatLE)
  }

  PickleIterator.prototype.readDouble = function () {
    return this.readBytes(SIZE_DOUBLE, Buffer.prototype.readDoubleLE)
  }

  PickleIterator.prototype.readString = function () {
    return this.readBytes(this.readInt()).toString()
  }

  PickleIterator.prototype.readBytes = function (length, method) {
    var readPayloadOffset = this.getReadPayloadOffsetAndAdvance(length)
    if (method != null) {
      return method.call(this.payload, readPayloadOffset, length)
    } else {
      return this.payload.slice(readPayloadOffset, readPayloadOffset + length)
    }
  }

  PickleIterator.prototype.getReadPayloadOffsetAndAdvance = function (length) {
    if (length > this.endIndex - this.readIndex) {
      this.readIndex = this.endIndex
      throw new Error('Failed to read data with length of ' + length)
    }
    var readPayloadOffset = this.payloadOffset + this.readIndex
    this.advance(length)
    return readPayloadOffset
  }

  PickleIterator.prototype.advance = function (size) {
    var alignedSize = alignInt(size, SIZE_UINT32)
    if (this.endIndex - this.readIndex < alignedSize) {
      this.readIndex = this.endIndex
    } else {
      this.readIndex += alignedSize
    }
  }

  return PickleIterator
})()

// This class provides facilities for basic binary value packing and unpacking.
//
// The Pickle class supports appending primitive values (ints, strings, etc.)
// to a pickle instance.  The Pickle instance grows its internal memory buffer
// dynamically to hold the sequence of primitive values.   The internal memory
// buffer is exposed as the "data" of the Pickle.  This "data" can be passed
// to a Pickle object to initialize it for reading.
//
// When reading from a Pickle object, it is important for the consumer to know
// what value types to read and in what order to read them as the Pickle does
// not keep track of the type of data written to it.
//
// The Pickle's data has a header which contains the size of the Pickle's
// payload.  It can optionally support additional space in the header.  That
// space is controlled by the header_size parameter passed to the Pickle
// constructor.
var Pickle = (function () {
  function Pickle (buffer) {
    if (buffer) {
      this.initFromBuffer(buffer)
    } else {
      this.initEmpty()
    }
  }

  Pickle.prototype.initEmpty = function () {
    this.header = new Buffer(0)
    this.headerSize = SIZE_UINT32
    this.capacityAfterHeader = 0
    this.writeOffset = 0
    this.resize(PAYLOAD_UNIT)
    this.setPayloadSize(0)
  }

  Pickle.prototype.initFromBuffer = function (buffer) {
    this.header = buffer
    this.headerSize = buffer.length - this.getPayloadSize()
    this.capacityAfterHeader = CAPACITY_READ_ONLY
    this.writeOffset = 0
    if (this.headerSize > buffer.length) {
      this.headerSize = 0
    }
    if (this.headerSize !== alignInt(this.headerSize, SIZE_UINT32)) {
      this.headerSize = 0
    }
    if (this.headerSize === 0) {
      this.header = new Buffer(0)
    }
  }

  Pickle.prototype.createIterator = function () {
    return new PickleIterator(this)
  }

  Pickle.prototype.toBuffer = function () {
    return this.header.slice(0, this.headerSize + this.getPayloadSize())
  }

  Pickle.prototype.writeBool = function (value) {
    return this.writeInt(value ? 1 : 0)
  }

  Pickle.prototype.writeInt = function (value) {
    return this.writeBytes(value, SIZE_INT32, Buffer.prototype.writeInt32LE)
  }

  Pickle.prototype.writeUInt32 = function (value) {
    return this.writeBytes(value, SIZE_UINT32, Buffer.prototype.writeUInt32LE)
  }

  Pickle.prototype.writeInt64 = function (value) {
    return this.writeBytes(value, SIZE_INT64, Buffer.prototype.writeInt64LE)
  }

  Pickle.prototype.writeUInt64 = function (value) {
    return this.writeBytes(value, SIZE_UINT64, Buffer.prototype.writeUInt64LE)
  }

  Pickle.prototype.writeFloat = function (value) {
    return this.writeBytes(value, SIZE_FLOAT, Buffer.prototype.writeFloatLE)
  }

  Pickle.prototype.writeDouble = function (value) {
    return this.writeBytes(value, SIZE_DOUBLE, Buffer.prototype.writeDoubleLE)
  }

  Pickle.prototype.writeString = function (value) {
    var length = Buffer.byteLength(value, 'utf8')
    if (!this.writeInt(length)) {
      return false
    }
    return this.writeBytes(value, length)
  }

  Pickle.prototype.setPayloadSize = function (payloadSize) {
    return this.header.writeUInt32LE(payloadSize, 0)
  }

  Pickle.prototype.getPayloadSize = function () {
    return this.header.readUInt32LE(0)
  }

  Pickle.prototype.writeBytes = function (data, length, method) {
    var dataLength = alignInt(length, SIZE_UINT32)
    var newSize = this.writeOffset + dataLength
    if (newSize > this.capacityAfterHeader) {
      this.resize(Math.max(this.capacityAfterHeader * 2, newSize))
    }
    if (method != null) {
      method.call(this.header, data, this.headerSize + this.writeOffset)
    } else {
      this.header.write(data, this.headerSize + this.writeOffset, length)
    }
    var endOffset = this.headerSize + this.writeOffset + length
    this.header.fill(0, endOffset, endOffset + dataLength - length)
    this.setPayloadSize(newSize)
    this.writeOffset = newSize
    return true
  }

  Pickle.prototype.resize = function (newCapacity) {
    newCapacity = alignInt(newCapacity, PAYLOAD_UNIT)
    this.header = Buffer.concat([this.header, new Buffer(newCapacity)])
    this.capacityAfterHeader = newCapacity
  }

  return Pickle
})()

module.exports = Pickle
