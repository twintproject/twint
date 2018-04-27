# get-package-info [![Build Status](https://travis-ci.org/rahatarmanahmed/get-package-info.svg?branch=master)](https://travis-ci.org/rahatarmanahmed/get-package-info)
Gets properties from package.json files in parent directories.

## Installing
`npm install get-package-info`

## Usage

### `getPackageInfo(props, dir, [cb])`

Searches for properties from package.json starting from the given directory going upwards, until all properties are found. Properties are set to the first instance found, and not overwritten. It returns a promise that resolves with the results (see [example](#Example) below for the structure of the results object). You may also specify a node-style callback if you prefer.

#### `props`

An array of string properties to search for. Nested properties can be retreived with dot notation (ex: `dependencies.lodash`).

If an individual property is an array, it will search for those properties in order, and the first value found will be saved under all the given properties. This is useful if you want at least one of those properties, but don't want the search to fail when it finds one but not another. Ex: `getPackageInfo([['dependencies.lodash', 'devDependencies.lodash']], dir)` will search for lodash in both `dependencies` and `devDependencies`, and save whichever one it finds first under both properties in the results.

#### `dir`

The initial directory to search in. `getPackageInfo(props, dir)` will look for a package.json in `dir`, and get the requested properties. If all the properties are not found, it will look in package.json files in parent directories.

## Example
```js
var getPackageInfo = require('get-package-info');

getPackageInfo([['productName', 'name'], 'dependencies.lodash'], '/path/to/dir')
.then((result) => {
    console.log(result);
});
```

Possible output, depending on the directory structure and package.json contents:

```
{
    values: {
        name: 'package-name',
        'dependencies.lodash': '~3.0.0'
    },
    source: {
        productName: {
            src: '/path/to/dir/package.json',
            pkg: { ... }, // the parsed package.json this property came from
            prop: 'productName'
        },
        name: {
            src: '/path/to/dir/package.json',
            pkg: { ... }, // the parsed package.json this property came from
            prop: 'productName' // name uses productName's value because productName has priority
        },
        'dependencies.lodash': {
            src: '/path/to/package.json', // This property was found in a higher directory
            pkg: { ... },
            prop: 'dependencies.lodash'
        }
    }
}
*/
```

## Handling Errors

If all the properties cannot be found in parent package.json files, then `getPackageInfo()` will reject it's promise (or callback with err argument) with an Error. `err.missingProps` will have an array of the properties that it could not find, and `err.result` will contain all the props that were found.

If any other error occurs(like I/O or runtime errors), `getPackageInfo()` will reject with that error itself.
