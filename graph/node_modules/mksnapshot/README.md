# mksnapshot

Generates snapshot file for [Electron][Electron].

## Installing

```sh
npm install mksnapshot
```

## Docs

```javascript
var mksnapshot = require('mksnapshot');
```

### mksnapshot(content, target, version, arch, builddir, callback)

Generates snapshot file for `content` and copies it to `target`, `callback` will
be called with `error` when failed, and with `null` when succeeded.

You also need to specify [Electron][Electron]'s `version` and `arch`, as well as
the `builddir` where temporary files and downloaded binaries will be put.

[Electron]: https://github.com/atom/electron
