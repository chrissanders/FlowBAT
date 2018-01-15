(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Boilerplate;

var require = meteorInstall({"node_modules":{"meteor":{"boilerplate-generator":{"generator.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/generator.js                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.export({
  Boilerplate: () => Boilerplate
});
let readFile;
module.watch(require("fs"), {
  readFile(v) {
    readFile = v;
  }

}, 0);
let WebBrowserTemplate;
module.watch(require("./template-web.browser"), {
  default(v) {
    WebBrowserTemplate = v;
  }

}, 1);
let WebCordovaTemplate;
module.watch(require("./template-web.cordova"), {
  default(v) {
    WebCordovaTemplate = v;
  }

}, 2);

// Copied from webapp_server
const readUtf8FileSync = filename => Meteor.wrapAsync(readFile)(filename, 'utf8');

const identity = value => value;

class Boilerplate {
  constructor(arch, manifest, options = {}) {
    this.template = _getTemplate(arch);
    this.baseData = null;

    this._generateBoilerplateFromManifest(manifest, options);
  } // The 'extraData' argument can be used to extend 'self.baseData'. Its
  // purpose is to allow you to specify data that you might not know at
  // the time that you construct the Boilerplate object. (e.g. it is used
  // by 'webapp' to specify data that is only known at request-time).


  toHTML(extraData) {
    if (!this.baseData || !this.template) {
      throw new Error('Boilerplate did not instantiate correctly.');
    }

    return "<!DOCTYPE html>\n" + this.template((0, _extends3.default)({}, this.baseData, extraData));
  } // XXX Exported to allow client-side only changes to rebuild the boilerplate
  // without requiring a full server restart.
  // Produces an HTML string with given manifest and boilerplateSource.
  // Optionally takes urlMapper in case urls from manifest need to be prefixed
  // or rewritten.
  // Optionally takes pathMapper for resolving relative file system paths.
  // Optionally allows to override fields of the data context.


  _generateBoilerplateFromManifest(manifest, {
    urlMapper = identity,
    pathMapper = identity,
    baseDataExtension,
    inline
  } = {}) {
    const boilerplateBaseData = (0, _extends3.default)({
      css: [],
      js: [],
      head: '',
      body: '',
      meteorManifest: JSON.stringify(manifest)
    }, baseDataExtension);
    manifest.forEach(item => {
      const urlPath = urlMapper(item.url);
      const itemObj = {
        url: urlPath
      };

      if (inline) {
        itemObj.scriptContent = readUtf8FileSync(pathMapper(item.path));
        itemObj.inline = true;
      }

      if (item.type === 'css' && item.where === 'client') {
        boilerplateBaseData.css.push(itemObj);
      }

      if (item.type === 'js' && item.where === 'client' && // Dynamic JS modules should not be loaded eagerly in the
      // initial HTML of the app.
      !item.path.startsWith('dynamic/')) {
        boilerplateBaseData.js.push(itemObj);
      }

      if (item.type === 'head') {
        boilerplateBaseData.head = readUtf8FileSync(pathMapper(item.path));
      }

      if (item.type === 'body') {
        boilerplateBaseData.body = readUtf8FileSync(pathMapper(item.path));
      }
    });
    this.baseData = boilerplateBaseData;
  }

}

; // Returns a template function that, when called, produces the boilerplate
// html as a string.

const _getTemplate = arch => {
  if (arch === 'web.browser') {
    return WebBrowserTemplate;
  } else if (arch === 'web.cordova') {
    return WebCordovaTemplate;
  } else {
    throw new Error('Unsupported arch: ' + arch);
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.browser.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template-web.browser.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let template;
module.watch(require("./template"), {
  default(v) {
    template = v;
  }

}, 0);
module.exportDefault(function ({
  meteorRuntimeConfig,
  rootUrlPathPrefix,
  inlineScriptsAllowed,
  css,
  js,
  additionalStaticJs,
  htmlAttributes,
  bundledJsCssUrlRewriteHook,
  head,
  body,
  dynamicHead,
  dynamicBody
}) {
  return [].concat(['<html' + Object.keys(htmlAttributes || {}).map(key => template(' <%= attrName %>="<%- attrValue %>"')({
    attrName: key,
    attrValue: htmlAttributes[key]
  })).join('') + '>', '<head>'], (css || []).map(({
    url
  }) => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
    href: bundledJsCssUrlRewriteHook(url)
  })), [head, dynamicHead, '</head>', '<body>', body, dynamicBody, '', inlineScriptsAllowed ? template('  <script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>))</script>')({
    conf: meteorRuntimeConfig
  }) : template('  <script type="text/javascript" src="<%- src %>/meteor_runtime_config.js"></script>')({
    src: rootUrlPathPrefix
  }), ''], (js || []).map(({
    url
  }) => template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: bundledJsCssUrlRewriteHook(url)
  })), (additionalStaticJs || []).map(({
    contents,
    pathname
  }) => inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
    contents: contents
  }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: rootUrlPathPrefix + pathname
  })), ['', '', '</body>', '</html>']).join('\n');
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.cordova.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template-web.cordova.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let template;
module.watch(require("./template"), {
  default(v) {
    template = v;
  }

}, 0);
module.exportDefault(function ({
  meteorRuntimeConfig,
  rootUrlPathPrefix,
  inlineScriptsAllowed,
  css,
  js,
  additionalStaticJs,
  htmlAttributes,
  bundledJsCssUrlRewriteHook,
  head,
  body,
  dynamicHead,
  dynamicBody
}) {
  return [].concat(['<html>', '<head>', '  <meta charset="utf-8">', '  <meta name="format-detection" content="telephone=no">', '  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height">', '  <meta name="msapplication-tap-highlight" content="no">', '  <meta http-equiv="Content-Security-Policy" content="default-src * gap: data: blob: \'unsafe-inline\' \'unsafe-eval\' ws: wss:;">'], // We are explicitly not using bundledJsCssUrlRewriteHook: in cordova we serve assets up directly from disk, so rewriting the URL does not make sense
  (css || []).map(({
    url
  }) => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
    href: url
  })), ['  <script type="text/javascript">', template('    __meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>));')({
    conf: meteorRuntimeConfig
  }), '    if (/Android/i.test(navigator.userAgent)) {', // When Android app is emulated, it cannot connect to localhost,
  // instead it should connect to 10.0.2.2
  // (unless we\'re using an http proxy; then it works!)
  '      if (!__meteor_runtime_config__.httpProxyPort) {', '        __meteor_runtime_config__.ROOT_URL = (__meteor_runtime_config__.ROOT_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '        __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '      }', '    }', '  </script>', '', '  <script type="text/javascript" src="/cordova.js"></script>'], (js || []).map(({
    url
  }) => template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: url
  })), (additionalStaticJs || []).map(({
    contents,
    pathname
  }) => inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
    contents: contents
  }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: rootUrlPathPrefix + pathname
  })), ['', head, '</head>', '', '<body>', body, '</body>', '</html>']).join('\n');
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  default: () => template
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);

