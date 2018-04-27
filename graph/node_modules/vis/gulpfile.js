var fs = require('fs');
var async = require('async');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var webpack = require('webpack');
var uglify = require('uglify-js');
var rimraf = require('rimraf');
var argv = require('yargs').argv;

var ENTRY             = './index.js';
var HEADER            = './lib/header.js';
var DIST              = __dirname + '/dist';
var VIS_JS            = 'vis.js';
var VIS_MAP           = 'vis.map';
var VIS_MIN_JS        = 'vis.min.js';
var VIS_CSS           = 'vis.css';
var VIS_MIN_CSS       = 'vis.min.css';
var INDIVIDUAL_JS_BUNDLES = [
  {entry: './index-timeline-graph2d.js', filename: 'vis-timeline-graph2d.min.js'},
  {entry: './index-network.js', filename: 'vis-network.min.js'},
  {entry: './index-graph3d.js', filename: 'vis-graph3d.min.js'}
];
var INDIVIDUAL_CSS_BUNDLES = [
  {entry: ['./lib/shared/**/*.css', './lib/timeline/**/*.css'], filename: 'vis-timeline-graph2d.min.css'},
  {entry: ['./lib/shared/**/*.css', './lib/network/**/*.css'], filename: 'vis-network.min.css'}
];

// generate banner with today's date and correct version
function createBanner() {
  var today = gutil.date(new Date(), 'yyyy-mm-dd'); // today, formatted as yyyy-mm-dd
  var version = require('./package.json').version;

  return String(fs.readFileSync(HEADER))
      .replace('@@date', today)
      .replace('@@version', version);
}

var bannerPlugin = new webpack.BannerPlugin({
  banner: createBanner(),
  entryOnly: true,
  raw: true
});

var webpackModule = {
  loaders: [
    {
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        cacheDirectory: true, // use cache to improve speed
        babelrc: true // use the .baberc file
      }
    }
  ],

  // exclude requires of moment.js language files
  wrappedContextRegExp: /$^/
};

var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'vis',
    libraryTarget: 'umd',
    path: DIST,
    filename: VIS_JS,
    sourcePrefix: '  '
  },
  module: webpackModule,
  plugins: [ bannerPlugin ],
  cache: true,

  // generate details sourcempas of webpack modules
  //devtool: 'source-map'

  //debug: true,
  //bail: true
};

var uglifyConfig = {
  outSourceMap: VIS_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);

function handleCompilerCallback (err, stats) {
  if (err) {
    gutil.log(err.toString());
  }

  if (stats && stats.compilation && stats.compilation.errors) {
    // output soft errors
    stats.compilation.errors.forEach(function (err) {
      gutil.log(err.toString());
    });

    if (err || stats.compilation.errors.length > 0) {
      gutil.beep(); // TODO: this does not work on my system
    }
  }
}

// clean the dist/img directory
gulp.task('clean', function (cb) {
  rimraf(DIST + '/img', cb);
});

gulp.task('bundle-js', function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  compiler.run(function (err, stats) {
    handleCompilerCallback(err, stats);
    cb();
  });
});

// create individual bundles for timeline+graph2d, network, graph3d
gulp.task('bundle-js-individual', function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  async.each(INDIVIDUAL_JS_BUNDLES, function (item, callback) {
    var webpackTimelineConfig = {
      entry: item.entry,
      output: {
        library: 'vis',
        libraryTarget: 'umd',
        path: DIST,
        filename: item.filename,
        sourcePrefix: '  '
      },
      module: webpackModule,
      plugins: [ bannerPlugin, new webpack.optimize.UglifyJsPlugin() ],
      cache: true
    };

    var compiler = webpack(webpackTimelineConfig);
    compiler.run(function (err, stats) {
      handleCompilerCallback(err, stats);
      callback();
    });
  }, cb);

});

// bundle and minify css
gulp.task('bundle-css', function () {
  return gulp.src('./lib/**/*.css')
      .pipe(concat(VIS_CSS))
      .pipe(gulp.dest(DIST))
      // TODO: nicer to put minifying css in a separate task?
      .pipe(cleanCSS())
      .pipe(rename(VIS_MIN_CSS))
      .pipe(gulp.dest(DIST));
});

// bundle and minify individual css
gulp.task('bundle-css-individual', function (cb) {
  async.each(INDIVIDUAL_CSS_BUNDLES, function (item, callback) {
    return gulp.src(item.entry)
        .pipe(concat(item.filename))
        .pipe(cleanCSS())
        .pipe(rename(item.filename))
        .pipe(gulp.dest(DIST))
        .on('end', callback);
  }, cb);
});

gulp.task('copy', ['clean'], function () {
    var network = gulp.src('./lib/network/img/**/*')
      .pipe(gulp.dest(DIST + '/img/network'));

    return network;
});

gulp.task('minify', ['bundle-js'], function (cb) {
  var result = uglify.minify([DIST + '/' + VIS_JS], uglifyConfig);

  // note: we add a newline '\n' to the end of the minified file to prevent
  //       any issues when concatenating the file downstream (the file ends
  //       with a comment).
  fs.writeFileSync(DIST + '/' + VIS_MIN_JS, result.code + '\n');
  fs.writeFileSync(DIST + '/' + VIS_MAP, result.map.replace(/"\.\/dist\//g, '"'));

  cb();
});

gulp.task('bundle', ['bundle-js', 'bundle-js-individual', 'bundle-css', 'bundle-css-individual', 'copy']);

// read command line arguments --bundle and --minify
var bundle = 'bundle' in argv;
var minify = 'minify' in argv;
var watchTasks = [];
if (bundle || minify) {
  // do bundling and/or minifying only when specified on the command line
  watchTasks = [];
  if (bundle) watchTasks.push('bundle');
  if (minify) watchTasks.push('minify');
}
else {
  // by default, do both bundling and minifying
  watchTasks = ['bundle', 'minify'];
}

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', watchTasks, function () {
  gulp.watch(['index.js', 'lib/**/*'], watchTasks);
});


//
// Linting usage:
//
//    > gulp lint
// or > npm run lint
//
gulp.task('lint', function () {
  return gulp.src(['lib/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


// The default task (called when you run `gulp`)
gulp.task('default', ['clean', 'bundle', 'minify']);
