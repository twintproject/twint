# Contributing

General guidelines for contributing to node-sqlite3

## Install Help

If you've landed here due to a failed install of `node-sqlite3` then feel free to create a [new issue](https://github.com/mapbox/node-sqlite3/issues/new) to ask for help. The most likely problem is that we do not yet provide pre-built binaries for your particular platform and so the `node-sqlite3` install attempted a source compile but failed because you are missing the [dependencies for node-gyp](https://github.com/TooTallNate/node-gyp#installation). But please provide as much detail on your problem as possible and we'll try to help. Please include:
 - terminal logs of failed install (preferably from running `npm install sqlite3 --loglevel=info`)
 - `node-sqlite3` version you tried to install
 - node version you are running
 - operating system and architecture you are running, e.g. `Windows 7 64 bit`.

## Developing / Pre-release

Create a milestone for the next release on github. If all anticipated changes are back compatible then a `patch` release is in order. If minor API changes are needed then a `minor` release is in order. And a `major` bump is warranted if major API changes are needed.

Assign tickets and pull requests you are working to the milestone you created.

## Releasing

To release a new version:

**1)** Ensure tests are passing

Before considering a release all the tests need to be passing on appveyor and travis.

**2)** Bump commit

Bump the version in `package.json` like https://github.com/mapbox/node-sqlite3/commit/77d51d5785b047ff40f6a8225051488a0d96f7fd

What if you already committed the `package.json` bump and you have no changes to commit but want to publish binaries? In this case you can do:

```sh
git commit --allow-empty -m "[publish binary]"
```

**3)** Ensure binaries built

Check the travis and appveyor pages to ensure they are all green as an indication that the `[publish binary]` command worked.

If you need to republish binaries you can do this with the command below, however this should not be a common thing for you to do!

```sh
git commit --allow-empty -m "[republish binary]"
```

Note: NEVER republish binaries for an existing released version.

**7)** Officially release

An official release requires:

 - Updating the CHANGELOG.md
 - Create and push github tag like `git tag v3.1.1 -m "v3.1.1" && git push --tags`
 - Ensure you have a clean checkout (no extra files in your check that are not known by git). You need to be careful, for instance, to avoid a large accidental file being packaged by npm. You can get a view of what npm will publish by running `make testpack`
 - Fully rebuild and ensure install from binary works: `make clean && npm install --fallback-to-build=false`
 - Then publish the module to npm repositories by running `npm publish`