function template(text) {
  return _.template(text, null, {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  });
}

;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/boilerplate-generator/generator.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['boilerplate-generator'] = exports, {
  Boilerplate: Boilerplate
});

})();

//# sourceURL=meteor://💻app/packages/boilerplate-generator.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL2dlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL3RlbXBsYXRlLXdlYi5icm93c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IvdGVtcGxhdGUtd2ViLmNvcmRvdmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJCb2lsZXJwbGF0ZSIsInJlYWRGaWxlIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsIldlYkJyb3dzZXJUZW1wbGF0ZSIsImRlZmF1bHQiLCJXZWJDb3Jkb3ZhVGVtcGxhdGUiLCJyZWFkVXRmOEZpbGVTeW5jIiwiZmlsZW5hbWUiLCJNZXRlb3IiLCJ3cmFwQXN5bmMiLCJpZGVudGl0eSIsInZhbHVlIiwiY29uc3RydWN0b3IiLCJhcmNoIiwibWFuaWZlc3QiLCJvcHRpb25zIiwidGVtcGxhdGUiLCJfZ2V0VGVtcGxhdGUiLCJiYXNlRGF0YSIsIl9nZW5lcmF0ZUJvaWxlcnBsYXRlRnJvbU1hbmlmZXN0IiwidG9IVE1MIiwiZXh0cmFEYXRhIiwiRXJyb3IiLCJ1cmxNYXBwZXIiLCJwYXRoTWFwcGVyIiwiYmFzZURhdGFFeHRlbnNpb24iLCJpbmxpbmUiLCJib2lsZXJwbGF0ZUJhc2VEYXRhIiwiY3NzIiwianMiLCJoZWFkIiwiYm9keSIsIm1ldGVvck1hbmlmZXN0IiwiSlNPTiIsInN0cmluZ2lmeSIsImZvckVhY2giLCJpdGVtIiwidXJsUGF0aCIsInVybCIsIml0ZW1PYmoiLCJzY3JpcHRDb250ZW50IiwicGF0aCIsInR5cGUiLCJ3aGVyZSIsInB1c2giLCJzdGFydHNXaXRoIiwiZXhwb3J0RGVmYXVsdCIsIm1ldGVvclJ1bnRpbWVDb25maWciLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiYWRkaXRpb25hbFN0YXRpY0pzIiwiaHRtbEF0dHJpYnV0ZXMiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsImR5bmFtaWNIZWFkIiwiZHluYW1pY0JvZHkiLCJjb25jYXQiLCJPYmplY3QiLCJrZXlzIiwibWFwIiwia2V5IiwiYXR0ck5hbWUiLCJhdHRyVmFsdWUiLCJqb2luIiwiaHJlZiIsImNvbmYiLCJzcmMiLCJjb250ZW50cyIsInBhdGhuYW1lIiwiXyIsInRleHQiLCJldmFsdWF0ZSIsImludGVycG9sYXRlIiwiZXNjYXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsZUFBWSxNQUFJQTtBQUFqQixDQUFkO0FBQTZDLElBQUlDLFFBQUo7QUFBYUgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLElBQVIsQ0FBYixFQUEyQjtBQUFDRixXQUFTRyxDQUFULEVBQVc7QUFBQ0gsZUFBU0csQ0FBVDtBQUFXOztBQUF4QixDQUEzQixFQUFxRCxDQUFyRDtBQUF3RCxJQUFJQyxrQkFBSjtBQUF1QlAsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLHdCQUFSLENBQWIsRUFBK0M7QUFBQ0csVUFBUUYsQ0FBUixFQUFVO0FBQUNDLHlCQUFtQkQsQ0FBbkI7QUFBcUI7O0FBQWpDLENBQS9DLEVBQWtGLENBQWxGO0FBQXFGLElBQUlHLGtCQUFKO0FBQXVCVCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYixFQUErQztBQUFDRyxVQUFRRixDQUFSLEVBQVU7QUFBQ0cseUJBQW1CSCxDQUFuQjtBQUFxQjs7QUFBakMsQ0FBL0MsRUFBa0YsQ0FBbEY7O0FBS3JQO0FBQ0EsTUFBTUksbUJBQW1CQyxZQUFZQyxPQUFPQyxTQUFQLENBQWlCVixRQUFqQixFQUEyQlEsUUFBM0IsRUFBcUMsTUFBckMsQ0FBckM7O0FBRUEsTUFBTUcs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RSxJQUFFbEUsQ0FBRixFQUFJO0FBQUNrRSxRQUFFbEUsQ0FBRjtBQUFJOztBQUFWLENBQTFDLEVBQXNELENBQXREOztBQU83QixTQUFTYyxRQUFULENBQWtCcUQsSUFBbEIsRUFBd0I7QUFDckMsU0FBT0QsRUFBRXBELFFBQUYsQ0FBV3FELElBQVgsRUFBaUIsSUFBakIsRUFBdUI7QUFDNUJDLGNBQWMsaUJBRGM7QUFFNUJDLGlCQUFjLGtCQUZjO0FBRzVCQyxZQUFjO0FBSGMsR0FBdkIsQ0FBUDtBQUtEOztBQUFBLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSAnZnMnO1xuXG5pbXBvcnQgV2ViQnJvd3NlclRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUtd2ViLmJyb3dzZXInO1xuaW1wb3J0IFdlYkNvcmRvdmFUZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlLXdlYi5jb3Jkb3ZhJztcblxuLy8gQ29waWVkIGZyb20gd2ViYXBwX3NlcnZlclxuY29uc3QgcmVhZFV0ZjhGaWxlU3luYyA9IGZpbGVuYW1lID0+IE1ldGVvci53cmFwQXN5bmMocmVhZEZpbGUpKGZpbGVuYW1lLCAndXRmOCcpO1xuXG5jb25zdCBpZGVudGl0eSA9IHZhbHVlID0+IHZhbHVlO1xuXG5leHBvcnQgY2xhc3MgQm9pbGVycGxhdGUge1xuICBjb25zdHJ1Y3RvcihhcmNoLCBtYW5pZmVzdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IF9nZXRUZW1wbGF0ZShhcmNoKTtcbiAgICB0aGlzLmJhc2VEYXRhID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlQm9pbGVycGxhdGVGcm9tTWFuaWZlc3QoXG4gICAgICBtYW5pZmVzdCxcbiAgICAgIG9wdGlvbnNcbiAgICApO1xuICB9XG5cbiAgLy8gVGhlICdleHRyYURhdGEnIGFyZ3VtZW50IGNhbiBiZSB1c2VkIHRvIGV4dGVuZCAnc2VsZi5iYXNlRGF0YScuIEl0c1xuICAvLyBwdXJwb3NlIGlzIHRvIGFsbG93IHlvdSB0byBzcGVjaWZ5IGRhdGEgdGhhdCB5b3UgbWlnaHQgbm90IGtub3cgYXRcbiAgLy8gdGhlIHRpbWUgdGhhdCB5b3UgY29uc3RydWN0IHRoZSBCb2lsZXJwbGF0ZSBvYmplY3QuIChlLmcuIGl0IGlzIHVzZWRcbiAgLy8gYnkgJ3dlYmFwcCcgdG8gc3BlY2lmeSBkYXRhIHRoYXQgaXMgb25seSBrbm93biBhdCByZXF1ZXN0LXRpbWUpLlxuICB0b0hUTUwoZXh0cmFEYXRhKSB7XG4gICAgaWYgKCF0aGlzLmJhc2VEYXRhIHx8ICF0aGlzLnRlbXBsYXRlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0JvaWxlcnBsYXRlIGRpZCBub3QgaW5zdGFudGlhdGUgY29ycmVjdGx5LicpO1xuICAgIH1cblxuICAgIHJldHVybiAgXCI8IURPQ1RZUEUgaHRtbD5cXG5cIiArXG4gICAgICB0aGlzLnRlbXBsYXRlKHsgLi4udGhpcy5iYXNlRGF0YSwgLi4uZXh0cmFEYXRhIH0pO1xuICB9XG5cbiAgLy8gWFhYIEV4cG9ydGVkIHRvIGFsbG93IGNsaWVudC1zaWRlIG9ubHkgY2hhbmdlcyB0byByZWJ1aWxkIHRoZSBib2lsZXJwbGF0ZVxuICAvLyB3aXRob3V0IHJlcXVpcmluZyBhIGZ1bGwgc2VydmVyIHJlc3RhcnQuXG4gIC8vIFByb2R1Y2VzIGFuIEhUTUwgc3RyaW5nIHdpdGggZ2l2ZW4gbWFuaWZlc3QgYW5kIGJvaWxlcnBsYXRlU291cmNlLlxuICAvLyBPcHRpb25hbGx5IHRha2VzIHVybE1hcHBlciBpbiBjYXNlIHVybHMgZnJvbSBtYW5pZmVzdCBuZWVkIHRvIGJlIHByZWZpeGVkXG4gIC8vIG9yIHJld3JpdHRlbi5cbiAgLy8gT3B0aW9uYWxseSB0YWtlcyBwYXRoTWFwcGVyIGZvciByZXNvbHZpbmcgcmVsYXRpdmUgZmlsZSBzeXN0ZW0gcGF0aHMuXG4gIC8vIE9wdGlvbmFsbHkgYWxsb3dzIHRvIG92ZXJyaWRlIGZpZWxkcyBvZiB0aGUgZGF0YSBjb250ZXh0LlxuICBfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdChtYW5pZmVzdCwge1xuICAgIHVybE1hcHBlciA9IGlkZW50aXR5LFxuICAgIHBhdGhNYXBwZXIgPSBpZGVudGl0eSxcbiAgICBiYXNlRGF0YUV4dGVuc2lvbixcbiAgICBpbmxpbmUsXG4gIH0gPSB7fSkge1xuXG4gICAgY29uc3QgYm9pbGVycGxhdGVCYXNlRGF0YSA9IHtcbiAgICAgIGNzczogW10sXG4gICAgICBqczogW10sXG4gICAgICBoZWFkOiAnJyxcbiAgICAgIGJvZHk6ICcnLFxuICAgICAgbWV0ZW9yTWFuaWZlc3Q6IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSxcbiAgICAgIC4uLmJhc2VEYXRhRXh0ZW5zaW9uLFxuICAgIH07XG5cbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgdXJsUGF0aCA9IHVybE1hcHBlcihpdGVtLnVybCk7XG4gICAgICBjb25zdCBpdGVtT2JqID0geyB1cmw6IHVybFBhdGggfTtcblxuICAgICAgaWYgKGlubGluZSkge1xuICAgICAgICBpdGVtT2JqLnNjcmlwdENvbnRlbnQgPSByZWFkVXRmOEZpbGVTeW5jKFxuICAgICAgICAgIHBhdGhNYXBwZXIoaXRlbS5wYXRoKSk7XG4gICAgICAgIGl0ZW1PYmouaW5saW5lID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NzcycgJiYgaXRlbS53aGVyZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCYXNlRGF0YS5jc3MucHVzaChpdGVtT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2pzJyAmJiBpdGVtLndoZXJlID09PSAnY2xpZW50JyAmJlxuICAgICAgICAvLyBEeW5hbWljIEpTIG1vZHVsZXMgc2hvdWxkIG5vdCBiZSBsb2FkZWQgZWFnZXJseSBpbiB0aGVcbiAgICAgICAgLy8gaW5pdGlhbCBIVE1MIG9mIHRoZSBhcHAuXG4gICAgICAgICFpdGVtLnBhdGguc3RhcnRzV2l0aCgnZHluYW1pYy8nKSkge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmpzLnB1c2goaXRlbU9iaik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdoZWFkJykge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmhlYWQgPVxuICAgICAgICAgIHJlYWRVdGY4RmlsZVN5bmMocGF0aE1hcHBlcihpdGVtLnBhdGgpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2JvZHknKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuYm9keSA9XG4gICAgICAgICAgcmVhZFV0ZjhGaWxlU3luYyhwYXRoTWFwcGVyKGl0ZW0ucGF0aCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5iYXNlRGF0YSA9IGJvaWxlcnBsYXRlQmFzZURhdGE7XG4gIH1cbn07XG5cbi8vIFJldHVybnMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgcHJvZHVjZXMgdGhlIGJvaWxlcnBsYXRlXG4vLyBodG1sIGFzIGEgc3RyaW5nLlxuY29uc3QgX2dldFRlbXBsYXRlID0gYXJjaCA9PiB7XG4gIGlmIChhcmNoID09PSAnd2ViLmJyb3dzZXInKSB7XG4gICAgcmV0dXJuIFdlYkJyb3dzZXJUZW1wbGF0ZTtcbiAgfSBlbHNlIGlmIChhcmNoID09PSAnd2ViLmNvcmRvdmEnKSB7XG4gICAgcmV0dXJuIFdlYkNvcmRvdmFUZW1wbGF0ZTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGFyY2g6ICcgKyBhcmNoKTtcbiAgfVxufTtcbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlJztcblxuLy8gVGVtcGxhdGUgZnVuY3Rpb24gZm9yIHJlbmRlcmluZyB0aGUgYm9pbGVycGxhdGUgaHRtbCBmb3IgYnJvd3NlcnNcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHtcbiAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgcm9vdFVybFBhdGhQcmVmaXgsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkLFxuICBjc3MsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGh0bWxBdHRyaWJ1dGVzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgaGVhZCxcbiAgYm9keSxcbiAgZHluYW1pY0hlYWQsXG4gIGR5bmFtaWNCb2R5LFxufSkge1xuICByZXR1cm4gW10uY29uY2F0KFxuICAgIFtcbiAgICAgICc8aHRtbCcgKyBPYmplY3Qua2V5cyhodG1sQXR0cmlidXRlcyB8fCB7fSkubWFwKGtleSA9PlxuICAgICAgICB0ZW1wbGF0ZSgnIDwlPSBhdHRyTmFtZSAlPj1cIjwlLSBhdHRyVmFsdWUgJT5cIicpKHtcbiAgICAgICAgICBhdHRyTmFtZToga2V5LFxuICAgICAgICAgIGF0dHJWYWx1ZTogaHRtbEF0dHJpYnV0ZXNba2V5XVxuICAgICAgICB9KVxuICAgICAgKS5qb2luKCcnKSArICc+JyxcbiAgICAgICc8aGVhZD4nXG4gICAgXSxcblxuICAgIChjc3MgfHwgW10pLm1hcCgoeyB1cmzCoH0pID0+XG4gICAgICB0ZW1wbGF0ZSgnICA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgdHlwZT1cInRleHQvY3NzXCIgY2xhc3M9XCJfX21ldGVvci1jc3NfX1wiIGhyZWY9XCI8JS0gaHJlZiAlPlwiPicpKHtcbiAgICAgICAgaHJlZjogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sodXJsKVxuICAgICAgfSlcbiAgICApLFxuXG4gICAgW1xuICAgICAgaGVhZCxcbiAgICAgIGR5bmFtaWNIZWFkLFxuICAgICAgJzwvaGVhZD4nLFxuICAgICAgJzxib2R5PicsXG4gICAgICBib2R5LFxuICAgICAgZHluYW1pY0JvZHksXG4gICAgICAnJyxcbiAgICAgIChpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiPl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpPC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWdcbiAgICAgICAgfSlcbiAgICAgICAgOiB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+L21ldGVvcl9ydW50aW1lX2NvbmZpZy5qc1wiPjwvc2NyaXB0PicpKHtcbiAgICAgICAgICBzcmM6IHJvb3RVcmxQYXRoUHJlZml4XG4gICAgICAgIH0pXG4gICAgICApICxcbiAgICAgICcnXG4gICAgXSxcblxuICAgIChqcyB8fCBbXSkubWFwKCh7IHVybCB9KSA9PlxuICAgICAgdGVtcGxhdGUoJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiPCUtIHNyYyAlPlwiPjwvc2NyaXB0PicpKHtcbiAgICAgICAgc3JjOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayh1cmwpXG4gICAgICB9KVxuICAgICksXG5cbiAgICAoYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdKS5tYXAoKHsgY29udGVudHMsIHBhdGhuYW1lIH0pID0+IChcbiAgICAgIChpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQ+PCU9IGNvbnRlbnRzICU+PC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIGNvbnRlbnRzOiBjb250ZW50c1xuICAgICAgICB9KVxuICAgICAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgICAgc3JjOiByb290VXJsUGF0aFByZWZpeCArIHBhdGhuYW1lXG4gICAgICAgIH0pKVxuICAgICkpLFxuXG4gICAgW1xuICAgICAgJycsICcnLFxuICAgICAgJzwvYm9keT4nLFxuICAgICAgJzwvaHRtbD4nXG4gICAgXSxcbiAgKS5qb2luKCdcXG4nKTtcbn1cbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlJztcblxuLy8gVGVtcGxhdGUgZnVuY3Rpb24gZm9yIHJlbmRlcmluZyB0aGUgYm9pbGVycGxhdGUgaHRtbCBmb3IgY29yZG92YVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oe1xuICBtZXRlb3JSdW50aW1lQ29uZmlnLFxuICByb290VXJsUGF0aFByZWZpeCxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gIGNzcyxcbiAganMsXG4gIGFkZGl0aW9uYWxTdGF0aWNKcyxcbiAgaHRtbEF0dHJpYnV0ZXMsXG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICBoZWFkLFxuICBib2R5LFxuICBkeW5hbWljSGVhZCxcbiAgZHluYW1pY0JvZHksXG59KSB7XG4gIHJldHVybiBbXS5jb25jYXQoXG4gICAgW1xuICAgICAgJzxodG1sPicsXG4gICAgICAnPGhlYWQ+JyxcbiAgICAgICcgIDxtZXRhIGNoYXJzZXQ9XCJ1dGYtOFwiPicsXG4gICAgICAnICA8bWV0YSBuYW1lPVwiZm9ybWF0LWRldGVjdGlvblwiIGNvbnRlbnQ9XCJ0ZWxlcGhvbmU9bm9cIj4nLFxuICAgICAgJyAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cInVzZXItc2NhbGFibGU9bm8sIGluaXRpYWwtc2NhbGU9MSwgbWF4aW11bS1zY2FsZT0xLCBtaW5pbXVtLXNjYWxlPTEsIHdpZHRoPWRldmljZS13aWR0aCwgaGVpZ2h0PWRldmljZS1oZWlnaHRcIj4nLFxuICAgICAgJyAgPG1ldGEgbmFtZT1cIm1zYXBwbGljYXRpb24tdGFwLWhpZ2hsaWdodFwiIGNvbnRlbnQ9XCJub1wiPicsXG4gICAgICAnICA8bWV0YSBodHRwLWVxdWl2PVwiQ29udGVudC1TZWN1cml0eS1Qb2xpY3lcIiBjb250ZW50PVwiZGVmYXVsdC1zcmMgKiBnYXA6IGRhdGE6IGJsb2I6IFxcJ3Vuc2FmZS1pbmxpbmVcXCcgXFwndW5zYWZlLWV2YWxcXCcgd3M6IHdzczo7XCI+JyxcbiAgICBdLFxuICAgIC8vIFdlIGFyZSBleHBsaWNpdGx5IG5vdCB1c2luZyBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogaW4gY29yZG92YSB3ZSBzZXJ2ZSBhc3NldHMgdXAgZGlyZWN0bHkgZnJvbSBkaXNrLCBzbyByZXdyaXRpbmcgdGhlIFVSTCBkb2VzIG5vdCBtYWtlIHNlbnNlXG4gICAgKGNzcyB8fCBbXSkubWFwKCh7IHVybMKgfSkgPT5cbiAgICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI+Jykoe1xuICAgICAgICBocmVmOiB1cmxcbiAgICAgIH0pXG4gICAgKSxcbiAgICBbXG4gICAgICAnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIj4nLFxuICAgICAgdGVtcGxhdGUoJyAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fID0gSlNPTi5wYXJzZShkZWNvZGVVUklDb21wb25lbnQoPCU9IGNvbmYgJT4pKTsnKSh7XG4gICAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWdcbiAgICAgIH0pLFxuICAgICAgJyAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7JyxcbiAgICAgIC8vIFdoZW4gQW5kcm9pZCBhcHAgaXMgZW11bGF0ZWQsIGl0IGNhbm5vdCBjb25uZWN0IHRvIGxvY2FsaG9zdCxcbiAgICAgIC8vIGluc3RlYWQgaXQgc2hvdWxkIGNvbm5lY3QgdG8gMTAuMC4yLjJcbiAgICAgIC8vICh1bmxlc3Mgd2VcXCdyZSB1c2luZyBhbiBodHRwIHByb3h5OyB0aGVuIGl0IHdvcmtzISlcbiAgICAgICcgICAgICBpZiAoIV9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uaHR0cFByb3h5UG9ydCkgeycsXG4gICAgICAnICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgfHwgXFwnXFwnKS5yZXBsYWNlKC9sb2NhbGhvc3QvaSwgXFwnMTAuMC4yLjJcXCcpOycsXG4gICAgICAnICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgfHwgXFwnXFwnKS5yZXBsYWNlKC9sb2NhbGhvc3QvaSwgXFwnMTAuMC4yLjJcXCcpOycsXG4gICAgICAnICAgICAgfScsXG4gICAgICAnICAgIH0nLFxuICAgICAgJyAgPC9zY3JpcHQ+JyxcbiAgICAgICcnLFxuICAgICAgJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiL2NvcmRvdmEuanNcIj48L3NjcmlwdD4nXG4gICAgXSxcbiAgICAoanMgfHwgW10pLm1hcCgoeyB1cmzCoH0pID0+XG4gICAgICB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IHVybFxuICAgICAgfSlcbiAgICApLFxuXG4gICAgKGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSkubWFwKCh7IGNvbnRlbnRzLCBwYXRobmFtZSB9KSA9PiAoXG4gICAgICAoaW5saW5lU2NyaXB0c0FsbG93ZWRcbiAgICAgICAgPyB0ZW1wbGF0ZSgnICA8c2NyaXB0PjwlPSBjb250ZW50cyAlPjwvc2NyaXB0PicpKHtcbiAgICAgICAgICBjb250ZW50czogY29udGVudHNcbiAgICAgICAgfSlcbiAgICAgICAgOiB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIHNyYzogcm9vdFVybFBhdGhQcmVmaXggKyBwYXRobmFtZVxuICAgICAgICB9KSlcbiAgICApKSxcblxuICAgIFtcbiAgICAgICcnLFxuICAgICAgaGVhZCxcbiAgICAgICc8L2hlYWQ+JyxcbiAgICAgICcnLFxuICAgICAgJzxib2R5PicsXG4gICAgICBib2R5LFxuICAgICAgJzwvYm9keT4nLFxuICAgICAgJzwvaHRtbD4nXG4gICAgXSxcbiAgKS5qb2luKCdcXG4nKTtcbn1cbiIsImltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5cbi8vIEFzIGlkZW50aWZpZWQgaW4gaXNzdWUgIzkxNDksIHdoZW4gYW4gYXBwbGljYXRpb24gb3ZlcnJpZGVzIHRoZSBkZWZhdWx0XG4vLyBfLnRlbXBsYXRlIHNldHRpbmdzIHVzaW5nIF8udGVtcGxhdGVTZXR0aW5ncywgdGhvc2UgbmV3IHNldHRpbmdzIGFyZVxuLy8gdXNlZCBhbnl3aGVyZSBfLnRlbXBsYXRlIGlzIHVzZWQsIGluY2x1ZGluZyB3aXRoaW4gdGhlXG4vLyBib2lsZXJwbGF0ZS1nZW5lcmF0b3IuIFRvIGhhbmRsZSB0aGlzLCBfLnRlbXBsYXRlIHNldHRpbmdzIHRoYXQgaGF2ZVxuLy8gYmVlbiB2ZXJpZmllZCB0byB3b3JrIGFyZSBvdmVycmlkZGVuIGhlcmUgb24gZWFjaCBfLnRlbXBsYXRlIGNhbGwuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZXh0KSB7XG4gIHJldHVybiBfLnRlbXBsYXRlKHRleHQsIG51bGwsIHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nLFxuICB9KTtcbn07XG4iXX0=
