var UINT32 = require('..').UINT32

var v1 = UINT32('3266489917')
var v2 = UINT32('668265263')
var v1div2 = v1.clone().div(v2)
console.log( v1 + ' / ' + v2 + ' = ' + v1div2 )
