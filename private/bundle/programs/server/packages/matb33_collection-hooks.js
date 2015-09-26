(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;

/* Package-scope variables */
var CollectionHooks, docIds;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/collection-hooks.js                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// Relevant AOP terminology:                                                                                         // 1
// Aspect: User code that runs before/after (hook)                                                                   // 2
// Advice: Wrapper code that knows when to call user code (aspects)                                                  // 3
// Pointcut: before/after                                                                                            // 4
                                                                                                                     // 5
var advices = {};                                                                                                    // 6
var Tracker = Package.tracker && Package.tracker.Tracker || Package.deps.Deps;                                       // 7
var publishUserId = Meteor.isServer && new Meteor.EnvironmentVariable();                                             // 8
                                                                                                                     // 9
var directEnv = new Meteor.EnvironmentVariable();                                                                    // 10
var directOp = function (func) {                                                                                     // 11
  return directEnv.withValue(true, func);                                                                            // 12
};                                                                                                                   // 13
                                                                                                                     // 14
function getUserId() {                                                                                               // 15
  var userId;                                                                                                        // 16
                                                                                                                     // 17
  if (Meteor.isClient) {                                                                                             // 18
    Tracker.nonreactive(function () {                                                                                // 19
      userId = Meteor.userId && Meteor.userId();                                                                     // 20
    });                                                                                                              // 21
  }                                                                                                                  // 22
                                                                                                                     // 23
  if (Meteor.isServer) {                                                                                             // 24
    try {                                                                                                            // 25
      // Will throw an error unless within method call.                                                              // 26
      // Attempt to recover gracefully by catching:                                                                  // 27
      userId = Meteor.userId && Meteor.userId();                                                                     // 28
    } catch (e) {}                                                                                                   // 29
                                                                                                                     // 30
    if (!userId) {                                                                                                   // 31
      // Get the userId if we are in a publish function.                                                             // 32
      userId = publishUserId.get();                                                                                  // 33
    }                                                                                                                // 34
  }                                                                                                                  // 35
                                                                                                                     // 36
  return userId;                                                                                                     // 37
}                                                                                                                    // 38
                                                                                                                     // 39
CollectionHooks = {                                                                                                  // 40
  defaults: {                                                                                                        // 41
    before: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},                                   // 42
    after: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},                                    // 43
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}}                                       // 44
  }                                                                                                                  // 45
};                                                                                                                   // 46
                                                                                                                     // 47
