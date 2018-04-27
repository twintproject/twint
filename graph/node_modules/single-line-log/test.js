var log = require('./index').stdout;

var i = 0;
setInterval(function() {
  i++;

  var s = 'line 1 - ' + Math.random();

  if (i < 10) s += ' - ' + Math.random();

  if (i < 40) s += '\nline 2 - ' + Math.random();
  if (i < 30) s += '\nline 3 - ' + Math.random();
  if (i < 20) s += '\nline 4 - ' + Math.random();

  log(s);

  if (i === 50) {
    log.clear();
    process.exit(0);
  }
}, 200);
