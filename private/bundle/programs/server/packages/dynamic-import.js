(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;

var require = meteorInstall({"node_modules":{"meteor":{"dynamic-import":{"server.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/dynamic-import/server.js                                                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
const module1 = module;
let assert;
module1.watch(require("assert"), {
  default(v) {
    assert = v;
  }

}, 0);
let readFileSync;
module1.watch(require("fs"), {
  readFileSync(v) {
    readFileSync = v;
  }

}, 1);
let pathJoin, pathNormalize;
module1.watch(require("path"), {
  join(v) {
    pathJoin = v;
  },

  normalize(v) {
    pathNormalize = v;
  }

}, 2);
let check;
module1.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 3);
module1.watch(require("./security.js"));
module1.watch(require("./client.js"));
const hasOwn = Object.prototype.hasOwnProperty;
Object.keys(dynamicImportInfo).forEach(platform => {
  const info = dynamicImportInfo[platform];

  if (info.dynamicRoot) {
    info.dynamicRoot = pathNormalize(info.dynamicRoot);
  }
});
Meteor.methods({
  __dynamicImport(tree) {
    check(tree, Object);
    this.unblock();
    const platform = this.connection ? "web.browser" : "server";
    const pathParts = [];

    function walk(node) {
      if (node && typeof node === "object") {
        Object.keys(node).forEach(name => {
          pathParts.push(name);
          node[name] = walk(node[name]);
          assert.strictEqual(pathParts.pop(), name);
        });
      } else {
        return read(pathParts, platform);
      }

      return node;
    }

    return walk(tree);
  }

});

function read(pathParts, platform) {
  const {
    dynamicRoot
  } = dynamicImportInfo[platform];
  const absPath = pathNormalize(pathJoin(dynamicRoot, pathJoin(...pathParts).replace(/:/g, "_")));

  if (!absPath.startsWith(dynamicRoot)) {
    throw new Meteor.Error("bad dynamic module path");
  }

  const cache = getCache(platform);
  return hasOwn.call(cache, absPath) ? cache[absPath] : cache[absPath] = readFileSync(absPath, "utf8");
}

const cachesByPlatform = Object.create(null);

function getCache(platform) {
  return hasOwn.call(cachesByPlatform, platform) ? cachesByPlatform[platform] : cachesByPlatform[platform] = Object.create(null);
}

process.on("message", msg => {
  // The cache for the "web.browser" platform needs to be discarded
  // whenever a client-only refresh occurs, so that new client code does
  // not receive stale module data from __dynamicImport. This code handles
  // the same message listened for by the autoupdate package.
  if (msg && msg.refresh === "client") {
    delete cachesByPlatform["web.browser"];
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cache.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/dynamic-import/cache.js                                                                             //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
var hasOwn = Object.prototype.hasOwnProperty;
var dbPromise;
var canUseCache = // The server doesn't benefit from dynamic module fetching, and almost
// certainly doesn't support IndexedDB.
Meteor.isClient && // Cordova bundles all modules into the monolithic initial bundle, so
// the dynamic module cache won't be necessary.
!Meteor.isCordova && // Caching can be confusing in development, and is designed to be a
// transparent optimization for production performance.
Meteor.isProduction;

function getIDB() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  if (typeof webkitIndexedDB !== "undefined") return webkitIndexedDB;
  if (typeof mozIndexedDB !== "undefined") return mozIndexedDB;
  if (typeof OIndexedDB !== "undefined") return OIndexedDB;
  if (typeof msIndexedDB !== "undefined") return msIndexedDB;
}

function withDB(callback) {
  dbPromise = dbPromise || new Promise(function (resolve, reject) {
    var idb = getIDB();

    if (!idb) {
      throw new Error("IndexedDB not available");
    } // Incrementing the version number causes all existing object stores
    // to be deleted and recreates those specified by objectStoreMap.


    var request = idb.open("MeteorDynamicImportCache", 2);

    request.onupgradeneeded = function (event) {
      var db = event.target.result; // It's fine to delete existing object stores since onupgradeneeded
      // is only called when we change the DB version number, and the data
      // we're storing is disposable/reconstructible.

      Array.from(db.objectStoreNames).forEach(db.deleteObjectStore, db);
      Object.keys(objectStoreMap).forEach(function (name) {
        db.createObjectStore(name, objectStoreMap[name]);
      });
    };

    request.onerror = makeOnError(reject, "indexedDB.open");

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
  });
  return dbPromise.then(callback, function (error) {
    return callback(null);
  });
}

var objectStoreMap = {
  sourcesByVersion: {
    keyPath: "version"
  }
};

function makeOnError(reject, source) {
  return function (event) {
    reject(new Error("IndexedDB failure in " + source + " " + JSON.stringify(event.target))); // Returning true from an onerror callback function prevents an
    // InvalidStateError in Firefox during Private Browsing. Silencing
    // that error is safe because we handle the error more gracefully by
    // passing it to the Promise reject function above.
    // https://github.com/meteor/meteor/issues/8697

    return true;
  };
}

var checkCount = 0;

exports.checkMany = function (versions) {
  var ids = Object.keys(versions);
  var sourcesById = Object.create(null); // Initialize sourcesById with null values to indicate all sources are
  // missing (unless replaced with actual sources below).

  ids.forEach(function (id) {
    sourcesById[id] = null;
  });

  if (!canUseCache) {
    return Promise.resolve(sourcesById);
  }

  return withDB(function (db) {
    if (!db) {
      // We thought we could used IndexedDB, but something went wrong
      // while opening the database, so err on the side of safety.
      return sourcesById;
    }

    var txn = db.transaction(["sourcesByVersion"], "readonly");
    var sourcesByVersion = txn.objectStore("sourcesByVersion");
    ++checkCount;

    function finish() {
      --checkCount;
      return sourcesById;
    }

    return Promise.all(ids.map(function (id) {
      return new Promise(function (resolve, reject) {
        var version = versions[id];

        if (version) {
          var sourceRequest = sourcesByVersion.get(version);
          sourceRequest.onerror = makeOnError(reject, "sourcesByVersion.get");

          sourceRequest.onsuccess = function (event) {
            var result = event.target.result;

            if (result) {
              sourcesById[id] = result.source;
            }

            resolve();
          };
        } else resolve();
      });
    })).then(finish, finish);
  });
};

var pendingVersionsAndSourcesById = Object.create(null);

exports.setMany = function (versionsAndSourcesById) {
  if (canUseCache) {
    Object.assign(pendingVersionsAndSourcesById, versionsAndSourcesById); // Delay the call to flushSetMany so that it doesn't contribute to the
    // amount of time it takes to call module.dynamicImport.

    if (!flushSetMany.timer) {
      flushSetMany.timer = setTimeout(flushSetMany, 100);
    }
  }
};

function flushSetMany() {
  if (checkCount > 0) {
    // If checkMany is currently underway, postpone the flush until later,
    // since updating the cache is less important than reading from it.
    return flushSetMany.timer = setTimeout(flushSetMany, 100);
  }

  flushSetMany.timer = null;
  var versionsAndSourcesById = pendingVersionsAndSourcesById;
  pendingVersionsAndSourcesById = Object.create(null);
  return withDB(function (db) {
    if (!db) {
      // We thought we could used IndexedDB, but something went wrong
      // while opening the database, so err on the side of safety.
      return;
    }

    var setTxn = db.transaction(["sourcesByVersion"], "readwrite");
    var sourcesByVersion = setTxn.objectStore("sourcesByVersion");
    return Promise.all(Object.keys(versionsAndSourcesById).map(function (id) {
      var info = versionsAndSourcesById[id];
      return new Promise(function (resolve, reject) {
        var request = sourcesByVersion.put({
          version: info.version,
          source: info.source
        });
        request.onerror = makeOnError(reject, "sourcesByVersion.put");
        request.onsuccess = resolve;
      });
    }));
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"client.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/dynamic-import/client.js                                                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
var Module = module.constructor;

var cache = require("./cache.js"); // Call module.dynamicImport(id) to fetch a module and any/all of its
// dependencies that have not already been fetched, and evaluate them as
// soon as they arrive. This runtime API makes it very easy to implement
// ECMAScript dynamic import(...) syntax.


Module.prototype.dynamicImport = function (id) {
  var module = this;
  return module.prefetch(id).then(function () {
    return getNamespace(module, id);
  });
}; // Called by Module.prototype.prefetch if there are any missing dynamic
// modules that need to be fetched.


meteorInstall.fetch = function (ids) {
  var tree = Object.create(null);
  var versions = Object.create(null);

  var dynamicVersions = require("./dynamic-versions.js");

  var missing;

  function addSource(id, source) {
    addToTree(tree, id, makeModuleFunction(id, source, ids[id].options));
  }

  function addMissing(id) {
    addToTree(missing = missing || Object.create(null), id, 1);
  }

  Object.keys(ids).forEach(function (id) {
    var version = dynamicVersions.get(id);

    if (version) {
      versions[id] = version;
    } else {
      addMissing(id);
    }
  });
  return cache.checkMany(versions).then(function (sources) {
    Object.keys(sources).forEach(function (id) {
      var source = sources[id];

      if (source) {
        addSource(id, source);
      } else {
        addMissing(id);
      }
    });
    return missing && fetchMissing(missing).then(function (results) {
      var versionsAndSourcesById = Object.create(null);
      var flatResults = flattenModuleTree(results);
      Object.keys(flatResults).forEach(function (id) {
        var source = flatResults[id];
        addSource(id, source);
        var version = dynamicVersions.get(id);

        if (version) {
          versionsAndSourcesById[id] = {
            version: version,
            source: source
          };
        }
      });
      cache.setMany(versionsAndSourcesById);
    });
  }).then(function () {
    return tree;
  });
};

function flattenModuleTree(tree) {
  var parts = [""];
  var result = Object.create(null);

  function walk(t) {
    if (t && typeof t === "object") {
      Object.keys(t).forEach(function (key) {
        parts.push(key);
        walk(t[key]);
        parts.pop();
      });
    } else if (typeof t === "string") {
      result[parts.join("/")] = t;
    }
  }

  walk(tree);
  return result;
}

function makeModuleFunction(id, source, options) {
  // By calling (options && options.eval || eval) in a wrapper function,
  // we delay the cost of parsing and evaluating the module code until the
  // module is first imported.
  return function () {
    // If an options.eval function was provided in the second argument to
    // meteorInstall when this bundle was first installed, use that
    // function to parse and evaluate the dynamic module code in the scope
    // of the package. Otherwise fall back to indirect (global) eval.
    return (options && options.eval || eval)( // Wrap the function(require,exports,module){...} expression in
    // parentheses to force it to be parsed as an expression.
    "(" + source + ")\n//# sourceURL=" + id).apply(this, arguments);
  };
}

function fetchMissing(missingTree) {
  // Update lastFetchMissingPromise immediately, without waiting for
  // the results to be delivered.
  return new Promise(function (resolve, reject) {
    Meteor.call("__dynamicImport", missingTree, function (error, resultsTree) {
      error ? reject(error) : resolve(resultsTree);
    });
  });
}

function addToTree(tree, id, value) {
  var parts = id.split("/");
  var lastIndex = parts.length - 1;
  parts.forEach(function (part, i) {
    if (part) {
      tree = tree[part] = tree[part] || (i < lastIndex ? Object.create(null) : value);
    }
  });
}

function getNamespace(module, id) {
  var namespace;
  module.watch(module.require(id), {
    "*": function (ns) {
      namespace = ns;
    }
  }); // This helps with Babel interop, since we're not just returning the
  // module.exports object.

  Object.defineProperty(namespace, "__esModule", {
    value: true,
    enumerable: false
  });
  return namespace;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"dynamic-versions.js":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/dynamic-import/dynamic-versions.js                                                                  //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
// This magic double-underscored identifier gets replaced in
// tools/isobuild/bundler.js with a tree of hashes of all dynamic
// modules, for use in client.js and cache.js.
var versions = {};

exports.get = function (id) {
  var tree = versions;
  var version = null;
  id.split("/").some(function (part) {
    if (part) {
      // If the tree contains identifiers for Meteor packages with colons
      // in their names, the colons should not have been replaced by
      // underscores, but there's a bug that results in that behavior, so
      // for now it seems safest to be tolerant of underscores here.
      // https://github.com/meteor/meteor/pull/9103
      tree = tree[part] || tree[part.replace(":", "_")];
    }

    if (!tree) {
      // Terminate the search without reassigning version.
      return true;
    }

    if (typeof tree === "string") {
      version = tree;
      return true;
    }
  });
  return version;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"security.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/dynamic-import/security.js                                                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
const bpc = Package["browser-policy-content"];
const BP = bpc && bpc.BrowserPolicy;
const BPc = BP && BP.content;

if (BPc) {
  // The ability to evaluate new code is essential for loading dynamic
  // modules. Without eval, we would be forced to load modules using
  // <script src=...> tags, and then there would be no way to save those
  // modules to a local cache (or load them from the cache) without the
  // unique response caching abilities of service workers, which are not
  // available in all browsers, and cannot be polyfilled in a way that
  // satisfies Content Security Policy eval restrictions. Moreover, eval
  // allows us to evaluate dynamic module code in the original package
  // scope, which would never be possible using <script> tags. If you're
  // deploying an app in an environment that demands a Content Security
  // Policy that forbids eval, your only option is to bundle all dynamic
  // modules in the initial bundle. Fortunately, that works perfectly
  // well; you just won't get the performance benefits of dynamic module
  // fetching.
  BPc.allowEval();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/dynamic-import/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['dynamic-import'] = exports;

})();

//# sourceURL=meteor://💻app/packages/dynamic-import.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZHluYW1pYy1pbXBvcnQvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9keW5hbWljLWltcG9ydC9jYWNoZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZHluYW1pYy1pbXBvcnQvY2xpZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9keW5hbWljLWltcG9ydC9keW5hbWljLXZlcnNpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9keW5hbWljLWltcG9ydC9zZWN1cml0eS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUxIiwibW9kdWxlIiwiYXNzZXJ0Iiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJyZWFkRmlsZVN5bmMiLCJwYXRoSm9pbiIsInBhdGhOb3JtYWxpemUiLCJqb2luIiwibm9ybWFsaXplIiwiY2hlY2siLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImtleXMiLCJkeW5hbWljSW1wb3J0SW5mbyIsImZvckVhY2giLCJwbGF0Zm9ybSIsImluZm8iLCJkeW5hbWljUm9vdCIsIk1ldGVvciIsIm1ldGhvZHMiLCJfX2R5bmFtaWNJbXBvcnQiLCJ0cmVlIiwidW5ibG9jayIsImNvbm5lY3Rpb24iLCJwYXRoUGFydHMiLCJ3YWxrIiwibm9kZSIsIm5hbWUiLCJwdXNoIiwic3RyaWN0RXF1YWwiLCJwb3AiLCJyZWFkIiwiYWJzUGF0aCIsInJlcGxhY2UiLCJzdGFydHNXaXRoIiwiRXJyb3IiLCJjYWNoZSIsImdldENhY2hlIiwiY2FsbCIsImNhY2hlc0J5UGxhdGZvcm0iLCJjcmVhdGUiLCJwcm9jZXNzIiwib24iLCJtc2ciLCJyZWZyZXNoIiwiZGJQcm9taXNlIiwiY2FuVXNlQ2FjaGUiLCJpc0NsaWVudCIsImlzQ29yZG92YSIsImlzUHJvZHVjdGlvbiIsImdldElEQiIsImluZGV4ZWREQiIsIndlYmtpdEluZGV4ZWREQiIsIm1vekluZGV4ZWREQiIsIk9JbmRleGVkREIiLCJtc0luZGV4ZWREQiIsIndpdGhEQiIsImNhbGxiYWNrIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJpZGIiLCJyZXF1ZXN0Iiwib3BlbiIsIm9udXBncmFkZW5lZWRlZCIsImV2ZW50IiwiZGIiLCJ0YXJnZXQiLCJyZXN1bHQiLCJBcnJheSIsImZyb20iLCJvYmplY3RTdG9yZU5hbWVzIiwiZGVsZXRlT2JqZWN0U3RvcmUiLCJvYmplY3RTdG9yZU1hcCIsImNyZWF0ZU9iamVjdFN0b3JlIiwib25lcnJvciIsIm1ha2VPbkVycm9yIiwib25zdWNjZXNzIiwidGhlbiIsImVycm9yIiwic291cmNlc0J5VmVyc2lvbiIsImtleVBhdGgiLCJzb3VyY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiY2hlY2tDb3VudCIsImV4cG9ydHMiLCJjaGVja01hbnkiLCJ2ZXJzaW9ucyIsImlkcyIsInNvdXJjZXNCeUlkIiwiaWQiLCJ0eG4iLCJ0cmFuc2FjdGlvbiIsIm9iamVjdFN0b3JlIiwiZmluaXNoIiwiYWxsIiwibWFwIiwidmVyc2lvbiIsInNvdXJjZVJlcXVlc3QiLCJnZXQiLCJwZW5kaW5nVmVyc2lvbnNBbmRTb3VyY2VzQnlJZCIsInNldE1hbnkiLCJ2ZXJzaW9uc0FuZFNvdXJjZXNCeUlkIiwiYXNzaWduIiwiZmx1c2hTZXRNYW55IiwidGltZXIiLCJzZXRUaW1lb3V0Iiwic2V0VHhuIiwicHV0IiwiTW9kdWxlIiwiY29uc3RydWN0b3IiLCJkeW5hbWljSW1wb3J0IiwicHJlZmV0Y2giLCJnZXROYW1lc3BhY2UiLCJtZXRlb3JJbnN0YWxsIiwiZmV0Y2giLCJkeW5hbWljVmVyc2lvbnMiLCJtaXNzaW5nIiwiYWRkU291cmNlIiwiYWRkVG9UcmVlIiwibWFrZU1vZHVsZUZ1bmN0aW9uIiwib3B0aW9ucyIsImFkZE1pc3NpbmciLCJzb3VyY2VzIiwiZmV0Y2hNaXNzaW5nIiwicmVzdWx0cyIsImZsYXRSZXN1bHRzIiwiZmxhdHRlbk1vZHVsZVRyZWUiLCJwYXJ0cyIsInQiLCJrZXkiLCJldmFsIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJtaXNzaW5nVHJlZSIsInJlc3VsdHNUcmVlIiwidmFsdWUiLCJzcGxpdCIsImxhc3RJbmRleCIsImxlbmd0aCIsInBhcnQiLCJpIiwibmFtZXNwYWNlIiwibnMiLCJkZWZpbmVQcm9wZXJ0eSIsImVudW1lcmFibGUiLCJfX0RZTkFNSUNfVkVSU0lPTlNfXyIsInNvbWUiLCJicGMiLCJQYWNrYWdlIiwiQlAiLCJCcm93c2VyUG9saWN5IiwiQlBjIiwiY29udGVudCIsImFsbG93RXZhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNQSxVQUFRQyxNQUFkO0FBQXFCLElBQUlDLE1BQUo7QUFBV0YsUUFBUUcsS0FBUixDQUFjQyxRQUFRLFFBQVIsQ0FBZCxFQUFnQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFyQixDQUFoQyxFQUF1RCxDQUF2RDtBQUEwRCxJQUFJQyxZQUFKO0FBQWlCUCxRQUFRRyxLQUFSLENBQWNDLFFBQVEsSUFBUixDQUFkLEVBQTRCO0FBQUNHLGVBQWFELENBQWIsRUFBZTtBQUFDQyxtQkFBYUQsQ0FBYjtBQUFlOztBQUFoQyxDQUE1QixFQUE4RCxDQUE5RDtBQUFpRSxJQUFJRSxRQUFKLEVBQWFDLGFBQWI7QUFBMkJULFFBQVFHLEtBQVIsQ0FBY0MsUUFBUSxNQUFSLENBQWQsRUFBOEI7QUFBQ00sT0FBS0osQ0FBTCxFQUFPO0FBQUNFLGVBQVNGLENBQVQ7QUFBVyxHQUFwQjs7QUFBcUJLLFlBQVVMLENBQVYsRUFBWTtBQUFDRyxvQkFBY0gsQ0FBZDtBQUFnQjs7QUFBbEQsQ0FBOUIsRUFBa0YsQ0FBbEY7QUFBcUYsSUFBSU0sS0FBSjtBQUFVWixRQUFRRyxLQUFSLENBQWNDLFFBQVEsY0FBUixDQUFkLEVBQXNDO0FBQUNRLFFBQU1OLENBQU4sRUFBUTtBQUFDTSxZQUFNTixDQUFOO0FB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Ozs7O0FDTEEsTUFBTW1ELE1BQU1DLFFBQVEsd0JBQVIsQ0FBWjtBQUNBLE1BQU1DLEtBQUtGLE9BQU9BLElBQUlHLGFBQXRCO0FBQ0EsTUFBTUMsTUFBTUYsTUFBTUEsR0FBR0csT0FBckI7O0FBQ0EsSUFBSUQsR0FBSixFQUFTO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBQSxNQUFJRSxTQUFKO0FBQ0QsQyIsImZpbGUiOiIvcGFja2FnZXMvZHluYW1pYy1pbXBvcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHtcbiAgam9pbiBhcyBwYXRoSm9pbixcbiAgbm9ybWFsaXplIGFzIHBhdGhOb3JtYWxpemUsXG59IGZyb20gXCJwYXRoXCI7XG5cbmltcG9ydCB7IGNoZWNrIH0gZnJvbSBcIm1ldGVvci9jaGVja1wiO1xuXG5pbXBvcnQgXCIuL3NlY3VyaXR5LmpzXCI7XG5pbXBvcnQgXCIuL2NsaWVudC5qc1wiO1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5PYmplY3Qua2V5cyhkeW5hbWljSW1wb3J0SW5mbykuZm9yRWFjaChwbGF0Zm9ybSA9PiB7XG4gIGNvbnN0IGluZm8gPSBkeW5hbWljSW1wb3J0SW5mb1twbGF0Zm9ybV07XG4gIGlmIChpbmZvLmR5bmFtaWNSb290KSB7XG4gICAgaW5mby5keW5hbWljUm9vdCA9IHBhdGhOb3JtYWxpemUoaW5mby5keW5hbWljUm9vdCk7XG4gIH1cbn0pO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gIF9fZHluYW1pY0ltcG9ydCh0cmVlKSB7XG4gICAgY2hlY2sodHJlZSwgT2JqZWN0KTtcbiAgICB0aGlzLnVuYmxvY2soKTtcblxuICAgIGNvbnN0IHBsYXRmb3JtID0gdGhpcy5jb25uZWN0aW9uID8gXCJ3ZWIuYnJvd3NlclwiIDogXCJzZXJ2ZXJcIjtcbiAgICBjb25zdCBwYXRoUGFydHMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHdhbGsobm9kZSkge1xuICAgICAgaWYgKG5vZGUgJiYgdHlwZW9mIG5vZGUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICBwYXRoUGFydHMucHVzaChuYW1lKTtcbiAgICAgICAgICBub2RlW25hbWVdID0gd2Fsayhub2RlW25hbWVdKTtcbiAgICAgICAgICBhc3NlcnQuc3RyaWN0RXF1YWwocGF0aFBhcnRzLnBvcCgpLCBuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVhZChwYXRoUGFydHMsIHBsYXRmb3JtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIHJldHVybiB3YWxrKHRyZWUpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gcmVhZChwYXRoUGFydHMsIHBsYXRmb3JtKSB7XG4gIGNvbnN0IHsgZHluYW1pY1Jvb3QgfSA9IGR5bmFtaWNJbXBvcnRJbmZvW3BsYXRmb3JtXTtcbiAgY29uc3QgYWJzUGF0aCA9IHBhdGhOb3JtYWxpemUocGF0aEpvaW4oXG4gICAgZHluYW1pY1Jvb3QsXG4gICAgcGF0aEpvaW4oLi4ucGF0aFBhcnRzKS5yZXBsYWNlKC86L2csIFwiX1wiKVxuICApKTtcblxuICBpZiAoISBhYnNQYXRoLnN0YXJ0c1dpdGgoZHluYW1pY1Jvb3QpKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcImJhZCBkeW5hbWljIG1vZHVsZSBwYXRoXCIpO1xuICB9XG5cbiAgY29uc3QgY2FjaGUgPSBnZXRDYWNoZShwbGF0Zm9ybSk7XG4gIHJldHVybiBoYXNPd24uY2FsbChjYWNoZSwgYWJzUGF0aClcbiAgICA/IGNhY2hlW2Fic1BhdGhdXG4gICAgOiBjYWNoZVthYnNQYXRoXSA9IHJlYWRGaWxlU3luYyhhYnNQYXRoLCBcInV0ZjhcIik7XG59XG5cbmNvbnN0IGNhY2hlc0J5UGxhdGZvcm0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuZnVuY3Rpb24gZ2V0Q2FjaGUocGxhdGZvcm0pIHtcbiAgcmV0dXJuIGhhc093bi5jYWxsKGNhY2hlc0J5UGxhdGZvcm0sIHBsYXRmb3JtKVxuICAgID8gY2FjaGVzQnlQbGF0Zm9ybVtwbGF0Zm9ybV1cbiAgICA6IGNhY2hlc0J5UGxhdGZvcm1bcGxhdGZvcm1dID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn1cblxucHJvY2Vzcy5vbihcIm1lc3NhZ2VcIiwgbXNnID0+IHtcbiAgLy8gVGhlIGNhY2hlIGZvciB0aGUgXCJ3ZWIuYnJvd3NlclwiIHBsYXRmb3JtIG5lZWRzIHRvIGJlIGRpc2NhcmRlZFxuICAvLyB3aGVuZXZlciBhIGNsaWVudC1vbmx5IHJlZnJlc2ggb2NjdXJzLCBzbyB0aGF0IG5ldyBjbGllbnQgY29kZSBkb2VzXG4gIC8vIG5vdCByZWNlaXZlIHN0YWxlIG1vZHVsZSBkYXRhIGZyb20gX19keW5hbWljSW1wb3J0LiBUaGlzIGNvZGUgaGFuZGxlc1xuICAvLyB0aGUgc2FtZSBtZXNzYWdlIGxpc3RlbmVkIGZvciBieSB0aGUgYXV0b3VwZGF0ZSBwYWNrYWdlLlxuICBpZiAobXNnICYmIG1zZy5yZWZyZXNoID09PSBcImNsaWVudFwiKSB7XG4gICAgZGVsZXRlIGNhY2hlc0J5UGxhdGZvcm1bXCJ3ZWIuYnJvd3NlclwiXTtcbiAgfVxufSk7XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBkYlByb21pc2U7XG5cbnZhciBjYW5Vc2VDYWNoZSA9XG4gIC8vIFRoZSBzZXJ2ZXIgZG9lc24ndCBiZW5lZml0IGZyb20gZHluYW1pYyBtb2R1bGUgZmV0Y2hpbmcsIGFuZCBhbG1vc3RcbiAgLy8gY2VydGFpbmx5IGRvZXNuJ3Qgc3VwcG9ydCBJbmRleGVkREIuXG4gIE1ldGVvci5pc0NsaWVudCAmJlxuICAvLyBDb3Jkb3ZhIGJ1bmRsZXMgYWxsIG1vZHVsZXMgaW50byB0aGUgbW9ub2xpdGhpYyBpbml0aWFsIGJ1bmRsZSwgc29cbiAgLy8gdGhlIGR5bmFtaWMgbW9kdWxlIGNhY2hlIHdvbid0IGJlIG5lY2Vzc2FyeS5cbiAgISBNZXRlb3IuaXNDb3Jkb3ZhICYmXG4gIC8vIENhY2hpbmcgY2FuIGJlIGNvbmZ1c2luZyBpbiBkZXZlbG9wbWVudCwgYW5kIGlzIGRlc2lnbmVkIHRvIGJlIGFcbiAgLy8gdHJhbnNwYXJlbnQgb3B0aW1pemF0aW9uIGZvciBwcm9kdWN0aW9uIHBlcmZvcm1hbmNlLlxuICBNZXRlb3IuaXNQcm9kdWN0aW9uO1xuXG5mdW5jdGlvbiBnZXRJREIoKSB7XG4gIGlmICh0eXBlb2YgaW5kZXhlZERCICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gaW5kZXhlZERCO1xuICBpZiAodHlwZW9mIHdlYmtpdEluZGV4ZWREQiAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHdlYmtpdEluZGV4ZWREQjtcbiAgaWYgKHR5cGVvZiBtb3pJbmRleGVkREIgIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBtb3pJbmRleGVkREI7XG4gIGlmICh0eXBlb2YgT0luZGV4ZWREQiAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIE9JbmRleGVkREI7XG4gIGlmICh0eXBlb2YgbXNJbmRleGVkREIgIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBtc0luZGV4ZWREQjtcbn1cblxuZnVuY3Rpb24gd2l0aERCKGNhbGxiYWNrKSB7XG4gIGRiUHJvbWlzZSA9IGRiUHJvbWlzZSB8fCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIGlkYiA9IGdldElEQigpO1xuICAgIGlmICghIGlkYikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5kZXhlZERCIG5vdCBhdmFpbGFibGVcIik7XG4gICAgfVxuXG4gICAgLy8gSW5jcmVtZW50aW5nIHRoZSB2ZXJzaW9uIG51bWJlciBjYXVzZXMgYWxsIGV4aXN0aW5nIG9iamVjdCBzdG9yZXNcbiAgICAvLyB0byBiZSBkZWxldGVkIGFuZCByZWNyZWF0ZXMgdGhvc2Ugc3BlY2lmaWVkIGJ5IG9iamVjdFN0b3JlTWFwLlxuICAgIHZhciByZXF1ZXN0ID0gaWRiLm9wZW4oXCJNZXRlb3JEeW5hbWljSW1wb3J0Q2FjaGVcIiwgMik7XG5cbiAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcblxuICAgICAgLy8gSXQncyBmaW5lIHRvIGRlbGV0ZSBleGlzdGluZyBvYmplY3Qgc3RvcmVzIHNpbmNlIG9udXBncmFkZW5lZWRlZFxuICAgICAgLy8gaXMgb25seSBjYWxsZWQgd2hlbiB3ZSBjaGFuZ2UgdGhlIERCIHZlcnNpb24gbnVtYmVyLCBhbmQgdGhlIGRhdGFcbiAgICAgIC8vIHdlJ3JlIHN0b3JpbmcgaXMgZGlzcG9zYWJsZS9yZWNvbnN0cnVjdGlibGUuXG4gICAgICBBcnJheS5mcm9tKGRiLm9iamVjdFN0b3JlTmFtZXMpLmZvckVhY2goZGIuZGVsZXRlT2JqZWN0U3RvcmUsIGRiKTtcblxuICAgICAgT2JqZWN0LmtleXMob2JqZWN0U3RvcmVNYXApLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUobmFtZSwgb2JqZWN0U3RvcmVNYXBbbmFtZV0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlcXVlc3Qub25lcnJvciA9IG1ha2VPbkVycm9yKHJlamVjdCwgXCJpbmRleGVkREIub3BlblwiKTtcbiAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgcmVzb2x2ZShldmVudC50YXJnZXQucmVzdWx0KTtcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gZGJQcm9taXNlLnRoZW4oY2FsbGJhY2ssIGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgfSk7XG59XG5cbnZhciBvYmplY3RTdG9yZU1hcCA9IHtcbiAgc291cmNlc0J5VmVyc2lvbjogeyBrZXlQYXRoOiBcInZlcnNpb25cIiB9XG59O1xuXG5mdW5jdGlvbiBtYWtlT25FcnJvcihyZWplY3QsIHNvdXJjZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgcmVqZWN0KG5ldyBFcnJvcihcbiAgICAgIFwiSW5kZXhlZERCIGZhaWx1cmUgaW4gXCIgKyBzb3VyY2UgKyBcIiBcIiArXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KGV2ZW50LnRhcmdldClcbiAgICApKTtcblxuICAgIC8vIFJldHVybmluZyB0cnVlIGZyb20gYW4gb25lcnJvciBjYWxsYmFjayBmdW5jdGlvbiBwcmV2ZW50cyBhblxuICAgIC8vIEludmFsaWRTdGF0ZUVycm9yIGluIEZpcmVmb3ggZHVyaW5nIFByaXZhdGUgQnJvd3NpbmcuIFNpbGVuY2luZ1xuICAgIC8vIHRoYXQgZXJyb3IgaXMgc2FmZSBiZWNhdXNlIHdlIGhhbmRsZSB0aGUgZXJyb3IgbW9yZSBncmFjZWZ1bGx5IGJ5XG4gICAgLy8gcGFzc2luZyBpdCB0byB0aGUgUHJvbWlzZSByZWplY3QgZnVuY3Rpb24gYWJvdmUuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzg2OTdcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcbn1cblxudmFyIGNoZWNrQ291bnQgPSAwO1xuXG5leHBvcnRzLmNoZWNrTWFueSA9IGZ1bmN0aW9uICh2ZXJzaW9ucykge1xuICB2YXIgaWRzID0gT2JqZWN0LmtleXModmVyc2lvbnMpO1xuICB2YXIgc291cmNlc0J5SWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8vIEluaXRpYWxpemUgc291cmNlc0J5SWQgd2l0aCBudWxsIHZhbHVlcyB0byBpbmRpY2F0ZSBhbGwgc291cmNlcyBhcmVcbiAgLy8gbWlzc2luZyAodW5sZXNzIHJlcGxhY2VkIHdpdGggYWN0dWFsIHNvdXJjZXMgYmVsb3cpLlxuICBpZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICBzb3VyY2VzQnlJZFtpZF0gPSBudWxsO1xuICB9KTtcblxuICBpZiAoISBjYW5Vc2VDYWNoZSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc291cmNlc0J5SWQpO1xuICB9XG5cbiAgcmV0dXJuIHdpdGhEQihmdW5jdGlvbiAoZGIpIHtcbiAgICBpZiAoISBkYikge1xuICAgICAgLy8gV2UgdGhvdWdodCB3ZSBjb3VsZCB1c2VkIEluZGV4ZWREQiwgYnV0IHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICAvLyB3aGlsZSBvcGVuaW5nIHRoZSBkYXRhYmFzZSwgc28gZXJyIG9uIHRoZSBzaWRlIG9mIHNhZmV0eS5cbiAgICAgIHJldHVybiBzb3VyY2VzQnlJZDtcbiAgICB9XG5cbiAgICB2YXIgdHhuID0gZGIudHJhbnNhY3Rpb24oW1xuICAgICAgXCJzb3VyY2VzQnlWZXJzaW9uXCJcbiAgICBdLCBcInJlYWRvbmx5XCIpO1xuXG4gICAgdmFyIHNvdXJjZXNCeVZlcnNpb24gPSB0eG4ub2JqZWN0U3RvcmUoXCJzb3VyY2VzQnlWZXJzaW9uXCIpO1xuXG4gICAgKytjaGVja0NvdW50O1xuXG4gICAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgICAgLS1jaGVja0NvdW50O1xuICAgICAgcmV0dXJuIHNvdXJjZXNCeUlkO1xuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbChpZHMubWFwKGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHZlcnNpb24gPSB2ZXJzaW9uc1tpZF07XG4gICAgICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZVJlcXVlc3QgPSBzb3VyY2VzQnlWZXJzaW9uLmdldCh2ZXJzaW9uKTtcbiAgICAgICAgICBzb3VyY2VSZXF1ZXN0Lm9uZXJyb3IgPSBtYWtlT25FcnJvcihyZWplY3QsIFwic291cmNlc0J5VmVyc2lvbi5nZXRcIik7XG4gICAgICAgICAgc291cmNlUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmVudC50YXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBzb3VyY2VzQnlJZFtpZF0gPSByZXN1bHQuc291cmNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSByZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9KSkudGhlbihmaW5pc2gsIGZpbmlzaCk7XG4gIH0pO1xufTtcblxudmFyIHBlbmRpbmdWZXJzaW9uc0FuZFNvdXJjZXNCeUlkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuZXhwb3J0cy5zZXRNYW55ID0gZnVuY3Rpb24gKHZlcnNpb25zQW5kU291cmNlc0J5SWQpIHtcbiAgaWYgKGNhblVzZUNhY2hlKSB7XG4gICAgT2JqZWN0LmFzc2lnbihcbiAgICAgIHBlbmRpbmdWZXJzaW9uc0FuZFNvdXJjZXNCeUlkLFxuICAgICAgdmVyc2lvbnNBbmRTb3VyY2VzQnlJZFxuICAgICk7XG5cbiAgICAvLyBEZWxheSB0aGUgY2FsbCB0byBmbHVzaFNldE1hbnkgc28gdGhhdCBpdCBkb2Vzbid0IGNvbnRyaWJ1dGUgdG8gdGhlXG4gICAgLy8gYW1vdW50IG9mIHRpbWUgaXQgdGFrZXMgdG8gY2FsbCBtb2R1bGUuZHluYW1pY0ltcG9ydC5cbiAgICBpZiAoISBmbHVzaFNldE1hbnkudGltZXIpIHtcbiAgICAgIGZsdXNoU2V0TWFueS50aW1lciA9IHNldFRpbWVvdXQoZmx1c2hTZXRNYW55LCAxMDApO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gZmx1c2hTZXRNYW55KCkge1xuICBpZiAoY2hlY2tDb3VudCA+IDApIHtcbiAgICAvLyBJZiBjaGVja01hbnkgaXMgY3VycmVudGx5IHVuZGVyd2F5LCBwb3N0cG9uZSB0aGUgZmx1c2ggdW50aWwgbGF0ZXIsXG4gICAgLy8gc2luY2UgdXBkYXRpbmcgdGhlIGNhY2hlIGlzIGxlc3MgaW1wb3J0YW50IHRoYW4gcmVhZGluZyBmcm9tIGl0LlxuICAgIHJldHVybiBmbHVzaFNldE1hbnkudGltZXIgPSBzZXRUaW1lb3V0KGZsdXNoU2V0TWFueSwgMTAwKTtcbiAgfVxuXG4gIGZsdXNoU2V0TWFueS50aW1lciA9IG51bGw7XG5cbiAgdmFyIHZlcnNpb25zQW5kU291cmNlc0J5SWQgPSBwZW5kaW5nVmVyc2lvbnNBbmRTb3VyY2VzQnlJZDtcbiAgcGVuZGluZ1ZlcnNpb25zQW5kU291cmNlc0J5SWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHJldHVybiB3aXRoREIoZnVuY3Rpb24gKGRiKSB7XG4gICAgaWYgKCEgZGIpIHtcbiAgICAgIC8vIFdlIHRob3VnaHQgd2UgY291bGQgdXNlZCBJbmRleGVkREIsIGJ1dCBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgLy8gd2hpbGUgb3BlbmluZyB0aGUgZGF0YWJhc2UsIHNvIGVyciBvbiB0aGUgc2lkZSBvZiBzYWZldHkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNldFR4biA9IGRiLnRyYW5zYWN0aW9uKFtcbiAgICAgIFwic291cmNlc0J5VmVyc2lvblwiXG4gICAgXSwgXCJyZWFkd3JpdGVcIik7XG5cbiAgICB2YXIgc291cmNlc0J5VmVyc2lvbiA9IHNldFR4bi5vYmplY3RTdG9yZShcInNvdXJjZXNCeVZlcnNpb25cIik7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICBPYmplY3Qua2V5cyh2ZXJzaW9uc0FuZFNvdXJjZXNCeUlkKS5tYXAoZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHZhciBpbmZvID0gdmVyc2lvbnNBbmRTb3VyY2VzQnlJZFtpZF07XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSBzb3VyY2VzQnlWZXJzaW9uLnB1dCh7XG4gICAgICAgICAgICB2ZXJzaW9uOiBpbmZvLnZlcnNpb24sXG4gICAgICAgICAgICBzb3VyY2U6IGluZm8uc291cmNlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gbWFrZU9uRXJyb3IocmVqZWN0LCBcInNvdXJjZXNCeVZlcnNpb24ucHV0XCIpO1xuICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xufVxuIiwidmFyIE1vZHVsZSA9IG1vZHVsZS5jb25zdHJ1Y3RvcjtcbnZhciBjYWNoZSA9IHJlcXVpcmUoXCIuL2NhY2hlLmpzXCIpO1xuXG4vLyBDYWxsIG1vZHVsZS5keW5hbWljSW1wb3J0KGlkKSB0byBmZXRjaCBhIG1vZHVsZSBhbmQgYW55L2FsbCBvZiBpdHNcbi8vIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgbm90IGFscmVhZHkgYmVlbiBmZXRjaGVkLCBhbmQgZXZhbHVhdGUgdGhlbSBhc1xuLy8gc29vbiBhcyB0aGV5IGFycml2ZS4gVGhpcyBydW50aW1lIEFQSSBtYWtlcyBpdCB2ZXJ5IGVhc3kgdG8gaW1wbGVtZW50XG4vLyBFQ01BU2NyaXB0IGR5bmFtaWMgaW1wb3J0KC4uLikgc3ludGF4LlxuTW9kdWxlLnByb3RvdHlwZS5keW5hbWljSW1wb3J0ID0gZnVuY3Rpb24gKGlkKSB7XG4gIHZhciBtb2R1bGUgPSB0aGlzO1xuICByZXR1cm4gbW9kdWxlLnByZWZldGNoKGlkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZ2V0TmFtZXNwYWNlKG1vZHVsZSwgaWQpO1xuICB9KTtcbn07XG5cbi8vIENhbGxlZCBieSBNb2R1bGUucHJvdG90eXBlLnByZWZldGNoIGlmIHRoZXJlIGFyZSBhbnkgbWlzc2luZyBkeW5hbWljXG4vLyBtb2R1bGVzIHRoYXQgbmVlZCB0byBiZSBmZXRjaGVkLlxubWV0ZW9ySW5zdGFsbC5mZXRjaCA9IGZ1bmN0aW9uIChpZHMpIHtcbiAgdmFyIHRyZWUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgdmVyc2lvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgZHluYW1pY1ZlcnNpb25zID0gcmVxdWlyZShcIi4vZHluYW1pYy12ZXJzaW9ucy5qc1wiKTtcbiAgdmFyIG1pc3Npbmc7XG5cbiAgZnVuY3Rpb24gYWRkU291cmNlKGlkLCBzb3VyY2UpIHtcbiAgICBhZGRUb1RyZWUodHJlZSwgaWQsIG1ha2VNb2R1bGVGdW5jdGlvbihpZCwgc291cmNlLCBpZHNbaWRdLm9wdGlvbnMpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1pc3NpbmcoaWQpIHtcbiAgICBhZGRUb1RyZWUobWlzc2luZyA9IG1pc3NpbmcgfHwgT2JqZWN0LmNyZWF0ZShudWxsKSwgaWQsIDEpO1xuICB9XG5cbiAgT2JqZWN0LmtleXMoaWRzKS5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciB2ZXJzaW9uID0gZHluYW1pY1ZlcnNpb25zLmdldChpZCk7XG4gICAgaWYgKHZlcnNpb24pIHtcbiAgICAgIHZlcnNpb25zW2lkXSA9IHZlcnNpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGFkZE1pc3NpbmcoaWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNhY2hlLmNoZWNrTWFueSh2ZXJzaW9ucykudGhlbihmdW5jdGlvbiAoc291cmNlcykge1xuICAgIE9iamVjdC5rZXlzKHNvdXJjZXMpLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgc291cmNlID0gc291cmNlc1tpZF07XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGFkZFNvdXJjZShpZCwgc291cmNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZE1pc3NpbmcoaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1pc3NpbmcgJiYgZmV0Y2hNaXNzaW5nKG1pc3NpbmcpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgIHZhciB2ZXJzaW9uc0FuZFNvdXJjZXNCeUlkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIHZhciBmbGF0UmVzdWx0cyA9IGZsYXR0ZW5Nb2R1bGVUcmVlKHJlc3VsdHMpO1xuXG4gICAgICBPYmplY3Qua2V5cyhmbGF0UmVzdWx0cykuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGZsYXRSZXN1bHRzW2lkXTtcbiAgICAgICAgYWRkU291cmNlKGlkLCBzb3VyY2UpO1xuXG4gICAgICAgIHZhciB2ZXJzaW9uID0gZHluYW1pY1ZlcnNpb25zLmdldChpZCk7XG4gICAgICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICAgICAgdmVyc2lvbnNBbmRTb3VyY2VzQnlJZFtpZF0gPSB7XG4gICAgICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uLFxuICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY2FjaGUuc2V0TWFueSh2ZXJzaW9uc0FuZFNvdXJjZXNCeUlkKTtcbiAgICB9KTtcblxuICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJlZTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBmbGF0dGVuTW9kdWxlVHJlZSh0cmVlKSB7XG4gIHZhciBwYXJ0cyA9IFtcIlwiXTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgZnVuY3Rpb24gd2Fsayh0KSB7XG4gICAgaWYgKHQgJiYgdHlwZW9mIHQgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIE9iamVjdC5rZXlzKHQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBwYXJ0cy5wdXNoKGtleSk7XG4gICAgICAgIHdhbGsodFtrZXldKTtcbiAgICAgICAgcGFydHMucG9wKCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICByZXN1bHRbcGFydHMuam9pbihcIi9cIildID0gdDtcbiAgICB9XG4gIH1cblxuICB3YWxrKHRyZWUpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1ha2VNb2R1bGVGdW5jdGlvbihpZCwgc291cmNlLCBvcHRpb25zKSB7XG4gIC8vIEJ5IGNhbGxpbmcgKG9wdGlvbnMgJiYgb3B0aW9ucy5ldmFsIHx8IGV2YWwpIGluIGEgd3JhcHBlciBmdW5jdGlvbixcbiAgLy8gd2UgZGVsYXkgdGhlIGNvc3Qgb2YgcGFyc2luZyBhbmQgZXZhbHVhdGluZyB0aGUgbW9kdWxlIGNvZGUgdW50aWwgdGhlXG4gIC8vIG1vZHVsZSBpcyBmaXJzdCBpbXBvcnRlZC5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAvLyBJZiBhbiBvcHRpb25zLmV2YWwgZnVuY3Rpb24gd2FzIHByb3ZpZGVkIGluIHRoZSBzZWNvbmQgYXJndW1lbnQgdG9cbiAgICAvLyBtZXRlb3JJbnN0YWxsIHdoZW4gdGhpcyBidW5kbGUgd2FzIGZpcnN0IGluc3RhbGxlZCwgdXNlIHRoYXRcbiAgICAvLyBmdW5jdGlvbiB0byBwYXJzZSBhbmQgZXZhbHVhdGUgdGhlIGR5bmFtaWMgbW9kdWxlIGNvZGUgaW4gdGhlIHNjb3BlXG4gICAgLy8gb2YgdGhlIHBhY2thZ2UuIE90aGVyd2lzZSBmYWxsIGJhY2sgdG8gaW5kaXJlY3QgKGdsb2JhbCkgZXZhbC5cbiAgICByZXR1cm4gKG9wdGlvbnMgJiYgb3B0aW9ucy5ldmFsIHx8IGV2YWwpKFxuICAgICAgLy8gV3JhcCB0aGUgZnVuY3Rpb24ocmVxdWlyZSxleHBvcnRzLG1vZHVsZSl7Li4ufSBleHByZXNzaW9uIGluXG4gICAgICAvLyBwYXJlbnRoZXNlcyB0byBmb3JjZSBpdCB0byBiZSBwYXJzZWQgYXMgYW4gZXhwcmVzc2lvbi5cbiAgICAgIFwiKFwiICsgc291cmNlICsgXCIpXFxuLy8jIHNvdXJjZVVSTD1cIiArIGlkXG4gICAgKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmZXRjaE1pc3NpbmcobWlzc2luZ1RyZWUpIHtcbiAgLy8gVXBkYXRlIGxhc3RGZXRjaE1pc3NpbmdQcm9taXNlIGltbWVkaWF0ZWx5LCB3aXRob3V0IHdhaXRpbmcgZm9yXG4gIC8vIHRoZSByZXN1bHRzIHRvIGJlIGRlbGl2ZXJlZC5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBNZXRlb3IuY2FsbChcbiAgICAgIFwiX19keW5hbWljSW1wb3J0XCIsXG4gICAgICBtaXNzaW5nVHJlZSxcbiAgICAgIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0c1RyZWUpIHtcbiAgICAgICAgZXJyb3IgPyByZWplY3QoZXJyb3IpIDogcmVzb2x2ZShyZXN1bHRzVHJlZSk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFRvVHJlZSh0cmVlLCBpZCwgdmFsdWUpIHtcbiAgdmFyIHBhcnRzID0gaWQuc3BsaXQoXCIvXCIpO1xuICB2YXIgbGFzdEluZGV4ID0gcGFydHMubGVuZ3RoIC0gMTtcbiAgcGFydHMuZm9yRWFjaChmdW5jdGlvbiAocGFydCwgaSkge1xuICAgIGlmIChwYXJ0KSB7XG4gICAgICB0cmVlID0gdHJlZVtwYXJ0XSA9IHRyZWVbcGFydF0gfHxcbiAgICAgICAgKGkgPCBsYXN0SW5kZXggPyBPYmplY3QuY3JlYXRlKG51bGwpIDogdmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldE5hbWVzcGFjZShtb2R1bGUsIGlkKSB7XG4gIHZhciBuYW1lc3BhY2U7XG5cbiAgbW9kdWxlLndhdGNoKG1vZHVsZS5yZXF1aXJlKGlkKSwge1xuICAgIFwiKlwiOiBmdW5jdGlvbiAobnMpIHtcbiAgICAgIG5hbWVzcGFjZSA9IG5zO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gVGhpcyBoZWxwcyB3aXRoIEJhYmVsIGludGVyb3AsIHNpbmNlIHdlJ3JlIG5vdCBqdXN0IHJldHVybmluZyB0aGVcbiAgLy8gbW9kdWxlLmV4cG9ydHMgb2JqZWN0LlxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmFtZXNwYWNlLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuXG4gIHJldHVybiBuYW1lc3BhY2U7XG59XG4iLCIvLyBUaGlzIG1hZ2ljIGRvdWJsZS11bmRlcnNjb3JlZCBpZGVudGlmaWVyIGdldHMgcmVwbGFjZWQgaW5cbi8vIHRvb2xzL2lzb2J1aWxkL2J1bmRsZXIuanMgd2l0aCBhIHRyZWUgb2YgaGFzaGVzIG9mIGFsbCBkeW5hbWljXG4vLyBtb2R1bGVzLCBmb3IgdXNlIGluIGNsaWVudC5qcyBhbmQgY2FjaGUuanMuXG52YXIgdmVyc2lvbnMgPSBfX0RZTkFNSUNfVkVSU0lPTlNfXztcblxuZXhwb3J0cy5nZXQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgdmFyIHRyZWUgPSB2ZXJzaW9ucztcbiAgdmFyIHZlcnNpb24gPSBudWxsO1xuXG4gIGlkLnNwbGl0KFwiL1wiKS5zb21lKGZ1bmN0aW9uIChwYXJ0KSB7XG4gICAgaWYgKHBhcnQpIHtcbiAgICAgIC8vIElmIHRoZSB0cmVlIGNvbnRhaW5zIGlkZW50aWZpZXJzIGZvciBNZXRlb3IgcGFja2FnZXMgd2l0aCBjb2xvbnNcbiAgICAgIC8vIGluIHRoZWlyIG5hbWVzLCB0aGUgY29sb25zIHNob3VsZCBub3QgaGF2ZSBiZWVuIHJlcGxhY2VkIGJ5XG4gICAgICAvLyB1bmRlcnNjb3JlcywgYnV0IHRoZXJlJ3MgYSBidWcgdGhhdCByZXN1bHRzIGluIHRoYXQgYmVoYXZpb3IsIHNvXG4gICAgICAvLyBmb3Igbm93IGl0IHNlZW1zIHNhZmVzdCB0byBiZSB0b2xlcmFudCBvZiB1bmRlcnNjb3JlcyBoZXJlLlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvcHVsbC85MTAzXG4gICAgICB0cmVlID0gdHJlZVtwYXJ0XSB8fCB0cmVlW3BhcnQucmVwbGFjZShcIjpcIiwgXCJfXCIpXTtcbiAgICB9XG5cbiAgICBpZiAoISB0cmVlKSB7XG4gICAgICAvLyBUZXJtaW5hdGUgdGhlIHNlYXJjaCB3aXRob3V0IHJlYXNzaWduaW5nIHZlcnNpb24uXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRyZWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHZlcnNpb24gPSB0cmVlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdmVyc2lvbjtcbn07XG4iLCJjb25zdCBicGMgPSBQYWNrYWdlW1wiYnJvd3Nlci1wb2xpY3ktY29udGVudFwiXTtcbmNvbnN0IEJQID0gYnBjICYmIGJwYy5Ccm93c2VyUG9saWN5O1xuY29uc3QgQlBjID0gQlAgJiYgQlAuY29udGVudDtcbmlmIChCUGMpIHtcbiAgLy8gVGhlIGFiaWxpdHkgdG8gZXZhbHVhdGUgbmV3IGNvZGUgaXMgZXNzZW50aWFsIGZvciBsb2FkaW5nIGR5bmFtaWNcbiAgLy8gbW9kdWxlcy4gV2l0aG91dCBldmFsLCB3ZSB3b3VsZCBiZSBmb3JjZWQgdG8gbG9hZCBtb2R1bGVzIHVzaW5nXG4gIC8vIDxzY3JpcHQgc3JjPS4uLj4gdGFncywgYW5kIHRoZW4gdGhlcmUgd291bGQgYmUgbm8gd2F5IHRvIHNhdmUgdGhvc2VcbiAgLy8gbW9kdWxlcyB0byBhIGxvY2FsIGNhY2hlIChvciBsb2FkIHRoZW0gZnJvbSB0aGUgY2FjaGUpIHdpdGhvdXQgdGhlXG4gIC8vIHVuaXF1ZSByZXNwb25zZSBjYWNoaW5nIGFiaWxpdGllcyBvZiBzZXJ2aWNlIHdvcmtlcnMsIHdoaWNoIGFyZSBub3RcbiAgLy8gYXZhaWxhYmxlIGluIGFsbCBicm93c2VycywgYW5kIGNhbm5vdCBiZSBwb2x5ZmlsbGVkIGluIGEgd2F5IHRoYXRcbiAgLy8gc2F0aXNmaWVzIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5IGV2YWwgcmVzdHJpY3Rpb25zLiBNb3Jlb3ZlciwgZXZhbFxuICAvLyBhbGxvd3MgdXMgdG8gZXZhbHVhdGUgZHluYW1pYyBtb2R1bGUgY29kZSBpbiB0aGUgb3JpZ2luYWwgcGFja2FnZVxuICAvLyBzY29wZSwgd2hpY2ggd291bGQgbmV2ZXIgYmUgcG9zc2libGUgdXNpbmcgPHNjcmlwdD4gdGFncy4gSWYgeW91J3JlXG4gIC8vIGRlcGxveWluZyBhbiBhcHAgaW4gYW4gZW52aXJvbm1lbnQgdGhhdCBkZW1hbmRzIGEgQ29udGVudCBTZWN1cml0eVxuICAvLyBQb2xpY3kgdGhhdCBmb3JiaWRzIGV2YWwsIHlvdXIgb25seSBvcHRpb24gaXMgdG8gYnVuZGxlIGFsbCBkeW5hbWljXG4gIC8vIG1vZHVsZXMgaW4gdGhlIGluaXRpYWwgYnVuZGxlLiBGb3J0dW5hdGVseSwgdGhhdCB3b3JrcyBwZXJmZWN0bHlcbiAgLy8gd2VsbDsgeW91IGp1c3Qgd29uJ3QgZ2V0IHRoZSBwZXJmb3JtYW5jZSBiZW5lZml0cyBvZiBkeW5hbWljIG1vZHVsZVxuICAvLyBmZXRjaGluZy5cbiAgQlBjLmFsbG93RXZhbCgpO1xufVxuIl19
