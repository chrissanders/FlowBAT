(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package['modules-runtime'].meteorInstall;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/modules/server.js                                                                                     //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
require("./install-packages.js");
require("./process.js");
require("./reify.js");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"install-packages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/modules/install-packages.js                                                                           //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
function install(name, mainModule) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).

  if (typeof mainModule === "string") {
    // Set up an alias from /node_modules/meteor/<package>.js to the main
    // module, e.g. meteor/<package>/index.js.
    meteorDir[name + ".js"] = mainModule;
  } else {
    // back compat with old Meteor packages
    meteorDir[name + ".js"] = function (r, e, module) {
      module.exports = Package[name];
    };
  }

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("meteor");
install("standard-app-packages");
install("underscore");
install("ecmascript-runtime");
install("modules-runtime");
install("modules", "meteor/modules/server.js");
install("ecmascript-runtime-server", "meteor/ecmascript-runtime-server/runtime.js");
install("babel-compiler");
install("ecmascript");
install("base64");
install("promise", "meteor/promise/server.js");
install("babel-runtime", "meteor/babel-runtime/babel-runtime.js");
install("ejson", "meteor/ejson/ejson.js");
install("logging");
install("routepolicy");
install("boilerplate-generator", "meteor/boilerplate-generator/generator.js");
install("webapp-hashing");
install("webapp", "meteor/webapp/webapp_server.js");
install("jquery");
install("tracker");
install("check", "meteor/check/match.js");
install("id-map");
install("random");
install("mongo-id");
install("diff-sequence");
install("observe-sequence");
install("reactive-var");
install("ordered-dict");
install("deps");
install("htmljs");
install("blaze");
install("ui");
install("spacebars");
install("templating-compiler");
install("templating-runtime");
install("templating");
install("iron:core");
install("iron:dynamic-template");
install("iron:layout");
install("iron:url");
install("iron:middleware-stack");
install("iron:location");
install("npm-mongo");
install("geojson-utils", "meteor/geojson-utils/main.js");
install("minimongo", "meteor/minimongo/minimongo_server.js");
install("retry");
install("callback-hook");
install("ddp-common");
install("ddp-client", "meteor/ddp-client/namespace.js");
install("rate-limit");
install("ddp-rate-limiter");
install("ddp-server");
install("ddp");
install("allow-deny");
install("binary-heap");
install("mongo");
install("reactive-dict", "meteor/reactive-dict/migration.js");
install("iron:controller");
install("iron:router");
install("coffeescript");
install("stylus");
install("mquandalle:jade");
install("accounts-base", "meteor/accounts-base/server_main.js");
install("matb33:collection-hooks");
install("npm-bcrypt", "meteor/npm-bcrypt/wrapper.js");
install("sha");
install("srp");
install("email");
install("accounts-password");
install("staringatlights:inject-data");
install("meteorhacks:picker");
install("meteorhacks:meteorx");
install("livedata");
install("staringatlights:fast-render");
install("handlebars");
install("cmather:handlebars-server");
install("standard-minifier-css");
install("standard-minifier-js");
install("shell-server", "meteor/shell-server/main.js");
install("dynamic-import", "meteor/dynamic-import/server.js");
install("reload");
install("autoupdate");
install("meteor-platform");
install("session");
install("service-configuration");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"process.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/modules/process.js                                                                                    //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
if (! global.process) {
  try {
    // The application can run `npm install process` to provide its own
    // process stub; otherwise this module will provide a partial stub.
    global.process = require("process");
  } catch (missing) {
    global.process = {};
  }
}

var proc = global.process;

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = proc;
      }
    }
  });
} else {
  proc.platform = "browser";
  proc.nextTick = proc.nextTick || Meteor._setImmediate;
}

if (typeof proc.env !== "object") {
  proc.env = {};
}

