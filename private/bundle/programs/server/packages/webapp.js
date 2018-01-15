(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var exports, WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/webapp_server.js                                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
const module1 = module;
module1.export({
  WebApp: () => WebApp,
  WebAppInternals: () => WebAppInternals
});
let assert;
module1.watch(require("assert"), {
  default(v) {
    assert = v;
  }

}, 0);
let readFile;
module1.watch(require("fs"), {
  readFile(v) {
    readFile = v;
  }

}, 1);
let createServer;
module1.watch(require("http"), {
  createServer(v) {
    createServer = v;
  }

}, 2);
let pathJoin, pathDirname;
module1.watch(require("path"), {
  join(v) {
    pathJoin = v;
  },

  dirname(v) {
    pathDirname = v;
  }

}, 3);
let parseUrl;
module1.watch(require("url"), {
  parse(v) {
    parseUrl = v;
  }

}, 4);
let createHash;
module1.watch(require("crypto"), {
  createHash(v) {
    createHash = v;
  }

}, 5);
let connect;
module1.watch(require("connect"), {
  default(v) {
    connect = v;
  }

}, 6);
let parseRequest;
module1.watch(require("parseurl"), {
  default(v) {
    parseRequest = v;
  }

}, 7);
let lookupUserAgent;
module1.watch(require("useragent"), {
  lookup(v) {
    lookupUserAgent = v;
  }

}, 8);
let send;
module1.watch(require("send"), {
  default(v) {
    send = v;
  }

}, 9);
let removeExistingSocketFile, registerSocketFileCleanup;
module1.watch(require("./socket_file.js"), {
  removeExistingSocketFile(v) {
    removeExistingSocketFile = v;
  },

  registerSocketFileCleanup(v) {
    registerSocketFileCleanup = v;
  }

}, 10);
var SHORT_SOCKET_TIMEOUT = 5 * 1000;
var LONG_SOCKET_TIMEOUT = 120 * 1000;
const WebApp = {};
const WebAppInternals = {};
WebAppInternals.NpmModules = {
  connect: {
    version: Npm.require('connect/package.json').version,
    module: connect
  }
};
WebApp.defaultArch = 'web.browser'; // XXX maps archs to manifests

WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem

var archPath = {};

var bundledJsCssUrlRewriteHook = function (url) {
  var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
  return bundledPrefix + url;
};

var sha1 = function (contents) {
  var hash = createHash('sha1');
  hash.update(contents);
  return hash.digest('hex');
};

var readUtf8FileSync = function (filename) {
  return Meteor.wrapAsync(readFile)(filename, 'utf8');
}; // #BrowserIdentification
//
// We have multiple places that want to identify the browser: the
// unsupported browser page, the appcache package, and, eventually
// delivering browser polyfills only as needed.
//
// To avoid detecting the browser in multiple places ad-hoc, we create a
// Meteor "browser" object. It uses but does not expose the npm
// useragent module (we could choose a different mechanism to identify
// the browser in the future if we wanted to).  The browser object
// contains
//
// * `name`: the name of the browser in camel case
// * `major`, `minor`, `patch`: integers describing the browser version
//
// Also here is an early version of a Meteor `request` object, intended
// to be a high-level description of the request without exposing
// details of connect's low-level `req`.  Currently it contains:
//
// * `browser`: browser identification object described above
// * `url`: parsed url, including parsed query params
//
// As a temporary hack there is a `categorizeRequest` function on WebApp which
// converts a connect `req` to a Meteor `request`. This can go away once smart
// packages such as appcache are being passed a `request` object directly when
// they serve content.
//
// This allows `request` to be used uniformly: it is passed to the html
// attributes hook, and the appcache package can use it when deciding
// whether to generate a 404 for the manifest.
//
// Real routing / server side rendering will probably refactor this
// heavily.
// e.g. "Mobile Safari" => "mobileSafari"


var camelCase = function (name) {
  var parts = name.split(' ');
  parts[0] = parts[0].toLowerCase();

  for (var i = 1; i < parts.length; ++i) {
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);
  }

  return parts.join('');
};

var identifyBrowser = function (userAgentString) {
  var userAgent = lookupUserAgent(userAgentString);
  return {
    name: camelCase(userAgent.family),
    major: +userAgent.major,
    minor: +userAgent.minor,
    patch: +userAgent.patch
  };
}; // XXX Refactor as part of implementing real routing.


WebAppInternals.identifyBrowser = identifyBrowser;

WebApp.categorizeRequest = function (req) {
  return _.extend({
    browser: identifyBrowser(req.headers['user-agent']),
    url: parseUrl(req.url, true)
  }, _.pick(req, 'dynamicHead', 'dynamicBody'));
}; // HTML attribute hooks: functions to be called to determine any attributes to
// be added to the '<html>' tag. Each function is passed a 'request' object (see
// #BrowserIdentification) and should return null or object.


var htmlAttributeHooks = [];

var getHtmlAttributes = function (request) {
  var combinedAttributes = {};

  _.each(htmlAttributeHooks || [], function (hook) {
    var attributes = hook(request);
    if (attributes === null) return;
    if (typeof attributes !== 'object') throw Error("HTML attribute hook must return null or object");

    _.extend(combinedAttributes, attributes);
  });

  return combinedAttributes;
};

WebApp.addHtmlAttributeHook = function (hook) {
  htmlAttributeHooks.push(hook);
}; // Serve app HTML for this URL?


var appUrl = function (url) {
  if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.

  if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.

  if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default

  return true;
}; // We need to calculate the client hash after all packages have loaded
// to give them a chance to populate __meteor_runtime_config__.
//
// Calculating the hash during startup means that packages can only
// populate __meteor_runtime_config__ during load, not during startup.
//
// Calculating instead it at the beginning of main after all startup
// hooks had run would allow packages to also populate
// __meteor_runtime_config__ during startup, but that's too late for
// autoupdate because it needs to have the client hash at startup to
// insert the auto update version itself into
// __meteor_runtime_config__ to get it to the client.
//
// An alternative would be to give autoupdate a "post-start,
// pre-listen" hook to allow it to insert the auto update version at
// the right moment.


Meteor.startup(function () {
  var calculateClientHash = WebAppHashing.calculateClientHash;

  WebApp.clientHash = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest);
  };

  WebApp.calculateClientHashRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name === "css";
    });
  };

  WebApp.calculateClientHashNonRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name !== "css";
    });
  };

  WebApp.calculateClientHashCordova = function () {
    var archName = 'web.cordova';
    if (!WebApp.clientPrograms[archName]) return 'none';
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS'));
  };
}); // When we have a request pending, we want the socket timeout to be long, to
// give ourselves a while to serve it, and to allow sockjs long polls to
// complete.  On the other hand, we want to close idle sockets relatively
// quickly, so that we can shut down relatively promptly but cleanly, without
// cutting off anyone's response.

WebApp._timeoutAdjustmentRequestCallback = function (req, res) {
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
  req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
  // the response from the socket.

  var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.
  // https://github.com/joyent/node/commit/7c9b6070
  // But it has switched back to 'finish' in Node v4:
  // https://github.com/nodejs/node/pull/1411

  res.removeAllListeners('finish');
  res.on('finish', function () {
    res.setTimeout(SHORT_SOCKET_TIMEOUT);
  });

  _.each(finishListeners, function (l) {
    res.on('finish', l);
  });
}; // Will be updated by main before we listen.
// Map from client arch to boilerplate object.
// Boilerplate object has:
//   - func: XXX
//   - baseData: XXX


var boilerplateByArch = {}; // Register a callback function that can selectively modify boilerplate
// data given arguments (request, data, arch). The key should be a unique
// identifier, to prevent accumulating duplicate callbacks from the same
// call site over time. Callbacks will be called in the order they were
// registered. A callback should return false if it did not make any
// changes affecting the boilerplate. Passing null deletes the callback.
// Any previous callback registered for this key will be returned.

const boilerplateDataCallbacks = Object.create(null);

WebAppInternals.registerBoilerplateDataCallback = function (key, callback) {
  const previousCallback = boilerplateDataCallbacks[key];

  if (typeof callback === "function") {
    boilerplateDataCallbacks[key] = callback;
  } else {
    assert.strictEqual(callback, null);
    delete boilerplateDataCallbacks[key];
  } // Return the previous callback in case the new callback needs to call
  // it; for example, when the new callback is a wrapper for the old.


  return previousCallback || null;
}; // Given a request (as returned from `categorizeRequest`), return the
// boilerplate HTML to serve for that request.
//
// If a previous connect middleware has rendered content for the head or body,
// returns the boilerplate with that content patched in otherwise
// memoizes on HTML attributes (used by, eg, appcache) and whether inline
// scripts are currently allowed.
// XXX so far this function is always called with arch === 'web.browser'


var memoizedBoilerplate = {};

function getBoilerplate(request, arch) {
  return getBoilerplateAsync(request, arch).await();
}

function getBoilerplateAsync(request, arch) {
  const boilerplate = boilerplateByArch[arch];
  const data = Object.assign({}, boilerplate.baseData, {
    htmlAttributes: getHtmlAttributes(request)
  }, _.pick(request, "dynamicHead", "dynamicBody"));
  let madeChanges = false;
  let promise = Promise.resolve();
  Object.keys(boilerplateDataCallbacks).forEach(key => {
    promise = promise.then(() => {
      const callback = boilerplateDataCallbacks[key];
      return callback(request, data, arch);
    }).then(result => {
      // Callbacks should return false if they did not make any changes.
      if (result !== false) {
        madeChanges = true;
      }
    });
  });
  return promise.then(() => {
    const useMemoized = !(data.dynamicHead || data.dynamicBody || madeChanges);

    if (!useMemoized) {
      return boilerplate.toHTML(data);
    } // The only thing that changes from request to request (unless extra
    // content is added to the head or body, or boilerplateDataCallbacks
    // modified the data) are the HTML attributes (used by, eg, appcache)
    // and whether inline scripts are allowed, so memoize based on that.


    var memHash = JSON.stringify({
      inlineScriptsAllowed,
      htmlAttributes: data.htmlAttributes,
      arch
    });

    if (!memoizedBoilerplate[memHash]) {
      memoizedBoilerplate[memHash] = boilerplateByArch[arch].toHTML(data);
    }

    return memoizedBoilerplate[memHash];
  });
}

WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {
  additionalOptions = additionalOptions || {};

  var runtimeConfig = _.extend(_.clone(__meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {});

  return new Boilerplate(arch, manifest, _.extend({
    pathMapper: function (itemPath) {
      return pathJoin(archPath[arch], itemPath);
    },
    baseDataExtension: {
      additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {
        return {
          pathname: pathname,
          contents: contents
        };
      }),
      // Convert to a JSON string, then get rid of most weird characters, then
      // wrap in double quotes. (The outermost JSON.stringify really ought to
      // just be "wrap in double quotes" but we use it to be safe.) This might
      // end up inside a <script> tag so we need to be careful to not include
      // "</script>", but normal {{spacebars}} escaping escapes too much! See
      // https://github.com/meteor/meteor/issues/3730
      meteorRuntimeConfig: JSON.stringify(encodeURIComponent(JSON.stringify(runtimeConfig))),
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
      bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
      inline: additionalOptions.inline
    }
  }, additionalOptions));
}; // A mapping from url path to "info". Where "info" has the following fields:
// - type: the type of file to be served
// - cacheable: optionally, whether the file should be cached or not
// - sourceMapUrl: optionally, the url of the source map
//
// Info also contains one of the following:
// - content: the stringified content that should be served at this path
// - absolutePath: the absolute path on disk to the file


var staticFiles; // Serve static files from the manifest or added with
// `addStaticJs`. Exported for tests.

WebAppInternals.staticFilesMiddleware = function (staticFiles, req, res, next) {
  if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {
    next();
    return;
  }

  var pathname = parseRequest(req).pathname;

  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) {
    next();
    return;
  }

  var serveStaticJs = function (s) {
    res.writeHead(200, {
      'Content-type': 'application/javascript; charset=UTF-8'
    });
    res.write(s);
    res.end();
  };

  if (pathname === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs("__meteor_runtime_config__ = " + JSON.stringify(__meteor_runtime_config__) + ";");
    return;
  } else if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs(additionalStaticJs[pathname]);
    return;
  }

  if (!_.has(staticFiles, pathname)) {
    next();
    return;
  } // We don't need to call pause because, unlike 'static', once we call into
  // 'send' and yield to the event loop, we never call another handler with
  // 'next'.


  var info = staticFiles[pathname]; // Cacheable files are files that should never change. Typically
  // named by their hash (eg meteor bundled js and css files).
  // We cache them ~forever (1yr).

  var maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0; // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
  // understand.  (The SourceMap header is slightly more spec-correct but FF
  // doesn't understand it.)
  //
  // You may also need to enable source maps in Chrome: open dev tools, click
  // the gear in the bottom right corner, and select "enable source maps".

  if (info.sourceMapUrl) {
    res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
  }

  if (info.type === "js" || info.type === "dynamic js") {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  } else if (info.type === "css") {
    res.setHeader("Content-Type", "text/css; charset=UTF-8");
  } else if (info.type === "json") {
    res.setHeader("Content-Type", "application/json; charset=UTF-8");
  }

  if (info.hash) {
    res.setHeader('ETag', '"' + info.hash + '"');
  }

  if (info.content) {
    res.write(info.content);
    res.end();
  } else {
    send(req, info.absolutePath, {
      maxage: maxAge,
      dotfiles: 'allow',
      // if we specified a dotfile in the manifest, serve it
      lastModified: false // don't set last-modified based on the file date

    }).on('error', function (err) {
      Log.error("Error serving static file " + err);
      res.writeHead(500);
      res.end();
    }).on('directory', function () {
      Log.error("Unexpected directory " + info.absolutePath);
      res.writeHead(500);
      res.end();
    }).pipe(res);
  }
};

var getUrlPrefixForArch = function (arch) {
  // XXX we rely on the fact that arch names don't contain slashes
  // in that case we would need to uri escape it
  // We add '__' to the beginning of non-standard archs to "scope" the url
  // to Meteor internals.
  return arch === WebApp.defaultArch ? '' : '/' + '__' + arch.replace(/^web\./, '');
}; // Parse the passed in port value. Return the port as-is if it's a String
// (e.g. a Windows Server style named pipe), otherwise return the port as an
// integer.
//
// DEPRECATED: Direct use of this function is not recommended; it is no
// longer used internally, and will be removed in a future release.


WebAppInternals.parsePort = port => {
  let parsedPort = parseInt(port);

  if (Number.isNaN(parsedPort)) {
    parsedPort = port;
  }

  return parsedPort;
};