CollectionHooks.extendCollectionInstance = function (self, constructor) {                                            // 48
  var collection = Meteor.isClient ? self : self._collection;                                                        // 49
                                                                                                                     // 50
  // Offer a public API to allow the user to define aspects                                                          // 51
  // Example: collection.before.insert(func);                                                                        // 52
  _.each(["before", "after"], function (pointcut) {                                                                  // 53
    _.each(advices, function (advice, method) {                                                                      // 54
      Meteor._ensure(self, pointcut, method);                                                                        // 55
      Meteor._ensure(self, "_hookAspects", method);                                                                  // 56
                                                                                                                     // 57
      self._hookAspects[method][pointcut] = [];                                                                      // 58
      self[pointcut][method] = function (aspect, options) {                                                          // 59
        var len = self._hookAspects[method][pointcut].push({                                                         // 60
          aspect: aspect,                                                                                            // 61
          options: CollectionHooks.initOptions(options, pointcut, method)                                            // 62
        });                                                                                                          // 63
                                                                                                                     // 64
        return {                                                                                                     // 65
          replace: function (aspect, options) {                                                                      // 66
            self._hookAspects[method][pointcut].splice(len - 1, 1, {                                                 // 67
              aspect: aspect,                                                                                        // 68
              options: CollectionHooks.initOptions(options, pointcut, method)                                        // 69
            });                                                                                                      // 70
          },                                                                                                         // 71
          remove: function () {                                                                                      // 72
            self._hookAspects[method][pointcut].splice(len - 1, 1);                                                  // 73
          }                                                                                                          // 74
        };                                                                                                           // 75
      };                                                                                                             // 76
    });                                                                                                              // 77
  });                                                                                                                // 78
                                                                                                                     // 79
  // Offer a publicly accessible object to allow the user to define                                                  // 80
  // collection-wide hook options.                                                                                   // 81
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};                                          // 82
  self.hookOptions = EJSON.clone(CollectionHooks.defaults);                                                          // 83
                                                                                                                     // 84
  // Wrap mutator methods, letting the defined advice do the work                                                    // 85
  _.each(advices, function (advice, method) {                                                                        // 86
    // Store a reference to the mutator method in a publicly reachable location                                      // 87
    var _super = collection[method];                                                                                 // 88
                                                                                                                     // 89
    Meteor._ensure(self, "direct", method);                                                                          // 90
    self.direct[method] = function () {                                                                              // 91
      var args = arguments;                                                                                          // 92
      return directOp(function () {                                                                                  // 93
        return constructor.prototype[method].apply(self, args);                                                      // 94
      });                                                                                                            // 95
    };                                                                                                               // 96
                                                                                                                     // 97
    collection[method] = function () {                                                                               // 98
      if (directEnv.get() === true) {                                                                                // 99
        return _super.apply(collection, arguments);                                                                  // 100
      }                                                                                                              // 101
                                                                                                                     // 102
      return advice.call(this,                                                                                       // 103
        getUserId(),                                                                                                 // 104
        _super,                                                                                                      // 105
        self,                                                                                                        // 106
        self._hookAspects[method] || {},                                                                             // 107
        function (doc) {                                                                                             // 108
          return  _.isFunction(self._transform)                                                                      // 109
                  ? function (d) { return self._transform(d || doc); }                                               // 110
                  : function (d) { return d || doc; };                                                               // 111
        },                                                                                                           // 112
        _.toArray(arguments),                                                                                        // 113
        false                                                                                                        // 114
      );                                                                                                             // 115
    };                                                                                                               // 116
  });                                                                                                                // 117
};                                                                                                                   // 118
                                                                                                                     // 119
CollectionHooks.defineAdvice = function (method, advice) {                                                           // 120
  advices[method] = advice;                                                                                          // 121
};                                                                                                                   // 122
                                                                                                                     // 123
CollectionHooks.initOptions = function (options, pointcut, method) {                                                 // 124
  return CollectionHooks.extendOptions(CollectionHooks.defaults, options, pointcut, method);                         // 125
};                                                                                                                   // 126
                                                                                                                     // 127
CollectionHooks.extendOptions = function (source, options, pointcut, method) {                                       // 128
  options = _.extend(options || {}, source.all.all);                                                                 // 129
  options = _.extend(options, source[pointcut].all);                                                                 // 130
  options = _.extend(options, source.all[method]);                                                                   // 131
  options = _.extend(options, source[pointcut][method]);                                                             // 132
  return options;                                                                                                    // 133
};                                                                                                                   // 134
                                                                                                                     // 135
CollectionHooks.getDocs = function (collection, selector, options) {                                                 // 136
  var self = this;                                                                                                   // 137
                                                                                                                     // 138
  var findOptions = {transform: null, reactive: false}; // added reactive: false                                     // 139
                                                                                                                     // 140
  /*                                                                                                                 // 141
  // No "fetch" support at this time.                                                                                // 142
  if (!self._validators.fetchAllFields) {                                                                            // 143
    findOptions.fields = {};                                                                                         // 144
    _.each(self._validators.fetch, function(fieldName) {                                                             // 145
      findOptions.fields[fieldName] = 1;                                                                             // 146
    });                                                                                                              // 147
  }                                                                                                                  // 148
  */                                                                                                                 // 149
                                                                                                                     // 150
  // Bit of a magic condition here... only "update" passes options, so this is                                       // 151
  // only relevant to when update calls getDocs:                                                                     // 152
  if (options) {                                                                                                     // 153
    // This was added because in our case, we are potentially iterating over                                         // 154
    // multiple docs. If multi isn't enabled, force a limit (almost like                                             // 155
    // findOne), as the default for update without multi enabled is to affect                                        // 156
    // only the first matched document:                                                                              // 157
    if (!options.multi) {                                                                                            // 158
      findOptions.limit = 1;                                                                                         // 159
    }                                                                                                                // 160
  }                                                                                                                  // 161
                                                                                                                     // 162
  // Unlike validators, we iterate over multiple docs, so use                                                        // 163
  // find instead of findOne:                                                                                        // 164
  return collection.find(selector, findOptions);                                                                     // 165
};                                                                                                                   // 166
                                                                                                                     // 167
