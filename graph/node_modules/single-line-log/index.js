var MOVE_LEFT = new Buffer('1b5b3130303044', 'hex').toString();
var MOVE_UP = new Buffer('1b5b3141', 'hex').toString();
var CLEAR_LINE = new Buffer('1b5b304b', 'hex').toString();
var stringWidth = require('string-width');

module.exports = function(stream) {
	var write = stream.write;
	var str;

	stream.write = function(data) {
		if (str && data !== str) str = null;
		return write.apply(this, arguments);
	};

	if (stream === process.stderr || stream === process.stdout) {
		process.on('exit', function() {
			if (str !== null) stream.write('');
		});
	}

	var prevLineCount = 0;
	var log = function() {
		str = '';
		var nextStr = Array.prototype.join.call(arguments, ' ');

		// Clear screen
		for (var i=0; i<prevLineCount; i++) {
			str += MOVE_LEFT + CLEAR_LINE + (i < prevLineCount-1 ? MOVE_UP : '');
		}

		// Actual log output
		str += nextStr;
		stream.write(str);

		// How many lines to remove on next clear screen
		var prevLines = nextStr.split('\n');
		prevLineCount = 0;
		for (var i=0; i < prevLines.length; i++) {
			prevLineCount += Math.ceil(stringWidth(prevLines[i]) / stream.columns) || 1;
		}
	};

	log.clear = function() {
		stream.write('');
	};

	return log;
};

module.exports.stdout = module.exports(process.stdout);
module.exports.stderr = module.exports(process.stderr);
