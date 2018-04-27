/*!
	pretty-bytes
	Convert bytes to a human readable string: 1337 → 1.34 kB
	https://github.com/sindresorhus/pretty-bytes
	by Sindre Sorhus
	MIT License
*/
(function () {
	'use strict';

	// Number.isNaN() polyfill
	var isNaN = function (val) {
		return val !== val;
	};

	var prettyBytes = function (num) {
		if (typeof num !== 'number' || isNaN(num)) {
			throw new TypeError('Expected a number');
		}

		var exponent;
		var unit;
		var neg = num < 0;
		var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

		if (neg) {
			num = -num;
		}

		if (num < 1) {
			return (neg ? '-' : '') + num + ' B';
		}

		exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
		num = (num / Math.pow(1000, exponent)).toFixed(2) * 1;
		unit = units[exponent];

		return (neg ? '-' : '') + num + ' ' + unit;
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = prettyBytes;
	} else {
		self.prettyBytes = prettyBytes;
	}
})();
