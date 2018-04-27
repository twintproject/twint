var UINT32 = require('..').UINT32

var v1 = UINT32('326648991')
var v2 = UINT32('265443576')
var v1plus2 = v1.clone().add(v2)
console.log( v1 + ' + ' + v2 + ' = ' + v1plus2 )
