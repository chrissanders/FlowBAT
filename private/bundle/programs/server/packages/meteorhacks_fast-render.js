(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var InjectData = Package['meteorhacks:inject-data'].InjectData;
var Picker = Package['meteorhacks:picker'].Picker;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Accounts = Package['accounts-base'].Accounts;

/* Package-scope variables */
var FastRender, AddedToChanged, ApplyDDP, DeepExtend, IsAppUrl, PublishContext, Context;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/utils.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
AddedToChanged = function(localCopy, added) {                                                                          // 1
  added.msg = "changed";                                                                                               // 2
  added.cleared = [];                                                                                                  // 3
  added.fields = added.fields || {};                                                                                   // 4
                                                                                                                       // 5
  _.each(localCopy, function(value, key) {                                                                             // 6
    if(key != '_id') {                                                                                                 // 7
      if(typeof added.fields[key] == "undefined") {                                                                    // 8
        added.cleared.push(key);                                                                                       // 9
      }                                                                                                                // 10
    }                                                                                                                  // 11
  });                                                                                                                  // 12
};                                                                                                                     // 13
                                                                                                                       // 14
ApplyDDP = function(existing, message) {                                                                               // 15
  var newDoc = (!existing)? {}: _.clone(existing);                                                                     // 16
  if(message.msg == 'added') {                                                                                         // 17
    _.each(message.fields, function(value, key) {                                                                      // 18
      newDoc[key] = value;                                                                                             // 19
    });                                                                                                                // 20
  } else if(message.msg == "changed") {                                                                                // 21
    _.each(message.fields, function(value, key) {                                                                      // 22
      newDoc[key] = value;                                                                                             // 23
    });                                                                                                                // 24
    _.each(message.cleared, function(key) {                                                                            // 25
      delete newDoc[key];                                                                                              // 26
    });                                                                                                                // 27
  } else if(message.msg == "removed") {                                                                                // 28
    newDoc = null;                                                                                                     // 29
  }                                                                                                                    // 30
                                                                                                                       // 31
  return newDoc;                                                                                                       // 32
};                                                                                                                     // 33
                                                                                                                       // 34
// source: https://gist.github.com/kurtmilam/1868955                                                                   // 35
//  modified a bit to not to expose this as an _ api                                                                   // 36
DeepExtend = function deepExtend (obj) {                                                                               // 37
  var parentRE = /#{\s*?_\s*?}/,                                                                                       // 38
      slice = Array.prototype.slice,                                                                                   // 39
      hasOwnProperty = Object.prototype.hasOwnProperty;                                                                // 40
                                                                                                                       // 41
  _.each(slice.call(arguments, 1), function(source) {                                                                  // 42
    for (var prop in source) {                                                                                         // 43
      if (hasOwnProperty.call(source, prop)) {                                                                         // 44
        if (_.isUndefined(obj[prop]) || _.isFunction(obj[prop]) || _.isNull(source[prop]) || _.isDate(source[prop])) { // 45
          obj[prop] = source[prop];                                                                                    // 46
        }                                                                                                              // 47
        else if (_.isString(source[prop]) && parentRE.test(source[prop])) {                                            // 48
          if (_.isString(obj[prop])) {                                                                                 // 49
            obj[prop] = source[prop].replace(parentRE, obj[prop]);                                                     // 50
          }                                                                                                            // 51
        }                                                                                                              // 52
        else if (_.isArray(obj[prop]) || _.isArray(source[prop])){                                                     // 53
          if (!_.isArray(obj[prop]) || !_.isArray(source[prop])){                                                      // 54
            throw 'Error: Trying to combine an array with a non-array (' + prop + ')';                                 // 55
          } else {                                                                                                     // 56
            obj[prop] = _.reject(DeepExtend(obj[prop], source[prop]), function (item) { return _.isNull(item);});      // 57
          }                                                                                                            // 58
        }                                                                                                              // 59
        else if (_.isObject(obj[prop]) || _.isObject(source[prop])){                                                   // 60
          if (!_.isObject(obj[prop]) || !_.isObject(source[prop])){                                                    // 61
            throw 'Error: Trying to combine an object with a non-object (' + prop + ')';                               // 62
          } else {                                                                                                     // 63
            obj[prop] = DeepExtend(obj[prop], source[prop]);                                                           // 64
          }                                                                                                            // 65
        } else {                                                                                                       // 66
          obj[prop] = source[prop];                                                                                    // 67
        }                                                                                                              // 68
      }                                                                                                                // 69
    }                                                                                                                  // 70
  });                                                                                                                  // 71
  return obj;                                                                                                          // 72
};                                                                                                                     // 73
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/namespace.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
FastRender = {                                                                                                         // 1
  _routes: [],                                                                                                         // 2
  _onAllRoutes: []                                                                                                     // 3
};                                                                                                                     // 4
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/utils.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// meteor algorithm to check if this is a meteor serving http request or not                                           // 1
IsAppUrl = function (url) {                                                                                            // 2
  if (url === '/favicon.ico' || url === '/robots.txt')                                                                 // 3
    return false;                                                                                                      // 4
                                                                                                                       // 5
  // NOTE: app.manifest is not a web standard like favicon.ico and                                                     // 6
  // robots.txt. It is a file name we have chosen to use for HTML5                                                     // 7
  // appcache URLs. It is included here to prevent using an appcache                                                   // 8
  // then removing it from poisoning an app permanently. Eventually,                                                   // 9
  // once we have server side routing, this won't be needed as                                                         // 10
  // unknown URLs with return a 404 automatically.                                                                     // 11
  if (url === '/app.manifest')                                                                                         // 12
    return false;                                                                                                      // 13
                                                                                                                       // 14
  // Avoid serving app HTML for declared routes such as /sockjs/.                                                      // 15
  if (RoutePolicy.classify(url))                                                                                       // 16
    return false;                                                                                                      // 17
                                                                                                                       // 18
  // we currently return app HTML on all URLs by default                                                               // 19
  return true;                                                                                                         // 20
};                                                                                                                     // 21
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/routes.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');                                                                                     // 1
FastRender._onAllRoutes = [];                                                                                          // 2
                                                                                                                       // 3
var fastRenderRoutes = Picker.filter(function(req, res) {                                                              // 4
  return IsAppUrl(req.url);                                                                                            // 5
});                                                                                                                    // 6
fastRenderRoutes.middleware(Npm.require('connect').cookieParser());                                                    // 7
                                                                                                                       // 8
fastRenderRoutes.middleware(function(req, res, next) {                                                                 // 9
  var afterProcessed = setQueryDataCallback(res, next);                                                                // 10
  FastRender._processAllRoutes(req, afterProcessed);                                                                   // 11
});                                                                                                                    // 12
                                                                                                                       // 13
// handling specific routes                                                                                            // 14
FastRender.route = function route(path, callback) {                                                                    // 15
  fastRenderRoutes.route(path, onRoute);                                                                               // 16
                                                                                                                       // 17
  function onRoute(params, req, res, next) {                                                                           // 18
    var afterProcessed = setQueryDataCallback(res, next);                                                              // 19
    FastRender._processRoutes(params, req, callback, afterProcessed);                                                  // 20
  }                                                                                                                    // 21
};                                                                                                                     // 22
                                                                                                                       // 23
function setQueryDataCallback(res, next) {                                                                             // 24
  return function(queryData) {                                                                                         // 25
    if(!queryData) return next();                                                                                      // 26
                                                                                                                       // 27
    var existingPayload = res.getData("fast-render-data");                                                             // 28
    if(!existingPayload) {                                                                                             // 29
      res.pushData("fast-render-data", queryData);                                                                     // 30
    } else {                                                                                                           // 31
      // it's possible to execute this callback twice                                                                  // 32
      // the we need to merge exisitng data with the new one                                                           // 33
      _.extend(existingPayload.subscriptions, queryData.subscriptions);                                                // 34
      _.each(queryData.collectionData, function(data, pubName) {                                                       // 35
        var existingData = existingPayload.collectionData[pubName]                                                     // 36
        if(existingData) {                                                                                             // 37
          data = existingData.concat(data);                                                                            // 38
        }                                                                                                              // 39
                                                                                                                       // 40
        existingPayload.collectionData[pubName] = data;                                                                // 41
        res.pushData('fast-render-data', existingPayload);                                                             // 42
      });                                                                                                              // 43
    }                                                                                                                  // 44
    next();                                                                                                            // 45
  };                                                                                                                   // 46
}                                                                                                                      // 47
                                                                                                                       // 48
FastRender.onAllRoutes = function onAllRoutes(callback) {                                                              // 49
  FastRender._onAllRoutes.push(callback);                                                                              // 50
};                                                                                                                     // 51
                                                                                                                       // 52
FastRender._processRoutes =                                                                                            // 53
  function _processRoutes(params, req, routeCallback, callback) {                                                      // 54
  callback = callback || function() {};                                                                                // 55
                                                                                                                       // 56
  var path = req.url;                                                                                                  // 57
  var loginToken = req.cookies['meteor_login_token'];                                                                  // 58
  var headers = req.headers;                                                                                           // 59
                                                                                                                       // 60
  var context = new Context(loginToken, { headers: headers });                                                         // 61
                                                                                                                       // 62
  try {                                                                                                                // 63
    routeCallback.call(context, params, path);                                                                         // 64
    callback(context.getData());                                                                                       // 65
  } catch(err) {                                                                                                       // 66
    handleError(err, path, callback);                                                                                  // 67
  }                                                                                                                    // 68
};                                                                                                                     // 69
                                                                                                                       // 70
FastRender._processAllRoutes =                                                                                         // 71
  function _processAllRoutes(req, callback) {                                                                          // 72
  callback = callback || function() {};                                                                                // 73
                                                                                                                       // 74
  var path = req.url;                                                                                                  // 75
  var loginToken = req.cookies['meteor_login_token'];                                                                  // 76
  var headers = req.headers;                                                                                           // 77
                                                                                                                       // 78
  new Fiber(function() {                                                                                               // 79
    var context = new Context(loginToken, { headers: headers });                                                       // 80
                                                                                                                       // 81
    try {                                                                                                              // 82
      FastRender._onAllRoutes.forEach(function(callback) {                                                             // 83
        callback.call(context, req.url);                                                                               // 84
      });                                                                                                              // 85
                                                                                                                       // 86
      callback(context.getData());                                                                                     // 87
    } catch(err) {                                                                                                     // 88
      handleError(err, path, callback);                                                                                // 89
    }                                                                                                                  // 90
  }).run();                                                                                                            // 91
};                                                                                                                     // 92
                                                                                                                       // 93
function handleError(err, path, callback) {                                                                            // 94
  var message =                                                                                                        // 95
    'error on fast-rendering path: ' +                                                                                 // 96
    path +                                                                                                             // 97
    " ; error: " + err.stack;                                                                                          // 98
  console.error(message);                                                                                              // 99
  callback(null);                                                                                                      // 100
}                                                                                                                      // 101
                                                                                                                       // 102
// adding support for null publications                                                                                // 103
FastRender.onAllRoutes(function() {                                                                                    // 104
  var context = this;                                                                                                  // 105
  var nullHandlers = Meteor.default_server.universal_publish_handlers;                                                 // 106
                                                                                                                       // 107
  if(nullHandlers) {                                                                                                   // 108
    nullHandlers.forEach(function(publishHandler) {                                                                    // 109
      // console.log(publishHandler.toString());                                                                       // 110
      var publishContext = new PublishContext(context, null);                                                          // 111
      var params = [];                                                                                                 // 112
      context.processPublication(publishHandler, publishContext, params);                                              // 113
                                                                                                                       // 114
    });                                                                                                                // 115
  }                                                                                                                    // 116
});                                                                                                                    // 117
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/publish_context.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
PublishContext = function PublishContext(context, subscription) {                                                      // 1
  this.userId = context.userId;                                                                                        // 2
  this.unblock = function() {};                                                                                        // 3
  this._subscription = subscription;                                                                                   // 4
  this._context = context;                                                                                             // 5
  this._collectionData = {};                                                                                           // 6
  this._onStop = [];                                                                                                   // 7
  this._stopped = false;                                                                                               // 8
                                                                                                                       // 9
  // connection object                                                                                                 // 10
  this.connection = {                                                                                                  // 11
    _id: Meteor.uuid(),                                                                                                // 12
    close: function() {},                                                                                              // 13
    onClose: function() {},                                                                                            // 14
    // fake value, will be supported later on                                                                          // 15
    clientAddress: "127.0.0.1",                                                                                        // 16
    httpHeaders: context.headers                                                                                       // 17
  };                                                                                                                   // 18
                                                                                                                       // 19
  // we won't be supporting all the other fields of the Meteor's                                                       // 20
  // Subscription class since they are private variables                                                               // 21
};                                                                                                                     // 22
                                                                                                                       // 23
PublishContext.prototype._ensureCollection = function(collection) {                                                    // 24
  if (!this._collectionData[collection]) {                                                                             // 25
    this._collectionData[collection] = [];                                                                             // 26
                                                                                                                       // 27
    //put this collection data in the parent context                                                                   // 28
    this._context._ensureCollection(collection);                                                                       // 29
    this._context._collectionData[collection].push(this._collectionData[collection]);                                  // 30
  }                                                                                                                    // 31
};                                                                                                                     // 32
                                                                                                                       // 33
PublishContext.prototype.added = function(collection, id, fields) {                                                    // 34
  this._ensureCollection(collection);                                                                                  // 35
  var doc = _.clone(fields);                                                                                           // 36
  doc._id = id;                                                                                                        // 37
  this._collectionData[collection].push(doc);                                                                          // 38
};                                                                                                                     // 39
                                                                                                                       // 40
PublishContext.prototype.changed = function(collection, id, fields) {                                                  // 41
  var collectionData = this._collectionData;                                                                           // 42
                                                                                                                       // 43
  collectionData[collection] = collectionData[collection].map(function(doc) {                                          // 44
    if (doc._id === id) {                                                                                              // 45
      return _.extend(doc, fields);                                                                                    // 46
    }                                                                                                                  // 47
                                                                                                                       // 48
    return doc;                                                                                                        // 49
  });                                                                                                                  // 50
};                                                                                                                     // 51
                                                                                                                       // 52
PublishContext.prototype.removed = function(collection, id) {                                                          // 53
  var collectionData = this._collectionData;                                                                           // 54
                                                                                                                       // 55
  collectionData[collection] = collectionData[collection].filter(function(doc) {                                       // 56
    return doc._id !== id;                                                                                             // 57
  });                                                                                                                  // 58
};                                                                                                                     // 59
                                                                                                                       // 60
PublishContext.prototype.onStop = function(cb) {                                                                       // 61
  if (this._stopped) {                                                                                                 // 62
    cb();                                                                                                              // 63
  } else {                                                                                                             // 64
    this._onStop.push(cb);                                                                                             // 65
  }                                                                                                                    // 66
};                                                                                                                     // 67
                                                                                                                       // 68
PublishContext.prototype.ready = function() {                                                                          // 69
  this._stopped = true;                                                                                                // 70
                                                                                                                       // 71
  //make the subscription be marked as ready                                                                           // 72
  if(this._subscription) {                                                                                             // 73
    //don't do this for null subscriptions                                                                             // 74
    this._context.completeSubscriptions(this._subscription);                                                           // 75
  }                                                                                                                    // 76
                                                                                                                       // 77
  //make sure that any observe callbacks are cancelled                                                                 // 78
  this._onStop.forEach(function(cb) {                                                                                  // 79
    cb();                                                                                                              // 80
  });                                                                                                                  // 81
};                                                                                                                     // 82
                                                                                                                       // 83
PublishContext.prototype.error = function() {};                                                                        // 84
PublishContext.prototype.stop = function() {};                                                                         // 85
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/context.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fibers = Npm.require('fibers');                                                                                    // 1
var Future = Npm.require('fibers/future');                                                                             // 2
                                                                                                                       // 3
Context = function Context(loginToken, otherParams) {                                                                  // 4
  this._collectionData = {};                                                                                           // 5
  this._subscriptions = {};                                                                                            // 6
  this._subscriptionFutures = [];                                                                                      // 7
  this._loginToken = loginToken;                                                                                       // 8
                                                                                                                       // 9
  _.extend(this, otherParams);                                                                                         // 10
                                                                                                                       // 11
  // get the user                                                                                                      // 12
  if(Meteor.users) {                                                                                                   // 13
    // check to make sure, we've the loginToken,                                                                       // 14
    // otherwise a random user will fetched from the db                                                                // 15
    if(loginToken) {                                                                                                   // 16
      var hashedToken = loginToken && Accounts._hashLoginToken( loginToken );                                          // 17
      var query = {'services.resume.loginTokens.hashedToken': hashedToken };                                           // 18
      var options = {fields: {_id: 1}};                                                                                // 19
      var user = Meteor.users.findOne(query, options);                                                                 // 20
    }                                                                                                                  // 21
                                                                                                                       // 22
    //support for Meteor.user                                                                                          // 23
    Fibers.current._meteor_dynamics = {};                                                                              // 24
    Fibers.current._meteor_dynamics[DDP._CurrentInvocation.slot] = this;                                               // 25
                                                                                                                       // 26
    if(user) {                                                                                                         // 27
      this.userId = user._id;                                                                                          // 28
    }                                                                                                                  // 29
  }                                                                                                                    // 30
};                                                                                                                     // 31
                                                                                                                       // 32
Context.prototype.subscribe = function(subscription /*, params */) {                                                   // 33
  var self = this;                                                                                                     // 34
                                                                                                                       // 35
  var publishHandler = Meteor.default_server.publish_handlers[subscription];                                           // 36
  if(publishHandler) {                                                                                                 // 37
    var publishContext = new PublishContext(this, subscription);                                                       // 38
    var params = Array.prototype.slice.call(arguments, 1);                                                             // 39
                                                                                                                       // 40
    this.processPublication(publishHandler, publishContext, params);                                                   // 41
  } else {                                                                                                             // 42
    console.warn('There is no such publish handler named:', subscription);                                             // 43
  }                                                                                                                    // 44
};                                                                                                                     // 45
                                                                                                                       // 46
Context.prototype.processPublication = function(publishHandler, publishContext, params) {                              // 47
  var self = this;                                                                                                     // 48
                                                                                                                       // 49
  var future = new Future;                                                                                             // 50
  this._subscriptionFutures.push(future);                                                                              // 51
  //detect when the context is ready to be sent to the client                                                          // 52
  publishContext.onStop(function() {                                                                                   // 53
    if(!future.isResolved()) {                                                                                         // 54
      future.return();                                                                                                 // 55
    }                                                                                                                  // 56
  });                                                                                                                  // 57
                                                                                                                       // 58
  try {                                                                                                                // 59
    var cursors = publishHandler.apply(publishContext, params);                                                        // 60
  } catch(ex) {                                                                                                        // 61
    console.warn('error caught on publication: ', publishContext._subscription, ': ', ex.message);                     // 62
    // since, this subscription caught on an error we can't proceed.                                                   // 63
    // but we can't also throws an error since other publications might have something useful                          // 64
    // So, it's not fair to ignore running them due to error of this sub                                               // 65
    // this might also be failed due to the use of some private API's of Meteor's Susbscription class                  // 66
    publishContext.ready();                                                                                            // 67
  }                                                                                                                    // 68
                                                                                                                       // 69
  if(cursors) {                                                                                                        // 70
    //the publish function returned a cursor                                                                           // 71
    if(cursors.constructor != Array) {                                                                                 // 72
      cursors = [cursors];                                                                                             // 73
    }                                                                                                                  // 74
                                                                                                                       // 75
    //add collection data                                                                                              // 76
    cursors.forEach(function(cursor) {                                                                                 // 77
      cursor.rewind();                                                                                                 // 78
      var collectionName =                                                                                             // 79
        (cursor._cursorDescription)? cursor._cursorDescription.collectionName: null || //for meteor-collections        // 80
        (cursor._collection)? cursor._collection._name: null; //for smart-collections                                  // 81
                                                                                                                       // 82
      self._ensureCollection(collectionName);                                                                          // 83
      self._collectionData[collectionName].push(cursor.fetch());                                                       // 84
    });                                                                                                                // 85
                                                                                                                       // 86
    //the subscription is ready                                                                                        // 87
    publishContext.ready();                                                                                            // 88
  } else if(cursors === null) {                                                                                        // 89
    //some developers send null to indicate they are not using the publication                                         // 90
    //this is not the way to go, but meteor's accounts-base also does this                                             // 91
    //so we need some special handling on this                                                                         // 92
    publishContext.ready();                                                                                            // 93
  }                                                                                                                    // 94
                                                                                                                       // 95
  if (!future.isResolved()) {                                                                                          // 96
    //don't wait forever for handler to fire ready()                                                                   // 97
    Meteor.setTimeout(function() {                                                                                     // 98
      if (!future.isResolved()) {                                                                                      // 99
        //publish handler failed to send ready signal in time                                                          // 100
        console.warn('Publish handler for', publishContext._subscription, 'sent no ready signal');                     // 101
        future.return();                                                                                               // 102
      }                                                                                                                // 103
    }, 500);  //arbitrarially set timeout to 500ms, should probably be configurable                                    // 104
  }                                                                                                                    // 105
};                                                                                                                     // 106
                                                                                                                       // 107
Context.prototype.completeSubscriptions = function(subscriptions) {                                                    // 108
  var self = this;                                                                                                     // 109
  if(typeof subscriptions == 'string') {                                                                               // 110
    subscriptions = [subscriptions];                                                                                   // 111
  } else if(!subscriptions || subscriptions.constructor != Array) {                                                    // 112
    throw new Error('subscriptions params should be either a string or array of strings');                             // 113
  }                                                                                                                    // 114
                                                                                                                       // 115
  subscriptions.forEach(function(subscription) {                                                                       // 116
    self._subscriptions[subscription] = true;                                                                          // 117
  });                                                                                                                  // 118
};                                                                                                                     // 119
                                                                                                                       // 120
Context.prototype._ensureCollection = function(collectionName) {                                                       // 121
  if(!this._collectionData[collectionName]) {                                                                          // 122
    this._collectionData[collectionName] = [];                                                                         // 123
  }                                                                                                                    // 124
};                                                                                                                     // 125
                                                                                                                       // 126
Context.prototype.getData = function() {                                                                               // 127
  // Ensure that all of the subscriptions are ready                                                                    // 128
  this._subscriptionFutures.forEach(function(future) {                                                                 // 129
    future.wait();                                                                                                     // 130
  });                                                                                                                  // 131
                                                                                                                       // 132
  return {                                                                                                             // 133
    collectionData: this._collectionData,                                                                              // 134
    subscriptions: this._subscriptions,                                                                                // 135
    loginToken: this._loginToken                                                                                       // 136
  };                                                                                                                   // 137
};                                                                                                                     // 138
                                                                                                                       // 139
FastRender._Context = Context;                                                                                         // 140
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/meteorhacks:fast-render/lib/server/iron_router_support.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
if(!Package['iron:router']) return;                                                                                    // 1
                                                                                                                       // 2
var RouteController = Package['iron:router'].RouteController;                                                          // 3
var Router = Package['iron:router'].Router;                                                                            // 4
                                                                                                                       // 5
var currentSubscriptions = [];                                                                                         // 6
Meteor.subscribe = function(subscription) {                                                                            // 7
  currentSubscriptions.push(arguments);                                                                                // 8
};                                                                                                                     // 9
                                                                                                                       // 10
//assuming, no runtime routes will be added                                                                            // 11
Meteor.startup(function() {                                                                                            // 12
  // this is trick to run the processRoutes at the                                                                     // 13
  // end of all Meteor.startup callbacks                                                                               // 14
  Meteor.startup(processRoutes);                                                                                       // 15
});                                                                                                                    // 16
                                                                                                                       // 17
function processRoutes() {                                                                                             // 18
  Router.routes.forEach(function(route) {                                                                              // 19
    route.options = route.options || {};                                                                               // 20
    if(route.options.fastRender) {                                                                                     // 21
      handleRoute(route);                                                                                              // 22
    } else if(                                                                                                         // 23
        getController(route) &&                                                                                        // 24
        getController(route).prototype &&                                                                              // 25
        getController(route).prototype.fastRender                                                                      // 26
    ) {                                                                                                                // 27
      handleRoute(route);                                                                                              // 28
    }                                                                                                                  // 29
  });                                                                                                                  // 30
                                                                                                                       // 31
  // getting global waitOns                                                                                            // 32
  var globalWaitOns = [];                                                                                              // 33
  if(Router._globalHooks && Router._globalHooks.waitOn && Router._globalHooks.waitOn.length > 0) {                     // 34
    Router._globalHooks.waitOn.forEach(function(waitOn) {                                                              // 35
      globalWaitOns.push(waitOn.hook);                                                                                 // 36
    });                                                                                                                // 37
  }                                                                                                                    // 38
                                                                                                                       // 39
  FastRender.onAllRoutes(function(path) {                                                                              // 40
    var self = this;                                                                                                   // 41
                                                                                                                       // 42
    currentSubscriptions = [];                                                                                         // 43
    globalWaitOns.forEach(function(waitOn) {                                                                           // 44
      waitOn.call({path: path});                                                                                       // 45
    });                                                                                                                // 46
                                                                                                                       // 47
    currentSubscriptions.forEach(function(args) {                                                                      // 48
      self.subscribe.apply(self, args);                                                                                // 49
    });                                                                                                                // 50
  });                                                                                                                  // 51
};                                                                                                                     // 52
                                                                                                                       // 53
function handleRoute(route) {                                                                                          // 54
  var subscriptionFunctions = [];                                                                                      // 55
                                                                                                                       // 56
  // get potential subscription handlers from the route options                                                        // 57
  ['waitOn', 'subscriptions'].forEach(function(funcName) {                                                             // 58
    var handler = route.options[funcName];                                                                             // 59
    if(typeof handler == 'function') {                                                                                 // 60
      subscriptionFunctions.push(handler);                                                                             // 61
    } else if (handler instanceof Array) {                                                                             // 62
      handler.forEach(function(func) {                                                                                 // 63
        if(typeof func == 'function') {                                                                                // 64
          subscriptionFunctions.push(func);                                                                            // 65
        }                                                                                                              // 66
      });                                                                                                              // 67
    }                                                                                                                  // 68
  });                                                                                                                  // 69
                                                                                                                       // 70
  FastRender.route(getPath(route), onRoute);                                                                           // 71
                                                                                                                       // 72
  function onRoute(params, path) {                                                                                     // 73
    var self = this;                                                                                                   // 74
    var context = {                                                                                                    // 75
      params: params,                                                                                                  // 76
      path: path                                                                                                       // 77
    };                                                                                                                 // 78
                                                                                                                       // 79
    //reset subscriptions;                                                                                             // 80
    currentSubscriptions = [];                                                                                         // 81
    subscriptionFunctions.forEach(function(func) {                                                                     // 82
      func.call(context);                                                                                              // 83
    });                                                                                                                // 84
                                                                                                                       // 85
    // if there is a controller, try to initiate it and invoke potential                                               // 86
    // methods which could give us subscriptions                                                                       // 87
    var controller = getController(route);                                                                             // 88
    if(controller && controller.prototype) {                                                                           // 89
      if(typeof controller.prototype.lookupOption == 'function') {                                                     // 90
        // for IR 1.0                                                                                                  // 91
        // it is possible to create a controller invoke methods on it                                                  // 92
        var controllerInstance = new controller();                                                                     // 93
        controllerInstance.params = params;                                                                            // 94
        controllerInstance.path = path;                                                                                // 95
                                                                                                                       // 96
        ['waitOn', 'subscriptions'].forEach(function(funcName) {                                                       // 97
          if(controllerInstance[funcName]) {                                                                           // 98
            controllerInstance[funcName].call(controllerInstance);                                                     // 99
          }                                                                                                            // 100
        });                                                                                                            // 101
      } else {                                                                                                         // 102
        // IR 0.9                                                                                                      // 103
        // hard to create a controller instance                                                                        // 104
        // so this is the option we can take                                                                           // 105
        var waitOn = controller.prototype.waitOn;                                                                      // 106
        if(waitOn) {                                                                                                   // 107
          waitOn.call(context);                                                                                        // 108
        }                                                                                                              // 109
      }                                                                                                                // 110
    }                                                                                                                  // 111
                                                                                                                       // 112
    currentSubscriptions.forEach(function(args) {                                                                      // 113
      self.subscribe.apply(self, args);                                                                                // 114
    });                                                                                                                // 115
  }                                                                                                                    // 116
}                                                                                                                      // 117
                                                                                                                       // 118
function getPath(route) {                                                                                              // 119
  if(route._path) {                                                                                                    // 120
    // for IR 1.0                                                                                                      // 121
    return route._path;                                                                                                // 122
  } else {                                                                                                             // 123
    // for IR 0.9                                                                                                      // 124
    var name = (route.name == "/")? "" : name;                                                                         // 125
    return route.options.path || ("/" + name);                                                                         // 126
  }                                                                                                                    // 127
}                                                                                                                      // 128
                                                                                                                       // 129
function getController(route) {                                                                                        // 130
  if(route.findControllerConstructor) {                                                                                // 131
    // for IR 1.0                                                                                                      // 132
    return route.findControllerConstructor();                                                                          // 133
  } else if(route.findController) {                                                                                    // 134
    // for IR 0.9                                                                                                      // 135
    return route.findController();                                                                                     // 136
  } else {                                                                                                             // 137
    // unsupported version of IR                                                                                       // 138
    return null;                                                                                                       // 139
  }                                                                                                                    // 140
}                                                                                                                      // 141
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['meteorhacks:fast-render'] = {
  FastRender: FastRender
};

})();

//# sourceMappingURL=meteorhacks_fast-render.js.map