var hasOwn = Object.prototype.hasOwnProperty;
for (var key in meteorEnv) {
  if (hasOwn.call(meteorEnv, key)) {
    proc.env[key] = meteorEnv[key];
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"reify.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/modules/reify.js                                                                                      //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
var Module = module.constructor;
var Mp = Module.prototype;
require("reify/lib/runtime").enable(Mp);
Mp.importSync = Mp.importSync || Mp.import;
Mp.import = Mp.import || Mp.importSync;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"reify":{"lib":{"runtime":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/meteor/modules/node_modules/reify/lib/runtime/index.js                                            //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
"use strict";

// This module should be compatible with PhantomJS v1, just like the other files
// in reify/lib/runtime. Node 4+ features like const/let and arrow functions are
// not acceptable here, and importing any npm packages should be contemplated
// with extreme skepticism.

var utils = require("./utils.js");
var Entry = require("./entry.js");

// The exports.enable method can be used to enable the Reify runtime for
// specific module objects, or for Module.prototype (where implemented),
// to make the runtime available throughout the entire module system.
exports.enable = function (mod) {
  if (typeof mod.export !== "function" ||
      typeof mod.importSync !== "function") {
    mod.export = moduleExport;
    mod.exportDefault = moduleExportDefault;
    mod.runSetters = runSetters;
    mod.watch = moduleWatch;

    // Used for copying the properties of a namespace object to
    // mod.exports to implement `export * from "module"` syntax.
    mod.makeNsSetter = moduleMakeNsSetter;

    // To be deprecated:
    mod.runModuleSetters = runSetters;
    mod.importSync = importSync;

    return true;
  }

  return false;
};

function moduleWatch(exported, setters, key) {
  utils.setESModule(this.exports);
  Entry.getOrCreate(this.exports, this);

  if (utils.isObject(setters)) {
    Entry.getOrCreate(exported).addSetters(this, setters, key);
  }
}

// If key is provided, it will be used to identify the given setters so
// that they can be replaced if module.importSync is called again with the
// same key. This avoids potential memory leaks from import declarations
// inside loops. The compiler generates these keys automatically (and
// deterministically) when compiling nested import declarations.
function importSync(id, setters, key) {
  return this.watch(this.require(id), setters, key);
}

// Register getter functions for local variables in the scope of an export
// statement. Pass true as the second argument to indicate that the getter
// functions always return the same values.
function moduleExport(getters, constant) {
  utils.setESModule(this.exports);
  var entry = Entry.getOrCreate(this.exports, this);
  entry.addGetters(getters, constant);
  if (this.loaded) {
    // If the module has already been evaluated, then we need to trigger
    // another round of entry.runSetters calls, which begins by calling
    // entry.runModuleGetters(module).
    entry.runSetters();
  }
}

// Register a getter function that always returns the given value.
function moduleExportDefault(value) {
  return this.export({
    default: function () {
      return value;
    }
  }, true);
}

// Platform-specific code should find a way to call this method whenever
// the module system is about to return module.exports from require. This
// might happen more than once per module, in case of dependency cycles,
// so we want Module.prototype.runSetters to run each time.
function runSetters(valueToPassThrough) {
  var entry = Entry.get(this.exports);
  if (entry !== null) {
    entry.runSetters();
  }

  if (this.loaded) {
    // If this module has finished loading, then we must create an Entry
    // object here, so that we can add this module to entry.ownerModules
    // by passing it as the second argument to Entry.getOrCreate.
    Entry.getOrCreate(this.exports, this);
  }

  // Assignments to exported local variables get wrapped with calls to
  // module.runSetters, so module.runSetters returns the
  // valueToPassThrough parameter to allow the value of the original
  // expression to pass through. For example,
  //
  //   export var a = 1;
  //   console.log(a += 3);
  //
  // becomes
  //
  //   module.export("a", () => a);
  //   var a = 1;
  //   console.log(module.runSetters(a += 3));
  //
  // This ensures module.runSetters runs immediately after the assignment,
  // and does not interfere with the larger computation.
  return valueToPassThrough;
}

// Returns a function that takes a namespace object and copies the
// properties of the namespace to module.exports, excluding any "default"
// property, which is useful for implementing `export * from "module"`.
function moduleMakeNsSetter() {
  var module = this;
  // Discussion of why the "default" property is skipped:
  // https://github.com/tc39/ecma262/issues/948
  return function (namespace) {
    Object.keys(namespace).forEach(function (key) {
      if (key !== "default") {
        utils.copyKey(key, module.exports, namespace);
      }
    });
  };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},"babel-runtime":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/babel-runtime/package.json                                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.exports = {
  "_args": [
    [
      "babel-runtime@6.26.0",
      "/home/jason/FlowBAT"
    ]
  ],
  "_from": "babel-runtime@6.26.0",
  "_id": "babel-runtime@6.26.0",
  "_inBundle": false,
  "_integrity": "sha1-llxwWGaOgrVde/4E/yM3vItWR/4=",
  "_location": "/babel-runtime",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "babel-runtime@6.26.0",
    "name": "babel-runtime",
    "escapedName": "babel-runtime",
    "rawSpec": "6.26.0",
    "saveSpec": null,
    "fetchSpec": "6.26.0"
  },
  "_requiredBy": [
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/babel-runtime/-/babel-runtime-6.26.0.tgz",
  "_spec": "6.26.0",
  "_where": "/home/jason/FlowBAT",
  "author": {
    "name": "Sebastian McKenzie",
    "email": "sebmck@gmail.com"
  },
  "dependencies": {
    "core-js": "^2.4.0",
    "regenerator-runtime": "^0.11.0"
  },
  "description": "babel selfContained runtime",
  "devDependencies": {
    "babel-helpers": "^6.22.0",
    "babel-plugin-transform-runtime": "^6.23.0"
  },
  "license": "MIT",
  "name": "babel-runtime",
  "repository": {
    "type": "git",
    "url": "https://github.com/babel/babel/tree/master/packages/babel-runtime"
  },
  "version": "6.26.0"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"regenerator":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/babel-runtime/regenerator/index.js                                                                //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.exports = require("regenerator-runtime");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"helpers":{"extends.js":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/babel-runtime/helpers/extends.js                                                                  //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
"use strict";

exports.__esModule = true;

var _assign = require("../core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _assign2.default || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"bcrypt":{"package.json":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/bcrypt/package.json                                                                               //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
exports.name = "bcrypt";
exports.version = "0.8.7";
exports.main = "./bcrypt";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bcrypt.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// node_modules/bcrypt/bcrypt.js                                                                                  //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
'use strict';

var bindings = require('bindings')('bcrypt_lib');
var crypto = require('crypto');

/// generate a salt (sync)
/// @param {Number} [rounds] number of rounds (default 10)
/// @return {String} salt
module.exports.genSaltSync = function(rounds) {
    // default 10 rounds
    if (!rounds) {
        rounds = 10;
    } else if (typeof rounds !== 'number') {
        throw new Error('rounds must be a number');
    }

    return bindings.gen_salt_sync(rounds, crypto.randomBytes(16));
};

/// generate a salt
/// @param {Number} [rounds] number of rounds (default 10)
/// @param {Function} cb callback(err, salt)
module.exports.genSalt = function(rounds, ignore, cb) {
    // if callback is first argument, then use defaults for others
    if (typeof arguments[0] === 'function') {
        // have to set callback first otherwise arguments are overriden
        cb = arguments[0];
        rounds = 10;
    // callback is second argument
    } else if (typeof arguments[1] === 'function') {
        // have to set callback first otherwise arguments are overriden
        cb = arguments[1];
    }

    // default 10 rounds
    if (!rounds) {
        rounds = 10;
    } else if (typeof rounds !== 'number') {
        // callback error asynchronously
        return process.nextTick(function() {
            cb(new Error('rounds must be a number'));
        });
    }

    if (!cb) {
        return;
    }

    crypto.randomBytes(16, function(error, randomBytes) {
        if (error) {
            cb(error);
            return;
        }

        bindings.gen_salt(rounds, randomBytes, cb);
    });
};

/// hash data using a salt
/// @param {String} data the data to encrypt
/// @param {String} salt the salt to use when hashing
/// @return {String} hash
module.exports.hashSync = function(data, salt) {
    if (data == null || salt == null) {
        throw new Error('data and salt arguments required');
    }

    if (typeof data !== 'string' || (typeof salt !== 'string' && typeof salt !== 'number')) {
        throw new Error('data must be a string and salt must either be a salt string or a number of rounds');
    }

    if (typeof salt === 'number') {
        salt = module.exports.genSaltSync(salt);
    }

    return bindings.encrypt_sync(data, salt);
};

/// hash data using a salt
/// @param {String} data the data to encrypt
/// @param {String} salt the salt to use when hashing
/// @param {Function} cb callback(err, hash)
module.exports.hash = function(data, salt, cb) {
    if (typeof data === 'function') {
        return process.nextTick(function() {
            data(new Error('data must be a string and salt must either be a salt string or a number of rounds'));
        });
    }

    if (typeof salt === 'function') {
        return process.nextTick(function() {
            salt(new Error('data must be a string and salt must either be a salt string or a number of rounds'));
        });
    }

    if (data == null || salt == null) {
        return process.nextTick(function() {
            cb(new Error('data and salt arguments required'));
        });
    }

    if (typeof data !== 'string' || (typeof salt !== 'string' && typeof salt !== 'number')) {
        return process.nextTick(function() {
            cb(new Error('data must be a string and salt must either be a salt string or a number of rounds'));
        });
    }

    if (!cb || typeof cb !== 'function') {
        return;
    }

    if (typeof salt === 'number') {
        return module.exports.genSalt(salt, function(err, salt) {
            return bindings.encrypt(data, salt, cb);
        });
    }

    return bindings.encrypt(data, salt, cb);
};

/// compare raw data to hash
/// @param {String} data the data to hash and compare
/// @param {String} hash expected hash
/// @return {bool} true if hashed data matches hash
module.exports.compareSync = function(data, hash) {
    if (data == null || hash == null) {
        throw new Error('data and hash arguments required');
    }

    if (typeof data !== 'string' || typeof hash !== 'string') {
        throw new Error('data and hash must be strings');
    }

    return bindings.compare_sync(data, hash);
};

/// compare raw data to hash
/// @param {String} data the data to hash and compare
/// @param {String} hash expected hash
/// @param {Function} cb callback(err, matched) - matched is true if hashed data matches hash
module.exports.compare = function(data, hash, cb) {
    if (data == null || hash == null) {
        return process.nextTick(function() {
            cb(new Error('data and hash arguments required'));
        });
    }

    if (typeof data !== 'string' || typeof hash !== 'string') {
        return process.nextTick(function() {
            cb(new Error('data and hash must be strings'));
        });
    }

    if (!cb || typeof cb !== 'function') {
        return;
    }

    return bindings.compare(data, hash, cb);
};

/// @param {String} hash extract rounds from this hash
/// @return {Number} the number of rounds used to encrypt a given hash
module.exports.getRounds = function(hash) {
    if (hash == null) {
        throw new Error('hash argument required');
    }

    if (typeof hash !== 'string') {
        throw new Error('hash must be a string');
    }

    return bindings.get_rounds(hash);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/modules/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.modules = exports, {
  meteorInstall: meteorInstall
});

})();
