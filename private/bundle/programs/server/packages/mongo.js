(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, MongoTest, MongoConnection, CursorDescription, Cursor, listenAll, forEachTrigger, OPLOG_COLLECTION, idForOp, OplogHandle, ObserveMultiplexer, ObserveHandle, DocFetcher, PollingObserveDriver, OplogObserveDriver, LocalCollectionDriver, Mongo;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Provide a synchronous Collection API using fibers, backed by
 * MongoDB.  This is only for use on the server, and mostly identical
 * to the client API.
 *
 * NOTE: the public API methods must be run within a fiber. If you call
 * these outside of a fiber they will explode!
 */var MongoDB = NpmModuleMongodb;

var Future = Npm.require('fibers/future');

MongoInternals = {};
MongoTest = {};
MongoInternals.NpmModules = {
  mongodb: {
    version: NpmModuleMongodbVersion,
    module: MongoDB
  }
}; // Older version of what is now available via
// MongoInternals.NpmModules.mongodb.module.  It was never documented, but
// people do use it.
// XXX COMPAT WITH 1.0.3.2

MongoInternals.NpmModule = MongoDB; // This is used to add or remove EJSON from the beginning of everything nested
// inside an EJSON custom type. It should only be called on pure JSON!

var replaceNames = function (filter, thing) {
  if (typeof thing === "object") {
    if (_.isArray(thing)) {
      return _.map(thing, _.bind(replaceNames, null, filter));
    }

    var ret = {};

    _.each(thing, function (value, key) {
      ret[filter(key)] = replaceNames(filter, value);
    });

    return ret;
  }

  return thing;
}; // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
// doing a structural clone).
// XXX how ok is this? what if there are multiple copies of MongoDB loaded?


MongoDB.Timestamp.prototype.clone = function () {
  // Timestamps should be immutable.
  return this;
};

var makeMongoLegal = function (name) {
  return "EJSON" + name;
};

var unmakeMongoLegal = function (name) {
  return name.substr(5);
};

var replaceMongoAtomWithMeteor = function (document) {
  if (document instanceof MongoDB.Binary) {
    var buffer = document.value(true);
    return new Uint8Array(buffer);
  }

  if (document instanceof MongoDB.ObjectID) {
    return new Mongo.ObjectID(document.toHexString());
  }

  if (document["EJSON$type"] && document["EJSON$value"] && _.size(document) === 2) {
    return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  return undefined;
};

var replaceMeteorAtomWithMongo = function (document) {
  if (EJSON.isBinary(document)) {
    // This does more copies than we'd like, but is necessary because
    // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
    // serialize it correctly).
    return new MongoDB.Binary(Buffer.from(document));
  }

  if (document instanceof Mongo.ObjectID) {
    return new MongoDB.ObjectID(document.toHexString());
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  if (EJSON._isCustomType(document)) {
    return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
  } // It is not ordinarily possible to stick dollar-sign keys into mongo
  // so we don't bother checking for things that need escaping at this time.


  return undefined;
};

var replaceTypes = function (document, atomTransformer) {
  if (typeof document !== 'object' || document === null) return document;
  var replacedTopLevelAtom = atomTransformer(document);
  if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
  var ret = document;

  _.each(document, function (val, key) {
    var valReplaced = replaceTypes(val, atomTransformer);

    if (val !== valReplaced) {
      // Lazy clone. Shallow copy.
      if (ret === document) ret = _.clone(document);
      ret[key] = valReplaced;
    }
  });

  return ret;
};

MongoConnection = function (url, options) {
  var self = this;
  options = options || {};
  self._observeMultiplexers = {};
  self._onFailoverHook = new Hook();
  var mongoOptions = Object.assign({
    // Reconnect on error.
    autoReconnect: true,
    // Try to reconnect forever, instead of stopping after 30 tries (the
    // default), with each attempt separated by 1000ms.
    reconnectTries: Infinity
  }, Mongo._connectionOptions); // Disable the native parser by default, unless specifically enabled
  // in the mongo URL.
  // - The native driver can cause errors which normally would be
  //   thrown, caught, and handled into segfaults that take down the
  //   whole app.
  // - Binary modules don't yet work when you bundle and move the bundle
  //   to a different platform (aka deploy)
  // We should revisit this after binary npm module support lands.

  if (!/[\?&]native_?[pP]arser=/.test(url)) {
    mongoOptions.native_parser = false;
  } // Internally the oplog connections specify their own poolSize
  // which we don't want to overwrite with any user defined value


  if (_.has(options, 'poolSize')) {
    // If we just set this for "server", replSet will override it. If we just
    // set it for replSet, it will be ignored if we're not using a replSet.
    mongoOptions.poolSize = options.poolSize;
  }

  self.db = null; // We keep track of the ReplSet's primary, so that we can trigger hooks when
  // it changes.  The Node driver's joined callback seems to fire way too
  // often, which is why we need to track it ourselves.

  self._primary = null;
  self._oplogHandle = null;
  self._docFetcher = null;
  var connectFuture = new Future();
  MongoDB.connect(url, mongoOptions, Meteor.bindEnvironment(function (err, db) {
    if (err) {
      throw err;
    } // First, figure out what the current primary is, if any.


    if (db.serverConfig.isMasterDoc) {
      self._primary = db.serverConfig.isMasterDoc.primary;
    }

    db.serverConfig.on('joined', Meteor.bindEnvironment(function (kind, doc) {
      if (kind === 'primary') {
        if (doc.primary !== self._primary) {
          self._primary = doc.primary;

          self._onFailoverHook.each(function (callback) {
            callback();
            return true;
          });
        }
      } else if (doc.me === self._primary) {
        // The thing we thought was primary is now something other than
        // primary.  Forget that we thought it was primary.  (This means
        // that if a server stops being primary and then starts being
        // primary again without another server becoming primary in the
        // middle, we'll correctly count it as a failover.)
        self._primary = null;
      }
    })); // Allow the constructor to return.

    connectFuture['return'](db);
  }, connectFuture.resolver() // onException
  )); // Wait for the connection to be successful; throws on failure.

  self.db = connectFuture.wait();

  if (options.oplogUrl && !Package['disable-oplog']) {
    self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
    self._docFetcher = new DocFetcher(self);
  }
};

MongoConnection.prototype.close = function () {
  var self = this;
  if (!self.db) throw Error("close called before Connection created?"); // XXX probably untested

  var oplogHandle = self._oplogHandle;
  self._oplogHandle = null;
  if (oplogHandle) oplogHandle.stop(); // Use Future.wrap so that errors get thrown. This happens to
  // work even outside a fiber since the 'close' method is not
  // actually asynchronous.

  Future.wrap(_.bind(self.db.close, self.db))(true).wait();
}; // Returns the Mongo Collection object; may yield.


MongoConnection.prototype.rawCollection = function (collectionName) {
  var self = this;
  if (!self.db) throw Error("rawCollection called before Connection created?");
  var future = new Future();
  self.db.collection(collectionName, future.resolver());
  return future.wait();
};

MongoConnection.prototype._createCappedCollection = function (collectionName, byteSize, maxDocuments) {
  var self = this;
  if (!self.db) throw Error("_createCappedCollection called before Connection created?");
  var future = new Future();
  self.db.createCollection(collectionName, {
    capped: true,
    size: byteSize,
    max: maxDocuments
  }, future.resolver());
  future.wait();
}; // This should be called synchronously with a write, to create a
// transaction on the current write fence, if any. After we can read
// the write, and after observers have been notified (or at least,
// after the observer notifiers have added themselves to the write
// fence), you should call 'committed()' on the object returned.


MongoConnection.prototype._maybeBeginWrite = function () {
  var fence = DDPServer._CurrentWriteFence.get();

  if (fence) {
    return fence.beginWrite();
  } else {
    return {
      committed: function () {}
    };
  }
}; // Internal interface: adds a callback which is called when the Mongo primary
// changes. Returns a stop handle.


MongoConnection.prototype._onFailover = function (callback) {
  return this._onFailoverHook.register(callback);
}; //////////// Public API //////////
// The write methods block until the database has confirmed the write (it may
// not be replicated or stable on disk, but one server has confirmed it) if no
// callback is provided. If a callback is provided, then they call the callback
// when the write is confirmed. They return nothing on success, and raise an
// exception on failure.
//
// After making a write (with insert, update, remove), observers are
// notified asynchronously. If you want to receive a callback once all
// of the observer notifications have landed for your write, do the
// writes inside a write fence (set DDPServer._CurrentWriteFence to a new
// _WriteFence, and then set a callback on the write fence.)
//
// Since our execution environment is single-threaded, this is
// well-defined -- a write "has been made" if it's returned, and an
// observer "has been notified" if its callback has returned.


var writeCallback = function (write, refresh, callback) {
  return function (err, result) {
    if (!err) {
      // XXX We don't have to run this on error, right?
      try {
        refresh();
      } catch (refreshErr) {
        if (callback) {
          callback(refreshErr);
          return;
        } else {
          throw refreshErr;
        }
      }
    }

    write.committed();

    if (callback) {
      callback(err, result);
    } else if (err) {
      throw err;
    }
  };
};

var bindEnvironmentForWrite = function (callback) {
  return Meteor.bindEnvironment(callback, "Mongo write");
};

MongoConnection.prototype._insert = function (collection_name, document, callback) {
  var self = this;

  var sendError = function (e) {
    if (callback) return callback(e);
    throw e;
  };

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;
    sendError(e);
    return;
  }

  if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
    sendError(new Error("Only plain objects may be inserted into MongoDB"));
    return;
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collection_name,
      id: document._id
    });
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);
    collection.insert(replaceTypes(document, replaceMeteorAtomWithMongo), {
      safe: true
    }, callback);
  } catch (err) {
    write.committed();
    throw err;
  }
}; // Cause queries that may be affected by the selector to poll in this write
// fence.


MongoConnection.prototype._refresh = function (collectionName, selector) {
  var refreshKey = {
    collection: collectionName
  }; // If we know which documents we're removing, don't poll queries that are
  // specific to other documents. (Note that multiple notifications here should
  // not cause multiple polls, since all our listener is doing is enqueueing a
  // poll.)

  var specificIds = LocalCollection._idsMatchedBySelector(selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      Meteor.refresh(_.extend({
        id: id
      }, refreshKey));
    });
  } else {
    Meteor.refresh(refreshKey);
  }
};

MongoConnection.prototype._remove = function (collection_name, selector, callback) {
  var self = this;

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);

    var wrappedCallback = function (err, driverResult) {
      callback(err, transformResult(driverResult).numberAffected);
    };

    collection.remove(replaceTypes(selector, replaceMeteorAtomWithMongo), {
      safe: true
    }, wrappedCallback);
  } catch (err) {
    write.committed();
    throw err;
  }
};

MongoConnection.prototype._dropCollection = function (collectionName, cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collectionName,
      id: null,
      dropCollection: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    var collection = self.rawCollection(collectionName);
    collection.drop(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
}; // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
// because it lets the test's fence wait for it to be complete.


MongoConnection.prototype._dropDatabase = function (cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      dropDatabase: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    self.db.dropDatabase(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
};

MongoConnection.prototype._update = function (collection_name, selector, mod, options, callback) {
  var self = this;

  if (!callback && options instanceof Function) {
    callback = options;
    options = null;
  }

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e.expected = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  } // explicit safety check. null and undefined can crash the mongo
  // driver. Although the node driver and minimongo do 'support'
  // non-object modifier in that they don't crash, they are not
  // meaningful operations and do not do anything. Defensively throw an
  // error here.


  if (!mod || typeof mod !== 'object') throw new Error("Invalid modifier. Modifier must be an object.");

  if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
    throw new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
  }

  if (!options) options = {};

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = writeCallback(write, refresh, callback);

  try {
    var collection = self.rawCollection(collection_name);
    var mongoOpts = {
      safe: true
    }; // explictly enumerate options that minimongo supports

    if (options.upsert) mongoOpts.upsert = true;
    if (options.multi) mongoOpts.multi = true; // Lets you get a more more full result from MongoDB. Use with caution:
    // might not work with C.upsert (as opposed to C.update({upsert:true}) or
    // with simulated upsert.

    if (options.fullResult) mongoOpts.fullResult = true;
    var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
    var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);

    var isModify = LocalCollection._isModificationMod(mongoMod);

    if (options._forbidReplace && !isModify) {
      var err = new Error("Invalid modifier. Replacements are forbidden.");

      if (callback) {
        return callback(err);
      } else {
        throw err;
      }
    } // We've already run replaceTypes/replaceMeteorAtomWithMongo on
    // selector and mod.  We assume it doesn't matter, as far as
    // the behavior of modifiers is concerned, whether `_modify`
    // is run on EJSON or on mongo-converted EJSON.
    // Run this code up front so that it fails fast if someone uses
    // a Mongo update operator we don't support.


    let knownId;

    if (options.upsert) {
      try {
        let newDoc = LocalCollection._createUpsertDocument(selector, mod);

        knownId = newDoc._id;
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
    }

    if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
      // In case of an upsert with a replacement, where there is no _id defined
      // in either the query or the replacement doc, mongo will generate an id itself. 
      // Therefore we need this special strategy if we want to control the id ourselves.
      // We don't need to do this when:
      // - This is not a replacement, so we can add an _id to $setOnInsert
      // - The id is defined by query or mod we can just add it to the replacement doc
      // - The user did not specify any id preference and the id is a Mongo ObjectId, 
      //     then we can just let Mongo generate the id
      simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options, // This callback does not need to be bindEnvironment'ed because
      // simulateUpsertWithInsertedId() wraps it and then passes it through
      // bindEnvironmentForWrite.
      function (error, result) {
        // If we got here via a upsert() call, then options._returnObject will
        // be set and we should return the whole object. Otherwise, we should
        // just return the number of affected docs to match the mongo API.
        if (result && !options._returnObject) {
          callback(error, result.numberAffected);
        } else {
          callback(error, result);
        }
      });
    } else {
      if (options.upsert && !knownId && options.insertedId && isModify) {
        if (!mongoMod.hasOwnProperty('$setOnInsert')) {
          mongoMod.$setOnInsert = {};
        }

        knownId = options.insertedId;
        Object.assign(mongoMod.$setOnInsert, replaceTypes({
          _id: options.insertedId
        }, replaceMeteorAtomWithMongo));
      }

      collection.update(mongoSelector, mongoMod, mongoOpts, bindEnvironmentForWrite(function (err, result) {
        if (!err) {
          var meteorResult = transformResult(result);

          if (meteorResult && options._returnObject) {
            // If this was an upsert() call, and we ended up
            // inserting a new doc and we know its id, then
            // return that id as well.
            if (options.upsert && meteorResult.insertedId) {
              if (knownId) {
                meteorResult.insertedId = knownId;
              } else if (meteorResult.insertedId instanceof MongoDB.ObjectID) {
                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
              }
            }

            callback(err, meteorResult);
          } else {
            callback(err, meteorResult.numberAffected);
          }
        } else {
          callback(err);
        }
      }));
    }
  } catch (e) {
    write.committed();
    throw e;
  }
};

var transformResult = function (driverResult) {
  var meteorResult = {
    numberAffected: 0
  };

  if (driverResult) {
    var mongoResult = driverResult.result; // On updates with upsert:true, the inserted values come as a list of
    // upserted values -- even with options.multi, when the upsert does insert,
    // it only inserts one element.

    if (mongoResult.upserted) {
      meteorResult.numberAffected += mongoResult.upserted.length;

      if (mongoResult.upserted.length == 1) {
        meteorResult.insertedId = mongoResult.upserted[0]._id;
      }
    } else {
      meteorResult.numberAffected = mongoResult.n;
    }
  }

  return meteorResult;
};

var NUM_OPTIMISTIC_TRIES = 3; // exposed for testing

MongoConnection._isCannotChangeIdError = function (err) {
  // Mongo 3.2.* returns error as next Object:
  // {name: String, code: Number, errmsg: String}
  // Older Mongo returns:
  // {name: String, code: Number, err: String}
  var error = err.errmsg || err.err; // We don't use the error code here
  // because the error code we observed it producing (16837) appears to be
  // a far more generic error code based on examining the source.

  if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
    return true;
  }

  return false;
};

var simulateUpsertWithInsertedId = function (collection, selector, mod, options, callback) {
  // STRATEGY: First try doing an upsert with a generated ID.
  // If this throws an error about changing the ID on an existing document
  // then without affecting the database, we know we should probably try
  // an update without the generated ID. If it affected 0 documents, 
  // then without affecting the database, we the document that first
  // gave the error is probably removed and we need to try an insert again
  // We go back to step one and repeat.
  // Like all "optimistic write" schemes, we rely on the fact that it's
  // unlikely our writes will continue to be interfered with under normal
  // circumstances (though sufficiently heavy contention with writers
  // disagreeing on the existence of an object will cause writes to fail
  // in theory).
  var insertedId = options.insertedId; // must exist

  var mongoOptsForUpdate = {
    safe: true,
    multi: options.multi
  };
  var mongoOptsForInsert = {
    safe: true,
    upsert: true
  };
  var replacementWithId = Object.assign(replaceTypes({
    _id: insertedId
  }, replaceMeteorAtomWithMongo), mod);
  var tries = NUM_OPTIMISTIC_TRIES;

  var doUpdate = function () {
    tries--;

    if (!tries) {
      callback(new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries."));
    } else {
      collection.update(selector, mod, mongoOptsForUpdate, bindEnvironmentForWrite(function (err, result) {
        if (err) {
          callback(err);
        } else if (result && result.result.n != 0) {
          callback(null, {
            numberAffected: result.result.n
          });
        } else {
          doConditionalInsert();
        }
      }));
    }
  };

  var doConditionalInsert = function () {
    collection.update(selector, replacementWithId, mongoOptsForInsert, bindEnvironmentForWrite(function (err, result) {
      if (err) {
        // figure out if this is a
        // "cannot change _id of document" error, and
        // if so, try doUpdate() again, up to 3 times.
        if (MongoConnection._isCannotChangeIdError(err)) {
          doUpdate();
        } else {
          callback(err);
        }
      } else {
        callback(null, {
          numberAffected: result.result.upserted.length,
          insertedId: insertedId
        });
      }
    }));
  };

  doUpdate();
};

_.each(["insert", "update", "remove", "dropCollection", "dropDatabase"], function (method) {
  MongoConnection.prototype[method] = function () /* arguments */{
    var self = this;
    return Meteor.wrapAsync(self["_" + method]).apply(self, arguments);
  };
}); // XXX MongoConnection.upsert() does not return the id of the inserted document
// unless you set it explicitly in the selector or modifier (as a replacement
// doc).


MongoConnection.prototype.upsert = function (collectionName, selector, mod, options, callback) {
  var self = this;

  if (typeof options === "function" && !callback) {
    callback = options;
    options = {};
  }

  return self.update(collectionName, selector, mod, _.extend({}, options, {
    upsert: true,
    _returnObject: true
  }), callback);
};

MongoConnection.prototype.find = function (collectionName, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  return new Cursor(self, new CursorDescription(collectionName, selector, options));
};

MongoConnection.prototype.findOne = function (collection_name, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  options = options || {};
  options.limit = 1;
  return self.find(collection_name, selector, options).fetch()[0];
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


MongoConnection.prototype._ensureIndex = function (collectionName, index, options) {
  var self = this; // We expect this function to be called at startup, not from within a method,
  // so we don't interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.ensureIndex(index, options, future.resolver());
  future.wait();
};

MongoConnection.prototype._dropIndex = function (collectionName, index) {
  var self = this; // This function is only used by test code, not within a method, so we don't
  // interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.dropIndex(index, future.resolver());
  future.wait();
}; // CURSORS
// There are several classes which relate to cursors:
//
// CursorDescription represents the arguments used to construct a cursor:
// collectionName, selector, and (find) options.  Because it is used as a key
// for cursor de-dup, everything in it should either be JSON-stringifiable or
// not affect observeChanges output (eg, options.transform functions are not
// stringifiable but do not affect observeChanges).
//
// SynchronousCursor is a wrapper around a MongoDB cursor
// which includes fully-synchronous versions of forEach, etc.
//
// Cursor is the cursor object returned from find(), which implements the
// documented Mongo.Collection cursor API.  It wraps a CursorDescription and a
// SynchronousCursor (lazily: it doesn't contact Mongo until you call a method
// like fetch or forEach on it).
//
// ObserveHandle is the "observe handle" returned from observeChanges. It has a
// reference to an ObserveMultiplexer.
//
// ObserveMultiplexer allows multiple identical ObserveHandles to be driven by a
// single observe driver.
//
// There are two "observe drivers" which drive ObserveMultiplexers:
//   - PollingObserveDriver caches the results of a query and reruns it when
//     necessary.
//   - OplogObserveDriver follows the Mongo operation log to directly observe
//     database changes.
// Both implementations follow the same simple interface: when you create them,
// they start sending observeChanges callbacks (and a ready() invocation) to
// their ObserveMultiplexer, and you stop them by calling their stop() method.


CursorDescription = function (collectionName, selector, options) {
  var self = this;
  self.collectionName = collectionName;
  self.selector = Mongo.Collection._rewriteSelector(selector);
  self.options = options || {};
};

Cursor = function (mongo, cursorDescription) {
  var self = this;
  self._mongo = mongo;
  self._cursorDescription = cursorDescription;
  self._synchronousCursor = null;
};

_.each(['forEach', 'map', 'fetch', 'count'], function (method) {
  Cursor.prototype[method] = function () {
    var self = this; // You can only observe a tailable cursor.

    if (self._cursorDescription.options.tailable) throw new Error("Cannot call " + method + " on a tailable cursor");

    if (!self._synchronousCursor) {
      self._synchronousCursor = self._mongo._createSynchronousCursor(self._cursorDescription, {
        // Make sure that the "self" argument to forEach/map callbacks is the
        // Cursor, not the SynchronousCursor.
        selfForIteration: self,
        useTransform: true
      });
    }

    return self._synchronousCursor[method].apply(self._synchronousCursor, arguments);
  };
}); // Since we don't actually have a "nextObject" interface, there's really no
// reason to have a "rewind" interface.  All it did was make multiple calls
// to fetch/map/forEach return nothing the second time.
// XXX COMPAT WITH 0.8.1


Cursor.prototype.rewind = function () {};

Cursor.prototype.getTransform = function () {
  return this._cursorDescription.options.transform;
}; // When you call Meteor.publish() with a function that returns a Cursor, we need
// to transmute it into the equivalent subscription.  This is the function that
// does that.


Cursor.prototype._publishCursor = function (sub) {
  var self = this;
  var collection = self._cursorDescription.collectionName;
  return Mongo.Collection._publishCursor(self, sub, collection);
}; // Used to guarantee that publish functions return at most one cursor per
// collection. Private, because we might later have cursors that include
// documents from multiple collections somehow.


Cursor.prototype._getCollectionName = function () {
  var self = this;
  return self._cursorDescription.collectionName;
};

Cursor.prototype.observe = function (callbacks) {
  var self = this;
  return LocalCollection._observeFromObserveChanges(self, callbacks);
};

Cursor.prototype.observeChanges = function (callbacks) {
  var self = this;
  var methods = ['addedAt', 'added', 'changedAt', 'changed', 'removedAt', 'removed', 'movedTo'];

  var ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks); // XXX: Can we find out if callbacks are from observe?


  var exceptionName = ' observe/observeChanges callback';
  methods.forEach(function (method) {
    if (callbacks[method] && typeof callbacks[method] == "function") {
      callbacks[method] = Meteor.bindEnvironment(callbacks[method], method + exceptionName);
    }
  });
  return self._mongo._observeChanges(self._cursorDescription, ordered, callbacks);
};

MongoConnection.prototype._createSynchronousCursor = function (cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  var collection = self.rawCollection(cursorDescription.collectionName);
  var cursorOptions = cursorDescription.options;
  var mongoOptions = {
    sort: cursorOptions.sort,
    limit: cursorOptions.limit,
    skip: cursorOptions.skip
  }; // Do we want a tailable cursor (which only works on capped collections)?

  if (cursorOptions.tailable) {
    // We want a tailable cursor...
    mongoOptions.tailable = true; // ... and for the server to wait a bit if any getMore has no data (rather
    // than making us put the relevant sleeps in the client)...

    mongoOptions.awaitdata = true; // ... and to keep querying the server indefinitely rather than just 5 times
    // if there's no more data.

    mongoOptions.numberOfRetries = -1; // And if this is on the oplog collection and the cursor specifies a 'ts',
    // then set the undocumented oplog replay flag, which does a special scan to
    // find the first document (instead of creating an index on ts). This is a
    // very hard-coded Mongo flag which only works on the oplog collection and
    // only works with the ts field.

    if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
      mongoOptions.oplogReplay = true;
    }
  }

  var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), cursorOptions.fields, mongoOptions);

  if (typeof cursorOptions.maxTimeMs !== 'undefined') {
    dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
  }

  if (typeof cursorOptions.hint !== 'undefined') {
    dbCursor = dbCursor.hint(cursorOptions.hint);
  }

  return new SynchronousCursor(dbCursor, cursorDescription, options);
};

var SynchronousCursor = function (dbCursor, cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  self._dbCursor = dbCursor;
  self._cursorDescription = cursorDescription; // The "self" argument passed to forEach/map callbacks. If we're wrapped
  // inside a user-visible Cursor, we want to provide the outer cursor!

  self._selfForIteration = options.selfForIteration || self;

  if (options.useTransform && cursorDescription.options.transform) {
    self._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
  } else {
    self._transform = null;
  } // Need to specify that the callback is the first argument to nextObject,
  // since otherwise when we try to call it with no args the driver will
  // interpret "undefined" first arg as an options hash and crash.


  self._synchronousNextObject = Future.wrap(dbCursor.nextObject.bind(dbCursor), 0);
  self._synchronousCount = Future.wrap(dbCursor.count.bind(dbCursor));
  self._visitedIds = new LocalCollection._IdMap();
};

_.extend(SynchronousCursor.prototype, {
  _nextObject: function () {
    var self = this;

    while (true) {
      var doc = self._synchronousNextObject().wait();

      if (!doc) return null;
      doc = replaceTypes(doc, replaceMongoAtomWithMeteor);

      if (!self._cursorDescription.options.tailable && _.has(doc, '_id')) {
        // Did Mongo give us duplicate documents in the same cursor? If so,
        // ignore this one. (Do this before the transform, since transform might
        // return some unrelated value.) We don't do this for tailable cursors,
        // because we want to maintain O(1) memory usage. And if there isn't _id
        // for some reason (maybe it's the oplog), then we don't do this either.
        // (Be careful to do this for falsey but existing _id, though.)
        if (self._visitedIds.has(doc._id)) continue;

        self._visitedIds.set(doc._id, true);
      }

      if (self._transform) doc = self._transform(doc);
      return doc;
    }
  },
  forEach: function (callback, thisArg) {
    var self = this; // Get back to the beginning.

    self._rewind(); // We implement the loop ourself instead of using self._dbCursor.each,
    // because "each" will call its callback outside of a fiber which makes it
    // much more complex to make this function synchronous.


    var index = 0;

    while (true) {
      var doc = self._nextObject();

      if (!doc) return;
      callback.call(thisArg, doc, index++, self._selfForIteration);
    }
  },
  // XXX Allow overlapping callback executions if callback yields.
  map: function (callback, thisArg) {
    var self = this;
    var res = [];
    self.forEach(function (doc, index) {
      res.push(callback.call(thisArg, doc, index, self._selfForIteration));
    });
    return res;
  },
  _rewind: function () {
    var self = this; // known to be synchronous

    self._dbCursor.rewind();

    self._visitedIds = new LocalCollection._IdMap();
  },
  // Mostly usable for tailable cursors.
  close: function () {
    var self = this;

    self._dbCursor.close();
  },
  fetch: function () {
    var self = this;
    return self.map(_.identity);
  },
  count: function (applySkipLimit = false) {
    var self = this;
    return self._synchronousCount(applySkipLimit).wait();
  },
  // This method is NOT wrapped in Cursor.
  getRawObjects: function (ordered) {
    var self = this;

    if (ordered) {
      return self.fetch();
    } else {
      var results = new LocalCollection._IdMap();
      self.forEach(function (doc) {
        results.set(doc._id, doc);
      });
      return results;
    }
  }
});

MongoConnection.prototype.tail = function (cursorDescription, docCallback) {
  var self = this;
  if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");

  var cursor = self._createSynchronousCursor(cursorDescription);

  var stopped = false;
  var lastTS;

  var loop = function () {
    var doc = null;

    while (true) {
      if (stopped) return;

      try {
        doc = cursor._nextObject();
      } catch (err) {
        // There's no good way to figure out if this was actually an error
        // from Mongo. Ah well. But either way, we need to retry the cursor
        // (unless the failure was because the observe got stopped).
        doc = null;
      } // Since cursor._nextObject can yield, we need to check again to see if
      // we've been stopped before calling the callback.


      if (stopped) return;

      if (doc) {
        // If a tailable cursor contains a "ts" field, use it to recreate the
        // cursor on error. ("ts" is a standard that Mongo uses internally for
        // the oplog, and there's a special flag that lets you do binary search
        // on it instead of needing to use an index.)
        lastTS = doc.ts;
        docCallback(doc);
      } else {
        var newSelector = _.clone(cursorDescription.selector);

        if (lastTS) {
          newSelector.ts = {
            $gt: lastTS
          };
        }

        cursor = self._createSynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options)); // Mongo failover takes many seconds.  Retry in a bit.  (Without this
        // setTimeout, we peg the CPU at 100% and never notice the actual
        // failover.

        Meteor.setTimeout(loop, 100);
        break;
      }
    }
  };

  Meteor.defer(loop);
  return {
    stop: function () {
      stopped = true;
      cursor.close();
    }
  };
};

MongoConnection.prototype._observeChanges = function (cursorDescription, ordered, callbacks) {
  var self = this;

  if (cursorDescription.options.tailable) {
    return self._observeChangesTailable(cursorDescription, ordered, callbacks);
  } // You may not filter out _id when observing changes, because the id is a core
  // part of the observeChanges API.


  if (cursorDescription.options.fields && (cursorDescription.options.fields._id === 0 || cursorDescription.options.fields._id === false)) {
    throw Error("You may not observe a cursor with {fields: {_id: 0}}");
  }

  var observeKey = EJSON.stringify(_.extend({
    ordered: ordered
  }, cursorDescription));
  var multiplexer, observeDriver;
  var firstHandle = false; // Find a matching ObserveMultiplexer, or create a new one. This next block is
  // guaranteed to not yield (and it doesn't call anything that can observe a
  // new query), so no other calls to this function can interleave with it.

  Meteor._noYieldsAllowed(function () {
    if (_.has(self._observeMultiplexers, observeKey)) {
      multiplexer = self._observeMultiplexers[observeKey];
    } else {
      firstHandle = true; // Create a new ObserveMultiplexer.

      multiplexer = new ObserveMultiplexer({
        ordered: ordered,
        onStop: function () {
          delete self._observeMultiplexers[observeKey];
          observeDriver.stop();
        }
      });
      self._observeMultiplexers[observeKey] = multiplexer;
    }
  });

  var observeHandle = new ObserveHandle(multiplexer, callbacks);

  if (firstHandle) {
    var matcher, sorter;

    var canUseOplog = _.all([function () {
      // At a bare minimum, using the oplog requires us to have an oplog, to
      // want unordered callbacks, and to not want a callback on the polls
      // that won't happen.
      return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
    }, function () {
      // We need to be able to compile the selector. Fall back to polling for
      // some newfangled $selector that minimongo doesn't support yet.
      try {
        matcher = new Minimongo.Matcher(cursorDescription.selector);
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }, function () {
      // ... and the selector itself needs to support oplog.
      return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
    }, function () {
      // And we need to be able to compile the sort, if any.  eg, can't be
      // {$natural: 1}.
      if (!cursorDescription.options.sort) return true;

      try {
        sorter = new Minimongo.Sorter(cursorDescription.options.sort, {
          matcher: matcher
        });
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }], function (f) {
      return f();
    }); // invoke each function


    var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
    observeDriver = new driverClass({
      cursorDescription: cursorDescription,
      mongoHandle: self,
      multiplexer: multiplexer,
      ordered: ordered,
      matcher: matcher,
      // ignored by polling
      sorter: sorter,
      // ignored by polling
      _testOnlyPollCallback: callbacks._testOnlyPollCallback
    }); // This field is only set for use in tests.

    multiplexer._observeDriver = observeDriver;
  } // Blocks until the initial adds have been sent.


  multiplexer.addHandleAndSendInitialAdds(observeHandle);
  return observeHandle;
}; // Listen for the invalidation messages that will trigger us to poll the
// database for changes. If this selector specifies specific IDs, specify them
// here, so that updates to different specific IDs don't cause us to poll.
// listenCallback is the same kind of (notification, complete) callback passed
// to InvalidationCrossbar.listen.


listenAll = function (cursorDescription, listenCallback) {
  var listeners = [];
  forEachTrigger(cursorDescription, function (trigger) {
    listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
  });
  return {
    stop: function () {
      _.each(listeners, function (listener) {
        listener.stop();
      });
    }
  };
};

forEachTrigger = function (cursorDescription, triggerCallback) {
  var key = {
    collection: cursorDescription.collectionName
  };

  var specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      triggerCallback(_.extend({
        id: id
      }, key));
    });

    triggerCallback(_.extend({
      dropCollection: true,
      id: null
    }, key));
  } else {
    triggerCallback(key);
  } // Everyone cares about the database being dropped.


  triggerCallback({
    dropDatabase: true
  });
}; // observeChanges for tailable cursors on capped collections.
//
// Some differences from normal cursors:
//   - Will never produce anything other than 'added' or 'addedBefore'. If you
//     do update a document that has already been produced, this will not notice
//     it.
//   - If you disconnect and reconnect from Mongo, it will essentially restart
//     the query, which will lead to duplicate results. This is pretty bad,
//     but if you include a field called 'ts' which is inserted as
//     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
//     current Mongo-style timestamp), we'll be able to find the place to
//     restart properly. (This field is specifically understood by Mongo with an
//     optimization which allows it to find the right place to start without
//     an index on ts. It's how the oplog works.)
//   - No callbacks are triggered synchronously with the call (there's no
//     differentiation between "initial data" and "later changes"; everything
//     that matches the query gets sent asynchronously).
//   - De-duplication is not implemented.
//   - Does not yet interact with the write fence. Probably, this should work by
//     ignoring removes (which don't work on capped collections) and updates
//     (which don't affect tailable cursors), and just keeping track of the ID
//     of the inserted object, and closing the write fence once you get to that
//     ID (or timestamp?).  This doesn't work well if the document doesn't match
//     the query, though.  On the other hand, the write fence can close
//     immediately if it does not match the query. So if we trust minimongo
//     enough to accurately evaluate the query against the write fence, we
//     should be able to do this...  Of course, minimongo doesn't even support
//     Mongo Timestamps yet.


MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
  var self = this; // Tailable cursors only ever call added/addedBefore callbacks, so it's an
  // error if you didn't provide them.

  if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
    throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
  }

  return self.tail(cursorDescription, function (doc) {
    var id = doc._id;
    delete doc._id; // The ts is an implementation detail. Hide it.

    delete doc.ts;

    if (ordered) {
      callbacks.addedBefore(id, doc, null);
    } else {
      callbacks.added(id, doc);
    }
  });
}; // XXX We probably need to find a better way to expose this. Right now
// it's only used by tests, but in fact you need it in normal
// operation to interact with capped collections.


MongoInternals.MongoTimestamp = MongoDB.Timestamp;
MongoInternals.Connection = MongoConnection;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

OPLOG_COLLECTION = 'oplog.rs';
var TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;

var showTS = function (ts) {
  return "Timestamp(" + ts.getHighBits() + ", " + ts.getLowBits() + ")";
};

idForOp = function (op) {
  if (op.op === 'd') return op.o._id;else if (op.op === 'i') return op.o._id;else if (op.op === 'u') return op.o2._id;else if (op.op === 'c') throw Error("Operator 'c' doesn't supply an object with id: " + EJSON.stringify(op));else throw Error("Unknown op: " + EJSON.stringify(op));
};

OplogHandle = function (oplogUrl, dbName) {
  var self = this;
  self._oplogUrl = oplogUrl;
  self._dbName = dbName;
  self._oplogLastEntryConnection = null;
  self._oplogTailConnection = null;
  self._stopped = false;
  self._tailHandle = null;
  self._readyFuture = new Future();
  self._crossbar = new DDPServer._Crossbar({
    factPackage: "mongo-livedata",
    factName: "oplog-watchers"
  });
  self._baseOplogSelector = {
    ns: new RegExp('^' + Meteor._escapeRegExp(self._dbName) + '\\.'),
    $or: [{
      op: {
        $in: ['i', 'u', 'd']
      }
    }, // drop collection
    {
      op: 'c',
      'o.drop': {
        $exists: true
      }
    }, {
      op: 'c',
      'o.dropDatabase': 1
    }]
  }; // Data structures to support waitUntilCaughtUp(). Each oplog entry has a
  // MongoTimestamp object on it (which is not the same as a Date --- it's a
  // combination of time and an incrementing counter; see
  // http://docs.mongodb.org/manual/reference/bson-types/#timestamps).
  //
  // _catchingUpFutures is an array of {ts: MongoTimestamp, future: Future}
  // objects, sorted by ascending timestamp. _lastProcessedTS is the
  // MongoTimestamp of the last oplog entry we've processed.
  //
  // Each time we call waitUntilCaughtUp, we take a peek at the final oplog
  // entry in the db.  If we've already processed it (ie, it is not greater than
  // _lastProcessedTS), waitUntilCaughtUp immediately returns. Otherwise,
  // waitUntilCaughtUp makes a new Future and inserts it along with the final
  // timestamp entry that it read, into _catchingUpFutures. waitUntilCaughtUp
  // then waits on that future, which is resolved once _lastProcessedTS is
  // incremented to be past its timestamp by the worker fiber.
  //
  // XXX use a priority queue or something else that's faster than an array

  self._catchingUpFutures = [];
  self._lastProcessedTS = null;
  self._onSkippedEntriesHook = new Hook({
    debugPrintExceptions: "onSkippedEntries callback"
  });
  self._entryQueue = new Meteor._DoubleEndedQueue();
  self._workerActive = false;

  self._startTailing();
};

_.extend(OplogHandle.prototype, {
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;
    if (self._tailHandle) self._tailHandle.stop(); // XXX should close connections too
  },
  onOplogEntry: function (trigger, callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onOplogEntry on stopped handle!"); // Calling onOplogEntry requires us to wait for the tailing to be ready.

    self._readyFuture.wait();

    var originalCallback = callback;
    callback = Meteor.bindEnvironment(function (notification) {
      // XXX can we avoid this clone by making oplog.js careful?
      originalCallback(EJSON.clone(notification));
    }, function (err) {
      Meteor._debug("Error in oplog callback", err.stack);
    });

    var listenHandle = self._crossbar.listen(trigger, callback);

    return {
      stop: function () {
        listenHandle.stop();
      }
    };
  },
  // Register a callback to be invoked any time we skip oplog entries (eg,
  // because we are too far behind).
  onSkippedEntries: function (callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onSkippedEntries on stopped handle!");
    return self._onSkippedEntriesHook.register(callback);
  },
  // Calls `callback` once the oplog has been processed up to a point that is
  // roughly "now": specifically, once we've processed all ops that are
  // currently visible.
  // XXX become convinced that this is actually safe even if oplogConnection
  // is some kind of pool
  waitUntilCaughtUp: function () {
    var self = this;
    if (self._stopped) throw new Error("Called waitUntilCaughtUp on stopped handle!"); // Calling waitUntilCaughtUp requries us to wait for the oplog connection to
    // be ready.

    self._readyFuture.wait();

    var lastEntry;

    while (!self._stopped) {
      // We need to make the selector at least as restrictive as the actual
      // tailing selector (ie, we need to specify the DB name) or else we might
      // find a TS that won't show up in the actual tail stream.
      try {
        lastEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, self._baseOplogSelector, {
          fields: {
            ts: 1
          },
          sort: {
            $natural: -1
          }
        });
        break;
      } catch (e) {
        // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.
        Meteor._debug("Got exception while reading last entry: " + e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    if (!lastEntry) {
      // Really, nothing in the oplog? Well, we've processed everything.
      return;
    }

    var ts = lastEntry.ts;
    if (!ts) throw Error("oplog entry without ts: " + EJSON.stringify(lastEntry));

    if (self._lastProcessedTS && ts.lessThanOrEqual(self._lastProcessedTS)) {
      // We've already caught up to here.
      return;
    } // Insert the future into our list. Almost always, this will be at the end,
    // but it's conceivable that if we fail over from one primary to another,
    // the oplog entries we see will go backwards.


    var insertAfter = self._catchingUpFutures.length;

    while (insertAfter - 1 > 0 && self._catchingUpFutures[insertAfter - 1].ts.greaterThan(ts)) {
      insertAfter--;
    }

    var f = new Future();

    self._catchingUpFutures.splice(insertAfter, 0, {
      ts: ts,
      future: f
    });

    f.wait();
  },
  _startTailing: function () {
    var self = this; // First, make sure that we're talking to the local database.

    var mongodbUri = Npm.require('mongodb-uri');

    if (mongodbUri.parse(self._oplogUrl).database !== 'local') {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // We make two separate connections to Mongo. The Node Mongo driver
    // implements a naive round-robin connection pool: each "connection" is a
    // pool of several (5 by default) TCP connections, and each request is
    // rotated through the pools. Tailable cursor queries block on the server
    // until there is some data to return (or until a few seconds have
    // passed). So if the connection pool used for tailing cursors is the same
    // pool used for other queries, the other queries will be delayed by seconds
    // 1/5 of the time.
    //
    // The tail connection will only ever be running a single tail command, so
    // it only needs to make one underlying TCP connection.


    self._oplogTailConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // XXX better docs, but: it's to get monotonic results
    // XXX is it safe to say "if there's an in flight query, just use its
    //     results"? I don't think so but should consider that

    self._oplogLastEntryConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // Now, make sure that there actually is a repl set here. If not, oplog
    // tailing won't ever find anything!
    // More on the isMasterDoc
    // https://docs.mongodb.com/manual/reference/command/isMaster/

    var f = new Future();

    self._oplogLastEntryConnection.db.admin().command({
      ismaster: 1
    }, f.resolver());

    var isMasterDoc = f.wait();

    if (!(isMasterDoc && isMasterDoc.setName)) {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // Find the last oplog entry.


    var lastOplogEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, {}, {
      sort: {
        $natural: -1
      },
      fields: {
        ts: 1
      }
    });

    var oplogSelector = _.clone(self._baseOplogSelector);

    if (lastOplogEntry) {
      // Start after the last entry that currently exists.
      oplogSelector.ts = {
        $gt: lastOplogEntry.ts
      }; // If there are any calls to callWhenProcessedLatest before any other
      // oplog entries show up, allow callWhenProcessedLatest to call its
      // callback immediately.

      self._lastProcessedTS = lastOplogEntry.ts;
    }

    var cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
      tailable: true
    });
    self._tailHandle = self._oplogTailConnection.tail(cursorDescription, function (doc) {
      self._entryQueue.push(doc);

      self._maybeStartWorker();
    });

    self._readyFuture.return();
  },
  _maybeStartWorker: function () {
    var self = this;
    if (self._workerActive) return;
    self._workerActive = true;
    Meteor.defer(function () {
      try {
        while (!self._stopped && !self._entryQueue.isEmpty()) {
          // Are we too far behind? Just tell our observers that they need to
          // repoll, and drop our queue.
          if (self._entryQueue.length > TOO_FAR_BEHIND) {
            var lastEntry = self._entryQueue.pop();

            self._entryQueue.clear();

            self._onSkippedEntriesHook.each(function (callback) {
              callback();
              return true;
            }); // Free any waitUntilCaughtUp() calls that were waiting for us to
            // pass something that we just skipped.


            self._setLastProcessedTS(lastEntry.ts);

            continue;
          }

          var doc = self._entryQueue.shift();

          if (!(doc.ns && doc.ns.length > self._dbName.length + 1 && doc.ns.substr(0, self._dbName.length + 1) === self._dbName + '.')) {
            throw new Error("Unexpected ns");
          }

          var trigger = {
            collection: doc.ns.substr(self._dbName.length + 1),
            dropCollection: false,
            dropDatabase: false,
            op: doc
          }; // Is it a special command and the collection name is hidden somewhere
          // in operator?

          if (trigger.collection === "$cmd") {
            if (doc.o.dropDatabase) {
              delete trigger.collection;
              trigger.dropDatabase = true;
            } else if (_.has(doc.o, 'drop')) {
              trigger.collection = doc.o.drop;
              trigger.dropCollection = true;
              trigger.id = null;
            } else {
              throw Error("Unknown command " + JSON.stringify(doc));
            }
          } else {
            // All other ops have an id.
            trigger.id = idForOp(doc);
          }

          self._crossbar.fire(trigger); // Now that we've processed this operation, process pending
          // sequencers.


          if (!doc.ts) throw Error("oplog entry without ts: " + EJSON.stringify(doc));

          self._setLastProcessedTS(doc.ts);
        }
      } finally {
        self._workerActive = false;
      }
    });
  },
  _setLastProcessedTS: function (ts) {
    var self = this;
    self._lastProcessedTS = ts;

    while (!_.isEmpty(self._catchingUpFutures) && self._catchingUpFutures[0].ts.lessThanOrEqual(self._lastProcessedTS)) {
      var sequencer = self._catchingUpFutures.shift();

      sequencer.future.return();
    }
  },
  //Methods used on tests to dinamically change TOO_FAR_BEHIND
  _defineTooFarBehind: function (value) {
    TOO_FAR_BEHIND = value;
  },
  _resetTooFarBehind: function () {
    TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

ObserveMultiplexer = function (options) {
  var self = this;
  if (!options || !_.has(options, 'ordered')) throw Error("must specified ordered");
  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
  self._ordered = options.ordered;

  self._onStop = options.onStop || function () {};

  self._queue = new Meteor._SynchronousQueue();
  self._handles = {};
  self._readyFuture = new Future();
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered
  }); // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.

  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = function () /* ... */{
      self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
};

_.extend(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: function (handle) {
    var self = this; // Check this before calling runTask (even though runTask does the same
    // check) so that we don't leak an ObserveMultiplexer on error by
    // incrementing _addHandleTasksScheduledButNotPerformed and never
    // decrementing it.

    if (!self._queue.safeToRunTask()) throw new Error("Can't call observeChanges from an observe callback on the same query");
    ++self._addHandleTasksScheduledButNotPerformed;
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);

    self._queue.runTask(function () {
      self._handles[handle._id] = handle; // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).

      self._sendAdds(handle);

      --self._addHandleTasksScheduledButNotPerformed;
    }); // *outside* the task, since otherwise we'd deadlock


    self._readyFuture.wait();
  },
  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: function (id) {
    var self = this; // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.

    if (!self._ready()) throw new Error("Can't remove handles until the multiplex is ready");
    delete self._handles[id];
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);

    if (_.isEmpty(self._handles) && self._addHandleTasksScheduledButNotPerformed === 0) {
      self._stop();
    }
  },
  _stop: function (options) {
    var self = this;
    options = options || {}; // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!

    if (!self._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready"); // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).

    self._onStop();

    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1); // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).

    self._handles = null;
  },
  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;

    self._queue.queueTask(function () {
      if (self._ready()) throw Error("can't make ObserveMultiplex ready twice!");

      self._readyFuture.return();
    });
  },
  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: function (err) {
    var self = this;

    self._queue.runTask(function () {
      if (self._ready()) throw Error("can't claim query has an error after it worked!");

      self._stop({
        fromQueryError: true
      });

      self._readyFuture.throw(err);
    });
  },
  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;

    self._queue.queueTask(function () {
      if (!self._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
      cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered) return ["addedBefore", "changed", "movedBefore", "removed"];else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return this._readyFuture.isResolved();
  },
  _applyCallback: function (callbackName, args) {
    var self = this;

    self._queue.queueTask(function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return; // First, apply the change to the cache.
      // XXX We could make applyChange callbacks promise not to hang on to any
      // state from their arguments (assuming that their supplied callbacks
      // don't) and skip this clone. Currently 'changed' hangs on to state
      // though.

      self._cache.applyChange[callbackName].apply(null, EJSON.clone(args)); // If we haven't finished the initial adds, then we should only be getting
      // adds.


      if (!self._ready() && callbackName !== 'added' && callbackName !== 'addedBefore') {
        throw new Error("Got " + callbackName + " during initial adds");
      } // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)


      _.each(_.keys(self._handles), function (handleId) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle['_' + callbackName]; // clone arguments so that callbacks can mutate their arguments

        callback && callback.apply(null, EJSON.clone(args));
      });
    });
  },
  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: function (handle) {
    var self = this;
    if (self._queue.safeToRunTask()) throw Error("_sendAdds may only be called from within a task!");
    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return; // note: docs may be an _IdMap or an OrderedDict

    self._cache.docs.forEach(function (doc, id) {
      if (!_.has(self._handles, handle._id)) throw Error("handle got removed before sending initial adds!");
      var fields = EJSON.clone(doc);
      delete fields._id;
      if (self._ordered) add(id, fields, null); // we're going in order, so add at end
      else add(id, fields);
    });
  }
});

var nextObserveHandleId = 1;

ObserveHandle = function (multiplexer, callbacks) {
  var self = this; // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.

  self._multiplexer = multiplexer;

  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self['_' + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = function (id, fields, before) {
        callbacks.added(id, fields);
      };
    }
  });

  self._stopped = false;
  self._id = nextObserveHandleId++;
};

ObserveHandle.prototype.stop = function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;

  self._multiplexer.removeHandle(self._id);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');

var Future = Npm.require('fibers/future');

DocFetcher = function (mongoConnection) {
  var self = this;
  self._mongoConnection = mongoConnection; // Map from cache key -> [callback]

  self._callbacksForCacheKey = {};
};

_.extend(DocFetcher.prototype, {
  // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same cacheKey (a string),
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).
  fetch: function (collectionName, id, cacheKey, callback) {
    var self = this;
    check(collectionName, String); // id is some sort of scalar

    check(cacheKey, String); // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.

    if (_.has(self._callbacksForCacheKey, cacheKey)) {
      self._callbacksForCacheKey[cacheKey].push(callback);

      return;
    }

    var callbacks = self._callbacksForCacheKey[cacheKey] = [callback];
    Fiber(function () {
      try {
        var doc = self._mongoConnection.findOne(collectionName, {
          _id: id
        }) || null; // Return doc to all relevant callbacks. Note that this array can
        // continue to grow during callback excecution.

        while (!_.isEmpty(callbacks)) {
          // Clone the document so that the various calls to fetch don't return
          // objects that are intertwingled with each other. Clone before
          // popping the future, so that if clone throws, the error gets passed
          // to the next callback.
          var clonedDoc = EJSON.clone(doc);
          callbacks.pop()(null, clonedDoc);
        }
      } catch (e) {
        while (!_.isEmpty(callbacks)) {
          callbacks.pop()(e);
        }
      } finally {
        // XXX consider keeping the doc around for a period of time before
        // removing from the cache
        delete self._callbacksForCacheKey[cacheKey];
      }
    }).run();
  }
});

MongoTest.DocFetcher = DocFetcher;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
PollingObserveDriver = function (options) {
  var self = this;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._ordered = options.ordered;
  self._multiplexer = options.multiplexer;
  self._stopCallbacks = [];
  self._stopped = false;
  self._synchronousCursor = self._mongoHandle._createSynchronousCursor(self._cursorDescription); // previous results snapshot.  on each poll cycle, diffs against
  // results drives the callbacks.

  self._results = null; // The number of _pollMongo calls that have been added to self._taskQueue but
  // have not started running. Used to make sure we never schedule more than one
  // _pollMongo (other than possibly the one that is currently running). It's
  // also used by _suspendPolling to pretend there's a poll scheduled. Usually,
  // it's either 0 (for "no polls scheduled other than maybe one currently
  // running") or 1 (for "a poll scheduled that isn't running yet"), but it can
  // also be 2 if incremented by _suspendPolling.

  self._pollsScheduledButNotStarted = 0;
  self._pendingWrites = []; // people to notify when polling completes
  // Make sure to create a separately throttled function for each
  // PollingObserveDriver object.

  self._ensurePollIsScheduled = _.throttle(self._unthrottledEnsurePollIsScheduled, self._cursorDescription.options.pollingThrottleMs || 50 /* ms */); // XXX figure out if we still need a queue

  self._taskQueue = new Meteor._SynchronousQueue();
  var listenersHandle = listenAll(self._cursorDescription, function (notification) {
    // When someone does a transaction that might affect us, schedule a poll
    // of the database. If that transaction happens inside of a write fence,
    // block the fence until we've polled and notified observers.
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) self._pendingWrites.push(fence.beginWrite()); // Ensure a poll is scheduled... but if we already know that one is,
    // don't hit the throttled _ensurePollIsScheduled function (which might
    // lead to us calling it unnecessarily in <pollingThrottleMs> ms).

    if (self._pollsScheduledButNotStarted === 0) self._ensurePollIsScheduled();
  });

  self._stopCallbacks.push(function () {
    listenersHandle.stop();
  }); // every once and a while, poll even if we don't think we're dirty, for
  // eventual consistency with database writes from outside the Meteor
  // universe.
  //
  // For testing, there's an undocumented callback argument to observeChanges
  // which disables time-based polling and gets called at the beginning of each
  // poll.


  if (options._testOnlyPollCallback) {
    self._testOnlyPollCallback = options._testOnlyPollCallback;
  } else {
    var pollingInterval = self._cursorDescription.options.pollingIntervalMs || self._cursorDescription.options._pollingInterval || // COMPAT with 1.2
    10 * 1000;
    var intervalHandle = Meteor.setInterval(_.bind(self._ensurePollIsScheduled, self), pollingInterval);

    self._stopCallbacks.push(function () {
      Meteor.clearInterval(intervalHandle);
    });
  } // Make sure we actually poll soon!


  self._unthrottledEnsurePollIsScheduled();

  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
};

_.extend(PollingObserveDriver.prototype, {
  // This is always called through _.throttle (except once at startup).
  _unthrottledEnsurePollIsScheduled: function () {
    var self = this;
    if (self._pollsScheduledButNotStarted > 0) return;
    ++self._pollsScheduledButNotStarted;

    self._taskQueue.queueTask(function () {
      self._pollMongo();
    });
  },
  // test-only interface for controlling polling.
  //
  // _suspendPolling blocks until any currently running and scheduled polls are
  // done, and prevents any further polls from being scheduled. (new
  // ObserveHandles can be added and receive their initial added callbacks,
  // though.)
  //
  // _resumePolling immediately polls, and allows further polls to occur.
  _suspendPolling: function () {
    var self = this; // Pretend that there's another poll scheduled (which will prevent
    // _ensurePollIsScheduled from queueing any more polls).

    ++self._pollsScheduledButNotStarted; // Now block until all currently running or scheduled polls are done.

    self._taskQueue.runTask(function () {}); // Confirm that there is only one "poll" (the fake one we're pretending to
    // have) scheduled.


    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted);
  },
  _resumePolling: function () {
    var self = this; // We should be in the same state as in the end of _suspendPolling.

    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted); // Run a poll synchronously (which will counteract the
    // ++_pollsScheduledButNotStarted from _suspendPolling).

    self._taskQueue.runTask(function () {
      self._pollMongo();
    });
  },
  _pollMongo: function () {
    var self = this;
    --self._pollsScheduledButNotStarted;
    if (self._stopped) return;
    var first = false;
    var newResults;
    var oldResults = self._results;

    if (!oldResults) {
      first = true; // XXX maybe use OrderedDict instead?

      oldResults = self._ordered ? [] : new LocalCollection._IdMap();
    }

    self._testOnlyPollCallback && self._testOnlyPollCallback(); // Save the list of pending writes which this round will commit.

    var writesForCycle = self._pendingWrites;
    self._pendingWrites = []; // Get the new query results. (This yields.)

    try {
      newResults = self._synchronousCursor.getRawObjects(self._ordered);
    } catch (e) {
      if (first && typeof e.code === 'number') {
        // This is an error document sent to us by mongod, not a connection
        // error generated by the client. And we've never seen this query work
        // successfully. Probably it's a bad selector or something, so we should
        // NOT retry. Instead, we should halt the observe (which ends up calling
        // `stop` on us).
        self._multiplexer.queryError(new Error("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.message));

        return;
      } // getRawObjects can throw if we're having trouble talking to the
      // database.  That's fine --- we will repoll later anyway. But we should
      // make sure not to lose track of this cycle's writes.
      // (It also can throw if there's just something invalid about this query;
      // unfortunately the ObserveDriver API doesn't provide a good way to
      // "cancel" the observe from the inside in this case.


      Array.prototype.push.apply(self._pendingWrites, writesForCycle);

      Meteor._debug("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.stack);

      return;
    } // Run diffs.


    if (!self._stopped) {
      LocalCollection._diffQueryChanges(self._ordered, oldResults, newResults, self._multiplexer);
    } // Signals the multiplexer to allow all observeChanges calls that share this
    // multiplexer to return. (This happens asynchronously, via the
    // multiplexer's queue.)


    if (first) self._multiplexer.ready(); // Replace self._results atomically.  (This assignment is what makes `first`
    // stay through on the next cycle, so we've waited until after we've
    // committed to ready-ing the multiplexer.)

    self._results = newResults; // Once the ObserveMultiplexer has processed everything we've done in this
    // round, mark all the writes which existed before this call as
    // commmitted. (If new writes have shown up in the meantime, there'll
    // already be another _pollMongo task scheduled.)

    self._multiplexer.onFlush(function () {
      _.each(writesForCycle, function (w) {
        w.committed();
      });
    });
  },
  stop: function () {
    var self = this;
    self._stopped = true;

    _.each(self._stopCallbacks, function (c) {
      c();
    }); // Release any write fences that are waiting on us.


    _.each(self._pendingWrites, function (w) {
      w.committed();
    });

    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

var PHASE = {
  QUERYING: "QUERYING",
  FETCHING: "FETCHING",
  STEADY: "STEADY"
}; // Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.

var SwitchedToQuery = function () {};

var finishIfNeedToPollQuery = function (f) {
  return function () {
    try {
      f.apply(this, arguments);
    } catch (e) {
      if (!(e instanceof SwitchedToQuery)) throw e;
    }
  };
};

var currentId = 0; // OplogObserveDriver is an alternative to PollingObserveDriver which follows
// the Mongo operation log instead of just re-polling the query. It obeys the
// same simple interface: constructing it starts sending observeChanges
// callbacks (and a ready() invocation) to the ObserveMultiplexer, and you stop
// it by calling the stop() method.

OplogObserveDriver = function (options) {
  var self = this;
  self._usesOplog = true; // tests look at this

  self._id = currentId;
  currentId++;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._multiplexer = options.multiplexer;

  if (options.ordered) {
    throw Error("OplogObserveDriver only supports unordered observeChanges");
  }

  var sorter = options.sorter; // We don't support $near and other geo-queries so it's OK to initialize the
  // comparator only once in the constructor.

  var comparator = sorter && sorter.getComparator();

  if (options.cursorDescription.options.limit) {
    // There are several properties ordered driver implements:
    // - _limit is a positive number
    // - _comparator is a function-comparator by which the query is ordered
    // - _unpublishedBuffer is non-null Min/Max Heap,
    //                      the empty buffer in STEADY phase implies that the
    //                      everything that matches the queries selector fits
    //                      into published set.
    // - _published - Min Heap (also implements IdMap methods)
    var heapOptions = {
      IdMap: LocalCollection._IdMap
    };
    self._limit = self._cursorDescription.options.limit;
    self._comparator = comparator;
    self._sorter = sorter;
    self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions); // We need something that can find Max value in addition to IdMap interface

    self._published = new MaxHeap(comparator, heapOptions);
  } else {
    self._limit = 0;
    self._comparator = null;
    self._sorter = null;
    self._unpublishedBuffer = null;
    self._published = new LocalCollection._IdMap();
  } // Indicates if it is safe to insert a new document at the end of the buffer
  // for this query. i.e. it is known that there are no documents matching the
  // selector those are not in published or buffer.


  self._safeAppendToBuffer = false;
  self._stopped = false;
  self._stopHandles = [];
  Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);

  self._registerPhaseChange(PHASE.QUERYING);

  self._matcher = options.matcher;
  var projection = self._cursorDescription.options.fields || {};
  self._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
  // existing fields projection

  self._sharedProjection = self._matcher.combineIntoProjection(projection);
  if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
  self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
  self._needToFetch = new LocalCollection._IdMap();
  self._currentlyFetching = null;
  self._fetchGeneration = 0;
  self._requeryWhenDoneThisQuery = false;
  self._writesToCommitWhenWeReachSteady = []; // If the oplog handle tells us that it skipped some entries (because it got
  // behind, say), re-poll.

  self._stopHandles.push(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  })));

  forEachTrigger(self._cursorDescription, function (trigger) {
    self._stopHandles.push(self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
      Meteor._noYieldsAllowed(finishIfNeedToPollQuery(function () {
        var op = notification.op;

        if (notification.dropCollection || notification.dropDatabase) {
          // Note: this call is not allowed to block on anything (especially
          // on waiting for oplog entries to catch up) because that will block
          // onOplogEntry!
          self._needToPollQuery();
        } else {
          // All other operators should be handled depending on phase
          if (self._phase === PHASE.QUERYING) {
            self._handleOplogEntryQuerying(op);
          } else {
            self._handleOplogEntrySteadyOrFetching(op);
          }
        }
      }));
    }));
  }); // XXX ordering w.r.t. everything else?

  self._stopHandles.push(listenAll(self._cursorDescription, function (notification) {
    // If we're not in a pre-fire write fence, we don't have to do anything.
    var fence = DDPServer._CurrentWriteFence.get();

    if (!fence || fence.fired) return;

    if (fence._oplogObserveDrivers) {
      fence._oplogObserveDrivers[self._id] = self;
      return;
    }

    fence._oplogObserveDrivers = {};
    fence._oplogObserveDrivers[self._id] = self;
    fence.onBeforeFire(function () {
      var drivers = fence._oplogObserveDrivers;
      delete fence._oplogObserveDrivers; // This fence cannot fire until we've caught up to "this point" in the
      // oplog, and all observers made it back to the steady state.

      self._mongoHandle._oplogHandle.waitUntilCaughtUp();

      _.each(drivers, function (driver) {
        if (driver._stopped) return;
        var write = fence.beginWrite();

        if (driver._phase === PHASE.STEADY) {
          // Make sure that all of the callbacks have made it through the
          // multiplexer and been delivered to ObserveHandles before committing
          // writes.
          driver._multiplexer.onFlush(function () {
            write.committed();
          });
        } else {
          driver._writesToCommitWhenWeReachSteady.push(write);
        }
      });
    });
  })); // When Mongo fails over, we need to repoll the query, in case we processed an
  // oplog entry that got rolled back.


  self._stopHandles.push(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  }))); // Give _observeChanges a chance to add the new ObserveHandle to our
  // multiplexer, so that the added calls get streamed.


  Meteor.defer(finishIfNeedToPollQuery(function () {
    self._runInitialQuery();
  }));
};

_.extend(OplogObserveDriver.prototype, {
  _addPublished: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var fields = _.clone(doc);

      delete fields._id;

      self._published.set(id, self._sharedProjectionFn(doc));

      self._multiplexer.added(id, self._projectionFn(fields)); // After adding this document, the published set might be overflowed
      // (exceeding capacity specified by limit). If so, push the maximum
      // element to the buffer, we might want to save it in memory to reduce the
      // amount of Mongo lookups in the future.


      if (self._limit && self._published.size() > self._limit) {
        // XXX in theory the size of published is no more than limit+1
        if (self._published.size() !== self._limit + 1) {
          throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
        }

        var overflowingDocId = self._published.maxElementId();

        var overflowingDoc = self._published.get(overflowingDocId);

        if (EJSON.equals(overflowingDocId, id)) {
          throw new Error("The document just added is overflowing the published set");
        }

        self._published.remove(overflowingDocId);

        self._multiplexer.removed(overflowingDocId);

        self._addBuffered(overflowingDocId, overflowingDoc);
      }
    });
  },
  _removePublished: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.remove(id);

      self._multiplexer.removed(id);

      if (!self._limit || self._published.size() === self._limit) return;
      if (self._published.size() > self._limit) throw Error("self._published got too big"); // OK, we are publishing less than the limit. Maybe we should look in the
      // buffer to find the next element past what we were publishing before.

      if (!self._unpublishedBuffer.empty()) {
        // There's something in the buffer; move the first thing in it to
        // _published.
        var newDocId = self._unpublishedBuffer.minElementId();

        var newDoc = self._unpublishedBuffer.get(newDocId);

        self._removeBuffered(newDocId);

        self._addPublished(newDocId, newDoc);

        return;
      } // There's nothing in the buffer.  This could mean one of a few things.
      // (a) We could be in the middle of re-running the query (specifically, we
      // could be in _publishNewResults). In that case, _unpublishedBuffer is
      // empty because we clear it at the beginning of _publishNewResults. In
      // this case, our caller already knows the entire answer to the query and
      // we don't need to do anything fancy here.  Just return.


      if (self._phase === PHASE.QUERYING) return; // (b) We're pretty confident that the union of _published and
      // _unpublishedBuffer contain all documents that match selector. Because
      // _unpublishedBuffer is empty, that means we're confident that _published
      // contains all documents that match selector. So we have nothing to do.

      if (self._safeAppendToBuffer) return; // (c) Maybe there are other documents out there that should be in our
      // buffer. But in that case, when we emptied _unpublishedBuffer in
      // _removeBuffered, we should have called _needToPollQuery, which will
      // either put something in _unpublishedBuffer or set _safeAppendToBuffer
      // (or both), and it will put us in QUERYING for that whole time. So in
      // fact, we shouldn't be able to get here.

      throw new Error("Buffer inexplicably empty");
    });
  },
  _changePublished: function (id, oldDoc, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.set(id, self._sharedProjectionFn(newDoc));

      var projectedNew = self._projectionFn(newDoc);

      var projectedOld = self._projectionFn(oldDoc);

      var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
      if (!_.isEmpty(changed)) self._multiplexer.changed(id, changed);
    });
  },
  _addBuffered: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc)); // If something is overflowing the buffer, we just remove it from cache


      if (self._unpublishedBuffer.size() > self._limit) {
        var maxBufferedId = self._unpublishedBuffer.maxElementId();

        self._unpublishedBuffer.remove(maxBufferedId); // Since something matching is removed from cache (both published set and
        // buffer), set flag to false


        self._safeAppendToBuffer = false;
      }
    });
  },
  // Is called either to remove the doc completely from matching set or to move
  // it to the published set later.
  _removeBuffered: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.remove(id); // To keep the contract "buffer is never empty in STEADY phase unless the
      // everything matching fits into published" true, we poll everything as
      // soon as we see the buffer becoming empty.


      if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
    });
  },
  // Called when a document has joined the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _addMatching: function (doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = doc._id;
      if (self._published.has(id)) throw Error("tried to add something already published " + id);
      if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
      var limit = self._limit;
      var comparator = self._comparator;
      var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
      var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null; // The query is unlimited or didn't publish enough documents yet or the
      // new document would fit into published set pushing the maximum element
      // out, then we need to publish the doc.

      var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0; // Otherwise we might need to buffer it (only in case of limited query).
      // Buffering is allowed if the buffer is not filled up yet and all
      // matching docs are either in the published set or in the buffer.

      var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit; // Or if it is small enough to be safely inserted to the middle or the
      // beginning of the buffer.

      var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
      var toBuffer = canAppendToBuffer || canInsertIntoBuffer;

      if (toPublish) {
        self._addPublished(id, doc);
      } else if (toBuffer) {
        self._addBuffered(id, doc);
      } else {
        // dropping it and not saving to the cache
        self._safeAppendToBuffer = false;
      }
    });
  },
  // Called when a document leaves the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _removeMatching: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);

      if (self._published.has(id)) {
        self._removePublished(id);
      } else if (self._unpublishedBuffer.has(id)) {
        self._removeBuffered(id);
      }
    });
  },
  _handleDoc: function (id, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;

      var publishedBefore = self._published.has(id);

      var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

      var cachedBefore = publishedBefore || bufferedBefore;

      if (matchesNow && !cachedBefore) {
        self._addMatching(newDoc);
      } else if (cachedBefore && !matchesNow) {
        self._removeMatching(id);
      } else if (cachedBefore && matchesNow) {
        var oldDoc = self._published.get(id);

        var comparator = self._comparator;

        var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());

        var maxBuffered;

        if (publishedBefore) {
          // Unlimited case where the document stays in published once it
          // matches or the case when we don't have enough matching docs to
          // publish or the changed but matching doc will stay in published
          // anyways.
          //
          // XXX: We rely on the emptiness of buffer. Be sure to maintain the
          // fact that buffer can't be empty if there are matching documents not
          // published. Notably, we don't want to schedule repoll and continue
          // relying on this property.
          var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;

          if (staysInPublished) {
            self._changePublished(id, oldDoc, newDoc);
          } else {
            // after the change doc doesn't stay in the published, remove it
            self._removePublished(id); // but it can move into buffered now, check it


            maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
            var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;

            if (toBuffer) {
              self._addBuffered(id, newDoc);
            } else {
              // Throw away from both published set and buffer
              self._safeAppendToBuffer = false;
            }
          }
        } else if (bufferedBefore) {
          oldDoc = self._unpublishedBuffer.get(id); // remove the old version manually instead of using _removeBuffered so
          // we don't trigger the querying immediately.  if we end this block
          // with the buffer empty, we will need to trigger the query poll
          // manually too.

          self._unpublishedBuffer.remove(id);

          var maxPublished = self._published.get(self._published.maxElementId());

          maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()); // the buffered doc was updated, it could move to published

          var toPublish = comparator(newDoc, maxPublished) < 0; // or stays in buffer even after the change

          var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;

          if (toPublish) {
            self._addPublished(id, newDoc);
          } else if (staysInBuffer) {
            // stays in buffer but changes
            self._unpublishedBuffer.set(id, newDoc);
          } else {
            // Throw away from both published set and buffer
            self._safeAppendToBuffer = false; // Normally this check would have been done in _removeBuffered but
            // we didn't use it, so we need to do it ourself now.

            if (!self._unpublishedBuffer.size()) {
              self._needToPollQuery();
            }
          }
        } else {
          throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
        }
      }
    });
  },
  _fetchModifiedDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.FETCHING); // Defer, because nothing called from the oplog entry handler may yield,
      // but fetch() yields.


      Meteor.defer(finishIfNeedToPollQuery(function () {
        while (!self._stopped && !self._needToFetch.empty()) {
          if (self._phase === PHASE.QUERYING) {
            // While fetching, we decided to go into QUERYING mode, and then we
            // saw another oplog entry, so _needToFetch is not empty. But we
            // shouldn't fetch these documents until AFTER the query is done.
            break;
          } // Being in steady phase here would be surprising.


          if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
          self._currentlyFetching = self._needToFetch;
          var thisGeneration = ++self._fetchGeneration;
          self._needToFetch = new LocalCollection._IdMap();
          var waiting = 0;
          var fut = new Future(); // This loop is safe, because _currentlyFetching will not be updated
          // during this loop (in fact, it is never mutated).

          self._currentlyFetching.forEach(function (cacheKey, id) {
            waiting++;

            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, cacheKey, finishIfNeedToPollQuery(function (err, doc) {
              try {
                if (err) {
                  Meteor._debug("Got exception while fetching documents: " + err); // If we get an error from the fetcher (eg, trouble
                  // connecting to Mongo), let's just abandon the fetch phase
                  // altogether and fall back to polling. It's not like we're
                  // getting live updates anyway.


                  if (self._phase !== PHASE.QUERYING) {
                    self._needToPollQuery();
                  }
                } else if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                  // We re-check the generation in case we've had an explicit
                  // _pollQuery call (eg, in another fiber) which should
                  // effectively cancel this round of fetches.  (_pollQuery
                  // increments the generation.)
                  self._handleDoc(id, doc);
                }
              } finally {
                waiting--; // Because fetch() never calls its callback synchronously,
                // this is safe (ie, we won't call fut.return() before the
                // forEach is done).

                if (waiting === 0) fut.return();
              }
            }));
          });

          fut.wait(); // Exit now if we've had a _pollQuery call (here or in another fiber).

          if (self._phase === PHASE.QUERYING) return;
          self._currentlyFetching = null;
        } // We're done fetching, so we can be steady, unless we've had a
        // _pollQuery call (here or in another fiber).


        if (self._phase !== PHASE.QUERYING) self._beSteady();
      }));
    });
  },
  _beSteady: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.STEADY);

      var writes = self._writesToCommitWhenWeReachSteady;
      self._writesToCommitWhenWeReachSteady = [];

      self._multiplexer.onFlush(function () {
        _.each(writes, function (w) {
          w.committed();
        });
      });
    });
  },
  _handleOplogEntryQuerying: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._needToFetch.set(idForOp(op), op.ts.toString());
    });
  },
  _handleOplogEntrySteadyOrFetching: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = idForOp(op); // If we're already fetching this one, or about to, we can't optimize;
      // make sure that we fetch it again if necessary.

      if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
        self._needToFetch.set(id, op.ts.toString());

        return;
      }

      if (op.op === 'd') {
        if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
      } else if (op.op === 'i') {
        if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
        if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer"); // XXX what if selector yields?  for now it can't but later it could
        // have $where

        if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
      } else if (op.op === 'u') {
        // Is this a modifier ($set/$unset, which may require us to poll the
        // database to figure out if the whole document matches the selector) or
        // a replacement (in which case we can just directly re-evaluate the
        // selector)?
        var isReplace = !_.has(op.o, '$set') && !_.has(op.o, '$unset'); // If this modifier modifies something inside an EJSON custom type (ie,
        // anything with EJSON$), then we can't try to use
        // LocalCollection._modify, since that just mutates the EJSON encoding,
        // not the actual object.

        var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);

        var publishedBefore = self._published.has(id);

        var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

        if (isReplace) {
          self._handleDoc(id, _.extend({
            _id: id
          }, op.o));
        } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
          // Oh great, we actually know what the document is, so we can apply
          // this directly.
          var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
          newDoc = EJSON.clone(newDoc);
          newDoc._id = id;

          try {
            LocalCollection._modify(newDoc, op.o);
          } catch (e) {
            if (e.name !== "MinimongoError") throw e; // We didn't understand the modifier.  Re-fetch.

            self._needToFetch.set(id, op.ts.toString());

            if (self._phase === PHASE.STEADY) {
              self._fetchModifiedDocuments();
            }

            return;
          }

          self._handleDoc(id, self._sharedProjectionFn(newDoc));
        } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
          self._needToFetch.set(id, op.ts.toString());

          if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
        }
      } else {
        throw Error("XXX SURPRISING OPERATION: " + op);
      }
    });
  },
  // Yields!
  _runInitialQuery: function () {
    var self = this;
    if (self._stopped) throw new Error("oplog stopped surprisingly early");

    self._runQuery({
      initial: true
    }); // yields


    if (self._stopped) return; // can happen on queryError
    // Allow observeChanges calls to return. (After this, it's possible for
    // stop() to be called.)

    self._multiplexer.ready();

    self._doneQuerying(); // yields

  },
  // In various circumstances, we may just want to stop processing the oplog and
  // re-run the initial query, just as if we were a PollingObserveDriver.
  //
  // This function may not block, because it is called from an oplog entry
  // handler.
  //
  // XXX We should call this when we detect that we've been in FETCHING for "too
  // long".
  //
  // XXX We should call this when we detect Mongo failover (since that might
  // mean that some of the oplog entries we have processed have been rolled
  // back). The Node Mongo driver is in the middle of a bunch of huge
  // refactorings, including the way that it notifies you when primary
  // changes. Will put off implementing this until driver 1.4 is out.
  _pollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // Yay, we get to forget about all the things we thought we had to fetch.

      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      ++self._fetchGeneration; // ignore any in-flight fetches

      self._registerPhaseChange(PHASE.QUERYING); // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
      // here because SwitchedToQuery is not thrown in QUERYING mode.


      Meteor.defer(function () {
        self._runQuery();

        self._doneQuerying();
      });
    });
  },
  // Yields!
  _runQuery: function (options) {
    var self = this;
    options = options || {};
    var newResults, newBuffer; // This while loop is just to retry failures.

    while (true) {
      // If we've been stopped, we don't have to run anything any more.
      if (self._stopped) return;
      newResults = new LocalCollection._IdMap();
      newBuffer = new LocalCollection._IdMap(); // Query 2x documents as the half excluded from the original query will go
      // into unpublished buffer to reduce additional Mongo lookups in cases
      // when documents are removed from the published set and need a
      // replacement.
      // XXX needs more thought on non-zero skip
      // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
      // buffer if such is needed.

      var cursor = self._cursorForQuery({
        limit: self._limit * 2
      });

      try {
        cursor.forEach(function (doc, i) {
          // yields
          if (!self._limit || i < self._limit) {
            newResults.set(doc._id, doc);
          } else {
            newBuffer.set(doc._id, doc);
          }
        });
        break;
      } catch (e) {
        if (options.initial && typeof e.code === 'number') {
          // This is an error document sent to us by mongod, not a connection
          // error generated by the client. And we've never seen this query work
          // successfully. Probably it's a bad selector or something, so we
          // should NOT retry. Instead, we should halt the observe (which ends
          // up calling `stop` on us).
          self._multiplexer.queryError(e);

          return;
        } // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.


        Meteor._debug("Got exception while polling query: " + e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    self._publishNewResults(newResults, newBuffer);
  },
  // Transitions to QUERYING and runs another query, or (if already in QUERYING)
  // ensures that we will query again later.
  //
  // This function may not block, because it is called from an oplog entry
  // handler. However, if we were not already in the QUERYING phase, it throws
  // an exception that is caught by the closest surrounding
  // finishIfNeedToPollQuery call; this ensures that we don't continue running
  // close that was designed for another phase inside PHASE.QUERYING.
  //
  // (It's also necessary whenever logic in this file yields to check that other
  // phases haven't put us into QUERYING mode, though; eg,
  // _fetchModifiedDocuments does this.)
  _needToPollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // If we're not already in the middle of a query, we can query now
      // (possibly pausing FETCHING).

      if (self._phase !== PHASE.QUERYING) {
        self._pollQuery();

        throw new SwitchedToQuery();
      } // We're currently in QUERYING. Set a flag to ensure that we run another
      // query when we're done.


      self._requeryWhenDoneThisQuery = true;
    });
  },
  // Yields!
  _doneQuerying: function () {
    var self = this;
    if (self._stopped) return;

    self._mongoHandle._oplogHandle.waitUntilCaughtUp(); // yields


    if (self._stopped) return;
    if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);

    Meteor._noYieldsAllowed(function () {
      if (self._requeryWhenDoneThisQuery) {
        self._requeryWhenDoneThisQuery = false;

        self._pollQuery();
      } else if (self._needToFetch.empty()) {
        self._beSteady();
      } else {
        self._fetchModifiedDocuments();
      }
    });
  },
  _cursorForQuery: function (optionsOverwrite) {
    var self = this;
    return Meteor._noYieldsAllowed(function () {
      // The query we run is almost the same as the cursor we are observing,
      // with a few changes. We need to read all the fields that are relevant to
      // the selector, not just the fields we are going to publish (that's the
      // "shared" projection). And we don't want to apply any transform in the
      // cursor, because observeChanges shouldn't use the transform.
      var options = _.clone(self._cursorDescription.options); // Allow the caller to modify the options. Useful to specify different
      // skip and limit values.


      _.extend(options, optionsOverwrite);

      options.fields = self._sharedProjection;
      delete options.transform; // We are NOT deep cloning fields or selector here, which should be OK.

      var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
      return new Cursor(self._mongoHandle, description);
    });
  },
  // Replace self._published with newResults (both are IdMaps), invoking observe
  // callbacks on the multiplexer.
  // Replace self._unpublishedBuffer with newBuffer.
  //
  // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
  // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
  // (b) Rewrite diff.js to use these classes instead of arrays and objects.
  _publishNewResults: function (newResults, newBuffer) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      // If the query is limited and there is a buffer, shut down so it doesn't
      // stay in a way.
      if (self._limit) {
        self._unpublishedBuffer.clear();
      } // First remove anything that's gone. Be careful not to modify
      // self._published while iterating over it.


      var idsToRemove = [];

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) idsToRemove.push(id);
      });

      _.each(idsToRemove, function (id) {
        self._removePublished(id);
      }); // Now do adds and changes.
      // If self has a buffer and limit, the new fetched result will be
      // limited correctly as the query has sort specifier.


      newResults.forEach(function (doc, id) {
        self._handleDoc(id, doc);
      }); // Sanity-check that everything we tried to put into _published ended up
      // there.
      // XXX if this is slow, remove it later

      if (self._published.size() !== newResults.size()) {
        throw Error("The Mongo server and the Meteor query disagree on how " + "many documents match your query. Maybe it is hitting a Mongo " + "edge case? The query is: " + EJSON.stringify(self._cursorDescription.selector));
      }

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
      }); // Finally, replace the buffer


      newBuffer.forEach(function (doc, id) {
        self._addBuffered(id, doc);
      });
      self._safeAppendToBuffer = newBuffer.size() < self._limit;
    });
  },
  // This stop function is invoked from the onStop of the ObserveMultiplexer, so
  // it shouldn't actually be possible to call it until the multiplexer is
  // ready.
  //
  // It's important to check self._stopped after every call in this file that
  // can yield!
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;

    _.each(self._stopHandles, function (handle) {
      handle.stop();
    }); // Note: we *don't* use multiplexer.onFlush here because this stop
    // callback is actually invoked by the multiplexer itself when it has
    // determined that there are no handles left. So nothing is actually going
    // to get flushed (and it's probably not valid to call methods on the
    // dying multiplexer).


    _.each(self._writesToCommitWhenWeReachSteady, function (w) {
      w.committed(); // maybe yields?
    });

    self._writesToCommitWhenWeReachSteady = null; // Proactively drop references to potentially big things.

    self._published = null;
    self._unpublishedBuffer = null;
    self._needToFetch = null;
    self._currentlyFetching = null;
    self._oplogEntryHandle = null;
    self._listenersHandle = null;
    Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
  },
  _registerPhaseChange: function (phase) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var now = new Date();

      if (self._phase) {
        var timeDiff = now - self._phaseStartTime;
        Package.facts && Package.facts.Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
      }

      self._phase = phase;
      self._phaseStartTime = now;
    });
  }
}); // Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)


OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
  // First, check the options.
  var options = cursorDescription.options; // Did the user say no explicitly?
  // underscored version of the option is COMPAT with 1.2

  if (options.disableOplog || options._disableOplog) return false; // skip is not supported: to support it we would need to keep track of all
  // "skipped" documents or at least their ids.
  // limit w/o a sort specifier is not supported: current implementation needs a
  // deterministic way to order documents.

  if (options.skip || options.limit && !options.sort) return false; // If a fields projection option is given check if it is supported by
  // minimongo (some operators are not supported).

  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
    } catch (e) {
      if (e.name === "MinimongoError") {
        return false;
      } else {
        throw e;
      }
    }
  } // We don't allow the following selectors:
  //   - $where (not confident that we provide the same JS environment
  //             as Mongo, and can yield!)
  //   - $near (has "interesting" properties in MongoDB, like the possibility
  //            of returning an ID multiple times, though even polling maybe
  //            have a bug there)
  //           XXX: once we support it, we would need to think more on how we
  //           initialize the comparators when we create the driver.


  return !matcher.hasWhere() && !matcher.hasGeoQuery();
};

var modifierCanBeDirectlyApplied = function (modifier) {
  return _.all(modifier, function (fields, operation) {
    return _.all(fields, function (value, field) {
      return !/EJSON\$/.test(field);
    });
  });
};

MongoInternals.OplogObserveDriver = OplogObserveDriver;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
LocalCollectionDriver = function () {
  var self = this;
  self.noConnCollections = {};
};

var ensureCollection = function (name, collections) {
  if (!(name in collections)) collections[name] = new LocalCollection(name);
  return collections[name];
};

_.extend(LocalCollectionDriver.prototype, {
  open: function (name, conn) {
    var self = this;
    if (!name) return new LocalCollection();

    if (!conn) {
      return ensureCollection(name, self.noConnCollections);
    }

    if (!conn._mongo_livedata_collections) conn._mongo_livedata_collections = {}; // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?

    return ensureCollection(name, conn._mongo_livedata_collections);
  }
}); // singleton


LocalCollectionDriver = new LocalCollectionDriver();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
MongoInternals.RemoteCollectionDriver = function (mongo_url, options) {
  var self = this;
  self.mongo = new MongoConnection(mongo_url, options);
};

_.extend(MongoInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};

    _.each(['find', 'findOne', 'insert', 'update', 'upsert', 'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection', 'dropCollection', 'rawCollection'], function (m) {
      ret[m] = _.bind(self.mongo[m], self.mongo, name);
    });

    return ret;
  }
}); // Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)


MongoInternals.defaultRemoteCollectionDriver = _.once(function () {
  var connectionOptions = {};
  var mongoUrl = process.env.MONGO_URL;

  if (process.env.MONGO_OPLOG_URL) {
    connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
  }

  if (!mongoUrl) throw new Error("MONGO_URL must be set in environment");
  return new MongoInternals.RemoteCollectionDriver(mongoUrl, connectionOptions);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// options.connection, if given, is a LivedataClient or LivedataServer
// XXX presently there is no way to destroy/clean up a Collection
/**
 * @summary Namespace for MongoDB-related items
 * @namespace
 */Mongo = {}; /**
                * @summary Constructor for a Collection
                * @locus Anywhere
                * @instancename collection
                * @class
                * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
                * @param {Object} [options]
                * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
                * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
               
                - **`'STRING'`**: random strings
                - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
               
               The default id generation technique is `'STRING'`.
                * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
                * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
                */

Mongo.Collection = function (name, options) {
  var self = this;
  if (!(self instanceof Mongo.Collection)) throw new Error('use "new" to construct a Mongo.Collection');

  if (!name && name !== null) {
    Meteor._debug("Warning: creating anonymous collection. It will not be " + "saved or synchronized over the network. (Pass null for " + "the collection name to turn off this warning.)");

    name = null;
  }

  if (name !== null && typeof name !== "string") {
    throw new Error("First argument to new Mongo.Collection must be a string or null");
  }

  if (options && options.methods) {
    // Backwards compatibility hack with original signature (which passed
    // "connection" directly instead of in options. (Connections must have a "methods"
    // method.)
    // XXX remove before 1.0
    options = {
      connection: options
    };
  } // Backwards compatibility: "connection" used to be called "manager".


  if (options && options.manager && !options.connection) {
    options.connection = options.manager;
  }

  options = _.extend({
    connection: undefined,
    idGeneration: 'STRING',
    transform: null,
    _driver: undefined,
    _preventAutopublish: false
  }, options);

  switch (options.idGeneration) {
    case 'MONGO':
      self._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return new Mongo.ObjectID(src.hexString(24));
      };

      break;

    case 'STRING':
    default:
      self._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return src.id();
      };

      break;
  }

  self._transform = LocalCollection.wrapTransform(options.transform);
  if (!name || options.connection === null) // note: nameless collections never have a connection
    self._connection = null;else if (options.connection) self._connection = options.connection;else if (Meteor.isClient) self._connection = Meteor.connection;else self._connection = Meteor.server;

  if (!options._driver) {
    // XXX This check assumes that webapp is loaded so that Meteor.server !==
    // null. We should fully support the case of "want to use a Mongo-backed
    // collection from Node code without webapp", but we don't yet.
    // #MeteorServerNull
    if (name && self._connection === Meteor.server && typeof MongoInternals !== "undefined" && MongoInternals.defaultRemoteCollectionDriver) {
      options._driver = MongoInternals.defaultRemoteCollectionDriver();
    } else {
      options._driver = LocalCollectionDriver;
    }
  }

  self._collection = options._driver.open(name, self._connection);
  self._name = name;
  self._driver = options._driver;

  if (self._connection && self._connection.registerStore) {
    // OK, we're going to be a slave, replicating some remote
    // database, except possibly with some temporary divergence while
    // we have unacknowledged RPC's.
    var ok = self._connection.registerStore(name, {
      // Called at the beginning of a batch of updates. batchSize is the number
      // of update calls to expect.
      //
      // XXX This interface is pretty janky. reset probably ought to go back to
      // being its own function, and callers shouldn't have to calculate
      // batchSize. The optimization of not calling pause/remove should be
      // delayed until later: the first call to update() should buffer its
      // message, and then we can either directly apply it at endUpdate time if
      // it was the only update, or do pauseObservers/apply/apply at the next
      // update() if there's another one.
      beginUpdate: function (batchSize, reset) {
        // pause observers so users don't see flicker when updating several
        // objects at once (including the post-reconnect reset-and-reapply
        // stage), and so that a re-sorting of a query can take advantage of the
        // full _diffQuery moved calculation instead of applying change one at a
        // time.
        if (batchSize > 1 || reset) self._collection.pauseObservers();
        if (reset) self._collection.remove({});
      },
      // Apply an update.
      // XXX better specify this interface (not in terms of a wire message)?
      update: function (msg) {
        var mongoId = MongoID.idParse(msg.id);

        var doc = self._collection.findOne(mongoId); // Is this a "replace the whole doc" message coming from the quiescence
        // of method writes to an object? (Note that 'undefined' is a valid
        // value meaning "remove it".)


        if (msg.msg === 'replace') {
          var replace = msg.replace;

          if (!replace) {
            if (doc) self._collection.remove(mongoId);
          } else if (!doc) {
            self._collection.insert(replace);
          } else {
            // XXX check that replace has no $ ops
            self._collection.update(mongoId, replace);
          }

          return;
        } else if (msg.msg === 'added') {
          if (doc) {
            throw new Error("Expected not to find a document already present for an add");
          }

          self._collection.insert(_.extend({
            _id: mongoId
          }, msg.fields));
        } else if (msg.msg === 'removed') {
          if (!doc) throw new Error("Expected to find a document already present for removed");

          self._collection.remove(mongoId);
        } else if (msg.msg === 'changed') {
          if (!doc) throw new Error("Expected to find a document to change");

          if (!_.isEmpty(msg.fields)) {
            var modifier = {};

            _.each(msg.fields, function (value, key) {
              if (value === undefined) {
                if (!modifier.$unset) modifier.$unset = {};
                modifier.$unset[key] = 1;
              } else {
                if (!modifier.$set) modifier.$set = {};
                modifier.$set[key] = value;
              }
            });

            self._collection.update(mongoId, modifier);
          }
        } else {
          throw new Error("I don't know how to deal with this message");
        }
      },
      // Called at the end of a batch of updates.
      endUpdate: function () {
        self._collection.resumeObservers();
      },
      // Called around method stub invocations to capture the original versions
      // of modified documents.
      saveOriginals: function () {
        self._collection.saveOriginals();
      },
      retrieveOriginals: function () {
        return self._collection.retrieveOriginals();
      },
      // Used to preserve current versions of documents across a store reset.
      getDoc: function (id) {
        return self.findOne(id);
      },
      // To be able to get back to the collection from the store.
      _getCollection: function () {
        return self;
      }
    });

    if (!ok) {
      const message = `There is already a collection named "${name}"`;

      if (options._suppressSameNameError === true) {
        // XXX In theory we do not have to throw when `ok` is falsy. The store is already defined
        // for this collection name, but this will simply be another reference to it and everything
        // should work. However, we have historically thrown an error here, so for now we will
        // skip the error only when `_suppressSameNameError` is `true`, allowing people to opt in
        // and give this some real world testing.
        console.warn ? console.warn(message) : console.log(message);
      } else {
        throw new Error(message);
      }
    }
  } // XXX don't define these until allow or deny is actually used for this
  // collection. Could be hard if the security rules are only defined on the
  // server.


  if (options.defineMutationMethods !== false) {
    try {
      self._defineMutationMethods({
        useExisting: options._suppressSameNameError === true
      });
    } catch (error) {
      // Throw a more understandable error on the server for same collection name
      if (error.message === `A method named '/${name}/insert' is already defined`) throw new Error(`There is already a collection named "${name}"`);
      throw error;
    }
  } // autopublish


  if (Package.autopublish && !options._preventAutopublish && self._connection && self._connection.publish) {
    self._connection.publish(null, function () {
      return self.find();
    }, {
      is_auto: true
    });
  }
}; ///
/// Main collection API
///


_.extend(Mongo.Collection.prototype, {
  _getFindSelector: function (args) {
    if (args.length == 0) return {};else return args[0];
  },
  _getFindOptions: function (args) {
    var self = this;

    if (args.length < 2) {
      return {
        transform: self._transform
      };
    } else {
      check(args[1], Match.Optional(Match.ObjectIncluding({
        fields: Match.Optional(Match.OneOf(Object, undefined)),
        sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
        limit: Match.Optional(Match.OneOf(Number, undefined)),
        skip: Match.Optional(Match.OneOf(Number, undefined))
      })));
      return _.extend({
        transform: self._transform
      }, args[1]);
    }
  },
  /**
   * @summary Find the documents in a collection that match the selector.
   * @locus Anywhere
   * @method find
   * @memberOf Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {Number} options.limit Maximum number of results to return
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
   * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
   * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
   * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
   * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
   * @returns {Mongo.Cursor}
   */find: function () /* selector, options */{
    // Collection.find() (return all docs) behaves differently
    // from Collection.find(undefined) (return 0 docs).  so be
    // careful about the length of arguments.
    var self = this;

    var argArray = _.toArray(arguments);

    return self._collection.find(self._getFindSelector(argArray), self._getFindOptions(argArray));
  },
  /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOne
   * @memberOf Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Object}
   */findOne: function () /* selector, options */{
    var self = this;

    var argArray = _.toArray(arguments);

    return self._collection.findOne(self._getFindSelector(argArray), self._getFindOptions(argArray));
  }
});

Mongo.Collection._publishCursor = function (cursor, sub, collection) {
  var observeHandle = cursor.observeChanges({
    added: function (id, fields) {
      sub.added(collection, id, fields);
    },
    changed: function (id, fields) {
      sub.changed(collection, id, fields);
    },
    removed: function (id) {
      sub.removed(collection, id);
    }
  }); // We don't call sub.ready() here: it gets called in livedata_server, after
  // possibly calling _publishCursor on multiple returned cursors.
  // register stop callback (expects lambda w/ no args).

  sub.onStop(function () {
    observeHandle.stop();
  }); // return the observeHandle in case it needs to be stopped early

  return observeHandle;
}; // protect against dangerous selectors.  falsey and {_id: falsey} are both
// likely programmer error, and not what you want, particularly for destructive
// operations. If a falsey _id is sent in, a new string _id will be
// generated and returned; if a fallbackId is provided, it will be returned
// instead.


Mongo.Collection._rewriteSelector = (selector, {
  fallbackId
} = {}) => {
  // shorthand -- scalars match _id
  if (LocalCollection._selectorIsId(selector)) selector = {
    _id: selector
  };

  if (_.isArray(selector)) {
    // This is consistent with the Mongo console itself; if we don't do this
    // check passing an empty array ends up selecting all items
    throw new Error("Mongo selector can't be an array.");
  }

  if (!selector || '_id' in selector && !selector._id) {
    // can't match anything
    return {
      _id: fallbackId || Random.id()
    };
  }

  return selector;
}; // 'insert' immediately returns the inserted document's new _id.
// The others return values immediately if you are in a stub, an in-memory
// unmanaged collection, or a mongo-backed collection and you don't pass a
// callback. 'update' and 'remove' return the number of affected
// documents. 'upsert' returns an object with keys 'numberAffected' and, if an
// insert happened, 'insertedId'.
//
// Otherwise, the semantics are exactly like other methods: they take
// a callback as an optional last argument; if no callback is
// provided, they block until the operation is complete, and throw an
// exception if it fails; if a callback is provided, then they don't
// necessarily block, and they call the callback when they finish with error and
// result arguments.  (The insert method provides the document ID as its result;
// update and remove provide the number of affected docs as the result; upsert
// provides an object with numberAffected and maybe insertedId.)
//
// On the client, blocking is impossible, so if a callback
// isn't provided, they just return immediately and any error
// information is lost.
//
// There's one more tweak. On the client, if you don't provide a
// callback, then if there is an error, a message will be logged with
// Meteor._debug.
//
// The intent (though this is actually determined by the underlying
// drivers) is that the operations should be done synchronously, not
// generating their result until the database has acknowledged
// them. In the future maybe we should provide a flag to turn this
// off.
/**
 * @summary Insert a document in the collection.  Returns its unique _id.
 * @locus Anywhere
 * @method  insert
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
 * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
 */

Mongo.Collection.prototype.insert = function insert(doc, callback) {
  // Make sure we were passed a document to insert
  if (!doc) {
    throw new Error("insert requires an argument");
  } // Shallow-copy the document and possibly generate an ID


  doc = _.extend({}, doc);

  if ('_id' in doc) {
    if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
      throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
    }
  } else {
    let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
    // This optimization saves us passing both the randomSeed and the id
    // Passing both is redundant.

    if (this._isRemoteCollection()) {
      const enclosing = DDP._CurrentMethodInvocation.get();

      if (!enclosing) {
        generateId = false;
      }
    }

    if (generateId) {
      doc._id = this._makeNewID();
    }
  } // On inserts, always return the id that we generated; on all other
  // operations, just return the result from the collection.


  var chooseReturnValueFromCollectionResult = function (result) {
    if (doc._id) {
      return doc._id;
    } // XXX what is this for??
    // It's some iteraction between the callback to _callMutatorMethod and
    // the return value conversion


    doc._id = result;
    return result;
  };

  const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

  if (this._isRemoteCollection()) {
    const result = this._callMutatorMethod("insert", [doc], wrappedCallback);

    return chooseReturnValueFromCollectionResult(result);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    const result = this._collection.insert(doc, wrappedCallback);

    return chooseReturnValueFromCollectionResult(result);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; /**
    * @summary Modify one or more documents in the collection. Returns the number of matched documents.
    * @locus Anywhere
    * @method update
    * @memberOf Mongo.Collection
    * @instance
    * @param {MongoSelector} selector Specifies which documents to modify
    * @param {MongoModifier} modifier Specifies how to modify the documents
    * @param {Object} [options]
    * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
    * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
    * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
    */

Mongo.Collection.prototype.update = function update(selector, modifier, ...optionsAndCallback) {
  const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
  // of one or zero items

  const options = _.clone(optionsAndCallback[0]) || {};
  let insertedId;

  if (options && options.upsert) {
    // set `insertedId` if absent.  `insertedId` is a Meteor extension.
    if (options.insertedId) {
      if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
      insertedId = options.insertedId;
    } else if (!selector || !selector._id) {
      insertedId = this._makeNewID();
      options.generatedId = true;
      options.insertedId = insertedId;
    }
  }

  selector = Mongo.Collection._rewriteSelector(selector, {
    fallbackId: insertedId
  });
  const wrappedCallback = wrapCallback(callback);

  if (this._isRemoteCollection()) {
    const args = [selector, modifier, options];
    return this._callMutatorMethod("update", args, wrappedCallback);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    return this._collection.update(selector, modifier, options, wrappedCallback);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; /**
    * @summary Remove documents from the collection
    * @locus Anywhere
    * @method remove
    * @memberOf Mongo.Collection
    * @instance
    * @param {MongoSelector} selector Specifies which documents to remove
    * @param {Function} [callback] Optional.  If present, called with an error object as its argument.
    */

Mongo.Collection.prototype.remove = function remove(selector, callback) {
  selector = Mongo.Collection._rewriteSelector(selector);
  const wrappedCallback = wrapCallback(callback);

  if (this._isRemoteCollection()) {
    return this._callMutatorMethod("remove", [selector], wrappedCallback);
  } // it's my collection.  descend into the collection object
  // and propagate any exception.


  try {
    // If the user provided a callback and the collection implements this
    // operation asynchronously, then queryRet will be undefined, and the
    // result will be returned through the callback instead.
    return this._collection.remove(selector, wrappedCallback);
  } catch (e) {
    if (callback) {
      callback(e);
      return null;
    }

    throw e;
  }
}; // Determine if this collection is simply a minimongo representation of a real
// database on another server


Mongo.Collection.prototype._isRemoteCollection = function _isRemoteCollection() {
  // XXX see #MeteorServerNull
  return this._connection && this._connection !== Meteor.server;
}; // Convert the callback to not return a result if there is an error


function wrapCallback(callback, convertResult) {
  if (!callback) {
    return;
  } // If no convert function was passed in, just use a "blank function"


  convertResult = convertResult || _.identity;
  return (error, result) => {
    callback(error, !error && convertResult(result));
  };
} /**
   * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */

Mongo.Collection.prototype.upsert = function upsert(selector, modifier, options, callback) {
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }

  const updateOptions = _.extend({}, options, {
    _returnObject: true,
    upsert: true
  });

  return this.update(selector, modifier, updateOptions, callback);
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


Mongo.Collection.prototype._ensureIndex = function (index, options) {
  var self = this;
  if (!self._collection._ensureIndex) throw new Error("Can only call _ensureIndex on server collections");

  self._collection._ensureIndex(index, options);
};

Mongo.Collection.prototype._dropIndex = function (index) {
  var self = this;
  if (!self._collection._dropIndex) throw new Error("Can only call _dropIndex on server collections");

  self._collection._dropIndex(index);
};

Mongo.Collection.prototype._dropCollection = function () {
  var self = this;
  if (!self._collection.dropCollection) throw new Error("Can only call _dropCollection on server collections");

  self._collection.dropCollection();
};

Mongo.Collection.prototype._createCappedCollection = function (byteSize, maxDocuments) {
  var self = this;
  if (!self._collection._createCappedCollection) throw new Error("Can only call _createCappedCollection on server collections");

  self._collection._createCappedCollection(byteSize, maxDocuments);
}; /**
    * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
    * @locus Server
    */

Mongo.Collection.prototype.rawCollection = function () {
  var self = this;

  if (!self._collection.rawCollection) {
    throw new Error("Can only call rawCollection on server collections");
  }

  return self._collection.rawCollection();
}; /**
    * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
    * @locus Server
    */

Mongo.Collection.prototype.rawDatabase = function () {
  var self = this;

  if (!(self._driver.mongo && self._driver.mongo.db)) {
    throw new Error("Can only call rawDatabase on server collections");
  }

  return self._driver.mongo.db;
}; /**
    * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
    * @locus Anywhere
    * @class
    * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
    */

Mongo.ObjectID = MongoID.ObjectID; /**
                                    * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
                                    * @class
                                    * @instanceName cursor
                                    */
Mongo.Cursor = LocalCollection.Cursor; /**
                                        * @deprecated in 0.9.1
                                        */
Mongo.Collection.Cursor = Mongo.Cursor; /**
                                         * @deprecated in 0.9.1
                                         */
Mongo.Collection.ObjectID = Mongo.ObjectID; /**
                                             * @deprecated in 0.9.1
                                             */
Meteor.Collection = Mongo.Collection; // Allow deny stuff is now in the allow-deny package

_.extend(Meteor.Collection.prototype, AllowDeny.CollectionPrototype);

function popCallbackFromArgs(args) {
  // Pull off any callback (or perhaps a 'callback' variable that was passed
  // in undefined, like how 'upsert' does it).
  if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
    return args.pop();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connection_options.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/mongo/mongo_driver.js");
require("./node_modules/meteor/mongo/oplog_tailing.js");
require("./node_modules/meteor/mongo/observe_multiplex.js");
require("./node_modules/meteor/mongo/doc_fetcher.js");
require("./node_modules/meteor/mongo/polling_observe_driver.js");
require("./node_modules/meteor/mongo/oplog_observe_driver.js");
require("./node_modules/meteor/mongo/local_collection_driver.js");
require("./node_modules/meteor/mongo/remote_collection_driver.js");
require("./node_modules/meteor/mongo/collection.js");
require("./node_modules/meteor/mongo/connection_options.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.mongo = {}, {
  MongoInternals: MongoInternals,
  MongoTest: MongoTest,
  Mongo: Mongo
});

})();

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiTW9uZ29EQiIsIk5wbU1vZHVsZU1vbmdvZGIiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiTW9uZ29JbnRlcm5hbHMiLCJNb25nb1Rlc3QiLCJOcG1Nb2R1bGVzIiwibW9uZ29kYiIsInZlcnNpb24iLCJOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbiIsIm1vZHVsZSIsIk5wbU1vZHVsZSIsInJlcGxhY2VOYW1lcyIsImZpbHRlciIsInRoaW5nIiwiXyIsImlzQXJyYXkiLCJtYXAiLCJiaW5kIiwicmV0IiwiZWFjaCIsInZhbHVlIiwia2V5IiwiVGltZXN0YW1wIiwicHJvdG90eXBlIiwiY2xvbmUiLCJtYWtlTW9uZ29MZWdhbCIsIm5hbWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwicmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IiLCJkb2N1bWVudCIsIkJpbmFyeSIsImJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJPYmplY3RJRCIsIk1vbmdvIiwidG9IZXhTdHJpbmciLCJzaXplIiwiRUpTT04iLCJmcm9tSlNPTlZhbHVlIiwidW5kZWZpbmVkIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJpc0JpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJfaXNDdXN0b21UeXBlIiwidG9KU09OVmFsdWUiLCJyZXBsYWNlVHlwZXMiLCJhdG9tVHJhbnNmb3JtZXIiLCJyZXBsYWNlZFRvcExldmVsQXRvbSIsInZhbCIsInZhbFJlcGxhY2VkIiwiTW9uZ29Db25uZWN0aW9uIiwidXJsIiwib3B0aW9ucyIsInNlbGYiLCJfb2JzZXJ2ZU11bHRpcGxleGVycyIsIl9vbkZhaWxvdmVySG9vayIsIkhvb2siLCJtb25nb09wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJhdXRvUmVjb25uZWN0IiwicmVjb25uZWN0VHJpZXMiLCJJbmZpbml0eSIsIl9jb25uZWN0aW9uT3B0aW9ucyIsInRlc3QiLCJuYXRpdmVfcGFyc2VyIiwiaGFzIiwicG9vbFNpemUiLCJkYiIsIl9wcmltYXJ5IiwiX29wbG9nSGFuZGxlIiwiX2RvY0ZldGNoZXIiLCJjb25uZWN0RnV0dXJlIiwiY29ubmVjdCIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImVyciIsInNlcnZlckNvbmZpZyIsImlzTWFzdGVyRG9jIiwicHJpbWFyeSIsIm9uIiwia2luZCIsImRvYyIsImNhbGxiYWNrIiwibWUiLCJyZXNvbHZlciIsIndhaXQiLCJvcGxvZ1VybCIsIlBhY2thZ2UiLCJPcGxvZ0hhbmRsZSIsImRhdGFiYXNlTmFtZSIsIkRvY0ZldGNoZXIiLCJjbG9zZSIsIkVycm9yIiwib3Bsb2dIYW5kbGUiLCJzdG9wIiwid3JhcCIsInJhd0NvbGxlY3Rpb24iLCJjb2xsZWN0aW9uTmFtZSIsImZ1dHVyZSIsImNvbGxlY3Rpb24iLCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJmZW5jZSIsIkREUFNlcnZlciIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfb25GYWlsb3ZlciIsInJlZ2lzdGVyIiwid3JpdGVDYWxsYmFjayIsIndyaXRlIiwicmVmcmVzaCIsInJlc3VsdCIsInJlZnJlc2hFcnIiLCJiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSIsIl9pbnNlcnQiLCJjb2xsZWN0aW9uX25hbWUiLCJzZW5kRXJyb3IiLCJlIiwiZXhwZWN0ZWQiLCJMb2NhbENvbGxlY3Rpb24iLCJfaXNQbGFpbk9iamVjdCIsImlkIiwiX2lkIiwiaW5zZXJ0Iiwic2FmZSIsIl9yZWZyZXNoIiwic2VsZWN0b3IiLCJyZWZyZXNoS2V5Iiwic3BlY2lmaWNJZHMiLCJfaWRzTWF0Y2hlZEJ5U2VsZWN0b3IiLCJleHRlbmQiLCJfcmVtb3ZlIiwid3JhcHBlZENhbGxiYWNrIiwiZHJpdmVyUmVzdWx0IiwidHJhbnNmb3JtUmVzdWx0IiwibnVtYmVyQWZmZWN0ZWQiLCJyZW1vdmUiLCJfZHJvcENvbGxlY3Rpb24iLCJjYiIsImRyb3BDb2xsZWN0aW9uIiwiZHJvcCIsIl9kcm9wRGF0YWJhc2UiLCJkcm9wRGF0YWJhc2UiLCJfdXBkYXRlIiwibW9kIiwiRnVuY3Rpb24iLCJtb25nb09wdHMiLCJ1cHNlcnQiLCJtdWx0aSIsImZ1bGxSZXN1bHQiLCJtb25nb1NlbGVjdG9yIiwibW9uZ29Nb2QiLCJpc01vZGlmeSIsIl9pc01vZGlmaWNhdGlvbk1vZCIsIl9mb3JiaWRSZXBsYWNlIiwia25vd25JZCIsIm5ld0RvYyIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsImluc2VydGVkSWQiLCJnZW5lcmF0ZWRJZCIsInNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQiLCJlcnJvciIsIl9yZXR1cm5PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsIiRzZXRPbkluc2VydCIsInVwZGF0ZSIsIm1ldGVvclJlc3VsdCIsIm1vbmdvUmVzdWx0IiwidXBzZXJ0ZWQiLCJsZW5ndGgiLCJuIiwiTlVNX09QVElNSVNUSUNfVFJJRVMiLCJfaXNDYW5ub3RDaGFuZ2VJZEVycm9yIiwiZXJybXNnIiwiaW5kZXhPZiIsIm1vbmdvT3B0c0ZvclVwZGF0ZSIsIm1vbmdvT3B0c0Zvckluc2VydCIsInJlcGxhY2VtZW50V2l0aElkIiwidHJpZXMiLCJkb1VwZGF0ZSIsImRvQ29uZGl0aW9uYWxJbnNlcnQiLCJtZXRob2QiLCJ3cmFwQXN5bmMiLCJhcHBseSIsImFyZ3VtZW50cyIsImZpbmQiLCJDdXJzb3IiLCJDdXJzb3JEZXNjcmlwdGlvbiIsImZpbmRPbmUiLCJsaW1pdCIsImZldGNoIiwiX2Vuc3VyZUluZGV4IiwiaW5kZXgiLCJpbmRleE5hbWUiLCJlbnN1cmVJbmRleCIsIl9kcm9wSW5kZXgiLCJkcm9wSW5kZXgiLCJDb2xsZWN0aW9uIiwiX3Jld3JpdGVTZWxlY3RvciIsIm1vbmdvIiwiY3Vyc29yRGVzY3JpcHRpb24iLCJfbW9uZ28iLCJfY3Vyc29yRGVzY3JpcHRpb24iLCJfc3luY2hyb25vdXNDdXJzb3IiLCJ0YWlsYWJsZSIsIl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvciIsInNlbGZGb3JJdGVyYXRpb24iLCJ1c2VUcmFuc2Zvcm0iLCJyZXdpbmQiLCJnZXRUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm0iLCJfcHVibGlzaEN1cnNvciIsInN1YiIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsIm9ic2VydmUiLCJjYWxsYmFja3MiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwibWV0aG9kcyIsIm9yZGVyZWQiLCJfb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkIiwiZXhjZXB0aW9uTmFtZSIsImZvckVhY2giLCJfb2JzZXJ2ZUNoYW5nZXMiLCJwaWNrIiwiY3Vyc29yT3B0aW9ucyIsInNvcnQiLCJza2lwIiwiYXdhaXRkYXRhIiwibnVtYmVyT2ZSZXRyaWVzIiwiT1BMT0dfQ09MTEVDVElPTiIsInRzIiwib3Bsb2dSZXBsYXkiLCJkYkN1cnNvciIsImZpZWxkcyIsIm1heFRpbWVNcyIsIm1heFRpbWVNUyIsImhpbnQiLCJTeW5jaHJvbm91c0N1cnNvciIsIl9kYkN1cnNvciIsIl9zZWxmRm9ySXRlcmF0aW9uIiwiX3RyYW5zZm9ybSIsIndyYXBUcmFuc2Zvcm0iLCJfc3luY2hyb25vdXNOZXh0T2JqZWN0IiwibmV4dE9iamVjdCIsIl9zeW5jaHJvbm91c0NvdW50IiwiY291bnQiLCJfdmlzaXRlZElkcyIsIl9JZE1hcCIsIl9uZXh0T2JqZWN0Iiwic2V0IiwidGhpc0FyZyIsIl9yZXdpbmQiLCJjYWxsIiwicmVzIiwicHVzaCIsImlkZW50aXR5IiwiYXBwbHlTa2lwTGltaXQiLCJnZXRSYXdPYmplY3RzIiwicmVzdWx0cyIsInRhaWwiLCJkb2NDYWxsYmFjayIsImN1cnNvciIsInN0b3BwZWQiLCJsYXN0VFMiLCJsb29wIiwibmV3U2VsZWN0b3IiLCIkZ3QiLCJzZXRUaW1lb3V0IiwiZGVmZXIiLCJfb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSIsIm9ic2VydmVLZXkiLCJzdHJpbmdpZnkiLCJtdWx0aXBsZXhlciIsIm9ic2VydmVEcml2ZXIiLCJmaXJzdEhhbmRsZSIsIl9ub1lpZWxkc0FsbG93ZWQiLCJPYnNlcnZlTXVsdGlwbGV4ZXIiLCJvblN0b3AiLCJvYnNlcnZlSGFuZGxlIiwiT2JzZXJ2ZUhhbmRsZSIsIm1hdGNoZXIiLCJzb3J0ZXIiLCJjYW5Vc2VPcGxvZyIsImFsbCIsIl90ZXN0T25seVBvbGxDYWxsYmFjayIsIk1pbmltb25nbyIsIk1hdGNoZXIiLCJPcGxvZ09ic2VydmVEcml2ZXIiLCJjdXJzb3JTdXBwb3J0ZWQiLCJTb3J0ZXIiLCJmIiwiZHJpdmVyQ2xhc3MiLCJQb2xsaW5nT2JzZXJ2ZURyaXZlciIsIm1vbmdvSGFuZGxlIiwiX29ic2VydmVEcml2ZXIiLCJhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMiLCJsaXN0ZW5BbGwiLCJsaXN0ZW5DYWxsYmFjayIsImxpc3RlbmVycyIsImZvckVhY2hUcmlnZ2VyIiwidHJpZ2dlciIsIl9JbnZhbGlkYXRpb25Dcm9zc2JhciIsImxpc3RlbiIsImxpc3RlbmVyIiwidHJpZ2dlckNhbGxiYWNrIiwiYWRkZWRCZWZvcmUiLCJhZGRlZCIsIk1vbmdvVGltZXN0YW1wIiwiQ29ubmVjdGlvbiIsIlRPT19GQVJfQkVISU5EIiwicHJvY2VzcyIsImVudiIsIk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCIsInNob3dUUyIsImdldEhpZ2hCaXRzIiwiZ2V0TG93Qml0cyIsImlkRm9yT3AiLCJvcCIsIm8iLCJvMiIsImRiTmFtZSIsIl9vcGxvZ1VybCIsIl9kYk5hbWUiLCJfb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uIiwiX29wbG9nVGFpbENvbm5lY3Rpb24iLCJfc3RvcHBlZCIsIl90YWlsSGFuZGxlIiwiX3JlYWR5RnV0dXJlIiwiX2Nyb3NzYmFyIiwiX0Nyb3NzYmFyIiwiZmFjdFBhY2thZ2UiLCJmYWN0TmFtZSIsIl9iYXNlT3Bsb2dTZWxlY3RvciIsIm5zIiwiUmVnRXhwIiwiX2VzY2FwZVJlZ0V4cCIsIiRvciIsIiRpbiIsIiRleGlzdHMiLCJfY2F0Y2hpbmdVcEZ1dHVyZXMiLCJfbGFzdFByb2Nlc3NlZFRTIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfZW50cnlRdWV1ZSIsIl9Eb3VibGVFbmRlZFF1ZXVlIiwiX3dvcmtlckFjdGl2ZSIsIl9zdGFydFRhaWxpbmciLCJvbk9wbG9nRW50cnkiLCJvcmlnaW5hbENhbGxiYWNrIiwibm90aWZpY2F0aW9uIiwiX2RlYnVnIiwic3RhY2siLCJsaXN0ZW5IYW5kbGUiLCJvblNraXBwZWRFbnRyaWVzIiwid2FpdFVudGlsQ2F1Z2h0VXAiLCJsYXN0RW50cnkiLCIkbmF0dXJhbCIsIl9zbGVlcEZvck1zIiwibGVzc1RoYW5PckVxdWFsIiwiaW5zZXJ0QWZ0ZXIiLCJncmVhdGVyVGhhbiIsInNwbGljZSIsIm1vbmdvZGJVcmkiLCJwYXJzZSIsImRhdGFiYXNlIiwiYWRtaW4iLCJjb21tYW5kIiwiaXNtYXN0ZXIiLCJzZXROYW1lIiwibGFzdE9wbG9nRW50cnkiLCJvcGxvZ1NlbGVjdG9yIiwiX21heWJlU3RhcnRXb3JrZXIiLCJyZXR1cm4iLCJpc0VtcHR5IiwicG9wIiwiY2xlYXIiLCJfc2V0TGFzdFByb2Nlc3NlZFRTIiwic2hpZnQiLCJKU09OIiwiZmlyZSIsInNlcXVlbmNlciIsIl9kZWZpbmVUb29GYXJCZWhpbmQiLCJfcmVzZXRUb29GYXJCZWhpbmQiLCJmYWN0cyIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsIl9vcmRlcmVkIiwiX29uU3RvcCIsIl9xdWV1ZSIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX2hhbmRsZXMiLCJfY2FjaGUiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwiX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkIiwiY2FsbGJhY2tOYW1lcyIsImNhbGxiYWNrTmFtZSIsIl9hcHBseUNhbGxiYWNrIiwidG9BcnJheSIsImhhbmRsZSIsInNhZmVUb1J1blRhc2siLCJydW5UYXNrIiwiX3NlbmRBZGRzIiwicmVtb3ZlSGFuZGxlIiwiX3JlYWR5IiwiX3N0b3AiLCJmcm9tUXVlcnlFcnJvciIsInJlYWR5IiwicXVldWVUYXNrIiwicXVlcnlFcnJvciIsInRocm93Iiwib25GbHVzaCIsImlzUmVzb2x2ZWQiLCJhcmdzIiwiYXBwbHlDaGFuZ2UiLCJrZXlzIiwiaGFuZGxlSWQiLCJhZGQiLCJfYWRkZWRCZWZvcmUiLCJfYWRkZWQiLCJkb2NzIiwibmV4dE9ic2VydmVIYW5kbGVJZCIsIl9tdWx0aXBsZXhlciIsImJlZm9yZSIsIkZpYmVyIiwibW9uZ29Db25uZWN0aW9uIiwiX21vbmdvQ29ubmVjdGlvbiIsIl9jYWxsYmFja3NGb3JDYWNoZUtleSIsImNhY2hlS2V5IiwiY2hlY2siLCJTdHJpbmciLCJjbG9uZWREb2MiLCJydW4iLCJfbW9uZ29IYW5kbGUiLCJfc3RvcENhbGxiYWNrcyIsIl9yZXN1bHRzIiwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCIsIl9wZW5kaW5nV3JpdGVzIiwiX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCIsInRocm90dGxlIiwiX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkIiwicG9sbGluZ1Rocm90dGxlTXMiLCJfdGFza1F1ZXVlIiwibGlzdGVuZXJzSGFuZGxlIiwicG9sbGluZ0ludGVydmFsIiwicG9sbGluZ0ludGVydmFsTXMiLCJfcG9sbGluZ0ludGVydmFsIiwiaW50ZXJ2YWxIYW5kbGUiLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJfcG9sbE1vbmdvIiwiX3N1c3BlbmRQb2xsaW5nIiwiX3Jlc3VtZVBvbGxpbmciLCJmaXJzdCIsIm5ld1Jlc3VsdHMiLCJvbGRSZXN1bHRzIiwid3JpdGVzRm9yQ3ljbGUiLCJjb2RlIiwibWVzc2FnZSIsIkFycmF5IiwiX2RpZmZRdWVyeUNoYW5nZXMiLCJ3IiwiYyIsIlBIQVNFIiwiUVVFUllJTkciLCJGRVRDSElORyIsIlNURUFEWSIsIlN3aXRjaGVkVG9RdWVyeSIsImZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5IiwiY3VycmVudElkIiwiX3VzZXNPcGxvZyIsImNvbXBhcmF0b3IiLCJnZXRDb21wYXJhdG9yIiwiaGVhcE9wdGlvbnMiLCJJZE1hcCIsIl9saW1pdCIsIl9jb21wYXJhdG9yIiwiX3NvcnRlciIsIl91bnB1Ymxpc2hlZEJ1ZmZlciIsIk1pbk1heEhlYXAiLCJfcHVibGlzaGVkIiwiTWF4SGVhcCIsIl9zYWZlQXBwZW5kVG9CdWZmZXIiLCJfc3RvcEhhbmRsZXMiLCJfcmVnaXN0ZXJQaGFzZUNoYW5nZSIsIl9tYXRjaGVyIiwicHJvamVjdGlvbiIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbiIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uRm4iLCJfbmVlZFRvRmV0Y2giLCJfY3VycmVudGx5RmV0Y2hpbmciLCJfZmV0Y2hHZW5lcmF0aW9uIiwiX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSIsIl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5IiwiX25lZWRUb1BvbGxRdWVyeSIsIl9waGFzZSIsIl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmciLCJmaXJlZCIsIl9vcGxvZ09ic2VydmVEcml2ZXJzIiwib25CZWZvcmVGaXJlIiwiZHJpdmVycyIsImRyaXZlciIsIl9ydW5Jbml0aWFsUXVlcnkiLCJfYWRkUHVibGlzaGVkIiwib3ZlcmZsb3dpbmdEb2NJZCIsIm1heEVsZW1lbnRJZCIsIm92ZXJmbG93aW5nRG9jIiwiZXF1YWxzIiwicmVtb3ZlZCIsIl9hZGRCdWZmZXJlZCIsIl9yZW1vdmVQdWJsaXNoZWQiLCJlbXB0eSIsIm5ld0RvY0lkIiwibWluRWxlbWVudElkIiwiX3JlbW92ZUJ1ZmZlcmVkIiwiX2NoYW5nZVB1Ymxpc2hlZCIsIm9sZERvYyIsInByb2plY3RlZE5ldyIsInByb2plY3RlZE9sZCIsImNoYW5nZWQiLCJEaWZmU2VxdWVuY2UiLCJtYWtlQ2hhbmdlZEZpZWxkcyIsIm1heEJ1ZmZlcmVkSWQiLCJfYWRkTWF0Y2hpbmciLCJtYXhQdWJsaXNoZWQiLCJtYXhCdWZmZXJlZCIsInRvUHVibGlzaCIsImNhbkFwcGVuZFRvQnVmZmVyIiwiY2FuSW5zZXJ0SW50b0J1ZmZlciIsInRvQnVmZmVyIiwiX3JlbW92ZU1hdGNoaW5nIiwiX2hhbmRsZURvYyIsIm1hdGNoZXNOb3ciLCJkb2N1bWVudE1hdGNoZXMiLCJwdWJsaXNoZWRCZWZvcmUiLCJidWZmZXJlZEJlZm9yZSIsImNhY2hlZEJlZm9yZSIsIm1pbkJ1ZmZlcmVkIiwic3RheXNJblB1Ymxpc2hlZCIsInN0YXlzSW5CdWZmZXIiLCJfZmV0Y2hNb2RpZmllZERvY3VtZW50cyIsInRoaXNHZW5lcmF0aW9uIiwid2FpdGluZyIsImZ1dCIsIl9iZVN0ZWFkeSIsIndyaXRlcyIsInRvU3RyaW5nIiwiaXNSZXBsYWNlIiwiY2FuRGlyZWN0bHlNb2RpZnlEb2MiLCJtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkIiwiX21vZGlmeSIsImNhbkJlY29tZVRydWVCeU1vZGlmaWVyIiwiYWZmZWN0ZWRCeU1vZGlmaWVyIiwiX3J1blF1ZXJ5IiwiaW5pdGlhbCIsIl9kb25lUXVlcnlpbmciLCJfcG9sbFF1ZXJ5IiwibmV3QnVmZmVyIiwiX2N1cnNvckZvclF1ZXJ5IiwiaSIsIl9wdWJsaXNoTmV3UmVzdWx0cyIsIm9wdGlvbnNPdmVyd3JpdGUiLCJkZXNjcmlwdGlvbiIsImlkc1RvUmVtb3ZlIiwiX29wbG9nRW50cnlIYW5kbGUiLCJfbGlzdGVuZXJzSGFuZGxlIiwicGhhc2UiLCJub3ciLCJEYXRlIiwidGltZURpZmYiLCJfcGhhc2VTdGFydFRpbWUiLCJkaXNhYmxlT3Bsb2ciLCJfZGlzYWJsZU9wbG9nIiwiX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiIsImhhc1doZXJlIiwiaGFzR2VvUXVlcnkiLCJtb2RpZmllciIsIm9wZXJhdGlvbiIsImZpZWxkIiwiTG9jYWxDb2xsZWN0aW9uRHJpdmVyIiwibm9Db25uQ29sbGVjdGlvbnMiLCJlbnN1cmVDb2xsZWN0aW9uIiwiY29sbGVjdGlvbnMiLCJvcGVuIiwiY29ubiIsIl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyIsIlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJtb25nb191cmwiLCJtIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvbmNlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJtb25nb1VybCIsIk1PTkdPX1VSTCIsIk1PTkdPX09QTE9HX1VSTCIsImNvbm5lY3Rpb24iLCJtYW5hZ2VyIiwiaWRHZW5lcmF0aW9uIiwiX2RyaXZlciIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfbWFrZU5ld0lEIiwic3JjIiwiRERQIiwicmFuZG9tU3RyZWFtIiwiUmFuZG9tIiwiaW5zZWN1cmUiLCJoZXhTdHJpbmciLCJfY29ubmVjdGlvbiIsImlzQ2xpZW50Iiwic2VydmVyIiwiX2NvbGxlY3Rpb24iLCJfbmFtZSIsInJlZ2lzdGVyU3RvcmUiLCJvayIsImJlZ2luVXBkYXRlIiwiYmF0Y2hTaXplIiwicmVzZXQiLCJwYXVzZU9ic2VydmVycyIsIm1zZyIsIm1vbmdvSWQiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlcGxhY2UiLCIkdW5zZXQiLCIkc2V0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiZ2V0RG9jIiwiX2dldENvbGxlY3Rpb24iLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwiY29uc29sZSIsIndhcm4iLCJsb2ciLCJkZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwidXNlRXhpc3RpbmciLCJhdXRvcHVibGlzaCIsInB1Ymxpc2giLCJpc19hdXRvIiwiX2dldEZpbmRTZWxlY3RvciIsIl9nZXRGaW5kT3B0aW9ucyIsIk1hdGNoIiwiT3B0aW9uYWwiLCJPYmplY3RJbmNsdWRpbmciLCJPbmVPZiIsIk51bWJlciIsImFyZ0FycmF5IiwiZmFsbGJhY2tJZCIsIl9zZWxlY3RvcklzSWQiLCJnZW5lcmF0ZUlkIiwiX2lzUmVtb3RlQ29sbGVjdGlvbiIsImVuY2xvc2luZyIsIl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsImNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQiLCJ3cmFwQ2FsbGJhY2siLCJfY2FsbE11dGF0b3JNZXRob2QiLCJvcHRpb25zQW5kQ2FsbGJhY2siLCJwb3BDYWxsYmFja0Zyb21BcmdzIiwiY29udmVydFJlc3VsdCIsInVwZGF0ZU9wdGlvbnMiLCJyYXdEYXRhYmFzZSIsIkFsbG93RGVueSIsIkNvbGxl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TSxNQUFmO0FBQ0F6QixRQUFNOEIsa0JBQU4sR0FBMkJYLE9BQTNCO0FBQ0QsQ0FIRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9tb25nby5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUHJvdmlkZSBhIHN5bmNocm9ub3VzIENvbGxlY3Rpb24gQVBJIHVzaW5nIGZpYmVycywgYmFja2VkIGJ5XG4gKiBNb25nb0RCLiAgVGhpcyBpcyBvbmx5IGZvciB1c2Ugb24gdGhlIHNlcnZlciwgYW5kIG1vc3RseSBpZGVudGljYWxcbiAqIHRvIHRoZSBjbGllbnQgQVBJLlxuICpcbiAqIE5PVEU6IHRoZSBwdWJsaWMgQVBJIG1ldGhvZHMgbXVzdCBiZSBydW4gd2l0aGluIGEgZmliZXIuIElmIHlvdSBjYWxsXG4gKiB0aGVzZSBvdXRzaWRlIG9mIGEgZmliZXIgdGhleSB3aWxsIGV4cGxvZGUhXG4gKi9cblxudmFyIE1vbmdvREIgPSBOcG1Nb2R1bGVNb25nb2RiO1xudmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbk1vbmdvSW50ZXJuYWxzID0ge307XG5Nb25nb1Rlc3QgPSB7fTtcblxuTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlcyA9IHtcbiAgbW9uZ29kYjoge1xuICAgIHZlcnNpb246IE5wbU1vZHVsZU1vbmdvZGJWZXJzaW9uLFxuICAgIG1vZHVsZTogTW9uZ29EQlxuICB9XG59O1xuXG4vLyBPbGRlciB2ZXJzaW9uIG9mIHdoYXQgaXMgbm93IGF2YWlsYWJsZSB2aWFcbi8vIE1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMubW9uZ29kYi5tb2R1bGUuICBJdCB3YXMgbmV2ZXIgZG9jdW1lbnRlZCwgYnV0XG4vLyBwZW9wbGUgZG8gdXNlIGl0LlxuLy8gWFhYIENPTVBBVCBXSVRIIDEuMC4zLjJcbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZSA9IE1vbmdvREI7XG5cbi8vIFRoaXMgaXMgdXNlZCB0byBhZGQgb3IgcmVtb3ZlIEVKU09OIGZyb20gdGhlIGJlZ2lubmluZyBvZiBldmVyeXRoaW5nIG5lc3RlZFxuLy8gaW5zaWRlIGFuIEVKU09OIGN1c3RvbSB0eXBlLiBJdCBzaG91bGQgb25seSBiZSBjYWxsZWQgb24gcHVyZSBKU09OIVxudmFyIHJlcGxhY2VOYW1lcyA9IGZ1bmN0aW9uIChmaWx0ZXIsIHRoaW5nKSB7XG4gIGlmICh0eXBlb2YgdGhpbmcgPT09IFwib2JqZWN0XCIpIHtcbiAgICBpZiAoXy5pc0FycmF5KHRoaW5nKSkge1xuICAgICAgcmV0dXJuIF8ubWFwKHRoaW5nLCBfLmJpbmQocmVwbGFjZU5hbWVzLCBudWxsLCBmaWx0ZXIpKTtcbiAgICB9XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIF8uZWFjaCh0aGluZywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgIHJldFtmaWx0ZXIoa2V5KV0gPSByZXBsYWNlTmFtZXMoZmlsdGVyLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuICByZXR1cm4gdGhpbmc7XG59O1xuXG4vLyBFbnN1cmUgdGhhdCBFSlNPTi5jbG9uZSBrZWVwcyBhIFRpbWVzdGFtcCBhcyBhIFRpbWVzdGFtcCAoaW5zdGVhZCBvZiBqdXN0XG4vLyBkb2luZyBhIHN0cnVjdHVyYWwgY2xvbmUpLlxuLy8gWFhYIGhvdyBvayBpcyB0aGlzPyB3aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBjb3BpZXMgb2YgTW9uZ29EQiBsb2FkZWQ/XG5Nb25nb0RCLlRpbWVzdGFtcC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFRpbWVzdGFtcHMgc2hvdWxkIGJlIGltbXV0YWJsZS5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG52YXIgbWFrZU1vbmdvTGVnYWwgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gXCJFSlNPTlwiICsgbmFtZTsgfTtcbnZhciB1bm1ha2VNb25nb0xlZ2FsID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIG5hbWUuc3Vic3RyKDUpOyB9O1xuXG52YXIgcmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5CaW5hcnkpIHtcbiAgICB2YXIgYnVmZmVyID0gZG9jdW1lbnQudmFsdWUodHJ1ZSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5PYmplY3RJRCkge1xuICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50W1wiRUpTT04kdHlwZVwiXSAmJiBkb2N1bWVudFtcIkVKU09OJHZhbHVlXCJdICYmIF8uc2l6ZShkb2N1bWVudCkgPT09IDIpIHtcbiAgICByZXR1cm4gRUpTT04uZnJvbUpTT05WYWx1ZShyZXBsYWNlTmFtZXModW5tYWtlTW9uZ29MZWdhbCwgZG9jdW1lbnQpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLlRpbWVzdGFtcCkge1xuICAgIC8vIEZvciBub3csIHRoZSBNZXRlb3IgcmVwcmVzZW50YXRpb24gb2YgYSBNb25nbyB0aW1lc3RhbXAgdHlwZSAobm90IGEgZGF0ZSFcbiAgICAvLyB0aGlzIGlzIGEgd2VpcmQgaW50ZXJuYWwgdGhpbmcgdXNlZCBpbiB0aGUgb3Bsb2chKSBpcyB0aGUgc2FtZSBhcyB0aGVcbiAgICAvLyBNb25nbyByZXByZXNlbnRhdGlvbi4gV2UgbmVlZCB0byBkbyB0aGlzIGV4cGxpY2l0bHkgb3IgZWxzZSB3ZSB3b3VsZCBkbyBhXG4gICAgLy8gc3RydWN0dXJhbCBjbG9uZSBhbmQgbG9zZSB0aGUgcHJvdG90eXBlLlxuICAgIHJldHVybiBkb2N1bWVudDtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxudmFyIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XG4gIGlmIChFSlNPTi5pc0JpbmFyeShkb2N1bWVudCkpIHtcbiAgICAvLyBUaGlzIGRvZXMgbW9yZSBjb3BpZXMgdGhhbiB3ZSdkIGxpa2UsIGJ1dCBpcyBuZWNlc3NhcnkgYmVjYXVzZVxuICAgIC8vIE1vbmdvREIuQlNPTiBvbmx5IGxvb2tzIGxpa2UgaXQgdGFrZXMgYSBVaW50OEFycmF5IChhbmQgZG9lc24ndCBhY3R1YWxseVxuICAgIC8vIHNlcmlhbGl6ZSBpdCBjb3JyZWN0bHkpLlxuICAgIHJldHVybiBuZXcgTW9uZ29EQi5CaW5hcnkoQnVmZmVyLmZyb20oZG9jdW1lbnQpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCkge1xuICAgIHJldHVybiBuZXcgTW9uZ29EQi5PYmplY3RJRChkb2N1bWVudC50b0hleFN0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLlRpbWVzdGFtcCkge1xuICAgIC8vIEZvciBub3csIHRoZSBNZXRlb3IgcmVwcmVzZW50YXRpb24gb2YgYSBNb25nbyB0aW1lc3RhbXAgdHlwZSAobm90IGEgZGF0ZSFcbiAgICAvLyB0aGlzIGlzIGEgd2VpcmQgaW50ZXJuYWwgdGhpbmcgdXNlZCBpbiB0aGUgb3Bsb2chKSBpcyB0aGUgc2FtZSBhcyB0aGVcbiAgICAvLyBNb25nbyByZXByZXNlbnRhdGlvbi4gV2UgbmVlZCB0byBkbyB0aGlzIGV4cGxpY2l0bHkgb3IgZWxzZSB3ZSB3b3VsZCBkbyBhXG4gICAgLy8gc3RydWN0dXJhbCBjbG9uZSBhbmQgbG9zZSB0aGUgcHJvdG90eXBlLlxuICAgIHJldHVybiBkb2N1bWVudDtcbiAgfVxuICBpZiAoRUpTT04uX2lzQ3VzdG9tVHlwZShkb2N1bWVudCkpIHtcbiAgICByZXR1cm4gcmVwbGFjZU5hbWVzKG1ha2VNb25nb0xlZ2FsLCBFSlNPTi50b0pTT05WYWx1ZShkb2N1bWVudCkpO1xuICB9XG4gIC8vIEl0IGlzIG5vdCBvcmRpbmFyaWx5IHBvc3NpYmxlIHRvIHN0aWNrIGRvbGxhci1zaWduIGtleXMgaW50byBtb25nb1xuICAvLyBzbyB3ZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgZm9yIHRoaW5ncyB0aGF0IG5lZWQgZXNjYXBpbmcgYXQgdGhpcyB0aW1lLlxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxudmFyIHJlcGxhY2VUeXBlcyA9IGZ1bmN0aW9uIChkb2N1bWVudCwgYXRvbVRyYW5zZm9ybWVyKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICdvYmplY3QnIHx8IGRvY3VtZW50ID09PSBudWxsKVxuICAgIHJldHVybiBkb2N1bWVudDtcblxuICB2YXIgcmVwbGFjZWRUb3BMZXZlbEF0b20gPSBhdG9tVHJhbnNmb3JtZXIoZG9jdW1lbnQpO1xuICBpZiAocmVwbGFjZWRUb3BMZXZlbEF0b20gIT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gcmVwbGFjZWRUb3BMZXZlbEF0b207XG5cbiAgdmFyIHJldCA9IGRvY3VtZW50O1xuICBfLmVhY2goZG9jdW1lbnQsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgIHZhciB2YWxSZXBsYWNlZCA9IHJlcGxhY2VUeXBlcyh2YWwsIGF0b21UcmFuc2Zvcm1lcik7XG4gICAgaWYgKHZhbCAhPT0gdmFsUmVwbGFjZWQpIHtcbiAgICAgIC8vIExhenkgY2xvbmUuIFNoYWxsb3cgY29weS5cbiAgICAgIGlmIChyZXQgPT09IGRvY3VtZW50KVxuICAgICAgICByZXQgPSBfLmNsb25lKGRvY3VtZW50KTtcbiAgICAgIHJldFtrZXldID0gdmFsUmVwbGFjZWQ7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJldDtcbn07XG5cblxuTW9uZ29Db25uZWN0aW9uID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzID0ge307XG4gIHNlbGYuX29uRmFpbG92ZXJIb29rID0gbmV3IEhvb2s7XG5cbiAgdmFyIG1vbmdvT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIC8vIFJlY29ubmVjdCBvbiBlcnJvci5cbiAgICBhdXRvUmVjb25uZWN0OiB0cnVlLFxuICAgIC8vIFRyeSB0byByZWNvbm5lY3QgZm9yZXZlciwgaW5zdGVhZCBvZiBzdG9wcGluZyBhZnRlciAzMCB0cmllcyAodGhlXG4gICAgLy8gZGVmYXVsdCksIHdpdGggZWFjaCBhdHRlbXB0IHNlcGFyYXRlZCBieSAxMDAwbXMuXG4gICAgcmVjb25uZWN0VHJpZXM6IEluZmluaXR5XG4gIH0sIE1vbmdvLl9jb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgLy8gRGlzYWJsZSB0aGUgbmF0aXZlIHBhcnNlciBieSBkZWZhdWx0LCB1bmxlc3Mgc3BlY2lmaWNhbGx5IGVuYWJsZWRcbiAgLy8gaW4gdGhlIG1vbmdvIFVSTC5cbiAgLy8gLSBUaGUgbmF0aXZlIGRyaXZlciBjYW4gY2F1c2UgZXJyb3JzIHdoaWNoIG5vcm1hbGx5IHdvdWxkIGJlXG4gIC8vICAgdGhyb3duLCBjYXVnaHQsIGFuZCBoYW5kbGVkIGludG8gc2VnZmF1bHRzIHRoYXQgdGFrZSBkb3duIHRoZVxuICAvLyAgIHdob2xlIGFwcC5cbiAgLy8gLSBCaW5hcnkgbW9kdWxlcyBkb24ndCB5ZXQgd29yayB3aGVuIHlvdSBidW5kbGUgYW5kIG1vdmUgdGhlIGJ1bmRsZVxuICAvLyAgIHRvIGEgZGlmZmVyZW50IHBsYXRmb3JtIChha2EgZGVwbG95KVxuICAvLyBXZSBzaG91bGQgcmV2aXNpdCB0aGlzIGFmdGVyIGJpbmFyeSBucG0gbW9kdWxlIHN1cHBvcnQgbGFuZHMuXG4gIGlmICghKC9bXFw/Jl1uYXRpdmVfP1twUF1hcnNlcj0vLnRlc3QodXJsKSkpIHtcbiAgICBtb25nb09wdGlvbnMubmF0aXZlX3BhcnNlciA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSW50ZXJuYWxseSB0aGUgb3Bsb2cgY29ubmVjdGlvbnMgc3BlY2lmeSB0aGVpciBvd24gcG9vbFNpemVcbiAgLy8gd2hpY2ggd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgd2l0aCBhbnkgdXNlciBkZWZpbmVkIHZhbHVlXG4gIGlmIChfLmhhcyhvcHRpb25zLCAncG9vbFNpemUnKSkge1xuICAgIC8vIElmIHdlIGp1c3Qgc2V0IHRoaXMgZm9yIFwic2VydmVyXCIsIHJlcGxTZXQgd2lsbCBvdmVycmlkZSBpdC4gSWYgd2UganVzdFxuICAgIC8vIHNldCBpdCBmb3IgcmVwbFNldCwgaXQgd2lsbCBiZSBpZ25vcmVkIGlmIHdlJ3JlIG5vdCB1c2luZyBhIHJlcGxTZXQuXG4gICAgbW9uZ29PcHRpb25zLnBvb2xTaXplID0gb3B0aW9ucy5wb29sU2l6ZTtcbiAgfVxuXG4gIHNlbGYuZGIgPSBudWxsO1xuICAvLyBXZSBrZWVwIHRyYWNrIG9mIHRoZSBSZXBsU2V0J3MgcHJpbWFyeSwgc28gdGhhdCB3ZSBjYW4gdHJpZ2dlciBob29rcyB3aGVuXG4gIC8vIGl0IGNoYW5nZXMuICBUaGUgTm9kZSBkcml2ZXIncyBqb2luZWQgY2FsbGJhY2sgc2VlbXMgdG8gZmlyZSB3YXkgdG9vXG4gIC8vIG9mdGVuLCB3aGljaCBpcyB3aHkgd2UgbmVlZCB0byB0cmFjayBpdCBvdXJzZWx2ZXMuXG4gIHNlbGYuX3ByaW1hcnkgPSBudWxsO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIHNlbGYuX2RvY0ZldGNoZXIgPSBudWxsO1xuXG5cbiAgdmFyIGNvbm5lY3RGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBNb25nb0RCLmNvbm5lY3QoXG4gICAgdXJsLFxuICAgIG1vbmdvT3B0aW9ucyxcbiAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KFxuICAgICAgZnVuY3Rpb24gKGVyciwgZGIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpcnN0LCBmaWd1cmUgb3V0IHdoYXQgdGhlIGN1cnJlbnQgcHJpbWFyeSBpcywgaWYgYW55LlxuICAgICAgICBpZiAoZGIuc2VydmVyQ29uZmlnLmlzTWFzdGVyRG9jKSB7XG4gICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IGRiLnNlcnZlckNvbmZpZy5pc01hc3RlckRvYy5wcmltYXJ5O1xuICAgICAgICB9XG5cbiAgICAgICAgZGIuc2VydmVyQ29uZmlnLm9uKFxuICAgICAgICAgICdqb2luZWQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIChraW5kLCBkb2MpIHtcbiAgICAgICAgICAgIGlmIChraW5kID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgICAgICAgaWYgKGRvYy5wcmltYXJ5ICE9PSBzZWxmLl9wcmltYXJ5KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IGRvYy5wcmltYXJ5O1xuICAgICAgICAgICAgICAgIHNlbGYuX29uRmFpbG92ZXJIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZG9jLm1lID09PSBzZWxmLl9wcmltYXJ5KSB7XG4gICAgICAgICAgICAgIC8vIFRoZSB0aGluZyB3ZSB0aG91Z2h0IHdhcyBwcmltYXJ5IGlzIG5vdyBzb21ldGhpbmcgb3RoZXIgdGhhblxuICAgICAgICAgICAgICAvLyBwcmltYXJ5LiAgRm9yZ2V0IHRoYXQgd2UgdGhvdWdodCBpdCB3YXMgcHJpbWFyeS4gIChUaGlzIG1lYW5zXG4gICAgICAgICAgICAgIC8vIHRoYXQgaWYgYSBzZXJ2ZXIgc3RvcHMgYmVpbmcgcHJpbWFyeSBhbmQgdGhlbiBzdGFydHMgYmVpbmdcbiAgICAgICAgICAgICAgLy8gcHJpbWFyeSBhZ2FpbiB3aXRob3V0IGFub3RoZXIgc2VydmVyIGJlY29taW5nIHByaW1hcnkgaW4gdGhlXG4gICAgICAgICAgICAgIC8vIG1pZGRsZSwgd2UnbGwgY29ycmVjdGx5IGNvdW50IGl0IGFzIGEgZmFpbG92ZXIuKVxuICAgICAgICAgICAgICBzZWxmLl9wcmltYXJ5ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gQWxsb3cgdGhlIGNvbnN0cnVjdG9yIHRvIHJldHVybi5cbiAgICAgICAgY29ubmVjdEZ1dHVyZVsncmV0dXJuJ10oZGIpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RGdXR1cmUucmVzb2x2ZXIoKSAgLy8gb25FeGNlcHRpb25cbiAgICApXG4gICk7XG5cbiAgLy8gV2FpdCBmb3IgdGhlIGNvbm5lY3Rpb24gdG8gYmUgc3VjY2Vzc2Z1bDsgdGhyb3dzIG9uIGZhaWx1cmUuXG4gIHNlbGYuZGIgPSBjb25uZWN0RnV0dXJlLndhaXQoKTtcblxuICBpZiAob3B0aW9ucy5vcGxvZ1VybCAmJiAhIFBhY2thZ2VbJ2Rpc2FibGUtb3Bsb2cnXSkge1xuICAgIHNlbGYuX29wbG9nSGFuZGxlID0gbmV3IE9wbG9nSGFuZGxlKG9wdGlvbnMub3Bsb2dVcmwsIHNlbGYuZGIuZGF0YWJhc2VOYW1lKTtcbiAgICBzZWxmLl9kb2NGZXRjaGVyID0gbmV3IERvY0ZldGNoZXIoc2VsZik7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjbG9zZSBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgLy8gWFhYIHByb2JhYmx5IHVudGVzdGVkXG4gIHZhciBvcGxvZ0hhbmRsZSA9IHNlbGYuX29wbG9nSGFuZGxlO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIGlmIChvcGxvZ0hhbmRsZSlcbiAgICBvcGxvZ0hhbmRsZS5zdG9wKCk7XG5cbiAgLy8gVXNlIEZ1dHVyZS53cmFwIHNvIHRoYXQgZXJyb3JzIGdldCB0aHJvd24uIFRoaXMgaGFwcGVucyB0b1xuICAvLyB3b3JrIGV2ZW4gb3V0c2lkZSBhIGZpYmVyIHNpbmNlIHRoZSAnY2xvc2UnIG1ldGhvZCBpcyBub3RcbiAgLy8gYWN0dWFsbHkgYXN5bmNocm9ub3VzLlxuICBGdXR1cmUud3JhcChfLmJpbmQoc2VsZi5kYi5jbG9zZSwgc2VsZi5kYikpKHRydWUpLndhaXQoKTtcbn07XG5cbi8vIFJldHVybnMgdGhlIE1vbmdvIENvbGxlY3Rpb24gb2JqZWN0OyBtYXkgeWllbGQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnJhd0NvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJyYXdDb2xsZWN0aW9uIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgc2VsZi5kYi5jb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lLCBmdXR1cmUucmVzb2x2ZXIoKSk7XG4gIHJldHVybiBmdXR1cmUud2FpdCgpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChcbiAgICBjb2xsZWN0aW9uTmFtZSwgYnl0ZVNpemUsIG1heERvY3VtZW50cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcIl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZSgpO1xuICBzZWxmLmRiLmNyZWF0ZUNvbGxlY3Rpb24oXG4gICAgY29sbGVjdGlvbk5hbWUsXG4gICAgeyBjYXBwZWQ6IHRydWUsIHNpemU6IGJ5dGVTaXplLCBtYXg6IG1heERvY3VtZW50cyB9LFxuICAgIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgZnV0dXJlLndhaXQoKTtcbn07XG5cbi8vIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IHdpdGggYSB3cml0ZSwgdG8gY3JlYXRlIGFcbi8vIHRyYW5zYWN0aW9uIG9uIHRoZSBjdXJyZW50IHdyaXRlIGZlbmNlLCBpZiBhbnkuIEFmdGVyIHdlIGNhbiByZWFkXG4vLyB0aGUgd3JpdGUsIGFuZCBhZnRlciBvYnNlcnZlcnMgaGF2ZSBiZWVuIG5vdGlmaWVkIChvciBhdCBsZWFzdCxcbi8vIGFmdGVyIHRoZSBvYnNlcnZlciBub3RpZmllcnMgaGF2ZSBhZGRlZCB0aGVtc2VsdmVzIHRvIHRoZSB3cml0ZVxuLy8gZmVuY2UpLCB5b3Ugc2hvdWxkIGNhbGwgJ2NvbW1pdHRlZCgpJyBvbiB0aGUgb2JqZWN0IHJldHVybmVkLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fbWF5YmVCZWdpbldyaXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICBpZiAoZmVuY2UpIHtcbiAgICByZXR1cm4gZmVuY2UuYmVnaW5Xcml0ZSgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7Y29tbWl0dGVkOiBmdW5jdGlvbiAoKSB7fX07XG4gIH1cbn07XG5cbi8vIEludGVybmFsIGludGVyZmFjZTogYWRkcyBhIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB3aGVuIHRoZSBNb25nbyBwcmltYXJ5XG4vLyBjaGFuZ2VzLiBSZXR1cm5zIGEgc3RvcCBoYW5kbGUuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vbkZhaWxvdmVyID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLl9vbkZhaWxvdmVySG9vay5yZWdpc3RlcihjYWxsYmFjayk7XG59O1xuXG5cbi8vLy8vLy8vLy8vLyBQdWJsaWMgQVBJIC8vLy8vLy8vLy9cblxuLy8gVGhlIHdyaXRlIG1ldGhvZHMgYmxvY2sgdW50aWwgdGhlIGRhdGFiYXNlIGhhcyBjb25maXJtZWQgdGhlIHdyaXRlIChpdCBtYXlcbi8vIG5vdCBiZSByZXBsaWNhdGVkIG9yIHN0YWJsZSBvbiBkaXNrLCBidXQgb25lIHNlcnZlciBoYXMgY29uZmlybWVkIGl0KSBpZiBub1xuLy8gY2FsbGJhY2sgaXMgcHJvdmlkZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBjYWxsIHRoZSBjYWxsYmFja1xuLy8gd2hlbiB0aGUgd3JpdGUgaXMgY29uZmlybWVkLiBUaGV5IHJldHVybiBub3RoaW5nIG9uIHN1Y2Nlc3MsIGFuZCByYWlzZSBhblxuLy8gZXhjZXB0aW9uIG9uIGZhaWx1cmUuXG4vL1xuLy8gQWZ0ZXIgbWFraW5nIGEgd3JpdGUgKHdpdGggaW5zZXJ0LCB1cGRhdGUsIHJlbW92ZSksIG9ic2VydmVycyBhcmVcbi8vIG5vdGlmaWVkIGFzeW5jaHJvbm91c2x5LiBJZiB5b3Ugd2FudCB0byByZWNlaXZlIGEgY2FsbGJhY2sgb25jZSBhbGxcbi8vIG9mIHRoZSBvYnNlcnZlciBub3RpZmljYXRpb25zIGhhdmUgbGFuZGVkIGZvciB5b3VyIHdyaXRlLCBkbyB0aGVcbi8vIHdyaXRlcyBpbnNpZGUgYSB3cml0ZSBmZW5jZSAoc2V0IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UgdG8gYSBuZXdcbi8vIF9Xcml0ZUZlbmNlLCBhbmQgdGhlbiBzZXQgYSBjYWxsYmFjayBvbiB0aGUgd3JpdGUgZmVuY2UuKVxuLy9cbi8vIFNpbmNlIG91ciBleGVjdXRpb24gZW52aXJvbm1lbnQgaXMgc2luZ2xlLXRocmVhZGVkLCB0aGlzIGlzXG4vLyB3ZWxsLWRlZmluZWQgLS0gYSB3cml0ZSBcImhhcyBiZWVuIG1hZGVcIiBpZiBpdCdzIHJldHVybmVkLCBhbmQgYW5cbi8vIG9ic2VydmVyIFwiaGFzIGJlZW4gbm90aWZpZWRcIiBpZiBpdHMgY2FsbGJhY2sgaGFzIHJldHVybmVkLlxuXG52YXIgd3JpdGVDYWxsYmFjayA9IGZ1bmN0aW9uICh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgIGlmICghIGVycikge1xuICAgICAgLy8gWFhYIFdlIGRvbid0IGhhdmUgdG8gcnVuIHRoaXMgb24gZXJyb3IsIHJpZ2h0P1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVmcmVzaCgpO1xuICAgICAgfSBjYXRjaCAocmVmcmVzaEVycikge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhyZWZyZXNoRXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgcmVmcmVzaEVycjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKGVycikge1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfTtcbn07XG5cbnZhciBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICByZXR1cm4gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFjaywgXCJNb25nbyB3cml0ZVwiKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2luc2VydCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIGRvY3VtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgc2VuZEVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoY2FsbGJhY2spXG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgdGhyb3cgZTtcbiAgfTtcblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5leHBlY3RlZCA9IHRydWU7XG4gICAgc2VuZEVycm9yKGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChkb2N1bWVudCkgJiZcbiAgICAgICAgIUVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSkge1xuICAgIHNlbmRFcnJvcihuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgaW5zZXJ0ZWQgaW50byBNb25nb0RCXCIpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25fbmFtZSwgaWQ6IGRvY3VtZW50Ll9pZCB9KTtcbiAgfTtcbiAgY2FsbGJhY2sgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykpO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZVR5cGVzKGRvY3VtZW50LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCBjYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuLy8gQ2F1c2UgcXVlcmllcyB0aGF0IG1heSBiZSBhZmZlY3RlZCBieSB0aGUgc2VsZWN0b3IgdG8gcG9sbCBpbiB0aGlzIHdyaXRlXG4vLyBmZW5jZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlZnJlc2ggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yKSB7XG4gIHZhciByZWZyZXNoS2V5ID0ge2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lfTtcbiAgLy8gSWYgd2Uga25vdyB3aGljaCBkb2N1bWVudHMgd2UncmUgcmVtb3ZpbmcsIGRvbid0IHBvbGwgcXVlcmllcyB0aGF0IGFyZVxuICAvLyBzcGVjaWZpYyB0byBvdGhlciBkb2N1bWVudHMuIChOb3RlIHRoYXQgbXVsdGlwbGUgbm90aWZpY2F0aW9ucyBoZXJlIHNob3VsZFxuICAvLyBub3QgY2F1c2UgbXVsdGlwbGUgcG9sbHMsIHNpbmNlIGFsbCBvdXIgbGlzdGVuZXIgaXMgZG9pbmcgaXMgZW5xdWV1ZWluZyBhXG4gIC8vIHBvbGwuKVxuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgXy5lYWNoKHNwZWNpZmljSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIE1ldGVvci5yZWZyZXNoKF8uZXh0ZW5kKHtpZDogaWR9LCByZWZyZXNoS2V5KSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgTWV0ZW9yLnJlZnJlc2gocmVmcmVzaEtleSk7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5leHBlY3RlZCA9IHRydWU7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spKTtcblxuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgZHJpdmVyUmVzdWx0KSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHRyYW5zZm9ybVJlc3VsdChkcml2ZXJSZXN1bHQpLm51bWJlckFmZmVjdGVkKTtcbiAgICB9O1xuICAgIGNvbGxlY3Rpb24ucmVtb3ZlKHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgICAgICAgICAgICAgICAgICAgICB7c2FmZTogdHJ1ZX0sIHdyYXBwZWRDYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZHJvcENvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLCBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZHJvcENvbGxlY3Rpb246IHRydWV9KTtcbiAgfTtcbiAgY2IgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYikpO1xuXG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbGxlY3Rpb24uZHJvcChjYik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG4vLyBGb3IgdGVzdGluZyBvbmx5LiAgU2xpZ2h0bHkgYmV0dGVyIHRoYW4gYGMucmF3RGF0YWJhc2UoKS5kcm9wRGF0YWJhc2UoKWBcbi8vIGJlY2F1c2UgaXQgbGV0cyB0aGUgdGVzdCdzIGZlbmNlIHdhaXQgZm9yIGl0IHRvIGJlIGNvbXBsZXRlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZHJvcERhdGFiYXNlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goeyBkcm9wRGF0YWJhc2U6IHRydWUgfSk7XG4gIH07XG4gIGNiID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2IpKTtcblxuICB0cnkge1xuICAgIHNlbGYuZGIuZHJvcERhdGFiYXNlKGNiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIGNhbGxiYWNrICYmIG9wdGlvbnMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLmV4cGVjdGVkID0gdHJ1ZTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICAvLyBleHBsaWNpdCBzYWZldHkgY2hlY2suIG51bGwgYW5kIHVuZGVmaW5lZCBjYW4gY3Jhc2ggdGhlIG1vbmdvXG4gIC8vIGRyaXZlci4gQWx0aG91Z2ggdGhlIG5vZGUgZHJpdmVyIGFuZCBtaW5pbW9uZ28gZG8gJ3N1cHBvcnQnXG4gIC8vIG5vbi1vYmplY3QgbW9kaWZpZXIgaW4gdGhhdCB0aGV5IGRvbid0IGNyYXNoLCB0aGV5IGFyZSBub3RcbiAgLy8gbWVhbmluZ2Z1bCBvcGVyYXRpb25zIGFuZCBkbyBub3QgZG8gYW55dGhpbmcuIERlZmVuc2l2ZWx5IHRocm93IGFuXG4gIC8vIGVycm9yIGhlcmUuXG4gIGlmICghbW9kIHx8IHR5cGVvZiBtb2QgIT09ICdvYmplY3QnKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgbW9kaWZpZXIuIE1vZGlmaWVyIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcblxuICBpZiAoIShMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QobW9kKSAmJlxuICAgICAgICAhRUpTT04uX2lzQ3VzdG9tVHlwZShtb2QpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiT25seSBwbGFpbiBvYmplY3RzIG1heSBiZSB1c2VkIGFzIHJlcGxhY2VtZW50XCIgK1xuICAgICAgICBcIiBkb2N1bWVudHMgaW4gTW9uZ29EQlwiKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuICBjYWxsYmFjayA9IHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKTtcbiAgdHJ5IHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uX25hbWUpO1xuICAgIHZhciBtb25nb09wdHMgPSB7c2FmZTogdHJ1ZX07XG4gICAgLy8gZXhwbGljdGx5IGVudW1lcmF0ZSBvcHRpb25zIHRoYXQgbWluaW1vbmdvIHN1cHBvcnRzXG4gICAgaWYgKG9wdGlvbnMudXBzZXJ0KSBtb25nb09wdHMudXBzZXJ0ID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkgbW9uZ29PcHRzLm11bHRpID0gdHJ1ZTtcbiAgICAvLyBMZXRzIHlvdSBnZXQgYSBtb3JlIG1vcmUgZnVsbCByZXN1bHQgZnJvbSBNb25nb0RCLiBVc2Ugd2l0aCBjYXV0aW9uOlxuICAgIC8vIG1pZ2h0IG5vdCB3b3JrIHdpdGggQy51cHNlcnQgKGFzIG9wcG9zZWQgdG8gQy51cGRhdGUoe3Vwc2VydDp0cnVlfSkgb3JcbiAgICAvLyB3aXRoIHNpbXVsYXRlZCB1cHNlcnQuXG4gICAgaWYgKG9wdGlvbnMuZnVsbFJlc3VsdCkgbW9uZ29PcHRzLmZ1bGxSZXN1bHQgPSB0cnVlO1xuXG4gICAgdmFyIG1vbmdvU2VsZWN0b3IgPSByZXBsYWNlVHlwZXMoc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcbiAgICB2YXIgbW9uZ29Nb2QgPSByZXBsYWNlVHlwZXMobW9kLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyk7XG5cbiAgICB2YXIgaXNNb2RpZnkgPSBMb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kKG1vbmdvTW9kKTtcblxuICAgIGlmIChvcHRpb25zLl9mb3JiaWRSZXBsYWNlICYmICFpc01vZGlmeSkge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIkludmFsaWQgbW9kaWZpZXIuIFJlcGxhY2VtZW50cyBhcmUgZm9yYmlkZGVuLlwiKTtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSd2ZSBhbHJlYWR5IHJ1biByZXBsYWNlVHlwZXMvcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gb25cbiAgICAvLyBzZWxlY3RvciBhbmQgbW9kLiAgV2UgYXNzdW1lIGl0IGRvZXNuJ3QgbWF0dGVyLCBhcyBmYXIgYXNcbiAgICAvLyB0aGUgYmVoYXZpb3Igb2YgbW9kaWZpZXJzIGlzIGNvbmNlcm5lZCwgd2hldGhlciBgX21vZGlmeWBcbiAgICAvLyBpcyBydW4gb24gRUpTT04gb3Igb24gbW9uZ28tY29udmVydGVkIEVKU09OLlxuXG4gICAgLy8gUnVuIHRoaXMgY29kZSB1cCBmcm9udCBzbyB0aGF0IGl0IGZhaWxzIGZhc3QgaWYgc29tZW9uZSB1c2VzXG4gICAgLy8gYSBNb25nbyB1cGRhdGUgb3BlcmF0b3Igd2UgZG9uJ3Qgc3VwcG9ydC5cbiAgICBsZXQga25vd25JZDtcbiAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBuZXdEb2MgPSBMb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50KHNlbGVjdG9yLCBtb2QpO1xuICAgICAgICBrbm93bklkID0gbmV3RG9jLl9pZDtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy51cHNlcnQgJiZcbiAgICAgICAgISBpc01vZGlmeSAmJlxuICAgICAgICAhIGtub3duSWQgJiZcbiAgICAgICAgb3B0aW9ucy5pbnNlcnRlZElkICYmXG4gICAgICAgICEgKG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEICYmXG4gICAgICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQpKSB7XG4gICAgICAvLyBJbiBjYXNlIG9mIGFuIHVwc2VydCB3aXRoIGEgcmVwbGFjZW1lbnQsIHdoZXJlIHRoZXJlIGlzIG5vIF9pZCBkZWZpbmVkXG4gICAgICAvLyBpbiBlaXRoZXIgdGhlIHF1ZXJ5IG9yIHRoZSByZXBsYWNlbWVudCBkb2MsIG1vbmdvIHdpbGwgZ2VuZXJhdGUgYW4gaWQgaXRzZWxmLiBcbiAgICAgIC8vIFRoZXJlZm9yZSB3ZSBuZWVkIHRoaXMgc3BlY2lhbCBzdHJhdGVneSBpZiB3ZSB3YW50IHRvIGNvbnRyb2wgdGhlIGlkIG91cnNlbHZlcy5cblxuICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBkbyB0aGlzIHdoZW46XG4gICAgICAvLyAtIFRoaXMgaXMgbm90IGEgcmVwbGFjZW1lbnQsIHNvIHdlIGNhbiBhZGQgYW4gX2lkIHRvICRzZXRPbkluc2VydFxuICAgICAgLy8gLSBUaGUgaWQgaXMgZGVmaW5lZCBieSBxdWVyeSBvciBtb2Qgd2UgY2FuIGp1c3QgYWRkIGl0IHRvIHRoZSByZXBsYWNlbWVudCBkb2NcbiAgICAgIC8vIC0gVGhlIHVzZXIgZGlkIG5vdCBzcGVjaWZ5IGFueSBpZCBwcmVmZXJlbmNlIGFuZCB0aGUgaWQgaXMgYSBNb25nbyBPYmplY3RJZCwgXG4gICAgICAvLyAgICAgdGhlbiB3ZSBjYW4ganVzdCBsZXQgTW9uZ28gZ2VuZXJhdGUgdGhlIGlkXG5cbiAgICAgIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQoXG4gICAgICAgIGNvbGxlY3Rpb24sIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBvcHRpb25zLFxuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGRvZXMgbm90IG5lZWQgdG8gYmUgYmluZEVudmlyb25tZW50J2VkIGJlY2F1c2VcbiAgICAgICAgLy8gc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCgpIHdyYXBzIGl0IGFuZCB0aGVuIHBhc3NlcyBpdCB0aHJvdWdoXG4gICAgICAgIC8vIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlLlxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHZpYSBhIHVwc2VydCgpIGNhbGwsIHRoZW4gb3B0aW9ucy5fcmV0dXJuT2JqZWN0IHdpbGxcbiAgICAgICAgICAvLyBiZSBzZXQgYW5kIHdlIHNob3VsZCByZXR1cm4gdGhlIHdob2xlIG9iamVjdC4gT3RoZXJ3aXNlLCB3ZSBzaG91bGRcbiAgICAgICAgICAvLyBqdXN0IHJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgdG8gbWF0Y2ggdGhlIG1vbmdvIEFQSS5cbiAgICAgICAgICBpZiAocmVzdWx0ICYmICEgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0Lm51bWJlckFmZmVjdGVkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBcbiAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiAha25vd25JZCAmJiBvcHRpb25zLmluc2VydGVkSWQgJiYgaXNNb2RpZnkpIHtcbiAgICAgICAgaWYgKCFtb25nb01vZC5oYXNPd25Qcm9wZXJ0eSgnJHNldE9uSW5zZXJ0JykpIHtcbiAgICAgICAgICBtb25nb01vZC4kc2V0T25JbnNlcnQgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBrbm93bklkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgICBPYmplY3QuYXNzaWduKG1vbmdvTW9kLiRzZXRPbkluc2VydCwgcmVwbGFjZVR5cGVzKHtfaWQ6IG9wdGlvbnMuaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbGxlY3Rpb24udXBkYXRlKFxuICAgICAgICBtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgbW9uZ29PcHRzLFxuICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICBpZiAoISBlcnIpIHtcbiAgICAgICAgICAgIHZhciBtZXRlb3JSZXN1bHQgPSB0cmFuc2Zvcm1SZXN1bHQocmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChtZXRlb3JSZXN1bHQgJiYgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGFuIHVwc2VydCgpIGNhbGwsIGFuZCB3ZSBlbmRlZCB1cFxuICAgICAgICAgICAgICAvLyBpbnNlcnRpbmcgYSBuZXcgZG9jIGFuZCB3ZSBrbm93IGl0cyBpZCwgdGhlblxuICAgICAgICAgICAgICAvLyByZXR1cm4gdGhhdCBpZCBhcyB3ZWxsLlxuICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQgJiYgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoa25vd25JZCkge1xuICAgICAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBrbm93bklkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG5ldyBNb25nby5PYmplY3RJRChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZC50b0hleFN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxudmFyIHRyYW5zZm9ybVJlc3VsdCA9IGZ1bmN0aW9uIChkcml2ZXJSZXN1bHQpIHtcbiAgdmFyIG1ldGVvclJlc3VsdCA9IHsgbnVtYmVyQWZmZWN0ZWQ6IDAgfTtcbiAgaWYgKGRyaXZlclJlc3VsdCkge1xuICAgIHZhciBtb25nb1Jlc3VsdCA9IGRyaXZlclJlc3VsdC5yZXN1bHQ7XG5cbiAgICAvLyBPbiB1cGRhdGVzIHdpdGggdXBzZXJ0OnRydWUsIHRoZSBpbnNlcnRlZCB2YWx1ZXMgY29tZSBhcyBhIGxpc3Qgb2ZcbiAgICAvLyB1cHNlcnRlZCB2YWx1ZXMgLS0gZXZlbiB3aXRoIG9wdGlvbnMubXVsdGksIHdoZW4gdGhlIHVwc2VydCBkb2VzIGluc2VydCxcbiAgICAvLyBpdCBvbmx5IGluc2VydHMgb25lIGVsZW1lbnQuXG4gICAgaWYgKG1vbmdvUmVzdWx0LnVwc2VydGVkKSB7XG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgKz0gbW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoO1xuXG4gICAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBtb25nb1Jlc3VsdC51cHNlcnRlZFswXS5faWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCA9IG1vbmdvUmVzdWx0Lm47XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGVvclJlc3VsdDtcbn07XG5cblxudmFyIE5VTV9PUFRJTUlTVElDX1RSSUVTID0gMztcblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZ1xuTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgLy8gTW9uZ28gMy4yLiogcmV0dXJucyBlcnJvciBhcyBuZXh0IE9iamVjdDpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnJtc2c6IFN0cmluZ31cbiAgLy8gT2xkZXIgTW9uZ28gcmV0dXJuczpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnI6IFN0cmluZ31cbiAgdmFyIGVycm9yID0gZXJyLmVycm1zZyB8fCBlcnIuZXJyO1xuXG4gIC8vIFdlIGRvbid0IHVzZSB0aGUgZXJyb3IgY29kZSBoZXJlXG4gIC8vIGJlY2F1c2UgdGhlIGVycm9yIGNvZGUgd2Ugb2JzZXJ2ZWQgaXQgcHJvZHVjaW5nICgxNjgzNykgYXBwZWFycyB0byBiZVxuICAvLyBhIGZhciBtb3JlIGdlbmVyaWMgZXJyb3IgY29kZSBiYXNlZCBvbiBleGFtaW5pbmcgdGhlIHNvdXJjZS5cbiAgaWYgKGVycm9yLmluZGV4T2YoJ1RoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQnKSA9PT0gMFxuICAgIHx8IGVycm9yLmluZGV4T2YoXCJ0aGUgKGltbXV0YWJsZSkgZmllbGQgJ19pZCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvIF9pZFwiKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24sIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBTVFJBVEVHWTogRmlyc3QgdHJ5IGRvaW5nIGFuIHVwc2VydCB3aXRoIGEgZ2VuZXJhdGVkIElELlxuICAvLyBJZiB0aGlzIHRocm93cyBhbiBlcnJvciBhYm91dCBjaGFuZ2luZyB0aGUgSUQgb24gYW4gZXhpc3RpbmcgZG9jdW1lbnRcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIGtub3cgd2Ugc2hvdWxkIHByb2JhYmx5IHRyeVxuICAvLyBhbiB1cGRhdGUgd2l0aG91dCB0aGUgZ2VuZXJhdGVkIElELiBJZiBpdCBhZmZlY3RlZCAwIGRvY3VtZW50cywgXG4gIC8vIHRoZW4gd2l0aG91dCBhZmZlY3RpbmcgdGhlIGRhdGFiYXNlLCB3ZSB0aGUgZG9jdW1lbnQgdGhhdCBmaXJzdFxuICAvLyBnYXZlIHRoZSBlcnJvciBpcyBwcm9iYWJseSByZW1vdmVkIGFuZCB3ZSBuZWVkIHRvIHRyeSBhbiBpbnNlcnQgYWdhaW5cbiAgLy8gV2UgZ28gYmFjayB0byBzdGVwIG9uZSBhbmQgcmVwZWF0LlxuICAvLyBMaWtlIGFsbCBcIm9wdGltaXN0aWMgd3JpdGVcIiBzY2hlbWVzLCB3ZSByZWx5IG9uIHRoZSBmYWN0IHRoYXQgaXQnc1xuICAvLyB1bmxpa2VseSBvdXIgd3JpdGVzIHdpbGwgY29udGludWUgdG8gYmUgaW50ZXJmZXJlZCB3aXRoIHVuZGVyIG5vcm1hbFxuICAvLyBjaXJjdW1zdGFuY2VzICh0aG91Z2ggc3VmZmljaWVudGx5IGhlYXZ5IGNvbnRlbnRpb24gd2l0aCB3cml0ZXJzXG4gIC8vIGRpc2FncmVlaW5nIG9uIHRoZSBleGlzdGVuY2Ugb2YgYW4gb2JqZWN0IHdpbGwgY2F1c2Ugd3JpdGVzIHRvIGZhaWxcbiAgLy8gaW4gdGhlb3J5KS5cblxuICB2YXIgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDsgLy8gbXVzdCBleGlzdFxuICB2YXIgbW9uZ29PcHRzRm9yVXBkYXRlID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgbXVsdGk6IG9wdGlvbnMubXVsdGlcbiAgfTtcbiAgdmFyIG1vbmdvT3B0c0Zvckluc2VydCA9IHtcbiAgICBzYWZlOiB0cnVlLFxuICAgIHVwc2VydDogdHJ1ZVxuICB9O1xuXG4gIHZhciByZXBsYWNlbWVudFdpdGhJZCA9IE9iamVjdC5hc3NpZ24oXG4gICAgcmVwbGFjZVR5cGVzKHtfaWQ6IGluc2VydGVkSWR9LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgbW9kKTtcblxuICB2YXIgdHJpZXMgPSBOVU1fT1BUSU1JU1RJQ19UUklFUztcblxuICB2YXIgZG9VcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdHJpZXMtLTtcbiAgICBpZiAoISB0cmllcykge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiVXBzZXJ0IGZhaWxlZCBhZnRlciBcIiArIE5VTV9PUFRJTUlTVElDX1RSSUVTICsgXCIgdHJpZXMuXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sbGVjdGlvbi51cGRhdGUoc2VsZWN0b3IsIG1vZCwgbW9uZ29PcHRzRm9yVXBkYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmluZEVudmlyb25tZW50Rm9yV3JpdGUoZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCAmJiByZXN1bHQucmVzdWx0Lm4gIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQucmVzdWx0Lm5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb0NvbmRpdGlvbmFsSW5zZXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGRvQ29uZGl0aW9uYWxJbnNlcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29sbGVjdGlvbi51cGRhdGUoc2VsZWN0b3IsIHJlcGxhY2VtZW50V2l0aElkLCBtb25nb09wdHNGb3JJbnNlcnQsXG4gICAgICAgICAgICAgICAgICAgICAgYmluZEVudmlyb25tZW50Rm9yV3JpdGUoZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpZ3VyZSBvdXQgaWYgdGhpcyBpcyBhXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiY2Fubm90IGNoYW5nZSBfaWQgb2YgZG9jdW1lbnRcIiBlcnJvciwgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvLCB0cnkgZG9VcGRhdGUoKSBhZ2FpbiwgdXAgdG8gMyB0aW1lcy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE1vbmdvQ29ubmVjdGlvbi5faXNDYW5ub3RDaGFuZ2VJZEVycm9yKGVycikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb1VwZGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJBZmZlY3RlZDogcmVzdWx0LnJlc3VsdC51cHNlcnRlZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWRJZDogaW5zZXJ0ZWRJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICB9O1xuXG4gIGRvVXBkYXRlKCk7XG59O1xuXG5fLmVhY2goW1wiaW5zZXJ0XCIsIFwidXBkYXRlXCIsIFwicmVtb3ZlXCIsIFwiZHJvcENvbGxlY3Rpb25cIiwgXCJkcm9wRGF0YWJhc2VcIl0sIGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24gKC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gTWV0ZW9yLndyYXBBc3luYyhzZWxmW1wiX1wiICsgbWV0aG9kXSkuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgfTtcbn0pO1xuXG4vLyBYWFggTW9uZ29Db25uZWN0aW9uLnVwc2VydCgpIGRvZXMgbm90IHJldHVybiB0aGUgaWQgb2YgdGhlIGluc2VydGVkIGRvY3VtZW50XG4vLyB1bmxlc3MgeW91IHNldCBpdCBleHBsaWNpdGx5IGluIHRoZSBzZWxlY3RvciBvciBtb2RpZmllciAoYXMgYSByZXBsYWNlbWVudFxuLy8gZG9jKS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudXBzZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiAmJiAhIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnVwZGF0ZShjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgICAgICAgIHVwc2VydDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgX3JldHVybk9iamVjdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgfSksIGNhbGxiYWNrKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKVxuICAgIHNlbGVjdG9yID0ge307XG5cbiAgcmV0dXJuIG5ldyBDdXJzb3IoXG4gICAgc2VsZiwgbmV3IEN1cnNvckRlc2NyaXB0aW9uKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKVxuICAgIHNlbGVjdG9yID0ge307XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMubGltaXQgPSAxO1xuICByZXR1cm4gc2VsZi5maW5kKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpLmZldGNoKClbMF07XG59O1xuXG4vLyBXZSdsbCBhY3R1YWxseSBkZXNpZ24gYW4gaW5kZXggQVBJIGxhdGVyLiBGb3Igbm93LCB3ZSBqdXN0IHBhc3MgdGhyb3VnaCB0b1xuLy8gTW9uZ28ncywgYnV0IG1ha2UgaXQgc3luY2hyb25vdXMuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9lbnN1cmVJbmRleCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBXZSBleHBlY3QgdGhpcyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgc3RhcnR1cCwgbm90IGZyb20gd2l0aGluIGEgbWV0aG9kLFxuICAvLyBzbyB3ZSBkb24ndCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgdmFyIGluZGV4TmFtZSA9IGNvbGxlY3Rpb24uZW5zdXJlSW5kZXgoaW5kZXgsIG9wdGlvbnMsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgZnV0dXJlLndhaXQoKTtcbn07XG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9kcm9wSW5kZXggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGluZGV4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSB0ZXN0IGNvZGUsIG5vdCB3aXRoaW4gYSBtZXRob2QsIHNvIHdlIGRvbid0XG4gIC8vIGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICB2YXIgaW5kZXhOYW1lID0gY29sbGVjdGlvbi5kcm9wSW5kZXgoaW5kZXgsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgZnV0dXJlLndhaXQoKTtcbn07XG5cbi8vIENVUlNPUlNcblxuLy8gVGhlcmUgYXJlIHNldmVyYWwgY2xhc3NlcyB3aGljaCByZWxhdGUgdG8gY3Vyc29yczpcbi8vXG4vLyBDdXJzb3JEZXNjcmlwdGlvbiByZXByZXNlbnRzIHRoZSBhcmd1bWVudHMgdXNlZCB0byBjb25zdHJ1Y3QgYSBjdXJzb3I6XG4vLyBjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIGFuZCAoZmluZCkgb3B0aW9ucy4gIEJlY2F1c2UgaXQgaXMgdXNlZCBhcyBhIGtleVxuLy8gZm9yIGN1cnNvciBkZS1kdXAsIGV2ZXJ5dGhpbmcgaW4gaXQgc2hvdWxkIGVpdGhlciBiZSBKU09OLXN0cmluZ2lmaWFibGUgb3Jcbi8vIG5vdCBhZmZlY3Qgb2JzZXJ2ZUNoYW5nZXMgb3V0cHV0IChlZywgb3B0aW9ucy50cmFuc2Zvcm0gZnVuY3Rpb25zIGFyZSBub3Rcbi8vIHN0cmluZ2lmaWFibGUgYnV0IGRvIG5vdCBhZmZlY3Qgb2JzZXJ2ZUNoYW5nZXMpLlxuLy9cbi8vIFN5bmNocm9ub3VzQ3Vyc29yIGlzIGEgd3JhcHBlciBhcm91bmQgYSBNb25nb0RCIGN1cnNvclxuLy8gd2hpY2ggaW5jbHVkZXMgZnVsbHktc3luY2hyb25vdXMgdmVyc2lvbnMgb2YgZm9yRWFjaCwgZXRjLlxuLy9cbi8vIEN1cnNvciBpcyB0aGUgY3Vyc29yIG9iamVjdCByZXR1cm5lZCBmcm9tIGZpbmQoKSwgd2hpY2ggaW1wbGVtZW50cyB0aGVcbi8vIGRvY3VtZW50ZWQgTW9uZ28uQ29sbGVjdGlvbiBjdXJzb3IgQVBJLiAgSXQgd3JhcHMgYSBDdXJzb3JEZXNjcmlwdGlvbiBhbmQgYVxuLy8gU3luY2hyb25vdXNDdXJzb3IgKGxhemlseTogaXQgZG9lc24ndCBjb250YWN0IE1vbmdvIHVudGlsIHlvdSBjYWxsIGEgbWV0aG9kXG4vLyBsaWtlIGZldGNoIG9yIGZvckVhY2ggb24gaXQpLlxuLy9cbi8vIE9ic2VydmVIYW5kbGUgaXMgdGhlIFwib2JzZXJ2ZSBoYW5kbGVcIiByZXR1cm5lZCBmcm9tIG9ic2VydmVDaGFuZ2VzLiBJdCBoYXMgYVxuLy8gcmVmZXJlbmNlIHRvIGFuIE9ic2VydmVNdWx0aXBsZXhlci5cbi8vXG4vLyBPYnNlcnZlTXVsdGlwbGV4ZXIgYWxsb3dzIG11bHRpcGxlIGlkZW50aWNhbCBPYnNlcnZlSGFuZGxlcyB0byBiZSBkcml2ZW4gYnkgYVxuLy8gc2luZ2xlIG9ic2VydmUgZHJpdmVyLlxuLy9cbi8vIFRoZXJlIGFyZSB0d28gXCJvYnNlcnZlIGRyaXZlcnNcIiB3aGljaCBkcml2ZSBPYnNlcnZlTXVsdGlwbGV4ZXJzOlxuLy8gICAtIFBvbGxpbmdPYnNlcnZlRHJpdmVyIGNhY2hlcyB0aGUgcmVzdWx0cyBvZiBhIHF1ZXJ5IGFuZCByZXJ1bnMgaXQgd2hlblxuLy8gICAgIG5lY2Vzc2FyeS5cbi8vICAgLSBPcGxvZ09ic2VydmVEcml2ZXIgZm9sbG93cyB0aGUgTW9uZ28gb3BlcmF0aW9uIGxvZyB0byBkaXJlY3RseSBvYnNlcnZlXG4vLyAgICAgZGF0YWJhc2UgY2hhbmdlcy5cbi8vIEJvdGggaW1wbGVtZW50YXRpb25zIGZvbGxvdyB0aGUgc2FtZSBzaW1wbGUgaW50ZXJmYWNlOiB3aGVuIHlvdSBjcmVhdGUgdGhlbSxcbi8vIHRoZXkgc3RhcnQgc2VuZGluZyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3MgKGFuZCBhIHJlYWR5KCkgaW52b2NhdGlvbikgdG9cbi8vIHRoZWlyIE9ic2VydmVNdWx0aXBsZXhlciwgYW5kIHlvdSBzdG9wIHRoZW0gYnkgY2FsbGluZyB0aGVpciBzdG9wKCkgbWV0aG9kLlxuXG5DdXJzb3JEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gIHNlbGYuc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBzZWxmLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufTtcblxuQ3Vyc29yID0gZnVuY3Rpb24gKG1vbmdvLCBjdXJzb3JEZXNjcmlwdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5fbW9uZ28gPSBtb25nbztcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBudWxsO1xufTtcblxuXy5lYWNoKFsnZm9yRWFjaCcsICdtYXAnLCAnZmV0Y2gnLCAnY291bnQnXSwgZnVuY3Rpb24gKG1ldGhvZCkge1xuICBDdXJzb3IucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gWW91IGNhbiBvbmx5IG9ic2VydmUgYSB0YWlsYWJsZSBjdXJzb3IuXG4gICAgaWYgKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgY2FsbCBcIiArIG1ldGhvZCArIFwiIG9uIGEgdGFpbGFibGUgY3Vyc29yXCIpO1xuXG4gICAgaWYgKCFzZWxmLl9zeW5jaHJvbm91c0N1cnNvcikge1xuICAgICAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBzZWxmLl9tb25nby5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCB7XG4gICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIFwic2VsZlwiIGFyZ3VtZW50IHRvIGZvckVhY2gvbWFwIGNhbGxiYWNrcyBpcyB0aGVcbiAgICAgICAgICAvLyBDdXJzb3IsIG5vdCB0aGUgU3luY2hyb25vdXNDdXJzb3IuXG4gICAgICAgICAgc2VsZkZvckl0ZXJhdGlvbjogc2VsZixcbiAgICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWVcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yW21ldGhvZF0uYXBwbHkoXG4gICAgICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciwgYXJndW1lbnRzKTtcbiAgfTtcbn0pO1xuXG4vLyBTaW5jZSB3ZSBkb24ndCBhY3R1YWxseSBoYXZlIGEgXCJuZXh0T2JqZWN0XCIgaW50ZXJmYWNlLCB0aGVyZSdzIHJlYWxseSBub1xuLy8gcmVhc29uIHRvIGhhdmUgYSBcInJld2luZFwiIGludGVyZmFjZS4gIEFsbCBpdCBkaWQgd2FzIG1ha2UgbXVsdGlwbGUgY2FsbHNcbi8vIHRvIGZldGNoL21hcC9mb3JFYWNoIHJldHVybiBub3RoaW5nIHRoZSBzZWNvbmQgdGltZS5cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjguMVxuQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbiAoKSB7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtO1xufTtcblxuLy8gV2hlbiB5b3UgY2FsbCBNZXRlb3IucHVibGlzaCgpIHdpdGggYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBDdXJzb3IsIHdlIG5lZWRcbi8vIHRvIHRyYW5zbXV0ZSBpdCBpbnRvIHRoZSBlcXVpdmFsZW50IHN1YnNjcmlwdGlvbi4gIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXRcbi8vIGRvZXMgdGhhdC5cblxuQ3Vyc29yLnByb3RvdHlwZS5fcHVibGlzaEN1cnNvciA9IGZ1bmN0aW9uIChzdWIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xuICByZXR1cm4gTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcihzZWxmLCBzdWIsIGNvbGxlY3Rpb24pO1xufTtcblxuLy8gVXNlZCB0byBndWFyYW50ZWUgdGhhdCBwdWJsaXNoIGZ1bmN0aW9ucyByZXR1cm4gYXQgbW9zdCBvbmUgY3Vyc29yIHBlclxuLy8gY29sbGVjdGlvbi4gUHJpdmF0ZSwgYmVjYXVzZSB3ZSBtaWdodCBsYXRlciBoYXZlIGN1cnNvcnMgdGhhdCBpbmNsdWRlXG4vLyBkb2N1bWVudHMgZnJvbSBtdWx0aXBsZSBjb2xsZWN0aW9ucyBzb21laG93LlxuQ3Vyc29yLnByb3RvdHlwZS5fZ2V0Q29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlID0gZnVuY3Rpb24gKGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMoc2VsZiwgY2FsbGJhY2tzKTtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUub2JzZXJ2ZUNoYW5nZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1ldGhvZHMgPSBbXG4gICAgJ2FkZGVkQXQnLFxuICAgICdhZGRlZCcsXG4gICAgJ2NoYW5nZWRBdCcsXG4gICAgJ2NoYW5nZWQnLFxuICAgICdyZW1vdmVkQXQnLFxuICAgICdyZW1vdmVkJyxcbiAgICAnbW92ZWRUbydcbiAgXTtcbiAgdmFyIG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChjYWxsYmFja3MpO1xuXG4gIC8vIFhYWDogQ2FuIHdlIGZpbmQgb3V0IGlmIGNhbGxiYWNrcyBhcmUgZnJvbSBvYnNlcnZlP1xuICB2YXIgZXhjZXB0aW9uTmFtZSA9ICcgb2JzZXJ2ZS9vYnNlcnZlQ2hhbmdlcyBjYWxsYmFjayc7IFxuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIGlmIChjYWxsYmFja3NbbWV0aG9kXSAmJiB0eXBlb2YgY2FsbGJhY2tzW21ldGhvZF0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFja3NbbWV0aG9kXSA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2tzW21ldGhvZF0sIG1ldGhvZCArIGV4Y2VwdGlvbk5hbWUpO1xuICAgIH1cbiAgfSk7XG4gIFxuICByZXR1cm4gc2VsZi5fbW9uZ28uX29ic2VydmVDaGFuZ2VzKFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IgPSBmdW5jdGlvbihcbiAgICBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUpO1xuICB2YXIgY3Vyc29yT3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG4gIHZhciBtb25nb09wdGlvbnMgPSB7XG4gICAgc29ydDogY3Vyc29yT3B0aW9ucy5zb3J0LFxuICAgIGxpbWl0OiBjdXJzb3JPcHRpb25zLmxpbWl0LFxuICAgIHNraXA6IGN1cnNvck9wdGlvbnMuc2tpcFxuICB9O1xuXG4gIC8vIERvIHdlIHdhbnQgYSB0YWlsYWJsZSBjdXJzb3IgKHdoaWNoIG9ubHkgd29ya3Mgb24gY2FwcGVkIGNvbGxlY3Rpb25zKT9cbiAgaWYgKGN1cnNvck9wdGlvbnMudGFpbGFibGUpIHtcbiAgICAvLyBXZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yLi4uXG4gICAgbW9uZ29PcHRpb25zLnRhaWxhYmxlID0gdHJ1ZTtcbiAgICAvLyAuLi4gYW5kIGZvciB0aGUgc2VydmVyIHRvIHdhaXQgYSBiaXQgaWYgYW55IGdldE1vcmUgaGFzIG5vIGRhdGEgKHJhdGhlclxuICAgIC8vIHRoYW4gbWFraW5nIHVzIHB1dCB0aGUgcmVsZXZhbnQgc2xlZXBzIGluIHRoZSBjbGllbnQpLi4uXG4gICAgbW9uZ29PcHRpb25zLmF3YWl0ZGF0YSA9IHRydWU7XG4gICAgLy8gLi4uIGFuZCB0byBrZWVwIHF1ZXJ5aW5nIHRoZSBzZXJ2ZXIgaW5kZWZpbml0ZWx5IHJhdGhlciB0aGFuIGp1c3QgNSB0aW1lc1xuICAgIC8vIGlmIHRoZXJlJ3Mgbm8gbW9yZSBkYXRhLlxuICAgIG1vbmdvT3B0aW9ucy5udW1iZXJPZlJldHJpZXMgPSAtMTtcbiAgICAvLyBBbmQgaWYgdGhpcyBpcyBvbiB0aGUgb3Bsb2cgY29sbGVjdGlvbiBhbmQgdGhlIGN1cnNvciBzcGVjaWZpZXMgYSAndHMnLFxuICAgIC8vIHRoZW4gc2V0IHRoZSB1bmRvY3VtZW50ZWQgb3Bsb2cgcmVwbGF5IGZsYWcsIHdoaWNoIGRvZXMgYSBzcGVjaWFsIHNjYW4gdG9cbiAgICAvLyBmaW5kIHRoZSBmaXJzdCBkb2N1bWVudCAoaW5zdGVhZCBvZiBjcmVhdGluZyBhbiBpbmRleCBvbiB0cykuIFRoaXMgaXMgYVxuICAgIC8vIHZlcnkgaGFyZC1jb2RlZCBNb25nbyBmbGFnIHdoaWNoIG9ubHkgd29ya3Mgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kXG4gICAgLy8gb25seSB3b3JrcyB3aXRoIHRoZSB0cyBmaWVsZC5cbiAgICBpZiAoY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUgPT09IE9QTE9HX0NPTExFQ1RJT04gJiZcbiAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IudHMpIHtcbiAgICAgIG1vbmdvT3B0aW9ucy5vcGxvZ1JlcGxheSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgdmFyIGRiQ3Vyc29yID0gY29sbGVjdGlvbi5maW5kKFxuICAgIHJlcGxhY2VUeXBlcyhjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIGN1cnNvck9wdGlvbnMuZmllbGRzLCBtb25nb09wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5tYXhUaW1lTVMoY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMpO1xuICB9XG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5oaW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRiQ3Vyc29yID0gZGJDdXJzb3IuaGludChjdXJzb3JPcHRpb25zLmhpbnQpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTeW5jaHJvbm91c0N1cnNvcihkYkN1cnNvciwgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpO1xufTtcblxudmFyIFN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24gKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgc2VsZi5fZGJDdXJzb3IgPSBkYkN1cnNvcjtcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgLy8gVGhlIFwic2VsZlwiIGFyZ3VtZW50IHBhc3NlZCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MuIElmIHdlJ3JlIHdyYXBwZWRcbiAgLy8gaW5zaWRlIGEgdXNlci12aXNpYmxlIEN1cnNvciwgd2Ugd2FudCB0byBwcm92aWRlIHRoZSBvdXRlciBjdXJzb3IhXG4gIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24gPSBvcHRpb25zLnNlbGZGb3JJdGVyYXRpb24gfHwgc2VsZjtcbiAgaWYgKG9wdGlvbnMudXNlVHJhbnNmb3JtICYmIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gbnVsbDtcbiAgfVxuXG4gIC8vIE5lZWQgdG8gc3BlY2lmeSB0aGF0IHRoZSBjYWxsYmFjayBpcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gbmV4dE9iamVjdCxcbiAgLy8gc2luY2Ugb3RoZXJ3aXNlIHdoZW4gd2UgdHJ5IHRvIGNhbGwgaXQgd2l0aCBubyBhcmdzIHRoZSBkcml2ZXIgd2lsbFxuICAvLyBpbnRlcnByZXQgXCJ1bmRlZmluZWRcIiBmaXJzdCBhcmcgYXMgYW4gb3B0aW9ucyBoYXNoIGFuZCBjcmFzaC5cbiAgc2VsZi5fc3luY2hyb25vdXNOZXh0T2JqZWN0ID0gRnV0dXJlLndyYXAoXG4gICAgZGJDdXJzb3IubmV4dE9iamVjdC5iaW5kKGRiQ3Vyc29yKSwgMCk7XG4gIHNlbGYuX3N5bmNocm9ub3VzQ291bnQgPSBGdXR1cmUud3JhcChkYkN1cnNvci5jb3VudC5iaW5kKGRiQ3Vyc29yKSk7XG4gIHNlbGYuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbn07XG5cbl8uZXh0ZW5kKFN5bmNocm9ub3VzQ3Vyc29yLnByb3RvdHlwZSwge1xuICBfbmV4dE9iamVjdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgZG9jID0gc2VsZi5fc3luY2hyb25vdXNOZXh0T2JqZWN0KCkud2FpdCgpO1xuXG4gICAgICBpZiAoIWRvYykgcmV0dXJuIG51bGw7XG4gICAgICBkb2MgPSByZXBsYWNlVHlwZXMoZG9jLCByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvcik7XG5cbiAgICAgIGlmICghc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSAmJiBfLmhhcyhkb2MsICdfaWQnKSkge1xuICAgICAgICAvLyBEaWQgTW9uZ28gZ2l2ZSB1cyBkdXBsaWNhdGUgZG9jdW1lbnRzIGluIHRoZSBzYW1lIGN1cnNvcj8gSWYgc28sXG4gICAgICAgIC8vIGlnbm9yZSB0aGlzIG9uZS4gKERvIHRoaXMgYmVmb3JlIHRoZSB0cmFuc2Zvcm0sIHNpbmNlIHRyYW5zZm9ybSBtaWdodFxuICAgICAgICAvLyByZXR1cm4gc29tZSB1bnJlbGF0ZWQgdmFsdWUuKSBXZSBkb24ndCBkbyB0aGlzIGZvciB0YWlsYWJsZSBjdXJzb3JzLFxuICAgICAgICAvLyBiZWNhdXNlIHdlIHdhbnQgdG8gbWFpbnRhaW4gTygxKSBtZW1vcnkgdXNhZ2UuIEFuZCBpZiB0aGVyZSBpc24ndCBfaWRcbiAgICAgICAgLy8gZm9yIHNvbWUgcmVhc29uIChtYXliZSBpdCdzIHRoZSBvcGxvZyksIHRoZW4gd2UgZG9uJ3QgZG8gdGhpcyBlaXRoZXIuXG4gICAgICAgIC8vIChCZSBjYXJlZnVsIHRvIGRvIHRoaXMgZm9yIGZhbHNleSBidXQgZXhpc3RpbmcgX2lkLCB0aG91Z2guKVxuICAgICAgICBpZiAoc2VsZi5fdmlzaXRlZElkcy5oYXMoZG9jLl9pZCkpIGNvbnRpbnVlO1xuICAgICAgICBzZWxmLl92aXNpdGVkSWRzLnNldChkb2MuX2lkLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGYuX3RyYW5zZm9ybSlcbiAgICAgICAgZG9jID0gc2VsZi5fdHJhbnNmb3JtKGRvYyk7XG5cbiAgICAgIHJldHVybiBkb2M7XG4gICAgfVxuICB9LFxuXG4gIGZvckVhY2g6IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBiZWdpbm5pbmcuXG4gICAgc2VsZi5fcmV3aW5kKCk7XG5cbiAgICAvLyBXZSBpbXBsZW1lbnQgdGhlIGxvb3Agb3Vyc2VsZiBpbnN0ZWFkIG9mIHVzaW5nIHNlbGYuX2RiQ3Vyc29yLmVhY2gsXG4gICAgLy8gYmVjYXVzZSBcImVhY2hcIiB3aWxsIGNhbGwgaXRzIGNhbGxiYWNrIG91dHNpZGUgb2YgYSBmaWJlciB3aGljaCBtYWtlcyBpdFxuICAgIC8vIG11Y2ggbW9yZSBjb21wbGV4IHRvIG1ha2UgdGhpcyBmdW5jdGlvbiBzeW5jaHJvbm91cy5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgZG9jID0gc2VsZi5fbmV4dE9iamVjdCgpO1xuICAgICAgaWYgKCFkb2MpIHJldHVybjtcbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpbmRleCsrLCBzZWxmLl9zZWxmRm9ySXRlcmF0aW9uKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gWFhYIEFsbG93IG92ZXJsYXBwaW5nIGNhbGxiYWNrIGV4ZWN1dGlvbnMgaWYgY2FsbGJhY2sgeWllbGRzLlxuICBtYXA6IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzID0gW107XG4gICAgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGluZGV4KSB7XG4gICAgICByZXMucHVzaChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaW5kZXgsIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9LFxuXG4gIF9yZXdpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBrbm93biB0byBiZSBzeW5jaHJvbm91c1xuICAgIHNlbGYuX2RiQ3Vyc29yLnJld2luZCgpO1xuXG4gICAgc2VsZi5fdmlzaXRlZElkcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9LFxuXG4gIC8vIE1vc3RseSB1c2FibGUgZm9yIHRhaWxhYmxlIGN1cnNvcnMuXG4gIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fZGJDdXJzb3IuY2xvc2UoKTtcbiAgfSxcblxuICBmZXRjaDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5tYXAoXy5pZGVudGl0eSk7XG4gIH0sXG5cbiAgY291bnQ6IGZ1bmN0aW9uIChhcHBseVNraXBMaW1pdCA9IGZhbHNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9zeW5jaHJvbm91c0NvdW50KGFwcGx5U2tpcExpbWl0KS53YWl0KCk7XG4gIH0sXG5cbiAgLy8gVGhpcyBtZXRob2QgaXMgTk9UIHdyYXBwZWQgaW4gQ3Vyc29yLlxuICBnZXRSYXdPYmplY3RzOiBmdW5jdGlvbiAob3JkZXJlZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgcmV0dXJuIHNlbGYuZmV0Y2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlc3VsdHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHNlbGYuZm9yRWFjaChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cbiAgfVxufSk7XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudGFpbCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgZG9jQ2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgdGFpbCBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICB2YXIgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gIHZhciBsYXN0VFM7XG4gIHZhciBsb29wID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2MgPSBudWxsO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jID0gY3Vyc29yLl9uZXh0T2JqZWN0KCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gVGhlcmUncyBubyBnb29kIHdheSB0byBmaWd1cmUgb3V0IGlmIHRoaXMgd2FzIGFjdHVhbGx5IGFuIGVycm9yXG4gICAgICAgIC8vIGZyb20gTW9uZ28uIEFoIHdlbGwuIEJ1dCBlaXRoZXIgd2F5LCB3ZSBuZWVkIHRvIHJldHJ5IHRoZSBjdXJzb3JcbiAgICAgICAgLy8gKHVubGVzcyB0aGUgZmFpbHVyZSB3YXMgYmVjYXVzZSB0aGUgb2JzZXJ2ZSBnb3Qgc3RvcHBlZCkuXG4gICAgICAgIGRvYyA9IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTaW5jZSBjdXJzb3IuX25leHRPYmplY3QgY2FuIHlpZWxkLCB3ZSBuZWVkIHRvIGNoZWNrIGFnYWluIHRvIHNlZSBpZlxuICAgICAgLy8gd2UndmUgYmVlbiBzdG9wcGVkIGJlZm9yZSBjYWxsaW5nIHRoZSBjYWxsYmFjay5cbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgIC8vIElmIGEgdGFpbGFibGUgY3Vyc29yIGNvbnRhaW5zIGEgXCJ0c1wiIGZpZWxkLCB1c2UgaXQgdG8gcmVjcmVhdGUgdGhlXG4gICAgICAgIC8vIGN1cnNvciBvbiBlcnJvci4gKFwidHNcIiBpcyBhIHN0YW5kYXJkIHRoYXQgTW9uZ28gdXNlcyBpbnRlcm5hbGx5IGZvclxuICAgICAgICAvLyB0aGUgb3Bsb2csIGFuZCB0aGVyZSdzIGEgc3BlY2lhbCBmbGFnIHRoYXQgbGV0cyB5b3UgZG8gYmluYXJ5IHNlYXJjaFxuICAgICAgICAvLyBvbiBpdCBpbnN0ZWFkIG9mIG5lZWRpbmcgdG8gdXNlIGFuIGluZGV4LilcbiAgICAgICAgbGFzdFRTID0gZG9jLnRzO1xuICAgICAgICBkb2NDYWxsYmFjayhkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld1NlbGVjdG9yID0gXy5jbG9uZShjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gICAgICAgIGlmIChsYXN0VFMpIHtcbiAgICAgICAgICBuZXdTZWxlY3Rvci50cyA9IHskZ3Q6IGxhc3RUU307XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IobmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgIG5ld1NlbGVjdG9yLFxuICAgICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpKTtcbiAgICAgICAgLy8gTW9uZ28gZmFpbG92ZXIgdGFrZXMgbWFueSBzZWNvbmRzLiAgUmV0cnkgaW4gYSBiaXQuICAoV2l0aG91dCB0aGlzXG4gICAgICAgIC8vIHNldFRpbWVvdXQsIHdlIHBlZyB0aGUgQ1BVIGF0IDEwMCUgYW5kIG5ldmVyIG5vdGljZSB0aGUgYWN0dWFsXG4gICAgICAgIC8vIGZhaWxvdmVyLlxuICAgICAgICBNZXRlb3Iuc2V0VGltZW91dChsb29wLCAxMDApO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgTWV0ZW9yLmRlZmVyKGxvb3ApO1xuXG4gIHJldHVybiB7XG4gICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgICBjdXJzb3IuY2xvc2UoKTtcbiAgICB9XG4gIH07XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vYnNlcnZlQ2hhbmdlcyA9IGZ1bmN0aW9uIChcbiAgICBjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSkge1xuICAgIHJldHVybiBzZWxmLl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlKGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpO1xuICB9XG5cbiAgLy8gWW91IG1heSBub3QgZmlsdGVyIG91dCBfaWQgd2hlbiBvYnNlcnZpbmcgY2hhbmdlcywgYmVjYXVzZSB0aGUgaWQgaXMgYSBjb3JlXG4gIC8vIHBhcnQgb2YgdGhlIG9ic2VydmVDaGFuZ2VzIEFQSS5cbiAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzICYmXG4gICAgICAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMuX2lkID09PSAwIHx8XG4gICAgICAgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMuX2lkID09PSBmYWxzZSkpIHtcbiAgICB0aHJvdyBFcnJvcihcIllvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX1cIik7XG4gIH1cblxuICB2YXIgb2JzZXJ2ZUtleSA9IEVKU09OLnN0cmluZ2lmeShcbiAgICBfLmV4dGVuZCh7b3JkZXJlZDogb3JkZXJlZH0sIGN1cnNvckRlc2NyaXB0aW9uKSk7XG5cbiAgdmFyIG11bHRpcGxleGVyLCBvYnNlcnZlRHJpdmVyO1xuICB2YXIgZmlyc3RIYW5kbGUgPSBmYWxzZTtcblxuICAvLyBGaW5kIGEgbWF0Y2hpbmcgT2JzZXJ2ZU11bHRpcGxleGVyLCBvciBjcmVhdGUgYSBuZXcgb25lLiBUaGlzIG5leHQgYmxvY2sgaXNcbiAgLy8gZ3VhcmFudGVlZCB0byBub3QgeWllbGQgKGFuZCBpdCBkb2Vzbid0IGNhbGwgYW55dGhpbmcgdGhhdCBjYW4gb2JzZXJ2ZSBhXG4gIC8vIG5ldyBxdWVyeSksIHNvIG5vIG90aGVyIGNhbGxzIHRvIHRoaXMgZnVuY3Rpb24gY2FuIGludGVybGVhdmUgd2l0aCBpdC5cbiAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfLmhhcyhzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzLCBvYnNlcnZlS2V5KSkge1xuICAgICAgbXVsdGlwbGV4ZXIgPSBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXJzdEhhbmRsZSA9IHRydWU7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgT2JzZXJ2ZU11bHRpcGxleGVyLlxuICAgICAgbXVsdGlwbGV4ZXIgPSBuZXcgT2JzZXJ2ZU11bHRpcGxleGVyKHtcbiAgICAgICAgb3JkZXJlZDogb3JkZXJlZCxcbiAgICAgICAgb25TdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZGVsZXRlIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV07XG4gICAgICAgICAgb2JzZXJ2ZURyaXZlci5zdG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XSA9IG11bHRpcGxleGVyO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIG9ic2VydmVIYW5kbGUgPSBuZXcgT2JzZXJ2ZUhhbmRsZShtdWx0aXBsZXhlciwgY2FsbGJhY2tzKTtcblxuICBpZiAoZmlyc3RIYW5kbGUpIHtcbiAgICB2YXIgbWF0Y2hlciwgc29ydGVyO1xuICAgIHZhciBjYW5Vc2VPcGxvZyA9IF8uYWxsKFtcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQXQgYSBiYXJlIG1pbmltdW0sIHVzaW5nIHRoZSBvcGxvZyByZXF1aXJlcyB1cyB0byBoYXZlIGFuIG9wbG9nLCB0b1xuICAgICAgICAvLyB3YW50IHVub3JkZXJlZCBjYWxsYmFja3MsIGFuZCB0byBub3Qgd2FudCBhIGNhbGxiYWNrIG9uIHRoZSBwb2xsc1xuICAgICAgICAvLyB0aGF0IHdvbid0IGhhcHBlbi5cbiAgICAgICAgcmV0dXJuIHNlbGYuX29wbG9nSGFuZGxlICYmICFvcmRlcmVkICYmXG4gICAgICAgICAgIWNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzZWxlY3Rvci4gRmFsbCBiYWNrIHRvIHBvbGxpbmcgZm9yXG4gICAgICAgIC8vIHNvbWUgbmV3ZmFuZ2xlZCAkc2VsZWN0b3IgdGhhdCBtaW5pbW9uZ28gZG9lc24ndCBzdXBwb3J0IHlldC5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyAuLi4gYW5kIHRoZSBzZWxlY3RvciBpdHNlbGYgbmVlZHMgdG8gc3VwcG9ydCBvcGxvZy5cbiAgICAgICAgcmV0dXJuIE9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBBbmQgd2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNvcnQsIGlmIGFueS4gIGVnLCBjYW4ndCBiZVxuICAgICAgICAvLyB7JG5hdHVyYWw6IDF9LlxuICAgICAgICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuc29ydClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb3J0ZXIgPSBuZXcgTWluaW1vbmdvLlNvcnRlcihjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBtYXRjaGVyOiBtYXRjaGVyIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gWFhYIG1ha2UgYWxsIGNvbXBpbGF0aW9uIGVycm9ycyBNaW5pbW9uZ29FcnJvciBvciBzb21ldGhpbmdcbiAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XSwgZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYoKTsgfSk7ICAvLyBpbnZva2UgZWFjaCBmdW5jdGlvblxuXG4gICAgdmFyIGRyaXZlckNsYXNzID0gY2FuVXNlT3Bsb2cgPyBPcGxvZ09ic2VydmVEcml2ZXIgOiBQb2xsaW5nT2JzZXJ2ZURyaXZlcjtcbiAgICBvYnNlcnZlRHJpdmVyID0gbmV3IGRyaXZlckNsYXNzKHtcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uOiBjdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIG1vbmdvSGFuZGxlOiBzZWxmLFxuICAgICAgbXVsdGlwbGV4ZXI6IG11bHRpcGxleGVyLFxuICAgICAgb3JkZXJlZDogb3JkZXJlZCxcbiAgICAgIG1hdGNoZXI6IG1hdGNoZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgIHNvcnRlcjogc29ydGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICBfdGVzdE9ubHlQb2xsQ2FsbGJhY2s6IGNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2tcbiAgICB9KTtcblxuICAgIC8vIFRoaXMgZmllbGQgaXMgb25seSBzZXQgZm9yIHVzZSBpbiB0ZXN0cy5cbiAgICBtdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlciA9IG9ic2VydmVEcml2ZXI7XG4gIH1cblxuICAvLyBCbG9ja3MgdW50aWwgdGhlIGluaXRpYWwgYWRkcyBoYXZlIGJlZW4gc2VudC5cbiAgbXVsdGlwbGV4ZXIuYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKG9ic2VydmVIYW5kbGUpO1xuXG4gIHJldHVybiBvYnNlcnZlSGFuZGxlO1xufTtcblxuLy8gTGlzdGVuIGZvciB0aGUgaW52YWxpZGF0aW9uIG1lc3NhZ2VzIHRoYXQgd2lsbCB0cmlnZ2VyIHVzIHRvIHBvbGwgdGhlXG4vLyBkYXRhYmFzZSBmb3IgY2hhbmdlcy4gSWYgdGhpcyBzZWxlY3RvciBzcGVjaWZpZXMgc3BlY2lmaWMgSURzLCBzcGVjaWZ5IHRoZW1cbi8vIGhlcmUsIHNvIHRoYXQgdXBkYXRlcyB0byBkaWZmZXJlbnQgc3BlY2lmaWMgSURzIGRvbid0IGNhdXNlIHVzIHRvIHBvbGwuXG4vLyBsaXN0ZW5DYWxsYmFjayBpcyB0aGUgc2FtZSBraW5kIG9mIChub3RpZmljYXRpb24sIGNvbXBsZXRlKSBjYWxsYmFjayBwYXNzZWRcbi8vIHRvIEludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3Rlbi5cblxubGlzdGVuQWxsID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBsaXN0ZW5DYWxsYmFjaykge1xuICB2YXIgbGlzdGVuZXJzID0gW107XG4gIGZvckVhY2hUcmlnZ2VyKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIGxpc3RlbmVycy5wdXNoKEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuKFxuICAgICAgdHJpZ2dlciwgbGlzdGVuQ2FsbGJhY2spKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufTtcblxuZm9yRWFjaFRyaWdnZXIgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIHRyaWdnZXJDYWxsYmFjaykge1xuICB2YXIga2V5ID0ge2NvbGxlY3Rpb246IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lfTtcbiAgdmFyIHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihcbiAgICBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gIGlmIChzcGVjaWZpY0lkcykge1xuICAgIF8uZWFjaChzcGVjaWZpY0lkcywgZnVuY3Rpb24gKGlkKSB7XG4gICAgICB0cmlnZ2VyQ2FsbGJhY2soXy5leHRlbmQoe2lkOiBpZH0sIGtleSkpO1xuICAgIH0pO1xuICAgIHRyaWdnZXJDYWxsYmFjayhfLmV4dGVuZCh7ZHJvcENvbGxlY3Rpb246IHRydWUsIGlkOiBudWxsfSwga2V5KSk7XG4gIH0gZWxzZSB7XG4gICAgdHJpZ2dlckNhbGxiYWNrKGtleSk7XG4gIH1cbiAgLy8gRXZlcnlvbmUgY2FyZXMgYWJvdXQgdGhlIGRhdGFiYXNlIGJlaW5nIGRyb3BwZWQuXG4gIHRyaWdnZXJDYWxsYmFjayh7IGRyb3BEYXRhYmFzZTogdHJ1ZSB9KTtcbn07XG5cbi8vIG9ic2VydmVDaGFuZ2VzIGZvciB0YWlsYWJsZSBjdXJzb3JzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbi8vXG4vLyBTb21lIGRpZmZlcmVuY2VzIGZyb20gbm9ybWFsIGN1cnNvcnM6XG4vLyAgIC0gV2lsbCBuZXZlciBwcm9kdWNlIGFueXRoaW5nIG90aGVyIHRoYW4gJ2FkZGVkJyBvciAnYWRkZWRCZWZvcmUnLiBJZiB5b3Vcbi8vICAgICBkbyB1cGRhdGUgYSBkb2N1bWVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gcHJvZHVjZWQsIHRoaXMgd2lsbCBub3Qgbm90aWNlXG4vLyAgICAgaXQuXG4vLyAgIC0gSWYgeW91IGRpc2Nvbm5lY3QgYW5kIHJlY29ubmVjdCBmcm9tIE1vbmdvLCBpdCB3aWxsIGVzc2VudGlhbGx5IHJlc3RhcnRcbi8vICAgICB0aGUgcXVlcnksIHdoaWNoIHdpbGwgbGVhZCB0byBkdXBsaWNhdGUgcmVzdWx0cy4gVGhpcyBpcyBwcmV0dHkgYmFkLFxuLy8gICAgIGJ1dCBpZiB5b3UgaW5jbHVkZSBhIGZpZWxkIGNhbGxlZCAndHMnIHdoaWNoIGlzIGluc2VydGVkIGFzXG4vLyAgICAgbmV3IE1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wKDAsIDApICh3aGljaCBpcyBpbml0aWFsaXplZCB0byB0aGVcbi8vICAgICBjdXJyZW50IE1vbmdvLXN0eWxlIHRpbWVzdGFtcCksIHdlJ2xsIGJlIGFibGUgdG8gZmluZCB0aGUgcGxhY2UgdG9cbi8vICAgICByZXN0YXJ0IHByb3Blcmx5LiAoVGhpcyBmaWVsZCBpcyBzcGVjaWZpY2FsbHkgdW5kZXJzdG9vZCBieSBNb25nbyB3aXRoIGFuXG4vLyAgICAgb3B0aW1pemF0aW9uIHdoaWNoIGFsbG93cyBpdCB0byBmaW5kIHRoZSByaWdodCBwbGFjZSB0byBzdGFydCB3aXRob3V0XG4vLyAgICAgYW4gaW5kZXggb24gdHMuIEl0J3MgaG93IHRoZSBvcGxvZyB3b3Jrcy4pXG4vLyAgIC0gTm8gY2FsbGJhY2tzIGFyZSB0cmlnZ2VyZWQgc3luY2hyb25vdXNseSB3aXRoIHRoZSBjYWxsICh0aGVyZSdzIG5vXG4vLyAgICAgZGlmZmVyZW50aWF0aW9uIGJldHdlZW4gXCJpbml0aWFsIGRhdGFcIiBhbmQgXCJsYXRlciBjaGFuZ2VzXCI7IGV2ZXJ5dGhpbmdcbi8vICAgICB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5IGdldHMgc2VudCBhc3luY2hyb25vdXNseSkuXG4vLyAgIC0gRGUtZHVwbGljYXRpb24gaXMgbm90IGltcGxlbWVudGVkLlxuLy8gICAtIERvZXMgbm90IHlldCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS4gUHJvYmFibHksIHRoaXMgc2hvdWxkIHdvcmsgYnlcbi8vICAgICBpZ25vcmluZyByZW1vdmVzICh3aGljaCBkb24ndCB3b3JrIG9uIGNhcHBlZCBjb2xsZWN0aW9ucykgYW5kIHVwZGF0ZXNcbi8vICAgICAod2hpY2ggZG9uJ3QgYWZmZWN0IHRhaWxhYmxlIGN1cnNvcnMpLCBhbmQganVzdCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBJRFxuLy8gICAgIG9mIHRoZSBpbnNlcnRlZCBvYmplY3QsIGFuZCBjbG9zaW5nIHRoZSB3cml0ZSBmZW5jZSBvbmNlIHlvdSBnZXQgdG8gdGhhdFxuLy8gICAgIElEIChvciB0aW1lc3RhbXA/KS4gIFRoaXMgZG9lc24ndCB3b3JrIHdlbGwgaWYgdGhlIGRvY3VtZW50IGRvZXNuJ3QgbWF0Y2hcbi8vICAgICB0aGUgcXVlcnksIHRob3VnaC4gIE9uIHRoZSBvdGhlciBoYW5kLCB0aGUgd3JpdGUgZmVuY2UgY2FuIGNsb3NlXG4vLyAgICAgaW1tZWRpYXRlbHkgaWYgaXQgZG9lcyBub3QgbWF0Y2ggdGhlIHF1ZXJ5LiBTbyBpZiB3ZSB0cnVzdCBtaW5pbW9uZ29cbi8vICAgICBlbm91Z2ggdG8gYWNjdXJhdGVseSBldmFsdWF0ZSB0aGUgcXVlcnkgYWdhaW5zdCB0aGUgd3JpdGUgZmVuY2UsIHdlXG4vLyAgICAgc2hvdWxkIGJlIGFibGUgdG8gZG8gdGhpcy4uLiAgT2YgY291cnNlLCBtaW5pbW9uZ28gZG9lc24ndCBldmVuIHN1cHBvcnRcbi8vICAgICBNb25nbyBUaW1lc3RhbXBzIHlldC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGFpbGFibGUgY3Vyc29ycyBvbmx5IGV2ZXIgY2FsbCBhZGRlZC9hZGRlZEJlZm9yZSBjYWxsYmFja3MsIHNvIGl0J3MgYW5cbiAgLy8gZXJyb3IgaWYgeW91IGRpZG4ndCBwcm92aWRlIHRoZW0uXG4gIGlmICgob3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB8fFxuICAgICAgKCFvcmRlcmVkICYmICFjYWxsYmFja3MuYWRkZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgb2JzZXJ2ZSBhbiBcIiArIChvcmRlcmVkID8gXCJvcmRlcmVkXCIgOiBcInVub3JkZXJlZFwiKVxuICAgICAgICAgICAgICAgICAgICArIFwiIHRhaWxhYmxlIGN1cnNvciB3aXRob3V0IGEgXCJcbiAgICAgICAgICAgICAgICAgICAgKyAob3JkZXJlZCA/IFwiYWRkZWRCZWZvcmVcIiA6IFwiYWRkZWRcIikgKyBcIiBjYWxsYmFja1wiKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnRhaWwoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgIGRlbGV0ZSBkb2MuX2lkO1xuICAgIC8vIFRoZSB0cyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBkZXRhaWwuIEhpZGUgaXQuXG4gICAgZGVsZXRlIGRvYy50cztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlKGlkLCBkb2MsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFja3MuYWRkZWQoaWQsIGRvYyk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIFhYWCBXZSBwcm9iYWJseSBuZWVkIHRvIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGV4cG9zZSB0aGlzLiBSaWdodCBub3dcbi8vIGl0J3Mgb25seSB1c2VkIGJ5IHRlc3RzLCBidXQgaW4gZmFjdCB5b3UgbmVlZCBpdCBpbiBub3JtYWxcbi8vIG9wZXJhdGlvbiB0byBpbnRlcmFjdCB3aXRoIGNhcHBlZCBjb2xsZWN0aW9ucy5cbk1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wID0gTW9uZ29EQi5UaW1lc3RhbXA7XG5cbk1vbmdvSW50ZXJuYWxzLkNvbm5lY3Rpb24gPSBNb25nb0Nvbm5lY3Rpb247XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuT1BMT0dfQ09MTEVDVElPTiA9ICdvcGxvZy5ycyc7XG5cbnZhciBUT09fRkFSX0JFSElORCA9IHByb2Nlc3MuZW52Lk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCB8fCAyMDAwO1xuXG52YXIgc2hvd1RTID0gZnVuY3Rpb24gKHRzKSB7XG4gIHJldHVybiBcIlRpbWVzdGFtcChcIiArIHRzLmdldEhpZ2hCaXRzKCkgKyBcIiwgXCIgKyB0cy5nZXRMb3dCaXRzKCkgKyBcIilcIjtcbn07XG5cbmlkRm9yT3AgPSBmdW5jdGlvbiAob3ApIHtcbiAgaWYgKG9wLm9wID09PSAnZCcpXG4gICAgcmV0dXJuIG9wLm8uX2lkO1xuICBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKVxuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICd1JylcbiAgICByZXR1cm4gb3AubzIuX2lkO1xuICBlbHNlIGlmIChvcC5vcCA9PT0gJ2MnKVxuICAgIHRocm93IEVycm9yKFwiT3BlcmF0b3IgJ2MnIGRvZXNuJ3Qgc3VwcGx5IGFuIG9iamVjdCB3aXRoIGlkOiBcIiArXG4gICAgICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KG9wKSk7XG4gIGVsc2VcbiAgICB0aHJvdyBFcnJvcihcIlVua25vd24gb3A6IFwiICsgRUpTT04uc3RyaW5naWZ5KG9wKSk7XG59O1xuXG5PcGxvZ0hhbmRsZSA9IGZ1bmN0aW9uIChvcGxvZ1VybCwgZGJOYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fb3Bsb2dVcmwgPSBvcGxvZ1VybDtcbiAgc2VsZi5fZGJOYW1lID0gZGJOYW1lO1xuXG4gIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiA9IG51bGw7XG4gIHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBudWxsO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX3RhaWxIYW5kbGUgPSBudWxsO1xuICBzZWxmLl9yZWFkeUZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcbiAgc2VsZi5fY3Jvc3NiYXIgPSBuZXcgRERQU2VydmVyLl9Dcm9zc2Jhcih7XG4gICAgZmFjdFBhY2thZ2U6IFwibW9uZ28tbGl2ZWRhdGFcIiwgZmFjdE5hbWU6IFwib3Bsb2ctd2F0Y2hlcnNcIlxuICB9KTtcbiAgc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IgPSB7XG4gICAgbnM6IG5ldyBSZWdFeHAoJ14nICsgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoc2VsZi5fZGJOYW1lKSArICdcXFxcLicpLFxuICAgICRvcjogW1xuICAgICAgeyBvcDogeyRpbjogWydpJywgJ3UnLCAnZCddfSB9LFxuICAgICAgLy8gZHJvcCBjb2xsZWN0aW9uXG4gICAgICB7IG9wOiAnYycsICdvLmRyb3AnOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgeyBvcDogJ2MnLCAnby5kcm9wRGF0YWJhc2UnOiAxIH0sXG4gICAgXVxuICB9O1xuXG4gIC8vIERhdGEgc3RydWN0dXJlcyB0byBzdXBwb3J0IHdhaXRVbnRpbENhdWdodFVwKCkuIEVhY2ggb3Bsb2cgZW50cnkgaGFzIGFcbiAgLy8gTW9uZ29UaW1lc3RhbXAgb2JqZWN0IG9uIGl0ICh3aGljaCBpcyBub3QgdGhlIHNhbWUgYXMgYSBEYXRlIC0tLSBpdCdzIGFcbiAgLy8gY29tYmluYXRpb24gb2YgdGltZSBhbmQgYW4gaW5jcmVtZW50aW5nIGNvdW50ZXI7IHNlZVxuICAvLyBodHRwOi8vZG9jcy5tb25nb2RiLm9yZy9tYW51YWwvcmVmZXJlbmNlL2Jzb24tdHlwZXMvI3RpbWVzdGFtcHMpLlxuICAvL1xuICAvLyBfY2F0Y2hpbmdVcEZ1dHVyZXMgaXMgYW4gYXJyYXkgb2Yge3RzOiBNb25nb1RpbWVzdGFtcCwgZnV0dXJlOiBGdXR1cmV9XG4gIC8vIG9iamVjdHMsIHNvcnRlZCBieSBhc2NlbmRpbmcgdGltZXN0YW1wLiBfbGFzdFByb2Nlc3NlZFRTIGlzIHRoZVxuICAvLyBNb25nb1RpbWVzdGFtcCBvZiB0aGUgbGFzdCBvcGxvZyBlbnRyeSB3ZSd2ZSBwcm9jZXNzZWQuXG4gIC8vXG4gIC8vIEVhY2ggdGltZSB3ZSBjYWxsIHdhaXRVbnRpbENhdWdodFVwLCB3ZSB0YWtlIGEgcGVlayBhdCB0aGUgZmluYWwgb3Bsb2dcbiAgLy8gZW50cnkgaW4gdGhlIGRiLiAgSWYgd2UndmUgYWxyZWFkeSBwcm9jZXNzZWQgaXQgKGllLCBpdCBpcyBub3QgZ3JlYXRlciB0aGFuXG4gIC8vIF9sYXN0UHJvY2Vzc2VkVFMpLCB3YWl0VW50aWxDYXVnaHRVcCBpbW1lZGlhdGVseSByZXR1cm5zLiBPdGhlcndpc2UsXG4gIC8vIHdhaXRVbnRpbENhdWdodFVwIG1ha2VzIGEgbmV3IEZ1dHVyZSBhbmQgaW5zZXJ0cyBpdCBhbG9uZyB3aXRoIHRoZSBmaW5hbFxuICAvLyB0aW1lc3RhbXAgZW50cnkgdGhhdCBpdCByZWFkLCBpbnRvIF9jYXRjaGluZ1VwRnV0dXJlcy4gd2FpdFVudGlsQ2F1Z2h0VXBcbiAgLy8gdGhlbiB3YWl0cyBvbiB0aGF0IGZ1dHVyZSwgd2hpY2ggaXMgcmVzb2x2ZWQgb25jZSBfbGFzdFByb2Nlc3NlZFRTIGlzXG4gIC8vIGluY3JlbWVudGVkIHRvIGJlIHBhc3QgaXRzIHRpbWVzdGFtcCBieSB0aGUgd29ya2VyIGZpYmVyLlxuICAvL1xuICAvLyBYWFggdXNlIGEgcHJpb3JpdHkgcXVldWUgb3Igc29tZXRoaW5nIGVsc2UgdGhhdCdzIGZhc3RlciB0aGFuIGFuIGFycmF5XG4gIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzID0gW107XG4gIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IG51bGw7XG5cbiAgc2VsZi5fb25Ta2lwcGVkRW50cmllc0hvb2sgPSBuZXcgSG9vayh7XG4gICAgZGVidWdQcmludEV4Y2VwdGlvbnM6IFwib25Ta2lwcGVkRW50cmllcyBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIHNlbGYuX2VudHJ5UXVldWUgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG4gIHNlbGYuX3dvcmtlckFjdGl2ZSA9IGZhbHNlO1xuXG4gIHNlbGYuX3N0YXJ0VGFpbGluZygpO1xufTtcblxuXy5leHRlbmQoT3Bsb2dIYW5kbGUucHJvdG90eXBlLCB7XG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgaWYgKHNlbGYuX3RhaWxIYW5kbGUpXG4gICAgICBzZWxmLl90YWlsSGFuZGxlLnN0b3AoKTtcbiAgICAvLyBYWFggc2hvdWxkIGNsb3NlIGNvbm5lY3Rpb25zIHRvb1xuICB9LFxuICBvbk9wbG9nRW50cnk6IGZ1bmN0aW9uICh0cmlnZ2VyLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvbk9wbG9nRW50cnkgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuXG4gICAgLy8gQ2FsbGluZyBvbk9wbG9nRW50cnkgcmVxdWlyZXMgdXMgdG8gd2FpdCBmb3IgdGhlIHRhaWxpbmcgdG8gYmUgcmVhZHkuXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuXG4gICAgdmFyIG9yaWdpbmFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gWFhYIGNhbiB3ZSBhdm9pZCB0aGlzIGNsb25lIGJ5IG1ha2luZyBvcGxvZy5qcyBjYXJlZnVsP1xuICAgICAgb3JpZ2luYWxDYWxsYmFjayhFSlNPTi5jbG9uZShub3RpZmljYXRpb24pKTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRXJyb3IgaW4gb3Bsb2cgY2FsbGJhY2tcIiwgZXJyLnN0YWNrKTtcbiAgICB9KTtcbiAgICB2YXIgbGlzdGVuSGFuZGxlID0gc2VsZi5fY3Jvc3NiYXIubGlzdGVuKHRyaWdnZXIsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBsaXN0ZW5IYW5kbGUuc3RvcCgpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG4gIC8vIFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBhbnkgdGltZSB3ZSBza2lwIG9wbG9nIGVudHJpZXMgKGVnLFxuICAvLyBiZWNhdXNlIHdlIGFyZSB0b28gZmFyIGJlaGluZCkuXG4gIG9uU2tpcHBlZEVudHJpZXM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvblNraXBwZWRFbnRyaWVzIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcbiAgICByZXR1cm4gc2VsZi5fb25Ta2lwcGVkRW50cmllc0hvb2sucmVnaXN0ZXIoY2FsbGJhY2spO1xuICB9LFxuICAvLyBDYWxscyBgY2FsbGJhY2tgIG9uY2UgdGhlIG9wbG9nIGhhcyBiZWVuIHByb2Nlc3NlZCB1cCB0byBhIHBvaW50IHRoYXQgaXNcbiAgLy8gcm91Z2hseSBcIm5vd1wiOiBzcGVjaWZpY2FsbHksIG9uY2Ugd2UndmUgcHJvY2Vzc2VkIGFsbCBvcHMgdGhhdCBhcmVcbiAgLy8gY3VycmVudGx5IHZpc2libGUuXG4gIC8vIFhYWCBiZWNvbWUgY29udmluY2VkIHRoYXQgdGhpcyBpcyBhY3R1YWxseSBzYWZlIGV2ZW4gaWYgb3Bsb2dDb25uZWN0aW9uXG4gIC8vIGlzIHNvbWUga2luZCBvZiBwb29sXG4gIHdhaXRVbnRpbENhdWdodFVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIHdhaXRVbnRpbENhdWdodFVwIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcblxuICAgIC8vIENhbGxpbmcgd2FpdFVudGlsQ2F1Z2h0VXAgcmVxdXJpZXMgdXMgdG8gd2FpdCBmb3IgdGhlIG9wbG9nIGNvbm5lY3Rpb24gdG9cbiAgICAvLyBiZSByZWFkeS5cbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG4gICAgdmFyIGxhc3RFbnRyeTtcblxuICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBtYWtlIHRoZSBzZWxlY3RvciBhdCBsZWFzdCBhcyByZXN0cmljdGl2ZSBhcyB0aGUgYWN0dWFsXG4gICAgICAvLyB0YWlsaW5nIHNlbGVjdG9yIChpZSwgd2UgbmVlZCB0byBzcGVjaWZ5IHRoZSBEQiBuYW1lKSBvciBlbHNlIHdlIG1pZ2h0XG4gICAgICAvLyBmaW5kIGEgVFMgdGhhdCB3b24ndCBzaG93IHVwIGluIHRoZSBhY3R1YWwgdGFpbCBzdHJlYW0uXG4gICAgICB0cnkge1xuICAgICAgICBsYXN0RW50cnkgPSBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgICAgICBPUExPR19DT0xMRUNUSU9OLCBzZWxmLl9iYXNlT3Bsb2dTZWxlY3RvcixcbiAgICAgICAgICB7ZmllbGRzOiB7dHM6IDF9LCBzb3J0OiB7JG5hdHVyYWw6IC0xfX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRHVyaW5nIGZhaWxvdmVyIChlZykgaWYgd2UgZ2V0IGFuIGV4Y2VwdGlvbiB3ZSBzaG91bGQgbG9nIGFuZCByZXRyeVxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGNyYXNoaW5nLlxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSByZWFkaW5nIGxhc3QgZW50cnk6IFwiICsgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKCFsYXN0RW50cnkpIHtcbiAgICAgIC8vIFJlYWxseSwgbm90aGluZyBpbiB0aGUgb3Bsb2c/IFdlbGwsIHdlJ3ZlIHByb2Nlc3NlZCBldmVyeXRoaW5nLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB0cyA9IGxhc3RFbnRyeS50cztcbiAgICBpZiAoIXRzKVxuICAgICAgdGhyb3cgRXJyb3IoXCJvcGxvZyBlbnRyeSB3aXRob3V0IHRzOiBcIiArIEVKU09OLnN0cmluZ2lmeShsYXN0RW50cnkpKTtcblxuICAgIGlmIChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgJiYgdHMubGVzc1RoYW5PckVxdWFsKHNlbGYuX2xhc3RQcm9jZXNzZWRUUykpIHtcbiAgICAgIC8vIFdlJ3ZlIGFscmVhZHkgY2F1Z2h0IHVwIHRvIGhlcmUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBJbnNlcnQgdGhlIGZ1dHVyZSBpbnRvIG91ciBsaXN0LiBBbG1vc3QgYWx3YXlzLCB0aGlzIHdpbGwgYmUgYXQgdGhlIGVuZCxcbiAgICAvLyBidXQgaXQncyBjb25jZWl2YWJsZSB0aGF0IGlmIHdlIGZhaWwgb3ZlciBmcm9tIG9uZSBwcmltYXJ5IHRvIGFub3RoZXIsXG4gICAgLy8gdGhlIG9wbG9nIGVudHJpZXMgd2Ugc2VlIHdpbGwgZ28gYmFja3dhcmRzLlxuICAgIHZhciBpbnNlcnRBZnRlciA9IHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLmxlbmd0aDtcbiAgICB3aGlsZSAoaW5zZXJ0QWZ0ZXIgLSAxID4gMCAmJiBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlc1tpbnNlcnRBZnRlciAtIDFdLnRzLmdyZWF0ZXJUaGFuKHRzKSkge1xuICAgICAgaW5zZXJ0QWZ0ZXItLTtcbiAgICB9XG4gICAgdmFyIGYgPSBuZXcgRnV0dXJlO1xuICAgIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLnNwbGljZShpbnNlcnRBZnRlciwgMCwge3RzOiB0cywgZnV0dXJlOiBmfSk7XG4gICAgZi53YWl0KCk7XG4gIH0sXG4gIF9zdGFydFRhaWxpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB0aGF0IHdlJ3JlIHRhbGtpbmcgdG8gdGhlIGxvY2FsIGRhdGFiYXNlLlxuICAgIHZhciBtb25nb2RiVXJpID0gTnBtLnJlcXVpcmUoJ21vbmdvZGItdXJpJyk7XG4gICAgaWYgKG1vbmdvZGJVcmkucGFyc2Uoc2VsZi5fb3Bsb2dVcmwpLmRhdGFiYXNlICE9PSAnbG9jYWwnKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJhIE1vbmdvIHJlcGxpY2Egc2V0XCIpO1xuICAgIH1cblxuICAgIC8vIFdlIG1ha2UgdHdvIHNlcGFyYXRlIGNvbm5lY3Rpb25zIHRvIE1vbmdvLiBUaGUgTm9kZSBNb25nbyBkcml2ZXJcbiAgICAvLyBpbXBsZW1lbnRzIGEgbmFpdmUgcm91bmQtcm9iaW4gY29ubmVjdGlvbiBwb29sOiBlYWNoIFwiY29ubmVjdGlvblwiIGlzIGFcbiAgICAvLyBwb29sIG9mIHNldmVyYWwgKDUgYnkgZGVmYXVsdCkgVENQIGNvbm5lY3Rpb25zLCBhbmQgZWFjaCByZXF1ZXN0IGlzXG4gICAgLy8gcm90YXRlZCB0aHJvdWdoIHRoZSBwb29scy4gVGFpbGFibGUgY3Vyc29yIHF1ZXJpZXMgYmxvY2sgb24gdGhlIHNlcnZlclxuICAgIC8vIHVudGlsIHRoZXJlIGlzIHNvbWUgZGF0YSB0byByZXR1cm4gKG9yIHVudGlsIGEgZmV3IHNlY29uZHMgaGF2ZVxuICAgIC8vIHBhc3NlZCkuIFNvIGlmIHRoZSBjb25uZWN0aW9uIHBvb2wgdXNlZCBmb3IgdGFpbGluZyBjdXJzb3JzIGlzIHRoZSBzYW1lXG4gICAgLy8gcG9vbCB1c2VkIGZvciBvdGhlciBxdWVyaWVzLCB0aGUgb3RoZXIgcXVlcmllcyB3aWxsIGJlIGRlbGF5ZWQgYnkgc2Vjb25kc1xuICAgIC8vIDEvNSBvZiB0aGUgdGltZS5cbiAgICAvL1xuICAgIC8vIFRoZSB0YWlsIGNvbm5lY3Rpb24gd2lsbCBvbmx5IGV2ZXIgYmUgcnVubmluZyBhIHNpbmdsZSB0YWlsIGNvbW1hbmQsIHNvXG4gICAgLy8gaXQgb25seSBuZWVkcyB0byBtYWtlIG9uZSB1bmRlcmx5aW5nIFRDUCBjb25uZWN0aW9uLlxuICAgIHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgc2VsZi5fb3Bsb2dVcmwsIHtwb29sU2l6ZTogMX0pO1xuICAgIC8vIFhYWCBiZXR0ZXIgZG9jcywgYnV0OiBpdCdzIHRvIGdldCBtb25vdG9uaWMgcmVzdWx0c1xuICAgIC8vIFhYWCBpcyBpdCBzYWZlIHRvIHNheSBcImlmIHRoZXJlJ3MgYW4gaW4gZmxpZ2h0IHF1ZXJ5LCBqdXN0IHVzZSBpdHNcbiAgICAvLyAgICAgcmVzdWx0c1wiPyBJIGRvbid0IHRoaW5rIHNvIGJ1dCBzaG91bGQgY29uc2lkZXIgdGhhdFxuICAgIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiA9IG5ldyBNb25nb0Nvbm5lY3Rpb24oXG4gICAgICBzZWxmLl9vcGxvZ1VybCwge3Bvb2xTaXplOiAxfSk7XG5cbiAgICAvLyBOb3csIG1ha2Ugc3VyZSB0aGF0IHRoZXJlIGFjdHVhbGx5IGlzIGEgcmVwbCBzZXQgaGVyZS4gSWYgbm90LCBvcGxvZ1xuICAgIC8vIHRhaWxpbmcgd29uJ3QgZXZlciBmaW5kIGFueXRoaW5nIVxuICAgIC8vIE1vcmUgb24gdGhlIGlzTWFzdGVyRG9jXG4gICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvY29tbWFuZC9pc01hc3Rlci9cbiAgICB2YXIgZiA9IG5ldyBGdXR1cmU7XG4gICAgc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmRiLmFkbWluKCkuY29tbWFuZChcbiAgICAgIHsgaXNtYXN0ZXI6IDEgfSwgZi5yZXNvbHZlcigpKTtcbiAgICB2YXIgaXNNYXN0ZXJEb2MgPSBmLndhaXQoKTtcblxuICAgIGlmICghKGlzTWFzdGVyRG9jICYmIGlzTWFzdGVyRG9jLnNldE5hbWUpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJhIE1vbmdvIHJlcGxpY2Egc2V0XCIpO1xuICAgIH1cblxuICAgIC8vIEZpbmQgdGhlIGxhc3Qgb3Bsb2cgZW50cnkuXG4gICAgdmFyIGxhc3RPcGxvZ0VudHJ5ID0gc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICBPUExPR19DT0xMRUNUSU9OLCB7fSwge3NvcnQ6IHskbmF0dXJhbDogLTF9LCBmaWVsZHM6IHt0czogMX19KTtcblxuICAgIHZhciBvcGxvZ1NlbGVjdG9yID0gXy5jbG9uZShzZWxmLl9iYXNlT3Bsb2dTZWxlY3Rvcik7XG4gICAgaWYgKGxhc3RPcGxvZ0VudHJ5KSB7XG4gICAgICAvLyBTdGFydCBhZnRlciB0aGUgbGFzdCBlbnRyeSB0aGF0IGN1cnJlbnRseSBleGlzdHMuXG4gICAgICBvcGxvZ1NlbGVjdG9yLnRzID0geyRndDogbGFzdE9wbG9nRW50cnkudHN9O1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBjYWxscyB0byBjYWxsV2hlblByb2Nlc3NlZExhdGVzdCBiZWZvcmUgYW55IG90aGVyXG4gICAgICAvLyBvcGxvZyBlbnRyaWVzIHNob3cgdXAsIGFsbG93IGNhbGxXaGVuUHJvY2Vzc2VkTGF0ZXN0IHRvIGNhbGwgaXRzXG4gICAgICAvLyBjYWxsYmFjayBpbW1lZGlhdGVseS5cbiAgICAgIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IGxhc3RPcGxvZ0VudHJ5LnRzO1xuICAgIH1cblxuICAgIHZhciBjdXJzb3JEZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgIE9QTE9HX0NPTExFQ1RJT04sIG9wbG9nU2VsZWN0b3IsIHt0YWlsYWJsZTogdHJ1ZX0pO1xuXG4gICAgc2VsZi5fdGFpbEhhbmRsZSA9IHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24udGFpbChcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHNlbGYuX2VudHJ5UXVldWUucHVzaChkb2MpO1xuICAgICAgICBzZWxmLl9tYXliZVN0YXJ0V29ya2VyKCk7XG4gICAgICB9XG4gICAgKTtcbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS5yZXR1cm4oKTtcbiAgfSxcblxuICBfbWF5YmVTdGFydFdvcmtlcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fd29ya2VyQWN0aXZlKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3dvcmtlckFjdGl2ZSA9IHRydWU7XG4gICAgTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdoaWxlICghIHNlbGYuX3N0b3BwZWQgJiYgISBzZWxmLl9lbnRyeVF1ZXVlLmlzRW1wdHkoKSkge1xuICAgICAgICAgIC8vIEFyZSB3ZSB0b28gZmFyIGJlaGluZD8gSnVzdCB0ZWxsIG91ciBvYnNlcnZlcnMgdGhhdCB0aGV5IG5lZWQgdG9cbiAgICAgICAgICAvLyByZXBvbGwsIGFuZCBkcm9wIG91ciBxdWV1ZS5cbiAgICAgICAgICBpZiAoc2VsZi5fZW50cnlRdWV1ZS5sZW5ndGggPiBUT09fRkFSX0JFSElORCkge1xuICAgICAgICAgICAgdmFyIGxhc3RFbnRyeSA9IHNlbGYuX2VudHJ5UXVldWUucG9wKCk7XG4gICAgICAgICAgICBzZWxmLl9lbnRyeVF1ZXVlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIHNlbGYuX29uU2tpcHBlZEVudHJpZXNIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEZyZWUgYW55IHdhaXRVbnRpbENhdWdodFVwKCkgY2FsbHMgdGhhdCB3ZXJlIHdhaXRpbmcgZm9yIHVzIHRvXG4gICAgICAgICAgICAvLyBwYXNzIHNvbWV0aGluZyB0aGF0IHdlIGp1c3Qgc2tpcHBlZC5cbiAgICAgICAgICAgIHNlbGYuX3NldExhc3RQcm9jZXNzZWRUUyhsYXN0RW50cnkudHMpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRvYyA9IHNlbGYuX2VudHJ5UXVldWUuc2hpZnQoKTtcblxuICAgICAgICAgIGlmICghKGRvYy5ucyAmJiBkb2MubnMubGVuZ3RoID4gc2VsZi5fZGJOYW1lLmxlbmd0aCArIDEgJiZcbiAgICAgICAgICAgICAgICBkb2MubnMuc3Vic3RyKDAsIHNlbGYuX2RiTmFtZS5sZW5ndGggKyAxKSA9PT1cbiAgICAgICAgICAgICAgICAoc2VsZi5fZGJOYW1lICsgJy4nKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgbnNcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHRyaWdnZXIgPSB7Y29sbGVjdGlvbjogZG9jLm5zLnN1YnN0cihzZWxmLl9kYk5hbWUubGVuZ3RoICsgMSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgZHJvcENvbGxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BEYXRhYmFzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgb3A6IGRvY307XG5cbiAgICAgICAgICAvLyBJcyBpdCBhIHNwZWNpYWwgY29tbWFuZCBhbmQgdGhlIGNvbGxlY3Rpb24gbmFtZSBpcyBoaWRkZW4gc29tZXdoZXJlXG4gICAgICAgICAgLy8gaW4gb3BlcmF0b3I/XG4gICAgICAgICAgaWYgKHRyaWdnZXIuY29sbGVjdGlvbiA9PT0gXCIkY21kXCIpIHtcbiAgICAgICAgICAgIGlmIChkb2Muby5kcm9wRGF0YWJhc2UpIHtcbiAgICAgICAgICAgICAgZGVsZXRlIHRyaWdnZXIuY29sbGVjdGlvbjtcbiAgICAgICAgICAgICAgdHJpZ2dlci5kcm9wRGF0YWJhc2UgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmhhcyhkb2MubywgJ2Ryb3AnKSkge1xuICAgICAgICAgICAgICB0cmlnZ2VyLmNvbGxlY3Rpb24gPSBkb2Muby5kcm9wO1xuICAgICAgICAgICAgICB0cmlnZ2VyLmRyb3BDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdHJpZ2dlci5pZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEpTT04uc3RyaW5naWZ5KGRvYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BzIGhhdmUgYW4gaWQuXG4gICAgICAgICAgICB0cmlnZ2VyLmlkID0gaWRGb3JPcChkb2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlbGYuX2Nyb3NzYmFyLmZpcmUodHJpZ2dlcik7XG5cbiAgICAgICAgICAvLyBOb3cgdGhhdCB3ZSd2ZSBwcm9jZXNzZWQgdGhpcyBvcGVyYXRpb24sIHByb2Nlc3MgcGVuZGluZ1xuICAgICAgICAgIC8vIHNlcXVlbmNlcnMuXG4gICAgICAgICAgaWYgKCFkb2MudHMpXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIm9wbG9nIGVudHJ5IHdpdGhvdXQgdHM6IFwiICsgRUpTT04uc3RyaW5naWZ5KGRvYykpO1xuICAgICAgICAgIHNlbGYuX3NldExhc3RQcm9jZXNzZWRUUyhkb2MudHMpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX3NldExhc3RQcm9jZXNzZWRUUzogZnVuY3Rpb24gKHRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IHRzO1xuICAgIHdoaWxlICghXy5pc0VtcHR5KHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzKSAmJiBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlc1swXS50cy5sZXNzVGhhbk9yRXF1YWwoc2VsZi5fbGFzdFByb2Nlc3NlZFRTKSkge1xuICAgICAgdmFyIHNlcXVlbmNlciA9IHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLnNoaWZ0KCk7XG4gICAgICBzZXF1ZW5jZXIuZnV0dXJlLnJldHVybigpO1xuICAgIH1cbiAgfSxcblxuICAvL01ldGhvZHMgdXNlZCBvbiB0ZXN0cyB0byBkaW5hbWljYWxseSBjaGFuZ2UgVE9PX0ZBUl9CRUhJTkRcbiAgX2RlZmluZVRvb0ZhckJlaGluZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBUT09fRkFSX0JFSElORCA9IHZhbHVlO1xuICB9LFxuICBfcmVzZXRUb29GYXJCZWhpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIFRPT19GQVJfQkVISU5EID0gcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIHx8IDIwMDA7XG4gIH1cbn0pO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbk9ic2VydmVNdWx0aXBsZXhlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoIW9wdGlvbnMgfHwgIV8uaGFzKG9wdGlvbnMsICdvcmRlcmVkJykpXG4gICAgdGhyb3cgRXJyb3IoXCJtdXN0IHNwZWNpZmllZCBvcmRlcmVkXCIpO1xuXG4gIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLCAxKTtcblxuICBzZWxmLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICBzZWxmLl9vblN0b3AgPSBvcHRpb25zLm9uU3RvcCB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgc2VsZi5fcXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG4gIHNlbGYuX2hhbmRsZXMgPSB7fTtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLl9jYWNoZSA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7XG4gICAgb3JkZXJlZDogb3B0aW9ucy5vcmRlcmVkfSk7XG4gIC8vIE51bWJlciBvZiBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgdGFza3Mgc2NoZWR1bGVkIGJ1dCBub3QgeWV0XG4gIC8vIHJ1bm5pbmcuIHJlbW92ZUhhbmRsZSB1c2VzIHRoaXMgdG8ga25vdyBpZiBpdCdzIHRpbWUgdG8gY2FsbCB0aGUgb25TdG9wXG4gIC8vIGNhbGxiYWNrLlxuICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9IDA7XG5cbiAgXy5lYWNoKHNlbGYuY2FsbGJhY2tOYW1lcygpLCBmdW5jdGlvbiAoY2FsbGJhY2tOYW1lKSB7XG4gICAgc2VsZltjYWxsYmFja05hbWVdID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgc2VsZi5fYXBwbHlDYWxsYmFjayhjYWxsYmFja05hbWUsIF8udG9BcnJheShhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcbn07XG5cbl8uZXh0ZW5kKE9ic2VydmVNdWx0aXBsZXhlci5wcm90b3R5cGUsIHtcbiAgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzOiBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gQ2hlY2sgdGhpcyBiZWZvcmUgY2FsbGluZyBydW5UYXNrIChldmVuIHRob3VnaCBydW5UYXNrIGRvZXMgdGhlIHNhbWVcbiAgICAvLyBjaGVjaykgc28gdGhhdCB3ZSBkb24ndCBsZWFrIGFuIE9ic2VydmVNdWx0aXBsZXhlciBvbiBlcnJvciBieVxuICAgIC8vIGluY3JlbWVudGluZyBfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgYW5kIG5ldmVyXG4gICAgLy8gZGVjcmVtZW50aW5nIGl0LlxuICAgIGlmICghc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBvYnNlcnZlQ2hhbmdlcyBmcm9tIGFuIG9ic2VydmUgY2FsbGJhY2sgb24gdGhlIHNhbWUgcXVlcnlcIik7XG4gICAgKytzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcblxuICAgIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtaGFuZGxlc1wiLCAxKTtcblxuICAgIHNlbGYuX3F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5faGFuZGxlc1toYW5kbGUuX2lkXSA9IGhhbmRsZTtcbiAgICAgIC8vIFNlbmQgb3V0IHdoYXRldmVyIGFkZHMgd2UgaGF2ZSBzbyBmYXIgKHdoZXRoZXIgb3Igbm90IHdlIHRoZVxuICAgICAgLy8gbXVsdGlwbGV4ZXIgaXMgcmVhZHkpLlxuICAgICAgc2VsZi5fc2VuZEFkZHMoaGFuZGxlKTtcbiAgICAgIC0tc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQ7XG4gICAgfSk7XG4gICAgLy8gKm91dHNpZGUqIHRoZSB0YXNrLCBzaW5jZSBvdGhlcndpc2Ugd2UnZCBkZWFkbG9ja1xuICAgIHNlbGYuX3JlYWR5RnV0dXJlLndhaXQoKTtcbiAgfSxcblxuICAvLyBSZW1vdmUgYW4gb2JzZXJ2ZSBoYW5kbGUuIElmIGl0IHdhcyB0aGUgbGFzdCBvYnNlcnZlIGhhbmRsZSwgY2FsbCB0aGVcbiAgLy8gb25TdG9wIGNhbGxiYWNrOyB5b3UgY2Fubm90IGFkZCBhbnkgbW9yZSBvYnNlcnZlIGhhbmRsZXMgYWZ0ZXIgdGhpcy5cbiAgLy9cbiAgLy8gVGhpcyBpcyBub3Qgc3luY2hyb25pemVkIHdpdGggcG9sbHMgYW5kIGhhbmRsZSBhZGRpdGlvbnM6IHRoaXMgbWVhbnMgdGhhdFxuICAvLyB5b3UgY2FuIHNhZmVseSBjYWxsIGl0IGZyb20gd2l0aGluIGFuIG9ic2VydmUgY2FsbGJhY2ssIGJ1dCBpdCBhbHNvIG1lYW5zXG4gIC8vIHRoYXQgd2UgaGF2ZSB0byBiZSBjYXJlZnVsIHdoZW4gd2UgaXRlcmF0ZSBvdmVyIF9oYW5kbGVzLlxuICByZW1vdmVIYW5kbGU6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFRoaXMgc2hvdWxkIG5vdCBiZSBwb3NzaWJsZTogeW91IGNhbiBvbmx5IGNhbGwgcmVtb3ZlSGFuZGxlIGJ5IGhhdmluZ1xuICAgIC8vIGFjY2VzcyB0byB0aGUgT2JzZXJ2ZUhhbmRsZSwgd2hpY2ggaXNuJ3QgcmV0dXJuZWQgdG8gdXNlciBjb2RlIHVudGlsIHRoZVxuICAgIC8vIG11bHRpcGxleCBpcyByZWFkeS5cbiAgICBpZiAoIXNlbGYuX3JlYWR5KCkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCByZW1vdmUgaGFuZGxlcyB1bnRpbCB0aGUgbXVsdGlwbGV4IGlzIHJlYWR5XCIpO1xuXG4gICAgZGVsZXRlIHNlbGYuX2hhbmRsZXNbaWRdO1xuXG4gICAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1oYW5kbGVzXCIsIC0xKTtcblxuICAgIGlmIChfLmlzRW1wdHkoc2VsZi5faGFuZGxlcykgJiZcbiAgICAgICAgc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgPT09IDApIHtcbiAgICAgIHNlbGYuX3N0b3AoKTtcbiAgICB9XG4gIH0sXG4gIF9zdG9wOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIEl0IHNob3VsZG4ndCBiZSBwb3NzaWJsZSBmb3IgdXMgdG8gc3RvcCB3aGVuIGFsbCBvdXIgaGFuZGxlcyBzdGlsbFxuICAgIC8vIGhhdmVuJ3QgYmVlbiByZXR1cm5lZCBmcm9tIG9ic2VydmVDaGFuZ2VzIVxuICAgIGlmICghIHNlbGYuX3JlYWR5KCkgJiYgISBvcHRpb25zLmZyb21RdWVyeUVycm9yKVxuICAgICAgdGhyb3cgRXJyb3IoXCJzdXJwcmlzaW5nIF9zdG9wOiBub3QgcmVhZHlcIik7XG5cbiAgICAvLyBDYWxsIHN0b3AgY2FsbGJhY2sgKHdoaWNoIGtpbGxzIHRoZSB1bmRlcmx5aW5nIHByb2Nlc3Mgd2hpY2ggc2VuZHMgdXNcbiAgICAvLyBjYWxsYmFja3MgYW5kIHJlbW92ZXMgdXMgZnJvbSB0aGUgY29ubmVjdGlvbidzIGRpY3Rpb25hcnkpLlxuICAgIHNlbGYuX29uU3RvcCgpO1xuICAgIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsIC0xKTtcblxuICAgIC8vIENhdXNlIGZ1dHVyZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgdG8gdGhyb3cgKGJ1dCB0aGUgb25TdG9wXG4gICAgLy8gY2FsbGJhY2sgc2hvdWxkIG1ha2Ugb3VyIGNvbm5lY3Rpb24gZm9yZ2V0IGFib3V0IHVzKS5cbiAgICBzZWxmLl9oYW5kbGVzID0gbnVsbDtcbiAgfSxcblxuICAvLyBBbGxvd3MgYWxsIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyB0byByZXR1cm4sIG9uY2UgYWxsIHByZWNlZGluZ1xuICAvLyBhZGRzIGhhdmUgYmVlbiBwcm9jZXNzZWQuIERvZXMgbm90IGJsb2NrLlxuICByZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgbWFrZSBPYnNlcnZlTXVsdGlwbGV4IHJlYWR5IHR3aWNlIVwiKTtcbiAgICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIElmIHRyeWluZyB0byBleGVjdXRlIHRoZSBxdWVyeSByZXN1bHRzIGluIGFuIGVycm9yLCBjYWxsIHRoaXMuIFRoaXMgaXNcbiAgLy8gaW50ZW5kZWQgZm9yIHBlcm1hbmVudCBlcnJvcnMsIG5vdCB0cmFuc2llbnQgbmV0d29yayBlcnJvcnMgdGhhdCBjb3VsZCBiZVxuICAvLyBmaXhlZC4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJlZm9yZSByZWFkeSgpLCBiZWNhdXNlIGlmIHlvdSBjYWxsZWQgcmVhZHlcbiAgLy8gdGhhdCBtZWFudCB0aGF0IHlvdSBtYW5hZ2VkIHRvIHJ1biB0aGUgcXVlcnkgb25jZS4gSXQgd2lsbCBzdG9wIHRoaXNcbiAgLy8gT2JzZXJ2ZU11bHRpcGxleCBhbmQgY2F1c2UgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIChhbmQgdGh1c1xuICAvLyBvYnNlcnZlQ2hhbmdlcyBjYWxscykgdG8gdGhyb3cgdGhlIGVycm9yLlxuICBxdWVyeUVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgY2xhaW0gcXVlcnkgaGFzIGFuIGVycm9yIGFmdGVyIGl0IHdvcmtlZCFcIik7XG4gICAgICBzZWxmLl9zdG9wKHtmcm9tUXVlcnlFcnJvcjogdHJ1ZX0pO1xuICAgICAgc2VsZi5fcmVhZHlGdXR1cmUudGhyb3coZXJyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBDYWxscyBcImNiXCIgb25jZSB0aGUgZWZmZWN0cyBvZiBhbGwgXCJyZWFkeVwiLCBcImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkc1wiXG4gIC8vIGFuZCBvYnNlcnZlIGNhbGxiYWNrcyB3aGljaCBjYW1lIGJlZm9yZSB0aGlzIGNhbGwgaGF2ZSBiZWVuIHByb3BhZ2F0ZWQgdG9cbiAgLy8gYWxsIGhhbmRsZXMuIFwicmVhZHlcIiBtdXN0IGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBvbiB0aGlzIG11bHRpcGxleGVyLlxuICBvbkZsdXNoOiBmdW5jdGlvbiAoY2IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJvbmx5IGNhbGwgb25GbHVzaCBvbiBhIG11bHRpcGxleGVyIHRoYXQgd2lsbCBiZSByZWFkeVwiKTtcbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH0sXG4gIGNhbGxiYWNrTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICByZXR1cm4gW1wiYWRkZWRCZWZvcmVcIiwgXCJjaGFuZ2VkXCIsIFwibW92ZWRCZWZvcmVcIiwgXCJyZW1vdmVkXCJdO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBbXCJhZGRlZFwiLCBcImNoYW5nZWRcIiwgXCJyZW1vdmVkXCJdO1xuICB9LFxuICBfcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVhZHlGdXR1cmUuaXNSZXNvbHZlZCgpO1xuICB9LFxuICBfYXBwbHlDYWxsYmFjazogZnVuY3Rpb24gKGNhbGxiYWNrTmFtZSwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2Ugc3RvcHBlZCBpbiB0aGUgbWVhbnRpbWUsIGRvIG5vdGhpbmcuXG4gICAgICBpZiAoIXNlbGYuX2hhbmRsZXMpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gRmlyc3QsIGFwcGx5IHRoZSBjaGFuZ2UgdG8gdGhlIGNhY2hlLlxuICAgICAgLy8gWFhYIFdlIGNvdWxkIG1ha2UgYXBwbHlDaGFuZ2UgY2FsbGJhY2tzIHByb21pc2Ugbm90IHRvIGhhbmcgb24gdG8gYW55XG4gICAgICAvLyBzdGF0ZSBmcm9tIHRoZWlyIGFyZ3VtZW50cyAoYXNzdW1pbmcgdGhhdCB0aGVpciBzdXBwbGllZCBjYWxsYmFja3NcbiAgICAgIC8vIGRvbid0KSBhbmQgc2tpcCB0aGlzIGNsb25lLiBDdXJyZW50bHkgJ2NoYW5nZWQnIGhhbmdzIG9uIHRvIHN0YXRlXG4gICAgICAvLyB0aG91Z2guXG4gICAgICBzZWxmLl9jYWNoZS5hcHBseUNoYW5nZVtjYWxsYmFja05hbWVdLmFwcGx5KG51bGwsIEVKU09OLmNsb25lKGFyZ3MpKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZW4ndCBmaW5pc2hlZCB0aGUgaW5pdGlhbCBhZGRzLCB0aGVuIHdlIHNob3VsZCBvbmx5IGJlIGdldHRpbmdcbiAgICAgIC8vIGFkZHMuXG4gICAgICBpZiAoIXNlbGYuX3JlYWR5KCkgJiZcbiAgICAgICAgICAoY2FsbGJhY2tOYW1lICE9PSAnYWRkZWQnICYmIGNhbGxiYWNrTmFtZSAhPT0gJ2FkZGVkQmVmb3JlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR290IFwiICsgY2FsbGJhY2tOYW1lICsgXCIgZHVyaW5nIGluaXRpYWwgYWRkc1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm93IG11bHRpcGxleCB0aGUgY2FsbGJhY2tzIG91dCB0byBhbGwgb2JzZXJ2ZSBoYW5kbGVzLiBJdCdzIE9LIGlmXG4gICAgICAvLyB0aGVzZSBjYWxscyB5aWVsZDsgc2luY2Ugd2UncmUgaW5zaWRlIGEgdGFzaywgbm8gb3RoZXIgdXNlIG9mIG91ciBxdWV1ZVxuICAgICAgLy8gY2FuIGNvbnRpbnVlIHVudGlsIHRoZXNlIGFyZSBkb25lLiAoQnV0IHdlIGRvIGhhdmUgdG8gYmUgY2FyZWZ1bCB0byBub3RcbiAgICAgIC8vIHVzZSBhIGhhbmRsZSB0aGF0IGdvdCByZW1vdmVkLCBiZWNhdXNlIHJlbW92ZUhhbmRsZSBkb2VzIG5vdCB1c2UgdGhlXG4gICAgICAvLyBxdWV1ZTsgdGh1cywgd2UgaXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGtleXMgdGhhdCB3ZSBjb250cm9sLilcbiAgICAgIF8uZWFjaChfLmtleXMoc2VsZi5faGFuZGxlcyksIGZ1bmN0aW9uIChoYW5kbGVJZCkge1xuICAgICAgICB2YXIgaGFuZGxlID0gc2VsZi5faGFuZGxlcyAmJiBzZWxmLl9oYW5kbGVzW2hhbmRsZUlkXTtcbiAgICAgICAgaWYgKCFoYW5kbGUpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBoYW5kbGVbJ18nICsgY2FsbGJhY2tOYW1lXTtcbiAgICAgICAgLy8gY2xvbmUgYXJndW1lbnRzIHNvIHRoYXQgY2FsbGJhY2tzIGNhbiBtdXRhdGUgdGhlaXIgYXJndW1lbnRzXG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KG51bGwsIEVKU09OLmNsb25lKGFyZ3MpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNlbmRzIGluaXRpYWwgYWRkcyB0byBhIGhhbmRsZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFza1xuICAvLyAodGhlIHRhc2sgdGhhdCBpcyBwcm9jZXNzaW5nIHRoZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbCkuIEl0XG4gIC8vIHN5bmNocm9ub3VzbHkgaW52b2tlcyB0aGUgaGFuZGxlJ3MgYWRkZWQgb3IgYWRkZWRCZWZvcmU7IHRoZXJlJ3Mgbm8gbmVlZCB0b1xuICAvLyBmbHVzaCB0aGUgcXVldWUgYWZ0ZXJ3YXJkcyB0byBlbnN1cmUgdGhhdCB0aGUgY2FsbGJhY2tzIGdldCBvdXQuXG4gIF9zZW5kQWRkczogZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgRXJyb3IoXCJfc2VuZEFkZHMgbWF5IG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFzayFcIik7XG4gICAgdmFyIGFkZCA9IHNlbGYuX29yZGVyZWQgPyBoYW5kbGUuX2FkZGVkQmVmb3JlIDogaGFuZGxlLl9hZGRlZDtcbiAgICBpZiAoIWFkZClcbiAgICAgIHJldHVybjtcbiAgICAvLyBub3RlOiBkb2NzIG1heSBiZSBhbiBfSWRNYXAgb3IgYW4gT3JkZXJlZERpY3RcbiAgICBzZWxmLl9jYWNoZS5kb2NzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgIGlmICghXy5oYXMoc2VsZi5faGFuZGxlcywgaGFuZGxlLl9pZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiaGFuZGxlIGdvdCByZW1vdmVkIGJlZm9yZSBzZW5kaW5nIGluaXRpYWwgYWRkcyFcIik7XG4gICAgICB2YXIgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuICAgICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICAgIGFkZChpZCwgZmllbGRzLCBudWxsKTsgLy8gd2UncmUgZ29pbmcgaW4gb3JkZXIsIHNvIGFkZCBhdCBlbmRcbiAgICAgIGVsc2VcbiAgICAgICAgYWRkKGlkLCBmaWVsZHMpO1xuICAgIH0pO1xuICB9XG59KTtcblxuXG52YXIgbmV4dE9ic2VydmVIYW5kbGVJZCA9IDE7XG5PYnNlcnZlSGFuZGxlID0gZnVuY3Rpb24gKG11bHRpcGxleGVyLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBUaGUgZW5kIHVzZXIgaXMgb25seSBzdXBwb3NlZCB0byBjYWxsIHN0b3AoKS4gIFRoZSBvdGhlciBmaWVsZHMgYXJlXG4gIC8vIGFjY2Vzc2libGUgdG8gdGhlIG11bHRpcGxleGVyLCB0aG91Z2guXG4gIHNlbGYuX211bHRpcGxleGVyID0gbXVsdGlwbGV4ZXI7XG4gIF8uZWFjaChtdWx0aXBsZXhlci5jYWxsYmFja05hbWVzKCksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKGNhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgc2VsZlsnXycgKyBuYW1lXSA9IGNhbGxiYWNrc1tuYW1lXTtcbiAgICB9IGVsc2UgaWYgKG5hbWUgPT09IFwiYWRkZWRCZWZvcmVcIiAmJiBjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgeW91IHNwZWNpZnkgXCJhZGRlZFwiIGFuZCBcIm1vdmVkQmVmb3JlXCIsIHlvdSBnZXQgYW5cbiAgICAgIC8vIG9yZGVyZWQgb2JzZXJ2ZSB3aGVyZSBmb3Igc29tZSByZWFzb24geW91IGRvbid0IGdldCBvcmRlcmluZyBkYXRhIG9uXG4gICAgICAvLyB0aGUgYWRkcy4gIEkgZHVubm8sIHdlIHdyb3RlIHRlc3RzIGZvciBpdCwgdGhlcmUgbXVzdCBoYXZlIGJlZW4gYVxuICAgICAgLy8gcmVhc29uLlxuICAgICAgc2VsZi5fYWRkZWRCZWZvcmUgPSBmdW5jdGlvbiAoaWQsIGZpZWxkcywgYmVmb3JlKSB7XG4gICAgICAgIGNhbGxiYWNrcy5hZGRlZChpZCwgZmllbGRzKTtcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl9pZCA9IG5leHRPYnNlcnZlSGFuZGxlSWQrKztcbn07XG5PYnNlcnZlSGFuZGxlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgIHJldHVybjtcbiAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZUhhbmRsZShzZWxmLl9pZCk7XG59O1xuIiwidmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xudmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbkRvY0ZldGNoZXIgPSBmdW5jdGlvbiAobW9uZ29Db25uZWN0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fbW9uZ29Db25uZWN0aW9uID0gbW9uZ29Db25uZWN0aW9uO1xuICAvLyBNYXAgZnJvbSBjYWNoZSBrZXkgLT4gW2NhbGxiYWNrXVxuICBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleSA9IHt9O1xufTtcblxuXy5leHRlbmQoRG9jRmV0Y2hlci5wcm90b3R5cGUsIHtcbiAgLy8gRmV0Y2hlcyBkb2N1bWVudCBcImlkXCIgZnJvbSBjb2xsZWN0aW9uTmFtZSwgcmV0dXJuaW5nIGl0IG9yIG51bGwgaWYgbm90XG4gIC8vIGZvdW5kLlxuICAvL1xuICAvLyBJZiB5b3UgbWFrZSBtdWx0aXBsZSBjYWxscyB0byBmZXRjaCgpIHdpdGggdGhlIHNhbWUgY2FjaGVLZXkgKGEgc3RyaW5nKSxcbiAgLy8gRG9jRmV0Y2hlciBtYXkgYXNzdW1lIHRoYXQgdGhleSBhbGwgcmV0dXJuIHRoZSBzYW1lIGRvY3VtZW50LiAoSXQgZG9lc1xuICAvLyBub3QgY2hlY2sgdG8gc2VlIGlmIGNvbGxlY3Rpb25OYW1lL2lkIG1hdGNoLilcbiAgLy9cbiAgLy8gWW91IG1heSBhc3N1bWUgdGhhdCBjYWxsYmFjayBpcyBuZXZlciBjYWxsZWQgc3luY2hyb25vdXNseSAoYW5kIGluIGZhY3RcbiAgLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGRvZXMgc28pLlxuICBmZXRjaDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCwgY2FjaGVLZXksIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgY2hlY2soY29sbGVjdGlvbk5hbWUsIFN0cmluZyk7XG4gICAgLy8gaWQgaXMgc29tZSBzb3J0IG9mIHNjYWxhclxuICAgIGNoZWNrKGNhY2hlS2V5LCBTdHJpbmcpO1xuXG4gICAgLy8gSWYgdGhlcmUncyBhbHJlYWR5IGFuIGluLXByb2dyZXNzIGZldGNoIGZvciB0aGlzIGNhY2hlIGtleSwgeWllbGQgdW50aWxcbiAgICAvLyBpdCdzIGRvbmUgYW5kIHJldHVybiB3aGF0ZXZlciBpdCByZXR1cm5zLlxuICAgIGlmIChfLmhhcyhzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleSwgY2FjaGVLZXkpKSB7XG4gICAgICBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleVtjYWNoZUtleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5W2NhY2hlS2V5XSA9IFtjYWxsYmFja107XG5cbiAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgZG9jID0gc2VsZi5fbW9uZ29Db25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICAgICAgY29sbGVjdGlvbk5hbWUsIHtfaWQ6IGlkfSkgfHwgbnVsbDtcbiAgICAgICAgLy8gUmV0dXJuIGRvYyB0byBhbGwgcmVsZXZhbnQgY2FsbGJhY2tzLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBjYW5cbiAgICAgICAgLy8gY29udGludWUgdG8gZ3JvdyBkdXJpbmcgY2FsbGJhY2sgZXhjZWN1dGlvbi5cbiAgICAgICAgd2hpbGUgKCFfLmlzRW1wdHkoY2FsbGJhY2tzKSkge1xuICAgICAgICAgIC8vIENsb25lIHRoZSBkb2N1bWVudCBzbyB0aGF0IHRoZSB2YXJpb3VzIGNhbGxzIHRvIGZldGNoIGRvbid0IHJldHVyblxuICAgICAgICAgIC8vIG9iamVjdHMgdGhhdCBhcmUgaW50ZXJ0d2luZ2xlZCB3aXRoIGVhY2ggb3RoZXIuIENsb25lIGJlZm9yZVxuICAgICAgICAgIC8vIHBvcHBpbmcgdGhlIGZ1dHVyZSwgc28gdGhhdCBpZiBjbG9uZSB0aHJvd3MsIHRoZSBlcnJvciBnZXRzIHBhc3NlZFxuICAgICAgICAgIC8vIHRvIHRoZSBuZXh0IGNhbGxiYWNrLlxuICAgICAgICAgIHZhciBjbG9uZWREb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgICAgICAgIGNhbGxiYWNrcy5wb3AoKShudWxsLCBjbG9uZWREb2MpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHdoaWxlICghXy5pc0VtcHR5KGNhbGxiYWNrcykpIHtcbiAgICAgICAgICBjYWxsYmFja3MucG9wKCkoZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIC8vIFhYWCBjb25zaWRlciBrZWVwaW5nIHRoZSBkb2MgYXJvdW5kIGZvciBhIHBlcmlvZCBvZiB0aW1lIGJlZm9yZVxuICAgICAgICAvLyByZW1vdmluZyBmcm9tIHRoZSBjYWNoZVxuICAgICAgICBkZWxldGUgc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXlbY2FjaGVLZXldO1xuICAgICAgfVxuICAgIH0pLnJ1bigpO1xuICB9XG59KTtcblxuTW9uZ29UZXN0LkRvY0ZldGNoZXIgPSBEb2NGZXRjaGVyO1xuIiwiUG9sbGluZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9tb25nb0hhbmRsZSA9IG9wdGlvbnMubW9uZ29IYW5kbGU7XG4gIHNlbGYuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gIHNlbGYuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG5cbiAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBzZWxmLl9tb25nb0hhbmRsZS5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIC8vIHByZXZpb3VzIHJlc3VsdHMgc25hcHNob3QuICBvbiBlYWNoIHBvbGwgY3ljbGUsIGRpZmZzIGFnYWluc3RcbiAgLy8gcmVzdWx0cyBkcml2ZXMgdGhlIGNhbGxiYWNrcy5cbiAgc2VsZi5fcmVzdWx0cyA9IG51bGw7XG5cbiAgLy8gVGhlIG51bWJlciBvZiBfcG9sbE1vbmdvIGNhbGxzIHRoYXQgaGF2ZSBiZWVuIGFkZGVkIHRvIHNlbGYuX3Rhc2tRdWV1ZSBidXRcbiAgLy8gaGF2ZSBub3Qgc3RhcnRlZCBydW5uaW5nLiBVc2VkIHRvIG1ha2Ugc3VyZSB3ZSBuZXZlciBzY2hlZHVsZSBtb3JlIHRoYW4gb25lXG4gIC8vIF9wb2xsTW9uZ28gKG90aGVyIHRoYW4gcG9zc2libHkgdGhlIG9uZSB0aGF0IGlzIGN1cnJlbnRseSBydW5uaW5nKS4gSXQnc1xuICAvLyBhbHNvIHVzZWQgYnkgX3N1c3BlbmRQb2xsaW5nIHRvIHByZXRlbmQgdGhlcmUncyBhIHBvbGwgc2NoZWR1bGVkLiBVc3VhbGx5LFxuICAvLyBpdCdzIGVpdGhlciAwIChmb3IgXCJubyBwb2xscyBzY2hlZHVsZWQgb3RoZXIgdGhhbiBtYXliZSBvbmUgY3VycmVudGx5XG4gIC8vIHJ1bm5pbmdcIikgb3IgMSAoZm9yIFwiYSBwb2xsIHNjaGVkdWxlZCB0aGF0IGlzbid0IHJ1bm5pbmcgeWV0XCIpLCBidXQgaXQgY2FuXG4gIC8vIGFsc28gYmUgMiBpZiBpbmNyZW1lbnRlZCBieSBfc3VzcGVuZFBvbGxpbmcuXG4gIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9IDA7XG4gIHNlbGYuX3BlbmRpbmdXcml0ZXMgPSBbXTsgLy8gcGVvcGxlIHRvIG5vdGlmeSB3aGVuIHBvbGxpbmcgY29tcGxldGVzXG5cbiAgLy8gTWFrZSBzdXJlIHRvIGNyZWF0ZSBhIHNlcGFyYXRlbHkgdGhyb3R0bGVkIGZ1bmN0aW9uIGZvciBlYWNoXG4gIC8vIFBvbGxpbmdPYnNlcnZlRHJpdmVyIG9iamVjdC5cbiAgc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkID0gXy50aHJvdHRsZShcbiAgICBzZWxmLl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCxcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIHx8IDUwIC8qIG1zICovKTtcblxuICAvLyBYWFggZmlndXJlIG91dCBpZiB3ZSBzdGlsbCBuZWVkIGEgcXVldWVcbiAgc2VsZi5fdGFza1F1ZXVlID0gbmV3IE1ldGVvci5fU3luY2hyb25vdXNRdWV1ZSgpO1xuXG4gIHZhciBsaXN0ZW5lcnNIYW5kbGUgPSBsaXN0ZW5BbGwoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIC8vIFdoZW4gc29tZW9uZSBkb2VzIGEgdHJhbnNhY3Rpb24gdGhhdCBtaWdodCBhZmZlY3QgdXMsIHNjaGVkdWxlIGEgcG9sbFxuICAgICAgLy8gb2YgdGhlIGRhdGFiYXNlLiBJZiB0aGF0IHRyYW5zYWN0aW9uIGhhcHBlbnMgaW5zaWRlIG9mIGEgd3JpdGUgZmVuY2UsXG4gICAgICAvLyBibG9jayB0aGUgZmVuY2UgdW50aWwgd2UndmUgcG9sbGVkIGFuZCBub3RpZmllZCBvYnNlcnZlcnMuXG4gICAgICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICAgICAgaWYgKGZlbmNlKVxuICAgICAgICBzZWxmLl9wZW5kaW5nV3JpdGVzLnB1c2goZmVuY2UuYmVnaW5Xcml0ZSgpKTtcbiAgICAgIC8vIEVuc3VyZSBhIHBvbGwgaXMgc2NoZWR1bGVkLi4uIGJ1dCBpZiB3ZSBhbHJlYWR5IGtub3cgdGhhdCBvbmUgaXMsXG4gICAgICAvLyBkb24ndCBoaXQgdGhlIHRocm90dGxlZCBfZW5zdXJlUG9sbElzU2NoZWR1bGVkIGZ1bmN0aW9uICh3aGljaCBtaWdodFxuICAgICAgLy8gbGVhZCB0byB1cyBjYWxsaW5nIGl0IHVubmVjZXNzYXJpbHkgaW4gPHBvbGxpbmdUaHJvdHRsZU1zPiBtcykuXG4gICAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID09PSAwKVxuICAgICAgICBzZWxmLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcbiAgICB9XG4gICk7XG4gIHNlbGYuX3N0b3BDYWxsYmFja3MucHVzaChmdW5jdGlvbiAoKSB7IGxpc3RlbmVyc0hhbmRsZS5zdG9wKCk7IH0pO1xuXG4gIC8vIGV2ZXJ5IG9uY2UgYW5kIGEgd2hpbGUsIHBvbGwgZXZlbiBpZiB3ZSBkb24ndCB0aGluayB3ZSdyZSBkaXJ0eSwgZm9yXG4gIC8vIGV2ZW50dWFsIGNvbnNpc3RlbmN5IHdpdGggZGF0YWJhc2Ugd3JpdGVzIGZyb20gb3V0c2lkZSB0aGUgTWV0ZW9yXG4gIC8vIHVuaXZlcnNlLlxuICAvL1xuICAvLyBGb3IgdGVzdGluZywgdGhlcmUncyBhbiB1bmRvY3VtZW50ZWQgY2FsbGJhY2sgYXJndW1lbnQgdG8gb2JzZXJ2ZUNoYW5nZXNcbiAgLy8gd2hpY2ggZGlzYWJsZXMgdGltZS1iYXNlZCBwb2xsaW5nIGFuZCBnZXRzIGNhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGVhY2hcbiAgLy8gcG9sbC5cbiAgaWYgKG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKSB7XG4gICAgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2sgPSBvcHRpb25zLl90ZXN0T25seVBvbGxDYWxsYmFjaztcbiAgfSBlbHNlIHtcbiAgICB2YXIgcG9sbGluZ0ludGVydmFsID1cbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIHx8XG4gICAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5fcG9sbGluZ0ludGVydmFsIHx8IC8vIENPTVBBVCB3aXRoIDEuMlxuICAgICAgICAgIDEwICogMTAwMDtcbiAgICB2YXIgaW50ZXJ2YWxIYW5kbGUgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoXG4gICAgICBfLmJpbmQoc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkLCBzZWxmKSwgcG9sbGluZ0ludGVydmFsKTtcbiAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgTWV0ZW9yLmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHdlIGFjdHVhbGx5IHBvbGwgc29vbiFcbiAgc2VsZi5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcblxuICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLXBvbGxpbmdcIiwgMSk7XG59O1xuXG5fLmV4dGVuZChQb2xsaW5nT2JzZXJ2ZURyaXZlci5wcm90b3R5cGUsIHtcbiAgLy8gVGhpcyBpcyBhbHdheXMgY2FsbGVkIHRocm91Z2ggXy50aHJvdHRsZSAoZXhjZXB0IG9uY2UgYXQgc3RhcnR1cCkuXG4gIF91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID4gMClcbiAgICAgIHJldHVybjtcbiAgICArK3NlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICBzZWxmLl90YXNrUXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3BvbGxNb25nbygpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIHRlc3Qtb25seSBpbnRlcmZhY2UgZm9yIGNvbnRyb2xsaW5nIHBvbGxpbmcuXG4gIC8vXG4gIC8vIF9zdXNwZW5kUG9sbGluZyBibG9ja3MgdW50aWwgYW55IGN1cnJlbnRseSBydW5uaW5nIGFuZCBzY2hlZHVsZWQgcG9sbHMgYXJlXG4gIC8vIGRvbmUsIGFuZCBwcmV2ZW50cyBhbnkgZnVydGhlciBwb2xscyBmcm9tIGJlaW5nIHNjaGVkdWxlZC4gKG5ld1xuICAvLyBPYnNlcnZlSGFuZGxlcyBjYW4gYmUgYWRkZWQgYW5kIHJlY2VpdmUgdGhlaXIgaW5pdGlhbCBhZGRlZCBjYWxsYmFja3MsXG4gIC8vIHRob3VnaC4pXG4gIC8vXG4gIC8vIF9yZXN1bWVQb2xsaW5nIGltbWVkaWF0ZWx5IHBvbGxzLCBhbmQgYWxsb3dzIGZ1cnRoZXIgcG9sbHMgdG8gb2NjdXIuXG4gIF9zdXNwZW5kUG9sbGluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFByZXRlbmQgdGhhdCB0aGVyZSdzIGFub3RoZXIgcG9sbCBzY2hlZHVsZWQgKHdoaWNoIHdpbGwgcHJldmVudFxuICAgIC8vIF9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgZnJvbSBxdWV1ZWluZyBhbnkgbW9yZSBwb2xscykuXG4gICAgKytzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ7XG4gICAgLy8gTm93IGJsb2NrIHVudGlsIGFsbCBjdXJyZW50bHkgcnVubmluZyBvciBzY2hlZHVsZWQgcG9sbHMgYXJlIGRvbmUuXG4gICAgc2VsZi5fdGFza1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24oKSB7fSk7XG5cbiAgICAvLyBDb25maXJtIHRoYXQgdGhlcmUgaXMgb25seSBvbmUgXCJwb2xsXCIgKHRoZSBmYWtlIG9uZSB3ZSdyZSBwcmV0ZW5kaW5nIHRvXG4gICAgLy8gaGF2ZSkgc2NoZWR1bGVkLlxuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgIT09IDEpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQpO1xuICB9LFxuICBfcmVzdW1lUG9sbGluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFdlIHNob3VsZCBiZSBpbiB0aGUgc2FtZSBzdGF0ZSBhcyBpbiB0aGUgZW5kIG9mIF9zdXNwZW5kUG9sbGluZy5cbiAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkICE9PSAxKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkKTtcbiAgICAvLyBSdW4gYSBwb2xsIHN5bmNocm9ub3VzbHkgKHdoaWNoIHdpbGwgY291bnRlcmFjdCB0aGVcbiAgICAvLyArK19wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgZnJvbSBfc3VzcGVuZFBvbGxpbmcpLlxuICAgIHNlbGYuX3Rhc2tRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3BvbGxNb25nbygpO1xuICAgIH0pO1xuICB9LFxuXG4gIF9wb2xsTW9uZ286IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLS1zZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ7XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcblxuICAgIHZhciBmaXJzdCA9IGZhbHNlO1xuICAgIHZhciBuZXdSZXN1bHRzO1xuICAgIHZhciBvbGRSZXN1bHRzID0gc2VsZi5fcmVzdWx0cztcbiAgICBpZiAoIW9sZFJlc3VsdHMpIHtcbiAgICAgIGZpcnN0ID0gdHJ1ZTtcbiAgICAgIC8vIFhYWCBtYXliZSB1c2UgT3JkZXJlZERpY3QgaW5zdGVhZD9cbiAgICAgIG9sZFJlc3VsdHMgPSBzZWxmLl9vcmRlcmVkID8gW10gOiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICB9XG5cbiAgICBzZWxmLl90ZXN0T25seVBvbGxDYWxsYmFjayAmJiBzZWxmLl90ZXN0T25seVBvbGxDYWxsYmFjaygpO1xuXG4gICAgLy8gU2F2ZSB0aGUgbGlzdCBvZiBwZW5kaW5nIHdyaXRlcyB3aGljaCB0aGlzIHJvdW5kIHdpbGwgY29tbWl0LlxuICAgIHZhciB3cml0ZXNGb3JDeWNsZSA9IHNlbGYuX3BlbmRpbmdXcml0ZXM7XG4gICAgc2VsZi5fcGVuZGluZ1dyaXRlcyA9IFtdO1xuXG4gICAgLy8gR2V0IHRoZSBuZXcgcXVlcnkgcmVzdWx0cy4gKFRoaXMgeWllbGRzLilcbiAgICB0cnkge1xuICAgICAgbmV3UmVzdWx0cyA9IHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yLmdldFJhd09iamVjdHMoc2VsZi5fb3JkZXJlZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGZpcnN0ICYmIHR5cGVvZihlLmNvZGUpID09PSAnbnVtYmVyJykge1xuICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgIC8vIGVycm9yIGdlbmVyYXRlZCBieSB0aGUgY2xpZW50LiBBbmQgd2UndmUgbmV2ZXIgc2VlbiB0aGlzIHF1ZXJ5IHdvcmtcbiAgICAgICAgLy8gc3VjY2Vzc2Z1bGx5LiBQcm9iYWJseSBpdCdzIGEgYmFkIHNlbGVjdG9yIG9yIHNvbWV0aGluZywgc28gd2Ugc2hvdWxkXG4gICAgICAgIC8vIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHMgdXAgY2FsbGluZ1xuICAgICAgICAvLyBgc3RvcGAgb24gdXMpLlxuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5xdWVyeUVycm9yKFxuICAgICAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgICAgIFwiRXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnkgXCIgK1xuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbikgKyBcIjogXCIgKyBlLm1lc3NhZ2UpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXRSYXdPYmplY3RzIGNhbiB0aHJvdyBpZiB3ZSdyZSBoYXZpbmcgdHJvdWJsZSB0YWxraW5nIHRvIHRoZVxuICAgICAgLy8gZGF0YWJhc2UuICBUaGF0J3MgZmluZSAtLS0gd2Ugd2lsbCByZXBvbGwgbGF0ZXIgYW55d2F5LiBCdXQgd2Ugc2hvdWxkXG4gICAgICAvLyBtYWtlIHN1cmUgbm90IHRvIGxvc2UgdHJhY2sgb2YgdGhpcyBjeWNsZSdzIHdyaXRlcy5cbiAgICAgIC8vIChJdCBhbHNvIGNhbiB0aHJvdyBpZiB0aGVyZSdzIGp1c3Qgc29tZXRoaW5nIGludmFsaWQgYWJvdXQgdGhpcyBxdWVyeTtcbiAgICAgIC8vIHVuZm9ydHVuYXRlbHkgdGhlIE9ic2VydmVEcml2ZXIgQVBJIGRvZXNuJ3QgcHJvdmlkZSBhIGdvb2Qgd2F5IHRvXG4gICAgICAvLyBcImNhbmNlbFwiIHRoZSBvYnNlcnZlIGZyb20gdGhlIGluc2lkZSBpbiB0aGlzIGNhc2UuXG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShzZWxmLl9wZW5kaW5nV3JpdGVzLCB3cml0ZXNGb3JDeWNsZSk7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnkgXCIgK1xuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbikgKyBcIjogXCIgKyBlLnN0YWNrKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSdW4gZGlmZnMuXG4gICAgaWYgKCFzZWxmLl9zdG9wcGVkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHNlbGYuX29yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIHNlbGYuX211bHRpcGxleGVyKTtcbiAgICB9XG5cbiAgICAvLyBTaWduYWxzIHRoZSBtdWx0aXBsZXhlciB0byBhbGxvdyBhbGwgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdGhhdCBzaGFyZSB0aGlzXG4gICAgLy8gbXVsdGlwbGV4ZXIgdG8gcmV0dXJuLiAoVGhpcyBoYXBwZW5zIGFzeW5jaHJvbm91c2x5LCB2aWEgdGhlXG4gICAgLy8gbXVsdGlwbGV4ZXIncyBxdWV1ZS4pXG4gICAgaWYgKGZpcnN0KVxuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVhZHkoKTtcblxuICAgIC8vIFJlcGxhY2Ugc2VsZi5fcmVzdWx0cyBhdG9taWNhbGx5LiAgKFRoaXMgYXNzaWdubWVudCBpcyB3aGF0IG1ha2VzIGBmaXJzdGBcbiAgICAvLyBzdGF5IHRocm91Z2ggb24gdGhlIG5leHQgY3ljbGUsIHNvIHdlJ3ZlIHdhaXRlZCB1bnRpbCBhZnRlciB3ZSd2ZVxuICAgIC8vIGNvbW1pdHRlZCB0byByZWFkeS1pbmcgdGhlIG11bHRpcGxleGVyLilcbiAgICBzZWxmLl9yZXN1bHRzID0gbmV3UmVzdWx0cztcblxuICAgIC8vIE9uY2UgdGhlIE9ic2VydmVNdWx0aXBsZXhlciBoYXMgcHJvY2Vzc2VkIGV2ZXJ5dGhpbmcgd2UndmUgZG9uZSBpbiB0aGlzXG4gICAgLy8gcm91bmQsIG1hcmsgYWxsIHRoZSB3cml0ZXMgd2hpY2ggZXhpc3RlZCBiZWZvcmUgdGhpcyBjYWxsIGFzXG4gICAgLy8gY29tbW1pdHRlZC4gKElmIG5ldyB3cml0ZXMgaGF2ZSBzaG93biB1cCBpbiB0aGUgbWVhbnRpbWUsIHRoZXJlJ2xsXG4gICAgLy8gYWxyZWFkeSBiZSBhbm90aGVyIF9wb2xsTW9uZ28gdGFzayBzY2hlZHVsZWQuKVxuICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKHdyaXRlc0ZvckN5Y2xlLCBmdW5jdGlvbiAodykge1xuICAgICAgICB3LmNvbW1pdHRlZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBfLmVhY2goc2VsZi5fc3RvcENhbGxiYWNrcywgZnVuY3Rpb24gKGMpIHsgYygpOyB9KTtcbiAgICAvLyBSZWxlYXNlIGFueSB3cml0ZSBmZW5jZXMgdGhhdCBhcmUgd2FpdGluZyBvbiB1cy5cbiAgICBfLmVhY2goc2VsZi5fcGVuZGluZ1dyaXRlcywgZnVuY3Rpb24gKHcpIHtcbiAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgfSk7XG4gICAgUGFja2FnZS5mYWN0cyAmJiBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLXBvbGxpbmdcIiwgLTEpO1xuICB9XG59KTtcbiIsInZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG52YXIgUEhBU0UgPSB7XG4gIFFVRVJZSU5HOiBcIlFVRVJZSU5HXCIsXG4gIEZFVENISU5HOiBcIkZFVENISU5HXCIsXG4gIFNURUFEWTogXCJTVEVBRFlcIlxufTtcblxuLy8gRXhjZXB0aW9uIHRocm93biBieSBfbmVlZFRvUG9sbFF1ZXJ5IHdoaWNoIHVucm9sbHMgdGhlIHN0YWNrIHVwIHRvIHRoZVxuLy8gZW5jbG9zaW5nIGNhbGwgdG8gZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkuXG52YXIgU3dpdGNoZWRUb1F1ZXJ5ID0gZnVuY3Rpb24gKCkge307XG52YXIgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFN3aXRjaGVkVG9RdWVyeSkpXG4gICAgICAgIHRocm93IGU7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGN1cnJlbnRJZCA9IDA7XG5cbi8vIE9wbG9nT2JzZXJ2ZURyaXZlciBpcyBhbiBhbHRlcm5hdGl2ZSB0byBQb2xsaW5nT2JzZXJ2ZURyaXZlciB3aGljaCBmb2xsb3dzXG4vLyB0aGUgTW9uZ28gb3BlcmF0aW9uIGxvZyBpbnN0ZWFkIG9mIGp1c3QgcmUtcG9sbGluZyB0aGUgcXVlcnkuIEl0IG9iZXlzIHRoZVxuLy8gc2FtZSBzaW1wbGUgaW50ZXJmYWNlOiBjb25zdHJ1Y3RpbmcgaXQgc3RhcnRzIHNlbmRpbmcgb2JzZXJ2ZUNoYW5nZXNcbi8vIGNhbGxiYWNrcyAoYW5kIGEgcmVhZHkoKSBpbnZvY2F0aW9uKSB0byB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyLCBhbmQgeW91IHN0b3Bcbi8vIGl0IGJ5IGNhbGxpbmcgdGhlIHN0b3AoKSBtZXRob2QuXG5PcGxvZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX3VzZXNPcGxvZyA9IHRydWU7ICAvLyB0ZXN0cyBsb29rIGF0IHRoaXNcblxuICBzZWxmLl9pZCA9IGN1cnJlbnRJZDtcbiAgY3VycmVudElkKys7XG5cbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9tb25nb0hhbmRsZSA9IG9wdGlvbnMubW9uZ29IYW5kbGU7XG4gIHNlbGYuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcblxuICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJPcGxvZ09ic2VydmVEcml2ZXIgb25seSBzdXBwb3J0cyB1bm9yZGVyZWQgb2JzZXJ2ZUNoYW5nZXNcIik7XG4gIH1cblxuICB2YXIgc29ydGVyID0gb3B0aW9ucy5zb3J0ZXI7XG4gIC8vIFdlIGRvbid0IHN1cHBvcnQgJG5lYXIgYW5kIG90aGVyIGdlby1xdWVyaWVzIHNvIGl0J3MgT0sgdG8gaW5pdGlhbGl6ZSB0aGVcbiAgLy8gY29tcGFyYXRvciBvbmx5IG9uY2UgaW4gdGhlIGNvbnN0cnVjdG9yLlxuICB2YXIgY29tcGFyYXRvciA9IHNvcnRlciAmJiBzb3J0ZXIuZ2V0Q29tcGFyYXRvcigpO1xuXG4gIGlmIChvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQpIHtcbiAgICAvLyBUaGVyZSBhcmUgc2V2ZXJhbCBwcm9wZXJ0aWVzIG9yZGVyZWQgZHJpdmVyIGltcGxlbWVudHM6XG4gICAgLy8gLSBfbGltaXQgaXMgYSBwb3NpdGl2ZSBudW1iZXJcbiAgICAvLyAtIF9jb21wYXJhdG9yIGlzIGEgZnVuY3Rpb24tY29tcGFyYXRvciBieSB3aGljaCB0aGUgcXVlcnkgaXMgb3JkZXJlZFxuICAgIC8vIC0gX3VucHVibGlzaGVkQnVmZmVyIGlzIG5vbi1udWxsIE1pbi9NYXggSGVhcCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZW1wdHkgYnVmZmVyIGluIFNURUFEWSBwaGFzZSBpbXBsaWVzIHRoYXQgdGhlXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgZXZlcnl0aGluZyB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJpZXMgc2VsZWN0b3IgZml0c1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIGludG8gcHVibGlzaGVkIHNldC5cbiAgICAvLyAtIF9wdWJsaXNoZWQgLSBNaW4gSGVhcCAoYWxzbyBpbXBsZW1lbnRzIElkTWFwIG1ldGhvZHMpXG5cbiAgICB2YXIgaGVhcE9wdGlvbnMgPSB7IElkTWFwOiBMb2NhbENvbGxlY3Rpb24uX0lkTWFwIH07XG4gICAgc2VsZi5fbGltaXQgPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmxpbWl0O1xuICAgIHNlbGYuX2NvbXBhcmF0b3IgPSBjb21wYXJhdG9yO1xuICAgIHNlbGYuX3NvcnRlciA9IHNvcnRlcjtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG5ldyBNaW5NYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgICAvLyBXZSBuZWVkIHNvbWV0aGluZyB0aGF0IGNhbiBmaW5kIE1heCB2YWx1ZSBpbiBhZGRpdGlvbiB0byBJZE1hcCBpbnRlcmZhY2VcbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBuZXcgTWF4SGVhcChjb21wYXJhdG9yLCBoZWFwT3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fbGltaXQgPSAwO1xuICAgIHNlbGYuX2NvbXBhcmF0b3IgPSBudWxsO1xuICAgIHNlbGYuX3NvcnRlciA9IG51bGw7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBudWxsO1xuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgLy8gSW5kaWNhdGVzIGlmIGl0IGlzIHNhZmUgdG8gaW5zZXJ0IGEgbmV3IGRvY3VtZW50IGF0IHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICAvLyBmb3IgdGhpcyBxdWVyeS4gaS5lLiBpdCBpcyBrbm93biB0aGF0IHRoZXJlIGFyZSBubyBkb2N1bWVudHMgbWF0Y2hpbmcgdGhlXG4gIC8vIHNlbGVjdG9yIHRob3NlIGFyZSBub3QgaW4gcHVibGlzaGVkIG9yIGJ1ZmZlci5cbiAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG5cbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl9zdG9wSGFuZGxlcyA9IFtdO1xuXG4gIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgMSk7XG5cbiAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgc2VsZi5fbWF0Y2hlciA9IG9wdGlvbnMubWF0Y2hlcjtcbiAgdmFyIHByb2plY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyB8fCB7fTtcbiAgc2VsZi5fcHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbiAgLy8gUHJvamVjdGlvbiBmdW5jdGlvbiwgcmVzdWx0IG9mIGNvbWJpbmluZyBpbXBvcnRhbnQgZmllbGRzIGZvciBzZWxlY3RvciBhbmRcbiAgLy8gZXhpc3RpbmcgZmllbGRzIHByb2plY3Rpb25cbiAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNlbGYuX21hdGNoZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICBpZiAoc29ydGVyKVxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24gPSBzb3J0ZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKFxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuXG4gIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID0gMDtcblxuICBzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkgPSBmYWxzZTtcbiAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuXG4gIC8vIElmIHRoZSBvcGxvZyBoYW5kbGUgdGVsbHMgdXMgdGhhdCBpdCBza2lwcGVkIHNvbWUgZW50cmllcyAoYmVjYXVzZSBpdCBnb3RcbiAgLy8gYmVoaW5kLCBzYXkpLCByZS1wb2xsLlxuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS5vblNraXBwZWRFbnRyaWVzKFxuICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pXG4gICkpO1xuXG4gIGZvckVhY2hUcmlnZ2VyKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uT3Bsb2dFbnRyeShcbiAgICAgIHRyaWdnZXIsIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvcCA9IG5vdGlmaWNhdGlvbi5vcDtcbiAgICAgICAgICBpZiAobm90aWZpY2F0aW9uLmRyb3BDb2xsZWN0aW9uIHx8IG5vdGlmaWNhdGlvbi5kcm9wRGF0YWJhc2UpIHtcbiAgICAgICAgICAgIC8vIE5vdGU6IHRoaXMgY2FsbCBpcyBub3QgYWxsb3dlZCB0byBibG9jayBvbiBhbnl0aGluZyAoZXNwZWNpYWxseVxuICAgICAgICAgICAgLy8gb24gd2FpdGluZyBmb3Igb3Bsb2cgZW50cmllcyB0byBjYXRjaCB1cCkgYmVjYXVzZSB0aGF0IHdpbGwgYmxvY2tcbiAgICAgICAgICAgIC8vIG9uT3Bsb2dFbnRyeSFcbiAgICAgICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BlcmF0b3JzIHNob3VsZCBiZSBoYW5kbGVkIGRlcGVuZGluZyBvbiBwaGFzZVxuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmcob3ApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc2VsZi5faGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmcob3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICkpO1xuICB9KTtcblxuICAvLyBYWFggb3JkZXJpbmcgdy5yLnQuIGV2ZXJ5dGhpbmcgZWxzZT9cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChsaXN0ZW5BbGwoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIC8vIElmIHdlJ3JlIG5vdCBpbiBhIHByZS1maXJlIHdyaXRlIGZlbmNlLCB3ZSBkb24ndCBoYXZlIHRvIGRvIGFueXRoaW5nLlxuICAgICAgdmFyIGZlbmNlID0gRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS5nZXQoKTtcbiAgICAgIGlmICghZmVuY2UgfHwgZmVuY2UuZmlyZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzKSB7XG4gICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMgPSB7fTtcbiAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG5cbiAgICAgIGZlbmNlLm9uQmVmb3JlRmlyZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkcml2ZXJzID0gZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnM7XG4gICAgICAgIGRlbGV0ZSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcblxuICAgICAgICAvLyBUaGlzIGZlbmNlIGNhbm5vdCBmaXJlIHVudGlsIHdlJ3ZlIGNhdWdodCB1cCB0byBcInRoaXMgcG9pbnRcIiBpbiB0aGVcbiAgICAgICAgLy8gb3Bsb2csIGFuZCBhbGwgb2JzZXJ2ZXJzIG1hZGUgaXQgYmFjayB0byB0aGUgc3RlYWR5IHN0YXRlLlxuICAgICAgICBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTtcblxuICAgICAgICBfLmVhY2goZHJpdmVycywgZnVuY3Rpb24gKGRyaXZlcikge1xuICAgICAgICAgIGlmIChkcml2ZXIuX3N0b3BwZWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICB2YXIgd3JpdGUgPSBmZW5jZS5iZWdpbldyaXRlKCk7XG4gICAgICAgICAgaWYgKGRyaXZlci5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgYWxsIG9mIHRoZSBjYWxsYmFja3MgaGF2ZSBtYWRlIGl0IHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBtdWx0aXBsZXhlciBhbmQgYmVlbiBkZWxpdmVyZWQgdG8gT2JzZXJ2ZUhhbmRsZXMgYmVmb3JlIGNvbW1pdHRpbmdcbiAgICAgICAgICAgIC8vIHdyaXRlcy5cbiAgICAgICAgICAgIGRyaXZlci5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyaXZlci5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeS5wdXNoKHdyaXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICApKTtcblxuICAvLyBXaGVuIE1vbmdvIGZhaWxzIG92ZXIsIHdlIG5lZWQgdG8gcmVwb2xsIHRoZSBxdWVyeSwgaW4gY2FzZSB3ZSBwcm9jZXNzZWQgYW5cbiAgLy8gb3Bsb2cgZW50cnkgdGhhdCBnb3Qgcm9sbGVkIGJhY2suXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29uRmFpbG92ZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSkpKTtcblxuICAvLyBHaXZlIF9vYnNlcnZlQ2hhbmdlcyBhIGNoYW5jZSB0byBhZGQgdGhlIG5ldyBPYnNlcnZlSGFuZGxlIHRvIG91clxuICAvLyBtdWx0aXBsZXhlciwgc28gdGhhdCB0aGUgYWRkZWQgY2FsbHMgZ2V0IHN0cmVhbWVkLlxuICBNZXRlb3IuZGVmZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3J1bkluaXRpYWxRdWVyeSgpO1xuICB9KSk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ09ic2VydmVEcml2ZXIucHJvdG90eXBlLCB7XG4gIF9hZGRQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmaWVsZHMgPSBfLmNsb25lKGRvYyk7XG4gICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLmFkZGVkKGlkLCBzZWxmLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG5cbiAgICAgIC8vIEFmdGVyIGFkZGluZyB0aGlzIGRvY3VtZW50LCB0aGUgcHVibGlzaGVkIHNldCBtaWdodCBiZSBvdmVyZmxvd2VkXG4gICAgICAvLyAoZXhjZWVkaW5nIGNhcGFjaXR5IHNwZWNpZmllZCBieSBsaW1pdCkuIElmIHNvLCBwdXNoIHRoZSBtYXhpbXVtXG4gICAgICAvLyBlbGVtZW50IHRvIHRoZSBidWZmZXIsIHdlIG1pZ2h0IHdhbnQgdG8gc2F2ZSBpdCBpbiBtZW1vcnkgdG8gcmVkdWNlIHRoZVxuICAgICAgLy8gYW1vdW50IG9mIE1vbmdvIGxvb2t1cHMgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGlmIChzZWxmLl9saW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgLy8gWFhYIGluIHRoZW9yeSB0aGUgc2l6ZSBvZiBwdWJsaXNoZWQgaXMgbm8gbW9yZSB0aGFuIGxpbWl0KzFcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IHNlbGYuX2xpbWl0ICsgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFmdGVyIGFkZGluZyB0byBwdWJsaXNoZWQsIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgLSBzZWxmLl9saW1pdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBkb2N1bWVudHMgYXJlIG92ZXJmbG93aW5nIHRoZSBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2NJZCA9IHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG92ZXJmbG93aW5nRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChvdmVyZmxvd2luZ0RvY0lkKTtcblxuICAgICAgICBpZiAoRUpTT04uZXF1YWxzKG92ZXJmbG93aW5nRG9jSWQsIGlkKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBkb2N1bWVudCBqdXN0IGFkZGVkIGlzIG92ZXJmbG93aW5nIHRoZSBwdWJsaXNoZWQgc2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlZChvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQob3ZlcmZsb3dpbmdEb2NJZCwgb3ZlcmZsb3dpbmdEb2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfcmVtb3ZlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShpZCk7XG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKGlkKTtcbiAgICAgIGlmICghIHNlbGYuX2xpbWl0IHx8IHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPT09IHNlbGYuX2xpbWl0KVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpXG4gICAgICAgIHRocm93IEVycm9yKFwic2VsZi5fcHVibGlzaGVkIGdvdCB0b28gYmlnXCIpO1xuXG4gICAgICAvLyBPSywgd2UgYXJlIHB1Ymxpc2hpbmcgbGVzcyB0aGFuIHRoZSBsaW1pdC4gTWF5YmUgd2Ugc2hvdWxkIGxvb2sgaW4gdGhlXG4gICAgICAvLyBidWZmZXIgdG8gZmluZCB0aGUgbmV4dCBlbGVtZW50IHBhc3Qgd2hhdCB3ZSB3ZXJlIHB1Ymxpc2hpbmcgYmVmb3JlLlxuXG4gICAgICBpZiAoIXNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmVtcHR5KCkpIHtcbiAgICAgICAgLy8gVGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlcjsgbW92ZSB0aGUgZmlyc3QgdGhpbmcgaW4gaXQgdG9cbiAgICAgICAgLy8gX3B1Ymxpc2hlZC5cbiAgICAgICAgdmFyIG5ld0RvY0lkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCk7XG4gICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQobmV3RG9jSWQpO1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChuZXdEb2NJZCwgbmV3RG9jKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGVyZSdzIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlci4gIFRoaXMgY291bGQgbWVhbiBvbmUgb2YgYSBmZXcgdGhpbmdzLlxuXG4gICAgICAvLyAoYSkgV2UgY291bGQgYmUgaW4gdGhlIG1pZGRsZSBvZiByZS1ydW5uaW5nIHRoZSBxdWVyeSAoc3BlY2lmaWNhbGx5LCB3ZVxuICAgICAgLy8gY291bGQgYmUgaW4gX3B1Ymxpc2hOZXdSZXN1bHRzKS4gSW4gdGhhdCBjYXNlLCBfdW5wdWJsaXNoZWRCdWZmZXIgaXNcbiAgICAgIC8vIGVtcHR5IGJlY2F1c2Ugd2UgY2xlYXIgaXQgYXQgdGhlIGJlZ2lubmluZyBvZiBfcHVibGlzaE5ld1Jlc3VsdHMuIEluXG4gICAgICAvLyB0aGlzIGNhc2UsIG91ciBjYWxsZXIgYWxyZWFkeSBrbm93cyB0aGUgZW50aXJlIGFuc3dlciB0byB0aGUgcXVlcnkgYW5kXG4gICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaW5nIGZhbmN5IGhlcmUuICBKdXN0IHJldHVybi5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gKGIpIFdlJ3JlIHByZXR0eSBjb25maWRlbnQgdGhhdCB0aGUgdW5pb24gb2YgX3B1Ymxpc2hlZCBhbmRcbiAgICAgIC8vIF91bnB1Ymxpc2hlZEJ1ZmZlciBjb250YWluIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gQmVjYXVzZVxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGlzIGVtcHR5LCB0aGF0IG1lYW5zIHdlJ3JlIGNvbmZpZGVudCB0aGF0IF9wdWJsaXNoZWRcbiAgICAgIC8vIGNvbnRhaW5zIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gU28gd2UgaGF2ZSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcilcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYykgTWF5YmUgdGhlcmUgYXJlIG90aGVyIGRvY3VtZW50cyBvdXQgdGhlcmUgdGhhdCBzaG91bGQgYmUgaW4gb3VyXG4gICAgICAvLyBidWZmZXIuIEJ1dCBpbiB0aGF0IGNhc2UsIHdoZW4gd2UgZW1wdGllZCBfdW5wdWJsaXNoZWRCdWZmZXIgaW5cbiAgICAgIC8vIF9yZW1vdmVCdWZmZXJlZCwgd2Ugc2hvdWxkIGhhdmUgY2FsbGVkIF9uZWVkVG9Qb2xsUXVlcnksIHdoaWNoIHdpbGxcbiAgICAgIC8vIGVpdGhlciBwdXQgc29tZXRoaW5nIGluIF91bnB1Ymxpc2hlZEJ1ZmZlciBvciBzZXQgX3NhZmVBcHBlbmRUb0J1ZmZlclxuICAgICAgLy8gKG9yIGJvdGgpLCBhbmQgaXQgd2lsbCBwdXQgdXMgaW4gUVVFUllJTkcgZm9yIHRoYXQgd2hvbGUgdGltZS4gU28gaW5cbiAgICAgIC8vIGZhY3QsIHdlIHNob3VsZG4ndCBiZSBhYmxlIHRvIGdldCBoZXJlLlxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCdWZmZXIgaW5leHBsaWNhYmx5IGVtcHR5XCIpO1xuICAgIH0pO1xuICB9LFxuICBfY2hhbmdlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQsIG9sZERvYywgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgIHZhciBwcm9qZWN0ZWROZXcgPSBzZWxmLl9wcm9qZWN0aW9uRm4obmV3RG9jKTtcbiAgICAgIHZhciBwcm9qZWN0ZWRPbGQgPSBzZWxmLl9wcm9qZWN0aW9uRm4ob2xkRG9jKTtcbiAgICAgIHZhciBjaGFuZ2VkID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgICAgICBwcm9qZWN0ZWROZXcsIHByb2plY3RlZE9sZCk7XG4gICAgICBpZiAoIV8uaXNFbXB0eShjaGFuZ2VkKSlcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuY2hhbmdlZChpZCwgY2hhbmdlZCk7XG4gICAgfSk7XG4gIH0sXG4gIF9hZGRCdWZmZXJlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2V0KGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4oZG9jKSk7XG5cbiAgICAgIC8vIElmIHNvbWV0aGluZyBpcyBvdmVyZmxvd2luZyB0aGUgYnVmZmVyLCB3ZSBqdXN0IHJlbW92ZSBpdCBmcm9tIGNhY2hlXG4gICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKTtcblxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUobWF4QnVmZmVyZWRJZCk7XG5cbiAgICAgICAgLy8gU2luY2Ugc29tZXRoaW5nIG1hdGNoaW5nIGlzIHJlbW92ZWQgZnJvbSBjYWNoZSAoYm90aCBwdWJsaXNoZWQgc2V0IGFuZFxuICAgICAgICAvLyBidWZmZXIpLCBzZXQgZmxhZyB0byBmYWxzZVxuICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gSXMgY2FsbGVkIGVpdGhlciB0byByZW1vdmUgdGhlIGRvYyBjb21wbGV0ZWx5IGZyb20gbWF0Y2hpbmcgc2V0IG9yIHRvIG1vdmVcbiAgLy8gaXQgdG8gdGhlIHB1Ymxpc2hlZCBzZXQgbGF0ZXIuXG4gIF9yZW1vdmVCdWZmZXJlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG4gICAgICAvLyBUbyBrZWVwIHRoZSBjb250cmFjdCBcImJ1ZmZlciBpcyBuZXZlciBlbXB0eSBpbiBTVEVBRFkgcGhhc2UgdW5sZXNzIHRoZVxuICAgICAgLy8gZXZlcnl0aGluZyBtYXRjaGluZyBmaXRzIGludG8gcHVibGlzaGVkXCIgdHJ1ZSwgd2UgcG9sbCBldmVyeXRoaW5nIGFzXG4gICAgICAvLyBzb29uIGFzIHdlIHNlZSB0aGUgYnVmZmVyIGJlY29taW5nIGVtcHR5LlxuICAgICAgaWYgKCEgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmICEgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KTtcbiAgfSxcbiAgLy8gQ2FsbGVkIHdoZW4gYSBkb2N1bWVudCBoYXMgam9pbmVkIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfYWRkTWF0Y2hpbmc6IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgcHVibGlzaGVkIFwiICsgaWQpO1xuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwidHJpZWQgdG8gYWRkIHNvbWV0aGluZyBhbHJlYWR5IGV4aXN0ZWQgaW4gYnVmZmVyIFwiICsgaWQpO1xuXG4gICAgICB2YXIgbGltaXQgPSBzZWxmLl9saW1pdDtcbiAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgIHZhciBtYXhQdWJsaXNoZWQgPSAobGltaXQgJiYgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA+IDApID9cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLmdldChzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpIDogbnVsbDtcbiAgICAgIHZhciBtYXhCdWZmZXJlZCA9IChsaW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiAwKVxuICAgICAgICA/IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSlcbiAgICAgICAgOiBudWxsO1xuICAgICAgLy8gVGhlIHF1ZXJ5IGlzIHVubGltaXRlZCBvciBkaWRuJ3QgcHVibGlzaCBlbm91Z2ggZG9jdW1lbnRzIHlldCBvciB0aGVcbiAgICAgIC8vIG5ldyBkb2N1bWVudCB3b3VsZCBmaXQgaW50byBwdWJsaXNoZWQgc2V0IHB1c2hpbmcgdGhlIG1heGltdW0gZWxlbWVudFxuICAgICAgLy8gb3V0LCB0aGVuIHdlIG5lZWQgdG8gcHVibGlzaCB0aGUgZG9jLlxuICAgICAgdmFyIHRvUHVibGlzaCA9ICEgbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA8IGxpbWl0IHx8XG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhQdWJsaXNoZWQpIDwgMDtcblxuICAgICAgLy8gT3RoZXJ3aXNlIHdlIG1pZ2h0IG5lZWQgdG8gYnVmZmVyIGl0IChvbmx5IGluIGNhc2Ugb2YgbGltaXRlZCBxdWVyeSkuXG4gICAgICAvLyBCdWZmZXJpbmcgaXMgYWxsb3dlZCBpZiB0aGUgYnVmZmVyIGlzIG5vdCBmaWxsZWQgdXAgeWV0IGFuZCBhbGxcbiAgICAgIC8vIG1hdGNoaW5nIGRvY3MgYXJlIGVpdGhlciBpbiB0aGUgcHVibGlzaGVkIHNldCBvciBpbiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkFwcGVuZFRvQnVmZmVyID0gIXRvUHVibGlzaCAmJiBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgJiZcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpIDwgbGltaXQ7XG5cbiAgICAgIC8vIE9yIGlmIGl0IGlzIHNtYWxsIGVub3VnaCB0byBiZSBzYWZlbHkgaW5zZXJ0ZWQgdG8gdGhlIG1pZGRsZSBvciB0aGVcbiAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkluc2VydEludG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhCdWZmZXJlZCkgPD0gMDtcblxuICAgICAgdmFyIHRvQnVmZmVyID0gY2FuQXBwZW5kVG9CdWZmZXIgfHwgY2FuSW5zZXJ0SW50b0J1ZmZlcjtcblxuICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZHJvcHBpbmcgaXQgYW5kIG5vdCBzYXZpbmcgdG8gdGhlIGNhY2hlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGxlYXZlcyB0aGUgXCJNYXRjaGluZ1wiIHJlc3VsdHMgc2V0LlxuICAvLyBUYWtlcyByZXNwb25zaWJpbGl0eSBvZiBrZWVwaW5nIF91bnB1Ymxpc2hlZEJ1ZmZlciBpbiBzeW5jIHdpdGggX3B1Ymxpc2hlZFxuICAvLyBhbmQgdGhlIGVmZmVjdCBvZiBsaW1pdCBlbmZvcmNlZC5cbiAgX3JlbW92ZU1hdGNoaW5nOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEgc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkgJiYgISBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byByZW1vdmUgc29tZXRoaW5nIG1hdGNoaW5nIGJ1dCBub3QgY2FjaGVkIFwiICsgaWQpO1xuXG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVEb2M6IGZ1bmN0aW9uIChpZCwgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtYXRjaGVzTm93ID0gbmV3RG9jICYmIHNlbGYuX21hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKG5ld0RvYykucmVzdWx0O1xuXG4gICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuICAgICAgdmFyIGNhY2hlZEJlZm9yZSA9IHB1Ymxpc2hlZEJlZm9yZSB8fCBidWZmZXJlZEJlZm9yZTtcblxuICAgICAgaWYgKG1hdGNoZXNOb3cgJiYgIWNhY2hlZEJlZm9yZSkge1xuICAgICAgICBzZWxmLl9hZGRNYXRjaGluZyhuZXdEb2MpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgIW1hdGNoZXNOb3cpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgbWF0Y2hlc05vdykge1xuICAgICAgICB2YXIgb2xkRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChpZCk7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgICAgdmFyIG1pbkJ1ZmZlcmVkID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1pbkVsZW1lbnRJZCgpKTtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkO1xuXG4gICAgICAgIGlmIChwdWJsaXNoZWRCZWZvcmUpIHtcbiAgICAgICAgICAvLyBVbmxpbWl0ZWQgY2FzZSB3aGVyZSB0aGUgZG9jdW1lbnQgc3RheXMgaW4gcHVibGlzaGVkIG9uY2UgaXRcbiAgICAgICAgICAvLyBtYXRjaGVzIG9yIHRoZSBjYXNlIHdoZW4gd2UgZG9uJ3QgaGF2ZSBlbm91Z2ggbWF0Y2hpbmcgZG9jcyB0b1xuICAgICAgICAgIC8vIHB1Ymxpc2ggb3IgdGhlIGNoYW5nZWQgYnV0IG1hdGNoaW5nIGRvYyB3aWxsIHN0YXkgaW4gcHVibGlzaGVkXG4gICAgICAgICAgLy8gYW55d2F5cy5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIFhYWDogV2UgcmVseSBvbiB0aGUgZW1wdGluZXNzIG9mIGJ1ZmZlci4gQmUgc3VyZSB0byBtYWludGFpbiB0aGVcbiAgICAgICAgICAvLyBmYWN0IHRoYXQgYnVmZmVyIGNhbid0IGJlIGVtcHR5IGlmIHRoZXJlIGFyZSBtYXRjaGluZyBkb2N1bWVudHMgbm90XG4gICAgICAgICAgLy8gcHVibGlzaGVkLiBOb3RhYmx5LCB3ZSBkb24ndCB3YW50IHRvIHNjaGVkdWxlIHJlcG9sbCBhbmQgY29udGludWVcbiAgICAgICAgICAvLyByZWx5aW5nIG9uIHRoaXMgcHJvcGVydHkuXG4gICAgICAgICAgdmFyIHN0YXlzSW5QdWJsaXNoZWQgPSAhIHNlbGYuX2xpbWl0IHx8XG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPT09IDAgfHxcbiAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtaW5CdWZmZXJlZCkgPD0gMDtcblxuICAgICAgICAgIGlmIChzdGF5c0luUHVibGlzaGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9jaGFuZ2VQdWJsaXNoZWQoaWQsIG9sZERvYywgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgdGhlIGNoYW5nZSBkb2MgZG9lc24ndCBzdGF5IGluIHRoZSBwdWJsaXNoZWQsIHJlbW92ZSBpdFxuICAgICAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgICAgICAgIC8vIGJ1dCBpdCBjYW4gbW92ZSBpbnRvIGJ1ZmZlcmVkIG5vdywgY2hlY2sgaXRcbiAgICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAgIHZhciB0b0J1ZmZlciA9IHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciB8fFxuICAgICAgICAgICAgICAgICAgKG1heEJ1ZmZlcmVkICYmIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICAgIGlmICh0b0J1ZmZlcikge1xuICAgICAgICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgbmV3RG9jKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYnVmZmVyZWRCZWZvcmUpIHtcbiAgICAgICAgICBvbGREb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgb2xkIHZlcnNpb24gbWFudWFsbHkgaW5zdGVhZCBvZiB1c2luZyBfcmVtb3ZlQnVmZmVyZWQgc29cbiAgICAgICAgICAvLyB3ZSBkb24ndCB0cmlnZ2VyIHRoZSBxdWVyeWluZyBpbW1lZGlhdGVseS4gIGlmIHdlIGVuZCB0aGlzIGJsb2NrXG4gICAgICAgICAgLy8gd2l0aCB0aGUgYnVmZmVyIGVtcHR5LCB3ZSB3aWxsIG5lZWQgdG8gdHJpZ2dlciB0aGUgcXVlcnkgcG9sbFxuICAgICAgICAgIC8vIG1hbnVhbGx5IHRvby5cbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUoaWQpO1xuXG4gICAgICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IHNlbGYuX3B1Ymxpc2hlZC5nZXQoXG4gICAgICAgICAgICBzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpO1xuICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCkpO1xuXG4gICAgICAgICAgLy8gdGhlIGJ1ZmZlcmVkIGRvYyB3YXMgdXBkYXRlZCwgaXQgY291bGQgbW92ZSB0byBwdWJsaXNoZWRcbiAgICAgICAgICB2YXIgdG9QdWJsaXNoID0gY29tcGFyYXRvcihuZXdEb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAgICAgLy8gb3Igc3RheXMgaW4gYnVmZmVyIGV2ZW4gYWZ0ZXIgdGhlIGNoYW5nZVxuICAgICAgICAgIHZhciBzdGF5c0luQnVmZmVyID0gKCEgdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcikgfHxcbiAgICAgICAgICAgICAgICAoIXRvUHVibGlzaCAmJiBtYXhCdWZmZXJlZCAmJlxuICAgICAgICAgICAgICAgICBjb21wYXJhdG9yKG5ld0RvYywgbWF4QnVmZmVyZWQpIDw9IDApO1xuXG4gICAgICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RheXNJbkJ1ZmZlcikge1xuICAgICAgICAgICAgLy8gc3RheXMgaW4gYnVmZmVyIGJ1dCBjaGFuZ2VzXG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBOb3JtYWxseSB0aGlzIGNoZWNrIHdvdWxkIGhhdmUgYmVlbiBkb25lIGluIF9yZW1vdmVCdWZmZXJlZCBidXRcbiAgICAgICAgICAgIC8vIHdlIGRpZG4ndCB1c2UgaXQsIHNvIHdlIG5lZWQgdG8gZG8gaXQgb3Vyc2VsZiBub3cuXG4gICAgICAgICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhY2hlZEJlZm9yZSBpbXBsaWVzIGVpdGhlciBvZiBwdWJsaXNoZWRCZWZvcmUgb3IgYnVmZmVyZWRCZWZvcmUgaXMgdHJ1ZS5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2ZldGNoTW9kaWZpZWREb2N1bWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5GRVRDSElORyk7XG4gICAgICAvLyBEZWZlciwgYmVjYXVzZSBub3RoaW5nIGNhbGxlZCBmcm9tIHRoZSBvcGxvZyBlbnRyeSBoYW5kbGVyIG1heSB5aWVsZCxcbiAgICAgIC8vIGJ1dCBmZXRjaCgpIHlpZWxkcy5cbiAgICAgIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCAmJiAhc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgIC8vIFdoaWxlIGZldGNoaW5nLCB3ZSBkZWNpZGVkIHRvIGdvIGludG8gUVVFUllJTkcgbW9kZSwgYW5kIHRoZW4gd2VcbiAgICAgICAgICAgIC8vIHNhdyBhbm90aGVyIG9wbG9nIGVudHJ5LCBzbyBfbmVlZFRvRmV0Y2ggaXMgbm90IGVtcHR5LiBCdXQgd2VcbiAgICAgICAgICAgIC8vIHNob3VsZG4ndCBmZXRjaCB0aGVzZSBkb2N1bWVudHMgdW50aWwgQUZURVIgdGhlIHF1ZXJ5IGlzIGRvbmUuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBCZWluZyBpbiBzdGVhZHkgcGhhc2UgaGVyZSB3b3VsZCBiZSBzdXJwcmlzaW5nLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuRkVUQ0hJTkcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwaGFzZSBpbiBmZXRjaE1vZGlmaWVkRG9jdW1lbnRzOiBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gc2VsZi5fbmVlZFRvRmV0Y2g7XG4gICAgICAgICAgdmFyIHRoaXNHZW5lcmF0aW9uID0gKytzZWxmLl9mZXRjaEdlbmVyYXRpb247XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgICAgICB2YXIgd2FpdGluZyA9IDA7XG4gICAgICAgICAgdmFyIGZ1dCA9IG5ldyBGdXR1cmU7XG4gICAgICAgICAgLy8gVGhpcyBsb29wIGlzIHNhZmUsIGJlY2F1c2UgX2N1cnJlbnRseUZldGNoaW5nIHdpbGwgbm90IGJlIHVwZGF0ZWRcbiAgICAgICAgICAvLyBkdXJpbmcgdGhpcyBsb29wIChpbiBmYWN0LCBpdCBpcyBuZXZlciBtdXRhdGVkKS5cbiAgICAgICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZy5mb3JFYWNoKGZ1bmN0aW9uIChjYWNoZUtleSwgaWQpIHtcbiAgICAgICAgICAgIHdhaXRpbmcrKztcbiAgICAgICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9kb2NGZXRjaGVyLmZldGNoKFxuICAgICAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNhY2hlS2V5LFxuICAgICAgICAgICAgICBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSBmZXRjaGluZyBkb2N1bWVudHM6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnZXQgYW4gZXJyb3IgZnJvbSB0aGUgZmV0Y2hlciAoZWcsIHRyb3VibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY29ubmVjdGluZyB0byBNb25nbyksIGxldCdzIGp1c3QgYWJhbmRvbiB0aGUgZmV0Y2ggcGhhc2VcbiAgICAgICAgICAgICAgICAgICAgLy8gYWx0b2dldGhlciBhbmQgZmFsbCBiYWNrIHRvIHBvbGxpbmcuIEl0J3Mgbm90IGxpa2Ugd2UncmVcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBsaXZlIHVwZGF0ZXMgYW55d2F5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXNlbGYuX3N0b3BwZWQgJiYgc2VsZi5fcGhhc2UgPT09IFBIQVNFLkZFVENISU5HXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIHNlbGYuX2ZldGNoR2VuZXJhdGlvbiA9PT0gdGhpc0dlbmVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgcmUtY2hlY2sgdGhlIGdlbmVyYXRpb24gaW4gY2FzZSB3ZSd2ZSBoYWQgYW4gZXhwbGljaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChlZywgaW4gYW5vdGhlciBmaWJlcikgd2hpY2ggc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgIC8vIGVmZmVjdGl2ZWx5IGNhbmNlbCB0aGlzIHJvdW5kIG9mIGZldGNoZXMuICAoX3BvbGxRdWVyeVxuICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnRzIHRoZSBnZW5lcmF0aW9uLilcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICB3YWl0aW5nLS07XG4gICAgICAgICAgICAgICAgICAvLyBCZWNhdXNlIGZldGNoKCkgbmV2ZXIgY2FsbHMgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksXG4gICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHNhZmUgKGllLCB3ZSB3b24ndCBjYWxsIGZ1dC5yZXR1cm4oKSBiZWZvcmUgdGhlXG4gICAgICAgICAgICAgICAgICAvLyBmb3JFYWNoIGlzIGRvbmUpLlxuICAgICAgICAgICAgICAgICAgaWYgKHdhaXRpbmcgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIGZ1dC5yZXR1cm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBmdXQud2FpdCgpO1xuICAgICAgICAgIC8vIEV4aXQgbm93IGlmIHdlJ3ZlIGhhZCBhIF9wb2xsUXVlcnkgY2FsbCAoaGVyZSBvciBpbiBhbm90aGVyIGZpYmVyKS5cbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSdyZSBkb25lIGZldGNoaW5nLCBzbyB3ZSBjYW4gYmUgc3RlYWR5LCB1bmxlc3Mgd2UndmUgaGFkIGFcbiAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgIHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH0sXG4gIF9iZVN0ZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlNURUFEWSk7XG4gICAgICB2YXIgd3JpdGVzID0gc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeTtcbiAgICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBbXTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICBfLmVhY2god3JpdGVzLCBmdW5jdGlvbiAodykge1xuICAgICAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWRGb3JPcChvcCksIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBpZEZvck9wKG9wKTtcbiAgICAgIC8vIElmIHdlJ3JlIGFscmVhZHkgZmV0Y2hpbmcgdGhpcyBvbmUsIG9yIGFib3V0IHRvLCB3ZSBjYW4ndCBvcHRpbWl6ZTtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHdlIGZldGNoIGl0IGFnYWluIGlmIG5lY2Vzc2FyeS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkcgJiZcbiAgICAgICAgICAoKHNlbGYuX2N1cnJlbnRseUZldGNoaW5nICYmIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmhhcyhpZCkpIHx8XG4gICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLmhhcyhpZCkpKSB7XG4gICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wLm9wID09PSAnZCcpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpIHx8XG4gICAgICAgICAgICAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkpXG4gICAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gcHVibGlzaGVkXCIpO1xuICAgICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gYnVmZmVyXCIpO1xuXG4gICAgICAgIC8vIFhYWCB3aGF0IGlmIHNlbGVjdG9yIHlpZWxkcz8gIGZvciBub3cgaXQgY2FuJ3QgYnV0IGxhdGVyIGl0IGNvdWxkXG4gICAgICAgIC8vIGhhdmUgJHdoZXJlXG4gICAgICAgIGlmIChzZWxmLl9tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhvcC5vKS5yZXN1bHQpXG4gICAgICAgICAgc2VsZi5fYWRkTWF0Y2hpbmcob3Aubyk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAndScpIHtcbiAgICAgICAgLy8gSXMgdGhpcyBhIG1vZGlmaWVyICgkc2V0LyR1bnNldCwgd2hpY2ggbWF5IHJlcXVpcmUgdXMgdG8gcG9sbCB0aGVcbiAgICAgICAgLy8gZGF0YWJhc2UgdG8gZmlndXJlIG91dCBpZiB0aGUgd2hvbGUgZG9jdW1lbnQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IpIG9yXG4gICAgICAgIC8vIGEgcmVwbGFjZW1lbnQgKGluIHdoaWNoIGNhc2Ugd2UgY2FuIGp1c3QgZGlyZWN0bHkgcmUtZXZhbHVhdGUgdGhlXG4gICAgICAgIC8vIHNlbGVjdG9yKT9cbiAgICAgICAgdmFyIGlzUmVwbGFjZSA9ICFfLmhhcyhvcC5vLCAnJHNldCcpICYmICFfLmhhcyhvcC5vLCAnJHVuc2V0Jyk7XG4gICAgICAgIC8vIElmIHRoaXMgbW9kaWZpZXIgbW9kaWZpZXMgc29tZXRoaW5nIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZSAoaWUsXG4gICAgICAgIC8vIGFueXRoaW5nIHdpdGggRUpTT04kKSwgdGhlbiB3ZSBjYW4ndCB0cnkgdG8gdXNlXG4gICAgICAgIC8vIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5LCBzaW5jZSB0aGF0IGp1c3QgbXV0YXRlcyB0aGUgRUpTT04gZW5jb2RpbmcsXG4gICAgICAgIC8vIG5vdCB0aGUgYWN0dWFsIG9iamVjdC5cbiAgICAgICAgdmFyIGNhbkRpcmVjdGx5TW9kaWZ5RG9jID1cbiAgICAgICAgICAhaXNSZXBsYWNlICYmIG1vZGlmaWVyQ2FuQmVEaXJlY3RseUFwcGxpZWQob3Aubyk7XG5cbiAgICAgICAgdmFyIHB1Ymxpc2hlZEJlZm9yZSA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpO1xuICAgICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuXG4gICAgICAgIGlmIChpc1JlcGxhY2UpIHtcbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIF8uZXh0ZW5kKHtfaWQ6IGlkfSwgb3AubykpO1xuICAgICAgICB9IGVsc2UgaWYgKChwdWJsaXNoZWRCZWZvcmUgfHwgYnVmZmVyZWRCZWZvcmUpICYmXG4gICAgICAgICAgICAgICAgICAgY2FuRGlyZWN0bHlNb2RpZnlEb2MpIHtcbiAgICAgICAgICAvLyBPaCBncmVhdCwgd2UgYWN0dWFsbHkga25vdyB3aGF0IHRoZSBkb2N1bWVudCBpcywgc28gd2UgY2FuIGFwcGx5XG4gICAgICAgICAgLy8gdGhpcyBkaXJlY3RseS5cbiAgICAgICAgICB2YXIgbmV3RG9jID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZClcbiAgICAgICAgICAgID8gc2VsZi5fcHVibGlzaGVkLmdldChpZCkgOiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIG5ld0RvYyA9IEVKU09OLmNsb25lKG5ld0RvYyk7XG5cbiAgICAgICAgICBuZXdEb2MuX2lkID0gaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgb3Aubyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gXCJNaW5pbW9uZ29FcnJvclwiKVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgLy8gV2UgZGlkbid0IHVuZGVyc3RhbmQgdGhlIG1vZGlmaWVyLiAgUmUtZmV0Y2guXG4gICAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWQsIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgICAgfSBlbHNlIGlmICghY2FuRGlyZWN0bHlNb2RpZnlEb2MgfHxcbiAgICAgICAgICAgICAgICAgICBzZWxmLl9tYXRjaGVyLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyKG9wLm8pIHx8XG4gICAgICAgICAgICAgICAgICAgKHNlbGYuX3NvcnRlciAmJiBzZWxmLl9zb3J0ZXIuYWZmZWN0ZWRCeU1vZGlmaWVyKG9wLm8pKSkge1xuICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpXG4gICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiWFhYIFNVUlBSSVNJTkcgT1BFUkFUSU9OOiBcIiArIG9wKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gWWllbGRzIVxuICBfcnVuSW5pdGlhbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3Bsb2cgc3RvcHBlZCBzdXJwcmlzaW5nbHkgZWFybHlcIik7XG5cbiAgICBzZWxmLl9ydW5RdWVyeSh7aW5pdGlhbDogdHJ1ZX0pOyAgLy8geWllbGRzXG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjsgIC8vIGNhbiBoYXBwZW4gb24gcXVlcnlFcnJvclxuXG4gICAgLy8gQWxsb3cgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdG8gcmV0dXJuLiAoQWZ0ZXIgdGhpcywgaXQncyBwb3NzaWJsZSBmb3JcbiAgICAvLyBzdG9wKCkgdG8gYmUgY2FsbGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgc2VsZi5fZG9uZVF1ZXJ5aW5nKCk7ICAvLyB5aWVsZHNcbiAgfSxcblxuICAvLyBJbiB2YXJpb3VzIGNpcmN1bXN0YW5jZXMsIHdlIG1heSBqdXN0IHdhbnQgdG8gc3RvcCBwcm9jZXNzaW5nIHRoZSBvcGxvZyBhbmRcbiAgLy8gcmUtcnVuIHRoZSBpbml0aWFsIHF1ZXJ5LCBqdXN0IGFzIGlmIHdlIHdlcmUgYSBQb2xsaW5nT2JzZXJ2ZURyaXZlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgYmVlbiBpbiBGRVRDSElORyBmb3IgXCJ0b29cbiAgLy8gbG9uZ1wiLlxuICAvL1xuICAvLyBYWFggV2Ugc2hvdWxkIGNhbGwgdGhpcyB3aGVuIHdlIGRldGVjdCBNb25nbyBmYWlsb3ZlciAoc2luY2UgdGhhdCBtaWdodFxuICAvLyBtZWFuIHRoYXQgc29tZSBvZiB0aGUgb3Bsb2cgZW50cmllcyB3ZSBoYXZlIHByb2Nlc3NlZCBoYXZlIGJlZW4gcm9sbGVkXG4gIC8vIGJhY2spLiBUaGUgTm9kZSBNb25nbyBkcml2ZXIgaXMgaW4gdGhlIG1pZGRsZSBvZiBhIGJ1bmNoIG9mIGh1Z2VcbiAgLy8gcmVmYWN0b3JpbmdzLCBpbmNsdWRpbmcgdGhlIHdheSB0aGF0IGl0IG5vdGlmaWVzIHlvdSB3aGVuIHByaW1hcnlcbiAgLy8gY2hhbmdlcy4gV2lsbCBwdXQgb2ZmIGltcGxlbWVudGluZyB0aGlzIHVudGlsIGRyaXZlciAxLjQgaXMgb3V0LlxuICBfcG9sbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFlheSwgd2UgZ2V0IHRvIGZvcmdldCBhYm91dCBhbGwgdGhlIHRoaW5ncyB3ZSB0aG91Z2h0IHdlIGhhZCB0byBmZXRjaC5cbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgICArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjsgIC8vIGlnbm9yZSBhbnkgaW4tZmxpZ2h0IGZldGNoZXNcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gICAgICAvLyBEZWZlciBzbyB0aGF0IHdlIGRvbid0IHlpZWxkLiAgV2UgZG9uJ3QgbmVlZCBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeVxuICAgICAgLy8gaGVyZSBiZWNhdXNlIFN3aXRjaGVkVG9RdWVyeSBpcyBub3QgdGhyb3duIGluIFFVRVJZSU5HIG1vZGUuXG4gICAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9ydW5RdWVyeSgpO1xuICAgICAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1blF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmV3UmVzdWx0cywgbmV3QnVmZmVyO1xuXG4gICAgLy8gVGhpcyB3aGlsZSBsb29wIGlzIGp1c3QgdG8gcmV0cnkgZmFpbHVyZXMuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGJlZW4gc3RvcHBlZCwgd2UgZG9uJ3QgaGF2ZSB0byBydW4gYW55dGhpbmcgYW55IG1vcmUuXG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBuZXdSZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBuZXdCdWZmZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgLy8gUXVlcnkgMnggZG9jdW1lbnRzIGFzIHRoZSBoYWxmIGV4Y2x1ZGVkIGZyb20gdGhlIG9yaWdpbmFsIHF1ZXJ5IHdpbGwgZ29cbiAgICAgIC8vIGludG8gdW5wdWJsaXNoZWQgYnVmZmVyIHRvIHJlZHVjZSBhZGRpdGlvbmFsIE1vbmdvIGxvb2t1cHMgaW4gY2FzZXNcbiAgICAgIC8vIHdoZW4gZG9jdW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIHB1Ymxpc2hlZCBzZXQgYW5kIG5lZWQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQuXG4gICAgICAvLyBYWFggbmVlZHMgbW9yZSB0aG91Z2h0IG9uIG5vbi16ZXJvIHNraXBcbiAgICAgIC8vIFhYWCAyIGlzIGEgXCJtYWdpYyBudW1iZXJcIiBtZWFuaW5nIHRoZXJlIGlzIGFuIGV4dHJhIGNodW5rIG9mIGRvY3MgZm9yXG4gICAgICAvLyBidWZmZXIgaWYgc3VjaCBpcyBuZWVkZWQuXG4gICAgICB2YXIgY3Vyc29yID0gc2VsZi5fY3Vyc29yRm9yUXVlcnkoeyBsaW1pdDogc2VsZi5fbGltaXQgKiAyIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3Vyc29yLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkgeyAgLy8geWllbGRzXG4gICAgICAgICAgaWYgKCFzZWxmLl9saW1pdCB8fCBpIDwgc2VsZi5fbGltaXQpIHtcbiAgICAgICAgICAgIG5ld1Jlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdGlhbCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlXG4gICAgICAgICAgLy8gc2hvdWxkIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHNcbiAgICAgICAgICAvLyB1cCBjYWxsaW5nIGBzdG9wYCBvbiB1cykuXG4gICAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnk6IFwiICsgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5fcHVibGlzaE5ld1Jlc3VsdHMobmV3UmVzdWx0cywgbmV3QnVmZmVyKTtcbiAgfSxcblxuICAvLyBUcmFuc2l0aW9ucyB0byBRVUVSWUlORyBhbmQgcnVucyBhbm90aGVyIHF1ZXJ5LCBvciAoaWYgYWxyZWFkeSBpbiBRVUVSWUlORylcbiAgLy8gZW5zdXJlcyB0aGF0IHdlIHdpbGwgcXVlcnkgYWdhaW4gbGF0ZXIuXG4gIC8vXG4gIC8vIFRoaXMgZnVuY3Rpb24gbWF5IG5vdCBibG9jaywgYmVjYXVzZSBpdCBpcyBjYWxsZWQgZnJvbSBhbiBvcGxvZyBlbnRyeVxuICAvLyBoYW5kbGVyLiBIb3dldmVyLCBpZiB3ZSB3ZXJlIG5vdCBhbHJlYWR5IGluIHRoZSBRVUVSWUlORyBwaGFzZSwgaXQgdGhyb3dzXG4gIC8vIGFuIGV4Y2VwdGlvbiB0aGF0IGlzIGNhdWdodCBieSB0aGUgY2xvc2VzdCBzdXJyb3VuZGluZ1xuICAvLyBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSBjYWxsOyB0aGlzIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjb250aW51ZSBydW5uaW5nXG4gIC8vIGNsb3NlIHRoYXQgd2FzIGRlc2lnbmVkIGZvciBhbm90aGVyIHBoYXNlIGluc2lkZSBQSEFTRS5RVUVSWUlORy5cbiAgLy9cbiAgLy8gKEl0J3MgYWxzbyBuZWNlc3Nhcnkgd2hlbmV2ZXIgbG9naWMgaW4gdGhpcyBmaWxlIHlpZWxkcyB0byBjaGVjayB0aGF0IG90aGVyXG4gIC8vIHBoYXNlcyBoYXZlbid0IHB1dCB1cyBpbnRvIFFVRVJZSU5HIG1vZGUsIHRob3VnaDsgZWcsXG4gIC8vIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIGRvZXMgdGhpcy4pXG4gIF9uZWVkVG9Qb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGFscmVhZHkgaW4gdGhlIG1pZGRsZSBvZiBhIHF1ZXJ5LCB3ZSBjYW4gcXVlcnkgbm93XG4gICAgICAvLyAocG9zc2libHkgcGF1c2luZyBGRVRDSElORykuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgICB0aHJvdyBuZXcgU3dpdGNoZWRUb1F1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBXZSdyZSBjdXJyZW50bHkgaW4gUVVFUllJTkcuIFNldCBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgd2UgcnVuIGFub3RoZXJcbiAgICAgIC8vIHF1ZXJ5IHdoZW4gd2UncmUgZG9uZS5cbiAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfZG9uZVF1ZXJ5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLndhaXRVbnRpbENhdWdodFVwKCk7ICAvLyB5aWVsZHNcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgdGhyb3cgRXJyb3IoXCJQaGFzZSB1bmV4cGVjdGVkbHkgXCIgKyBzZWxmLl9waGFzZSk7XG5cbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5KSB7XG4gICAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICAgICAgICBzZWxmLl9wb2xsUXVlcnkoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICBzZWxmLl9iZVN0ZWFkeSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9jdXJzb3JGb3JRdWVyeTogZnVuY3Rpb24gKG9wdGlvbnNPdmVyd3JpdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRoZSBxdWVyeSB3ZSBydW4gaXMgYWxtb3N0IHRoZSBzYW1lIGFzIHRoZSBjdXJzb3Igd2UgYXJlIG9ic2VydmluZyxcbiAgICAgIC8vIHdpdGggYSBmZXcgY2hhbmdlcy4gV2UgbmVlZCB0byByZWFkIGFsbCB0aGUgZmllbGRzIHRoYXQgYXJlIHJlbGV2YW50IHRvXG4gICAgICAvLyB0aGUgc2VsZWN0b3IsIG5vdCBqdXN0IHRoZSBmaWVsZHMgd2UgYXJlIGdvaW5nIHRvIHB1Ymxpc2ggKHRoYXQncyB0aGVcbiAgICAgIC8vIFwic2hhcmVkXCIgcHJvamVjdGlvbikuIEFuZCB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IGFueSB0cmFuc2Zvcm0gaW4gdGhlXG4gICAgICAvLyBjdXJzb3IsIGJlY2F1c2Ugb2JzZXJ2ZUNoYW5nZXMgc2hvdWxkbid0IHVzZSB0aGUgdHJhbnNmb3JtLlxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmNsb25lKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuXG4gICAgICAvLyBBbGxvdyB0aGUgY2FsbGVyIHRvIG1vZGlmeSB0aGUgb3B0aW9ucy4gVXNlZnVsIHRvIHNwZWNpZnkgZGlmZmVyZW50XG4gICAgICAvLyBza2lwIGFuZCBsaW1pdCB2YWx1ZXMuXG4gICAgICBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zT3ZlcndyaXRlKTtcblxuICAgICAgb3B0aW9ucy5maWVsZHMgPSBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uO1xuICAgICAgZGVsZXRlIG9wdGlvbnMudHJhbnNmb3JtO1xuICAgICAgLy8gV2UgYXJlIE5PVCBkZWVwIGNsb25pbmcgZmllbGRzIG9yIHNlbGVjdG9yIGhlcmUsIHdoaWNoIHNob3VsZCBiZSBPSy5cbiAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLFxuICAgICAgICBvcHRpb25zKTtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHNlbGYuX21vbmdvSGFuZGxlLCBkZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvLyBSZXBsYWNlIHNlbGYuX3B1Ymxpc2hlZCB3aXRoIG5ld1Jlc3VsdHMgKGJvdGggYXJlIElkTWFwcyksIGludm9raW5nIG9ic2VydmVcbiAgLy8gY2FsbGJhY2tzIG9uIHRoZSBtdWx0aXBsZXhlci5cbiAgLy8gUmVwbGFjZSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciB3aXRoIG5ld0J1ZmZlci5cbiAgLy9cbiAgLy8gWFhYIFRoaXMgaXMgdmVyeSBzaW1pbGFyIHRvIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcy4gV2VcbiAgLy8gc2hvdWxkIHJlYWxseTogKGEpIFVuaWZ5IElkTWFwIGFuZCBPcmRlcmVkRGljdCBpbnRvIFVub3JkZXJlZC9PcmRlcmVkRGljdFxuICAvLyAoYikgUmV3cml0ZSBkaWZmLmpzIHRvIHVzZSB0aGVzZSBjbGFzc2VzIGluc3RlYWQgb2YgYXJyYXlzIGFuZCBvYmplY3RzLlxuICBfcHVibGlzaE5ld1Jlc3VsdHM6IGZ1bmN0aW9uIChuZXdSZXN1bHRzLCBuZXdCdWZmZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBJZiB0aGUgcXVlcnkgaXMgbGltaXRlZCBhbmQgdGhlcmUgaXMgYSBidWZmZXIsIHNodXQgZG93biBzbyBpdCBkb2Vzbid0XG4gICAgICAvLyBzdGF5IGluIGEgd2F5LlxuICAgICAgaWYgKHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpcnN0IHJlbW92ZSBhbnl0aGluZyB0aGF0J3MgZ29uZS4gQmUgY2FyZWZ1bCBub3QgdG8gbW9kaWZ5XG4gICAgICAvLyBzZWxmLl9wdWJsaXNoZWQgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXQuXG4gICAgICB2YXIgaWRzVG9SZW1vdmUgPSBbXTtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIGlkc1RvUmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfSk7XG4gICAgICBfLmVhY2goaWRzVG9SZW1vdmUsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIE5vdyBkbyBhZGRzIGFuZCBjaGFuZ2VzLlxuICAgICAgLy8gSWYgc2VsZiBoYXMgYSBidWZmZXIgYW5kIGxpbWl0LCB0aGUgbmV3IGZldGNoZWQgcmVzdWx0IHdpbGwgYmVcbiAgICAgIC8vIGxpbWl0ZWQgY29ycmVjdGx5IGFzIHRoZSBxdWVyeSBoYXMgc29ydCBzcGVjaWZpZXIuXG4gICAgICBuZXdSZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhbml0eS1jaGVjayB0aGF0IGV2ZXJ5dGhpbmcgd2UgdHJpZWQgdG8gcHV0IGludG8gX3B1Ymxpc2hlZCBlbmRlZCB1cFxuICAgICAgLy8gdGhlcmUuXG4gICAgICAvLyBYWFggaWYgdGhpcyBpcyBzbG93LCByZW1vdmUgaXQgbGF0ZXJcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpICE9PSBuZXdSZXN1bHRzLnNpemUoKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICBcIlRoZSBNb25nbyBzZXJ2ZXIgYW5kIHRoZSBNZXRlb3IgcXVlcnkgZGlzYWdyZWUgb24gaG93IFwiICtcbiAgICAgICAgICAgIFwibWFueSBkb2N1bWVudHMgbWF0Y2ggeW91ciBxdWVyeS4gTWF5YmUgaXQgaXMgaGl0dGluZyBhIE1vbmdvIFwiICtcbiAgICAgICAgICAgIFwiZWRnZSBjYXNlPyBUaGUgcXVlcnkgaXM6IFwiICtcbiAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvcikpO1xuICAgICAgfVxuICAgICAgc2VsZi5fcHVibGlzaGVkLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgaWYgKCFuZXdSZXN1bHRzLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgRXJyb3IoXCJfcHVibGlzaGVkIGhhcyBhIGRvYyB0aGF0IG5ld1Jlc3VsdHMgZG9lc24ndDsgXCIgKyBpZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gRmluYWxseSwgcmVwbGFjZSB0aGUgYnVmZmVyXG4gICAgICBuZXdCdWZmZXIuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgZG9jKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBuZXdCdWZmZXIuc2l6ZSgpIDwgc2VsZi5fbGltaXQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBzdG9wIGZ1bmN0aW9uIGlzIGludm9rZWQgZnJvbSB0aGUgb25TdG9wIG9mIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIsIHNvXG4gIC8vIGl0IHNob3VsZG4ndCBhY3R1YWxseSBiZSBwb3NzaWJsZSB0byBjYWxsIGl0IHVudGlsIHRoZSBtdWx0aXBsZXhlciBpc1xuICAvLyByZWFkeS5cbiAgLy9cbiAgLy8gSXQncyBpbXBvcnRhbnQgdG8gY2hlY2sgc2VsZi5fc3RvcHBlZCBhZnRlciBldmVyeSBjYWxsIGluIHRoaXMgZmlsZSB0aGF0XG4gIC8vIGNhbiB5aWVsZCFcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBfLmVhY2goc2VsZi5fc3RvcEhhbmRsZXMsIGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICAvLyBOb3RlOiB3ZSAqZG9uJ3QqIHVzZSBtdWx0aXBsZXhlci5vbkZsdXNoIGhlcmUgYmVjYXVzZSB0aGlzIHN0b3BcbiAgICAvLyBjYWxsYmFjayBpcyBhY3R1YWxseSBpbnZva2VkIGJ5IHRoZSBtdWx0aXBsZXhlciBpdHNlbGYgd2hlbiBpdCBoYXNcbiAgICAvLyBkZXRlcm1pbmVkIHRoYXQgdGhlcmUgYXJlIG5vIGhhbmRsZXMgbGVmdC4gU28gbm90aGluZyBpcyBhY3R1YWxseSBnb2luZ1xuICAgIC8vIHRvIGdldCBmbHVzaGVkIChhbmQgaXQncyBwcm9iYWJseSBub3QgdmFsaWQgdG8gY2FsbCBtZXRob2RzIG9uIHRoZVxuICAgIC8vIGR5aW5nIG11bHRpcGxleGVyKS5cbiAgICBfLmVhY2goc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSwgZnVuY3Rpb24gKHcpIHtcbiAgICAgIHcuY29tbWl0dGVkKCk7ICAvLyBtYXliZSB5aWVsZHM/XG4gICAgfSk7XG4gICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IG51bGw7XG5cbiAgICAvLyBQcm9hY3RpdmVseSBkcm9wIHJlZmVyZW5jZXMgdG8gcG90ZW50aWFsbHkgYmlnIHRoaW5ncy5cbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBudWxsO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbnVsbDtcbiAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG51bGw7XG4gICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgIHNlbGYuX29wbG9nRW50cnlIYW5kbGUgPSBudWxsO1xuICAgIHNlbGYuX2xpc3RlbmVyc0hhbmRsZSA9IG51bGw7XG5cbiAgICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgLTEpO1xuICB9LFxuXG4gIF9yZWdpc3RlclBoYXNlQ2hhbmdlOiBmdW5jdGlvbiAocGhhc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlO1xuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UpIHtcbiAgICAgICAgdmFyIHRpbWVEaWZmID0gbm93IC0gc2VsZi5fcGhhc2VTdGFydFRpbWU7XG4gICAgICAgIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJ0aW1lLXNwZW50LWluLVwiICsgc2VsZi5fcGhhc2UgKyBcIi1waGFzZVwiLCB0aW1lRGlmZik7XG4gICAgICB9XG5cbiAgICAgIHNlbGYuX3BoYXNlID0gcGhhc2U7XG4gICAgICBzZWxmLl9waGFzZVN0YXJ0VGltZSA9IG5vdztcbiAgICB9KTtcbiAgfVxufSk7XG5cbi8vIERvZXMgb3VyIG9wbG9nIHRhaWxpbmcgY29kZSBzdXBwb3J0IHRoaXMgY3Vyc29yPyBGb3Igbm93LCB3ZSBhcmUgYmVpbmcgdmVyeVxuLy8gY29uc2VydmF0aXZlIGFuZCBhbGxvd2luZyBvbmx5IHNpbXBsZSBxdWVyaWVzIHdpdGggc2ltcGxlIG9wdGlvbnMuXG4vLyAoVGhpcyBpcyBhIFwic3RhdGljIG1ldGhvZFwiLilcbk9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpIHtcbiAgLy8gRmlyc3QsIGNoZWNrIHRoZSBvcHRpb25zLlxuICB2YXIgb3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG5cbiAgLy8gRGlkIHRoZSB1c2VyIHNheSBubyBleHBsaWNpdGx5P1xuICAvLyB1bmRlcnNjb3JlZCB2ZXJzaW9uIG9mIHRoZSBvcHRpb24gaXMgQ09NUEFUIHdpdGggMS4yXG4gIGlmIChvcHRpb25zLmRpc2FibGVPcGxvZyB8fCBvcHRpb25zLl9kaXNhYmxlT3Bsb2cpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIHNraXAgaXMgbm90IHN1cHBvcnRlZDogdG8gc3VwcG9ydCBpdCB3ZSB3b3VsZCBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgYWxsXG4gIC8vIFwic2tpcHBlZFwiIGRvY3VtZW50cyBvciBhdCBsZWFzdCB0aGVpciBpZHMuXG4gIC8vIGxpbWl0IHcvbyBhIHNvcnQgc3BlY2lmaWVyIGlzIG5vdCBzdXBwb3J0ZWQ6IGN1cnJlbnQgaW1wbGVtZW50YXRpb24gbmVlZHMgYVxuICAvLyBkZXRlcm1pbmlzdGljIHdheSB0byBvcmRlciBkb2N1bWVudHMuXG4gIGlmIChvcHRpb25zLnNraXAgfHwgKG9wdGlvbnMubGltaXQgJiYgIW9wdGlvbnMuc29ydCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiBhIGZpZWxkcyBwcm9qZWN0aW9uIG9wdGlvbiBpcyBnaXZlbiBjaGVjayBpZiBpdCBpcyBzdXBwb3J0ZWQgYnlcbiAgLy8gbWluaW1vbmdvIChzb21lIG9wZXJhdG9ycyBhcmUgbm90IHN1cHBvcnRlZCkuXG4gIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgIHRyeSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbihvcHRpb25zLmZpZWxkcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubmFtZSA9PT0gXCJNaW5pbW9uZ29FcnJvclwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gV2UgZG9uJ3QgYWxsb3cgdGhlIGZvbGxvd2luZyBzZWxlY3RvcnM6XG4gIC8vICAgLSAkd2hlcmUgKG5vdCBjb25maWRlbnQgdGhhdCB3ZSBwcm92aWRlIHRoZSBzYW1lIEpTIGVudmlyb25tZW50XG4gIC8vICAgICAgICAgICAgIGFzIE1vbmdvLCBhbmQgY2FuIHlpZWxkISlcbiAgLy8gICAtICRuZWFyIChoYXMgXCJpbnRlcmVzdGluZ1wiIHByb3BlcnRpZXMgaW4gTW9uZ29EQiwgbGlrZSB0aGUgcG9zc2liaWxpdHlcbiAgLy8gICAgICAgICAgICBvZiByZXR1cm5pbmcgYW4gSUQgbXVsdGlwbGUgdGltZXMsIHRob3VnaCBldmVuIHBvbGxpbmcgbWF5YmVcbiAgLy8gICAgICAgICAgICBoYXZlIGEgYnVnIHRoZXJlKVxuICAvLyAgICAgICAgICAgWFhYOiBvbmNlIHdlIHN1cHBvcnQgaXQsIHdlIHdvdWxkIG5lZWQgdG8gdGhpbmsgbW9yZSBvbiBob3cgd2VcbiAgLy8gICAgICAgICAgIGluaXRpYWxpemUgdGhlIGNvbXBhcmF0b3JzIHdoZW4gd2UgY3JlYXRlIHRoZSBkcml2ZXIuXG4gIHJldHVybiAhbWF0Y2hlci5oYXNXaGVyZSgpICYmICFtYXRjaGVyLmhhc0dlb1F1ZXJ5KCk7XG59O1xuXG52YXIgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCA9IGZ1bmN0aW9uIChtb2RpZmllcikge1xuICByZXR1cm4gXy5hbGwobW9kaWZpZXIsIGZ1bmN0aW9uIChmaWVsZHMsIG9wZXJhdGlvbikge1xuICAgIHJldHVybiBfLmFsbChmaWVsZHMsIGZ1bmN0aW9uICh2YWx1ZSwgZmllbGQpIHtcbiAgICAgIHJldHVybiAhL0VKU09OXFwkLy50ZXN0KGZpZWxkKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5Nb25nb0ludGVybmFscy5PcGxvZ09ic2VydmVEcml2ZXIgPSBPcGxvZ09ic2VydmVEcml2ZXI7XG4iLCJMb2NhbENvbGxlY3Rpb25Ecml2ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5ub0Nvbm5Db2xsZWN0aW9ucyA9IHt9O1xufTtcblxudmFyIGVuc3VyZUNvbGxlY3Rpb24gPSBmdW5jdGlvbiAobmFtZSwgY29sbGVjdGlvbnMpIHtcbiAgaWYgKCEobmFtZSBpbiBjb2xsZWN0aW9ucykpXG4gICAgY29sbGVjdGlvbnNbbmFtZV0gPSBuZXcgTG9jYWxDb2xsZWN0aW9uKG5hbWUpO1xuICByZXR1cm4gY29sbGVjdGlvbnNbbmFtZV07XG59O1xuXG5fLmV4dGVuZChMb2NhbENvbGxlY3Rpb25Ecml2ZXIucHJvdG90eXBlLCB7XG4gIG9wZW46IGZ1bmN0aW9uIChuYW1lLCBjb25uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybiBuZXcgTG9jYWxDb2xsZWN0aW9uO1xuICAgIGlmICghIGNvbm4pIHtcbiAgICAgIHJldHVybiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIHNlbGYubm9Db25uQ29sbGVjdGlvbnMpO1xuICAgIH1cbiAgICBpZiAoISBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucylcbiAgICAgIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zID0ge307XG4gICAgLy8gWFhYIGlzIHRoZXJlIGEgd2F5IHRvIGtlZXAgdHJhY2sgb2YgYSBjb25uZWN0aW9uJ3MgY29sbGVjdGlvbnMgd2l0aG91dFxuICAgIC8vIGRhbmdsaW5nIGl0IG9mZiB0aGUgY29ubmVjdGlvbiBvYmplY3Q/XG4gICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMpO1xuICB9XG59KTtcblxuLy8gc2luZ2xldG9uXG5Mb2NhbENvbGxlY3Rpb25Ecml2ZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uRHJpdmVyO1xuIiwiTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlciA9IGZ1bmN0aW9uIChcbiAgbW9uZ29fdXJsLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5tb25nbyA9IG5ldyBNb25nb0Nvbm5lY3Rpb24obW9uZ29fdXJsLCBvcHRpb25zKTtcbn07XG5cbl8uZXh0ZW5kKE1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIucHJvdG90eXBlLCB7XG4gIG9wZW46IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB7fTtcbiAgICBfLmVhY2goXG4gICAgICBbJ2ZpbmQnLCAnZmluZE9uZScsICdpbnNlcnQnLCAndXBkYXRlJywgJ3Vwc2VydCcsXG4gICAgICAgJ3JlbW92ZScsICdfZW5zdXJlSW5kZXgnLCAnX2Ryb3BJbmRleCcsICdfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbicsXG4gICAgICAgJ2Ryb3BDb2xsZWN0aW9uJywgJ3Jhd0NvbGxlY3Rpb24nXSxcbiAgICAgIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIHJldFttXSA9IF8uYmluZChzZWxmLm1vbmdvW21dLCBzZWxmLm1vbmdvLCBuYW1lKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn0pO1xuXG5cbi8vIENyZWF0ZSB0aGUgc2luZ2xldG9uIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgb25seSBvbiBkZW1hbmQsIHNvIHdlXG4vLyBvbmx5IHJlcXVpcmUgTW9uZ28gY29uZmlndXJhdGlvbiBpZiBpdCdzIGFjdHVhbGx5IHVzZWQgKGVnLCBub3QgaWZcbi8vIHlvdSdyZSBvbmx5IHRyeWluZyB0byByZWNlaXZlIGRhdGEgZnJvbSBhIHJlbW90ZSBERFAgc2VydmVyLilcbk1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gXy5vbmNlKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0ge307XG5cbiAgdmFyIG1vbmdvVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fVVJMO1xuXG4gIGlmIChwcm9jZXNzLmVudi5NT05HT19PUExPR19VUkwpIHtcbiAgICBjb25uZWN0aW9uT3B0aW9ucy5vcGxvZ1VybCA9IHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTDtcbiAgfVxuXG4gIGlmICghIG1vbmdvVXJsKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk1PTkdPX1VSTCBtdXN0IGJlIHNldCBpbiBlbnZpcm9ubWVudFwiKTtcblxuICByZXR1cm4gbmV3IE1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIobW9uZ29VcmwsIGNvbm5lY3Rpb25PcHRpb25zKTtcbn0pO1xuIiwiLy8gb3B0aW9ucy5jb25uZWN0aW9uLCBpZiBnaXZlbiwgaXMgYSBMaXZlZGF0YUNsaWVudCBvciBMaXZlZGF0YVNlcnZlclxuLy8gWFhYIHByZXNlbnRseSB0aGVyZSBpcyBubyB3YXkgdG8gZGVzdHJveS9jbGVhbiB1cCBhIENvbGxlY3Rpb25cblxuLyoqXG4gKiBAc3VtbWFyeSBOYW1lc3BhY2UgZm9yIE1vbmdvREItcmVsYXRlZCBpdGVtc1xuICogQG5hbWVzcGFjZVxuICovXG5Nb25nbyA9IHt9O1xuXG4vKipcbiAqIEBzdW1tYXJ5IENvbnN0cnVjdG9yIGZvciBhIENvbGxlY3Rpb25cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGluc3RhbmNlbmFtZSBjb2xsZWN0aW9uXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uLiAgSWYgbnVsbCwgY3JlYXRlcyBhbiB1bm1hbmFnZWQgKHVuc3luY2hyb25pemVkKSBsb2NhbCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuY29ubmVjdGlvbiBUaGUgc2VydmVyIGNvbm5lY3Rpb24gdGhhdCB3aWxsIG1hbmFnZSB0aGlzIGNvbGxlY3Rpb24uIFVzZXMgdGhlIGRlZmF1bHQgY29ubmVjdGlvbiBpZiBub3Qgc3BlY2lmaWVkLiAgUGFzcyB0aGUgcmV0dXJuIHZhbHVlIG9mIGNhbGxpbmcgW2BERFAuY29ubmVjdGBdKCNkZHBfY29ubmVjdCkgdG8gc3BlY2lmeSBhIGRpZmZlcmVudCBzZXJ2ZXIuIFBhc3MgYG51bGxgIHRvIHNwZWNpZnkgbm8gY29ubmVjdGlvbi4gVW5tYW5hZ2VkIChgbmFtZWAgaXMgbnVsbCkgY29sbGVjdGlvbnMgY2Fubm90IHNwZWNpZnkgYSBjb25uZWN0aW9uLlxuICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMuaWRHZW5lcmF0aW9uIFRoZSBtZXRob2Qgb2YgZ2VuZXJhdGluZyB0aGUgYF9pZGAgZmllbGRzIG9mIG5ldyBkb2N1bWVudHMgaW4gdGhpcyBjb2xsZWN0aW9uLiAgUG9zc2libGUgdmFsdWVzOlxuXG4gLSAqKmAnU1RSSU5HJ2AqKjogcmFuZG9tIHN0cmluZ3NcbiAtICoqYCdNT05HTydgKio6ICByYW5kb20gW2BNb25nby5PYmplY3RJRGBdKCNtb25nb19vYmplY3RfaWQpIHZhbHVlc1xuXG5UaGUgZGVmYXVsdCBpZCBnZW5lcmF0aW9uIHRlY2huaXF1ZSBpcyBgJ1NUUklORydgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gQW4gb3B0aW9uYWwgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24uIERvY3VtZW50cyB3aWxsIGJlIHBhc3NlZCB0aHJvdWdoIHRoaXMgZnVuY3Rpb24gYmVmb3JlIGJlaW5nIHJldHVybmVkIGZyb20gYGZldGNoYCBvciBgZmluZE9uZWAsIGFuZCBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZWAsIGBtYXBgLCBgZm9yRWFjaGAsIGBhbGxvd2AsIGFuZCBgZGVueWAuIFRyYW5zZm9ybXMgYXJlICpub3QqIGFwcGxpZWQgZm9yIHRoZSBjYWxsYmFja3Mgb2YgYG9ic2VydmVDaGFuZ2VzYCBvciB0byBjdXJzb3JzIHJldHVybmVkIGZyb20gcHVibGlzaCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGVmaW5lTXV0YXRpb25NZXRob2RzIFNldCB0byBgZmFsc2VgIHRvIHNraXAgc2V0dGluZyB1cCB0aGUgbXV0YXRpb24gbWV0aG9kcyB0aGF0IGVuYWJsZSBpbnNlcnQvdXBkYXRlL3JlbW92ZSBmcm9tIGNsaWVudCBjb2RlLiBEZWZhdWx0IGB0cnVlYC5cbiAqL1xuTW9uZ28uQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCEgKHNlbGYgaW5zdGFuY2VvZiBNb25nby5Db2xsZWN0aW9uKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZSBcIm5ld1wiIHRvIGNvbnN0cnVjdCBhIE1vbmdvLkNvbGxlY3Rpb24nKTtcblxuICBpZiAoIW5hbWUgJiYgKG5hbWUgIT09IG51bGwpKSB7XG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIldhcm5pbmc6IGNyZWF0aW5nIGFub255bW91cyBjb2xsZWN0aW9uLiBJdCB3aWxsIG5vdCBiZSBcIiArXG4gICAgICAgICAgICAgICAgICBcInNhdmVkIG9yIHN5bmNocm9uaXplZCBvdmVyIHRoZSBuZXR3b3JrLiAoUGFzcyBudWxsIGZvciBcIiArXG4gICAgICAgICAgICAgICAgICBcInRoZSBjb2xsZWN0aW9uIG5hbWUgdG8gdHVybiBvZmYgdGhpcyB3YXJuaW5nLilcIik7XG4gICAgbmFtZSA9IG51bGw7XG4gIH1cblxuICBpZiAobmFtZSAhPT0gbnVsbCAmJiB0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiRmlyc3QgYXJndW1lbnQgdG8gbmV3IE1vbmdvLkNvbGxlY3Rpb24gbXVzdCBiZSBhIHN0cmluZyBvciBudWxsXCIpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5tZXRob2RzKSB7XG4gICAgLy8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaGFjayB3aXRoIG9yaWdpbmFsIHNpZ25hdHVyZSAod2hpY2ggcGFzc2VkXG4gICAgLy8gXCJjb25uZWN0aW9uXCIgZGlyZWN0bHkgaW5zdGVhZCBvZiBpbiBvcHRpb25zLiAoQ29ubmVjdGlvbnMgbXVzdCBoYXZlIGEgXCJtZXRob2RzXCJcbiAgICAvLyBtZXRob2QuKVxuICAgIC8vIFhYWCByZW1vdmUgYmVmb3JlIDEuMFxuICAgIG9wdGlvbnMgPSB7Y29ubmVjdGlvbjogb3B0aW9uc307XG4gIH1cbiAgLy8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHk6IFwiY29ubmVjdGlvblwiIHVzZWQgdG8gYmUgY2FsbGVkIFwibWFuYWdlclwiLlxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1hbmFnZXIgJiYgIW9wdGlvbnMuY29ubmVjdGlvbikge1xuICAgIG9wdGlvbnMuY29ubmVjdGlvbiA9IG9wdGlvbnMubWFuYWdlcjtcbiAgfVxuICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgIGNvbm5lY3Rpb246IHVuZGVmaW5lZCxcbiAgICBpZEdlbmVyYXRpb246ICdTVFJJTkcnLFxuICAgIHRyYW5zZm9ybTogbnVsbCxcbiAgICBfZHJpdmVyOiB1bmRlZmluZWQsXG4gICAgX3ByZXZlbnRBdXRvcHVibGlzaDogZmFsc2VcbiAgfSwgb3B0aW9ucyk7XG5cbiAgc3dpdGNoIChvcHRpb25zLmlkR2VuZXJhdGlvbikge1xuICBjYXNlICdNT05HTyc6XG4gICAgc2VsZi5fbWFrZU5ld0lEID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKHNyYy5oZXhTdHJpbmcoMjQpKTtcbiAgICB9O1xuICAgIGJyZWFrO1xuICBjYXNlICdTVFJJTkcnOlxuICBkZWZhdWx0OlxuICAgIHNlbGYuX21ha2VOZXdJRCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzcmMgPSBuYW1lID8gRERQLnJhbmRvbVN0cmVhbSgnL2NvbGxlY3Rpb24vJyArIG5hbWUpIDogUmFuZG9tLmluc2VjdXJlO1xuICAgICAgcmV0dXJuIHNyYy5pZCgpO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIH1cblxuICBzZWxmLl90cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShvcHRpb25zLnRyYW5zZm9ybSk7XG5cbiAgaWYgKCEgbmFtZSB8fCBvcHRpb25zLmNvbm5lY3Rpb24gPT09IG51bGwpXG4gICAgLy8gbm90ZTogbmFtZWxlc3MgY29sbGVjdGlvbnMgbmV2ZXIgaGF2ZSBhIGNvbm5lY3Rpb25cbiAgICBzZWxmLl9jb25uZWN0aW9uID0gbnVsbDtcbiAgZWxzZSBpZiAob3B0aW9ucy5jb25uZWN0aW9uKVxuICAgIHNlbGYuX2Nvbm5lY3Rpb24gPSBvcHRpb25zLmNvbm5lY3Rpb247XG4gIGVsc2UgaWYgKE1ldGVvci5pc0NsaWVudClcbiAgICBzZWxmLl9jb25uZWN0aW9uID0gTWV0ZW9yLmNvbm5lY3Rpb247XG4gIGVsc2VcbiAgICBzZWxmLl9jb25uZWN0aW9uID0gTWV0ZW9yLnNlcnZlcjtcblxuICBpZiAoIW9wdGlvbnMuX2RyaXZlcikge1xuICAgIC8vIFhYWCBUaGlzIGNoZWNrIGFzc3VtZXMgdGhhdCB3ZWJhcHAgaXMgbG9hZGVkIHNvIHRoYXQgTWV0ZW9yLnNlcnZlciAhPT1cbiAgICAvLyBudWxsLiBXZSBzaG91bGQgZnVsbHkgc3VwcG9ydCB0aGUgY2FzZSBvZiBcIndhbnQgdG8gdXNlIGEgTW9uZ28tYmFja2VkXG4gICAgLy8gY29sbGVjdGlvbiBmcm9tIE5vZGUgY29kZSB3aXRob3V0IHdlYmFwcFwiLCBidXQgd2UgZG9uJ3QgeWV0LlxuICAgIC8vICNNZXRlb3JTZXJ2ZXJOdWxsXG4gICAgaWYgKG5hbWUgJiYgc2VsZi5fY29ubmVjdGlvbiA9PT0gTWV0ZW9yLnNlcnZlciAmJlxuICAgICAgICB0eXBlb2YgTW9uZ29JbnRlcm5hbHMgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIpIHtcbiAgICAgIG9wdGlvbnMuX2RyaXZlciA9IE1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMuX2RyaXZlciA9IExvY2FsQ29sbGVjdGlvbkRyaXZlcjtcbiAgICB9XG4gIH1cblxuICBzZWxmLl9jb2xsZWN0aW9uID0gb3B0aW9ucy5fZHJpdmVyLm9wZW4obmFtZSwgc2VsZi5fY29ubmVjdGlvbik7XG4gIHNlbGYuX25hbWUgPSBuYW1lO1xuICBzZWxmLl9kcml2ZXIgPSBvcHRpb25zLl9kcml2ZXI7XG5cbiAgaWYgKHNlbGYuX2Nvbm5lY3Rpb24gJiYgc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlKSB7XG4gICAgLy8gT0ssIHdlJ3JlIGdvaW5nIHRvIGJlIGEgc2xhdmUsIHJlcGxpY2F0aW5nIHNvbWUgcmVtb3RlXG4gICAgLy8gZGF0YWJhc2UsIGV4Y2VwdCBwb3NzaWJseSB3aXRoIHNvbWUgdGVtcG9yYXJ5IGRpdmVyZ2VuY2Ugd2hpbGVcbiAgICAvLyB3ZSBoYXZlIHVuYWNrbm93bGVkZ2VkIFJQQydzLlxuICAgIHZhciBvayA9IHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZShuYW1lLCB7XG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMuIGJhdGNoU2l6ZSBpcyB0aGUgbnVtYmVyXG4gICAgICAvLyBvZiB1cGRhdGUgY2FsbHMgdG8gZXhwZWN0LlxuICAgICAgLy9cbiAgICAgIC8vIFhYWCBUaGlzIGludGVyZmFjZSBpcyBwcmV0dHkgamFua3kuIHJlc2V0IHByb2JhYmx5IG91Z2h0IHRvIGdvIGJhY2sgdG9cbiAgICAgIC8vIGJlaW5nIGl0cyBvd24gZnVuY3Rpb24sIGFuZCBjYWxsZXJzIHNob3VsZG4ndCBoYXZlIHRvIGNhbGN1bGF0ZVxuICAgICAgLy8gYmF0Y2hTaXplLiBUaGUgb3B0aW1pemF0aW9uIG9mIG5vdCBjYWxsaW5nIHBhdXNlL3JlbW92ZSBzaG91bGQgYmVcbiAgICAgIC8vIGRlbGF5ZWQgdW50aWwgbGF0ZXI6IHRoZSBmaXJzdCBjYWxsIHRvIHVwZGF0ZSgpIHNob3VsZCBidWZmZXIgaXRzXG4gICAgICAvLyBtZXNzYWdlLCBhbmQgdGhlbiB3ZSBjYW4gZWl0aGVyIGRpcmVjdGx5IGFwcGx5IGl0IGF0IGVuZFVwZGF0ZSB0aW1lIGlmXG4gICAgICAvLyBpdCB3YXMgdGhlIG9ubHkgdXBkYXRlLCBvciBkbyBwYXVzZU9ic2VydmVycy9hcHBseS9hcHBseSBhdCB0aGUgbmV4dFxuICAgICAgLy8gdXBkYXRlKCkgaWYgdGhlcmUncyBhbm90aGVyIG9uZS5cbiAgICAgIGJlZ2luVXBkYXRlOiBmdW5jdGlvbiAoYmF0Y2hTaXplLCByZXNldCkge1xuICAgICAgICAvLyBwYXVzZSBvYnNlcnZlcnMgc28gdXNlcnMgZG9uJ3Qgc2VlIGZsaWNrZXIgd2hlbiB1cGRhdGluZyBzZXZlcmFsXG4gICAgICAgIC8vIG9iamVjdHMgYXQgb25jZSAoaW5jbHVkaW5nIHRoZSBwb3N0LXJlY29ubmVjdCByZXNldC1hbmQtcmVhcHBseVxuICAgICAgICAvLyBzdGFnZSksIGFuZCBzbyB0aGF0IGEgcmUtc29ydGluZyBvZiBhIHF1ZXJ5IGNhbiB0YWtlIGFkdmFudGFnZSBvZiB0aGVcbiAgICAgICAgLy8gZnVsbCBfZGlmZlF1ZXJ5IG1vdmVkIGNhbGN1bGF0aW9uIGluc3RlYWQgb2YgYXBwbHlpbmcgY2hhbmdlIG9uZSBhdCBhXG4gICAgICAgIC8vIHRpbWUuXG4gICAgICAgIGlmIChiYXRjaFNpemUgPiAxIHx8IHJlc2V0KVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucGF1c2VPYnNlcnZlcnMoKTtcblxuICAgICAgICBpZiAocmVzZXQpXG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUoe30pO1xuICAgICAgfSxcblxuICAgICAgLy8gQXBwbHkgYW4gdXBkYXRlLlxuICAgICAgLy8gWFhYIGJldHRlciBzcGVjaWZ5IHRoaXMgaW50ZXJmYWNlIChub3QgaW4gdGVybXMgb2YgYSB3aXJlIG1lc3NhZ2UpP1xuICAgICAgdXBkYXRlOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgICAgIHZhciBtb25nb0lkID0gTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCk7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLmZpbmRPbmUobW9uZ29JZCk7XG5cbiAgICAgICAgLy8gSXMgdGhpcyBhIFwicmVwbGFjZSB0aGUgd2hvbGUgZG9jXCIgbWVzc2FnZSBjb21pbmcgZnJvbSB0aGUgcXVpZXNjZW5jZVxuICAgICAgICAvLyBvZiBtZXRob2Qgd3JpdGVzIHRvIGFuIG9iamVjdD8gKE5vdGUgdGhhdCAndW5kZWZpbmVkJyBpcyBhIHZhbGlkXG4gICAgICAgIC8vIHZhbHVlIG1lYW5pbmcgXCJyZW1vdmUgaXRcIi4pXG4gICAgICAgIGlmIChtc2cubXNnID09PSAncmVwbGFjZScpIHtcbiAgICAgICAgICB2YXIgcmVwbGFjZSA9IG1zZy5yZXBsYWNlO1xuICAgICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgaWYgKGRvYylcbiAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgICAgfSBlbHNlIGlmICghZG9jKSB7XG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLmluc2VydChyZXBsYWNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHRoYXQgcmVwbGFjZSBoYXMgbm8gJCBvcHNcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIHJlcGxhY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2FkZGVkJykge1xuICAgICAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIG5vdCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciBhbiBhZGRcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KF8uZXh0ZW5kKHtfaWQ6IG1vbmdvSWR9LCBtc2cuZmllbGRzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciByZW1vdmVkXCIpO1xuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKG1vbmdvSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdjaGFuZ2VkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IHRvIGNoYW5nZVwiKTtcbiAgICAgICAgICBpZiAoIV8uaXNFbXB0eShtc2cuZmllbGRzKSkge1xuICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0ge307XG4gICAgICAgICAgICBfLmVhY2gobXNnLmZpZWxkcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiR1bnNldClcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldCA9IHt9O1xuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldFtrZXldID0gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiRzZXQpXG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0ID0ge307XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi51cGRhdGUobW9uZ29JZCwgbW9kaWZpZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJIGRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCB0aGlzIG1lc3NhZ2VcIik7XG4gICAgICAgIH1cblxuICAgICAgfSxcblxuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLlxuICAgICAgZW5kVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVzdW1lT2JzZXJ2ZXJzKCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXJvdW5kIG1ldGhvZCBzdHViIGludm9jYXRpb25zIHRvIGNhcHR1cmUgdGhlIG9yaWdpbmFsIHZlcnNpb25zXG4gICAgICAvLyBvZiBtb2RpZmllZCBkb2N1bWVudHMuXG4gICAgICBzYXZlT3JpZ2luYWxzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uc2F2ZU9yaWdpbmFscygpO1xuICAgICAgfSxcbiAgICAgIHJldHJpZXZlT3JpZ2luYWxzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnJldHJpZXZlT3JpZ2luYWxzKCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBVc2VkIHRvIHByZXNlcnZlIGN1cnJlbnQgdmVyc2lvbnMgb2YgZG9jdW1lbnRzIGFjcm9zcyBhIHN0b3JlIHJlc2V0LlxuICAgICAgZ2V0RG9jOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5maW5kT25lKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFRvIGJlIGFibGUgdG8gZ2V0IGJhY2sgdG8gdGhlIGNvbGxlY3Rpb24gZnJvbSB0aGUgc3RvcmUuXG4gICAgICBfZ2V0Q29sbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghb2spIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgO1xuICAgICAgaWYgKG9wdGlvbnMuX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBYWFggSW4gdGhlb3J5IHdlIGRvIG5vdCBoYXZlIHRvIHRocm93IHdoZW4gYG9rYCBpcyBmYWxzeS4gVGhlIHN0b3JlIGlzIGFscmVhZHkgZGVmaW5lZFxuICAgICAgICAvLyBmb3IgdGhpcyBjb2xsZWN0aW9uIG5hbWUsIGJ1dCB0aGlzIHdpbGwgc2ltcGx5IGJlIGFub3RoZXIgcmVmZXJlbmNlIHRvIGl0IGFuZCBldmVyeXRoaW5nXG4gICAgICAgIC8vIHNob3VsZCB3b3JrLiBIb3dldmVyLCB3ZSBoYXZlIGhpc3RvcmljYWxseSB0aHJvd24gYW4gZXJyb3IgaGVyZSwgc28gZm9yIG5vdyB3ZSB3aWxsXG4gICAgICAgIC8vIHNraXAgdGhlIGVycm9yIG9ubHkgd2hlbiBgX3N1cHByZXNzU2FtZU5hbWVFcnJvcmAgaXMgYHRydWVgLCBhbGxvd2luZyBwZW9wbGUgdG8gb3B0IGluXG4gICAgICAgIC8vIGFuZCBnaXZlIHRoaXMgc29tZSByZWFsIHdvcmxkIHRlc3RpbmcuXG4gICAgICAgIGNvbnNvbGUud2FybiA/IGNvbnNvbGUud2FybihtZXNzYWdlKSA6IGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFhYWCBkb24ndCBkZWZpbmUgdGhlc2UgdW50aWwgYWxsb3cgb3IgZGVueSBpcyBhY3R1YWxseSB1c2VkIGZvciB0aGlzXG4gIC8vIGNvbGxlY3Rpb24uIENvdWxkIGJlIGhhcmQgaWYgdGhlIHNlY3VyaXR5IHJ1bGVzIGFyZSBvbmx5IGRlZmluZWQgb24gdGhlXG4gIC8vIHNlcnZlci5cbiAgaWYgKG9wdGlvbnMuZGVmaW5lTXV0YXRpb25NZXRob2RzICE9PSBmYWxzZSkge1xuICAgIHRyeSB7XG4gICAgICBzZWxmLl9kZWZpbmVNdXRhdGlvbk1ldGhvZHMoeyB1c2VFeGlzdGluZzogKG9wdGlvbnMuX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9PT0gdHJ1ZSkgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIFRocm93IGEgbW9yZSB1bmRlcnN0YW5kYWJsZSBlcnJvciBvbiB0aGUgc2VydmVyIGZvciBzYW1lIGNvbGxlY3Rpb24gbmFtZVxuICAgICAgaWYgKGVycm9yLm1lc3NhZ2UgPT09IGBBIG1ldGhvZCBuYW1lZCAnLyR7bmFtZX0vaW5zZXJ0JyBpcyBhbHJlYWR5IGRlZmluZWRgKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZXJlIGlzIGFscmVhZHkgYSBjb2xsZWN0aW9uIG5hbWVkIFwiJHtuYW1lfVwiYCk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvLyBhdXRvcHVibGlzaFxuICBpZiAoUGFja2FnZS5hdXRvcHVibGlzaCAmJiAhb3B0aW9ucy5fcHJldmVudEF1dG9wdWJsaXNoICYmIHNlbGYuX2Nvbm5lY3Rpb24gJiYgc2VsZi5fY29ubmVjdGlvbi5wdWJsaXNoKSB7XG4gICAgc2VsZi5fY29ubmVjdGlvbi5wdWJsaXNoKG51bGwsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBzZWxmLmZpbmQoKTtcbiAgICB9LCB7aXNfYXV0bzogdHJ1ZX0pO1xuICB9XG59O1xuXG4vLy9cbi8vLyBNYWluIGNvbGxlY3Rpb24gQVBJXG4vLy9cblxuXG5fLmV4dGVuZChNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwge1xuXG4gIF9nZXRGaW5kU2VsZWN0b3I6IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09IDApXG4gICAgICByZXR1cm4ge307XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gIH0sXG5cbiAgX2dldEZpbmRPcHRpb25zOiBmdW5jdGlvbiAoYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoYXJncy5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4geyB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGVjayhhcmdzWzFdLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBmaWVsZHM6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNvcnQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgQXJyYXksIEZ1bmN0aW9uLCB1bmRlZmluZWQpKSxcbiAgICAgICAgbGltaXQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNraXA6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSlcbiAgICAgfSkpKTtcblxuICAgICAgcmV0dXJuIF8uZXh0ZW5kKHtcbiAgICAgICAgdHJhbnNmb3JtOiBzZWxmLl90cmFuc2Zvcm1cbiAgICAgIH0sIGFyZ3NbMV0pO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZCB0aGUgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiB0aGF0IG1hdGNoIHRoZSBzZWxlY3Rvci5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZFxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLmxpbWl0IE1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgdG8gcmV0dXJuXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgYHRydWVgOyBwYXNzIGBmYWxzZWAgdG8gZGlzYWJsZSByZWFjdGl2aXR5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIE92ZXJyaWRlcyBgdHJhbnNmb3JtYCBvbiB0aGUgIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmRpc2FibGVPcGxvZyAoU2VydmVyIG9ubHkpIFBhc3MgdHJ1ZSB0byBkaXNhYmxlIG9wbG9nLXRhaWxpbmcgb24gdGhpcyBxdWVyeS4gVGhpcyBhZmZlY3RzIHRoZSB3YXkgc2VydmVyIHByb2Nlc3NlcyBjYWxscyB0byBgb2JzZXJ2ZWAgb24gdGhpcyBxdWVyeS4gRGlzYWJsaW5nIHRoZSBvcGxvZyBjYW4gYmUgdXNlZnVsIHdoZW4gd29ya2luZyB3aXRoIGRhdGEgdGhhdCB1cGRhdGVzIGluIGxhcmdlIGJhdGNoZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgZnJlcXVlbmN5IChpbiBtaWxsaXNlY29uZHMpIG9mIGhvdyBvZnRlbiB0byBwb2xsIHRoaXMgcXVlcnkgd2hlbiBvYnNlcnZpbmcgb24gdGhlIHNlcnZlci4gRGVmYXVsdHMgdG8gMTAwMDBtcyAoMTAgc2Vjb25kcykuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgbWluaW11bSB0aW1lIChpbiBtaWxsaXNlY29uZHMpIHRvIGFsbG93IGJldHdlZW4gcmUtcG9sbGluZyB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBJbmNyZWFzaW5nIHRoaXMgd2lsbCBzYXZlIENQVSBhbmQgbW9uZ28gbG9hZCBhdCB0aGUgZXhwZW5zZSBvZiBzbG93ZXIgdXBkYXRlcyB0byB1c2Vycy4gRGVjcmVhc2luZyB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZC4gRGVmYXVsdHMgdG8gNTBtcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubWF4VGltZU1zIChTZXJ2ZXIgb25seSkgSWYgc2V0LCBpbnN0cnVjdHMgTW9uZ29EQiB0byBzZXQgYSB0aW1lIGxpbWl0IGZvciB0aGlzIGN1cnNvcidzIG9wZXJhdGlvbnMuIElmIHRoZSBvcGVyYXRpb24gcmVhY2hlcyB0aGUgc3BlY2lmaWVkIHRpbWUgbGltaXQgKGluIG1pbGxpc2Vjb25kcykgd2l0aG91dCB0aGUgaGF2aW5nIGJlZW4gY29tcGxldGVkLCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uIFVzZWZ1bCB0byBwcmV2ZW50IGFuIChhY2NpZGVudGFsIG9yIG1hbGljaW91cykgdW5vcHRpbWl6ZWQgcXVlcnkgZnJvbSBjYXVzaW5nIGEgZnVsbCBjb2xsZWN0aW9uIHNjYW4gdGhhdCB3b3VsZCBkaXNydXB0IG90aGVyIGRhdGFiYXNlIHVzZXJzLCBhdCB0aGUgZXhwZW5zZSBvZiBuZWVkaW5nIHRvIGhhbmRsZSB0aGUgcmVzdWx0aW5nIGVycm9yLlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnMuaGludCAoU2VydmVyIG9ubHkpIE92ZXJyaWRlcyBNb25nb0RCJ3MgZGVmYXVsdCBpbmRleCBzZWxlY3Rpb24gYW5kIHF1ZXJ5IG9wdGltaXphdGlvbiBwcm9jZXNzLiBTcGVjaWZ5IGFuIGluZGV4IHRvIGZvcmNlIGl0cyB1c2UsIGVpdGhlciBieSBpdHMgbmFtZSBvciBpbmRleCBzcGVjaWZpY2F0aW9uLiBZb3UgY2FuIGFsc28gc3BlY2lmeSBgeyAkbmF0dXJhbCA6IDEgfWAgdG8gZm9yY2UgYSBmb3J3YXJkcyBjb2xsZWN0aW9uIHNjYW4sIG9yIGB7ICRuYXR1cmFsIDogLTEgfWAgZm9yIGEgcmV2ZXJzZSBjb2xsZWN0aW9uIHNjYW4uIFNldHRpbmcgdGhpcyBpcyBvbmx5IHJlY29tbWVuZGVkIGZvciBhZHZhbmNlZCB1c2Vycy5cbiAgICogQHJldHVybnMge01vbmdvLkN1cnNvcn1cbiAgICovXG4gIGZpbmQ6IGZ1bmN0aW9uICgvKiBzZWxlY3Rvciwgb3B0aW9ucyAqLykge1xuICAgIC8vIENvbGxlY3Rpb24uZmluZCgpIChyZXR1cm4gYWxsIGRvY3MpIGJlaGF2ZXMgZGlmZmVyZW50bHlcbiAgICAvLyBmcm9tIENvbGxlY3Rpb24uZmluZCh1bmRlZmluZWQpIChyZXR1cm4gMCBkb2NzKS4gIHNvIGJlXG4gICAgLy8gY2FyZWZ1bCBhYm91dCB0aGUgbGVuZ3RoIG9mIGFyZ3VtZW50cy5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGFyZ0FycmF5ID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24uZmluZChzZWxmLl9nZXRGaW5kU2VsZWN0b3IoYXJnQXJyYXkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fZ2V0RmluZE9wdGlvbnMoYXJnQXJyYXkpKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZHMgdGhlIGZpcnN0IGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIGFzIG9yZGVyZWQgYnkgc29ydCBhbmQgc2tpcCBvcHRpb25zLiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50IGlzIGZvdW5kLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kT25lXG4gICAqIEBtZW1iZXJPZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uICgvKiBzZWxlY3Rvciwgb3B0aW9ucyAqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXJnQXJyYXkgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5maW5kT25lKHNlbGYuX2dldEZpbmRTZWxlY3RvcihhcmdBcnJheSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9nZXRGaW5kT3B0aW9ucyhhcmdBcnJheSkpO1xuICB9XG5cbn0pO1xuXG5Nb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgc3ViLCBjb2xsZWN0aW9uKSB7XG4gIHZhciBvYnNlcnZlSGFuZGxlID0gY3Vyc29yLm9ic2VydmVDaGFuZ2VzKHtcbiAgICBhZGRlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgIHN1Yi5hZGRlZChjb2xsZWN0aW9uLCBpZCwgZmllbGRzKTtcbiAgICB9LFxuICAgIGNoYW5nZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG4gICAgICBzdWIuY2hhbmdlZChjb2xsZWN0aW9uLCBpZCwgZmllbGRzKTtcbiAgICB9LFxuICAgIHJlbW92ZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgc3ViLnJlbW92ZWQoY29sbGVjdGlvbiwgaWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gV2UgZG9uJ3QgY2FsbCBzdWIucmVhZHkoKSBoZXJlOiBpdCBnZXRzIGNhbGxlZCBpbiBsaXZlZGF0YV9zZXJ2ZXIsIGFmdGVyXG4gIC8vIHBvc3NpYmx5IGNhbGxpbmcgX3B1Ymxpc2hDdXJzb3Igb24gbXVsdGlwbGUgcmV0dXJuZWQgY3Vyc29ycy5cblxuICAvLyByZWdpc3RlciBzdG9wIGNhbGxiYWNrIChleHBlY3RzIGxhbWJkYSB3LyBubyBhcmdzKS5cbiAgc3ViLm9uU3RvcChmdW5jdGlvbiAoKSB7b2JzZXJ2ZUhhbmRsZS5zdG9wKCk7fSk7XG5cbiAgLy8gcmV0dXJuIHRoZSBvYnNlcnZlSGFuZGxlIGluIGNhc2UgaXQgbmVlZHMgdG8gYmUgc3RvcHBlZCBlYXJseVxuICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbn07XG5cbi8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4vLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yIGRlc3RydWN0aXZlXG4vLyBvcGVyYXRpb25zLiBJZiBhIGZhbHNleSBfaWQgaXMgc2VudCBpbiwgYSBuZXcgc3RyaW5nIF9pZCB3aWxsIGJlXG4vLyBnZW5lcmF0ZWQgYW5kIHJldHVybmVkOyBpZiBhIGZhbGxiYWNrSWQgaXMgcHJvdmlkZWQsIGl0IHdpbGwgYmUgcmV0dXJuZWRcbi8vIGluc3RlYWQuXG5Nb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3IgPSAoc2VsZWN0b3IsIHsgZmFsbGJhY2tJZCB9ID0ge30pID0+IHtcbiAgLy8gc2hvcnRoYW5kIC0tIHNjYWxhcnMgbWF0Y2ggX2lkXG4gIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpXG4gICAgc2VsZWN0b3IgPSB7X2lkOiBzZWxlY3Rvcn07XG5cbiAgaWYgKF8uaXNBcnJheShzZWxlY3RvcikpIHtcbiAgICAvLyBUaGlzIGlzIGNvbnNpc3RlbnQgd2l0aCB0aGUgTW9uZ28gY29uc29sZSBpdHNlbGY7IGlmIHdlIGRvbid0IGRvIHRoaXNcbiAgICAvLyBjaGVjayBwYXNzaW5nIGFuIGVtcHR5IGFycmF5IGVuZHMgdXAgc2VsZWN0aW5nIGFsbCBpdGVtc1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1vbmdvIHNlbGVjdG9yIGNhbid0IGJlIGFuIGFycmF5LlwiKTtcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IgfHwgKCgnX2lkJyBpbiBzZWxlY3RvcikgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICAvLyBjYW4ndCBtYXRjaCBhbnl0aGluZ1xuICAgIHJldHVybiB7IF9pZDogZmFsbGJhY2tJZCB8fCBSYW5kb20uaWQoKSB9O1xuICB9XG5cbiAgcmV0dXJuIHNlbGVjdG9yO1xufTtcblxuLy8gJ2luc2VydCcgaW1tZWRpYXRlbHkgcmV0dXJucyB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnQncyBuZXcgX2lkLlxuLy8gVGhlIG90aGVycyByZXR1cm4gdmFsdWVzIGltbWVkaWF0ZWx5IGlmIHlvdSBhcmUgaW4gYSBzdHViLCBhbiBpbi1tZW1vcnlcbi8vIHVubWFuYWdlZCBjb2xsZWN0aW9uLCBvciBhIG1vbmdvLWJhY2tlZCBjb2xsZWN0aW9uIGFuZCB5b3UgZG9uJ3QgcGFzcyBhXG4vLyBjYWxsYmFjay4gJ3VwZGF0ZScgYW5kICdyZW1vdmUnIHJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkXG4vLyBkb2N1bWVudHMuICd1cHNlcnQnIHJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyAnbnVtYmVyQWZmZWN0ZWQnIGFuZCwgaWYgYW5cbi8vIGluc2VydCBoYXBwZW5lZCwgJ2luc2VydGVkSWQnLlxuLy9cbi8vIE90aGVyd2lzZSwgdGhlIHNlbWFudGljcyBhcmUgZXhhY3RseSBsaWtlIG90aGVyIG1ldGhvZHM6IHRoZXkgdGFrZVxuLy8gYSBjYWxsYmFjayBhcyBhbiBvcHRpb25hbCBsYXN0IGFyZ3VtZW50OyBpZiBubyBjYWxsYmFjayBpc1xuLy8gcHJvdmlkZWQsIHRoZXkgYmxvY2sgdW50aWwgdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZSwgYW5kIHRocm93IGFuXG4vLyBleGNlcHRpb24gaWYgaXQgZmFpbHM7IGlmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBkb24ndFxuLy8gbmVjZXNzYXJpbHkgYmxvY2ssIGFuZCB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrIHdoZW4gdGhleSBmaW5pc2ggd2l0aCBlcnJvciBhbmRcbi8vIHJlc3VsdCBhcmd1bWVudHMuICAoVGhlIGluc2VydCBtZXRob2QgcHJvdmlkZXMgdGhlIGRvY3VtZW50IElEIGFzIGl0cyByZXN1bHQ7XG4vLyB1cGRhdGUgYW5kIHJlbW92ZSBwcm92aWRlIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhcyB0aGUgcmVzdWx0OyB1cHNlcnRcbi8vIHByb3ZpZGVzIGFuIG9iamVjdCB3aXRoIG51bWJlckFmZmVjdGVkIGFuZCBtYXliZSBpbnNlcnRlZElkLilcbi8vXG4vLyBPbiB0aGUgY2xpZW50LCBibG9ja2luZyBpcyBpbXBvc3NpYmxlLCBzbyBpZiBhIGNhbGxiYWNrXG4vLyBpc24ndCBwcm92aWRlZCwgdGhleSBqdXN0IHJldHVybiBpbW1lZGlhdGVseSBhbmQgYW55IGVycm9yXG4vLyBpbmZvcm1hdGlvbiBpcyBsb3N0LlxuLy9cbi8vIFRoZXJlJ3Mgb25lIG1vcmUgdHdlYWsuIE9uIHRoZSBjbGllbnQsIGlmIHlvdSBkb24ndCBwcm92aWRlIGFcbi8vIGNhbGxiYWNrLCB0aGVuIGlmIHRoZXJlIGlzIGFuIGVycm9yLCBhIG1lc3NhZ2Ugd2lsbCBiZSBsb2dnZWQgd2l0aFxuLy8gTWV0ZW9yLl9kZWJ1Zy5cbi8vXG4vLyBUaGUgaW50ZW50ICh0aG91Z2ggdGhpcyBpcyBhY3R1YWxseSBkZXRlcm1pbmVkIGJ5IHRoZSB1bmRlcmx5aW5nXG4vLyBkcml2ZXJzKSBpcyB0aGF0IHRoZSBvcGVyYXRpb25zIHNob3VsZCBiZSBkb25lIHN5bmNocm9ub3VzbHksIG5vdFxuLy8gZ2VuZXJhdGluZyB0aGVpciByZXN1bHQgdW50aWwgdGhlIGRhdGFiYXNlIGhhcyBhY2tub3dsZWRnZWRcbi8vIHRoZW0uIEluIHRoZSBmdXR1cmUgbWF5YmUgd2Ugc2hvdWxkIHByb3ZpZGUgYSBmbGFnIHRvIHR1cm4gdGhpc1xuLy8gb2ZmLlxuXG4vKipcbiAqIEBzdW1tYXJ5IEluc2VydCBhIGRvY3VtZW50IGluIHRoZSBjb2xsZWN0aW9uLiAgUmV0dXJucyBpdHMgdW5pcXVlIF9pZC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQG1ldGhvZCAgaW5zZXJ0XG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuIE1heSBub3QgeWV0IGhhdmUgYW4gX2lkIGF0dHJpYnV0ZSwgaW4gd2hpY2ggY2FzZSBNZXRlb3Igd2lsbCBnZW5lcmF0ZSBvbmUgZm9yIHlvdS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBfaWQgYXMgdGhlIHNlY29uZC5cbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gaW5zZXJ0KGRvYywgY2FsbGJhY2spIHtcbiAgLy8gTWFrZSBzdXJlIHdlIHdlcmUgcGFzc2VkIGEgZG9jdW1lbnQgdG8gaW5zZXJ0XG4gIGlmICghZG9jKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IHJlcXVpcmVzIGFuIGFyZ3VtZW50XCIpO1xuICB9XG5cbiAgLy8gU2hhbGxvdy1jb3B5IHRoZSBkb2N1bWVudCBhbmQgcG9zc2libHkgZ2VuZXJhdGUgYW4gSURcbiAgZG9jID0gXy5leHRlbmQoe30sIGRvYyk7XG5cbiAgaWYgKCdfaWQnIGluIGRvYykge1xuICAgIGlmICghZG9jLl9pZCB8fCAhKHR5cGVvZiBkb2MuX2lkID09PSAnc3RyaW5nJyB8fCBkb2MuX2lkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRlb3IgcmVxdWlyZXMgZG9jdW1lbnQgX2lkIGZpZWxkcyB0byBiZSBub24tZW1wdHkgc3RyaW5ncyBvciBPYmplY3RJRHNcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxldCBnZW5lcmF0ZUlkID0gdHJ1ZTtcblxuICAgIC8vIERvbid0IGdlbmVyYXRlIHRoZSBpZCBpZiB3ZSdyZSB0aGUgY2xpZW50IGFuZCB0aGUgJ291dGVybW9zdCcgY2FsbFxuICAgIC8vIFRoaXMgb3B0aW1pemF0aW9uIHNhdmVzIHVzIHBhc3NpbmcgYm90aCB0aGUgcmFuZG9tU2VlZCBhbmQgdGhlIGlkXG4gICAgLy8gUGFzc2luZyBib3RoIGlzIHJlZHVuZGFudC5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IGVuY2xvc2luZyA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gICAgICBpZiAoIWVuY2xvc2luZykge1xuICAgICAgICBnZW5lcmF0ZUlkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdlbmVyYXRlSWQpIHtcbiAgICAgIGRvYy5faWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICB9XG4gIH1cblxuICAvLyBPbiBpbnNlcnRzLCBhbHdheXMgcmV0dXJuIHRoZSBpZCB0aGF0IHdlIGdlbmVyYXRlZDsgb24gYWxsIG90aGVyXG4gIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgdmFyIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKGRvYy5faWQpIHtcbiAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgIH1cblxuICAgIC8vIFhYWCB3aGF0IGlzIHRoaXMgZm9yPz9cbiAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgLy8gdGhlIHJldHVybiB2YWx1ZSBjb252ZXJzaW9uXG4gICAgZG9jLl9pZCA9IHJlc3VsdDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcblxuICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcImluc2VydFwiLCBbZG9jXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICB9XG5cbiAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gIHRyeSB7XG4gICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9jb2xsZWN0aW9uLmluc2VydChkb2MsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbWF0Y2hlZCBkb2N1bWVudHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBtZXRob2QgdXBkYXRlXG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoc2VsZWN0b3IsIG1vZGlmaWVyLCAuLi5vcHRpb25zQW5kQ2FsbGJhY2spIHtcbiAgY29uc3QgY2FsbGJhY2sgPSBwb3BDYWxsYmFja0Zyb21BcmdzKG9wdGlvbnNBbmRDYWxsYmFjayk7XG5cbiAgLy8gV2UndmUgYWxyZWFkeSBwb3BwZWQgb2ZmIHRoZSBjYWxsYmFjaywgc28gd2UgYXJlIGxlZnQgd2l0aCBhbiBhcnJheVxuICAvLyBvZiBvbmUgb3IgemVybyBpdGVtc1xuICBjb25zdCBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zQW5kQ2FsbGJhY2tbMF0pIHx8IHt9O1xuICBsZXQgaW5zZXJ0ZWRJZDtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAvLyBzZXQgYGluc2VydGVkSWRgIGlmIGFic2VudC4gIGBpbnNlcnRlZElkYCBpcyBhIE1ldGVvciBleHRlbnNpb24uXG4gICAgaWYgKG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgaWYgKCEodHlwZW9mIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9PT0gJ3N0cmluZycgfHwgb3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnRlZElkIG11c3QgYmUgc3RyaW5nIG9yIE9iamVjdElEXCIpO1xuICAgICAgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICB9IGVsc2UgaWYgKCFzZWxlY3RvciB8fCAhc2VsZWN0b3IuX2lkKSB7XG4gICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICBvcHRpb25zLmdlbmVyYXRlZElkID0gdHJ1ZTtcbiAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9IGluc2VydGVkSWQ7XG4gICAgfVxuICB9XG5cbiAgc2VsZWN0b3IgPVxuICAgIE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkOiBpbnNlcnRlZElkIH0pO1xuXG4gIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhjYWxsYmFjayk7XG5cbiAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kaWZpZXIsXG4gICAgICBvcHRpb25zXG4gICAgXTtcblxuICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcInVwZGF0ZVwiLCBhcmdzLCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9XG5cbiAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gIHRyeSB7XG4gICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICBzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnMsIHdyYXBwZWRDYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbi8qKlxuICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIGl0cyBhcmd1bWVudC5cbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJyZW1vdmVcIiwgW3NlbGVjdG9yXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICB0cnkge1xuICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG4vLyBEZXRlcm1pbmUgaWYgdGhpcyBjb2xsZWN0aW9uIGlzIHNpbXBseSBhIG1pbmltb25nbyByZXByZXNlbnRhdGlvbiBvZiBhIHJlYWxcbi8vIGRhdGFiYXNlIG9uIGFub3RoZXIgc2VydmVyXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5faXNSZW1vdGVDb2xsZWN0aW9uID0gZnVuY3Rpb24gX2lzUmVtb3RlQ29sbGVjdGlvbigpIHtcbiAgLy8gWFhYIHNlZSAjTWV0ZW9yU2VydmVyTnVsbFxuICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbiAmJiB0aGlzLl9jb25uZWN0aW9uICE9PSBNZXRlb3Iuc2VydmVyO1xufTtcblxuLy8gQ29udmVydCB0aGUgY2FsbGJhY2sgdG8gbm90IHJldHVybiBhIHJlc3VsdCBpZiB0aGVyZSBpcyBhbiBlcnJvclxuZnVuY3Rpb24gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjb252ZXJ0UmVzdWx0KSB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiBubyBjb252ZXJ0IGZ1bmN0aW9uIHdhcyBwYXNzZWQgaW4sIGp1c3QgdXNlIGEgXCJibGFuayBmdW5jdGlvblwiXG4gIGNvbnZlcnRSZXN1bHQgPSBjb252ZXJ0UmVzdWx0IHx8IF8uaWRlbnRpdHk7XG5cbiAgcmV0dXJuIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgY2FsbGJhY2soZXJyb3IsICEgZXJyb3IgJiYgY29udmVydFJlc3VsdChyZXN1bHQpKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLCBvciBpbnNlcnQgb25lIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyB3ZXJlIGZvdW5kLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGtleXMgYG51bWJlckFmZmVjdGVkYCAodGhlIG51bWJlciBvZiBkb2N1bWVudHMgbW9kaWZpZWQpICBhbmQgYGluc2VydGVkSWRgICh0aGUgdW5pcXVlIF9pZCBvZiB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgaW5zZXJ0ZWQsIGlmIGFueSkuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiB1cHNlcnQoXG4gICAgc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZU9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucywge1xuICAgIF9yZXR1cm5PYmplY3Q6IHRydWUsXG4gICAgdXBzZXJ0OiB0cnVlXG4gIH0pO1xuXG4gIHJldHVybiB0aGlzLnVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIHVwZGF0ZU9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLl9lbnN1cmVJbmRleCA9IGZ1bmN0aW9uIChpbmRleCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZW5zdXJlSW5kZXgpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfZW5zdXJlSW5kZXggb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICBzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucyk7XG59O1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUuX2Ryb3BJbmRleCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZHJvcEluZGV4KVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BJbmRleCBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIHNlbGYuX2NvbGxlY3Rpb24uX2Ryb3BJbmRleChpbmRleCk7XG59O1xuTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUuX2Ryb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9kcm9wQ29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIHNlbGYuX2NvbGxlY3Rpb24uZHJvcENvbGxlY3Rpb24oKTtcbn07XG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICBzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYENvbGxlY3Rpb25gXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8yLjIvYXBpL0NvbGxlY3Rpb24uaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICogQGxvY3VzIFNlcnZlclxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5yYXdDb2xsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcmF3Q29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gIH1cbiAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbigpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYERiYF0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMi4yL2FwaS9EYi5odG1sKSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGlzIGNvbGxlY3Rpb24ncyBkYXRhYmFzZSBjb25uZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICogQGxvY3VzIFNlcnZlclxuICovXG5Nb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZS5yYXdEYXRhYmFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoISAoc2VsZi5fZHJpdmVyLm1vbmdvICYmIHNlbGYuX2RyaXZlci5tb25nby5kYikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIHJhd0RhdGFiYXNlIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgfVxuICByZXR1cm4gc2VsZi5fZHJpdmVyLm1vbmdvLmRiO1xufTtcblxuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZSBhIE1vbmdvLXN0eWxlIGBPYmplY3RJRGAuICBJZiB5b3UgZG9uJ3Qgc3BlY2lmeSBhIGBoZXhTdHJpbmdgLCB0aGUgYE9iamVjdElEYCB3aWxsIGdlbmVyYXRlZCByYW5kb21seSAobm90IHVzaW5nIE1vbmdvREIncyBJRCBjb25zdHJ1Y3Rpb24gcnVsZXMpLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7U3RyaW5nfSBbaGV4U3RyaW5nXSBPcHRpb25hbC4gIFRoZSAyNC1jaGFyYWN0ZXIgaGV4YWRlY2ltYWwgY29udGVudHMgb2YgdGhlIE9iamVjdElEIHRvIGNyZWF0ZVxuICovXG5Nb25nby5PYmplY3RJRCA9IE1vbmdvSUQuT2JqZWN0SUQ7XG5cbi8qKlxuICogQHN1bW1hcnkgVG8gY3JlYXRlIGEgY3Vyc29yLCB1c2UgZmluZC4gVG8gYWNjZXNzIHRoZSBkb2N1bWVudHMgaW4gYSBjdXJzb3IsIHVzZSBmb3JFYWNoLCBtYXAsIG9yIGZldGNoLlxuICogQGNsYXNzXG4gKiBAaW5zdGFuY2VOYW1lIGN1cnNvclxuICovXG5Nb25nby5DdXJzb3IgPSBMb2NhbENvbGxlY3Rpb24uQ3Vyc29yO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1vbmdvLkNvbGxlY3Rpb24uQ3Vyc29yID0gTW9uZ28uQ3Vyc29yO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1vbmdvLkNvbGxlY3Rpb24uT2JqZWN0SUQgPSBNb25nby5PYmplY3RJRDtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5NZXRlb3IuQ29sbGVjdGlvbiA9IE1vbmdvLkNvbGxlY3Rpb247XG5cbi8vIEFsbG93IGRlbnkgc3R1ZmYgaXMgbm93IGluIHRoZSBhbGxvdy1kZW55IHBhY2thZ2Vcbl8uZXh0ZW5kKE1ldGVvci5Db2xsZWN0aW9uLnByb3RvdHlwZSwgQWxsb3dEZW55LkNvbGxlY3Rpb25Qcm90b3R5cGUpO1xuXG5mdW5jdGlvbiBwb3BDYWxsYmFja0Zyb21BcmdzKGFyZ3MpIHtcbiAgLy8gUHVsbCBvZmYgYW55IGNhbGxiYWNrIChvciBwZXJoYXBzIGEgJ2NhbGxiYWNrJyB2YXJpYWJsZSB0aGF0IHdhcyBwYXNzZWRcbiAgLy8gaW4gdW5kZWZpbmVkLCBsaWtlIGhvdyAndXBzZXJ0JyBkb2VzIGl0KS5cbiAgaWYgKGFyZ3MubGVuZ3RoICYmXG4gICAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMi4yL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiXX0=
