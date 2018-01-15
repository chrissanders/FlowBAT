(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var InjectData = Package['staringatlights:inject-data'].InjectData;
var Picker = Package['meteorhacks:picker'].Picker;
var MeteorX = Package['meteorhacks:meteorx'].MeteorX;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Accounts = Package['accounts-base'].Accounts;
var Random = Package.random.Random;

/* Package-scope variables */
var AddedToChanged, ApplyDDP, DeepExtend, FastRender, IsAppUrl, PublishContext, Context;

(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/utils.js                                                              //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
AddedToChanged = function(localCopy, added) {
  added.msg = "changed";
  added.cleared = [];
  added.fields = added.fields || {};

  _.each(localCopy, function(value, key) {
    if(key != '_id') {
      if(typeof added.fields[key] == "undefined") {
        added.cleared.push(key);
      }
    }
  });
};

ApplyDDP = function(existing, message) {
  var newDoc = (!existing)? {}: _.clone(existing);
  if(message.msg == 'added') {
    _.each(message.fields, function(value, key) {
      newDoc[key] = value;
    });
  } else if(message.msg == "changed") {
    _.each(message.fields, function(value, key) {
      newDoc[key] = value;
    });
    _.each(message.cleared, function(key) {
      delete newDoc[key];
    });
  } else if(message.msg == "removed") {
    newDoc = null;
  }

  return newDoc;
};

// source: https://gist.github.com/kurtmilam/1868955
//  modified a bit to not to expose this as an _ api
DeepExtend = function deepExtend (obj) {
  var parentRE = /#{\s*?_\s*?}/,
      slice = Array.prototype.slice,
      hasOwnProperty = Object.prototype.hasOwnProperty;

  _.each(slice.call(arguments, 1), function(source) {
    for (var prop in source) {
      if (hasOwnProperty.call(source, prop)) {
        if (_.isNull(obj[prop]) || _.isUndefined(obj[prop]) || _.isFunction(obj[prop]) || _.isNull(source[prop]) || _.isDate(source[prop])) {
          obj[prop] = source[prop];
        }
        else if (_.isString(source[prop]) && parentRE.test(source[prop])) {
          if (_.isString(obj[prop])) {
            obj[prop] = source[prop].replace(parentRE, obj[prop]);
          }
        }
        else if (_.isArray(obj[prop]) || _.isArray(source[prop])){
          if (!_.isArray(obj[prop]) || !_.isArray(source[prop])){
            throw 'Error: Trying to combine an array with a non-array (' + prop + ')';
          } else {
            obj[prop] = _.reject(DeepExtend(obj[prop], source[prop]), function (item) { return _.isNull(item);});
          }
        }
        else if (_.isObject(obj[prop]) || _.isObject(source[prop])){
          if (!_.isObject(obj[prop]) || !_.isObject(source[prop])){
            throw 'Error: Trying to combine an object with a non-object (' + prop + ')';
          } else {
            obj[prop] = DeepExtend(obj[prop], source[prop]);
          }
        } else {
          obj[prop] = source[prop];
        }
      }
    }
  });
  return obj;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/namespace.js                                                   //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
FastRender = {
  _routes: [],
  _onAllRoutes: []
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/utils.js                                                       //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
// meteor algorithm to check if this is a meteor serving http request or not
IsAppUrl = function (req) {
  var url = req.url
  if(url === '/favicon.ico' || url === '/robots.txt') {
    return false;
  }

  // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.
  if(url === '/app.manifest') {
    return false;
  }

  // Avoid serving app HTML for declared routes such as /sockjs/.
  if(RoutePolicy.classify(url)) {
    return false;
  }

  // we only need to support HTML pages only
  // this is a check to do it
  return /html/.test(req.headers['accept']);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/routes.js                                                      //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
var Fiber = Npm.require('fibers');
FastRender._onAllRoutes = [];
FastRender.frContext = new Meteor.EnvironmentVariable();

var fastRenderRoutes = Picker.filter(function(req, res) {
  return IsAppUrl(req);
});
fastRenderRoutes.middleware(Npm.require('connect').cookieParser());
fastRenderRoutes.middleware(function(req, res, next) {
  FastRender.handleOnAllRoutes(req, res, next);
});

// handling specific routes
FastRender.route = function route(path, callback) {
  if(path.indexOf('/') !== 0){
    throw new Error('Error: path (' + path + ') must begin with a leading slash "/"')
  }
  fastRenderRoutes.route(path, FastRender.handleRoute.bind(null, callback));
};

function setQueryDataCallback(res, next) {
  return function(queryData) {
    if(!queryData) return next();

    var existingPayload = InjectData.getData(res, "fast-render-data");
    if(!existingPayload) {
      InjectData.pushData(res, "fast-render-data", queryData);
    } else {
      // it's possible to execute this callback twice
      // the we need to merge exisitng data with the new one
      _.extend(existingPayload.subscriptions, queryData.subscriptions);
      _.each(queryData.collectionData, function(data, pubName) {
        var existingData = existingPayload.collectionData[pubName]
        if(existingData) {
          data = existingData.concat(data);
        }

        existingPayload.collectionData[pubName] = data;
        InjectData.pushData(res, 'fast-render-data', existingPayload);
      });
    }
    next();
  };
}

FastRender.handleRoute = function(processingCallback, params, req, res, next) {
  var afterProcessed = setQueryDataCallback(res, next);
  FastRender._processRoutes(params, req, processingCallback, afterProcessed);
};

FastRender.handleOnAllRoutes = function(req, res, next) {
  var afterProcessed = setQueryDataCallback(res, next);
  FastRender._processAllRoutes(req, afterProcessed);
};

FastRender.onAllRoutes = function onAllRoutes(callback) {
  FastRender._onAllRoutes.push(callback);
};

FastRender._processRoutes =
  function _processRoutes(params, req, routeCallback, callback) {
  callback = callback || function() {};

  var path = req.url;
  var loginToken = req.cookies['meteor_login_token'];
  var headers = req.headers;

  var context = new Context(loginToken, { headers: headers });

  try {
    FastRender.frContext.withValue(context, function() {
      routeCallback.call(context, params, path);
    });

    if(context.stop) {
      return;
    }

    callback(context.getData());
  } catch(err) {
    handleError(err, path, callback);
  }
};

FastRender._processAllRoutes =
  function _processAllRoutes(req, callback) {
  callback = callback || function() {};

  var path = req.url;
  var loginToken = req.cookies['meteor_login_token'];
  var headers = req.headers;

  new Fiber(function() {
    var context = new Context(loginToken, { headers: headers });

    try {
      FastRender._onAllRoutes.forEach(function(callback) {
        callback.call(context, req.url);
      });

      callback(context.getData());
    } catch(err) {
      handleError(err, path, callback);
    }
  }).run();
};

function handleError(err, path, callback) {
  var message =
    'error on fast-rendering path: ' +
    path +
    " ; error: " + err.stack;
  console.error(message);
  callback(null);
}

// adding support for null publications
FastRender.onAllRoutes(function() {
  var context = this;
  var nullHandlers = Meteor.default_server.universal_publish_handlers;

  if(nullHandlers) {
    nullHandlers.forEach(function(publishHandler) {
      // universal subs have subscription ID, params, and name undefined
      var publishContext = new PublishContext(context, publishHandler);
      context.processPublication(publishContext);
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/publish_context.js                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
PublishContext = function PublishContext(context, handler, subscriptionId, params, name) {
  var self = this;

  // mock session
  var sessionId = Random.id();
  var session = {
    id: sessionId,
    userId: context.userId,
    // not null
    inQueue: {},
    connectionHandle: {
      id: sessionId,
      close: function() {},
      onClose: function() {},
      clientAddress: "127.0.0.1",
      httpHeaders: context.headers
    },
    added: function (subscriptionHandle, collectionName, strId, fields) {
      // Don't share state with the data passed in by the user.
      var doc = EJSON.clone(fields);
      doc._id = self._idFilter.idParse(strId);
      Meteor._ensure(self._collectionData, collectionName)[strId] = doc;
    },
    changed: function (subscriptionHandle, collectionName, strId, fields) {
      var doc = self._collectionData[collectionName][strId];
      if (!doc) throw new Error("Could not find element with id " + strId + " to change");
      _.each(fields, function (value, key) {
        // Publish API ignores _id if present in fields.
        if (key === "_id")
          return;

        if (value === undefined) {
          delete doc[key];
        }
        else {
          // Don't share state with the data passed in by the user.
          doc[key] = EJSON.clone(value);
        }
      });
    },
    removed: function (subscriptionHandle, collectionName, strId) {
      if (!(self._collectionData[collectionName] && self._collectionData[collectionName][strId]))
        new Error("Removed nonexistent document " + strId);
      delete self._collectionData[collectionName][strId];
    },
    sendReady: function (subscriptionIds) {
      // this is called only for non-universal subscriptions
      if (!self._subscriptionId) throw new Error("Assertion.");

      // make the subscription be marked as ready
      if (!self._isDeactivated()) {
        self._context.completeSubscriptions(self._name, self._params);
      }

      // we just stop it
      self.stop();
    }
  };

  MeteorX.Subscription.call(self, session, handler, subscriptionId, params, name);

  self.unblock = function() {};

  self._context = context;
  self._collectionData = {};
};

PublishContext.prototype = Object.create(MeteorX.Subscription.prototype);
PublishContext.prototype.constructor = PublishContext;

PublishContext.prototype.stop = function() {
  // our stop does not remove all documents (it just calls deactivate)
  // Meteor one removes documents for non-universal subscription
  // we deactivate both for universal and named subscriptions
  // hopefully this is right in our case
  // Meteor does it just for named subscriptions
  this._deactivate();
};

PublishContext.prototype.error = function(error) {
  // TODO: Should we pass the error to the subscription somehow?
  console.warn('error caught on publication: ', this._name, ': ', (error.message || error));
  this.stop();
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/context.js                                                     //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

Context = function Context(loginToken, otherParams) {
  this._collectionData = {};
  this._subscriptions = {};
  this._loginToken = loginToken;

  _.extend(this, otherParams);

  // get the user
  if(Meteor.users) {
    // check to make sure, we've the loginToken,
    // otherwise a random user will fetched from the db
    if(loginToken) {
      var hashedToken = loginToken && Accounts._hashLoginToken( loginToken );
      var query = {'services.resume.loginTokens.hashedToken': hashedToken };
      var options = {fields: {_id: 1}};
      var user = Meteor.users.findOne(query, options);
    }

    // support for Meteor.user
    Fibers.current._meteor_dynamics = [];
    Fibers.current._meteor_dynamics[DDP._CurrentInvocation.slot] = this;

    if(user) {
      this.userId = user._id;
    }
  }
};

Context.prototype.subscribe = function(subName /*, params */) {
  var self = this;

  var publishHandler = Meteor.default_server.publish_handlers[subName];
  if(publishHandler) {
    var params = Array.prototype.slice.call(arguments, 1);
    // non-universal subs have subscription id
    var subscriptionId = Random.id();
    var publishContext = new PublishContext(this, publishHandler, subscriptionId, params, subName);

    return this.processPublication(publishContext);
  } else {
    console.warn('There is no such publish handler named:', subName);
    return {};
  }
};

Context.prototype.processPublication = function(publishContext) {
  var self = this;
  var data = {};
  var ensureCollection = function(collectionName) {
    self._ensureCollection(collectionName);
    if(!data[collectionName]) {
      data[collectionName] = [];
    }
  };

  var future = new Future();
  // detect when the context is ready to be sent to the client
  publishContext.onStop(function() {
    if(!future.isResolved()) {
      future.return();
    }
  });

  publishContext._runHandler();

  if (!publishContext._subscriptionId) {
    // universal subscription, we stop it (same as marking it as ready) ourselves
    // they otherwise do not have ready or stopped state, but in our case they do
    publishContext.stop();
  }

  if (!future.isResolved()) {
    // don't wait forever for handler to fire ready()
    Meteor.setTimeout(function() {
      if (!future.isResolved()) {
        // publish handler failed to send ready signal in time
        // maybe your non-universal publish handler is not calling this.ready()?
        // or maybe it is returning null to signal empty publish?
        // it should still call this.ready() or return an empty array []
        var message =
          'Publish handler for ' + publishContext._name +  ' sent no ready signal\n' +
          ' This could be because this publication `return null`.\n' +
          ' Use `return this.ready()` instead.'
        console.warn();
        future.return();
      }
    }, 500);  // arbitrarially set timeout to 500ms, should probably be configurable

    //  wait for the subscription became ready.
    future.wait();
  }

  // stop any runaway subscription
  // this can happen if a publish handler never calls ready or stop, for example
  // it does not hurt to call it multiple times
  publishContext.stop();

  // get the data
  _.each(publishContext._collectionData, function(collData, collectionName) {
    // making an array from a map
    collData = _.values(collData);

    ensureCollection(collectionName);
    data[collectionName].push(collData);

    // copy the collection data in publish context into the FR context
    self._collectionData[collectionName].push(collData);
  });

  return data;
};

Context.prototype.completeSubscriptions = function(name, params) {
  var subs = this._subscriptions[name];
  if(!subs) {
    subs = this._subscriptions[name] = {};
  }

  subs[EJSON.stringify(params)] = true;
};

Context.prototype._ensureCollection = function(collectionName) {
  if(!this._collectionData[collectionName]) {
    this._collectionData[collectionName] = [];
  }
};

Context.prototype.getData = function() {
  return {
    collectionData: this._collectionData,
    subscriptions: this._subscriptions,
    loginToken: this._loginToken
  };
};

FastRender._Context = Context;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/staringatlights_fast-render/lib/server/iron_router_support.js                                         //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
if(!Package['iron:router']) return;

var RouteController = Package['iron:router'].RouteController;
var Router = Package['iron:router'].Router;

var currentSubscriptions = [];
Meteor.subscribe = function(subscription) {
  currentSubscriptions.push(arguments);
};

//assuming, no runtime routes will be added
Meteor.startup(function() {
  // this is trick to run the processRoutes at the 
  // end of all Meteor.startup callbacks
  Meteor.startup(processRoutes);
});

function processRoutes() {
  Router.routes.forEach(function(route) {
    route.options = route.options || {};
    if(route.options.fastRender) {
      handleRoute(route);
    } else if(
        getController(route) && 
        getController(route).prototype && 
        getController(route).prototype.fastRender
    ) {
      handleRoute(route);
    }
  });

  // getting global waitOns
  var globalWaitOns = [], globalSubscriptions = [];
  if(Router._globalHooks && Router._globalHooks.waitOn && Router._globalHooks.waitOn.length > 0) {
    Router._globalHooks.waitOn.forEach(function(waitOn) {
      globalWaitOns.push(waitOn.hook);
    });
  }
  if(Router._globalHooks && Router._globalHooks.subscriptions && Router._globalHooks.subscriptions.length > 0) {
    Router._globalHooks.subscriptions.forEach(function(subcription) {
      globalSubscriptions.push(subcription.hook);
    });
  }
  
  FastRender.onAllRoutes(function(path) {
    var self = this;
    
    currentSubscriptions = [];
    globalWaitOns.forEach(function(waitOn) {
      waitOn.call({path: path});
    });
    globalSubscriptions.forEach(function(subscription) {
      subscription.call({path: path});
    });
    
    currentSubscriptions.forEach(function(args) {
      self.subscribe.apply(self, args);
    });
  });
};

function handleRoute(route) {
  var subscriptionFunctions = [];
  
  // get potential subscription handlers from the route options
  ['waitOn', 'subscriptions'].forEach(function(funcName) {
    var handler = route.options[funcName];
    if(typeof handler == 'function') {
      subscriptionFunctions.push(handler);
    } else if (handler instanceof Array) {
      handler.forEach(function(func) {
        if(typeof func == 'function') {
          subscriptionFunctions.push(func);
        }
      });
    }
  });

  FastRender.route(getPath(route), onRoute);

  function onRoute(params, path) {
    var self = this;
    var context = {
      params: params,
      path: path
    };

    //reset subscriptions;
    currentSubscriptions = [];
    subscriptionFunctions.forEach(function(func) {
      func.call(context);
    });

    // if there is a controller, try to initiate it and invoke potential 
    // methods which could give us subscriptions
    var controller = getController(route);
    if(controller && controller.prototype) {
      if(typeof controller.prototype.lookupOption == 'function') {
        // for IR 1.0
        // it is possible to create a controller invoke methods on it
        var controllerInstance = new controller();
        controllerInstance.params = params;
        controllerInstance.path = path;

        ['waitOn', 'subscriptions'].forEach(function(funcName) {
          if(controllerInstance[funcName]) {
            controllerInstance[funcName].call(controllerInstance);
          }
        });
      } else {
        // IR 0.9
        // hard to create a controller instance
        // so this is the option we can take
        var waitOn = controller.prototype.waitOn;
        if(waitOn) {
          waitOn.call(context);
        }
      }
    }

    currentSubscriptions.forEach(function(args) {
      self.subscribe.apply(self, args);
    });
  }
}

function getPath(route) {
  if(route._path) {
    // for IR 1.0
    return route._path;
  } else {
    // for IR 0.9
    var name = (route.name == "/")? "" : name;
    return route.options.path || ("/" + name);
  }
}

function getController(route) {
  if(route.findControllerConstructor) {
    // for IR 1.0
    return route.findControllerConstructor();
  } else if(route.findController) {
    // for IR 0.9
    return route.findController();
  } else {
    // unsupported version of IR
    return null;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['staringatlights:fast-render'] = {}, {
  FastRender: FastRender
});

})();
