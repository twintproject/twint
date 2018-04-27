# vis.js

[![Join the chat at https://gitter.im/vis-js/Lobby](https://badges.gitter.im/vis-js/Lobby.svg)](https://gitter.im/vis-js/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

<a href="https://github.com/almende/vis/blob/develop/misc/we_need_help.md">
  <img align="right" src="https://raw.githubusercontent.com/almende/vis/master/misc/we_need_help.png">
</a>

Vis.js is a dynamic, browser based visualization library.
The library is designed to be easy to use, handle large amounts
of dynamic data, and enable manipulation of the data.
The library consists of the following components:

- DataSet and DataView. A flexible key/value based data set. Add, update, and
  remove items. Subscribe on changes in the data set. A DataSet can filter and
  order items, and convert fields of items.
- DataView. A filtered and/or formatted view on a DataSet.
- Graph2d. Plot data on a timeline with lines or barcharts.
- Graph3d. Display data in a three dimensional graph.
- Network. Display a network (force directed graph) with nodes and edges.
- Timeline. Display different types of data on a timeline.

The vis.js library was initially developed by [Almende B.V](http://almende.com).

## Badges

[![NPM](https://nodei.co/npm/vis.png?downloads=true&downloadRank=true)](https://nodei.co/npm/vis/)

[![Dependency Status](https://david-dm.org/almende/vis/status.svg)](https://david-dm.org/almende/vis)
[![devDependency Status](https://david-dm.org/almende/vis/dev-status.svg)](https://david-dm.org/almende/vis?type=dev)

[![last version on CDNJS](https://img.shields.io/cdnjs/v/vis.svg)](https://cdnjs.com/libraries/vis)
[![GitHub contributors](https://img.shields.io/github/contributors/almende/vis.svg)](https://github.com/almende/vis/graphs/contributors)
[![GitHub stars](https://img.shields.io/github/stars/almende/vis.svg)](https://github.com/almende/vis/stargazers)

[![GitHub issues](https://img.shields.io/github/issues/almende/vis.svg)](https://github.com/almende/vis/issues)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/almende/vis.svg)](http://isitmaintained.com/project/almende/vis "Percentage of issues still open")
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/almende/vis.svg)](http://isitmaintained.com/project/almende/vis "Average time to resolve an issue")
[![Pending Pull-Requests](http://githubbadges.herokuapp.com/almende/vis/pulls.svg)](https://github.com/almende/vis/pulls)

[![Code Climate](https://codeclimate.com/github/almende/vis/badges/gpa.svg)](https://codeclimate.com/github/almende/vis) 

## Install

Install via npm:

    $ npm install vis

Install via bower:

    $ bower install vis

Link via cdnjs: http://cdnjs.com

Or download the library from the github project:
[https://github.com/almende/vis.git](https://github.com/almende/vis.git).

## Load

To use a component, include the javascript and css files of vis in your web page:

```html
<!DOCTYPE HTML>
<html>
<head>
  <script src="webroot/vis/dist/vis.js"></script>
  <link href="webroot/vis/dist/vis.css" rel="stylesheet" type="text/css" />
</head>
<body>
  <script type="text/javascript">
    // ... load a visualization
  </script>
</body>
</html>
```

or load vis.js using require.js. Note that vis.css must be loaded too.

```js
require.config({
  paths: {
    vis: 'path/to/vis/dist',
  }
});
require(['vis'], function (math) {
  // ... load a visualization
});
```


A timeline can be instantiated as:

```js
var timeline = new vis.Timeline(container, data, options);
```

Where `container` is an HTML element, `data` is an Array with data or a DataSet,
and `options` is an optional object with configuration options for the
component.


## Example

A basic example on loading a Timeline is shown below. More examples can be
found in the [examples directory](https://github.com/almende/vis/tree/master/examples)
of the project.

```html
<!DOCTYPE HTML>
<html>
<head>
  <title>Timeline basic demo</title>
  <script src="vis/dist/vis.js"></script>
  <link href="vis/dist/vis.css" rel="stylesheet" type="text/css" />

  <style type="text/css">
    body, html {
      font-family: sans-serif;
    }
  </style>
</head>
<body>
<div id="visualization"></div>

<script type="text/javascript">
  var container = document.getElementById('visualization');
  var data = [
    {id: 1, content: 'item 1', start: '2013-04-20'},
    {id: 2, content: 'item 2', start: '2013-04-14'},
    {id: 3, content: 'item 3', start: '2013-04-18'},
    {id: 4, content: 'item 4', start: '2013-04-16', end: '2013-04-19'},
    {id: 5, content: 'item 5', start: '2013-04-25'},
    {id: 6, content: 'item 6', start: '2013-04-27'}
  ];
  var options = {};
  var timeline = new vis.Timeline(container, data, options);
</script>
</body>
</html>
```

## Build

To build the library from source, clone the project from github

    $ git clone git://github.com/almende/vis.git

The source code uses the module style of node (require and module.exports) to
organize dependencies. To install all dependencies and build the library,
run `npm install` in the root of the project.

    $ cd vis
    $ npm install

Then, the project can be build running:

    $ npm run build

To automatically rebuild on changes in the source files, once can use

    $ npm run watch

This will both build and minify the library on changes. Minifying is relatively
slow, so when only the non-minified library is needed, one can use the
`watch-dev` script instead:

    $ npm run watch-dev

## Custom builds

The folder `dist` contains bundled versions of vis.js for direct use in the browser. These bundles contain all the visualizations and include external dependencies such as *hammer.js* and *moment.js*.

The source code of vis.js consists of commonjs modules, which makes it possible to create custom bundles using tools like [Browserify](http://browserify.org/) or [Webpack](http://webpack.github.io/). This can be bundling just one visualization like the Timeline, or bundling vis.js as part of your own browserified web application.

*Note that hammer.js version 2 is required as of v4.*

### Prerequisites

Before you can do a build:

- Install *node.js* and *npm* on your system: https://nodejs.org/
- Install the following modules using npm: `browserify`, `babelify`, and `uglify-js`:

  ```
  $ [sudo] npm install -g browserify babelify uglify-js
  ```

- Download or clone the vis.js project:

  ```
  $ git clone https://github.com/almende/vis.git
  ```

- Install the dependencies of vis.js by running `npm install` in the root of the project:

  ```
  $ cd vis
  $ npm install
  ```

### Examples of custom builds

#### Example 1: Bundle only a single visualization type

For example, to create a bundle with just the Timeline and DataSet, create an index file named **custom.js** in the root of the project, containing:

```js
exports.DataSet = require('./lib/DataSet');
exports.Timeline = require('./lib/timeline/Timeline');
```

Then create a custom bundle using browserify, like:

    $ browserify custom.js -t [ babelify --presets [es2015] ] -o dist/vis-custom.js -s vis

This will generate a custom bundle *vis-custom.js*, which exposes the namespace `vis` containing only `DataSet` and `Timeline`. The generated bundle can be minified using uglifyjs:

    $ uglifyjs dist/vis-custom.js -o dist/vis-custom.min.js

The custom bundle can now be loaded like:

```html
<!DOCTYPE HTML>
<html>
<head>
  <script src="dist/vis-custom.min.js"></script>
  <link href="dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  ...
</body>
</html>
```

#### Example 2: Exclude external libraries

The default bundle `vis.js` is standalone and includes external dependencies such as *hammer.js* and *moment.js*. When these libraries are already loaded by the application, vis.js does not need to include these dependencies itself too. To build a custom bundle of vis.js excluding *moment.js* and *hammer.js*, run browserify in the root of the project:

    $ browserify index.js -t [ babelify --presets [es2015] ] -o dist/vis-custom.js -s vis -x moment -x hammerjs

This will generate a custom bundle *vis-custom.js*, which exposes the namespace `vis`, and has *moment.js* and *hammer.js* excluded. The generated bundle can be minified with uglifyjs:

    $ uglifyjs dist/vis-custom.js -o dist/vis-custom.min.js

The custom bundle can now be loaded as:

```html
<!DOCTYPE HTML>
<html>
<head>
  <!-- load external dependencies -->
  <script src="http://cdnjs.cloudflare.com/ajax/libs/moment.js/2.17.1/moment.min.js"></script>
  <script src="http://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"></script>

  <!-- load vis.js -->
  <script src="dist/vis-custom.min.js"></script>
  <link href="dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  ...
</body>
</html>
```

#### Example 3: Bundle vis.js as part of your (commonjs) application

When writing a web application with commonjs modules, vis.js can be packaged automatically into the application. Create a file **app.js** containing:

```js
var moment = require('moment');
var DataSet = require('vis/lib/DataSet');
var Timeline = require('vis/lib/timeline/Timeline');

var container = document.getElementById('visualization');
var data = new DataSet([
  {id: 1, content: 'item 1', start: moment('2013-04-20')},
  {id: 2, content: 'item 2', start: moment('2013-04-14')},
  {id: 3, content: 'item 3', start: moment('2013-04-18')},
  {id: 4, content: 'item 4', start: moment('2013-04-16'), end: moment('2013-04-19')},
  {id: 5, content: 'item 5', start: moment('2013-04-25')},
  {id: 6, content: 'item 6', start: moment('2013-04-27')}
]);
var options = {};
var timeline = new Timeline(container, data, options);
```

The application can be bundled and minified:

    $ browserify app.js -o dist/app-bundle.js -t babelify
    $ uglifyjs dist/app-bundle.js -o dist/app-bundle.min.js

And loaded into a webpage:

```html
<!DOCTYPE HTML>
<html>
<head>
  <link href="node_modules/vis/dist/vis.min.css" rel="stylesheet" type="text/css" />
</head>
<body>
  <div id="visualization"></div>
  <script src="dist/app-bundle.min.js"></script>
</body>
</html>
```

#### Example 4: Integrate vis.js components directly in your webpack build

You can integrate e.g. the timeline component directly in you webpack build.
Therefor you can e.g. import the component-files from root direcory (starting with "index-").

```js
import { DataSet, Timeline } from 'vis/index-timeline-graph2d';

var container = document.getElementById('visualization');
var data = new DataSet();
var timeline = new Timeline(container, data, {});
```

To get this to work you'll need to add some babel-loader-setting to your webpack-config:

```js
module: {
  module: {
    rules: [{
      test: /node_modules[\\\/]vis[\\\/].*\.js$/,
      loader: 'babel-loader',
      query: {
        cacheDirectory: true,
        presets: [ "babel-preset-es2015" ].map(require.resolve),
        plugins: [
          "transform-es3-property-literals", // #2452
          "transform-es3-member-expression-literals", // #2566
          "transform-runtime" // #2566
        ]
      }
    }]
  }
}
```

There is also an [demo-project](https://github.com/mojoaxel/vis-webpack-demo) showing the integration of vis.js using webpack.

## Test

To test the library, install the project dependencies once:

    $ npm install

Then run the tests:

    $ npm run test

## License

Copyright (C) 2010-2017 Almende B.V. and Contributors

Vis.js is dual licensed under both

  * The Apache 2.0 License
    http://www.apache.org/licenses/LICENSE-2.0

and

  * The MIT License
    http://opensource.org/licenses/MIT

Vis.js may be distributed under either license.