function runWebAppServer() {
  var shuttingDown = false;
  var syncQueue = new Meteor._SynchronousQueue();

  var getItemPathname = function (itemUrl) {
    return decodeURIComponent(parseUrl(itemUrl).pathname);
  };

  WebAppInternals.reloadClientPrograms = function () {
    syncQueue.runTask(function () {
      staticFiles = {};

      var generateClientProgram = function (clientPath, arch) {
        // read the control for the client we'll be serving up
        var clientJsonPath = pathJoin(__meteor_bootstrap__.serverDir, clientPath);
        var clientDir = pathDirname(clientJsonPath);
        var clientJson = JSON.parse(readUtf8FileSync(clientJsonPath));
        if (clientJson.format !== "web-program-pre1") throw new Error("Unsupported format for client assets: " + JSON.stringify(clientJson.format));
        if (!clientJsonPath || !clientDir || !clientJson) throw new Error("Client config file not parsed.");
        var urlPrefix = getUrlPrefixForArch(arch);
        var manifest = clientJson.manifest;

        _.each(manifest, function (item) {
          if (item.url && item.where === "client") {
            staticFiles[urlPrefix + getItemPathname(item.url)] = {
              absolutePath: pathJoin(clientDir, item.path),
              cacheable: item.cacheable,
              hash: item.hash,
              // Link from source to its map
              sourceMapUrl: item.sourceMapUrl,
              type: item.type
            };

            if (item.sourceMap) {
              // Serve the source map too, under the specified URL. We assume all
              // source maps are cacheable.
              staticFiles[urlPrefix + getItemPathname(item.sourceMapUrl)] = {
                absolutePath: pathJoin(clientDir, item.sourceMap),
                cacheable: true
              };
            }
          }
        });

        var program = {
          format: "web-program-pre1",
          manifest: manifest,
          version: process.env.AUTOUPDATE_VERSION || WebAppHashing.calculateClientHash(manifest, null, _.pick(__meteor_runtime_config__, "PUBLIC_SETTINGS")),
          cordovaCompatibilityVersions: clientJson.cordovaCompatibilityVersions,
          PUBLIC_SETTINGS: __meteor_runtime_config__.PUBLIC_SETTINGS
        };
        WebApp.clientPrograms[arch] = program; // Serve the program as a string at /foo/<arch>/manifest.json
        // XXX change manifest.json -> program.json

        staticFiles[urlPrefix + getItemPathname('/manifest.json')] = {
          content: JSON.stringify(program),
          cacheable: false,
          hash: program.version,
          type: "json"
        };
      };

      try {
        var clientPaths = __meteor_bootstrap__.configJson.clientPaths;

        _.each(clientPaths, function (clientPath, arch) {
          archPath[arch] = pathDirname(clientPath);
          generateClientProgram(clientPath, arch);
        }); // Exported for tests.


        WebAppInternals.staticFiles = staticFiles;
      } catch (e) {
        Log.error("Error reloading the client program: " + e.stack);
        process.exit(1);
      }
    });
  };

  WebAppInternals.generateBoilerplate = function () {
    // This boilerplate will be served to the mobile devices when used with
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by
    // the device's server, it is important to set the DDP url to the actual
    // Meteor server accepting DDP connections and not the device's file server.
    var defaultOptionsForArch = {
      'web.cordova': {
        runtimeConfigOverrides: {
          // XXX We use absoluteUrl() here so that we serve https://
          // URLs to cordova clients if force-ssl is in use. If we were
          // to use __meteor_runtime_config__.ROOT_URL instead of
          // absoluteUrl(), then Cordova clients would immediately get a
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to
          // http://example.meteor.com. This breaks the app, because
          // force-ssl doesn't serve CORS headers on 302
          // redirects. (Plus it's undesirable to have clients
          // connecting to http://example.meteor.com when force-ssl is
          // in use.)
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
        }
      }
    };
    syncQueue.runTask(function () {
      _.each(WebApp.clientPrograms, function (program, archName) {
        boilerplateByArch[archName] = WebAppInternals.generateBoilerplateInstance(archName, program.manifest, defaultOptionsForArch[archName]);
      }); // Clear the memoized boilerplate cache.


      memoizedBoilerplate = {}; // Configure CSS injection for the default arch
      // XXX implement the CSS injection for all archs?

      var cssFiles = boilerplateByArch[WebApp.defaultArch].baseData.css; // Rewrite all CSS files (which are written directly to <style> tags)
      // by autoupdate_client to use the CDN prefix/etc

      var allCss = _.map(cssFiles, function (cssFile) {
        return {
          url: bundledJsCssUrlRewriteHook(cssFile.url)
        };
      });

      WebAppInternals.refreshableAssets = {
        allCss
      };
    });
  };

  WebAppInternals.reloadClientPrograms(); // webserver

  var app = connect(); // Packages and apps can add handlers that run before any other Meteor
  // handlers via WebApp.rawConnectHandlers.

  var rawConnectHandlers = connect();
  app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

  app.use(connect.compress()); // We're not a proxy; reject (without crashing) attempts to treat us like
  // one. (See #1212.)

  app.use(function (req, res, next) {
    if (RoutePolicy.isValidUrl(req.url)) {
      next();
      return;
    }

    res.writeHead(400);
    res.write("Not a proxy");
    res.end();
  }); // Strip off the path prefix, if it exists.

  app.use(function (request, response, next) {
    var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;

    var url = Npm.require('url').parse(request.url);

    var pathname = url.pathname; // check if the path in the url starts with the path prefix (and the part
    // after the path prefix must start with a / if it exists.)

    if (pathPrefix && pathname.substring(0, pathPrefix.length) === pathPrefix && (pathname.length == pathPrefix.length || pathname.substring(pathPrefix.length, pathPrefix.length + 1) === "/")) {
      request.url = request.url.substring(pathPrefix.length);
      next();
    } else if (pathname === "/favicon.ico" || pathname === "/robots.txt") {
      next();
    } else if (pathPrefix) {
      response.writeHead(404);
      response.write("Unknown path");
      response.end();
    } else {
      next();
    }
  }); // Parse the query string into res.query. Used by oauth_server, but it's
  // generally pretty handy..

  app.use(connect.query()); // Serve static files from the manifest.
  // This is inspired by the 'static' middleware.

  app.use(function (req, res, next) {
    Promise.resolve().then(() => {
      WebAppInternals.staticFilesMiddleware(staticFiles, req, res, next);
    });
  }); // Packages and apps can add handlers to this via WebApp.connectHandlers.
  // They are inserted before our default handler.

  var packageAndAppHandlers = connect();
  app.use(packageAndAppHandlers);
  var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
  // inside packageAndAppHandlers.)

  app.use(function (err, req, res, next) {
    if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {
      next(err);
      return;
    }

    res.writeHead(err.status, {
      'Content-Type': 'text/plain'
    });
    res.end("An error message");
  });
  app.use(function (req, res, next) {
    Promise.resolve().then(() => {
      if (!appUrl(req.url)) {
        return next();
      }

      var headers = {
        'Content-Type': 'text/html; charset=utf-8'
      };

      if (shuttingDown) {
        headers['Connection'] = 'Close';
      }

      var request = WebApp.categorizeRequest(req);

      if (request.url.query && request.url.query['meteor_css_resource']) {
        // In this case, we're requesting a CSS resource in the meteor-specific
        // way, but we don't have it.  Serve a static css file that indicates that
        // we didn't have it, so we can detect that and refresh.  Make sure
        // that any proxies or CDNs don't cache this error!  (Normally proxies
        // or CDNs are smart enough not to cache error pages, but in order to
        // make this hack work, we need to return the CSS file as a 200, which
        // would otherwise be cached.)
        headers['Content-Type'] = 'text/css; charset=utf-8';
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(200, headers);
        res.write(".meteor-css-not-found-error { width: 0px;}");
        res.end();
        return;
      }

      if (request.url.query && request.url.query['meteor_js_resource']) {
        // Similarly, we're requesting a JS resource that we don't have.
        // Serve an uncached 404. (We can't use the same hack we use for CSS,
        // because actually acting on that hack requires us to have the JS
        // already!)
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(404, headers);
        res.end("404 Not Found");
        return;
      }

      if (request.url.query && request.url.query['meteor_dont_serve_index']) {
        // When downloading files during a Cordova hot code push, we need
        // to detect if a file is not available instead of inadvertently
        // downloading the default index page.
        // So similar to the situation above, we serve an uncached 404.
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(404, headers);
        res.end("404 Not Found");
        return;
      } // /packages/asdfsad ... /__cordova/dafsdf.js


      var pathname = parseRequest(req).pathname;
      var archKey = pathname.split('/')[1];
      var archKeyCleaned = 'web.' + archKey.replace(/^__/, '');

      if (!/^__/.test(archKey) || !_.has(archPath, archKeyCleaned)) {
        archKey = WebApp.defaultArch;
      } else {
        archKey = archKeyCleaned;
      }

      return getBoilerplateAsync(request, archKey).then(boilerplate => {
        var statusCode = res.statusCode ? res.statusCode : 200;
        res.writeHead(statusCode, headers);
        res.write(boilerplate);
        res.end();
      }, error => {
        Log.error("Error running template: " + error.stack);
        res.writeHead(500, headers);
        res.end();
      });
    });
  }); // Return 404 by default, if no other handlers serve this URL.

  app.use(function (req, res) {
    res.writeHead(404);
    res.end();
  });
  var httpServer = createServer(app);
  var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
  // there's an outstanding request, give it a higher timeout instead (to avoid
  // killing long-polling requests)

  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because
  // stream_server.js kills all the current request handlers when installing its
  // own.

  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
  // socket. This lets load balancers in front of us differentiate between "a
  // server is randomly closing sockets for no reason" and "client sent a bad
  // request".
  //
  // This will only work on Node 6; Node 4 destroys the socket before calling
  // this event. See https://github.com/nodejs/node/pull/4557/ for details.

  httpServer.on('clientError', (err, socket) => {
    // Pre-Node-6, do nothing.
    if (socket.destroyed) {
      return;
    }

    if (err.message === 'Parse Error') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } else {
      // For other errors, use the default behavior as if we had no clientError
      // handler.
      socket.destroy(err);
    }
  }); // start up app

  _.extend(WebApp, {
    connectHandlers: packageAndAppHandlers,
    rawConnectHandlers: rawConnectHandlers,
    httpServer: httpServer,
    connectApp: app,
    // For testing.
    suppressConnectErrors: function () {
      suppressConnectErrors = true;
    },
    onListening: function (f) {
      if (onListeningCallbacks) onListeningCallbacks.push(f);else f();
    }
  }); // Let the rest of the packages (and Meteor.startup hooks) insert connect
  // middlewares and update __meteor_runtime_config__, then keep going to set up
  // actually serving HTML.


  exports.main = argv => {
    WebAppInternals.generateBoilerplate();

    const startHttpServer = listenOptions => {
      httpServer.listen(listenOptions, Meteor.bindEnvironment(() => {
        if (process.env.METEOR_PRINT_ON_LISTEN) {
          console.log("LISTENING");
        }

        const callbacks = onListeningCallbacks;
        onListeningCallbacks = null;
        callbacks.forEach(callback => {
          callback();
        });
      }, e => {
        console.error("Error listening:", e);
        console.error(e && e.stack);
      }));
    };

    let localPort = process.env.PORT || 0;
    const unixSocketPath = process.env.UNIX_SOCKET_PATH;

    if (unixSocketPath) {
      // Start the HTTP server using a socket file.
      removeExistingSocketFile(unixSocketPath);
      startHttpServer({
        path: unixSocketPath
      });
      registerSocketFileCleanup(unixSocketPath);
    } else {
      localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);

      if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
        // Start the HTTP server using Windows Server style named pipe.
        startHttpServer({
          path: localPort
        });
      } else if (typeof localPort === "number") {
        // Start the HTTP server using TCP.
        startHttpServer({
          port: localPort,
          host: process.env.BIND_IP || "0.0.0.0"
        });
      } else {
        throw new Error("Invalid PORT specified");
      }
    }

    return "DAEMON";
  };
}

runWebAppServer();
var inlineScriptsAllowed = true;

WebAppInternals.inlineScriptsAllowed = function () {
  return inlineScriptsAllowed;
};