CollectionHooks.reassignPrototype = function (instance, constr) {                                                    // 168
  var hasSetPrototypeOf = typeof Object.setPrototypeOf === "function";                                               // 169
                                                                                                                     // 170
  if (!constr) constr = typeof Mongo !== "undefined" ? Mongo.Collection : Meteor.Collection;                         // 171
                                                                                                                     // 172
  // __proto__ is not available in < IE11                                                                            // 173
  // Note: Assigning a prototype dynamically has performance implications                                            // 174
  if (hasSetPrototypeOf) {                                                                                           // 175
    Object.setPrototypeOf(instance, constr.prototype);                                                               // 176
  } else if (instance.__proto__) {                                                                                   // 177
    instance.__proto__ = constr.prototype;                                                                           // 178
  }                                                                                                                  // 179
};                                                                                                                   // 180
                                                                                                                     // 181
CollectionHooks.wrapCollection = function (ns, as) {                                                                 // 182
  if (!as._CollectionConstructor) as._CollectionConstructor = as.Collection;                                         // 183
  if (!as._CollectionPrototype) as._CollectionPrototype = new as.Collection(null);                                   // 184
                                                                                                                     // 185
  var constructor = as._CollectionConstructor;                                                                       // 186
  var proto = as._CollectionPrototype;                                                                               // 187
                                                                                                                     // 188
  ns.Collection = function () {                                                                                      // 189
    var ret = constructor.apply(this, arguments);                                                                    // 190
    CollectionHooks.extendCollectionInstance(this, constructor);                                                     // 191
    return ret;                                                                                                      // 192
  };                                                                                                                 // 193
                                                                                                                     // 194
  ns.Collection.prototype = proto;                                                                                   // 195
                                                                                                                     // 196
  for (var prop in constructor) {                                                                                    // 197
    if (constructor.hasOwnProperty(prop)) {                                                                          // 198
      ns.Collection[prop] = constructor[prop];                                                                       // 199
    }                                                                                                                // 200
  }                                                                                                                  // 201
};                                                                                                                   // 202
                                                                                                                     // 203
if (typeof Mongo !== "undefined") {                                                                                  // 204
  CollectionHooks.wrapCollection(Meteor, Mongo);                                                                     // 205
  CollectionHooks.wrapCollection(Mongo, Mongo);                                                                      // 206
} else {                                                                                                             // 207
  CollectionHooks.wrapCollection(Meteor, Meteor);                                                                    // 208
}                                                                                                                    // 209
                                                                                                                     // 210
