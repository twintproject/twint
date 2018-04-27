# compare-version [![Build Status](https://travis-ci.org/kevva/compare-version.svg?branch=master)](https://travis-ci.org/kevva/compare-version)

> Compare version numbers.

## Install

```bash
$ npm install --save compare-version
```

```bash
$ component install kevva/compare-version
```

```bash
$ bower install --save compare-version
```

## Usage

```js
var compareVersion = require('compare-version');

compareVersion('1.11.0', '1.11.0'); // => 0
compareVersion('1.11.0', '1.2.9'); // => 1
compareVersion('1.11.3', '1.11.25'); // => -1
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) © [Kevin Mårtensson](https://github.com/kevva)
