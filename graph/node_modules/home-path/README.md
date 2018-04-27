[![view on npm](http://img.shields.io/npm/v/home-path.svg)](https://www.npmjs.org/package/home-path)
[![npm module downloads](http://img.shields.io/npm/dt/home-path.svg)](https://www.npmjs.org/package/home-path)
[![Build Status](https://travis-ci.org/75lb/home-path.svg?branch=master)](https://travis-ci.org/75lb/home-path)
[![Dependency Status](https://david-dm.org/75lb/home-path.svg)](https://david-dm.org/75lb/home-path)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

<a name="module_home-path"></a>

# home-path
Cross-platform home directory retriever, tested on Windows XP and above, Mac OSX and Linux.

With node versions 2.3.0 (iojs) or higher, the built-in [`os.homedir`](https://nodejs.org/api/os.html#os_os_homedir) method is used.

**Example**  
```js
var getHomePath = require('home-path')
```
<a name="exp_module_home-path--getHomePath"></a>

## getHomePath() ⏏
**Kind**: Exported function  
**Example**  
Mac OSX
```js
> getHomePath()
'/Users/Lloyd'
```

Ubuntu Linux
```js
> getHomePath()
'/home/lloyd'
```

Windows 8.1
```js
> getHomePath()
'C:\\Users\\Lloyd'
```

* * *

&copy; 2015-17 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