if (Meteor.isServer) {                                                                                               // 211
  var _publish = Meteor.publish;                                                                                     // 212
  Meteor.publish = function (name, func) {                                                                           // 213
    return _publish.call(this, name, function () {                                                                   // 214
      // This function is called repeatedly in publications                                                          // 215
      var ctx = this, args = arguments;                                                                              // 216
      return publishUserId.withValue(ctx && ctx.userId, function () {                                                // 217
        return func.apply(ctx, args);                                                                                // 218
      });                                                                                                            // 219
    });                                                                                                              // 220
  };                                                                                                                 // 221
                                                                                                                     // 222
  // Make the above available for packages with hooks that want to determine                                         // 223
  // whether they are running inside a publish function or not.                                                      // 224
  CollectionHooks.isWithinPublish = function () {                                                                    // 225
    return publishUserId.get() !== undefined;                                                                        // 226
  };                                                                                                                 // 227
}                                                                                                                    // 228
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/insert.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
CollectionHooks.defineAdvice("insert", function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this;                                                                                                   // 2
  var ctx = {context: self, _super: _super, args: args};                                                             // 3
  var callback = _.last(args);                                                                                       // 4
  var async = _.isFunction(callback);                                                                                // 5
  var abort, ret;                                                                                                    // 6
                                                                                                                     // 7
  // args[0] : doc                                                                                                   // 8
  // args[1] : callback                                                                                              // 9
                                                                                                                     // 10
  // before                                                                                                          // 11
  if (!suppressAspects) {                                                                                            // 12
    _.each(aspects.before, function (o) {                                                                            // 13
      var r = o.aspect.call(_.extend({transform: getTransform(args[0])}, ctx), userId, args[0]);                     // 14
      if (r === false) abort = true;                                                                                 // 15
    });                                                                                                              // 16
                                                                                                                     // 17
    if (abort) return false;                                                                                         // 18
  }                                                                                                                  // 19
                                                                                                                     // 20
  function after(id, err) {                                                                                          // 21
    var doc = args[0];                                                                                               // 22
    if (id) {                                                                                                        // 23
      doc = EJSON.clone(args[0]);                                                                                    // 24
      doc._id = id;                                                                                                  // 25
    }                                                                                                                // 26
    if (!suppressAspects) {                                                                                          // 27
      var lctx = _.extend({transform: getTransform(doc), _id: id, err: err}, ctx);                                   // 28
      _.each(aspects.after, function (o) {                                                                           // 29
        o.aspect.call(lctx, userId, doc);                                                                            // 30
      });                                                                                                            // 31
    }                                                                                                                // 32
    return id;                                                                                                       // 33
  }                                                                                                                  // 34
                                                                                                                     // 35
  if (async) {                                                                                                       // 36
    args[args.length - 1] = function (err, obj) {                                                                    // 37
      after(obj && obj[0] && obj[0]._id || obj, err);                                                                // 38
      return callback.apply(this, arguments);                                                                        // 39
    };                                                                                                               // 40
    return _super.apply(self, args);                                                                                 // 41
  } else {                                                                                                           // 42
    ret = _super.apply(self, args);                                                                                  // 43
    return after(ret && ret[0] && ret[0]._id || ret);                                                                // 44
  }                                                                                                                  // 45
});                                                                                                                  // 46
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/update.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
CollectionHooks.defineAdvice("update", function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this;                                                                                                   // 2
  var ctx = {context: self, _super: _super, args: args};                                                             // 3
  var callback = _.last(args);                                                                                       // 4
  var async = _.isFunction(callback);                                                                                // 5
  var docs, docsIds, fields, abort, prev = {};                                                                       // 6
  var collection = _.has(self, "_collection") ? self._collection : self;                                             // 7
                                                                                                                     // 8
  // args[0] : selector                                                                                              // 9
  // args[1] : mutator                                                                                               // 10
  // args[2] : options (optional)                                                                                    // 11
  // args[3] : callback                                                                                              // 12
                                                                                                                     // 13
  if (_.isFunction(args[2])) {                                                                                       // 14
    callback = args[2];                                                                                              // 15
    args[2] = {};                                                                                                    // 16
  }                                                                                                                  // 17
                                                                                                                     // 18
  if (!suppressAspects) {                                                                                            // 19
    if (aspects.before || aspects.after) {                                                                           // 20
      fields = getFields(args[1]);                                                                                   // 21
      docs = CollectionHooks.getDocs.call(self, collection, args[0], args[2]).fetch();                               // 22
      docIds = _.map(docs, function (doc) { return doc._id; });                                                      // 23
    }                                                                                                                // 24
                                                                                                                     // 25
    // copy originals for convenience for the "after" pointcut                                                       // 26
    if (aspects.after) {                                                                                             // 27
      if (_.some(aspects.after, function (o) { return o.options.fetchPrevious !== false; }) &&                       // 28
          CollectionHooks.extendOptions(instance.hookOptions, {}, "after", "update").fetchPrevious !== false) {      // 29
        prev.mutator = EJSON.clone(args[1]);                                                                         // 30
        prev.options = EJSON.clone(args[2]);                                                                         // 31
        prev.docs = {};                                                                                              // 32
        _.each(docs, function (doc) {                                                                                // 33
          prev.docs[doc._id] = EJSON.clone(doc);                                                                     // 34
        });                                                                                                          // 35
      }                                                                                                              // 36
    }                                                                                                                // 37
                                                                                                                     // 38
    // before                                                                                                        // 39
    _.each(aspects.before, function (o) {                                                                            // 40
      _.each(docs, function (doc) {                                                                                  // 41
        var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc, fields, args[1], args[2]); // 42
        if (r === false) abort = true;                                                                               // 43
      });                                                                                                            // 44
    });                                                                                                              // 45
                                                                                                                     // 46
    if (abort) return false;                                                                                         // 47
  }                                                                                                                  // 48
                                                                                                                     // 49
  function after(affected, err) {                                                                                    // 50
    if (!suppressAspects) {                                                                                          // 51
      var fields = getFields(args[1]);                                                                               // 52
      var docs = CollectionHooks.getDocs.call(self, collection, {_id: {$in: docIds}}, args[2]).fetch();              // 53
                                                                                                                     // 54
      _.each(aspects.after, function (o) {                                                                           // 55
        _.each(docs, function (doc) {                                                                                // 56
          o.aspect.call(_.extend({                                                                                   // 57
            transform: getTransform(doc),                                                                            // 58
            previous: prev.docs && prev.docs[doc._id],                                                               // 59
            affected: affected,                                                                                      // 60
            err: err                                                                                                 // 61
          }, ctx), userId, doc, fields, prev.mutator, prev.options);                                                 // 62
        });                                                                                                          // 63
      });                                                                                                            // 64
    }                                                                                                                // 65
  }                                                                                                                  // 66
                                                                                                                     // 67
  if (async) {                                                                                                       // 68
    args[args.length - 1] = function (err, affected) {                                                               // 69
      after(affected, err);                                                                                          // 70
      return callback.apply(this, arguments);                                                                        // 71
    };                                                                                                               // 72
    return _super.apply(this, args);                                                                                 // 73
  } else {                                                                                                           // 74
    var affected = _super.apply(self, args);                                                                         // 75
    after(affected);                                                                                                 // 76
    return affected;                                                                                                 // 77
  }                                                                                                                  // 78
});                                                                                                                  // 79
                                                                                                                     // 80
