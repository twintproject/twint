# Frequently Asked Questions

## Why does the menubar appear when running in development mode, but disappear when packaged?

Based on [a comment from **@MarshallOfSound**](https://github.com/electron-userland/electron-packager/issues/553#issuecomment-270805213):

When you're running in "development mode" (for example, `electron /path/to/app`), Electron uses the
`default_app` codepath to run your app, which also provides a default menubar. When the app is
packaged, Electron runs your app directly. To have a menubar that's consistent between development
and packaged modes, you'll need to [define it yourself](https://electron.atom.io/docs/api/menu/).

## Why isn't my `ignore` option working?

As stated in the documentation for [`ignore`](https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#ignore), it uses "[one] or more additional
[regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
patterns. […] Please note that [glob patterns](https://en.wikipedia.org/wiki/Glob_%28programming%29)
will not work."

## Why isn't the relative path in my app code working?

To make a path work in both development and packaged mode, you'll need to generate a path based on
the location of the JavaScript file that is referencing the file. For example, if you had an app
structure like the following:

```
AppName
├── package.json
├── data
│   └── somedata.json
└── src
    └── main.js
```

In `src/main.js`, you would access `data/somedata.json` similar to this:

```javascript
const path = require('path');
const jsonFilename = path.resolve(__dirname, '..', 'data', 'somedata.json');
console.log(require(jsonFilename));
```

## How do I set an icon on Linux?

The docs for [`icon`](https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#icon)
already show how to set an icon on your `BrowserWindow`, but your dock/taskbar may not use that and
instead use the `Icon` value in your `.desktop` file. The [Linux distributable creators](https://github.com/electron-userland/electron-packager#distributable-creators)
can help you set/distribute the appropriate icon in that case.
