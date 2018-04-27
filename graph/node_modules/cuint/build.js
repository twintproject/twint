var fs = require('fs')
var path = require('path')
var minify = require('minify')

minify.optimize('lib/uint32.js', { returnName: true, callback: save('build/uint32.min.js') })
fs.writeFileSync( 'build/uint32.js', fs.readFileSync('lib/uint32.js') )

minify.optimize('lib/uint64.js', { returnName: true, callback: save('build/uint64.min.js') })
fs.writeFileSync( 'build/uint64.js', fs.readFileSync('lib/uint64.js') )

function save (filename) {
	return function (p) {
		console.log('Renaming ' + path.basename(p.name) + ' to ' + filename)
		fs.renameSync( p.name, filename )
	}
}