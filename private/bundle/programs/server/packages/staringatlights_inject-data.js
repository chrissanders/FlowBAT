(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;

/* Package-scope variables */
var InjectData;

(function(){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/staringatlights_inject-data/lib/namespace.js                       //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
InjectData = {};

if (Package['meteorhacks:inject-data']) {
    Package['meteorhacks:inject-data'].InjectData = InjectData;
}
/////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/staringatlights_inject-data/lib/utils.js                           //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
InjectData._encode = function(ejson) {
  var ejsonString = EJSON.stringify(ejson);
  return encodeURIComponent(ejsonString);
};

InjectData._decode = function(encodedEjson) {
  var decodedEjsonString = decodeURIComponent(encodedEjson);
  if(!decodedEjsonString) return null;

  return EJSON.parse(decodedEjsonString);
};

/////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/staringatlights_inject-data/lib/server.js                          //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var http = Npm.require('http');

var templateText = Assets.getText('lib/inject.html');
var injectDataTemplate = _.template(templateText);

// New injection method uses dynamicHead
WebApp.connectHandlers.use(function injectDataMiddleware(req, res, next) {
    if (res._injectHtml && !res._injected) {
        req.dynamicHead = req.dynamicHead || '';
        req.dynamicHead += res._injectHtml;
    }
    next();
});

// This function will try and ensure that our injection middleware is always
// last in the WebApp.connectHandlers stack.
function ensureMiddlewareIsLast() {
    var stack = WebApp.connectHandlers.stack;

    // Ensure our middleware is at the end
    if (stack[stack.length - 1].handle.name === 'injectDataMiddleware') {
        return;
    }

    // Move our middleware to the end of the stack
    for (var i in stack) {
        if (stack[i].handle.name === 'injectDataMiddleware') {
            stack.push(stack.splice(i, 1)[0]);
            return true;
        }
    }
}

// custome API
InjectData.pushData = function pushData(res, key, value) {
    if (!res._injectPayload) {
        res._injectPayload = {};
    }

    res._injectPayload[key] = value;

    // if cors headers included if may cause some security holes
    // so we simply turn off injecting if we detect an cors header
    // read more: http://goo.gl/eGwb4e
    if (res._headers && res._headers['access-control-allow-origin']) {
        var warnMessage =
            'warn: injecting data turned off due to CORS headers. ' +
            'read more: http://goo.gl/eGwb4e';
        console.warn(warnMessage);
        return;
    }

    // inject data
    var data = InjectData._encode(res._injectPayload);
    res._injectHtml = injectDataTemplate({ data: data });
    InjectData._hijackWriteIfNeeded(res);
    ensureMiddlewareIsLast();
};

InjectData.getData = function getData(res, key) {
    if (res._injectPayload) {
        return _.clone(res._injectPayload[key]);
    } else {
        return null;
    }
};

InjectData._hijackWriteIfNeeded = function (res) {
    if (res._writeHijacked) {
        return;
    }
    res._writeHijacked = true;

    var originalWrite = res.write;
    res.write = function (chunk, encoding) {
        var condition =
            res._injectHtml && !res._injected &&
            encoding === undefined &&
            /<!DOCTYPE html>/.test(chunk);

        if (condition) {
            // if this is a buffer, convert it to string
            chunk = chunk.toString();
            // Don't inject if we already have via the dynamicHead method
            if (/<script type="text\/inject-data">/.test(chunk) === false) {
                chunk = chunk.replace('<script', res._injectHtml + '<script');
            }

            res._injected = true;
        }

        originalWrite.call(res, chunk, encoding);
    };
};
/////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['staringatlights:inject-data'] = {}, {
  InjectData: InjectData
});

})();
