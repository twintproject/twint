# C-like unsigned integers for Javascript

## Synopsis

Javascript does not natively support handling of unsigned 32 or 64 bits integers. This library provides that functionality, following C behaviour, enabling the writing of algorithms that depend on it. It was designed with performance in mind and tries its best to be as fast as possible. Any improvement is welcome!


## How it works

An unsigned 32 bits integer is represented by an object with its first 16 bits (low bits) and its 16 last ones (high bits). All the supported standard operations on the unsigned integer are then performed transparently.

	e.g.
	10000010000100000100010000100010 (2182104098 or 0x82104422) is represented by:
	high=1000001000010000
	low= 0100010000100010

NB.
In case of overflow, the unsigned integer is _truncated_ to its lowest 32 bits (in case of UINT32) or 64  bits (in case of UINT64).

The same applies to 64 bits integers, which are split into 4 16 bits ones.

## Installation

In nodejs:

    npm install cuint

In the browser, include the following (file is located in the _build_ directory), and access the constructor with _UINT32_:

`<script src="/your/path/to/uint32.js"></script>
...
<script type="text/javascript">
  var v1 = UINT32('326648991');
  var v2 = UINT32('265443576');
  var v1plus2 = v1.add(v2) // 592092567
</script>`

## Usage

To instantiate an unsigned 32 bits integer, do any of the following:

	var UINT32 = require('cuint').UINT32 // NodeJS
	UINT32( <low bits>, <high bits> )
	UINT32( <number> )
	UINT32( '<number>', <radix> ) // radix = 10 by default

To instantiate an unsigned 64 bits integer, do any of the following:

	var UINT64 = require('cuint').UINT64 // NodeJS
	UINT64( <low bits>, <high bits> )
	UINT64( <first low bits>, <second low bits>, <first high bits>, <second high bits> )
	UINT64( <number> )
	UINT64( '<number>', <radix> ) // radix = 10 by default

## Important

Most methods __do modify__ the object they are applied to. For instance, the following is equivalent to `x += y`

	UINT(x).add( UINT(y) )

This allows for chaining and reduces the cost of the emulation.
To have `z = x + y`, do the following:

    z = UINT(x).clone().add( UINT(y) )

## Examples for UINT32

* Using low and high bits
> `UINT32( 2, 1 )		// 65538`
> { remainder: null, _low: 2, _high: 1 }

* Using a number (signed 32 bits integer)
> `UINT32( 65538 ) 	// 65538`
> { remainder: null, _low: 2, _high: 1 }

* Using a string
> `UINT32( '65538' )	// 65538`
> { remainder: null, _low: 2, _high: 1 }

* Using another string
> `UINT32( '3266489917' )`
> { remainder: null, _low: 44605, _high: 49842 }

* Divide 2 unsigned 32 bits integers - note that the remainder is also provided
> `UINT32( '3266489917' ).div( UINT32( '668265263' ) )`
> {	remainder:
>			{	remainder: null
>			,	_low: 385
>			,	_high: 9055
>			}
>	,	_low: 4
>	,	_high: 0
>	}

## Examples for UINT64

* Using low and high bits
> `UINT64( 2, 1 )		// 4294967298`
> { remainder: null, _a00: 2, _a16: 0, _a32: 1, _a48: 0 }

* Using first/second low and high bits
> `UINT64( 2, 1, 0, 0 )		// 65538`
> { remainder: null, _a00: 2, _a16: 1, _a32: 0, _a48: 0 }

* Using a number (signed 32 bits integer)
> `UINT64( 65538 ) 	// 65538`
> { remainder: null, _a00: 2, _a16: 1, _a32: 0, _a48: 0 }

* Using a string
> `UINT64( '65538' )	// 65538`
> { remainder: null, _a00: 2, _a16: 1, _a32: 0, _a48: 0 }

* Using another string
> `UINT64( '3266489917' )`
> { remainder: null, _a00: 44605, _a16: 49842, _a32: 0, _a48: 0 }

* Divide 2 unsigned 64 bits integers - note that the remainder is also provided
> `UINT64( 'F00000000000', 16 ).div( UINT64( '800000000000', 16 ) )`
> { remainder: 
>   { remainder: null,
>     _a00: 0,
>     _a16: 0,
>     _a32: 28672,
>     _a48: 0 },
>  _a00: 1,
>  _a16: 0,
>  _a32: 0,
>  _a48: 0 }

## Methods

Methods specific to _UINT32_ and _UINT64_:

* `UINT32.fromBits(<low bits>, <high bits>)*`
Set the current _UINT32_ object with its low and high bits
* `UINT64.fromBits(<low bits>, <high bits>)*`
Set the current _UINT64_ object with its low and high bits
* `UINT64.fromBits(<first low bits>, <second low bits>, <first high bits>, <second high bits>)*`
Set the current _UINT64_ object with all its low and high bits

Methods common to _UINT32_ and _UINT64_:

* `UINT.fromNumber(<number>)*`
Set the current _UINT_ object from a number (first 32 bits only)
* `UINT.fromString(<string>, <radix>)`
Set the current _UINT_ object from a string
* `UINT.toNumber()`
Convert this _UINT_ to a number
* `UINT.toString(<radix>)`
Convert this _UINT_ to a string
* `UINT.add(<uint>)*`
Add two _UINT_. The current _UINT_ stores the result
* `UINT.subtract(<uint>)*`
Subtract two _UINT_. The current _UINT_ stores the result
* `UINT.multiply(<uint>)*`
Multiply two _UINT_. The current _UINT_ stores the result
* `UINT.div(<uint>)*`
Divide two _UINT_. The current _UINT_ stores the result.
The remainder is made available as the _remainder_ property on the _UINT_ object.
It can be null, meaning there are no remainder.
* `UINT.negate()`
Negate the current _UINT_
* `UINT.equals(<uint>)` alias `UINT.eq(<uint>)`
Equals
* `UINT.lessThan(<uint>)` alias `UINT.lt(<uint>)`
Less than (strict)
* `UINT.greaterThan(<uint>)` alias `UINT.gt(<uint>)`
Greater than (strict)
* `UINT.not()`
Bitwise NOT
* `UINT.or(<uint>)*`
Bitwise OR
* `UINT.and(<uint>)*`
Bitwise AND
* `UINT.xor(<uint>)*`
Bitwise XOR
* `UINT.shiftRight(<number>)*` alias `UINT.shiftr(<number>)*`
Bitwise shift right
* `UINT.shiftLeft(<number>[, <allowOverflow>])*` alias `UINT.shiftl(<number>[, <allowOverflow>])*`
Bitwise shift left
* `UINT.rotateLeft(<number>)*` alias `UINT.rotl(<number>)*`
Bitwise rotate left
* `UINT.rotateRight(<number>)*` alias `UINT.rotr(<number>)*`
Bitwise rotate right
* `UINT.clone()`
Clone the current _UINT_

NB. methods with an * do __modify__ the object it is applied to. Input objects are not modified.

## TODO

* more methods:
    * pow
    * log
    * sqrt
    * ...
* signed version


## License

MIT


> Written with [StackEdit](https://stackedit.io/).