WebAppInternals.setInlineScriptsAllowed = function (value) {
  inlineScriptsAllowed = value;
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {
  bundledJsCssUrlRewriteHook = hookFn;
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssPrefix = function (prefix) {
  var self = this;
  self.setBundledJsCssUrlRewriteHook(function (url) {
    return prefix + url;
  });
}; // Packages can call `WebAppInternals.addStaticJs` to specify static
// JavaScript to be included in the app. This static JS will be inlined,
// unless inline scripts have been disabled, in which case it will be
// served under `/<sha1 of contents>`.


var additionalStaticJs = {};

WebAppInternals.addStaticJs = function (contents) {
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;
}; // Exported for tests


WebAppInternals.getBoilerplate = getBoilerplate;
WebAppInternals.additionalStaticJs = additionalStaticJs;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/socket_file.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.watch(require("fs"), {
  statSync(v) {
    statSync = v;
  },

  unlinkSync(v) {
    unlinkSync = v;
  },

  existsSync(v) {
    existsSync = v;
  }

}, 0);

const removeExistingSocketFile = socketPath => {
  try {
    if (statSync(socketPath).isSocket()) {
      // Since a new socket file will be created, remove the existing
      // file.
      unlinkSync(socketPath);
    } else {
      throw new Error(`An existing file was found at "${socketPath}" and it is not ` + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
    }
  } catch (error) {
    // If there is no existing socket file to cleanup, great, we'll
    // continue normally. If the caught exception represents any other
    // issue, re-throw.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const registerSocketFileCleanup = (socketPath, eventEmitter = process) => {
  ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => {
    eventEmitter.on(signal, Meteor.bindEnvironment(() => {
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    }));
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //

module.exports = require('./lib/connect');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"parseurl":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/*!
 * parseurl
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var url = require('url')
var parse = url.parse
var Url = url.Url

/**
 * Pattern for a simple path case.
 * See: https://github.com/joyent/node/pull/7878
 */

var simplePathRegExp = /^(\/\/?(?!\/)[^\?#\s]*)(\?[^#\s]*)?$/

/**
 * Exports.
 */

module.exports = parseurl
module.exports.original = originalurl

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api public
 */

function parseurl(req) {
  var url = req.url

  if (url === undefined) {
    // URL is undefined
    return undefined
  }

  var parsed = req._parsedUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return req._parsedUrl = parsed
};

/**
 * Parse the `req` original url with fallback and memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api public
 */

function originalurl(req) {
  var url = req.originalUrl

  if (typeof url !== 'string') {
    // Fallback
    return parseurl(req)
  }

  var parsed = req._parsedOriginalUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return req._parsedOriginalUrl = parsed
};

/**
 * Parse the `str` url with fast-path short-cut.
 *
 * @param {string} str
 * @return {Object}
 * @api private
 */

function fastparse(str) {
  // Try fast path regexp
  // See: https://github.com/joyent/node/pull/7878
  var simplePath = typeof str === 'string' && simplePathRegExp.exec(str)

  // Construct simple URL
  if (simplePath) {
    var pathname = simplePath[1]
    var search = simplePath[2] || null
    var url = Url !== undefined
      ? new Url()
      : {}
    url.path = str
    url.href = str
    url.pathname = pathname
    url.search = search
    url.query = search && search.substr(1)

    return url
  }

  return parse(str)
}

/**
 * Determine if parsed is still fresh for url.
 *
 * @param {string} url
 * @param {object} parsedUrl
 * @return {boolean}
 * @api private
 */

function fresh(url, parsedUrl) {
  return typeof parsedUrl === 'object'
    && parsedUrl !== null
    && (Url === undefined || parsedUrl instanceof Url)
    && parsedUrl._raw === url
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// ../../.1.4.0.e98h8s++os+web.browser+web.cordova/npm/node_modules/useragent/package.json                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
exports.name = "useragent";
exports.version = "2.0.7";
exports.main = "./index.js";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
'use strict';

/**
 * This is where all the magic comes from, specially crafted for `useragent`.
 */
var regexps = require('./lib/regexps');

/**
 * Reduce references by storing the lookups.
 */
// OperatingSystem parsers:
var osparsers = regexps.os
  , osparserslength = osparsers.length;

// UserAgent parsers:
var agentparsers = regexps.browser
  , agentparserslength = agentparsers.length;

// Device parsers:
var deviceparsers = regexps.device
  , deviceparserslength = deviceparsers.length;

/**
 * The representation of a parsed user agent.
 *
 * @constructor
 * @param {String} family The name of the browser
 * @param {String} major Major version of the browser
 * @param {String} minor Minor version of the browser
 * @param {String} patch Patch version of the browser
 * @param {String} source The actual user agent string
 * @api public
 */
function Agent(family, major, minor, patch, source) {
  this.family = family || 'Other';
  this.major = major || '0';
  this.minor = minor || '0';
  this.patch = patch || '0';
  this.source = source || '';
}

/**
 * OnDemand parsing of the Operating System.
 *
 * @type {OperatingSystem}
 * @api public
 */
Object.defineProperty(Agent.prototype, 'os', {
  get: function lazyparse() {
    var userAgent = this.source
      , length = osparserslength
      , parsers = osparsers
      , i = 0
      , parser
      , res;

    for (; i < length; i++) {
      if (res = parsers[i][0].exec(userAgent)) {
        parser = parsers[i];

        if (parser[1]) res[1] = parser[1].replace('$1', res[1]);
        break;
      }
    }

    return Object.defineProperty(this, 'os', {
        value: !parser || !res
          ? new OperatingSystem()
          : new OperatingSystem(
                res[1]
              , parser[2] || res[2]
              , parser[3] || res[3]
              , parser[4] || res[4]
            )
    }).os;
  },

  /**
   * Bypass the OnDemand parsing and set an OperatingSystem instance.
   *
   * @param {OperatingSystem} os
   * @api public
   */
  set: function set(os) {
    if (!(os instanceof OperatingSystem)) return false;

    return Object.defineProperty(this, 'os', {
      value: os
    }).os;
  }
});

/**
 * OnDemand parsing of the Device type.
 *
 * @type {Device}
 * @api public
 */
Object.defineProperty(Agent.prototype, 'device', {
  get: function lazyparse() {
    var userAgent = this.source
      , length = deviceparserslength
      , parsers = deviceparsers
      , i = 0
      , parser
      , res;

    for (; i < length; i++) {
      if (res = parsers[i][0].exec(userAgent)) {
        parser = parsers[i];

        if (parser[1]) res[1] = parser[1].replace('$1', res[1]);
        break;
      }
    }

    return Object.defineProperty(this, 'device', {
        value: !parser || !res
          ? new Device()
          : new Device(
                res[1]
              , parser[2] || res[2]
              , parser[3] || res[3]
              , parser[4] || res[4]
            )
    }).device;
  },

  /**
   * Bypass the OnDemand parsing and set an Device instance.
   *
   * @param {Device} device
   * @api public
   */
  set: function set(device) {
    if (!(device instanceof Device)) return false;

    return Object.defineProperty(this, 'device', {
      value: device
    }).device;
  }
});
/*** Generates a string output of the parsed user agent.
 *
 * @returns {String}
 * @api public
 */
Agent.prototype.toAgent = function toAgent() {
  var output = this.family
    , version = this.toVersion();

  if (version) output += ' '+ version;
  return output;
};

/**
 * Generates a string output of the parser user agent and operating system.
 *
 * @returns {String}  "UserAgent 0.0.0 / OS"
 * @api public
 */
Agent.prototype.toString = function toString() {
  var agent = this.toAgent()
    , os = this.os !== 'Other' ? this.os : false;

  return agent + (os ? ' / ' + os : '');
};

/**
 * Outputs a compiled veersion number of the user agent.
 *
 * @returns {String}
 * @api public
 */
Agent.prototype.toVersion = function toVersion() {
  var version = '';

  if (this.major) {
    version += this.major;

    if (this.minor) {
     version += '.' + this.minor;

     // Special case here, the patch can also be Alpha, Beta etc so we need
     // to check if it's a string or not.
     if (this.patch) {
      version += (isNaN(+this.patch) ? ' ' : '.') + this.patch;
     }
    }
  }

  return version;
};

/**
 * Outputs a JSON string of the Agent.
 *
 * @returns {String}
 * @api public
 */
Agent.prototype.toJSON = function toJSON() {
  return {
      family: this.family
    , major: this.major
    , minor: this.minor
    , patch: this.patch
    , device: this.device
    , os: this.os
  };
};

/**
 * The representation of a parsed Operating System.
 *
 * @constructor
 * @param {String} family The name of the os
 * @param {String} major Major version of the os
 * @param {String} minor Minor version of the os
 * @param {String} patch Patch version of the os
 * @api public
 */
function OperatingSystem(family, major, minor, patch) {
  this.family = family || 'Other';
  this.major = major || '';
  this.minor = minor || '';
  this.patch = patch || '';
}

/**
 * Generates a stringified version of the Operating System.
 *
 * @returns {String} "Operating System 0.0.0"
 * @api public
 */
OperatingSystem.prototype.toString = function toString() {
  var output = this.family
    , version = this.toVersion();

  if (version) output += ' '+ version;
  return output;
};

/**
 * Generates the version of the Operating System.
 *
 * @returns {String}
 * @api public
 */
OperatingSystem.prototype.toVersion = function toVersion() {
  var version = '';

  if (this.major) {
    version += this.major;

    if (this.minor) {
     version += '.' + this.minor;

     // Special case here, the patch can also be Alpha, Beta etc so we need
     // to check if it's a string or not.
     if (this.patch) {
      version += (isNaN(+this.patch) ? ' ' : '.') + this.patch;
     }
    }
  }

  return version;
};

/**
 * Outputs a JSON string of the OS, values are defaulted to undefined so they
 * are not outputed in the stringify.
 *
 * @returns {String}
 * @api public
 */
OperatingSystem.prototype.toJSON = function toJSON(){
  return {
      family: this.family
    , major: this.major || undefined
    , minor: this.minor || undefined
    , patch: this.patch || undefined
  };
};

/**
 * The representation of a parsed Device.
 *
 * @constructor
 * @param {String} family The name of the os
 * @api public
 */
function Device(family, major, minor, patch) {
  this.family = family || 'Other';
  this.major = major || '';
  this.minor = minor || '';
  this.patch = patch || '';
}

/**
 * Generates a stringified version of the Device.
 *
 * @returns {String} "Device 0.0.0"
 * @api public
 */
Device.prototype.toString = function toString() {
  var output = this.family
    , version = this.toVersion();

  if (version) output += ' '+ version;
  return output;
};

/**
 * Generates the version of the Device.
 *
 * @returns {String}
 * @api public
 */
Device.prototype.toVersion = function toVersion() {
  var version = '';

  if (this.major) {
    version += this.major;

    if (this.minor) {
     version += '.' + this.minor;

     // Special case here, the patch can also be Alpha, Beta etc so we need
     // to check if it's a string or not.
     if (this.patch) {
      version += (isNaN(+this.patch) ? ' ' : '.') + this.patch;
     }
    }
  }

  return version;
};

/**
 * Get string representation.
 *
 * @returns {String}
 * @api public
 */
Device.prototype.toString = function toString() {
  var output = this.family
    , version = this.toVersion();

  if (version) output += ' '+ version;
  return output;
};

/**
 * Outputs a JSON string of the Device, values are defaulted to undefined so they
 * are not outputed in the stringify.
 *
 * @returns {String}
 * @api public
 */
Device.prototype.toJSON = function toJSON() {
  return {
      family: this.family
    , major: this.major || undefined
    , minor: this.minor || undefined
    , patch: this.patch || undefined
  };
};

/**
 * Small nifty thick that allows us to download a fresh set regexs from t3h
 * Int3rNetz when we want to. We will be using the compiled version by default
 * but users can opt-in for updates.
 *
 * @param {Boolean} refresh Refresh the dataset from the remote
 * @api public
 */
module.exports = function updater() {
  try {
    require('./lib/update').update(function updating(err, results) {
      if (err) {
        console.log('[useragent] Failed to update the parsed due to an error:');
        console.log('[useragent] '+ (err.message ? err.message : err));
        return;
      }

      regexps = results;

      // OperatingSystem parsers:
      osparsers = regexps.os;
      osparserslength = osparsers.length;

      // UserAgent parsers:
      agentparsers = regexps.browser;
      agentparserslength = agentparsers.length;

      // Device parsers:
      deviceparsers = regexps.device;
      deviceparserslength = deviceparsers.length;
    });
  } catch (e) {
    console.error('[useragent] If you want to use automatic updating, please add:');
    console.error('[useragent]   - request (npm install request --save)');
    console.error('[useragent]   - yamlparser (npm install yamlparser --save)');
    console.error('[useragent] To your own package.json');
  }
};

// Override the exports with our newly set module.exports
exports = module.exports;

/**
 * Nao that we have setup all the different classes and configured it we can
 * actually start assembling and exposing everything.
 */
exports.Device = Device;
exports.OperatingSystem = OperatingSystem;
exports.Agent = Agent;

/**
 * Parses the user agent string with the generated parsers from the
 * ua-parser project on google code.
 *
 * @param {String} userAgent The user agent string
 * @param {String} jsAgent Optional UA from js to detect chrome frame
 * @returns {Agent}
 * @api public
 */
exports.parse = function parse(userAgent, jsAgent) {
  if (!userAgent) return new Agent();

  var length = agentparserslength
    , parsers = agentparsers
    , i = 0
    , parser
    , res;

  for (; i < length; i++) {
    if (res = parsers[i][0].exec(userAgent)) {
      parser = parsers[i];

      if (parser[1]) res[1] = parser[1].replace('$1', res[1]);
      if (!jsAgent) return new Agent(
          res[1]
        , parser[2] || res[2]
        , parser[3] || res[3]
        , parser[4] || res[4]
        , userAgent
      );

      break;
    }
  }

  // Return early if we didn't find an match, but might still be able to parse
  // the os and device, so make sure we supply it with the source
  if (!parser || !res) return new Agent('', '', '', '', userAgent);

  // Detect Chrome Frame, but make sure it's enabled! So we need to check for
  // the Chrome/ so we know that it's actually using Chrome under the hood.
  if (jsAgent && ~jsAgent.indexOf('Chrome/') && ~userAgent.indexOf('chromeframe')) {
    res[1] = 'Chrome Frame (IE '+ res[1] +'.'+ res[2] +')';

    // Run the JavaScripted userAgent string through the parser again so we can
    // update the version numbers;
    parser = parse(jsAgent);
    parser[2] = parser.major;
    parser[3] = parser.minor;
    parser[4] = parser.patch;
  }

  return new Agent(
      res[1]
    , parser[2] || res[2]
    , parser[3] || res[3]
    , parser[4] || res[4]
    , userAgent
  );
};

/**
 * If you are doing a lot of lookups you might want to cache the results of the
 * parsed user agent string instead, in memory.
 *
 * @TODO We probably want to create 2 dictionary's here 1 for the Agent
 * instances and one for the userAgent instance mapping so we can re-use simular
 * Agent instance and lower our memory consumption.
 *
 * @param {String} userAgent The user agent string
 * @param {String} jsAgent Optional UA from js to detect chrome frame
 * @api public
 */
var LRU = require('lru-cache')(5000);
exports.lookup = function lookup(userAgent, jsAgent) {
  var key = (userAgent || '')+(jsAgent || '')
    , cached = LRU.get(key);

  if (cached) return cached;
  LRU.set(key, (cached = exports.parse(userAgent, jsAgent)));

  return cached;
};

/**
 * Does a more inaccurate but more common check for useragents identification.
 * The version detection is from the jQuery.com library and is licensed under
 * MIT.
 *
 * @param {String} useragent The user agent
 * @returns {Object} matches
 * @api public
 */
exports.is = function is(useragent) {
  var ua = (useragent || '').toLowerCase()
    , details = {
        chrome: false
      , firefox: false
      , ie: false
      , mobile_safari: false
      , mozilla: false
      , opera: false
      , safari: false
      , webkit: false
      , version: (ua.match(exports.is.versionRE) || [0, "0"])[1]
    };

  if (~ua.indexOf('webkit')) {
    details.webkit = true;

    if (~ua.indexOf('chrome')) {
      details.chrome = true;
    } else if (~ua.indexOf('safari')) {
      details.safari = true;

      if (~ua.indexOf('mobile') && ~ua.indexOf('apple')) {
        details.mobile_safari = true;
      }
    }
  } else if (~ua.indexOf('opera')) {
    details.opera = true;
  } else if (~ua.indexOf('mozilla') && !~ua.indexOf('compatible')) {
    details.mozilla = true;

    if (~ua.indexOf('firefox')) details.firefox = true;
  } else if (~ua.indexOf('msie')) {
    details.ie = true;
  }

  return details;
};

/**
 * Parses out the version numbers.
 *
 * @type {RegExp}
 * @api private
 */
exports.is.versionRE = /.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/;

/**
 * Transform a JSON object back to a valid userAgent string
 *
 * @param {Object} details
 * @returns {Agent}
 */
exports.fromJSON = function fromJSON(details) {
  if (typeof details === 'string') details = JSON.parse(details);

  var agent = new Agent(details.family, details.major, details.minor, details.patch)
    , os = details.os;

  // The device family was added in v2.0
  if ('device' in details) {
    agent.device = new Device(details.device.family);
  } else {
    agent.device = new Device();
  }

  if ('os' in details && os) {
    // In v1.1.0 we only parsed out the Operating System name, not the full
    // version which we added in v2.0. To provide backwards compatible we should
    // we should set the details.os as family
    if (typeof os === 'string') {
      agent.os = new OperatingSystem(os);
    } else {
      agent.os = new OperatingSystem(os.family, os.major, os.minor, os.patch);
    }
  }

  return agent;
};

/**
 * Library version.
 *
 * @type {String}
 * @api public
 */
exports.version = require('./package.json').version;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/index.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/*!
 * send
 * Copyright(c) 2012 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var createError = require('http-errors')
var debug = require('debug')('send')
var deprecate = require('depd')('send')
var destroy = require('destroy')
var escapeHtml = require('escape-html')
  , parseRange = require('range-parser')
  , Stream = require('stream')
  , mime = require('mime')
  , fresh = require('fresh')
  , path = require('path')
  , fs = require('fs')
  , normalize = path.normalize
  , join = path.join
var etag = require('etag')
var EventEmitter = require('events').EventEmitter;
var ms = require('ms');
var onFinished = require('on-finished')
var statuses = require('statuses')

/**
 * Variables.
 */
var extname = path.extname
var maxMaxAge = 60 * 60 * 24 * 365 * 1000; // 1 year
var resolve = path.resolve
var sep = path.sep
var toString = Object.prototype.toString
var upPathRegexp = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/

/**
 * Module exports.
 * @public
 */

module.exports = send
module.exports.mime = mime

/**
 * Shim EventEmitter.listenerCount for node.js < 0.10
 */

/* istanbul ignore next */
var listenerCount = EventEmitter.listenerCount
  || function(emitter, type){ return emitter.listeners(type).length; };

/**
 * Return a `SendStream` for `req` and `path`.
 *
 * @param {object} req
 * @param {string} path
 * @param {object} [options]
 * @return {SendStream}
 * @public
 */

function send(req, path, options) {
  return new SendStream(req, path, options);
}

/**
 * Initialize a `SendStream` with the given `path`.
 *
 * @param {Request} req
 * @param {String} path
 * @param {object} [options]
 * @private
 */

function SendStream(req, path, options) {
  var opts = options || {}

  this.options = opts
  this.path = path
  this.req = req

  this._etag = opts.etag !== undefined
    ? Boolean(opts.etag)
    : true

  this._dotfiles = opts.dotfiles !== undefined
    ? opts.dotfiles
    : 'ignore'

  if (this._dotfiles !== 'ignore' && this._dotfiles !== 'allow' && this._dotfiles !== 'deny') {
    throw new TypeError('dotfiles option must be "allow", "deny", or "ignore"')
  }

  this._hidden = Boolean(opts.hidden)

  if (opts.hidden !== undefined) {
    deprecate('hidden: use dotfiles: \'' + (this._hidden ? 'allow' : 'ignore') + '\' instead')
  }

  // legacy support
  if (opts.dotfiles === undefined) {
    this._dotfiles = undefined
  }

  this._extensions = opts.extensions !== undefined
    ? normalizeList(opts.extensions, 'extensions option')
    : []

  this._index = opts.index !== undefined
    ? normalizeList(opts.index, 'index option')
    : ['index.html']

  this._lastModified = opts.lastModified !== undefined
    ? Boolean(opts.lastModified)
    : true

  this._maxage = opts.maxAge || opts.maxage
  this._maxage = typeof this._maxage === 'string'
    ? ms(this._maxage)
    : Number(this._maxage)
  this._maxage = !isNaN(this._maxage)
    ? Math.min(Math.max(0, this._maxage), maxMaxAge)
    : 0

  this._root = opts.root
    ? resolve(opts.root)
    : null

  if (!this._root && opts.from) {
    this.from(opts.from)
  }
}

/**
 * Inherits from `Stream.prototype`.
 */

SendStream.prototype.__proto__ = Stream.prototype;

/**
 * Enable or disable etag generation.
 *
 * @param {Boolean} val
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.etag = deprecate.function(function etag(val) {
  val = Boolean(val);
  debug('etag %s', val);
  this._etag = val;
  return this;
}, 'send.etag: pass etag as option');

/**
 * Enable or disable "hidden" (dot) files.
 *
 * @param {Boolean} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.hidden = deprecate.function(function hidden(val) {
  val = Boolean(val);
  debug('hidden %s', val);
  this._hidden = val;
  this._dotfiles = undefined
  return this;
}, 'send.hidden: use dotfiles option');

/**
 * Set index `paths`, set to a falsy
 * value to disable index support.
 *
 * @param {String|Boolean|Array} paths
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.index = deprecate.function(function index(paths) {
  var index = !paths ? [] : normalizeList(paths, 'paths argument');
  debug('index %o', paths);
  this._index = index;
  return this;
}, 'send.index: pass index as option');

/**
 * Set root `path`.
 *
 * @param {String} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.root = function(path){
  path = String(path);
  this._root = resolve(path)
  return this;
};

SendStream.prototype.from = deprecate.function(SendStream.prototype.root,
  'send.from: pass root as option');

SendStream.prototype.root = deprecate.function(SendStream.prototype.root,
  'send.root: pass root as option');

/**
 * Set max-age to `maxAge`.
 *
 * @param {Number} maxAge
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.maxage = deprecate.function(function maxage(maxAge) {
  maxAge = typeof maxAge === 'string'
    ? ms(maxAge)
    : Number(maxAge);
  if (isNaN(maxAge)) maxAge = 0;
  if (Infinity == maxAge) maxAge = 60 * 60 * 24 * 365 * 1000;
  debug('max-age %d', maxAge);
  this._maxage = maxAge;
  return this;
}, 'send.maxage: pass maxAge as option');

/**
 * Emit error with `status`.
 *
 * @param {number} status
 * @param {Error} [error]
 * @private
 */

SendStream.prototype.error = function error(status, error) {
  // emit if listeners instead of responding
  if (listenerCount(this, 'error') !== 0) {
    return this.emit('error', createError(error, status, {
      expose: false
    }))
  }

  var res = this.res
  var msg = statuses[status]

  // wipe all existing headers
  res._headers = null

  // send basic response
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8')
  res.setHeader('Content-Length', Buffer.byteLength(msg))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(msg)
}

/**
 * Check if the pathname ends with "/".
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.hasTrailingSlash = function(){
  return '/' == this.path[this.path.length - 1];
};

/**
 * Check if this is a conditional GET request.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isConditionalGET = function(){
  return this.req.headers['if-none-match']
    || this.req.headers['if-modified-since'];
};

/**
 * Strip content-* header fields.
 *
 * @private
 */

SendStream.prototype.removeContentHeaderFields = function removeContentHeaderFields() {
  var res = this.res
  var headers = Object.keys(res._headers || {})

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i]
    if (header.substr(0, 8) === 'content-' && header !== 'content-location') {
      res.removeHeader(header)
    }
  }
}

/**
 * Respond with 304 not modified.
 *
 * @api private
 */

SendStream.prototype.notModified = function(){
  var res = this.res;
  debug('not modified');
  this.removeContentHeaderFields();
  res.statusCode = 304;
  res.end();
};

/**
 * Raise error that headers already sent.
 *
 * @api private
 */

SendStream.prototype.headersAlreadySent = function headersAlreadySent(){
  var err = new Error('Can\'t set headers after they are sent.');
  debug('headers already sent');
  this.error(500, err);
};

/**
 * Check if the request is cacheable, aka
 * responded with 2xx or 304 (see RFC 2616 section 14.2{5,6}).
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isCachable = function(){
  var res = this.res;
  return (res.statusCode >= 200 && res.statusCode < 300) || 304 == res.statusCode;
};

/**
 * Handle stat() error.
 *
 * @param {Error} error
 * @private
 */

SendStream.prototype.onStatError = function onStatError(error) {
  switch (error.code) {
    case 'ENAMETOOLONG':
    case 'ENOENT':
    case 'ENOTDIR':
      this.error(404, error)
      break
    default:
      this.error(500, error)
      break
  }
}

/**
 * Check if the cache is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isFresh = function(){
  return fresh(this.req.headers, this.res._headers);
};

/**
 * Check if the range is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isRangeFresh = function isRangeFresh(){
  var ifRange = this.req.headers['if-range'];

  if (!ifRange) return true;

  return ~ifRange.indexOf('"')
    ? ~ifRange.indexOf(this.res._headers['etag'])
    : Date.parse(this.res._headers['last-modified']) <= Date.parse(ifRange);
};

/**
 * Redirect to path.
 *
 * @param {string} path
 * @private
 */

SendStream.prototype.redirect = function redirect(path) {
  if (listenerCount(this, 'directory') !== 0) {
    this.emit('directory')
    return
  }

  if (this.hasTrailingSlash()) {
    this.error(403)
    return
  }

  var loc = path + '/'
  var msg = 'Redirecting to <a href="' + escapeHtml(loc) + '">' + escapeHtml(loc) + '</a>\n'
  var res = this.res

  // redirect
  res.statusCode = 301
  res.setHeader('Content-Type', 'text/html; charset=UTF-8')
  res.setHeader('Content-Length', Buffer.byteLength(msg))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Location', loc)
  res.end(msg)
}

/**
 * Pipe to `res.
 *
 * @param {Stream} res
 * @return {Stream} res
 * @api public
 */

SendStream.prototype.pipe = function(res){
  var self = this
    , args = arguments
    , root = this._root;

  // references
  this.res = res;

  // decode the path
  var path = decode(this.path)
  if (path === -1) return this.error(400)

  // null byte(s)
  if (~path.indexOf('\0')) return this.error(400);

  var parts
  if (root !== null) {
    // malicious path
    if (upPathRegexp.test(normalize('.' + sep + path))) {
      debug('malicious path "%s"', path)
      return this.error(403)
    }

    // join / normalize from optional root dir
    path = normalize(join(root, path))
    root = normalize(root + sep)

    // explode path parts
    parts = path.substr(root.length).split(sep)
  } else {
    // ".." is malicious without "root"
    if (upPathRegexp.test(path)) {
      debug('malicious path "%s"', path)
      return this.error(403)
    }

    // explode path parts
    parts = normalize(path).split(sep)

    // resolve the path
    path = resolve(path)
  }

  // dotfile handling
  if (containsDotFile(parts)) {
    var access = this._dotfiles

    // legacy support
    if (access === undefined) {
      access = parts[parts.length - 1][0] === '.'
        ? (this._hidden ? 'allow' : 'ignore')
        : 'allow'
    }

    debug('%s dotfile "%s"', access, path)
    switch (access) {
      case 'allow':
        break
      case 'deny':
        return this.error(403)
      case 'ignore':
      default:
        return this.error(404)
    }
  }

  // index file support
  if (this._index.length && this.path[this.path.length - 1] === '/') {
    this.sendIndex(path);
    return res;
  }

  this.sendFile(path);
  return res;
};

/**
 * Transfer `path`.
 *
 * @param {String} path
 * @api public
 */

SendStream.prototype.send = function(path, stat){
  var len = stat.size;
  var options = this.options
  var opts = {}
  var res = this.res;
  var req = this.req;
  var ranges = req.headers.range;
  var offset = options.start || 0;

  if (res._header) {
    // impossible to send now
    return this.headersAlreadySent();
  }

  debug('pipe "%s"', path)

  // set header fields
  this.setHeader(path, stat);

  // set content-type
  this.type(path);

  // conditional GET support
  if (this.isConditionalGET()
    && this.isCachable()
    && this.isFresh()) {
    return this.notModified();
  }

  // adjust len to start/end options
  len = Math.max(0, len - offset);
  if (options.end !== undefined) {
    var bytes = options.end - offset + 1;
    if (len > bytes) len = bytes;
  }

  // Range support
  if (ranges) {
    ranges = parseRange(len, ranges);

    // If-Range support
    if (!this.isRangeFresh()) {
      debug('range stale');
      ranges = -2;
    }

    // unsatisfiable
    if (-1 == ranges) {
      debug('range unsatisfiable');
      res.setHeader('Content-Range', 'bytes */' + stat.size);
      return this.error(416);
    }

    // valid (syntactically invalid/multiple ranges are treated as a regular response)
    if (-2 != ranges && ranges.length === 1) {
      debug('range %j', ranges);

      // Content-Range
      res.statusCode = 206;
      res.setHeader('Content-Range', 'bytes '
        + ranges[0].start
        + '-'
        + ranges[0].end
        + '/'
        + len);

      offset += ranges[0].start;
      len = ranges[0].end - ranges[0].start + 1;
    }
  }

  // clone options
  for (var prop in options) {
    opts[prop] = options[prop]
  }

  // set read options
  opts.start = offset
  opts.end = Math.max(offset, offset + len - 1)

  // content-length
  res.setHeader('Content-Length', len);

  // HEAD support
  if ('HEAD' == req.method) return res.end();

  this.stream(path, opts)
};

/**
 * Transfer file for `path`.
 *
 * @param {String} path
 * @api private
 */
SendStream.prototype.sendFile = function sendFile(path) {
  var i = 0
  var self = this

  debug('stat "%s"', path);
  fs.stat(path, function onstat(err, stat) {
    if (err && err.code === 'ENOENT'
      && !extname(path)
      && path[path.length - 1] !== sep) {
      // not found, check extensions
      return next(err)
    }
    if (err) return self.onStatError(err)
    if (stat.isDirectory()) return self.redirect(self.path)
    self.emit('file', path, stat)
    self.send(path, stat)
  })

  function next(err) {
    if (self._extensions.length <= i) {
      return err
        ? self.onStatError(err)
        : self.error(404)
    }

    var p = path + '.' + self._extensions[i++]

    debug('stat "%s"', p)
    fs.stat(p, function (err, stat) {
      if (err) return next(err)
      if (stat.isDirectory()) return next()
      self.emit('file', p, stat)
      self.send(p, stat)
    })
  }
}

/**
 * Transfer index for `path`.
 *
 * @param {String} path
 * @api private
 */
SendStream.prototype.sendIndex = function sendIndex(path){
  var i = -1;
  var self = this;

  function next(err){
    if (++i >= self._index.length) {
      if (err) return self.onStatError(err);
      return self.error(404);
    }

    var p = join(path, self._index[i]);

    debug('stat "%s"', p);
    fs.stat(p, function(err, stat){
      if (err) return next(err);
      if (stat.isDirectory()) return next();
      self.emit('file', p, stat);
      self.send(p, stat);
    });
  }

  next();
};

/**
 * Stream `path` to the response.
 *
 * @param {String} path
 * @param {Object} options
 * @api private
 */

SendStream.prototype.stream = function(path, options){
  // TODO: this is all lame, refactor meeee
  var finished = false;
  var self = this;
  var res = this.res;
  var req = this.req;

  // pipe
  var stream = fs.createReadStream(path, options);
  this.emit('stream', stream);
  stream.pipe(res);

  // response finished, done with the fd
  onFinished(res, function onfinished(){
    finished = true;
    destroy(stream);
  });

  // error handling code-smell
  stream.on('error', function onerror(err){
    // request already finished
    if (finished) return;

    // clean up stream
    finished = true;
    destroy(stream);

    // error
    self.onStatError(err);
  });

  // end
  stream.on('end', function onend(){
    self.emit('end');
  });
};

/**
 * Set content-type based on `path`
 * if it hasn't been explicitly set.
 *
 * @param {String} path
 * @api private
 */

SendStream.prototype.type = function(path){
  var res = this.res;
  if (res.getHeader('Content-Type')) return;
  var type = mime.lookup(path);
  var charset = mime.charsets.lookup(type);
  debug('content-type %s', type);
  res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
};

/**
 * Set response header fields, most
 * fields may be pre-defined.
 *
 * @param {String} path
 * @param {Object} stat
 * @api private
 */

SendStream.prototype.setHeader = function setHeader(path, stat){
  var res = this.res;

  this.emit('headers', res, path, stat);

  if (!res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=' + Math.floor(this._maxage / 1000));

  if (this._lastModified && !res.getHeader('Last-Modified')) {
    var modified = stat.mtime.toUTCString()
    debug('modified %s', modified)
    res.setHeader('Last-Modified', modified)
  }

  if (this._etag && !res.getHeader('ETag')) {
    var val = etag(stat)
    debug('etag %s', val)
    res.setHeader('ETag', val)
  }
};

/**
 * Determine if path parts contain a dotfile.
 *
 * @api private
 */

function containsDotFile(parts) {
  for (var i = 0; i < parts.length; i++) {
    if (parts[i][0] === '.') {
      return true
    }
  }

  return false
}

/**
 * decodeURIComponent.
 *
 * Allows V8 to only deoptimize this fn instead of all
 * of send().
 *
 * @param {String} path
 * @api private
 */

function decode(path) {
  try {
    return decodeURIComponent(path)
  } catch (err) {
    return -1
  }
}

/**
 * Normalize the index option into an array.
 *
 * @param {boolean|string|array} val
 * @param {string} name
 * @private
 */

function normalizeList(val, name) {
  var list = [].concat(val || [])

  for (var i = 0; i < list.length; i++) {
    if (typeof list[i] !== 'string') {
      throw new TypeError(name + ' must be array of strings or false')
    }
  }

  return list
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/webapp/webapp_server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.webapp = exports, {
  WebApp: WebApp,
  WebAppInternals: WebAppInternals,
  main: main
});

})();

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9zb2NrZXRfZmlsZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUxIiwibW9kdWxlIiwiZXhwb3J0IiwiV2ViQXBwIiwiV2ViQXBwSW50ZXJuYWxzIiwiYXNzZXJ0Iiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJyZWFkRmlsZSIsImNyZWF0ZVNlcnZlciIsInBhdGhKb2luIiwicGF0aERpcm5hbWUiLCJqb2luIiwiZGlybmFtZSIsInBhcnNlVXJsIiwicGFyc2UiLCJjcmVhdGVIYXNoIiwiY29ubmVjdCIsInBhcnNlUmVxdWVzdCIsImxvb2t1cFVzZXJBZ2VudCIsImxvb2t1cCIsInNlbmQiLCJyZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUiLCJyZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwIiwiU0hPUlRfU09DS0VUX1RJTUVPVVQiLCJMT05HX1NPQ0tFVF9USU1FT1VUIiwiTnBtTW9kdWxlcyIsInZlcnNpb24iLCJOcG0iLCJkZWZhdWx0QXJjaCIsImNsaWVudFByb2dyYW1zIiwiYXJjaFBhdGgiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsInVybCIsImJ1bmRsZWRQcmVmaXgiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJzaGExIiwiY29udGVudHMiLCJoYXNoIiwidXBkYXRlIiwiZGlnZXN0IiwicmVhZFV0ZjhGaWxlU3luYyIsImZpbGVuYW1lIiwiTWV0ZW9yIiwid3JhcEFzeW5jIiwiY2FtZWxDYXNlIiwibmFtZSIsInBhcnRzIiwic3BsaXQiLCJ0b0xvd2VyQ2FzZSIsImkiLCJsZW5ndGgiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInN1YnN0ciIsImlkZW50aWZ5QnJvd3NlciIsInVzZXJBZ2VudFN0cmluZyIsInVzZXJBZ2VudCIsImZhbWlseSIsIm1ham9yIiwibWlub3IiLCJwYXRjaCIsImNhdGVnb3JpemVSZXF1ZXN0IiwicmVxIiwiXyIsImV4dGVuZCIsImJyb3dzZXIiLCJoZWFkZXJzIiwicGljayIsImh0bWxBdHRyaWJ1dGVIb29rcyIsImdldEh0bWxBdHRyaWJ1dGVzIiwicmVxdWVzdCIsImNvbWJpbmVkQXR0cmlidXRlcyIsImVhY2giLCJob29rIiwiYXR0cmlidXRlcyIsIkVycm9yIiwiYWRkSHRtbEF0dHJpYnV0ZUhvb2siLCJwdXNoIiwiYXBwVXJsIiwiUm91dGVQb2xpY3kiLCJjbGFzc2lmeSIsInN0YXJ0dXAiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiV2ViQXBwSGFzaGluZyIsImNsaWVudEhhc2giLCJhcmNoTmFtZSIsIm1hbmlmZXN0IiwiY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaENvcmRvdmEiLCJfdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2siLCJyZXMiLCJzZXRUaW1lb3V0IiwiZmluaXNoTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwib24iLCJsIiwiYm9pbGVycGxhdGVCeUFyY2giLCJib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MiLCJPYmplY3QiLCJjcmVhdGUiLCJyZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrIiwia2V5IiwiY2FsbGJhY2siLCJwcmV2aW91c0NhbGxiYWNrIiwic3RyaWN0RXF1YWwiLCJtZW1vaXplZEJvaWxlcnBsYXRlIiwiZ2V0Qm9pbGVycGxhdGUiLCJhcmNoIiwiZ2V0Qm9pbGVycGxhdGVBc3luYyIsImF3YWl0IiwiYm9pbGVycGxhdGUiLCJkYXRhIiwiYXNzaWduIiwiYmFzZURhdGEiLCJodG1sQXR0cmlidXRlcyIsIm1hZGVDaGFuZ2VzIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwia2V5cyIsImZvckVhY2giLCJ0aGVuIiwicmVzdWx0IiwidXNlTWVtb2l6ZWQiLCJkeW5hbWljSGVhZCIsImR5bmFtaWNCb2R5IiwidG9IVE1MIiwibWVtSGFzaCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbmxpbmVTY3JpcHRzQWxsb3dlZCIsImdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZSIsImFkZGl0aW9uYWxPcHRpb25zIiwicnVudGltZUNvbmZpZyIsImNsb25lIiwicnVudGltZUNvbmZpZ092ZXJyaWRlcyIsIkJvaWxlcnBsYXRlIiwicGF0aE1hcHBlciIsIml0ZW1QYXRoIiwiYmFzZURhdGFFeHRlbnNpb24iLCJhZGRpdGlvbmFsU3RhdGljSnMiLCJtYXAiLCJwYXRobmFtZSIsIm1ldGVvclJ1bnRpbWVDb25maWciLCJlbmNvZGVVUklDb21wb25lbnQiLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZSIsInN0YXRpY0ZpbGVzIiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwibmV4dCIsIm1ldGhvZCIsImRlY29kZVVSSUNvbXBvbmVudCIsImUiLCJzZXJ2ZVN0YXRpY0pzIiwicyIsIndyaXRlSGVhZCIsIndyaXRlIiwiZW5kIiwiaGFzIiwiaW5mbyIsIm1heEFnZSIsImNhY2hlYWJsZSIsInNvdXJjZU1hcFVybCIsInNldEhlYWRlciIsInR5cGUiLCJjb250ZW50IiwiYWJzb2x1dGVQYXRoIiwibWF4YWdlIiwiZG90ZmlsZXMiLCJsYXN0TW9kaWZpZWQiLCJlcnIiLCJMb2ciLCJlcnJvciIsInBpcGUiLCJnZXRVcmxQcmVmaXhGb3JBcmNoIiwicmVwbGFjZSIsInBhcnNlUG9ydCIsInBvcnQiLCJwYXJzZWRQb3J0IiwicGFyc2VJbnQiLCJOdW1iZXIiLCJpc05hTiIsInJ1bldlYkFwcFNlcnZlciIsInNodXR0aW5nRG93biIsInN5bmNRdWV1ZSIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiZ2V0SXRlbVBhdGhuYW1lIiwiaXRlbVVybCIsInJlbG9hZENsaWVudFByb2dyYW1zIiwicnVuVGFzayIsImdlbmVyYXRlQ2xpZW50UHJvZ3JhbSIsImNsaWVudFBhdGgiLCJjbGllbnRKc29uUGF0aCIsIl9fbWV0ZW9yX2Jvb3RzdHJhcF9fIiwic2VydmVyRGlyIiwiY2xpZW50RGlyIiwiY2xpZW50SnNvbiIsImZvcm1hdCIsInVybFByZWZpeCIsIml0ZW0iLCJ3aGVyZSIsInBhdGgiLCJzb3VyY2VNYXAiLCJwcm9ncmFtIiwicHJvY2VzcyIsImVudiIsIkFVVE9VUERBVEVfVkVSU0lPTiIsImNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMiLCJQVUJMSUNfU0VUVElOR1MiLCJjbGllbnRQYXRocyIsImNvbmZpZ0pzb24iLCJzdGFjayIsImV4aXQiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlIiwiZGVmYXVsdE9wdGlvbnNGb3JBcmNoIiwiRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwiLCJNT0JJTEVfRERQX1VSTCIsImFic29sdXRlVXJsIiwiUk9PVF9VUkwiLCJNT0JJTEVfUk9PVF9VUkwiLCJjc3NGaWxlcyIsImNzcyIsImFsbENzcyIsImNzc0ZpbGUiLCJyZWZyZXNoYWJsZUFzc2V0cyIsImFwcCIsInJhd0Nvbm5lY3RIYW5kbGVycyIsInVzZSIsImNvbXByZXNzIiwiaXNWYWxpZFVybCIsInJlc3BvbnNlIiwicGF0aFByZWZpeCIsInN1YnN0cmluZyIsInF1ZXJ5IiwicGFja2FnZUFuZEFwcEhhbmRsZXJzIiwic3VwcHJlc3NDb25uZWN0RXJyb3JzIiwic3RhdHVzIiwiYXJjaEtleSIsImFyY2hLZXlDbGVhbmVkIiwidGVzdCIsInN0YXR1c0NvZGUiLCJodHRwU2VydmVyIiwib25MaXN0ZW5pbmdDYWxsYmFja3MiLCJzb2NrZXQiLCJkZXN0cm95ZWQiLCJtZXNzYWdlIiwiZGVzdHJveSIsImNvbm5lY3RIYW5kbGVycyIsImNvbm5lY3RBcHAiLCJvbkxpc3RlbmluZyIsImYiLCJleHBvcnRzIiwibWFpbiIsImFyZ3YiLCJzdGFydEh0dHBTZXJ2ZXIiLCJsaXN0ZW5PcHRpb25zIiwibGlzdGVuIiwiYmluZEVudmlyb25tZW50IiwiTUVURU9SX1BSSU5UX09OX0xJU1RFTiIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFja3MiLCJsb2NhbFBvcnQiLCJQT1JUIiwidW5peFNvY2tldFBhdGgiLCJVTklYX1NPQ0tFVF9QQVRIIiwiaG9zdCIsIkJJTkRfSVAiLCJzZXRJbmxpbmVTY3JpcHRzQWxsb3dlZCIsInZhbHVlIiwic2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2siLCJob29rRm4iLCJzZXRCdW5kbGVkSnNDc3NQcmVmaXgiLCJwcmVmaXgiLCJzZWxmIiwiYWRkU3RhdGljSnMiLCJzdGF0U3luYyIsInVubGlua1N5bmMiLCJleGlzdHNTeW5jIiwic29ja2V0UGF0aCIsImlzU29ja2V0IiwiY29kZSIsImV2ZW50RW1pdHRlciIsInNpZ25hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsVUFBUUMsTUFBZDtBQUFxQkQsUUFBUUUsTUFBUixDQUFlO0FBQUNDLFVBQU8sTUFBSUEsTUFBWjtBQUFtQkMsbUJBQWdCLE1BQUlBO0FBQXZDLENBQWY7QUFBd0UsSUFBSUMsTUFBSjtBQUFXTCxRQUFRTSxLQUFSLENBQWNDLFFBQVEsUUFBUixDQUFkLEVBQWdDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXJCLENBQWhDLEVBQXVELENBQXZEO0FBQTBELElBQUlDLFFBQUo7QUFBYVYsUUFBUU0sS0FBUixDQUFjQyxRQUFRLElBQVIsQ0FBZCxFQUE0QjtBQUFDRyxXQUFTRCxDQUFULEVBQVc7QUFBQ0MsZUFBU0QsQ0FBVDtBQUFXOztBQUF4QixDQUE1QixFQUFzRCxDQUF0RDtBQUF5RCxJQUFJRSxZQUFKO0FBQWlCWCxRQUFRTSxLQUFSLENBQWNDLFFBQVEsTUFBUixDQUFkLEVBQThCO0FBQUNJLGVBQWFGLENBQWIsRUFBZTtBQUFDRSxtQkFBYUYsQ0FBYjtBQUFlOztBQUFoQyxDQUE5QixFQUFnRSxDQUFoRTtBQUFtRSxJQUFJRyxRQUFK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QTRCO0FBQzFCRixtQkFBV0UsVUFBWDtBQUNEO0FBQ0YsS0FKdUIsQ0FBeEI7QUFLRCxHQU5EO0FBT0QsQ0FUSSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy93ZWJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXIgfSBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHtcbiAgam9pbiBhcyBwYXRoSm9pbixcbiAgZGlybmFtZSBhcyBwYXRoRGlybmFtZSxcbn0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlVXJsIH0gZnJvbSBcInVybFwiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCBjb25uZWN0IGZyb20gXCJjb25uZWN0XCI7XG5pbXBvcnQgcGFyc2VSZXF1ZXN0IGZyb20gXCJwYXJzZXVybFwiO1xuaW1wb3J0IHsgbG9va3VwIGFzIGxvb2t1cFVzZXJBZ2VudCB9IGZyb20gXCJ1c2VyYWdlbnRcIjtcbmltcG9ydCBzZW5kIGZyb20gXCJzZW5kXCI7XG5pbXBvcnQge1xuICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUsXG4gIHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAsXG59IGZyb20gJy4vc29ja2V0X2ZpbGUuanMnO1xuXG52YXIgU0hPUlRfU09DS0VUX1RJTUVPVVQgPSA1KjEwMDA7XG52YXIgTE9OR19TT0NLRVRfVElNRU9VVCA9IDEyMCoxMDAwO1xuXG5leHBvcnQgY29uc3QgV2ViQXBwID0ge307XG5leHBvcnQgY29uc3QgV2ViQXBwSW50ZXJuYWxzID0ge307XG5cbldlYkFwcEludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBjb25uZWN0OiB7XG4gICAgdmVyc2lvbjogTnBtLnJlcXVpcmUoJ2Nvbm5lY3QvcGFja2FnZS5qc29uJykudmVyc2lvbixcbiAgICBtb2R1bGU6IGNvbm5lY3RcbiAgfVxufTtcblxuV2ViQXBwLmRlZmF1bHRBcmNoID0gJ3dlYi5icm93c2VyJztcblxuLy8gWFhYIG1hcHMgYXJjaHMgdG8gbWFuaWZlc3RzXG5XZWJBcHAuY2xpZW50UHJvZ3JhbXMgPSB7fTtcblxuLy8gWFhYIG1hcHMgYXJjaHMgdG8gcHJvZ3JhbSBwYXRoIG9uIGZpbGVzeXN0ZW1cbnZhciBhcmNoUGF0aCA9IHt9O1xuXG52YXIgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBmdW5jdGlvbiAodXJsKSB7XG4gIHZhciBidW5kbGVkUHJlZml4ID1cbiAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCB8fCAnJztcbiAgcmV0dXJuIGJ1bmRsZWRQcmVmaXggKyB1cmw7XG59O1xuXG52YXIgc2hhMSA9IGZ1bmN0aW9uIChjb250ZW50cykge1xuICB2YXIgaGFzaCA9IGNyZWF0ZUhhc2goJ3NoYTEnKTtcbiAgaGFzaC51cGRhdGUoY29udGVudHMpO1xuICByZXR1cm4gaGFzaC5kaWdlc3QoJ2hleCcpO1xufTtcblxudmFyIHJlYWRVdGY4RmlsZVN5bmMgPSBmdW5jdGlvbiAoZmlsZW5hbWUpIHtcbiAgcmV0dXJuIE1ldGVvci53cmFwQXN5bmMocmVhZEZpbGUpKGZpbGVuYW1lLCAndXRmOCcpO1xufTtcblxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvblxuLy9cbi8vIFdlIGhhdmUgbXVsdGlwbGUgcGxhY2VzIHRoYXQgd2FudCB0byBpZGVudGlmeSB0aGUgYnJvd3NlcjogdGhlXG4vLyB1bnN1cHBvcnRlZCBicm93c2VyIHBhZ2UsIHRoZSBhcHBjYWNoZSBwYWNrYWdlLCBhbmQsIGV2ZW50dWFsbHlcbi8vIGRlbGl2ZXJpbmcgYnJvd3NlciBwb2x5ZmlsbHMgb25seSBhcyBuZWVkZWQuXG4vL1xuLy8gVG8gYXZvaWQgZGV0ZWN0aW5nIHRoZSBicm93c2VyIGluIG11bHRpcGxlIHBsYWNlcyBhZC1ob2MsIHdlIGNyZWF0ZSBhXG4vLyBNZXRlb3IgXCJicm93c2VyXCIgb2JqZWN0LiBJdCB1c2VzIGJ1dCBkb2VzIG5vdCBleHBvc2UgdGhlIG5wbVxuLy8gdXNlcmFnZW50IG1vZHVsZSAod2UgY291bGQgY2hvb3NlIGEgZGlmZmVyZW50IG1lY2hhbmlzbSB0byBpZGVudGlmeVxuLy8gdGhlIGJyb3dzZXIgaW4gdGhlIGZ1dHVyZSBpZiB3ZSB3YW50ZWQgdG8pLiAgVGhlIGJyb3dzZXIgb2JqZWN0XG4vLyBjb250YWluc1xuLy9cbi8vICogYG5hbWVgOiB0aGUgbmFtZSBvZiB0aGUgYnJvd3NlciBpbiBjYW1lbCBjYXNlXG4vLyAqIGBtYWpvcmAsIGBtaW5vcmAsIGBwYXRjaGA6IGludGVnZXJzIGRlc2NyaWJpbmcgdGhlIGJyb3dzZXIgdmVyc2lvblxuLy9cbi8vIEFsc28gaGVyZSBpcyBhbiBlYXJseSB2ZXJzaW9uIG9mIGEgTWV0ZW9yIGByZXF1ZXN0YCBvYmplY3QsIGludGVuZGVkXG4vLyB0byBiZSBhIGhpZ2gtbGV2ZWwgZGVzY3JpcHRpb24gb2YgdGhlIHJlcXVlc3Qgd2l0aG91dCBleHBvc2luZ1xuLy8gZGV0YWlscyBvZiBjb25uZWN0J3MgbG93LWxldmVsIGByZXFgLiAgQ3VycmVudGx5IGl0IGNvbnRhaW5zOlxuLy9cbi8vICogYGJyb3dzZXJgOiBicm93c2VyIGlkZW50aWZpY2F0aW9uIG9iamVjdCBkZXNjcmliZWQgYWJvdmVcbi8vICogYHVybGA6IHBhcnNlZCB1cmwsIGluY2x1ZGluZyBwYXJzZWQgcXVlcnkgcGFyYW1zXG4vL1xuLy8gQXMgYSB0ZW1wb3JhcnkgaGFjayB0aGVyZSBpcyBhIGBjYXRlZ29yaXplUmVxdWVzdGAgZnVuY3Rpb24gb24gV2ViQXBwIHdoaWNoXG4vLyBjb252ZXJ0cyBhIGNvbm5lY3QgYHJlcWAgdG8gYSBNZXRlb3IgYHJlcXVlc3RgLiBUaGlzIGNhbiBnbyBhd2F5IG9uY2Ugc21hcnRcbi8vIHBhY2thZ2VzIHN1Y2ggYXMgYXBwY2FjaGUgYXJlIGJlaW5nIHBhc3NlZCBhIGByZXF1ZXN0YCBvYmplY3QgZGlyZWN0bHkgd2hlblxuLy8gdGhleSBzZXJ2ZSBjb250ZW50LlxuLy9cbi8vIFRoaXMgYWxsb3dzIGByZXF1ZXN0YCB0byBiZSB1c2VkIHVuaWZvcm1seTogaXQgaXMgcGFzc2VkIHRvIHRoZSBodG1sXG4vLyBhdHRyaWJ1dGVzIGhvb2ssIGFuZCB0aGUgYXBwY2FjaGUgcGFja2FnZSBjYW4gdXNlIGl0IHdoZW4gZGVjaWRpbmdcbi8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgYSA0MDQgZm9yIHRoZSBtYW5pZmVzdC5cbi8vXG4vLyBSZWFsIHJvdXRpbmcgLyBzZXJ2ZXIgc2lkZSByZW5kZXJpbmcgd2lsbCBwcm9iYWJseSByZWZhY3RvciB0aGlzXG4vLyBoZWF2aWx5LlxuXG5cbi8vIGUuZy4gXCJNb2JpbGUgU2FmYXJpXCIgPT4gXCJtb2JpbGVTYWZhcmlcIlxudmFyIGNhbWVsQ2FzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJyAnKTtcbiAgcGFydHNbMF0gPSBwYXJ0c1swXS50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKHZhciBpID0gMTsgIGkgPCBwYXJ0cy5sZW5ndGg7ICArK2kpIHtcbiAgICBwYXJ0c1tpXSA9IHBhcnRzW2ldLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcGFydHNbaV0uc3Vic3RyKDEpO1xuICB9XG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKTtcbn07XG5cbnZhciBpZGVudGlmeUJyb3dzZXIgPSBmdW5jdGlvbiAodXNlckFnZW50U3RyaW5nKSB7XG4gIHZhciB1c2VyQWdlbnQgPSBsb29rdXBVc2VyQWdlbnQodXNlckFnZW50U3RyaW5nKTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBjYW1lbENhc2UodXNlckFnZW50LmZhbWlseSksXG4gICAgbWFqb3I6ICt1c2VyQWdlbnQubWFqb3IsXG4gICAgbWlub3I6ICt1c2VyQWdlbnQubWlub3IsXG4gICAgcGF0Y2g6ICt1c2VyQWdlbnQucGF0Y2hcbiAgfTtcbn07XG5cbi8vIFhYWCBSZWZhY3RvciBhcyBwYXJ0IG9mIGltcGxlbWVudGluZyByZWFsIHJvdXRpbmcuXG5XZWJBcHBJbnRlcm5hbHMuaWRlbnRpZnlCcm93c2VyID0gaWRlbnRpZnlCcm93c2VyO1xuXG5XZWJBcHAuY2F0ZWdvcml6ZVJlcXVlc3QgPSBmdW5jdGlvbiAocmVxKSB7XG4gIHJldHVybiBfLmV4dGVuZCh7XG4gICAgYnJvd3NlcjogaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10pLFxuICAgIHVybDogcGFyc2VVcmwocmVxLnVybCwgdHJ1ZSlcbiAgfSwgXy5waWNrKHJlcSwgJ2R5bmFtaWNIZWFkJywgJ2R5bmFtaWNCb2R5JykpO1xufTtcblxuLy8gSFRNTCBhdHRyaWJ1dGUgaG9va3M6IGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgdG8gZGV0ZXJtaW5lIGFueSBhdHRyaWJ1dGVzIHRvXG4vLyBiZSBhZGRlZCB0byB0aGUgJzxodG1sPicgdGFnLiBFYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhICdyZXF1ZXN0JyBvYmplY3QgKHNlZVxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvbikgYW5kIHNob3VsZCByZXR1cm4gbnVsbCBvciBvYmplY3QuXG52YXIgaHRtbEF0dHJpYnV0ZUhvb2tzID0gW107XG52YXIgZ2V0SHRtbEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICB2YXIgY29tYmluZWRBdHRyaWJ1dGVzICA9IHt9O1xuICBfLmVhY2goaHRtbEF0dHJpYnV0ZUhvb2tzIHx8IFtdLCBmdW5jdGlvbiAoaG9vaykge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaG9vayhyZXF1ZXN0KTtcbiAgICBpZiAoYXR0cmlidXRlcyA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXMgIT09ICdvYmplY3QnKVxuICAgICAgdGhyb3cgRXJyb3IoXCJIVE1MIGF0dHJpYnV0ZSBob29rIG11c3QgcmV0dXJuIG51bGwgb3Igb2JqZWN0XCIpO1xuICAgIF8uZXh0ZW5kKGNvbWJpbmVkQXR0cmlidXRlcywgYXR0cmlidXRlcyk7XG4gIH0pO1xuICByZXR1cm4gY29tYmluZWRBdHRyaWJ1dGVzO1xufTtcbldlYkFwcC5hZGRIdG1sQXR0cmlidXRlSG9vayA9IGZ1bmN0aW9uIChob29rKSB7XG4gIGh0bWxBdHRyaWJ1dGVIb29rcy5wdXNoKGhvb2spO1xufTtcblxuLy8gU2VydmUgYXBwIEhUTUwgZm9yIHRoaXMgVVJMP1xudmFyIGFwcFVybCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgaWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBOT1RFOiBhcHAubWFuaWZlc3QgaXMgbm90IGEgd2ViIHN0YW5kYXJkIGxpa2UgZmF2aWNvbi5pY28gYW5kXG4gIC8vIHJvYm90cy50eHQuIEl0IGlzIGEgZmlsZSBuYW1lIHdlIGhhdmUgY2hvc2VuIHRvIHVzZSBmb3IgSFRNTDVcbiAgLy8gYXBwY2FjaGUgVVJMcy4gSXQgaXMgaW5jbHVkZWQgaGVyZSB0byBwcmV2ZW50IHVzaW5nIGFuIGFwcGNhY2hlXG4gIC8vIHRoZW4gcmVtb3ZpbmcgaXQgZnJvbSBwb2lzb25pbmcgYW4gYXBwIHBlcm1hbmVudGx5LiBFdmVudHVhbGx5LFxuICAvLyBvbmNlIHdlIGhhdmUgc2VydmVyIHNpZGUgcm91dGluZywgdGhpcyB3b24ndCBiZSBuZWVkZWQgYXNcbiAgLy8gdW5rbm93biBVUkxzIHdpdGggcmV0dXJuIGEgNDA0IGF1dG9tYXRpY2FsbHkuXG4gIGlmICh1cmwgPT09ICcvYXBwLm1hbmlmZXN0JylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gQXZvaWQgc2VydmluZyBhcHAgSFRNTCBmb3IgZGVjbGFyZWQgcm91dGVzIHN1Y2ggYXMgL3NvY2tqcy8uXG4gIGlmIChSb3V0ZVBvbGljeS5jbGFzc2lmeSh1cmwpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyB3ZSBjdXJyZW50bHkgcmV0dXJuIGFwcCBIVE1MIG9uIGFsbCBVUkxzIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8vIFdlIG5lZWQgdG8gY2FsY3VsYXRlIHRoZSBjbGllbnQgaGFzaCBhZnRlciBhbGwgcGFja2FnZXMgaGF2ZSBsb2FkZWRcbi8vIHRvIGdpdmUgdGhlbSBhIGNoYW5jZSB0byBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlxuLy9cbi8vIENhbGN1bGF0aW5nIHRoZSBoYXNoIGR1cmluZyBzdGFydHVwIG1lYW5zIHRoYXQgcGFja2FnZXMgY2FuIG9ubHlcbi8vIHBvcHVsYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gZHVyaW5nIGxvYWQsIG5vdCBkdXJpbmcgc3RhcnR1cC5cbi8vXG4vLyBDYWxjdWxhdGluZyBpbnN0ZWFkIGl0IGF0IHRoZSBiZWdpbm5pbmcgb2YgbWFpbiBhZnRlciBhbGwgc3RhcnR1cFxuLy8gaG9va3MgaGFkIHJ1biB3b3VsZCBhbGxvdyBwYWNrYWdlcyB0byBhbHNvIHBvcHVsYXRlXG4vLyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBzdGFydHVwLCBidXQgdGhhdCdzIHRvbyBsYXRlIGZvclxuLy8gYXV0b3VwZGF0ZSBiZWNhdXNlIGl0IG5lZWRzIHRvIGhhdmUgdGhlIGNsaWVudCBoYXNoIGF0IHN0YXJ0dXAgdG9cbi8vIGluc2VydCB0aGUgYXV0byB1cGRhdGUgdmVyc2lvbiBpdHNlbGYgaW50b1xuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyB0byBnZXQgaXQgdG8gdGhlIGNsaWVudC5cbi8vXG4vLyBBbiBhbHRlcm5hdGl2ZSB3b3VsZCBiZSB0byBnaXZlIGF1dG91cGRhdGUgYSBcInBvc3Qtc3RhcnQsXG4vLyBwcmUtbGlzdGVuXCIgaG9vayB0byBhbGxvdyBpdCB0byBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gYXRcbi8vIHRoZSByaWdodCBtb21lbnQuXG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNhbGN1bGF0ZUNsaWVudEhhc2ggPSBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2g7XG4gIFdlYkFwcC5jbGllbnRIYXNoID0gZnVuY3Rpb24gKGFyY2hOYW1lKSB7XG4gICAgYXJjaE5hbWUgPSBhcmNoTmFtZSB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXS5tYW5pZmVzdCk7XG4gIH07XG5cbiAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZSA9IGZ1bmN0aW9uIChhcmNoTmFtZSkge1xuICAgIGFyY2hOYW1lID0gYXJjaE5hbWUgfHwgV2ViQXBwLmRlZmF1bHRBcmNoO1xuICAgIHJldHVybiBjYWxjdWxhdGVDbGllbnRIYXNoKFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoTmFtZV0ubWFuaWZlc3QsXG4gICAgICBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gbmFtZSA9PT0gXCJjc3NcIjtcbiAgICAgIH0pO1xuICB9O1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlID0gZnVuY3Rpb24gKGFyY2hOYW1lKSB7XG4gICAgYXJjaE5hbWUgPSBhcmNoTmFtZSB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXS5tYW5pZmVzdCxcbiAgICAgIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lICE9PSBcImNzc1wiO1xuICAgICAgfSk7XG4gIH07XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoQ29yZG92YSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJjaE5hbWUgPSAnd2ViLmNvcmRvdmEnO1xuICAgIGlmICghIFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoTmFtZV0pXG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaE5hbWVdLm1hbmlmZXN0LCBudWxsLCBfLnBpY2soXG4gICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sICdQVUJMSUNfU0VUVElOR1MnKSk7XG4gIH07XG59KTtcblxuXG5cbi8vIFdoZW4gd2UgaGF2ZSBhIHJlcXVlc3QgcGVuZGluZywgd2Ugd2FudCB0aGUgc29ja2V0IHRpbWVvdXQgdG8gYmUgbG9uZywgdG9cbi8vIGdpdmUgb3Vyc2VsdmVzIGEgd2hpbGUgdG8gc2VydmUgaXQsIGFuZCB0byBhbGxvdyBzb2NranMgbG9uZyBwb2xscyB0b1xuLy8gY29tcGxldGUuICBPbiB0aGUgb3RoZXIgaGFuZCwgd2Ugd2FudCB0byBjbG9zZSBpZGxlIHNvY2tldHMgcmVsYXRpdmVseVxuLy8gcXVpY2tseSwgc28gdGhhdCB3ZSBjYW4gc2h1dCBkb3duIHJlbGF0aXZlbHkgcHJvbXB0bHkgYnV0IGNsZWFubHksIHdpdGhvdXRcbi8vIGN1dHRpbmcgb2ZmIGFueW9uZSdzIHJlc3BvbnNlLlxuV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayA9IGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAvLyB0aGlzIGlzIHJlYWxseSBqdXN0IHJlcS5zb2NrZXQuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgcmVxLnNldFRpbWVvdXQoTE9OR19TT0NLRVRfVElNRU9VVCk7XG4gIC8vIEluc2VydCBvdXIgbmV3IGZpbmlzaCBsaXN0ZW5lciB0byBydW4gQkVGT1JFIHRoZSBleGlzdGluZyBvbmUgd2hpY2ggcmVtb3Zlc1xuICAvLyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc29ja2V0LlxuICB2YXIgZmluaXNoTGlzdGVuZXJzID0gcmVzLmxpc3RlbmVycygnZmluaXNoJyk7XG4gIC8vIFhYWCBBcHBhcmVudGx5IGluIE5vZGUgMC4xMiB0aGlzIGV2ZW50IHdhcyBjYWxsZWQgJ3ByZWZpbmlzaCcuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9jb21taXQvN2M5YjYwNzBcbiAgLy8gQnV0IGl0IGhhcyBzd2l0Y2hlZCBiYWNrIHRvICdmaW5pc2gnIGluIE5vZGUgdjQ6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzE0MTFcbiAgcmVzLnJlbW92ZUFsbExpc3RlbmVycygnZmluaXNoJyk7XG4gIHJlcy5vbignZmluaXNoJywgZnVuY3Rpb24gKCkge1xuICAgIHJlcy5zZXRUaW1lb3V0KFNIT1JUX1NPQ0tFVF9USU1FT1VUKTtcbiAgfSk7XG4gIF8uZWFjaChmaW5pc2hMaXN0ZW5lcnMsIGZ1bmN0aW9uIChsKSB7IHJlcy5vbignZmluaXNoJywgbCk7IH0pO1xufTtcblxuXG4vLyBXaWxsIGJlIHVwZGF0ZWQgYnkgbWFpbiBiZWZvcmUgd2UgbGlzdGVuLlxuLy8gTWFwIGZyb20gY2xpZW50IGFyY2ggdG8gYm9pbGVycGxhdGUgb2JqZWN0LlxuLy8gQm9pbGVycGxhdGUgb2JqZWN0IGhhczpcbi8vICAgLSBmdW5jOiBYWFhcbi8vICAgLSBiYXNlRGF0YTogWFhYXG52YXIgYm9pbGVycGxhdGVCeUFyY2ggPSB7fTtcblxuLy8gUmVnaXN0ZXIgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGNhbiBzZWxlY3RpdmVseSBtb2RpZnkgYm9pbGVycGxhdGVcbi8vIGRhdGEgZ2l2ZW4gYXJndW1lbnRzIChyZXF1ZXN0LCBkYXRhLCBhcmNoKS4gVGhlIGtleSBzaG91bGQgYmUgYSB1bmlxdWVcbi8vIGlkZW50aWZpZXIsIHRvIHByZXZlbnQgYWNjdW11bGF0aW5nIGR1cGxpY2F0ZSBjYWxsYmFja3MgZnJvbSB0aGUgc2FtZVxuLy8gY2FsbCBzaXRlIG92ZXIgdGltZS4gQ2FsbGJhY2tzIHdpbGwgYmUgY2FsbGVkIGluIHRoZSBvcmRlciB0aGV5IHdlcmVcbi8vIHJlZ2lzdGVyZWQuIEEgY2FsbGJhY2sgc2hvdWxkIHJldHVybiBmYWxzZSBpZiBpdCBkaWQgbm90IG1ha2UgYW55XG4vLyBjaGFuZ2VzIGFmZmVjdGluZyB0aGUgYm9pbGVycGxhdGUuIFBhc3NpbmcgbnVsbCBkZWxldGVzIHRoZSBjYWxsYmFjay5cbi8vIEFueSBwcmV2aW91cyBjYWxsYmFjayByZWdpc3RlcmVkIGZvciB0aGlzIGtleSB3aWxsIGJlIHJldHVybmVkLlxuY29uc3QgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbldlYkFwcEludGVybmFscy5yZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrID0gZnVuY3Rpb24gKGtleSwgY2FsbGJhY2spIHtcbiAgY29uc3QgcHJldmlvdXNDYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuXG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldID0gY2FsbGJhY2s7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0LnN0cmljdEVxdWFsKGNhbGxiYWNrLCBudWxsKTtcbiAgICBkZWxldGUgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIHByZXZpb3VzIGNhbGxiYWNrIGluIGNhc2UgdGhlIG5ldyBjYWxsYmFjayBuZWVkcyB0byBjYWxsXG4gIC8vIGl0OyBmb3IgZXhhbXBsZSwgd2hlbiB0aGUgbmV3IGNhbGxiYWNrIGlzIGEgd3JhcHBlciBmb3IgdGhlIG9sZC5cbiAgcmV0dXJuIHByZXZpb3VzQ2FsbGJhY2sgfHwgbnVsbDtcbn07XG5cbi8vIEdpdmVuIGEgcmVxdWVzdCAoYXMgcmV0dXJuZWQgZnJvbSBgY2F0ZWdvcml6ZVJlcXVlc3RgKSwgcmV0dXJuIHRoZVxuLy8gYm9pbGVycGxhdGUgSFRNTCB0byBzZXJ2ZSBmb3IgdGhhdCByZXF1ZXN0LlxuLy9cbi8vIElmIGEgcHJldmlvdXMgY29ubmVjdCBtaWRkbGV3YXJlIGhhcyByZW5kZXJlZCBjb250ZW50IGZvciB0aGUgaGVhZCBvciBib2R5LFxuLy8gcmV0dXJucyB0aGUgYm9pbGVycGxhdGUgd2l0aCB0aGF0IGNvbnRlbnQgcGF0Y2hlZCBpbiBvdGhlcndpc2Vcbi8vIG1lbW9pemVzIG9uIEhUTUwgYXR0cmlidXRlcyAodXNlZCBieSwgZWcsIGFwcGNhY2hlKSBhbmQgd2hldGhlciBpbmxpbmVcbi8vIHNjcmlwdHMgYXJlIGN1cnJlbnRseSBhbGxvd2VkLlxuLy8gWFhYIHNvIGZhciB0aGlzIGZ1bmN0aW9uIGlzIGFsd2F5cyBjYWxsZWQgd2l0aCBhcmNoID09PSAnd2ViLmJyb3dzZXInXG52YXIgbWVtb2l6ZWRCb2lsZXJwbGF0ZSA9IHt9O1xuXG5mdW5jdGlvbiBnZXRCb2lsZXJwbGF0ZShyZXF1ZXN0LCBhcmNoKSB7XG4gIHJldHVybiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpLmF3YWl0KCk7XG59XG5cbmZ1bmN0aW9uIGdldEJvaWxlcnBsYXRlQXN5bmMocmVxdWVzdCwgYXJjaCkge1xuICBjb25zdCBib2lsZXJwbGF0ZSA9IGJvaWxlcnBsYXRlQnlBcmNoW2FyY2hdO1xuICBjb25zdCBkYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgYm9pbGVycGxhdGUuYmFzZURhdGEsIHtcbiAgICBodG1sQXR0cmlidXRlczogZ2V0SHRtbEF0dHJpYnV0ZXMocmVxdWVzdCksXG4gIH0sIF8ucGljayhyZXF1ZXN0LCBcImR5bmFtaWNIZWFkXCIsIFwiZHluYW1pY0JvZHlcIikpO1xuXG4gIGxldCBtYWRlQ2hhbmdlcyA9IGZhbHNlO1xuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIE9iamVjdC5rZXlzKGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcykuZm9yRWFjaChrZXkgPT4ge1xuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgY2FsbGJhY2sgPSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcbiAgICAgIHJldHVybiBjYWxsYmFjayhyZXF1ZXN0LCBkYXRhLCBhcmNoKTtcbiAgICB9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAvLyBDYWxsYmFja3Mgc2hvdWxkIHJldHVybiBmYWxzZSBpZiB0aGV5IGRpZCBub3QgbWFrZSBhbnkgY2hhbmdlcy5cbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgIG1hZGVDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgY29uc3QgdXNlTWVtb2l6ZWQgPSAhIChcbiAgICAgIGRhdGEuZHluYW1pY0hlYWQgfHxcbiAgICAgIGRhdGEuZHluYW1pY0JvZHkgfHxcbiAgICAgIG1hZGVDaGFuZ2VzXG4gICAgKTtcblxuICAgIGlmICghIHVzZU1lbW9pemVkKSB7XG4gICAgICByZXR1cm4gYm9pbGVycGxhdGUudG9IVE1MKGRhdGEpO1xuICAgIH1cblxuICAgIC8vIFRoZSBvbmx5IHRoaW5nIHRoYXQgY2hhbmdlcyBmcm9tIHJlcXVlc3QgdG8gcmVxdWVzdCAodW5sZXNzIGV4dHJhXG4gICAgLy8gY29udGVudCBpcyBhZGRlZCB0byB0aGUgaGVhZCBvciBib2R5LCBvciBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3NcbiAgICAvLyBtb2RpZmllZCB0aGUgZGF0YSkgYXJlIHRoZSBIVE1MIGF0dHJpYnV0ZXMgKHVzZWQgYnksIGVnLCBhcHBjYWNoZSlcbiAgICAvLyBhbmQgd2hldGhlciBpbmxpbmUgc2NyaXB0cyBhcmUgYWxsb3dlZCwgc28gbWVtb2l6ZSBiYXNlZCBvbiB0aGF0LlxuICAgIHZhciBtZW1IYXNoID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gICAgICBodG1sQXR0cmlidXRlczogZGF0YS5odG1sQXR0cmlidXRlcyxcbiAgICAgIGFyY2gsXG4gICAgfSk7XG5cbiAgICBpZiAoISBtZW1vaXplZEJvaWxlcnBsYXRlW21lbUhhc2hdKSB7XG4gICAgICBtZW1vaXplZEJvaWxlcnBsYXRlW21lbUhhc2hdID1cbiAgICAgICAgYm9pbGVycGxhdGVCeUFyY2hbYXJjaF0udG9IVE1MKGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiBtZW1vaXplZEJvaWxlcnBsYXRlW21lbUhhc2hdO1xuICB9KTtcbn1cblxuV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZSA9IGZ1bmN0aW9uIChhcmNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbE9wdGlvbnMpIHtcbiAgYWRkaXRpb25hbE9wdGlvbnMgPSBhZGRpdGlvbmFsT3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcnVudGltZUNvbmZpZyA9IF8uZXh0ZW5kKFxuICAgIF8uY2xvbmUoX19tZXRlb3JfcnVudGltZV9jb25maWdfXyksXG4gICAgYWRkaXRpb25hbE9wdGlvbnMucnVudGltZUNvbmZpZ092ZXJyaWRlcyB8fCB7fVxuICApO1xuICByZXR1cm4gbmV3IEJvaWxlcnBsYXRlKGFyY2gsIG1hbmlmZXN0LFxuICAgIF8uZXh0ZW5kKHtcbiAgICAgIHBhdGhNYXBwZXI6IGZ1bmN0aW9uIChpdGVtUGF0aCkge1xuICAgICAgICByZXR1cm4gcGF0aEpvaW4oYXJjaFBhdGhbYXJjaF0sIGl0ZW1QYXRoKTsgfSxcbiAgICAgIGJhc2VEYXRhRXh0ZW5zaW9uOiB7XG4gICAgICAgIGFkZGl0aW9uYWxTdGF0aWNKczogXy5tYXAoXG4gICAgICAgICAgYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdLFxuICAgICAgICAgIGZ1bmN0aW9uIChjb250ZW50cywgcGF0aG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHBhdGhuYW1lOiBwYXRobmFtZSxcbiAgICAgICAgICAgICAgY29udGVudHM6IGNvbnRlbnRzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgKSxcbiAgICAgICAgLy8gQ29udmVydCB0byBhIEpTT04gc3RyaW5nLCB0aGVuIGdldCByaWQgb2YgbW9zdCB3ZWlyZCBjaGFyYWN0ZXJzLCB0aGVuXG4gICAgICAgIC8vIHdyYXAgaW4gZG91YmxlIHF1b3Rlcy4gKFRoZSBvdXRlcm1vc3QgSlNPTi5zdHJpbmdpZnkgcmVhbGx5IG91Z2h0IHRvXG4gICAgICAgIC8vIGp1c3QgYmUgXCJ3cmFwIGluIGRvdWJsZSBxdW90ZXNcIiBidXQgd2UgdXNlIGl0IHRvIGJlIHNhZmUuKSBUaGlzIG1pZ2h0XG4gICAgICAgIC8vIGVuZCB1cCBpbnNpZGUgYSA8c2NyaXB0PiB0YWcgc28gd2UgbmVlZCB0byBiZSBjYXJlZnVsIHRvIG5vdCBpbmNsdWRlXG4gICAgICAgIC8vIFwiPC9zY3JpcHQ+XCIsIGJ1dCBub3JtYWwge3tzcGFjZWJhcnN9fSBlc2NhcGluZyBlc2NhcGVzIHRvbyBtdWNoISBTZWVcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzM3MzBcbiAgICAgICAgbWV0ZW9yUnVudGltZUNvbmZpZzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHJ1bnRpbWVDb25maWcpKSksXG4gICAgICAgIHJvb3RVcmxQYXRoUHJlZml4OiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnLFxuICAgICAgICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gICAgICAgIGlubGluZVNjcmlwdHNBbGxvd2VkOiBXZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQoKSxcbiAgICAgICAgaW5saW5lOiBhZGRpdGlvbmFsT3B0aW9ucy5pbmxpbmVcbiAgICAgIH1cbiAgICB9LCBhZGRpdGlvbmFsT3B0aW9ucylcbiAgKTtcbn07XG5cbi8vIEEgbWFwcGluZyBmcm9tIHVybCBwYXRoIHRvIFwiaW5mb1wiLiBXaGVyZSBcImluZm9cIiBoYXMgdGhlIGZvbGxvd2luZyBmaWVsZHM6XG4vLyAtIHR5cGU6IHRoZSB0eXBlIG9mIGZpbGUgdG8gYmUgc2VydmVkXG4vLyAtIGNhY2hlYWJsZTogb3B0aW9uYWxseSwgd2hldGhlciB0aGUgZmlsZSBzaG91bGQgYmUgY2FjaGVkIG9yIG5vdFxuLy8gLSBzb3VyY2VNYXBVcmw6IG9wdGlvbmFsbHksIHRoZSB1cmwgb2YgdGhlIHNvdXJjZSBtYXBcbi8vXG4vLyBJbmZvIGFsc28gY29udGFpbnMgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4vLyAtIGNvbnRlbnQ6IHRoZSBzdHJpbmdpZmllZCBjb250ZW50IHRoYXQgc2hvdWxkIGJlIHNlcnZlZCBhdCB0aGlzIHBhdGhcbi8vIC0gYWJzb2x1dGVQYXRoOiB0aGUgYWJzb2x1dGUgcGF0aCBvbiBkaXNrIHRvIHRoZSBmaWxlXG5cbnZhciBzdGF0aWNGaWxlcztcblxuLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0IG9yIGFkZGVkIHdpdGhcbi8vIGBhZGRTdGF0aWNKc2AuIEV4cG9ydGVkIGZvciB0ZXN0cy5cbldlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc01pZGRsZXdhcmUgPSBmdW5jdGlvbiAoc3RhdGljRmlsZXMsIHJlcSwgcmVzLCBuZXh0KSB7XG4gIGlmICgnR0VUJyAhPSByZXEubWV0aG9kICYmICdIRUFEJyAhPSByZXEubWV0aG9kICYmICdPUFRJT05TJyAhPSByZXEubWV0aG9kKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcGF0aG5hbWUgPSBwYXJzZVJlcXVlc3QocmVxKS5wYXRobmFtZTtcbiAgdHJ5IHtcbiAgICBwYXRobmFtZSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXRobmFtZSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBuZXh0KCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHNlcnZlU3RhdGljSnMgPSBmdW5jdGlvbiAocykge1xuICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7XG4gICAgICAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQ7IGNoYXJzZXQ9VVRGLTgnXG4gICAgfSk7XG4gICAgcmVzLndyaXRlKHMpO1xuICAgIHJlcy5lbmQoKTtcbiAgfTtcblxuICBpZiAocGF0aG5hbWUgPT09IFwiL21ldGVvcl9ydW50aW1lX2NvbmZpZy5qc1wiICYmXG4gICAgICAhIFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpKSB7XG4gICAgc2VydmVTdGF0aWNKcyhcIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBcIiArXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fKSArIFwiO1wiKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoXy5oYXMoYWRkaXRpb25hbFN0YXRpY0pzLCBwYXRobmFtZSkgJiZcbiAgICAgICAgICAgICAgISBXZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQoKSkge1xuICAgIHNlcnZlU3RhdGljSnMoYWRkaXRpb25hbFN0YXRpY0pzW3BhdGhuYW1lXSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCFfLmhhcyhzdGF0aWNGaWxlcywgcGF0aG5hbWUpKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFdlIGRvbid0IG5lZWQgdG8gY2FsbCBwYXVzZSBiZWNhdXNlLCB1bmxpa2UgJ3N0YXRpYycsIG9uY2Ugd2UgY2FsbCBpbnRvXG4gIC8vICdzZW5kJyBhbmQgeWllbGQgdG8gdGhlIGV2ZW50IGxvb3AsIHdlIG5ldmVyIGNhbGwgYW5vdGhlciBoYW5kbGVyIHdpdGhcbiAgLy8gJ25leHQnLlxuXG4gIHZhciBpbmZvID0gc3RhdGljRmlsZXNbcGF0aG5hbWVdO1xuXG4gIC8vIENhY2hlYWJsZSBmaWxlcyBhcmUgZmlsZXMgdGhhdCBzaG91bGQgbmV2ZXIgY2hhbmdlLiBUeXBpY2FsbHlcbiAgLy8gbmFtZWQgYnkgdGhlaXIgaGFzaCAoZWcgbWV0ZW9yIGJ1bmRsZWQganMgYW5kIGNzcyBmaWxlcykuXG4gIC8vIFdlIGNhY2hlIHRoZW0gfmZvcmV2ZXIgKDF5cikuXG4gIHZhciBtYXhBZ2UgPSBpbmZvLmNhY2hlYWJsZVxuICAgICAgICA/IDEwMDAgKiA2MCAqIDYwICogMjQgKiAzNjVcbiAgICAgICAgOiAwO1xuXG4gIC8vIFNldCB0aGUgWC1Tb3VyY2VNYXAgaGVhZGVyLCB3aGljaCBjdXJyZW50IENocm9tZSwgRmlyZUZveCwgYW5kIFNhZmFyaVxuICAvLyB1bmRlcnN0YW5kLiAgKFRoZSBTb3VyY2VNYXAgaGVhZGVyIGlzIHNsaWdodGx5IG1vcmUgc3BlYy1jb3JyZWN0IGJ1dCBGRlxuICAvLyBkb2Vzbid0IHVuZGVyc3RhbmQgaXQuKVxuICAvL1xuICAvLyBZb3UgbWF5IGFsc28gbmVlZCB0byBlbmFibGUgc291cmNlIG1hcHMgaW4gQ2hyb21lOiBvcGVuIGRldiB0b29scywgY2xpY2tcbiAgLy8gdGhlIGdlYXIgaW4gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIsIGFuZCBzZWxlY3QgXCJlbmFibGUgc291cmNlIG1hcHNcIi5cbiAgaWYgKGluZm8uc291cmNlTWFwVXJsKSB7XG4gICAgcmVzLnNldEhlYWRlcignWC1Tb3VyY2VNYXAnLFxuICAgICAgICAgICAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCArXG4gICAgICAgICAgICAgICAgICBpbmZvLnNvdXJjZU1hcFVybCk7XG4gIH1cblxuICBpZiAoaW5mby50eXBlID09PSBcImpzXCIgfHxcbiAgICAgIGluZm8udHlwZSA9PT0gXCJkeW5hbWljIGpzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwiY3NzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwidGV4dC9jc3M7IGNoYXJzZXQ9VVRGLThcIik7XG4gIH0gZWxzZSBpZiAoaW5mby50eXBlID09PSBcImpzb25cIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCIpO1xuICB9XG5cbiAgaWYgKGluZm8uaGFzaCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0VUYWcnLCAnXCInICsgaW5mby5oYXNoICsgJ1wiJyk7XG4gIH1cblxuICBpZiAoaW5mby5jb250ZW50KSB7XG4gICAgcmVzLndyaXRlKGluZm8uY29udGVudCk7XG4gICAgcmVzLmVuZCgpO1xuICB9IGVsc2Uge1xuICAgIHNlbmQocmVxLCBpbmZvLmFic29sdXRlUGF0aCwge1xuICAgICAgICBtYXhhZ2U6IG1heEFnZSxcbiAgICAgICAgZG90ZmlsZXM6ICdhbGxvdycsIC8vIGlmIHdlIHNwZWNpZmllZCBhIGRvdGZpbGUgaW4gdGhlIG1hbmlmZXN0LCBzZXJ2ZSBpdFxuICAgICAgICBsYXN0TW9kaWZpZWQ6IGZhbHNlIC8vIGRvbid0IHNldCBsYXN0LW1vZGlmaWVkIGJhc2VkIG9uIHRoZSBmaWxlIGRhdGVcbiAgICAgIH0pLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgTG9nLmVycm9yKFwiRXJyb3Igc2VydmluZyBzdGF0aWMgZmlsZSBcIiArIGVycik7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgfSlcbiAgICAgIC5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBMb2cuZXJyb3IoXCJVbmV4cGVjdGVkIGRpcmVjdG9yeSBcIiArIGluZm8uYWJzb2x1dGVQYXRoKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgICB9KVxuICAgICAgLnBpcGUocmVzKTtcbiAgfVxufTtcblxudmFyIGdldFVybFByZWZpeEZvckFyY2ggPSBmdW5jdGlvbiAoYXJjaCkge1xuICAvLyBYWFggd2UgcmVseSBvbiB0aGUgZmFjdCB0aGF0IGFyY2ggbmFtZXMgZG9uJ3QgY29udGFpbiBzbGFzaGVzXG4gIC8vIGluIHRoYXQgY2FzZSB3ZSB3b3VsZCBuZWVkIHRvIHVyaSBlc2NhcGUgaXRcblxuICAvLyBXZSBhZGQgJ19fJyB0byB0aGUgYmVnaW5uaW5nIG9mIG5vbi1zdGFuZGFyZCBhcmNocyB0byBcInNjb3BlXCIgdGhlIHVybFxuICAvLyB0byBNZXRlb3IgaW50ZXJuYWxzLlxuICByZXR1cm4gYXJjaCA9PT0gV2ViQXBwLmRlZmF1bHRBcmNoID9cbiAgICAnJyA6ICcvJyArICdfXycgKyBhcmNoLnJlcGxhY2UoL153ZWJcXC4vLCAnJyk7XG59O1xuXG4vLyBQYXJzZSB0aGUgcGFzc2VkIGluIHBvcnQgdmFsdWUuIFJldHVybiB0aGUgcG9ydCBhcy1pcyBpZiBpdCdzIGEgU3RyaW5nXG4vLyAoZS5nLiBhIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUpLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBwb3J0IGFzIGFuXG4vLyBpbnRlZ2VyLlxuLy9cbi8vIERFUFJFQ0FURUQ6IERpcmVjdCB1c2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyBub3QgcmVjb21tZW5kZWQ7IGl0IGlzIG5vXG4vLyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5LCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHJlbGVhc2UuXG5XZWJBcHBJbnRlcm5hbHMucGFyc2VQb3J0ID0gcG9ydCA9PiB7XG4gIGxldCBwYXJzZWRQb3J0ID0gcGFyc2VJbnQocG9ydCk7XG4gIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VkUG9ydCkpIHtcbiAgICBwYXJzZWRQb3J0ID0gcG9ydDtcbiAgfVxuICByZXR1cm4gcGFyc2VkUG9ydDtcbn1cblxuZnVuY3Rpb24gcnVuV2ViQXBwU2VydmVyKCkge1xuICB2YXIgc2h1dHRpbmdEb3duID0gZmFsc2U7XG4gIHZhciBzeW5jUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGdldEl0ZW1QYXRobmFtZSA9IGZ1bmN0aW9uIChpdGVtVXJsKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYXJzZVVybChpdGVtVXJsKS5wYXRobmFtZSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgc3RhdGljRmlsZXMgPSB7fTtcbiAgICAgIHZhciBnZW5lcmF0ZUNsaWVudFByb2dyYW0gPSBmdW5jdGlvbiAoY2xpZW50UGF0aCwgYXJjaCkge1xuICAgICAgICAvLyByZWFkIHRoZSBjb250cm9sIGZvciB0aGUgY2xpZW50IHdlJ2xsIGJlIHNlcnZpbmcgdXBcbiAgICAgICAgdmFyIGNsaWVudEpzb25QYXRoID0gcGF0aEpvaW4oX19tZXRlb3JfYm9vdHN0cmFwX18uc2VydmVyRGlyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRQYXRoKTtcbiAgICAgICAgdmFyIGNsaWVudERpciA9IHBhdGhEaXJuYW1lKGNsaWVudEpzb25QYXRoKTtcbiAgICAgICAgdmFyIGNsaWVudEpzb24gPSBKU09OLnBhcnNlKHJlYWRVdGY4RmlsZVN5bmMoY2xpZW50SnNvblBhdGgpKTtcbiAgICAgICAgaWYgKGNsaWVudEpzb24uZm9ybWF0ICE9PSBcIndlYi1wcm9ncmFtLXByZTFcIilcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBmb3JtYXQgZm9yIGNsaWVudCBhc3NldHM6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoY2xpZW50SnNvbi5mb3JtYXQpKTtcblxuICAgICAgICBpZiAoISBjbGllbnRKc29uUGF0aCB8fCAhIGNsaWVudERpciB8fCAhIGNsaWVudEpzb24pXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2xpZW50IGNvbmZpZyBmaWxlIG5vdCBwYXJzZWQuXCIpO1xuXG4gICAgICAgIHZhciB1cmxQcmVmaXggPSBnZXRVcmxQcmVmaXhGb3JBcmNoKGFyY2gpO1xuXG4gICAgICAgIHZhciBtYW5pZmVzdCA9IGNsaWVudEpzb24ubWFuaWZlc3Q7XG4gICAgICAgIF8uZWFjaChtYW5pZmVzdCwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICBpZiAoaXRlbS51cmwgJiYgaXRlbS53aGVyZSA9PT0gXCJjbGllbnRcIikge1xuICAgICAgICAgICAgc3RhdGljRmlsZXNbdXJsUHJlZml4ICsgZ2V0SXRlbVBhdGhuYW1lKGl0ZW0udXJsKV0gPSB7XG4gICAgICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnBhdGgpLFxuICAgICAgICAgICAgICBjYWNoZWFibGU6IGl0ZW0uY2FjaGVhYmxlLFxuICAgICAgICAgICAgICBoYXNoOiBpdGVtLmhhc2gsXG4gICAgICAgICAgICAgIC8vIExpbmsgZnJvbSBzb3VyY2UgdG8gaXRzIG1hcFxuICAgICAgICAgICAgICBzb3VyY2VNYXBVcmw6IGl0ZW0uc291cmNlTWFwVXJsLFxuICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpdGVtLnNvdXJjZU1hcCkge1xuICAgICAgICAgICAgICAvLyBTZXJ2ZSB0aGUgc291cmNlIG1hcCB0b28sIHVuZGVyIHRoZSBzcGVjaWZpZWQgVVJMLiBXZSBhc3N1bWUgYWxsXG4gICAgICAgICAgICAgIC8vIHNvdXJjZSBtYXBzIGFyZSBjYWNoZWFibGUuXG4gICAgICAgICAgICAgIHN0YXRpY0ZpbGVzW3VybFByZWZpeCArIGdldEl0ZW1QYXRobmFtZShpdGVtLnNvdXJjZU1hcFVybCldID0ge1xuICAgICAgICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnNvdXJjZU1hcCksXG4gICAgICAgICAgICAgICAgY2FjaGVhYmxlOiB0cnVlXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcHJvZ3JhbSA9IHtcbiAgICAgICAgICBmb3JtYXQ6IFwid2ViLXByb2dyYW0tcHJlMVwiLFxuICAgICAgICAgIG1hbmlmZXN0OiBtYW5pZmVzdCxcbiAgICAgICAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5BVVRPVVBEQVRFX1ZFUlNJT04gfHxcbiAgICAgICAgICAgIFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgICAgICAgbWFuaWZlc3QsXG4gICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgIF8ucGljayhfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLCBcIlBVQkxJQ19TRVRUSU5HU1wiKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICBjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zOiBjbGllbnRKc29uLmNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMsXG4gICAgICAgICAgUFVCTElDX1NFVFRJTkdTOiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlBVQkxJQ19TRVRUSU5HU1xuICAgICAgICB9O1xuXG4gICAgICAgIFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXSA9IHByb2dyYW07XG5cbiAgICAgICAgLy8gU2VydmUgdGhlIHByb2dyYW0gYXMgYSBzdHJpbmcgYXQgL2Zvby88YXJjaD4vbWFuaWZlc3QuanNvblxuICAgICAgICAvLyBYWFggY2hhbmdlIG1hbmlmZXN0Lmpzb24gLT4gcHJvZ3JhbS5qc29uXG4gICAgICAgIHN0YXRpY0ZpbGVzW3VybFByZWZpeCArIGdldEl0ZW1QYXRobmFtZSgnL21hbmlmZXN0Lmpzb24nKV0gPSB7XG4gICAgICAgICAgY29udGVudDogSlNPTi5zdHJpbmdpZnkocHJvZ3JhbSksXG4gICAgICAgICAgY2FjaGVhYmxlOiBmYWxzZSxcbiAgICAgICAgICBoYXNoOiBwcm9ncmFtLnZlcnNpb24sXG4gICAgICAgICAgdHlwZTogXCJqc29uXCJcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBjbGllbnRQYXRocyA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLmNvbmZpZ0pzb24uY2xpZW50UGF0aHM7XG4gICAgICAgIF8uZWFjaChjbGllbnRQYXRocywgZnVuY3Rpb24gKGNsaWVudFBhdGgsIGFyY2gpIHtcbiAgICAgICAgICBhcmNoUGF0aFthcmNoXSA9IHBhdGhEaXJuYW1lKGNsaWVudFBhdGgpO1xuICAgICAgICAgIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShjbGllbnRQYXRoLCBhcmNoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXhwb3J0ZWQgZm9yIHRlc3RzLlxuICAgICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXMgPSBzdGF0aWNGaWxlcztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nLmVycm9yKFwiRXJyb3IgcmVsb2FkaW5nIHRoZSBjbGllbnQgcHJvZ3JhbTogXCIgKyBlLnN0YWNrKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRoaXMgYm9pbGVycGxhdGUgd2lsbCBiZSBzZXJ2ZWQgdG8gdGhlIG1vYmlsZSBkZXZpY2VzIHdoZW4gdXNlZCB3aXRoXG4gICAgLy8gTWV0ZW9yL0NvcmRvdmEgZm9yIHRoZSBIb3QtQ29kZSBQdXNoIGFuZCBzaW5jZSB0aGUgZmlsZSB3aWxsIGJlIHNlcnZlZCBieVxuICAgIC8vIHRoZSBkZXZpY2UncyBzZXJ2ZXIsIGl0IGlzIGltcG9ydGFudCB0byBzZXQgdGhlIEREUCB1cmwgdG8gdGhlIGFjdHVhbFxuICAgIC8vIE1ldGVvciBzZXJ2ZXIgYWNjZXB0aW5nIEREUCBjb25uZWN0aW9ucyBhbmQgbm90IHRoZSBkZXZpY2UncyBmaWxlIHNlcnZlci5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnNGb3JBcmNoID0ge1xuICAgICAgJ3dlYi5jb3Jkb3ZhJzoge1xuICAgICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgICAgLy8gWFhYIFdlIHVzZSBhYnNvbHV0ZVVybCgpIGhlcmUgc28gdGhhdCB3ZSBzZXJ2ZSBodHRwczovL1xuICAgICAgICAgIC8vIFVSTHMgdG8gY29yZG92YSBjbGllbnRzIGlmIGZvcmNlLXNzbCBpcyBpbiB1c2UuIElmIHdlIHdlcmVcbiAgICAgICAgICAvLyB0byB1c2UgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCBpbnN0ZWFkIG9mXG4gICAgICAgICAgLy8gYWJzb2x1dGVVcmwoKSwgdGhlbiBDb3Jkb3ZhIGNsaWVudHMgd291bGQgaW1tZWRpYXRlbHkgZ2V0IGFcbiAgICAgICAgICAvLyBIQ1Agc2V0dGluZyB0aGVpciBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCB0b1xuICAgICAgICAgIC8vIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20uIFRoaXMgYnJlYWtzIHRoZSBhcHAsIGJlY2F1c2VcbiAgICAgICAgICAvLyBmb3JjZS1zc2wgZG9lc24ndCBzZXJ2ZSBDT1JTIGhlYWRlcnMgb24gMzAyXG4gICAgICAgICAgLy8gcmVkaXJlY3RzLiAoUGx1cyBpdCdzIHVuZGVzaXJhYmxlIHRvIGhhdmUgY2xpZW50c1xuICAgICAgICAgIC8vIGNvbm5lY3RpbmcgdG8gaHR0cDovL2V4YW1wbGUubWV0ZW9yLmNvbSB3aGVuIGZvcmNlLXNzbCBpc1xuICAgICAgICAgIC8vIGluIHVzZS4pXG4gICAgICAgICAgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ERFBfVVJMIHx8XG4gICAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKSxcbiAgICAgICAgICBST09UX1VSTDogcHJvY2Vzcy5lbnYuTU9CSUxFX1JPT1RfVVJMIHx8XG4gICAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgXy5lYWNoKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgZnVuY3Rpb24gKHByb2dyYW0sIGFyY2hOYW1lKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQnlBcmNoW2FyY2hOYW1lXSA9XG4gICAgICAgICAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZShcbiAgICAgICAgICAgIGFyY2hOYW1lLCBwcm9ncmFtLm1hbmlmZXN0LFxuICAgICAgICAgICAgZGVmYXVsdE9wdGlvbnNGb3JBcmNoW2FyY2hOYW1lXSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ2xlYXIgdGhlIG1lbW9pemVkIGJvaWxlcnBsYXRlIGNhY2hlLlxuICAgICAgbWVtb2l6ZWRCb2lsZXJwbGF0ZSA9IHt9O1xuXG4gICAgICAvLyBDb25maWd1cmUgQ1NTIGluamVjdGlvbiBmb3IgdGhlIGRlZmF1bHQgYXJjaFxuICAgICAgLy8gWFhYIGltcGxlbWVudCB0aGUgQ1NTIGluamVjdGlvbiBmb3IgYWxsIGFyY2hzP1xuICAgICAgdmFyIGNzc0ZpbGVzID0gYm9pbGVycGxhdGVCeUFyY2hbV2ViQXBwLmRlZmF1bHRBcmNoXS5iYXNlRGF0YS5jc3M7XG4gICAgICAvLyBSZXdyaXRlIGFsbCBDU1MgZmlsZXMgKHdoaWNoIGFyZSB3cml0dGVuIGRpcmVjdGx5IHRvIDxzdHlsZT4gdGFncylcbiAgICAgIC8vIGJ5IGF1dG91cGRhdGVfY2xpZW50IHRvIHVzZSB0aGUgQ0ROIHByZWZpeC9ldGNcbiAgICAgIHZhciBhbGxDc3MgPSBfLm1hcChjc3NGaWxlcywgZnVuY3Rpb24oY3NzRmlsZSkge1xuICAgICAgICByZXR1cm4geyB1cmw6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGNzc0ZpbGUudXJsKSB9O1xuICAgICAgfSk7XG4gICAgICBXZWJBcHBJbnRlcm5hbHMucmVmcmVzaGFibGVBc3NldHMgPSB7IGFsbENzcyB9O1xuICAgIH0pO1xuICB9O1xuXG4gIFdlYkFwcEludGVybmFscy5yZWxvYWRDbGllbnRQcm9ncmFtcygpO1xuXG4gIC8vIHdlYnNlcnZlclxuICB2YXIgYXBwID0gY29ubmVjdCgpO1xuXG4gIC8vIFBhY2thZ2VzIGFuZCBhcHBzIGNhbiBhZGQgaGFuZGxlcnMgdGhhdCBydW4gYmVmb3JlIGFueSBvdGhlciBNZXRlb3JcbiAgLy8gaGFuZGxlcnMgdmlhIFdlYkFwcC5yYXdDb25uZWN0SGFuZGxlcnMuXG4gIHZhciByYXdDb25uZWN0SGFuZGxlcnMgPSBjb25uZWN0KCk7XG4gIGFwcC51c2UocmF3Q29ubmVjdEhhbmRsZXJzKTtcblxuICAvLyBBdXRvLWNvbXByZXNzIGFueSBqc29uLCBqYXZhc2NyaXB0LCBvciB0ZXh0LlxuICBhcHAudXNlKGNvbm5lY3QuY29tcHJlc3MoKSk7XG5cbiAgLy8gV2UncmUgbm90IGEgcHJveHk7IHJlamVjdCAod2l0aG91dCBjcmFzaGluZykgYXR0ZW1wdHMgdG8gdHJlYXQgdXMgbGlrZVxuICAvLyBvbmUuIChTZWUgIzEyMTIuKVxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKFJvdXRlUG9saWN5LmlzVmFsaWRVcmwocmVxLnVybCkpIHtcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgIHJlcy53cml0ZShcIk5vdCBhIHByb3h5XCIpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cbiAgLy8gU3RyaXAgb2ZmIHRoZSBwYXRoIHByZWZpeCwgaWYgaXQgZXhpc3RzLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIHZhciBwYXRoUHJlZml4ID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWDtcbiAgICB2YXIgdXJsID0gTnBtLnJlcXVpcmUoJ3VybCcpLnBhcnNlKHJlcXVlc3QudXJsKTtcbiAgICB2YXIgcGF0aG5hbWUgPSB1cmwucGF0aG5hbWU7XG4gICAgLy8gY2hlY2sgaWYgdGhlIHBhdGggaW4gdGhlIHVybCBzdGFydHMgd2l0aCB0aGUgcGF0aCBwcmVmaXggKGFuZCB0aGUgcGFydFxuICAgIC8vIGFmdGVyIHRoZSBwYXRoIHByZWZpeCBtdXN0IHN0YXJ0IHdpdGggYSAvIGlmIGl0IGV4aXN0cy4pXG4gICAgaWYgKHBhdGhQcmVmaXggJiYgcGF0aG5hbWUuc3Vic3RyaW5nKDAsIHBhdGhQcmVmaXgubGVuZ3RoKSA9PT0gcGF0aFByZWZpeCAmJlxuICAgICAgIChwYXRobmFtZS5sZW5ndGggPT0gcGF0aFByZWZpeC5sZW5ndGhcbiAgICAgICAgfHwgcGF0aG5hbWUuc3Vic3RyaW5nKHBhdGhQcmVmaXgubGVuZ3RoLCBwYXRoUHJlZml4Lmxlbmd0aCArIDEpID09PSBcIi9cIikpIHtcbiAgICAgIHJlcXVlc3QudXJsID0gcmVxdWVzdC51cmwuc3Vic3RyaW5nKHBhdGhQcmVmaXgubGVuZ3RoKTtcbiAgICAgIG5leHQoKTtcbiAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSBcIi9mYXZpY29uLmljb1wiIHx8IHBhdGhuYW1lID09PSBcIi9yb2JvdHMudHh0XCIpIHtcbiAgICAgIG5leHQoKTtcbiAgICB9IGVsc2UgaWYgKHBhdGhQcmVmaXgpIHtcbiAgICAgIHJlc3BvbnNlLndyaXRlSGVhZCg0MDQpO1xuICAgICAgcmVzcG9uc2Uud3JpdGUoXCJVbmtub3duIHBhdGhcIik7XG4gICAgICByZXNwb25zZS5lbmQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUGFyc2UgdGhlIHF1ZXJ5IHN0cmluZyBpbnRvIHJlcy5xdWVyeS4gVXNlZCBieSBvYXV0aF9zZXJ2ZXIsIGJ1dCBpdCdzXG4gIC8vIGdlbmVyYWxseSBwcmV0dHkgaGFuZHkuLlxuICBhcHAudXNlKGNvbm5lY3QucXVlcnkoKSk7XG5cbiAgLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0LlxuICAvLyBUaGlzIGlzIGluc3BpcmVkIGJ5IHRoZSAnc3RhdGljJyBtaWRkbGV3YXJlLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzTWlkZGxld2FyZShzdGF0aWNGaWxlcywgcmVxLCByZXMsIG5leHQpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBQYWNrYWdlcyBhbmQgYXBwcyBjYW4gYWRkIGhhbmRsZXJzIHRvIHRoaXMgdmlhIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMuXG4gIC8vIFRoZXkgYXJlIGluc2VydGVkIGJlZm9yZSBvdXIgZGVmYXVsdCBoYW5kbGVyLlxuICB2YXIgcGFja2FnZUFuZEFwcEhhbmRsZXJzID0gY29ubmVjdCgpO1xuICBhcHAudXNlKHBhY2thZ2VBbmRBcHBIYW5kbGVycyk7XG5cbiAgdmFyIHN1cHByZXNzQ29ubmVjdEVycm9ycyA9IGZhbHNlO1xuICAvLyBjb25uZWN0IGtub3dzIGl0IGlzIGFuIGVycm9yIGhhbmRsZXIgYmVjYXVzZSBpdCBoYXMgNCBhcmd1bWVudHMgaW5zdGVhZCBvZlxuICAvLyAzLiBnbyBmaWd1cmUuICAoSXQgaXMgbm90IHNtYXJ0IGVub3VnaCB0byBmaW5kIHN1Y2ggYSB0aGluZyBpZiBpdCdzIGhpZGRlblxuICAvLyBpbnNpZGUgcGFja2FnZUFuZEFwcEhhbmRsZXJzLilcbiAgYXBwLnVzZShmdW5jdGlvbiAoZXJyLCByZXEsIHJlcywgbmV4dCkge1xuICAgIGlmICghZXJyIHx8ICFzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgfHwgIXJlcS5oZWFkZXJzWyd4LXN1cHByZXNzLWVycm9yJ10pIHtcbiAgICAgIG5leHQoZXJyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLndyaXRlSGVhZChlcnIuc3RhdHVzLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgcmVzLmVuZChcIkFuIGVycm9yIG1lc3NhZ2VcIik7XG4gIH0pO1xuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICBpZiAoISBhcHBVcmwocmVxLnVybCkpIHtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhlYWRlcnMgPSB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04J1xuICAgICAgfTtcblxuICAgICAgaWYgKHNodXR0aW5nRG93bikge1xuICAgICAgICBoZWFkZXJzWydDb25uZWN0aW9uJ10gPSAnQ2xvc2UnO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVxdWVzdCA9IFdlYkFwcC5jYXRlZ29yaXplUmVxdWVzdChyZXEpO1xuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9jc3NfcmVzb3VyY2UnXSkge1xuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIHdlJ3JlIHJlcXVlc3RpbmcgYSBDU1MgcmVzb3VyY2UgaW4gdGhlIG1ldGVvci1zcGVjaWZpY1xuICAgICAgICAvLyB3YXksIGJ1dCB3ZSBkb24ndCBoYXZlIGl0LiAgU2VydmUgYSBzdGF0aWMgY3NzIGZpbGUgdGhhdCBpbmRpY2F0ZXMgdGhhdFxuICAgICAgICAvLyB3ZSBkaWRuJ3QgaGF2ZSBpdCwgc28gd2UgY2FuIGRldGVjdCB0aGF0IGFuZCByZWZyZXNoLiAgTWFrZSBzdXJlXG4gICAgICAgIC8vIHRoYXQgYW55IHByb3hpZXMgb3IgQ0ROcyBkb24ndCBjYWNoZSB0aGlzIGVycm9yISAgKE5vcm1hbGx5IHByb3hpZXNcbiAgICAgICAgLy8gb3IgQ0ROcyBhcmUgc21hcnQgZW5vdWdoIG5vdCB0byBjYWNoZSBlcnJvciBwYWdlcywgYnV0IGluIG9yZGVyIHRvXG4gICAgICAgIC8vIG1ha2UgdGhpcyBoYWNrIHdvcmssIHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBDU1MgZmlsZSBhcyBhIDIwMCwgd2hpY2hcbiAgICAgICAgLy8gd291bGQgb3RoZXJ3aXNlIGJlIGNhY2hlZC4pXG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ3RleHQvY3NzOyBjaGFyc2V0PXV0Zi04JztcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIGhlYWRlcnMpO1xuICAgICAgICByZXMud3JpdGUoXCIubWV0ZW9yLWNzcy1ub3QtZm91bmQtZXJyb3IgeyB3aWR0aDogMHB4O31cIik7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9qc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSwgd2UncmUgcmVxdWVzdGluZyBhIEpTIHJlc291cmNlIHRoYXQgd2UgZG9uJ3QgaGF2ZS5cbiAgICAgICAgLy8gU2VydmUgYW4gdW5jYWNoZWQgNDA0LiAoV2UgY2FuJ3QgdXNlIHRoZSBzYW1lIGhhY2sgd2UgdXNlIGZvciBDU1MsXG4gICAgICAgIC8vIGJlY2F1c2UgYWN0dWFsbHkgYWN0aW5nIG9uIHRoYXQgaGFjayByZXF1aXJlcyB1cyB0byBoYXZlIHRoZSBKU1xuICAgICAgICAvLyBhbHJlYWR5ISlcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9kb250X3NlcnZlX2luZGV4J10pIHtcbiAgICAgICAgLy8gV2hlbiBkb3dubG9hZGluZyBmaWxlcyBkdXJpbmcgYSBDb3Jkb3ZhIGhvdCBjb2RlIHB1c2gsIHdlIG5lZWRcbiAgICAgICAgLy8gdG8gZGV0ZWN0IGlmIGEgZmlsZSBpcyBub3QgYXZhaWxhYmxlIGluc3RlYWQgb2YgaW5hZHZlcnRlbnRseVxuICAgICAgICAvLyBkb3dubG9hZGluZyB0aGUgZGVmYXVsdCBpbmRleCBwYWdlLlxuICAgICAgICAvLyBTbyBzaW1pbGFyIHRvIHRoZSBzaXR1YXRpb24gYWJvdmUsIHdlIHNlcnZlIGFuIHVuY2FjaGVkIDQwNC5cbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyAvcGFja2FnZXMvYXNkZnNhZCAuLi4gL19fY29yZG92YS9kYWZzZGYuanNcbiAgICAgIHZhciBwYXRobmFtZSA9IHBhcnNlUmVxdWVzdChyZXEpLnBhdGhuYW1lO1xuICAgICAgdmFyIGFyY2hLZXkgPSBwYXRobmFtZS5zcGxpdCgnLycpWzFdO1xuICAgICAgdmFyIGFyY2hLZXlDbGVhbmVkID0gJ3dlYi4nICsgYXJjaEtleS5yZXBsYWNlKC9eX18vLCAnJyk7XG5cbiAgICAgIGlmICghL15fXy8udGVzdChhcmNoS2V5KSB8fCAhXy5oYXMoYXJjaFBhdGgsIGFyY2hLZXlDbGVhbmVkKSkge1xuICAgICAgICBhcmNoS2V5ID0gV2ViQXBwLmRlZmF1bHRBcmNoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJjaEtleSA9IGFyY2hLZXlDbGVhbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgYXJjaEtleVxuICAgICAgKS50aGVuKGJvaWxlcnBsYXRlID0+IHtcbiAgICAgICAgdmFyIHN0YXR1c0NvZGUgPSByZXMuc3RhdHVzQ29kZSA/IHJlcy5zdGF0dXNDb2RlIDogMjAwO1xuICAgICAgICByZXMud3JpdGVIZWFkKHN0YXR1c0NvZGUsIGhlYWRlcnMpO1xuICAgICAgICByZXMud3JpdGUoYm9pbGVycGxhdGUpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgIExvZy5lcnJvcihcIkVycm9yIHJ1bm5pbmcgdGVtcGxhdGU6IFwiICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBSZXR1cm4gNDA0IGJ5IGRlZmF1bHQsIGlmIG5vIG90aGVyIGhhbmRsZXJzIHNlcnZlIHRoaXMgVVJMLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICByZXMuZW5kKCk7XG4gIH0pO1xuXG5cbiAgdmFyIGh0dHBTZXJ2ZXIgPSBjcmVhdGVTZXJ2ZXIoYXBwKTtcbiAgdmFyIG9uTGlzdGVuaW5nQ2FsbGJhY2tzID0gW107XG5cbiAgLy8gQWZ0ZXIgNSBzZWNvbmRzIHcvbyBkYXRhIG9uIGEgc29ja2V0LCBraWxsIGl0LiAgT24gdGhlIG90aGVyIGhhbmQsIGlmXG4gIC8vIHRoZXJlJ3MgYW4gb3V0c3RhbmRpbmcgcmVxdWVzdCwgZ2l2ZSBpdCBhIGhpZ2hlciB0aW1lb3V0IGluc3RlYWQgKHRvIGF2b2lkXG4gIC8vIGtpbGxpbmcgbG9uZy1wb2xsaW5nIHJlcXVlc3RzKVxuICBodHRwU2VydmVyLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuXG4gIC8vIERvIHRoaXMgaGVyZSwgYW5kIHRoZW4gYWxzbyBpbiBsaXZlZGF0YS9zdHJlYW1fc2VydmVyLmpzLCBiZWNhdXNlXG4gIC8vIHN0cmVhbV9zZXJ2ZXIuanMga2lsbHMgYWxsIHRoZSBjdXJyZW50IHJlcXVlc3QgaGFuZGxlcnMgd2hlbiBpbnN0YWxsaW5nIGl0c1xuICAvLyBvd24uXG4gIGh0dHBTZXJ2ZXIub24oJ3JlcXVlc3QnLCBXZWJBcHAuX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrKTtcblxuICAvLyBJZiB0aGUgY2xpZW50IGdhdmUgdXMgYSBiYWQgcmVxdWVzdCwgdGVsbCBpdCBpbnN0ZWFkIG9mIGp1c3QgY2xvc2luZyB0aGVcbiAgLy8gc29ja2V0LiBUaGlzIGxldHMgbG9hZCBiYWxhbmNlcnMgaW4gZnJvbnQgb2YgdXMgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIFwiYVxuICAvLyBzZXJ2ZXIgaXMgcmFuZG9tbHkgY2xvc2luZyBzb2NrZXRzIGZvciBubyByZWFzb25cIiBhbmQgXCJjbGllbnQgc2VudCBhIGJhZFxuICAvLyByZXF1ZXN0XCIuXG4gIC8vXG4gIC8vIFRoaXMgd2lsbCBvbmx5IHdvcmsgb24gTm9kZSA2OyBOb2RlIDQgZGVzdHJveXMgdGhlIHNvY2tldCBiZWZvcmUgY2FsbGluZ1xuICAvLyB0aGlzIGV2ZW50LiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvNDU1Ny8gZm9yIGRldGFpbHMuXG4gIGh0dHBTZXJ2ZXIub24oJ2NsaWVudEVycm9yJywgKGVyciwgc29ja2V0KSA9PiB7XG4gICAgLy8gUHJlLU5vZGUtNiwgZG8gbm90aGluZy5cbiAgICBpZiAoc29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChlcnIubWVzc2FnZSA9PT0gJ1BhcnNlIEVycm9yJykge1xuICAgICAgc29ja2V0LmVuZCgnSFRUUC8xLjEgNDAwIEJhZCBSZXF1ZXN0XFxyXFxuXFxyXFxuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBvdGhlciBlcnJvcnMsIHVzZSB0aGUgZGVmYXVsdCBiZWhhdmlvciBhcyBpZiB3ZSBoYWQgbm8gY2xpZW50RXJyb3JcbiAgICAgIC8vIGhhbmRsZXIuXG4gICAgICBzb2NrZXQuZGVzdHJveShlcnIpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc3RhcnQgdXAgYXBwXG4gIF8uZXh0ZW5kKFdlYkFwcCwge1xuICAgIGNvbm5lY3RIYW5kbGVyczogcGFja2FnZUFuZEFwcEhhbmRsZXJzLFxuICAgIHJhd0Nvbm5lY3RIYW5kbGVyczogcmF3Q29ubmVjdEhhbmRsZXJzLFxuICAgIGh0dHBTZXJ2ZXI6IGh0dHBTZXJ2ZXIsXG4gICAgY29ubmVjdEFwcDogYXBwLFxuICAgIC8vIEZvciB0ZXN0aW5nLlxuICAgIHN1cHByZXNzQ29ubmVjdEVycm9yczogZnVuY3Rpb24gKCkge1xuICAgICAgc3VwcHJlc3NDb25uZWN0RXJyb3JzID0gdHJ1ZTtcbiAgICB9LFxuICAgIG9uTGlzdGVuaW5nOiBmdW5jdGlvbiAoZikge1xuICAgICAgaWYgKG9uTGlzdGVuaW5nQ2FsbGJhY2tzKVxuICAgICAgICBvbkxpc3RlbmluZ0NhbGxiYWNrcy5wdXNoKGYpO1xuICAgICAgZWxzZVxuICAgICAgICBmKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBMZXQgdGhlIHJlc3Qgb2YgdGhlIHBhY2thZ2VzIChhbmQgTWV0ZW9yLnN0YXJ0dXAgaG9va3MpIGluc2VydCBjb25uZWN0XG4gIC8vIG1pZGRsZXdhcmVzIGFuZCB1cGRhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXywgdGhlbiBrZWVwIGdvaW5nIHRvIHNldCB1cFxuICAvLyBhY3R1YWxseSBzZXJ2aW5nIEhUTUwuXG4gIGV4cG9ydHMubWFpbiA9IGFyZ3YgPT4ge1xuICAgIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG5cbiAgICBjb25zdCBzdGFydEh0dHBTZXJ2ZXIgPSBsaXN0ZW5PcHRpb25zID0+IHtcbiAgICAgIGh0dHBTZXJ2ZXIubGlzdGVuKGxpc3Rlbk9wdGlvbnMsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTUVURU9SX1BSSU5UX09OX0xJU1RFTikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiTElTVEVOSU5HXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9IG9uTGlzdGVuaW5nQ2FsbGJhY2tzO1xuICAgICAgICBvbkxpc3RlbmluZ0NhbGxiYWNrcyA9IG51bGw7XG4gICAgICAgIGNhbGxiYWNrcy5mb3JFYWNoKGNhbGxiYWNrID0+IHsgY2FsbGJhY2soKTsgfSk7XG4gICAgICB9LCBlID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGxpc3RlbmluZzpcIiwgZSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSAmJiBlLnN0YWNrKTtcbiAgICAgIH0pKTtcbiAgICB9O1xuXG4gICAgbGV0IGxvY2FsUG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMDtcbiAgICBjb25zdCB1bml4U29ja2V0UGF0aCA9IHByb2Nlc3MuZW52LlVOSVhfU09DS0VUX1BBVEg7XG5cbiAgICBpZiAodW5peFNvY2tldFBhdGgpIHtcbiAgICAgIC8vIFN0YXJ0IHRoZSBIVFRQIHNlcnZlciB1c2luZyBhIHNvY2tldCBmaWxlLlxuICAgICAgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlKHVuaXhTb2NrZXRQYXRoKTtcbiAgICAgIHN0YXJ0SHR0cFNlcnZlcih7IHBhdGg6IHVuaXhTb2NrZXRQYXRoIH0pO1xuICAgICAgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCh1bml4U29ja2V0UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2FsUG9ydCA9IGlzTmFOKE51bWJlcihsb2NhbFBvcnQpKSA/IGxvY2FsUG9ydCA6IE51bWJlcihsb2NhbFBvcnQpO1xuICAgICAgaWYgKC9cXFxcXFxcXD8uK1xcXFxwaXBlXFxcXD8uKy8udGVzdChsb2NhbFBvcnQpKSB7XG4gICAgICAgIC8vIFN0YXJ0IHRoZSBIVFRQIHNlcnZlciB1c2luZyBXaW5kb3dzIFNlcnZlciBzdHlsZSBuYW1lZCBwaXBlLlxuICAgICAgICBzdGFydEh0dHBTZXJ2ZXIoeyBwYXRoOiBsb2NhbFBvcnQgfSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsb2NhbFBvcnQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFRDUC5cbiAgICAgICAgc3RhcnRIdHRwU2VydmVyKHtcbiAgICAgICAgICBwb3J0OiBsb2NhbFBvcnQsXG4gICAgICAgICAgaG9zdDogcHJvY2Vzcy5lbnYuQklORF9JUCB8fCBcIjAuMC4wLjBcIlxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgUE9SVCBzcGVjaWZpZWRcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFwiREFFTU9OXCI7XG4gIH07XG59XG5cblxucnVuV2ViQXBwU2VydmVyKCk7XG5cblxudmFyIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdHJ1ZTtcblxuV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaW5saW5lU2NyaXB0c0FsbG93ZWQ7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0SW5saW5lU2NyaXB0c0FsbG93ZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQgPSB2YWx1ZTtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cblxuV2ViQXBwSW50ZXJuYWxzLnNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rID0gZnVuY3Rpb24gKGhvb2tGbikge1xuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGhvb2tGbjtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRCdW5kbGVkSnNDc3NQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhcbiAgICBmdW5jdGlvbiAodXJsKSB7XG4gICAgICByZXR1cm4gcHJlZml4ICsgdXJsO1xuICB9KTtcbn07XG5cbi8vIFBhY2thZ2VzIGNhbiBjYWxsIGBXZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnNgIHRvIHNwZWNpZnkgc3RhdGljXG4vLyBKYXZhU2NyaXB0IHRvIGJlIGluY2x1ZGVkIGluIHRoZSBhcHAuIFRoaXMgc3RhdGljIEpTIHdpbGwgYmUgaW5saW5lZCxcbi8vIHVubGVzcyBpbmxpbmUgc2NyaXB0cyBoYXZlIGJlZW4gZGlzYWJsZWQsIGluIHdoaWNoIGNhc2UgaXQgd2lsbCBiZVxuLy8gc2VydmVkIHVuZGVyIGAvPHNoYTEgb2YgY29udGVudHM+YC5cbnZhciBhZGRpdGlvbmFsU3RhdGljSnMgPSB7fTtcbldlYkFwcEludGVybmFscy5hZGRTdGF0aWNKcyA9IGZ1bmN0aW9uIChjb250ZW50cykge1xuICBhZGRpdGlvbmFsU3RhdGljSnNbXCIvXCIgKyBzaGExKGNvbnRlbnRzKSArIFwiLmpzXCJdID0gY29udGVudHM7XG59O1xuXG4vLyBFeHBvcnRlZCBmb3IgdGVzdHNcbldlYkFwcEludGVybmFscy5nZXRCb2lsZXJwbGF0ZSA9IGdldEJvaWxlcnBsYXRlO1xuV2ViQXBwSW50ZXJuYWxzLmFkZGl0aW9uYWxTdGF0aWNKcyA9IGFkZGl0aW9uYWxTdGF0aWNKcztcbiIsImltcG9ydCB7IHN0YXRTeW5jLCB1bmxpbmtTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xuXG4vLyBTaW5jZSBhIG5ldyBzb2NrZXQgZmlsZSB3aWxsIGJlIGNyZWF0ZWQgd2hlbiB0aGUgSFRUUCBzZXJ2ZXJcbi8vIHN0YXJ0cyB1cCwgaWYgZm91bmQgcmVtb3ZlIHRoZSBleGlzdGluZyBmaWxlLlxuLy9cbi8vIFdBUk5JTkc6XG4vLyBUaGlzIHdpbGwgcmVtb3ZlIHRoZSBjb25maWd1cmVkIHNvY2tldCBmaWxlIHdpdGhvdXQgd2FybmluZy4gSWZcbi8vIHRoZSBjb25maWd1cmVkIHNvY2tldCBmaWxlIGlzIGFscmVhZHkgaW4gdXNlIGJ5IGFub3RoZXIgYXBwbGljYXRpb24sXG4vLyBpdCB3aWxsIHN0aWxsIGJlIHJlbW92ZWQuIE5vZGUgZG9lcyBub3QgcHJvdmlkZSBhIHJlbGlhYmxlIHdheSB0b1xuLy8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGEgc29ja2V0IGZpbGUgdGhhdCBpcyBhbHJlYWR5IGluIHVzZSBieVxuLy8gYW5vdGhlciBhcHBsaWNhdGlvbiBvciBhIHN0YWxlIHNvY2tldCBmaWxlIHRoYXQgaGFzIGJlZW5cbi8vIGxlZnQgb3ZlciBhZnRlciBhIFNJR0tJTEwuIFNpbmNlIHdlIGhhdmUgbm8gcmVsaWFibGUgd2F5IHRvXG4vLyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gdGhlc2UgdHdvIHNjZW5hcmlvcywgdGhlIGJlc3QgY291cnNlIG9mXG4vLyBhY3Rpb24gZHVyaW5nIHN0YXJ0dXAgaXMgdG8gcmVtb3ZlIGFueSBleGlzdGluZyBzb2NrZXQgZmlsZS4gVGhpc1xuLy8gaXMgbm90IHRoZSBzYWZlc3QgY291cnNlIG9mIGFjdGlvbiBhcyByZW1vdmluZyB0aGUgZXhpc3Rpbmcgc29ja2V0XG4vLyBmaWxlIGNvdWxkIGltcGFjdCBhbiBhcHBsaWNhdGlvbiB1c2luZyBpdCwgYnV0IHRoaXMgYXBwcm9hY2ggaGVscHNcbi8vIGVuc3VyZSB0aGUgSFRUUCBzZXJ2ZXIgY2FuIHN0YXJ0dXAgd2l0aG91dCBtYW51YWxcbi8vIGludGVydmVudGlvbiAoZS5nLiBhc2tpbmcgZm9yIHRoZSB2ZXJpZmljYXRpb24gYW5kIGNsZWFudXAgb2Ygc29ja2V0XG4vLyBmaWxlcyBiZWZvcmUgYWxsb3dpbmcgdGhlIEhUVFAgc2VydmVyIHRvIGJlIHN0YXJ0ZWQpLlxuLy9cbi8vIFRoZSBhYm92ZSBiZWluZyBzYWlkLCBhcyBsb25nIGFzIHRoZSBzb2NrZXQgZmlsZSBwYXRoIGlzXG4vLyBjb25maWd1cmVkIGNhcmVmdWxseSB3aGVuIHRoZSBhcHBsaWNhdGlvbiBpcyBkZXBsb3llZCAoYW5kIGV4dHJhXG4vLyBjYXJlIGlzIHRha2VuIHRvIG1ha2Ugc3VyZSB0aGUgY29uZmlndXJlZCBwYXRoIGlzIHVuaXF1ZSBhbmQgZG9lc24ndFxuLy8gY29uZmxpY3Qgd2l0aCBhbm90aGVyIHNvY2tldCBmaWxlIHBhdGgpLCB0aGVuIHRoZXJlIHNob3VsZCBub3QgYmVcbi8vIGFueSBpc3N1ZXMgd2l0aCB0aGlzIGFwcHJvYWNoLlxuZXhwb3J0IGNvbnN0IHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSA9IChzb2NrZXRQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKHN0YXRTeW5jKHNvY2tldFBhdGgpLmlzU29ja2V0KCkpIHtcbiAgICAgIC8vIFNpbmNlIGEgbmV3IHNvY2tldCBmaWxlIHdpbGwgYmUgY3JlYXRlZCwgcmVtb3ZlIHRoZSBleGlzdGluZ1xuICAgICAgLy8gZmlsZS5cbiAgICAgIHVubGlua1N5bmMoc29ja2V0UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEFuIGV4aXN0aW5nIGZpbGUgd2FzIGZvdW5kIGF0IFwiJHtzb2NrZXRQYXRofVwiIGFuZCBpdCBpcyBub3QgYCArXG4gICAgICAgICdhIHNvY2tldCBmaWxlLiBQbGVhc2UgY29uZmlybSBQT1JUIGlzIHBvaW50aW5nIHRvIHZhbGlkIGFuZCAnICtcbiAgICAgICAgJ3VuLXVzZWQgc29ja2V0IGZpbGUgcGF0aC4nXG4gICAgICApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBubyBleGlzdGluZyBzb2NrZXQgZmlsZSB0byBjbGVhbnVwLCBncmVhdCwgd2UnbGxcbiAgICAvLyBjb250aW51ZSBub3JtYWxseS4gSWYgdGhlIGNhdWdodCBleGNlcHRpb24gcmVwcmVzZW50cyBhbnkgb3RoZXJcbiAgICAvLyBpc3N1ZSwgcmUtdGhyb3cuXG4gICAgaWYgKGVycm9yLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn07XG5cbi8vIFJlbW92ZSB0aGUgc29ja2V0IGZpbGUgd2hlbiBkb25lIHRvIGF2b2lkIGxlYXZpbmcgYmVoaW5kIGEgc3RhbGUgb25lLlxuLy8gTm90ZSAtIGEgc3RhbGUgc29ja2V0IGZpbGUgaXMgc3RpbGwgbGVmdCBiZWhpbmQgaWYgdGhlIHJ1bm5pbmcgbm9kZVxuLy8gcHJvY2VzcyBpcyBraWxsZWQgdmlhIHNpZ25hbCA5IC0gU0lHS0lMTC5cbmV4cG9ydCBjb25zdCByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwID1cbiAgKHNvY2tldFBhdGgsIGV2ZW50RW1pdHRlciA9IHByb2Nlc3MpID0+IHtcbiAgICBbJ2V4aXQnLCAnU0lHSU5UJywgJ1NJR0hVUCcsICdTSUdURVJNJ10uZm9yRWFjaChzaWduYWwgPT4ge1xuICAgICAgZXZlbnRFbWl0dGVyLm9uKHNpZ25hbCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKHNvY2tldFBhdGgpKSB7XG4gICAgICAgICAgdW5saW5rU3luYyhzb2NrZXRQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pO1xuICB9O1xuIl19