// This function contains a snippet of code pulled and modified from:                                                // 81
// ~/.meteor/packages/mongo-livedata/collection.js:632-668                                                           // 82
// It's contained in these utility functions to make updates easier for us in                                        // 83
// case this code changes.                                                                                           // 84
var getFields = function (mutator) {                                                                                 // 85
  // compute modified fields                                                                                         // 86
  var fields = [];                                                                                                   // 87
  _.each(mutator, function (params, op) {                                                                            // 88
    _.each(_.keys(params), function (field) {                                                                        // 89
      // treat dotted fields as if they are replacing their                                                          // 90
      // top-level part                                                                                              // 91
      if (field.indexOf('.') !== -1)                                                                                 // 92
        field = field.substring(0, field.indexOf('.'));                                                              // 93
                                                                                                                     // 94
      // record the field we are trying to change                                                                    // 95
      if (!_.contains(fields, field))                                                                                // 96
        fields.push(field);                                                                                          // 97
    });                                                                                                              // 98
  });                                                                                                                // 99
                                                                                                                     // 100
  return fields;                                                                                                     // 101
};                                                                                                                   // 102
                                                                                                                     // 103
// This function contains a snippet of code pulled and modified from:                                                // 104
// ~/.meteor/packages/mongo-livedata/collection.js                                                                   // 105
// It's contained in these utility functions to make updates easier for us in                                        // 106
// case this code changes.                                                                                           // 107
var getFields = function (mutator) {                                                                                 // 108
  // compute modified fields                                                                                         // 109
  var fields = [];                                                                                                   // 110
                                                                                                                     // 111
  _.each(mutator, function (params, op) {                                                                            // 112
    //====ADDED START=======================                                                                         // 113
    if (_.contains(["$set", "$unset", "$inc", "$push", "$pull", "$pop", "$rename", "$pullAll", "$addToSet", "$bit"], op)) {
    //====ADDED END=========================                                                                         // 115
      _.each(_.keys(params), function (field) {                                                                      // 116
        // treat dotted fields as if they are replacing their                                                        // 117
        // top-level part                                                                                            // 118
        if (field.indexOf('.') !== -1)                                                                               // 119
          field = field.substring(0, field.indexOf('.'));                                                            // 120
                                                                                                                     // 121
        // record the field we are trying to change                                                                  // 122
        if (!_.contains(fields, field))                                                                              // 123
          fields.push(field);                                                                                        // 124
      });                                                                                                            // 125
    //====ADDED START=======================                                                                         // 126
    } else {                                                                                                         // 127
      fields.push(op);                                                                                               // 128
    }                                                                                                                // 129
    //====ADDED END=========================                                                                         // 130
  });                                                                                                                // 131
                                                                                                                     // 132
  return fields;                                                                                                     // 133
};                                                                                                                   // 134
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/remove.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
CollectionHooks.defineAdvice("remove", function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this;                                                                                                   // 2
  var ctx = {context: self, _super: _super, args: args};                                                             // 3
  var callback = _.last(args);                                                                                       // 4
  var async = _.isFunction(callback);                                                                                // 5
  var docs, abort, prev = [];                                                                                        // 6
  var collection = _.has(self, "_collection") ? self._collection : self;                                             // 7
                                                                                                                     // 8
  // args[0] : selector                                                                                              // 9
  // args[1] : callback                                                                                              // 10
                                                                                                                     // 11
  if (!suppressAspects) {                                                                                            // 12
    if (aspects.before || aspects.after) {                                                                           // 13
      docs = CollectionHooks.getDocs.call(self, collection, args[0]).fetch();                                        // 14
    }                                                                                                                // 15
                                                                                                                     // 16
    // copy originals for convenience for the "after" pointcut                                                       // 17
    if (aspects.after) {                                                                                             // 18
      _.each(docs, function (doc) {                                                                                  // 19
        prev.push(EJSON.clone(doc));                                                                                 // 20
      });                                                                                                            // 21
    }                                                                                                                // 22
                                                                                                                     // 23
    // before                                                                                                        // 24
    _.each(aspects.before, function (o) {                                                                            // 25
      _.each(docs, function (doc) {                                                                                  // 26
        var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc);                           // 27
        if (r === false) abort = true;                                                                               // 28
      });                                                                                                            // 29
    });                                                                                                              // 30
                                                                                                                     // 31
    if (abort) return false;                                                                                         // 32
  }                                                                                                                  // 33
                                                                                                                     // 34
  function after(err) {                                                                                              // 35
    if (!suppressAspects) {                                                                                          // 36
      _.each(aspects.after, function (o) {                                                                           // 37
        _.each(prev, function (doc) {                                                                                // 38
          o.aspect.call(_.extend({transform: getTransform(doc), err: err}, ctx), userId, doc);                       // 39
        });                                                                                                          // 40
      });                                                                                                            // 41
    }                                                                                                                // 42
  }                                                                                                                  // 43
                                                                                                                     // 44
  if (async) {                                                                                                       // 45
    args[args.length - 1] = function (err) {                                                                         // 46
      after(err);                                                                                                    // 47
      return callback.apply(this, arguments);                                                                        // 48
    };                                                                                                               // 49
    return _super.apply(self, args);                                                                                 // 50
  } else {                                                                                                           // 51
    var result = _super.apply(self, args);                                                                           // 52
    after();                                                                                                         // 53
    return result;                                                                                                   // 54
  }                                                                                                                  // 55
});                                                                                                                  // 56
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/find.js                                                                          //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
CollectionHooks.defineAdvice("find", function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this;                                                                                                   // 2
  var ctx = {context: self, _super: _super, args: args};                                                             // 3
  var ret, abort;                                                                                                    // 4
                                                                                                                     // 5
  // args[0] : selector                                                                                              // 6
  // args[1] : options                                                                                               // 7
                                                                                                                     // 8
  // before                                                                                                          // 9
  if (!suppressAspects) {                                                                                            // 10
    _.each(aspects.before, function (o) {                                                                            // 11
      var r = o.aspect.call(ctx, userId, args[0], args[1]);                                                          // 12
      if (r === false) abort = true;                                                                                 // 13
    });                                                                                                              // 14
                                                                                                                     // 15
    if (abort) return false;                                                                                         // 16
  }                                                                                                                  // 17
                                                                                                                     // 18
  function after(cursor) {                                                                                           // 19
    if (!suppressAspects) {                                                                                          // 20
      _.each(aspects.after, function (o) {                                                                           // 21
        o.aspect.call(ctx, userId, args[0], args[1], cursor);                                                        // 22
      });                                                                                                            // 23
    }                                                                                                                // 24
  }                                                                                                                  // 25
                                                                                                                     // 26
  ret = _super.apply(self, args);                                                                                    // 27
  after(ret);                                                                                                        // 28
                                                                                                                     // 29
  return ret;                                                                                                        // 30
});                                                                                                                  // 31
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/findone.js                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
CollectionHooks.defineAdvice("findOne", function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this;                                                                                                   // 2
  var ctx = {context: self, _super: _super, args: args};                                                             // 3
  var ret, abort;                                                                                                    // 4
                                                                                                                     // 5
  // args[0] : selector                                                                                              // 6
  // args[1] : options                                                                                               // 7
                                                                                                                     // 8
  // before                                                                                                          // 9
  if (!suppressAspects) {                                                                                            // 10
    _.each(aspects.before, function (o) {                                                                            // 11
      var r = o.aspect.call(ctx, userId, args[0], args[1]);                                                          // 12
      if (r === false) abort = true;                                                                                 // 13
    });                                                                                                              // 14
                                                                                                                     // 15
    if (abort) return false;                                                                                         // 16
  }                                                                                                                  // 17
                                                                                                                     // 18
  function after(doc) {                                                                                              // 19
    if (!suppressAspects) {                                                                                          // 20
      _.each(aspects.after, function (o) {                                                                           // 21
        o.aspect.call(ctx, userId, args[0], args[1], doc);                                                           // 22
      });                                                                                                            // 23
    }                                                                                                                // 24
  }                                                                                                                  // 25
                                                                                                                     // 26
  ret = _super.apply(self, args);                                                                                    // 27
  after(ret);                                                                                                        // 28
                                                                                                                     // 29
  return ret;                                                                                                        // 30
});                                                                                                                  // 31
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/matb33:collection-hooks/users-compat.js                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
if (Meteor.users) {                                                                                                  // 1
  // If Meteor.users has been instantiated, attempt to re-assign its prototype:                                      // 2
  CollectionHooks.reassignPrototype(Meteor.users);                                                                   // 3
                                                                                                                     // 4
  // Next, give it the hook aspects:                                                                                 // 5
  var Collection = typeof Mongo !== "undefined" && typeof Mongo.Collection !== "undefined" ? Mongo.Collection : Meteor.Collection;
  CollectionHooks.extendCollectionInstance(Meteor.users, Collection);                                                // 7
}                                                                                                                    // 8
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['matb33:collection-hooks'] = {
  CollectionHooks: CollectionHooks
};

})();

//# sourceMappingURL=matb33_collection-hooks.js.map
