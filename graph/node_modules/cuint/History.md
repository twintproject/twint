0.2.2 / 2016-08-23
==================

* merged pull request c5f32fa from vote539

0.2.1 / 2015-12-18
==================

* fixed issue #3: invalid remainder in x.div(y) where y > x -- thanks @bltpanda

0.2.0 / 2015-01-05
==================

* merged pull request c6d1c41 from tec27
* updated package.json file

0.1.5 / 2014-03-21
==================

* fixed bug in uint32.div()

0.1.3 / 2014-03-08
==================

* minor tweaks to shiftr()

0.1.3 / 2014-03-06
==================

* #div() always sets the remainder

0.1.2 / 2014-01-17
==================

* fix for uint64.fromString(36) substring param

0.1.1 / 2014-01-04
==================

* faster uint32.fromString()
* fix for uint64.div()
* adjusted toString() to handle max radix of 36
* added minified versions in build/
* updated README

0.1.0 / 2014-01-03
==================

* added support for unsigned 64 bits integers

0.0.3 / 2014-01-02
==================

* shiftLeft() and shiftRight() fixes when n > 16
* not() fix
* adjusted fromString() slice from 8 to 6 to avoid radix overflow

0.0.2 / 2014-01-02
==================

* 1.div() fix

0.0.1 / 2014-01-01
==================

* toString() fix for uint < radix
* toString() no longer alters the unsigned integer
* fixed shiftLeft() not applying mask properly, affecting toString() and div()
* added examples

0.0.0 / 2013-12-31
==================

* Initial release (only supports 32 bits uint)
