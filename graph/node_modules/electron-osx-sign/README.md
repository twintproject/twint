# electron-osx-sign [![npm][npm_img]][npm_url] [![Build Status][travis_img]][travis_url]

Codesign Electron macOS apps

## About

[`electron-osx-sign`][electron-osx-sign] minimizes the extra work needed to eventually prepare your apps for shipping, providing the most basic tools and assets. Note that the bare necessities here are sufficient for enabling app sandbox, yet other configurations for network access etc. require additional work.

Check out [`electron-osx-sign` guide](https://mintkit.net/electron-userland/electron-osx-sign/guide/) for suggestions on setting up your environment and workflow for distribution or development.

Please visit our [wiki](https://github.com/electron-userland/electron-osx-sign/wiki) for walk-throughs, notes and [frequently asked questions](https://github.com/electron-userland/electron-osx-sign/wiki/FAQ) from past projects shipped with [`electron-packager`][electron-packager] and [`electron-osx-sign`][electron-osx-sign].

*NB: Since [`electron-osx-sign`][electron-osx-sign] injects the entry `com.apple.security.application-groups` into the entitlements file as part of the pre-signing process, this would reportedly limit app transfer on iTunes Connect (see [#150](https://github.com/electron-userland/electron-osx-sign/issues/150)). However, opting out entitlements automation `opts['pre-auto-entitlements'] === false` may result in worse graphics performance.*

*The signing procedure implemented in this package is based on what described in [Mac App Store Submission Guide](https://github.com/atom/electron/blob/master/docs/tutorial/mac-app-store-submission-guide.md).*

### [Electron]

It is worth noting as well that starting from [Electron] v1.1.1, a new mechanism was introduced to allow IPC in App Sandbox (see [electron#5601](https://github.com/electron/electron/pull/5601)); wish to have full support of legacy Electron versions, please utilize `opts.version`, which option brings less hassle with making default settings among Electron builds.

We are trying to keep updated to the latest [Electron] specs; please [file us an issue](https://github.com/electron-userland/electron-osx-sign/issues/new) if having any suggestions or experiencing difficulties code signing your products.

### An [OPEN Open Source Project](http://openopensource.org/)

Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

### Collaborators

Thanks to [seanchas116](https://github.com/seanchas116), [jasonhinkle](https://github.com/jasonhinkle), and [develar](https://github.com/develar) for improving the usability of this project implementation.

## Installation

```sh
# For use in npm scripts
npm install --save electron-osx-sign
```

```sh
# For use from CLI
npm install -g electron-osx-sign
```

*Note: `electron-osx-sign` is a dependency of `electron-packager` as of 6.0.0 for signing apps on macOS. However, feel free to install this package globally for more customization beyond specifying identity and entitlements.*

## Usage

### electron-osx-sign

#### From the Command Line

```sh
electron-osx-sign app [embedded-binary ...] [options ...]
```

##### Examples

Since `electron-osx-sign` adds the entry `com.apple.developer.team-identifier` to a temporary copy of the specified entitlements file (with the default option `--pre-auto-entitlements`) distribution builds can no longer be run directly. To run the app codesigned for distribution locally after codesigning, you may manually add `ElectronTeamID` in your `Info.plist` and `com.apple.security.application-groups` in the entitlements file, and provide the flag `--no-pre-auto-entitlements` for `electron-osx-sign` to avoid this extra bit. Note that "certain features are only allowed across apps whose team-identifier value match" ([Technical Note TN2415](https://developer.apple.com/library/content/technotes/tn2415/_index.html#//apple_ref/doc/uid/DTS40016427-CH1-ENTITLEMENTSLIST)).

The examples below assume that `--pre-auto-entitlements` is enabled.

- To sign a distribution version by default:
  ```sh
  electron-osx-sign path/to/my.app
  ```
  For distribution in the Mac App Store: Have the provisioning profile for distribution placed in the current working directory and the signing identity installed in the default keychain. *The app is not expected to run after codesigning since there is no provisioned device, and it is intended only for submission to iTunes Connect.*
  For distribution outside the Mac App Store: Have the signing identity for distribution installed in the default keychain and optionally place the provisioning profile in the current working directory. By default App Sandbox is not enabled. *The app should run on all devices.*

- To sign development version:
  ```sh
  electron-osx-sign path/to/my.app --type=development
  ```
  For testing Mac App Store builds: Have the provisioning profile for development placed in the current working directory and the signing identity installed in the default keychain. *The app will only run on provisioned devices.*
  For testing apps for distribution outside the Mac App Store, have the signing identity for development installed in the default keychain and optionally the provisioning profile placed in the current working directory. *The app will only run on provisioned devices.* However, you may prefer to just go with signing a distribution version because the app is expected to launch properly after codesigned.

- It is recommended to place the provisioning profile(s) under the working directory for `electron-osx-sign` to pick up automatically; however, to specify provisioning profile to be embedded explicitly:
  ```sh
  electron-osx-sign path/to/my.app --provisioning-profile=path/to/my.provisionprofile
  ```

- To specify the entitlements file:
  ```sh
  electron-osx-sign path/to/my.app --entitlements=path/to/my.entitlements
  ```

- It is recommended to make use of `--version` while signing legacy versions of Electron:
  ```sh
  electron-osx-sign path/to/my.app --version=0.34.0
  ```

Run `electron-osx-sign --help` or see [electron-osx-sign-usage.txt](https://github.com/electron-userland/electron-osx-sign/blob/master/bin/electron-osx-sign-usage.txt) for CLI-specific options.

#### From the API

```javascript
var sign = require('electron-osx-sign')
sign(opts[, function done (err) {}])
```

Example:

```javascript
var sign = require('electron-osx-sign')
sign({
  app: 'path/to/my.app'
}, function done (err) {
  if (err) {
    // Handle the error
    return;
  }
  // Application signed
})
```

From release v0.4.0-beta, [Bluebird] promises are introduced for better async method calls; the following is also available for use.

```javascript
var signAsync = require('electron-osx-sign').signAsync
signAsync(opts)
  [.then(function () {})]
  [.catch(function (err) {})]
```

Example:

```javascript
var signAsync = require('electron-osx-sign').signAsync
signAsync({
  app: 'path/to/my.app'
})
  .then(function () {
    // Application signed
  })
  .catch(function (err) {
    // Handle the error
  })
```

###### opts - Options

**Required**

`app` - *String*

Path to the application package.
Needs file extension `.app`.

**Optional**

`binaries` - *Array*

Path to additional binaries that will be signed along with built-ins of Electron.
Default to `undefined`.

`entitlements` - *String*

Path to entitlements file for signing the app.
Default to built-in entitlements file, Sandbox enabled for Mac App Store platform.
See [default.entitlements.mas.plist](https://github.com/electron-userland/electron-osx-sign/blob/master/default.entitlements.mas.plist) or [default.entitlements.darwin.plist](https://github.com/electron-userland/electron-osx-sign/blob/master/default.entitlements.darwin.plist) with respect to your platform.

`entitlements-inherit` - *String*

Path to child entitlements which inherit the security settings for signing frameworks and bundles of a distribution. *This option only applies when signing with entitlements.*
See [default.entitlements.mas.inherit.plist](https://github.com/electron-userland/electron-osx-sign/blob/master/default.entitlements.mas.inherit.plist) or [default.entitlements.darwin.inherit.plist](https://github.com/electron-userland/electron-osx-sign/blob/master/default.entitlements.darwin.inherit.plist) with respect to your platform.

`gatekeeper-assess` - *Boolean*

Flag to enable/disable Gatekeeper assessment after signing the app. Disabling it is useful for signing with self-signed certificates.
Gatekeeper assessment is enabled by default on `darwin` platform.
Default to `true`.

`identity` - *String*

Name of certificate to use when signing.
Default to be selected with respect to `provisioning-profile` and `platform` from `keychain` or keychain by system default.

Signing platform `mas` will look for `3rd Party Mac Developer Application: * (*)`, and platform `darwin` will look for `Developer ID Application: * (*)` by default.

`identity-validation` - *Boolean*

Flag to enable/disable validation for the signing identity. If enabled, the `identity` provided will be validated in the `keychain` specified.
Default to `true`.

`keychain` - *String*

The keychain name.
Default to system default keychain.

`ignore` - *RegExp|Function|Array.<(RegExp|Function)>*

Regex, function or an array of regex's and functions that signal skipping signing a file.
Elements of other types are treated as `RegExp`.
Default to `undefined`.

`platform` - *String*

Build platform of Electron.
Allowed values: `darwin`, `mas`.
Default to auto detect by presence of `Squirrel.framework` within the application bundle.

`pre-auto-entitlements` - *Boolean*

Flag to enable/disable automation of `com.apple.security.application-groups` in entitlements file and update `Info.plist` with `ElectronTeamID`.
Default to `true`.

`pre-embed-provisioning-profile` - *Boolean*

Flag to enable/disable embedding of provisioning profile in the current working directory.
Default to `true`.

`provisioning-profile` - *String*

Path to provisioning profile.

`requirements` - *String*

Specify the criteria that you recommend to be used to evaluate the code signature.
See more info from https://developer.apple.com/library/mac/documentation/Security/Conceptual/CodeSigningGuide/RequirementLang/RequirementLang.html
Default to `undefined`.

`strict-verify` - *Boolean|String|Array.<String>*

Flag to enable/disable `--strict` flag when verifying the signed application bundle.
If provided as a string, each component should be separated with comma (`,`).
If provided as an array, each item should be a string corresponding to a component.
Default to `true`.

`timestamp` - *String*

Specify the URL of the timestamp authority server, default to server provided by Apple. Please note that this default server may not support signatures not furnished by Apple.
Disable the timestamp service with `none`.

`type` - *String*

Specify whether to sign app for development or for distribution.
Allowed values: `development`, `distribution`.
Default to `distribution`.

`version` - *String*

Build version of Electron.
Values may be like: `1.1.1`, `1.2.0`.
Default to latest Electron version.

It is recommended to utilize this option for best support of specific Electron versions. This may trigger pre/post operations for signing: For example, automation of setting `com.apple.security.application-groups` in entitlements file and of updating `Info.plist` with `ElectronTeamID` is enabled for all versions starting from `1.1.1`; set `pre-auto-entitlements` option to `false` to disable this feature.

###### cb - Callback

`err` - *Error*

### electron-osx-flat

#### From the Command Line

```sh
electron-osx-flat app [options ...]
```

Example:

```sh
electron-osx-flat path/to/my.app
```

Run `electron-osx-flat --help` or see [electron-osx-flat-usage.txt](https://github.com/electron-userland/electron-osx-sign/blob/master/bin/electron-osx-flat-usage.txt) for CLI-specific options.

#### From the API

```javascript
var flat = require('electron-osx-sign').flat
flat(opts[, function done (err) {}])
```

Example:

```javascript
var flat = require('electron-osx-sign').flat
flat({
  app: 'path/to/my.app'
}, function done (err) {
  if (err) {
    // Handle the error
    return;
  }
  // Application flattened
})
```

From release v0.4.0-beta, [Bluebird] promises are introduced for better async method calls; the following is also available for use.

```javascript
var flatAsync = require('electron-osx-sign').flatAsync
flatAsync(opts)
  [.then(function () {})]
  [.catch(function (err) {})]
```

Example:

```javascript
var flatAsync = require('electron-osx-sign').flatAsync
flatAsync({
  app: 'path/to/my.app'
})
  .then(function () {
    // Application flattened
  })
  .catch(function (err) {
    // Handle the error
  })
```

###### opts - Options

**Required**

`app` - *String*

Path to the application bundle.
Needs file extension `.app`.

**Optional**

`identity` - *String*

Name of certificate to use when signing.
Default to be selected with respect to `platform` from `keychain` or keychain by system default.

Flattening platform `mas` will look for `3rd Party Mac Developer Installer: * (*)`, and platform `darwin` will look for `Developer ID Installer: * (*)` by default.

`identity-validation` - *Boolean*

Flag to enable/disable validation for signing identity. If enabled, the `identity` provided will be validated in the `keychain` specified.
Default to `true`.

`install` - *String*

Path to install the bundle.
Default to `/Applications`.

`keychain` - *String*

The keychain name.
Default to system default keychain.

`platform` - *String*

Build platform of Electron. Allowed values: `darwin`, `mas`.
Default to auto detect by presence of `Squirrel.framework` within the application bundle.

`pkg` - *String*

Path to the output the flattened package.
Needs file extension `.pkg`.

`scripts` - *String*
Path to a directory containing pre and/or post install scripts.

###### cb - Callback

`err` - *Error*

## Debug

As of release v0.3.1, external module `debug` is used to display logs and messages; remember to `export DEBUG=electron-osx-sign*` when necessary.

## Test

As developer certificates are required for `codesign` on macOS, this module is difficult to be tested via online build services. If you wish to test out this module, enter:

```
npm test
```

from the dev directory, and tell us if all tests should pass.

When this command is fun for the first time: `electron-download` will download all major releases of Electron available for macOS from 0.24.0, and save to `~/.electron/`, which might take up less than 1GB of disk space.

A successful testing should look something like:

```
$ npm test

> electron-osx-sign@0.4.10 pretest electron-osx-sign
> rimraf test/work

> electron-osx-sign@0.4.10 test electron-osx-sign
> standard && tape test

Calling electron-download before running tests...
Running tests...
TAP version 13
# setup
# defaults-test:v0.29.2-darwin-x64
ok 1 app signed
# defaults-test:v0.30.8-darwin-x64
ok 2 app signed
# defaults-test:v0.31.2-darwin-x64
ok 3 app signed
# defaults-test:v0.32.3-darwin-x64
ok 4 app signed
# defaults-test:v0.33.9-darwin-x64
ok 5 app signed
# defaults-test:v0.34.5-darwin-x64
ok 6 app signed
# defaults-test:v0.34.5-mas-x64
ok 7 app signed
# defaults-test:v0.35.6-darwin-x64
ok 8 app signed
# defaults-test:v0.35.6-mas-x64
ok 9 app signed
# defaults-test:v0.36.12-darwin-x64
ok 10 app signed
# defaults-test:v0.36.12-mas-x64
ok 11 app signed
# defaults-test:v0.37.8-darwin-x64
ok 12 app signed
# defaults-test:v0.37.8-mas-x64
ok 13 app signed
# defaults-test:v1.0.2-darwin-x64
ok 14 app signed
# defaults-test:v1.0.2-mas-x64
ok 15 app signed
# defaults-test:v1.1.3-darwin-x64
ok 16 app signed
# defaults-test:v1.1.3-mas-x64
ok 17 app signed
# defaults-test:v1.2.8-darwin-x64
ok 18 app signed
# defaults-test:v1.2.8-mas-x64
ok 19 app signed
# defaults-test:v1.3.7-darwin-x64
ok 20 app signed
# defaults-test:v1.3.7-mas-x64
ok 21 app signed
# defaults-test:v1.4.15-darwin-x64
ok 22 app signed
# defaults-test:v1.4.15-mas-x64
ok 23 app signed
# defaults-test:v1.6.17-darwin-x64
ok 24 app signed
# defaults-test:v1.6.17-mas-x64
ok 25 app signed
# defaults-test:v1.7.12-darwin-x64
ok 26 app signed
# defaults-test:v1.7.12-mas-x64
ok 27 app signed
# defaults-test:v1.8.3-darwin-x64
ok 28 app signed
# defaults-test:v1.8.3-mas-x64
ok 29 app signed
# teardown

1..29
# tests 29
# pass  29

# ok
```

## Related

- [electron-packager] - Package your electron app in OS executables (.app, .exe, etc) via JS or CLI
- [electron-builder] - A complete solution to package and build a ready for distribution Electron app with “auto update” support out of the box

[Bluebird]: https://github.com/petkaantonov/bluebird
[Electron]: https://github.com/electron/electron
[electron-builder]: https://github.com/electron-userland/electron-builder
[electron-packager]: https://github.com/electron-userland/electron-packager
[electron-osx-sign]: https://github.com/electron-userland/electron-osx-sign
[npm_img]: https://img.shields.io/npm/v/electron-osx-sign.svg
[npm_url]: https://npmjs.org/package/electron-osx-sign
[travis_img]: https://travis-ci.org/electron-userland/electron-osx-sign.svg?branch=master
[travis_url]: https://travis-ci.org/electron-userland/electron-osx-sign
