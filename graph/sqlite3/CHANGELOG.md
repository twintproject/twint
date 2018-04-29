# Changelog

## 4.0.0

 - Drop support for Node v0.10 and v.12
 - Upgrade to node-pre-gyp@0.9.0
 - Upgrade to nan@2.9.2

## 3.1.13

- Attempt to fix regression of #866

## 3.1.12

- Fixed to ensure the binaries do not rely on `GLIBC_2.14` and only `GLIBC_2.2.5`. This regressed in v3.1.11.

## 3.1.11

- Fixed building from source on alpine linux

## 3.1.10

- Removed `npm ls` from `prepublish` hook per mapbox/node-pre-gyp#291
- Upgraded node-pre-gyp to v0.6.37
- Removed accidentally committed large file

## 3.1.9

- Added support for node v8 and upgraded `nan`, `node-pre-gyp` deps.

## 3.1.8

- Added support for node v7 (pre-compiled binaries available)

## 3.1.7

- Upgrade sqlite to 3.15, enable FTS4, FTS5 (@wmertens)
- Upgrade to node-pre-gyp@0.6.31 and nan@2.4.0

## 3.1.6

- Starts bundling node-pre-gyp again to avoid #720

## 3.1.5

- [Added support for sqlite3_interrupt](https://github.com/mapbox/node-sqlite3/pull/518): this makes
  it possible to interrupt a long-running query.
- [Fixes uv_ref race](https://github.com/mapbox/node-sqlite3/pull/705).

## 3.1.4

 - Added support for node v6

## 3.1.3

 - Upgrade to node-pre-gyp@0.6.26 with better support for Electron

## 3.1.2

 - Only providing binaries for node v0.10x, v0.12.x, v4, and v5
 - Upgrade to nan@2.2.x
 - Upgrade to node-pre-gyp@0.6.24


## 3.1.1

 - Support for node 5.x
 - Upgraded SQLite to 3.9.1: https://www.sqlite.org/releaselog/3_9_1.html
 - Enabled json1 extension by default 

## 3.1.0

 - Support for node 3.x and 4.x
 - Stopped producing binaries for node-webkit and 32 bit linux

## 3.0.11

 - Support for io.js 3.x (upgrade to Nan 2.x) @kkoopa

## 3.0.10

 - Upgraded SQLite to 3.8.11.1: https://www.sqlite.org/releaselog/3_8_11_1.html
 - Fixed binary compatibility regression with old centos/rhel glibc GLIBC_2.14 (re-introduced alpine linux (musl) build regression)
 - Now providing binaries against Visual Studio 2015 (pass --toolset=v140) and use binaries from https://github.com/mapbox/node-cpp11

## 3.0.9

 - Fixed build regression against alpine linux (musl)
 - Upgraded node-pre-gyp@0.6.8

## 3.0.8

 - Fixed build regression against FreeBSD
 - Upgraded node-pre-gyp@0.6.7

## 3.0.7

 - Fixed build regression against ARM and i386 linux
 - Upgraded node-pre-gyp@0.6.6
 - Added support for io.js 2.0.0

## 3.0.6

 - Upgraded node-pre-gyp@0.6.5
 - Upgraded nan@1.8.4
 - Fixed binaries to work on older linux systems (circa GLIBC_2.2.5 like centos 6) @bnoordhuis
 - Updated internal libsqlite3 from 3.8.7.1 -> 3.8.9 (http://www.sqlite.org/news.html)

## 3.0.5

 - IO.js and Node v0.12.x support.
 - Node-webkit v0.11.x support regressed in this release, sorry (https://github.com/mapbox/node-sqlite3/issues/404).

## 3.0.4

 - Upgraded node-pre-gyp@0.6.1

## 3.0.3

 - Upgraded to node-pre-gyp@0.6.0 which should fix crashes against node v0.11.14
 - Now providing binaries against Visual Studio 2014 (pass --toolset=v140) and use binaries from https://github.com/mapbox/node-cpp11

## 3.0.2

 - Republish for possibly busted npm package.

## 3.0.1

 - Use ~ in node-pre-gyp semver for more flexible dep management.

## 3.0.0

Released September 20nd, 2014

 - Backwards-incompatible change: node versions 0.8.x are no longer supported.
 - Updated to node-pre-gyp@0.5.27
 - Updated NAN to 1.3.0
 - Updated internal libsqlite3 to v3.8.6

## 2.2.7

Released August 6th, 2014

 - Removed usage of `npm ls` with `prepublish` target (which breaks node v0.8.x)

## 2.2.6

Released August 6th, 2014

 - Fix bundled version of node-pre-gyp

## 2.2.5

Released August 5th, 2014

 - Fix leak in complete() callback of Database.each() (#307)
 - Started using `engineStrict` and improved `engines` declaration to make clear only >= 0.11.13 is supported for the 0.11.x series.

## 2.2.4

Released July 14th, 2014

 - Now supporting node v0.11.x (specifically >=0.11.13)
 - Fix db opening error with absolute path on windows
 - Updated to node-pre-gyp@0.5.18
 - updated internal libsqlite3 from 3.8.4.3 -> 3.8.5 (http://www.sqlite.org/news.html)

## 2.2.3

 - Fixed regression in v2.2.2 for installing from binaries on windows.

## 2.2.2

 - Fixed packaging problem whereby a `config.gypi` was unintentially packaged and could cause breakages for OS X builds.

## 2.2.1

 - Now shipping with 64bit FreeBSD binaries against both node v0.10.x and node v0.8.x.
 - Fixed solaris/smartos source compile by passing `-std=c99` when building internally bundled libsqlite3 (#201)
 - Reduced size of npm package by ignoring tests and examples.
 - Various fixes and improvements for building against node-webkit
 - Upgraded to node-pre-gyp@0.5.x from node-pre-gyp@0.2.5
 - Improved ability to build from source against `sqlcipher` by passing custom library name: `--sqlite_libname=sqlcipher`
 - No changes to C++ Core / Existing binaries are exactly the same

## 2.2.0

Released Jan 13th, 2014

 - updated internal libsqlite3 from 3.7.17 -> 3.8.2 (http://www.sqlite.org/news.html) which includes the next-generation query planner http://www.sqlite.org/queryplanner-ng.html
 - improved binary deploy system using https://github.com/springmeyer/node-pre-gyp
 - binary install now supports http proxies
 - source compile now supports freebsd
 - fixed support for node-webkit

## 2.1.19

Released October 31st, 2013

 - Started respecting `process.env.npm_config_tmp` as location to download binaries
 - Removed uneeded `progress` dependency

## 2.1.18

Released October 22nd, 2013

 - `node-sqlite3` moved to mapbox github group
 - Fixed reporting of node-gyp errors
 - Fixed support for node v0.6.x

## 2.1.17
 - Minor fixes to binary deployment

## 2.1.16
 - Support for binary deployment

## 2.1.15

Released August 7th, 2013

 - Minor readme additions and code optimizations
