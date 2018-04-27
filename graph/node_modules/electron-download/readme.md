# electron-download

[![Travis Build Status](https://travis-ci.org/electron-userland/electron-download.svg?branch=master)](https://travis-ci.org/electron-userland/electron-download)
[![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/dtu6of8wgtva0t8l?svg=true)](https://ci.appveyor.com/project/Atom/electron-download)


[![NPM](https://nodei.co/npm/electron-download.png?downloads=true)](https://www.npmjs.com/package/electron-download)

Downloads an Electron release zip from GitHub.

Used by [electron-prebuilt](https://npmjs.org/electron-prebuilt) and [electron-packager](https://npmjs.org/electron-packager)

### Usage

```shell
$ npm install --global electron-download
$ electron-download --version=0.31.1
```

```javascript
var download = require('electron-download')

download({
  version: '0.25.1',
  arch: 'ia32',
  platform: 'win32',
  cache: './zips' // defaults to <user's home directory>/.electron
}, function (err, zipPath) {
  // zipPath will be the path of the zip that it downloaded.
  // If the zip was already cached it will skip
  // downloading and call the cb with the cached zip path.
  // If it wasn't cached it will download the zip and save
  // it in the cache path.
})
```

If you don't specify `arch` or `platform` args it will use the built-in `os` module to get the values from the current OS. Specifying `version` is mandatory. If there is a `SHASUMS256.txt` file available for the `version`, the file downloaded will be validated against its checksum to ensure that it was downloaded without errors.

You can also use `electron-download` to download the `chromedriver`, `ffmpeg`,
`mksnapshot`, and symbols assets for a specific Electron release. This can be
configured by setting the `chromedriver`, `ffmpeg`, `mksnapshot`, or
`symbols` property to `true` in the specified options object. Only one of
these options may be specified per download call.

You can force a re-download of the asset and the `SHASUM` file by setting the
`force` option to `true`.

If you would like to override the mirror location, three options are available. The mirror URL is composed as `url = ELECTRON_MIRROR + ELECTRON_CUSTOM_DIR + '/' + ELECTRON_CUSTOM_FILENAME`.

You can set the `ELECTRON_MIRROR` or [`NPM_CONFIG_ELECTRON_MIRROR`](https://docs.npmjs.com/misc/config#environment-variables) environment variable or `mirror` opt variable to use a custom base URL for grabbing Electron zips. The same pattern applies to `ELECTRON_CUSTOM_DIR` and `ELECTRON_CUSTOM_FILENAME`:

```plain
## Electron Mirror of China
ELECTRON_MIRROR="https://npm.taobao.org/mirrors/electron/"

## or for a local mirror
ELECTRON_MIRROR="https://10.1.2.105/"
ELECTRON_CUSTOM_DIR="our/internal/filePath"
```

You can set ELECTRON_MIRROR in `.npmrc` as well, using the lowercase name:

```plain
electron_mirror=https://10.1.2.105/
```
