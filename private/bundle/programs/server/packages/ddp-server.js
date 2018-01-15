(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var Retry = Package.retry.Retry;
var MongoID = Package['mongo-id'].MongoID;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DDP = Package['ddp-client'].DDP;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Hook = Package['callback-hook'].Hook;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var StreamServer, DDPServer, Server;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-server":{"stream_server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/stream_server.js                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var url = Npm.require('url'); // By default, we use the permessage-deflate extension with default
// configuration. If $SERVER_WEBSOCKET_COMPRESSION is set, then it must be valid
// JSON. If it represents a falsey value, then we do not use permessage-deflate
// at all; otherwise, the JSON value is used as an argument to deflate's
// configure method; see
// https://github.com/faye/permessage-deflate-node/blob/master/README.md
//
// (We do this in an _.once instead of at startup, because we don't want to
// crash the tool during isopacket load if your JSON doesn't parse. This is only
// a problem because the tool has to load the DDP server code just in order to
// be a DDP client; see https://github.com/meteor/meteor/issues/3452 .)


var websocketExtensions = _.once(function () {
  var extensions = [];
  var websocketCompressionConfig = process.env.SERVER_WEBSOCKET_COMPRESSION ? JSON.parse(process.env.SERVER_WEBSOCKET_COMPRESSION) : {};

  if (websocketCompressionConfig) {
    extensions.push(Npm.require('permessage-deflate').configure(websocketCompressionConfig));
  }

  return extensions;
});

var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "";

StreamServer = function () {
  var self = this;
  self.registration_callbacks = [];
  self.open_sockets = []; // Because we are installing directly onto WebApp.httpServer instead of using
  // WebApp.app, we have to process the path prefix ourselves.

  self.prefix = pathPrefix + '/sockjs';
  RoutePolicy.declare(self.prefix + '/', 'network'); // set up sockjs

  var sockjs = Npm.require('sockjs');

  var serverOptions = {
    prefix: self.prefix,
    log: function () {},
    // this is the default, but we code it explicitly because we depend
    // on it in stream_client:HEARTBEAT_TIMEOUT
    heartbeat_delay: 45000,
    // The default disconnect_delay is 5 seconds, but if the server ends up CPU
    // bound for that much time, SockJS might not notice that the user has
    // reconnected because the timer (of disconnect_delay ms) can fire before
    // SockJS processes the new connection. Eventually we'll fix this by not
    // combining CPU-heavy processing with SockJS termination (eg a proxy which
    // converts to Unix sockets) but for now, raise the delay.
    disconnect_delay: 60 * 1000,
    // Set the USE_JSESSIONID environment variable to enable setting the
    // JSESSIONID cookie. This is useful for setting up proxies with
    // session affinity.
    jsessionid: !!process.env.USE_JSESSIONID
  }; // If you know your server environment (eg, proxies) will prevent websockets
  // from ever working, set $DISABLE_WEBSOCKETS and SockJS clients (ie,
  // browsers) will not waste time attempting to use them.
  // (Your server will still have a /websocket endpoint.)

  if (process.env.DISABLE_WEBSOCKETS) {
    serverOptions.websocket = false;
  } else {
    serverOptions.faye_server_options = {
      extensions: websocketExtensions()
    };
  }

  self.server = sockjs.createServer(serverOptions); // Install the sockjs handlers, but we want to keep around our own particular
  // request handler that adjusts idle timeouts while we have an outstanding
  // request.  This compensates for the fact that sockjs removes all listeners
  // for "request" to add its own.

  WebApp.httpServer.removeListener('request', WebApp._timeoutAdjustmentRequestCallback);
  self.server.installHandlers(WebApp.httpServer);
  WebApp.httpServer.addListener('request', WebApp._timeoutAdjustmentRequestCallback); // Support the /websocket endpoint

  self._redirectWebsocketEndpoint();

  self.server.on('connection', function (socket) {
    // We want to make sure that if a client connects to us and does the initial
    // Websocket handshake but never gets to the DDP handshake, that we
    // eventually kill the socket.  Once the DDP handshake happens, DDP
    // heartbeating will work. And before the Websocket handshake, the timeouts
    // we set at the server level in webapp_server.js will work. But
    // faye-websocket calls setTimeout(0) on any socket it takes over, so there
    // is an "in between" state where this doesn't happen.  We work around this
    // by explicitly setting the socket timeout to a relatively large time here,
    // and setting it back to zero when we set up the heartbeat in
    // livedata_server.js.
    socket.setWebsocketTimeout = function (timeout) {
      if ((socket.protocol === 'websocket' || socket.protocol === 'websocket-raw') && socket._session.recv) {
        socket._session.recv.connection.setTimeout(timeout);
      }
    };

    socket.setWebsocketTimeout(45 * 1000);

    socket.send = function (data) {
      socket.write(data);
    };

    socket.on('close', function () {
      self.open_sockets = _.without(self.open_sockets, socket);
    });
    self.open_sockets.push(socket); // XXX COMPAT WITH 0.6.6. Send the old style welcome message, which
    // will force old clients to reload. Remove this once we're not
    // concerned about people upgrading from a pre-0.7.0 release. Also,
    // remove the clause in the client that ignores the welcome message
    // (livedata_connection.js)

    socket.send(JSON.stringify({
      server_id: "0"
    })); // call all our callbacks when we get a new socket. they will do the
    // work of setting up handlers and such for specific messages.

    _.each(self.registration_callbacks, function (callback) {
      callback(socket);
    });
  });
};

_.extend(StreamServer.prototype, {
  // call my callback when a new socket connects.
  // also call it for all current connections.
  register: function (callback) {
    var self = this;
    self.registration_callbacks.push(callback);

    _.each(self.all_sockets(), function (socket) {
      callback(socket);
    });
  },
  // get a list of all sockets
  all_sockets: function () {
    var self = this;
    return _.values(self.open_sockets);
  },
  // Redirect /websocket to /sockjs/websocket in order to not expose
  // sockjs to clients that want to use raw websockets
  _redirectWebsocketEndpoint: function () {
    var self = this; // Unfortunately we can't use a connect middleware here since
    // sockjs installs itself prior to all existing listeners
    // (meaning prior to any connect middlewares) so we need to take
    // an approach similar to overshadowListeners in
    // https://github.com/sockjs/sockjs-node/blob/cf820c55af6a9953e16558555a31decea554f70e/src/utils.coffee

    _.each(['request', 'upgrade'], function (event) {
      var httpServer = WebApp.httpServer;
      var oldHttpServerListeners = httpServer.listeners(event).slice(0);
      httpServer.removeAllListeners(event); // request and upgrade have different arguments passed but
      // we only care about the first one which is always request

      var newListener = function (request /*, moreArguments */) {
        // Store arguments for use within the closure below
        var args = arguments; // Rewrite /websocket and /websocket/ urls to /sockjs/websocket while
        // preserving query string.

        var parsedUrl = url.parse(request.url);

        if (parsedUrl.pathname === pathPrefix + '/websocket' || parsedUrl.pathname === pathPrefix + '/websocket/') {
          parsedUrl.pathname = self.prefix + '/websocket';
          request.url = url.format(parsedUrl);
        }

        _.each(oldHttpServerListeners, function (oldListener) {
          oldListener.apply(httpServer, args);
        });
      };

      httpServer.addListener(event, newListener);
    });
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/livedata_server.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
DDPServer = {};

var Fiber = Npm.require('fibers'); // This file contains classes:
// * Session - The server's connection to a single DDP client
// * Subscription - A single subscription for a single client
// * Server - An entire server that may talk to > 1 client. A DDP endpoint.
//
// Session and Subscription are file scope. For now, until we freeze
// the interface, Server is package scope (in the future it should be
// exported.)
// Represents a single document in a SessionCollectionView


var SessionDocumentView = function () {
  var self = this;
  self.existsIn = {}; // set of subscriptionHandle

  self.dataByKey = {}; // key-> [ {subscriptionHandle, value} by precedence]
};

DDPServer._SessionDocumentView = SessionDocumentView;

_.extend(SessionDocumentView.prototype, {
  getFields: function () {
    var self = this;
    var ret = {};

    _.each(self.dataByKey, function (precedenceList, key) {
      ret[key] = precedenceList[0].value;
    });

    return ret;
  },
  clearField: function (subscriptionHandle, key, changeCollector) {
    var self = this; // Publish API ignores _id if present in fields

    if (key === "_id") return;
    var precedenceList = self.dataByKey[key]; // It's okay to clear fields that didn't exist. No need to throw
    // an error.

    if (!precedenceList) return;
    var removedValue = undefined;

    for (var i = 0; i < precedenceList.length; i++) {
      var precedence = precedenceList[i];

      if (precedence.subscriptionHandle === subscriptionHandle) {
        // The view's value can only change if this subscription is the one that
        // used to have precedence.
        if (i === 0) removedValue = precedence.value;
        precedenceList.splice(i, 1);
        break;
      }
    }

    if (_.isEmpty(precedenceList)) {
      delete self.dataByKey[key];
      changeCollector[key] = undefined;
    } else if (removedValue !== undefined && !EJSON.equals(removedValue, precedenceList[0].value)) {
      changeCollector[key] = precedenceList[0].value;
    }
  },
  changeField: function (subscriptionHandle, key, value, changeCollector, isAdd) {
    var self = this; // Publish API ignores _id if present in fields

    if (key === "_id") return; // Don't share state with the data passed in by the user.

    value = EJSON.clone(value);

    if (!_.has(self.dataByKey, key)) {
      self.dataByKey[key] = [{
        subscriptionHandle: subscriptionHandle,
        value: value
      }];
      changeCollector[key] = value;
      return;
    }

    var precedenceList = self.dataByKey[key];
    var elt;

    if (!isAdd) {
      elt = _.find(precedenceList, function (precedence) {
        return precedence.subscriptionHandle === subscriptionHandle;
      });
    }

    if (elt) {
      if (elt === precedenceList[0] && !EJSON.equals(value, elt.value)) {
        // this subscription is changing the value of this field.
        changeCollector[key] = value;
      }

      elt.value = value;
    } else {
      // this subscription is newly caring about this field
      precedenceList.push({
        subscriptionHandle: subscriptionHandle,
        value: value
      });
    }
  }
}); /**
     * Represents a client's view of a single collection
     * @param {String} collectionName Name of the collection it represents
     * @param {Object.<String, Function>} sessionCallbacks The callbacks for added, changed, removed
     * @class SessionCollectionView
     */

var SessionCollectionView = function (collectionName, sessionCallbacks) {
  var self = this;
  self.collectionName = collectionName;
  self.documents = {};
  self.callbacks = sessionCallbacks;
};

DDPServer._SessionCollectionView = SessionCollectionView;

_.extend(SessionCollectionView.prototype, {
  isEmpty: function () {
    var self = this;
    return _.isEmpty(self.documents);
  },
  diff: function (previous) {
    var self = this;
    DiffSequence.diffObjects(previous.documents, self.documents, {
      both: _.bind(self.diffDocument, self),
      rightOnly: function (id, nowDV) {
        self.callbacks.added(self.collectionName, id, nowDV.getFields());
      },
      leftOnly: function (id, prevDV) {
        self.callbacks.removed(self.collectionName, id);
      }
    });
  },
  diffDocument: function (id, prevDV, nowDV) {
    var self = this;
    var fields = {};
    DiffSequence.diffObjects(prevDV.getFields(), nowDV.getFields(), {
      both: function (key, prev, now) {
        if (!EJSON.equals(prev, now)) fields[key] = now;
      },
      rightOnly: function (key, now) {
        fields[key] = now;
      },
      leftOnly: function (key, prev) {
        fields[key] = undefined;
      }
    });
    self.callbacks.changed(self.collectionName, id, fields);
  },
  added: function (subscriptionHandle, id, fields) {
    var self = this;
    var docView = self.documents[id];
    var added = false;

    if (!docView) {
      added = true;
      docView = new SessionDocumentView();
      self.documents[id] = docView;
    }

    docView.existsIn[subscriptionHandle] = true;
    var changeCollector = {};

    _.each(fields, function (value, key) {
      docView.changeField(subscriptionHandle, key, value, changeCollector, true);
    });

    if (added) self.callbacks.added(self.collectionName, id, changeCollector);else self.callbacks.changed(self.collectionName, id, changeCollector);
  },
  changed: function (subscriptionHandle, id, changed) {
    var self = this;
    var changedResult = {};
    var docView = self.documents[id];
    if (!docView) throw new Error("Could not find element with id " + id + " to change");

    _.each(changed, function (value, key) {
      if (value === undefined) docView.clearField(subscriptionHandle, key, changedResult);else docView.changeField(subscriptionHandle, key, value, changedResult);
    });

    self.callbacks.changed(self.collectionName, id, changedResult);
  },
  removed: function (subscriptionHandle, id) {
    var self = this;
    var docView = self.documents[id];

    if (!docView) {
      var err = new Error("Removed nonexistent document " + id);
      throw err;
    }

    delete docView.existsIn[subscriptionHandle];

    if (_.isEmpty(docView.existsIn)) {
      // it is gone from everyone
      self.callbacks.removed(self.collectionName, id);
      delete self.documents[id];
    } else {
      var changed = {}; // remove this subscription from every precedence list
      // and record the changes

      _.each(docView.dataByKey, function (precedenceList, key) {
        docView.clearField(subscriptionHandle, key, changed);
      });

      self.callbacks.changed(self.collectionName, id, changed);
    }
  }
}); /******************************************************************************/ /* Session                                                                    */ /******************************************************************************/

var Session = function (server, version, socket, options) {
  var self = this;
  self.id = Random.id();
  self.server = server;
  self.version = version;
  self.initialized = false;
  self.socket = socket; // set to null when the session is destroyed. multiple places below
  // use this to determine if the session is alive or not.

  self.inQueue = new Meteor._DoubleEndedQueue();
  self.blocked = false;
  self.workerRunning = false; // Sub objects for active subscriptions

  self._namedSubs = {};
  self._universalSubs = [];
  self.userId = null;
  self.collectionViews = {}; // Set this to false to not send messages when collectionViews are
  // modified. This is done when rerunning subs in _setUserId and those messages
  // are calculated via a diff instead.

  self._isSending = true; // If this is true, don't start a newly-created universal publisher on this
  // session. The session will take care of starting it when appropriate.

  self._dontStartNewUniversalSubs = false; // when we are rerunning subscriptions, any ready messages
  // we want to buffer up for when we are done rerunning subscriptions

  self._pendingReady = []; // List of callbacks to call when this connection is closed.

  self._closeCallbacks = []; // XXX HACK: If a sockjs connection, save off the URL. This is
  // temporary and will go away in the near future.

  self._socketUrl = socket.url; // Allow tests to disable responding to pings.

  self._respondToPings = options.respondToPings; // This object is the public interface to the session. In the public
  // API, it is called the `connection` object.  Internally we call it
  // a `connectionHandle` to avoid ambiguity.

  self.connectionHandle = {
    id: self.id,
    close: function () {
      self.close();
    },
    onClose: function (fn) {
      var cb = Meteor.bindEnvironment(fn, "connection onClose callback");

      if (self.inQueue) {
        self._closeCallbacks.push(cb);
      } else {
        // if we're already closed, call the callback.
        Meteor.defer(cb);
      }
    },
    clientAddress: self._clientAddress(),
    httpHeaders: self.socket.headers
  };
  self.send({
    msg: 'connected',
    session: self.id
  }); // On initial connect, spin up all the universal publishers.

  Fiber(function () {
    self.startUniversalSubs();
  }).run();

  if (version !== 'pre1' && options.heartbeatInterval !== 0) {
    // We no longer need the low level timeout because we have heartbeating.
    socket.setWebsocketTimeout(0);
    self.heartbeat = new DDPCommon.Heartbeat({
      heartbeatInterval: options.heartbeatInterval,
      heartbeatTimeout: options.heartbeatTimeout,
      onTimeout: function () {
        self.close();
      },
      sendPing: function () {
        self.send({
          msg: 'ping'
        });
      }
    });
    self.heartbeat.start();
  }

  Package.facts && Package.facts.Facts.incrementServerFact("livedata", "sessions", 1);
};

_.extend(Session.prototype, {
  sendReady: function (subscriptionIds) {
    var self = this;
    if (self._isSending) self.send({
      msg: "ready",
      subs: subscriptionIds
    });else {
      _.each(subscriptionIds, function (subscriptionId) {
        self._pendingReady.push(subscriptionId);
      });
    }
  },
  sendAdded: function (collectionName, id, fields) {
    var self = this;
    if (self._isSending) self.send({
      msg: "added",
      collection: collectionName,
      id: id,
      fields: fields
    });
  },
  sendChanged: function (collectionName, id, fields) {
    var self = this;
    if (_.isEmpty(fields)) return;

    if (self._isSending) {
      self.send({
        msg: "changed",
        collection: collectionName,
        id: id,
        fields: fields
      });
    }
  },
  sendRemoved: function (collectionName, id) {
    var self = this;
    if (self._isSending) self.send({
      msg: "removed",
      collection: collectionName,
      id: id
    });
  },
  getSendCallbacks: function () {
    var self = this;
    return {
      added: _.bind(self.sendAdded, self),
      changed: _.bind(self.sendChanged, self),
      removed: _.bind(self.sendRemoved, self)
    };
  },
  getCollectionView: function (collectionName) {
    var self = this;

    if (_.has(self.collectionViews, collectionName)) {
      return self.collectionViews[collectionName];
    }

    var ret = new SessionCollectionView(collectionName, self.getSendCallbacks());
    self.collectionViews[collectionName] = ret;
    return ret;
  },
  added: function (subscriptionHandle, collectionName, id, fields) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.added(subscriptionHandle, id, fields);
  },
  removed: function (subscriptionHandle, collectionName, id) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.removed(subscriptionHandle, id);

    if (view.isEmpty()) {
      delete self.collectionViews[collectionName];
    }
  },
  changed: function (subscriptionHandle, collectionName, id, fields) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.changed(subscriptionHandle, id, fields);
  },
  startUniversalSubs: function () {
    var self = this; // Make a shallow copy of the set of universal handlers and start them. If
    // additional universal publishers start while we're running them (due to
    // yielding), they will run separately as part of Server.publish.

    var handlers = _.clone(self.server.universal_publish_handlers);

    _.each(handlers, function (handler) {
      self._startSubscription(handler);
    });
  },
  // Destroy this session and unregister it at the server.
  close: function () {
    var self = this; // Destroy this session, even if it's not registered at the
    // server. Stop all processing and tear everything down. If a socket
    // was attached, close it.
    // Already destroyed.

    if (!self.inQueue) return; // Drop the merge box data immediately.

    self.inQueue = null;
    self.collectionViews = {};

    if (self.heartbeat) {
      self.heartbeat.stop();
      self.heartbeat = null;
    }

    if (self.socket) {
      self.socket.close();
      self.socket._meteorSession = null;
    }

    Package.facts && Package.facts.Facts.incrementServerFact("livedata", "sessions", -1);
    Meteor.defer(function () {
      // stop callbacks can yield, so we defer this on close.
      // sub._isDeactivated() detects that we set inQueue to null and
      // treats it as semi-deactivated (it will ignore incoming callbacks, etc).
      self._deactivateAllSubscriptions(); // Defer calling the close callbacks, so that the caller closing
      // the session isn't waiting for all the callbacks to complete.


      _.each(self._closeCallbacks, function (callback) {
        callback();
      });
    }); // Unregister the session.

    self.server._removeSession(self);
  },
  // Send a message (doing nothing if no socket is connected right now.)
  // It should be a JSON object (it will be stringified.)
  send: function (msg) {
    var self = this;

    if (self.socket) {
      if (Meteor._printSentDDP) Meteor._debug("Sent DDP", DDPCommon.stringifyDDP(msg));
      self.socket.send(DDPCommon.stringifyDDP(msg));
    }
  },
  // Send a connection error.
  sendError: function (reason, offendingMessage) {
    var self = this;
    var msg = {
      msg: 'error',
      reason: reason
    };
    if (offendingMessage) msg.offendingMessage = offendingMessage;
    self.send(msg);
  },
  // Process 'msg' as an incoming message. (But as a guard against
  // race conditions during reconnection, ignore the message if
  // 'socket' is not the currently connected socket.)
  //
  // We run the messages from the client one at a time, in the order
  // given by the client. The message handler is passed an idempotent
  // function 'unblock' which it may call to allow other messages to
  // begin running in parallel in another fiber (for example, a method
  // that wants to yield.) Otherwise, it is automatically unblocked
  // when it returns.
  //
  // Actually, we don't have to 'totally order' the messages in this
  // way, but it's the easiest thing that's correct. (unsub needs to
  // be ordered against sub, methods need to be ordered against each
  // other.)
  processMessage: function (msg_in) {
    var self = this;
    if (!self.inQueue) // we have been destroyed.
      return; // Respond to ping and pong messages immediately without queuing.
    // If the negotiated DDP version is "pre1" which didn't support
    // pings, preserve the "pre1" behavior of responding with a "bad
    // request" for the unknown messages.
    //
    // Fibers are needed because heartbeat uses Meteor.setTimeout, which
    // needs a Fiber. We could actually use regular setTimeout and avoid
    // these new fibers, but it is easier to just make everything use
    // Meteor.setTimeout and not think too hard.
    //
    // Any message counts as receiving a pong, as it demonstrates that
    // the client is still alive.

    if (self.heartbeat) {
      Fiber(function () {
        self.heartbeat.messageReceived();
      }).run();
    }

    if (self.version !== 'pre1' && msg_in.msg === 'ping') {
      if (self._respondToPings) self.send({
        msg: "pong",
        id: msg_in.id
      });
      return;
    }

    if (self.version !== 'pre1' && msg_in.msg === 'pong') {
      // Since everything is a pong, nothing to do
      return;
    }

    self.inQueue.push(msg_in);
    if (self.workerRunning) return;
    self.workerRunning = true;

    var processNext = function () {
      var msg = self.inQueue && self.inQueue.shift();

      if (!msg) {
        self.workerRunning = false;
        return;
      }

      Fiber(function () {
        var blocked = true;

        var unblock = function () {
          if (!blocked) return; // idempotent

          blocked = false;
          processNext();
        };

        self.server.onMessageHook.each(function (callback) {
          callback(msg, self);
          return true;
        });
        if (_.has(self.protocol_handlers, msg.msg)) self.protocol_handlers[msg.msg].call(self, msg, unblock);else self.sendError('Bad request', msg);
        unblock(); // in case the handler didn't already do it
      }).run();
    };

    processNext();
  },
  protocol_handlers: {
    sub: function (msg) {
      var self = this; // reject malformed messages

      if (typeof msg.id !== "string" || typeof msg.name !== "string" || 'params' in msg && !(msg.params instanceof Array)) {
        self.sendError("Malformed subscription", msg);
        return;
      }

      if (!self.server.publish_handlers[msg.name]) {
        self.send({
          msg: 'nosub',
          id: msg.id,
          error: new Meteor.Error(404, `Subscription '${msg.name}' not found`)
        });
        return;
      }

      if (_.has(self._namedSubs, msg.id)) // subs are idempotent, or rather, they are ignored if a sub
        // with that id already exists. this is important during
        // reconnect.
        return; // XXX It'd be much better if we had generic hooks where any package can
      // hook into subscription handling, but in the mean while we special case
      // ddp-rate-limiter package. This is also done for weak requirements to
      // add the ddp-rate-limiter package in case we don't have Accounts. A
      // user trying to use the ddp-rate-limiter must explicitly require it.

      if (Package['ddp-rate-limiter']) {
        var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
        var rateLimiterInput = {
          userId: self.userId,
          clientAddress: self.connectionHandle.clientAddress,
          type: "subscription",
          name: msg.name,
          connectionId: self.id
        };

        DDPRateLimiter._increment(rateLimiterInput);

        var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);

        if (!rateLimitResult.allowed) {
          self.send({
            msg: 'nosub',
            id: msg.id,
            error: new Meteor.Error('too-many-requests', DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            })
          });
          return;
        }
      }

      var handler = self.server.publish_handlers[msg.name];

      self._startSubscription(handler, msg.id, msg.params, msg.name);
    },
    unsub: function (msg) {
      var self = this;

      self._stopSubscription(msg.id);
    },
    method: function (msg, unblock) {
      var self = this; // reject malformed messages
      // For now, we silently ignore unknown attributes,
      // for forwards compatibility.

      if (typeof msg.id !== "string" || typeof msg.method !== "string" || 'params' in msg && !(msg.params instanceof Array) || 'randomSeed' in msg && typeof msg.randomSeed !== "string") {
        self.sendError("Malformed method invocation", msg);
        return;
      }

      var randomSeed = msg.randomSeed || null; // set up to mark the method as satisfied once all observers
      // (and subscriptions) have reacted to any writes that were
      // done.

      var fence = new DDPServer._WriteFence();
      fence.onAllCommitted(function () {
        // Retire the fence so that future writes are allowed.
        // This means that callbacks like timers are free to use
        // the fence, and if they fire before it's armed (for
        // example, because the method waits for them) their
        // writes will be included in the fence.
        fence.retire();
        self.send({
          msg: 'updated',
          methods: [msg.id]
        });
      }); // find the handler

      var handler = self.server.method_handlers[msg.method];

      if (!handler) {
        self.send({
          msg: 'result',
          id: msg.id,
          error: new Meteor.Error(404, `Method '${msg.method}' not found`)
        });
        fence.arm();
        return;
      }

      var setUserId = function (userId) {
        self._setUserId(userId);
      };

      var invocation = new DDPCommon.MethodInvocation({
        isSimulation: false,
        userId: self.userId,
        setUserId: setUserId,
        unblock: unblock,
        connection: self.connectionHandle,
        randomSeed: randomSeed
      });
      const promise = new Promise((resolve, reject) => {
        // XXX It'd be better if we could hook into method handlers better but
        // for now, we need to check if the ddp-rate-limiter exists since we
        // have a weak requirement for the ddp-rate-limiter package to be added
        // to our application.
        if (Package['ddp-rate-limiter']) {
          var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
          var rateLimiterInput = {
            userId: self.userId,
            clientAddress: self.connectionHandle.clientAddress,
            type: "method",
            name: msg.method,
            connectionId: self.id
          };

          DDPRateLimiter._increment(rateLimiterInput);

          var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);

          if (!rateLimitResult.allowed) {
            reject(new Meteor.Error("too-many-requests", DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            }));
            return;
          }
        }

        resolve(DDPServer._CurrentWriteFence.withValue(fence, () => DDP._CurrentMethodInvocation.withValue(invocation, () => maybeAuditArgumentChecks(handler, invocation, msg.params, "call to '" + msg.method + "'"))));
      });

      function finish() {
        fence.arm();
        unblock();
      }

      const payload = {
        msg: "result",
        id: msg.id
      };
      promise.then(result => {
        finish();

        if (result !== undefined) {
          payload.result = result;
        }

        self.send(payload);
      }, exception => {
        finish();
        payload.error = wrapInternalException(exception, `while invoking method '${msg.method}'`);
        self.send(payload);
      });
    }
  },
  _eachSub: function (f) {
    var self = this;

    _.each(self._namedSubs, f);

    _.each(self._universalSubs, f);
  },
  _diffCollectionViews: function (beforeCVs) {
    var self = this;
    DiffSequence.diffObjects(beforeCVs, self.collectionViews, {
      both: function (collectionName, leftValue, rightValue) {
        rightValue.diff(leftValue);
      },
      rightOnly: function (collectionName, rightValue) {
        _.each(rightValue.documents, function (docView, id) {
          self.sendAdded(collectionName, id, docView.getFields());
        });
      },
      leftOnly: function (collectionName, leftValue) {
        _.each(leftValue.documents, function (doc, id) {
          self.sendRemoved(collectionName, id);
        });
      }
    });
  },
  // Sets the current user id in all appropriate contexts and reruns
  // all subscriptions
  _setUserId: function (userId) {
    var self = this;
    if (userId !== null && typeof userId !== "string") throw new Error("setUserId must be called on string or null, not " + typeof userId); // Prevent newly-created universal subscriptions from being added to our
    // session; they will be found below when we call startUniversalSubs.
    //
    // (We don't have to worry about named subscriptions, because we only add
    // them when we process a 'sub' message. We are currently processing a
    // 'method' message, and the method did not unblock, because it is illegal
    // to call setUserId after unblock. Thus we cannot be concurrently adding a
    // new named subscription.)

    self._dontStartNewUniversalSubs = true; // Prevent current subs from updating our collectionViews and call their
    // stop callbacks. This may yield.

    self._eachSub(function (sub) {
      sub._deactivate();
    }); // All subs should now be deactivated. Stop sending messages to the client,
    // save the state of the published collections, reset to an empty view, and
    // update the userId.


    self._isSending = false;
    var beforeCVs = self.collectionViews;
    self.collectionViews = {};
    self.userId = userId; // _setUserId is normally called from a Meteor method with
    // DDP._CurrentMethodInvocation set. But DDP._CurrentMethodInvocation is not
    // expected to be set inside a publish function, so we temporary unset it.
    // Inside a publish function DDP._CurrentPublicationInvocation is set.

    DDP._CurrentMethodInvocation.withValue(undefined, function () {
      // Save the old named subs, and reset to having no subscriptions.
      var oldNamedSubs = self._namedSubs;
      self._namedSubs = {};
      self._universalSubs = [];

      _.each(oldNamedSubs, function (sub, subscriptionId) {
        self._namedSubs[subscriptionId] = sub._recreate(); // nb: if the handler throws or calls this.error(), it will in fact
        // immediately send its 'nosub'. This is OK, though.

        self._namedSubs[subscriptionId]._runHandler();
      }); // Allow newly-created universal subs to be started on our connection in
      // parallel with the ones we're spinning up here, and spin up universal
      // subs.


      self._dontStartNewUniversalSubs = false;
      self.startUniversalSubs();
    }); // Start sending messages again, beginning with the diff from the previous
    // state of the world to the current state. No yields are allowed during
    // this diff, so that other changes cannot interleave.


    Meteor._noYieldsAllowed(function () {
      self._isSending = true;

      self._diffCollectionViews(beforeCVs);

      if (!_.isEmpty(self._pendingReady)) {
        self.sendReady(self._pendingReady);
        self._pendingReady = [];
      }
    });
  },
  _startSubscription: function (handler, subId, params, name) {
    var self = this;
    var sub = new Subscription(self, handler, subId, params, name);
    if (subId) self._namedSubs[subId] = sub;else self._universalSubs.push(sub);

    sub._runHandler();
  },
  // tear down specified subscription
  _stopSubscription: function (subId, error) {
    var self = this;
    var subName = null;

    if (subId && self._namedSubs[subId]) {
      subName = self._namedSubs[subId]._name;

      self._namedSubs[subId]._removeAllDocuments();

      self._namedSubs[subId]._deactivate();

      delete self._namedSubs[subId];
    }

    var response = {
      msg: 'nosub',
      id: subId
    };

    if (error) {
      response.error = wrapInternalException(error, subName ? "from sub " + subName + " id " + subId : "from sub id " + subId);
    }

    self.send(response);
  },
  // tear down all subscriptions. Note that this does NOT send removed or nosub
  // messages, since we assume the client is gone.
  _deactivateAllSubscriptions: function () {
    var self = this;

    _.each(self._namedSubs, function (sub, id) {
      sub._deactivate();
    });

    self._namedSubs = {};

    _.each(self._universalSubs, function (sub) {
      sub._deactivate();
    });

    self._universalSubs = [];
  },
  // Determine the remote client's IP address, based on the
  // HTTP_FORWARDED_COUNT environment variable representing how many
  // proxies the server is behind.
  _clientAddress: function () {
    var self = this; // For the reported client address for a connection to be correct,
    // the developer must set the HTTP_FORWARDED_COUNT environment
    // variable to an integer representing the number of hops they
    // expect in the `x-forwarded-for` header. E.g., set to "1" if the
    // server is behind one proxy.
    //
    // This could be computed once at startup instead of every time.

    var httpForwardedCount = parseInt(process.env['HTTP_FORWARDED_COUNT']) || 0;
    if (httpForwardedCount === 0) return self.socket.remoteAddress;
    var forwardedFor = self.socket.headers["x-forwarded-for"];
    if (!_.isString(forwardedFor)) return null;
    forwardedFor = forwardedFor.trim().split(/\s*,\s*/); // Typically the first value in the `x-forwarded-for` header is
    // the original IP address of the client connecting to the first
    // proxy.  However, the end user can easily spoof the header, in
    // which case the first value(s) will be the fake IP address from
    // the user pretending to be a proxy reporting the original IP
    // address value.  By counting HTTP_FORWARDED_COUNT back from the
    // end of the list, we ensure that we get the IP address being
    // reported by *our* first proxy.

    if (httpForwardedCount < 0 || httpForwardedCount > forwardedFor.length) return null;
    return forwardedFor[forwardedFor.length - httpForwardedCount];
  }
}); /******************************************************************************/ /* Subscription                                                               */ /******************************************************************************/ // ctor for a sub handle: the input to each publish function
// Instance name is this because it's usually referred to as this inside a
// publish
/**
 * @summary The server's side of a subscription
 * @class Subscription
 * @instanceName this
 * @showInstanceName true
 */

var Subscription = function (session, handler, subscriptionId, params, name) {
  var self = this;
  self._session = session; // type is Session
  /**
   * @summary Access inside the publish function. The incoming [connection](#meteor_onconnection) for this subscription.
   * @locus Server
   * @name  connection
   * @memberOf Subscription
   * @instance
   */
  self.connection = session.connectionHandle; // public API object

  self._handler = handler; // my subscription ID (generated by client, undefined for universal subs).

  self._subscriptionId = subscriptionId; // undefined for universal subs

  self._name = name;
  self._params = params || []; // Only named subscriptions have IDs, but we need some sort of string
  // internally to keep track of all subscriptions inside
  // SessionDocumentViews. We use this subscriptionHandle for that.

  if (self._subscriptionId) {
    self._subscriptionHandle = 'N' + self._subscriptionId;
  } else {
    self._subscriptionHandle = 'U' + Random.id();
  } // has _deactivate been called?


  self._deactivated = false; // stop callbacks to g/c this sub.  called w/ zero arguments.

  self._stopCallbacks = []; // the set of (collection, documentid) that this subscription has
  // an opinion about

  self._documents = {}; // remember if we are ready.

  self._ready = false; // Part of the public API: the user of this sub.
  /**
   * @summary Access inside the publish function. The id of the logged-in user, or `null` if no user is logged in.
   * @locus Server
   * @memberOf Subscription
   * @name  userId
   * @instance
   */
  self.userId = session.userId; // For now, the id filter is going to default to
  // the to/from DDP methods on MongoID, to
  // specifically deal with mongo/minimongo ObjectIds.
  // Later, you will be able to make this be "raw"
  // if you want to publish a collection that you know
  // just has strings for keys and no funny business, to
  // a ddp consumer that isn't minimongo

  self._idFilter = {
    idStringify: MongoID.idStringify,
    idParse: MongoID.idParse
  };
  Package.facts && Package.facts.Facts.incrementServerFact("livedata", "subscriptions", 1);
};

_.extend(Subscription.prototype, {
  _runHandler: function () {
    // XXX should we unblock() here? Either before running the publish
    // function, or before running _publishCursor.
    //
    // Right now, each publish function blocks all future publishes and
    // methods waiting on data from Mongo (or whatever else the function
    // blocks on). This probably slows page load in common cases.
    var self = this;

    try {
      var res = DDP._CurrentPublicationInvocation.withValue(self, () => maybeAuditArgumentChecks(self._handler, self, EJSON.clone(self._params), // It's OK that this would look weird for universal subscriptions,
      // because they have no arguments so there can never be an
      // audit-argument-checks failure.
      "publisher '" + self._name + "'"));
    } catch (e) {
      self.error(e);
      return;
    } // Did the handler call this.error or this.stop?


    if (self._isDeactivated()) return;

    self._publishHandlerResult(res);
  },
  _publishHandlerResult: function (res) {
    // SPECIAL CASE: Instead of writing their own callbacks that invoke
    // this.added/changed/ready/etc, the user can just return a collection
    // cursor or array of cursors from the publish function; we call their
    // _publishCursor method which starts observing the cursor and publishes the
    // results. Note that _publishCursor does NOT call ready().
    //
    // XXX This uses an undocumented interface which only the Mongo cursor
    // interface publishes. Should we make this interface public and encourage
    // users to implement it themselves? Arguably, it's unnecessary; users can
    // already write their own functions like
    //   var publishMyReactiveThingy = function (name, handler) {
    //     Meteor.publish(name, function () {
    //       var reactiveThingy = handler();
    //       reactiveThingy.publishMe();
    //     });
    //   };
    var self = this;

    var isCursor = function (c) {
      return c && c._publishCursor;
    };

    if (isCursor(res)) {
      try {
        res._publishCursor(self);
      } catch (e) {
        self.error(e);
        return;
      } // _publishCursor only returns after the initial added callbacks have run.
      // mark subscription as ready.


      self.ready();
    } else if (_.isArray(res)) {
      // check all the elements are cursors
      if (!_.all(res, isCursor)) {
        self.error(new Error("Publish function returned an array of non-Cursors"));
        return;
      } // find duplicate collection names
      // XXX we should support overlapping cursors, but that would require the
      // merge box to allow overlap within a subscription


      var collectionNames = {};

      for (var i = 0; i < res.length; ++i) {
        var collectionName = res[i]._getCollectionName();

        if (_.has(collectionNames, collectionName)) {
          self.error(new Error("Publish function returned multiple cursors for collection " + collectionName));
          return;
        }

        collectionNames[collectionName] = true;
      }

      ;

      try {
        _.each(res, function (cur) {
          cur._publishCursor(self);
        });
      } catch (e) {
        self.error(e);
        return;
      }

      self.ready();
    } else if (res) {
      // truthy values other than cursors or arrays are probably a
      // user mistake (possible returning a Mongo document via, say,
      // `coll.findOne()`).
      self.error(new Error("Publish function can only return a Cursor or " + "an array of Cursors"));
    }
  },
  // This calls all stop callbacks and prevents the handler from updating any
  // SessionCollectionViews further. It's used when the user unsubscribes or
  // disconnects, as well as during setUserId re-runs. It does *NOT* send
  // removed messages for the published objects; if that is necessary, call
  // _removeAllDocuments first.
  _deactivate: function () {
    var self = this;
    if (self._deactivated) return;
    self._deactivated = true;

    self._callStopCallbacks();

    Package.facts && Package.facts.Facts.incrementServerFact("livedata", "subscriptions", -1);
  },
  _callStopCallbacks: function () {
    var self = this; // tell listeners, so they can clean up

    var callbacks = self._stopCallbacks;
    self._stopCallbacks = [];

    _.each(callbacks, function (callback) {
      callback();
    });
  },
  // Send remove messages for every document.
  _removeAllDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      _.each(self._documents, function (collectionDocs, collectionName) {
        // Iterate over _.keys instead of the dictionary itself, since we'll be
        // mutating it.
        _.each(_.keys(collectionDocs), function (strId) {
          self.removed(collectionName, self._idFilter.idParse(strId));
        });
      });
    });
  },
  // Returns a new Subscription for the same session with the same
  // initial creation parameters. This isn't a clone: it doesn't have
  // the same _documents cache, stopped state or callbacks; may have a
  // different _subscriptionHandle, and gets its userId from the
  // session, not from this object.
  _recreate: function () {
    var self = this;
    return new Subscription(self._session, self._handler, self._subscriptionId, self._params, self._name);
  },
  /**
   * @summary Call inside the publish function.  Stops this client's subscription, triggering a call on the client to the `onStop` callback passed to [`Meteor.subscribe`](#meteor_subscribe), if any. If `error` is not a [`Meteor.Error`](#meteor_error), it will be [sanitized](#meteor_error).
   * @locus Server
   * @param {Error} error The error to pass to the client.
   * @instance
   * @memberOf Subscription
   */error: function (error) {
    var self = this;
    if (self._isDeactivated()) return;

    self._session._stopSubscription(self._subscriptionId, error);
  },
  // Note that while our DDP client will notice that you've called stop() on the
  // server (and clean up its _subscriptions table) we don't actually provide a
  // mechanism for an app to notice this (the subscribe onError callback only
  // triggers if there is an error).
  /**
   * @summary Call inside the publish function.  Stops this client's subscription and invokes the client's `onStop` callback with no error.
   * @locus Server
   * @instance
   * @memberOf Subscription
   */stop: function () {
    var self = this;
    if (self._isDeactivated()) return;

    self._session._stopSubscription(self._subscriptionId);
  },
  /**
   * @summary Call inside the publish function.  Registers a callback function to run when the subscription is stopped.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {Function} func The callback function
   */onStop: function (callback) {
    var self = this;
    callback = Meteor.bindEnvironment(callback, 'onStop callback', self);
    if (self._isDeactivated()) callback();else self._stopCallbacks.push(callback);
  },
  // This returns true if the sub has been deactivated, *OR* if the session was
  // destroyed but the deferred call to _deactivateAllSubscriptions hasn't
  // happened yet.
  _isDeactivated: function () {
    var self = this;
    return self._deactivated || self._session.inQueue === null;
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been added to the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the new document.
   * @param {String} id The new document's ID.
   * @param {Object} fields The fields in the new document.  If `_id` is present it is ignored.
   */added: function (collectionName, id, fields) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id);
    Meteor._ensure(self._documents, collectionName)[id] = true;

    self._session.added(self._subscriptionHandle, collectionName, id, fields);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document in the record set has been modified.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the changed document.
   * @param {String} id The changed document's ID.
   * @param {Object} fields The fields in the document that have changed, together with their new values.  If a field is not present in `fields` it was left unchanged; if it is present in `fields` and has a value of `undefined` it was removed from the document.  If `_id` is present it is ignored.
   */changed: function (collectionName, id, fields) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id);

    self._session.changed(self._subscriptionHandle, collectionName, id, fields);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been removed from the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that the document has been removed from.
   * @param {String} id The ID of the document that has been removed.
   */removed: function (collectionName, id) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id); // We don't bother to delete sets of things in a collection if the
    // collection is empty.  It could break _removeAllDocuments.

    delete self._documents[collectionName][id];

    self._session.removed(self._subscriptionHandle, collectionName, id);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that an initial, complete snapshot of the record set has been sent.  This will trigger a call on the client to the `onReady` callback passed to  [`Meteor.subscribe`](#meteor_subscribe), if any.
   * @locus Server
   * @memberOf Subscription
   * @instance
   */ready: function () {
    var self = this;
    if (self._isDeactivated()) return;
    if (!self._subscriptionId) return; // unnecessary but ignored for universal sub

    if (!self._ready) {
      self._session.sendReady([self._subscriptionId]);

      self._ready = true;
    }
  }
}); /******************************************************************************/ /* Server                                                                     */ /******************************************************************************/

Server = function (options) {
  var self = this; // The default heartbeat interval is 30 seconds on the server and 35
  // seconds on the client.  Since the client doesn't need to send a
  // ping as long as it is receiving pings, this means that pings
  // normally go from the server to the client.
  //
  // Note: Troposphere depends on the ability to mutate
  // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.

  self.options = _.defaults(options || {}, {
    heartbeatInterval: 15000,
    heartbeatTimeout: 15000,
    // For testing, allow responding to pings to be disabled.
    respondToPings: true
  }); // Map of callbacks to call when a new connection comes in to the
  // server and completes DDP version negotiation. Use an object instead
  // of an array so we can safely remove one from the list while
  // iterating over it.

  self.onConnectionHook = new Hook({
    debugPrintExceptions: "onConnection callback"
  }); // Map of callbacks to call when a new message comes in.

  self.onMessageHook = new Hook({
    debugPrintExceptions: "onMessage callback"
  });
  self.publish_handlers = {};
  self.universal_publish_handlers = [];
  self.method_handlers = {};
  self.sessions = {}; // map from id to session

  self.stream_server = new StreamServer();
  self.stream_server.register(function (socket) {
    // socket implements the SockJSConnection interface
    socket._meteorSession = null;

    var sendError = function (reason, offendingMessage) {
      var msg = {
        msg: 'error',
        reason: reason
      };
      if (offendingMessage) msg.offendingMessage = offendingMessage;
      socket.send(DDPCommon.stringifyDDP(msg));
    };

    socket.on('data', function (raw_msg) {
      if (Meteor._printReceivedDDP) {
        Meteor._debug("Received DDP", raw_msg);
      }

      try {
        try {
          var msg = DDPCommon.parseDDP(raw_msg);
        } catch (err) {
          sendError('Parse error');
          return;
        }

        if (msg === null || !msg.msg) {
          sendError('Bad request', msg);
          return;
        }

        if (msg.msg === 'connect') {
          if (socket._meteorSession) {
            sendError("Already connected", msg);
            return;
          }

          Fiber(function () {
            self._handleConnect(socket, msg);
          }).run();
          return;
        }

        if (!socket._meteorSession) {
          sendError('Must connect first', msg);
          return;
        }

        socket._meteorSession.processMessage(msg);
      } catch (e) {
        // XXX print stack nicely
        Meteor._debug("Internal exception while processing message", msg, e.message, e.stack);
      }
    });
    socket.on('close', function () {
      if (socket._meteorSession) {
        Fiber(function () {
          socket._meteorSession.close();
        }).run();
      }
    });
  });
};

_.extend(Server.prototype, {
  /**
   * @summary Register a callback to be called when a new DDP connection is made to the server.
   * @locus Server
   * @param {function} callback The function to call when a new DDP connection is established.
   * @memberOf Meteor
   * @importFromPackage meteor
   */onConnection: function (fn) {
    var self = this;
    return self.onConnectionHook.register(fn);
  },
  /**
   * @summary Register a callback to be called when a new DDP message is received.
   * @locus Server
   * @param {function} callback The function to call when a new DDP message is received.
   * @memberOf Meteor
   * @importFromPackage meteor
   */onMessage: function (fn) {
    var self = this;
    return self.onMessageHook.register(fn);
  },
  _handleConnect: function (socket, msg) {
    var self = this; // The connect message must specify a version and an array of supported
    // versions, and it must claim to support what it is proposing.

    if (!(typeof msg.version === 'string' && _.isArray(msg.support) && _.all(msg.support, _.isString) && _.contains(msg.support, msg.version))) {
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: DDPCommon.SUPPORTED_DDP_VERSIONS[0]
      }));
      socket.close();
      return;
    } // In the future, handle session resumption: something like:
    //  socket._meteorSession = self.sessions[msg.session]


    var version = calculateVersion(msg.support, DDPCommon.SUPPORTED_DDP_VERSIONS);

    if (msg.version !== version) {
      // The best version to use (according to the client's stated preferences)
      // is not the one the client is trying to use. Inform them about the best
      // version to use.
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: version
      }));
      socket.close();
      return;
    } // Yay, version matches! Create a new session.
    // Note: Troposphere depends on the ability to mutate
    // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.


    socket._meteorSession = new Session(self, version, socket, self.options);
    self.sessions[socket._meteorSession.id] = socket._meteorSession;
    self.onConnectionHook.each(function (callback) {
      if (socket._meteorSession) callback(socket._meteorSession.connectionHandle);
      return true;
    });
  },
  /**
   * Register a publish handler function.
   *
   * @param name {String} identifier for query
   * @param handler {Function} publish handler
   * @param options {Object}
   *
   * Server will call handler function on each new subscription,
   * either when receiving DDP sub message for a named subscription, or on
   * DDP connect for a universal subscription.
   *
   * If name is null, this will be a subscription that is
   * automatically established and permanently on for all connected
   * client, instead of a subscription that can be turned on and off
   * with subscribe().
   *
   * options to contain:
   *  - (mostly internal) is_auto: true if generated automatically
   *    from an autopublish hook. this is for cosmetic purposes only
   *    (it lets us determine whether to print a warning suggesting
   *    that you turn off autopublish.)
   */ /**
       * @summary Publish a record set.
       * @memberOf Meteor
       * @importFromPackage meteor
       * @locus Server
       * @param {String|Object} name If String, name of the record set.  If Object, publications Dictionary of publish functions by name.  If `null`, the set has no name, and the record set is automatically sent to all connected clients.
       * @param {Function} func Function called on the server each time a client subscribes.  Inside the function, `this` is the publish handler object, described below.  If the client passed arguments to `subscribe`, the function is called with the same arguments.
       */publish: function (name, handler, options) {
    var self = this;

    if (!_.isObject(name)) {
      options = options || {};

      if (name && name in self.publish_handlers) {
        Meteor._debug("Ignoring duplicate publish named '" + name + "'");

        return;
      }

      if (Package.autopublish && !options.is_auto) {
        // They have autopublish on, yet they're trying to manually
        // picking stuff to publish. They probably should turn off
        // autopublish. (This check isn't perfect -- if you create a
        // publish before you turn on autopublish, it won't catch
        // it. But this will definitely handle the simple case where
        // you've added the autopublish package to your app, and are
        // calling publish from your app code.)
        if (!self.warned_about_autopublish) {
          self.warned_about_autopublish = true;

          Meteor._debug("** You've set up some data subscriptions with Meteor.publish(), but\n" + "** you still have autopublish turned on. Because autopublish is still\n" + "** on, your Meteor.publish() calls won't have much effect. All data\n" + "** will still be sent to all clients.\n" + "**\n" + "** Turn off autopublish by removing the autopublish package:\n" + "**\n" + "**   $ meteor remove autopublish\n" + "**\n" + "** .. and make sure you have Meteor.publish() and Meteor.subscribe() calls\n" + "** for each collection that you want clients to see.\n");
        }
      }

      if (name) self.publish_handlers[name] = handler;else {
        self.universal_publish_handlers.push(handler); // Spin up the new publisher on any existing session too. Run each
        // session's subscription in a new Fiber, so that there's no change for
        // self.sessions to change while we're running this loop.

        _.each(self.sessions, function (session) {
          if (!session._dontStartNewUniversalSubs) {
            Fiber(function () {
              session._startSubscription(handler);
            }).run();
          }
        });
      }
    } else {
      _.each(name, function (value, key) {
        self.publish(key, value, {});
      });
    }
  },
  _removeSession: function (session) {
    var self = this;

    if (self.sessions[session.id]) {
      delete self.sessions[session.id];
    }
  },
  /**
   * @summary Defines functions that can be invoked over the network by clients.
   * @locus Anywhere
   * @param {Object} methods Dictionary whose keys are method names and values are functions.
   * @memberOf Meteor
   * @importFromPackage meteor
   */methods: function (methods) {
    var self = this;

    _.each(methods, function (func, name) {
      if (typeof func !== 'function') throw new Error("Method '" + name + "' must be a function");
      if (self.method_handlers[name]) throw new Error("A method named '" + name + "' is already defined");
      self.method_handlers[name] = func;
    });
  },
  call: function (name, ...args) {
    if (args.length && typeof args[args.length - 1] === "function") {
      // If it's a function, the last argument is the result callback, not
      // a parameter to the remote method.
      var callback = args.pop();
    }

    return this.apply(name, args, callback);
  },
  // A version of the call method that always returns a Promise.
  callAsync: function (name, ...args) {
    return this.applyAsync(name, args);
  },
  apply: function (name, args, options, callback) {
    // We were passed 3 arguments. They may be either (name, args, options)
    // or (name, args, callback)
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }

    const promise = this.applyAsync(name, args, options); // Return the result in whichever way the caller asked for it. Note that we
    // do NOT block on the write fence in an analogous way to how the client
    // blocks on the relevant data being visible, so you are NOT guaranteed that
    // cursor observe callbacks have fired when your callback is invoked. (We
    // can change this if there's a real use case.)

    if (callback) {
      promise.then(result => callback(undefined, result), exception => callback(exception));
    } else {
      return promise.await();
    }
  },
  // @param options {Optional Object}
  applyAsync: function (name, args, options) {
    // Run the handler
    var handler = this.method_handlers[name];

    if (!handler) {
      return Promise.reject(new Meteor.Error(404, `Method '${name}' not found`));
    } // If this is a method call from within another method or publish function,
    // get the user state from the outer method or publish function, otherwise
    // don't allow setUserId to be called


    var userId = null;

    var setUserId = function () {
      throw new Error("Can't call setUserId on a server initiated method call");
    };

    var connection = null;

    var currentMethodInvocation = DDP._CurrentMethodInvocation.get();

    var currentPublicationInvocation = DDP._CurrentPublicationInvocation.get();

    var randomSeed = null;

    if (currentMethodInvocation) {
      userId = currentMethodInvocation.userId;

      setUserId = function (userId) {
        currentMethodInvocation.setUserId(userId);
      };

      connection = currentMethodInvocation.connection;
      randomSeed = DDPCommon.makeRpcSeed(currentMethodInvocation, name);
    } else if (currentPublicationInvocation) {
      userId = currentPublicationInvocation.userId;

      setUserId = function (userId) {
        currentPublicationInvocation._session._setUserId(userId);
      };

      connection = currentPublicationInvocation.connection;
    }

    var invocation = new DDPCommon.MethodInvocation({
      isSimulation: false,
      userId,
      setUserId,
      connection,
      randomSeed
    });
    return new Promise(resolve => resolve(DDP._CurrentMethodInvocation.withValue(invocation, () => maybeAuditArgumentChecks(handler, invocation, EJSON.clone(args), "internal call to '" + name + "'")))).then(EJSON.clone);
  },
  _urlForSession: function (sessionId) {
    var self = this;
    var session = self.sessions[sessionId];
    if (session) return session._socketUrl;else return null;
  }
});

var calculateVersion = function (clientSupportedVersions, serverSupportedVersions) {
  var correctVersion = _.find(clientSupportedVersions, function (version) {
    return _.contains(serverSupportedVersions, version);
  });

  if (!correctVersion) {
    correctVersion = serverSupportedVersions[0];
  }

  return correctVersion;
};

DDPServer._calculateVersion = calculateVersion; // "blind" exceptions other than those that were deliberately thrown to signal
// errors to the client

var wrapInternalException = function (exception, context) {
  if (!exception) return exception; // To allow packages to throw errors intended for the client but not have to
  // depend on the Meteor.Error class, `isClientSafe` can be set to true on any
  // error before it is thrown.

  if (exception.isClientSafe) {
    if (!(exception instanceof Meteor.Error)) {
      const originalMessage = exception.message;
      exception = new Meteor.Error(exception.error, exception.reason, exception.details);
      exception.message = originalMessage;
    }

    return exception;
  } // tests can set the 'expected' flag on an exception so it won't go to the
  // server log


  if (!exception.expected) {
    Meteor._debug("Exception " + context, exception.stack);

    if (exception.sanitizedError) {
      Meteor._debug("Sanitized and reported to the client as:", exception.sanitizedError.message);

      Meteor._debug();
    }
  } // Did the error contain more details that could have been useful if caught in
  // server code (or if thrown from non-client-originated code), but also
  // provided a "sanitized" version with more context than 500 Internal server
  // error? Use that.


  if (exception.sanitizedError) {
    if (exception.sanitizedError.isClientSafe) return exception.sanitizedError;

    Meteor._debug("Exception " + context + " provides a sanitizedError that " + "does not have isClientSafe property set; ignoring");
  }

  return new Meteor.Error(500, "Internal server error");
}; // Audit argument checks, if the audit-argument-checks package exists (it is a
// weak dependency of this package).


var maybeAuditArgumentChecks = function (f, context, args, description) {
  args = args || [];

  if (Package['audit-argument-checks']) {
    return Match._failIfArgumentsAreNotAllChecked(f, context, args, description);
  }

  return f.apply(context, args);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"writefence.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/writefence.js                                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Future = Npm.require('fibers/future'); // A write fence collects a group of writes, and provides a callback
// when all of the writes are fully committed and propagated (all
// observers have been notified of the write and acknowledged it.)
//


DDPServer._WriteFence = function () {
  var self = this;
  self.armed = false;
  self.fired = false;
  self.retired = false;
  self.outstanding_writes = 0;
  self.before_fire_callbacks = [];
  self.completion_callbacks = [];
}; // The current write fence. When there is a current write fence, code
// that writes to databases should register their writes with it using
// beginWrite().
//


DDPServer._CurrentWriteFence = new Meteor.EnvironmentVariable();

_.extend(DDPServer._WriteFence.prototype, {
  // Start tracking a write, and return an object to represent it. The
  // object has a single method, committed(). This method should be
  // called when the write is fully committed and propagated. You can
  // continue to add writes to the WriteFence up until it is triggered
  // (calls its callbacks because all writes have committed.)
  beginWrite: function () {
    var self = this;
    if (self.retired) return {
      committed: function () {}
    };
    if (self.fired) throw new Error("fence has already activated -- too late to add writes");
    self.outstanding_writes++;
    var committed = false;
    return {
      committed: function () {
        if (committed) throw new Error("committed called twice on the same write");
        committed = true;
        self.outstanding_writes--;

        self._maybeFire();
      }
    };
  },
  // Arm the fence. Once the fence is armed, and there are no more
  // uncommitted writes, it will activate.
  arm: function () {
    var self = this;
    if (self === DDPServer._CurrentWriteFence.get()) throw Error("Can't arm the current fence");
    self.armed = true;

    self._maybeFire();
  },
  // Register a function to be called once before firing the fence.
  // Callback function can add new writes to the fence, in which case
  // it won't fire until those writes are done as well.
  onBeforeFire: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.before_fire_callbacks.push(func);
  },
  // Register a function to be called when the fence fires.
  onAllCommitted: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.completion_callbacks.push(func);
  },
  // Convenience function. Arms the fence, then blocks until it fires.
  armAndWait: function () {
    var self = this;
    var future = new Future();
    self.onAllCommitted(function () {
      future['return']();
    });
    self.arm();
    future.wait();
  },
  _maybeFire: function () {
    var self = this;
    if (self.fired) throw new Error("write fence already activated?");

    if (self.armed && !self.outstanding_writes) {
      function invokeCallback(func) {
        try {
          func(self);
        } catch (err) {
          Meteor._debug("exception in write fence callback:", err);
        }
      }

      self.outstanding_writes++;

      while (self.before_fire_callbacks.length > 0) {
        var callbacks = self.before_fire_callbacks;
        self.before_fire_callbacks = [];

        _.each(callbacks, invokeCallback);
      }

      self.outstanding_writes--;

      if (!self.outstanding_writes) {
        self.fired = true;
        var callbacks = self.completion_callbacks;
        self.completion_callbacks = [];

        _.each(callbacks, invokeCallback);
      }
    }
  },
  // Deactivate this fence so that adding more writes has no effect.
  // The fence must have already fired.
  retire: function () {
    var self = this;
    if (!self.fired) throw new Error("Can't retire a fence that hasn't fired.");
    self.retired = true;
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"crossbar.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/crossbar.js                                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// A "crossbar" is a class that provides structured notification registration.
// See _match for the definition of how a notification matches a trigger.
// All notifications and triggers must have a string key named 'collection'.
DDPServer._Crossbar = function (options) {
  var self = this;
  options = options || {};
  self.nextId = 1; // map from collection name (string) -> listener id -> object. each object has
  // keys 'trigger', 'callback'.  As a hack, the empty string means "no
  // collection".

  self.listenersByCollection = {};
  self.factPackage = options.factPackage || "livedata";
  self.factName = options.factName || null;
};

_.extend(DDPServer._Crossbar.prototype, {
  // msg is a trigger or a notification
  _collectionForMessage: function (msg) {
    var self = this;

    if (!_.has(msg, 'collection')) {
      return '';
    } else if (typeof msg.collection === 'string') {
      if (msg.collection === '') throw Error("Message has empty collection!");
      return msg.collection;
    } else {
      throw Error("Message has non-string collection!");
    }
  },
  // Listen for notification that match 'trigger'. A notification
  // matches if it has the key-value pairs in trigger as a
  // subset. When a notification matches, call 'callback', passing
  // the actual notification.
  //
  // Returns a listen handle, which is an object with a method
  // stop(). Call stop() to stop listening.
  //
  // XXX It should be legal to call fire() from inside a listen()
  // callback?
  listen: function (trigger, callback) {
    var self = this;
    var id = self.nextId++;

    var collection = self._collectionForMessage(trigger);

    var record = {
      trigger: EJSON.clone(trigger),
      callback: callback
    };

    if (!_.has(self.listenersByCollection, collection)) {
      self.listenersByCollection[collection] = {};
    }

    self.listenersByCollection[collection][id] = record;

    if (self.factName && Package.facts) {
      Package.facts.Facts.incrementServerFact(self.factPackage, self.factName, 1);
    }

    return {
      stop: function () {
        if (self.factName && Package.facts) {
          Package.facts.Facts.incrementServerFact(self.factPackage, self.factName, -1);
        }

        delete self.listenersByCollection[collection][id];

        if (_.isEmpty(self.listenersByCollection[collection])) {
          delete self.listenersByCollection[collection];
        }
      }
    };
  },
  // Fire the provided 'notification' (an object whose attribute
  // values are all JSON-compatibile) -- inform all matching listeners
  // (registered with listen()).
  //
  // If fire() is called inside a write fence, then each of the
  // listener callbacks will be called inside the write fence as well.
  //
  // The listeners may be invoked in parallel, rather than serially.
  fire: function (notification) {
    var self = this;

    var collection = self._collectionForMessage(notification);

    if (!_.has(self.listenersByCollection, collection)) {
      return;
    }

    var listenersForCollection = self.listenersByCollection[collection];
    var callbackIds = [];

    _.each(listenersForCollection, function (l, id) {
      if (self._matches(notification, l.trigger)) {
        callbackIds.push(id);
      }
    }); // Listener callbacks can yield, so we need to first find all the ones that
    // match in a single iteration over self.listenersByCollection (which can't
    // be mutated during this iteration), and then invoke the matching
    // callbacks, checking before each call to ensure they haven't stopped.
    // Note that we don't have to check that
    // self.listenersByCollection[collection] still === listenersForCollection,
    // because the only way that stops being true is if listenersForCollection
    // first gets reduced down to the empty object (and then never gets
    // increased again).


    _.each(callbackIds, function (id) {
      if (_.has(listenersForCollection, id)) {
        listenersForCollection[id].callback(notification);
      }
    });
  },
  // A notification matches a trigger if all keys that exist in both are equal.
  //
  // Examples:
  //  N:{collection: "C"} matches T:{collection: "C"}
  //    (a non-targeted write to a collection matches a
  //     non-targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C"}
  //    (a targeted write to a collection matches a non-targeted query)
  //  N:{collection: "C"} matches T:{collection: "C", id: "X"}
  //    (a non-targeted write to a collection matches a
  //     targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C", id: "X"}
  //    (a targeted write to a collection matches a targeted query targeted
  //     at the same document)
  //  N:{collection: "C", id: "X"} does not match T:{collection: "C", id: "Y"}
  //    (a targeted write to a collection does not match a targeted query
  //     targeted at a different document)
  _matches: function (notification, trigger) {
    // Most notifications that use the crossbar have a string `collection` and
    // maybe an `id` that is a string or ObjectID. We're already dividing up
    // triggers by collection, but let's fast-track "nope, different ID" (and
    // avoid the overly generic EJSON.equals). This makes a noticeable
    // performance difference; see https://github.com/meteor/meteor/pull/3697
    if (typeof notification.id === 'string' && typeof trigger.id === 'string' && notification.id !== trigger.id) {
      return false;
    }

    if (notification.id instanceof MongoID.ObjectID && trigger.id instanceof MongoID.ObjectID && !notification.id.equals(trigger.id)) {
      return false;
    }

    return _.all(trigger, function (triggerValue, key) {
      return !_.has(notification, key) || EJSON.equals(triggerValue, notification[key]);
    });
  }
}); // The "invalidation crossbar" is a specific instance used by the DDP server to
// implement write fence notifications. Listener callbacks on this crossbar
// should call beginWrite on the current write fence before they return, if they
// want to delay the write fence from firing (ie, the DDP method-data-updated
// message from being sent).


DDPServer._InvalidationCrossbar = new DDPServer._Crossbar({
  factName: "invalidation-crossbar-listeners"
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server_convenience.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/server_convenience.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
if (process.env.DDP_DEFAULT_CONNECTION_URL) {
  __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = process.env.DDP_DEFAULT_CONNECTION_URL;
}

Meteor.server = new Server();

Meteor.refresh = function (notification) {
  DDPServer._InvalidationCrossbar.fire(notification);
}; // Proxy the public methods of Meteor.server so they can
// be called directly on Meteor.


_.each(['publish', 'methods', 'call', 'apply', 'onConnection', 'onMessage'], function (name) {
  Meteor[name] = _.bind(Meteor.server[name], Meteor.server);
}); // Meteor.server used to be called Meteor.default_server. Provide
// backcompat as a courtesy even though it was never documented.
// XXX COMPAT WITH 0.6.4


Meteor.default_server = Meteor.server;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/ddp-server/stream_server.js");
require("./node_modules/meteor/ddp-server/livedata_server.js");
require("./node_modules/meteor/ddp-server/writefence.js");
require("./node_modules/meteor/ddp-server/crossbar.js");
require("./node_modules/meteor/ddp-server/server_convenience.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ddp-server'] = {}, {
  DDPServer: DDPServer
});

})();

//# sourceURL=meteor://💻app/packages/ddp-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci9zdHJlYW1fc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2xpdmVkYXRhX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci93cml0ZWZlbmNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2Nyb3NzYmFyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3NlcnZlcl9jb252ZW5pZW5jZS5qcyJdLCJuYW1lcyI6WyJ1cmwiLCJOcG0iLCJyZXF1aXJlIiwid2Vic29ja2V0RXh0ZW5zaW9ucyIsIl8iLCJvbmNlIiwiZXh0ZW5zaW9ucyIsIndlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnIiwicHJvY2VzcyIsImVudiIsIlNFUlZFUl9XRUJTT0NLRVRfQ09NUFJFU1NJT04iLCJKU09OIiwicGFyc2UiLCJwdXNoIiwiY29uZmlndXJlIiwicGF0aFByZWZpeCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsIlN0cmVhbVNlcnZlciIsInNlbGYiLCJyZWdpc3RyYXRpb25fY2FsbGJhY2tzIiwib3Blbl9zb2NrZXRzIiwicHJlZml4IiwiUm91dGVQb2xpY3kiLCJkZWNsYXJlIiwic29ja2pzIiwic2VydmVyT3B0aW9ucyIsImxvZyIsImhlYXJ0YmVhdF9kZWxheSIsImRpc2Nvbm5lY3RfZGVsYXkiLCJqc2Vzc2lvbmlkIiwiVVNFX0pTRVNTSU9OSUQiLCJESVNBQkxFX1dFQlNPQ0tFVFMiLCJ3ZWJzb2NrZXQiLCJmYXllX3NlcnZlcl9vcHRpb25zIiwic2VydmVyIiwiY3JlYXRlU2VydmVyIiwiV2ViQXBwIiwiaHR0cFNlcnZlciIsInJlbW92ZUxpc3RlbmVyIiwiX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrIiwiaW5zdGFsbEhhbmRsZXJzIiwiYWRkTGlzdGVuZXIiLCJfcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludCIsIm9uIiwic29ja2V0Iiwic2V0V2Vic29ja2V0VGltZW91dCIsInRpbWVvdXQiLCJwcm90b2NvbCIsIl9zZXNzaW9uIiwicmVjdiIsImNvbm5lY3Rpb24iLCJzZXRUaW1lb3V0Iiwic2VuZCIsImRhdGEiLCJ3cml0ZSIsIndpdGhvdXQiLCJzdHJpbmdpZnkiLCJzZXJ2ZXJfaWQiLCJlYWNoIiwiY2FsbGJhY2siLCJleHRlbmQiLCJwcm90b3R5cGUiLCJyZWdpc3RlciIsImFsbF9zb2NrZXRzIiwidmFsdWVzIiwiZXZlbnQiLCJvbGRIdHRwU2VydmVyTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwic2xpY2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJuZXdMaXN0ZW5lciIsInJlcXVlc3QiLCJhcmdzIiwiYXJndW1lbnRzIiwicGFyc2VkVXJsIiwicGF0aG5hbWUiLCJmb3JtYXQiLCJvbGRMaXN0ZW5lciIsImFwcGx5IiwiRERQU2VydmVyIiwiRmliZXIiLCJTZXNzaW9uRG9jdW1lbnRWaWV3IiwiZXhpc3RzSW4iLCJkYXRhQnlLZXkiLCJfU2Vzc2lvbkRvY3VtZW50VmlldyIsImdldEZpZWxkcyIsInJldCIsInByZWNlZGVuY2VMaXN0Iiwia2V5IiwidmFsdWUiLCJjbGVhckZpZWxkIiwic3Vic2NyaXB0aW9uSGFuZGxlIiwiY2hhbmdlQ29sbGVjdG9yIiwicmVtb3ZlZFZhbHVlIiwidW5kZWZpbmVkIiwiaSIsImxlbmd0aCIsInByZWNlZGVuY2UiLCJzcGxpY2UiLCJpc0VtcHR5IiwiRUpTT04iLCJlcXVhbHMiLCJjaGFuZ2VGaWVsZCIsImlzQWRkIiwiY2xvbmUiLCJoYXMiLCJlbHQiLCJmaW5kIiwiU2Vzc2lvbkNvbGxlY3Rpb25WaWV3IiwiY29sbGVjdGlvbk5hbWUiLCJzZXNzaW9uQ2FsbGJhY2tzIiwiZG9jdW1lbnRzIiwiY2FsbGJhY2tzIiwiX1Nlc3Npb25Db2xsZWN0aW9uVmlldyIsImRpZmYiLCJwcmV2aW91cyIsIkRpZmZTZXF1ZW5jZSIsImRpZmZPYmplY3RzIiwiYm90aCIsImJpbmQiLCJkaWZmRG9jdW1lbnQiLCJyaWdodE9ubHkiLCJpZCIsIm5vd0RWIiwiYWRkZWQiLCJsZWZ0T25seSIsInByZXZEViIsInJlbW92ZWQiLCJmaWVsZHMiLCJwcmV2Iiwibm93IiwiY2hhbmdlZCIsImRvY1ZpZXciLCJjaGFuZ2VkUmVzdWx0IiwiRXJyb3IiLCJlcnIiLCJTZXNzaW9uIiwidmVyc2lvbiIsIm9wdGlvbnMiLCJSYW5kb20iLCJpbml0aWFsaXplZCIsImluUXVldWUiLCJNZXRlb3IiLCJfRG91YmxlRW5kZWRRdWV1ZSIsImJsb2NrZWQiLCJ3b3JrZXJSdW5uaW5nIiwiX25hbWVkU3VicyIsIl91bml2ZXJzYWxTdWJzIiwidXNlcklkIiwiY29sbGVjdGlvblZpZXdzIiwiX2lzU2VuZGluZyIsIl9kb250U3RhcnROZXdVbml2ZXJzYWxTdWJzIiwiX3BlbmRpbmdSZWFkeSIsIl9jbG9zZUNhbGxiYWNrcyIsIl9zb2NrZXRVcmwiLCJfcmVzcG9uZFRvUGluZ3MiLCJyZXNwb25kVG9QaW5ncyIsImNvbm5lY3Rpb25IYW5kbGUiLCJjbG9zZSIsIm9uQ2xvc2UiLCJmbiIsImNiIiwiYmluZEVudmlyb25tZW50IiwiZGVmZXIiLCJjbGllbnRBZGRyZXNzIiwiX2NsaWVudEFkZHJlc3MiLCJodHRwSGVhZGVycyIsImhlYWRlcnMiLCJtc2ciLCJzZXNzaW9uIiwic3RhcnRVbml2ZXJzYWxTdWJzIiwicnVuIiwiaGVhcnRiZWF0SW50ZXJ2YWwiLCJoZWFydGJlYXQiLCJERFBDb21tb24iLCJIZWFydGJlYXQiLCJoZWFydGJlYXRUaW1lb3V0Iiwib25UaW1lb3V0Iiwic2VuZFBpbmciLCJzdGFydCIsIlBhY2thZ2UiLCJmYWN0cyIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsInNlbmRSZWFkeSIsInN1YnNjcmlwdGlvbklkcyIsInN1YnMiLCJzdWJzY3JpcHRpb25JZCIsInNlbmRBZGRlZCIsImNvbGxlY3Rpb24iLCJzZW5kQ2hhbmdlZCIsInNlbmRSZW1vdmVkIiwiZ2V0U2VuZENhbGxiYWNrcyIsImdldENvbGxlY3Rpb25WaWV3IiwidmlldyIsImhhbmRsZXJzIiwidW5pdmVyc2FsX3B1Ymxpc2hfaGFuZGxlcnMiLCJoYW5kbGVyIiwiX3N0YXJ0U3Vic2NyaXB0aW9uIiwic3RvcCIsIl9tZXRlb3JTZXNzaW9uIiwiX2RlYWN0aXZhdGVBbGxTdWJzY3JpcHRpb25zIiwiX3JlbW92ZVNlc3Npb24iLCJfcHJpbnRTZW50RERQIiwiX2RlYnVnIiwic3RyaW5naWZ5RERQIiwic2VuZEVycm9yIiwicmVhc29uIiwib2ZmZW5kaW5nTWVzc2FnZSIsInByb2Nlc3NNZXNzYWdlIiwibXNnX2luIiwibWVzc2FnZVJlY2VpdmVkIiwicHJvY2Vzc05leHQiLCJzaGlmdCIsInVuYmxvY2siLCJvbk1lc3NhZ2VIb29rIiwicHJvdG9jb2xfaGFuZGxlcnMiLCJjYWxsIiwic3ViIiwibmFtZSIsInBhcmFtcyIsIkFycmF5IiwicHVibGlzaF9oYW5kbGVycyIsImVycm9yIiwiRERQUmF0ZUxpbWl0ZXIiLCJyYXRlTGltaXRlcklucHV0IiwidHlwZSIsImNvbm5lY3Rpb25JZCIsIl9pbmNyZW1lbnQiLCJyYXRlTGltaXRSZXN1bHQiLCJfY2hlY2siLCJhbGxvd2VkIiwiZ2V0RXJyb3JNZXNzYWdlIiwidGltZVRvUmVzZXQiLCJ1bnN1YiIsIl9zdG9wU3Vic2NyaXB0aW9uIiwibWV0aG9kIiwicmFuZG9tU2VlZCIsImZlbmNlIiwiX1dyaXRlRmVuY2UiLCJvbkFsbENvbW1pdHRlZCIsInJldGlyZSIsIm1ldGhvZHMiLCJtZXRob2RfaGFuZGxlcnMiLCJhcm0iLCJzZXRVc2VySWQiLCJfc2V0VXNlcklkIiwiaW52b2NhdGlvbiIsIk1ldGhvZEludm9jYXRpb24iLCJpc1NpbXVsYXRpb24iLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJfQ3VycmVudFdyaXRlRmVuY2UiLCJ3aXRoVmFsdWUiLCJERFAiLCJfQ3VycmVudE1ldGhvZEludm9jYXRpb24iLCJtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MiLCJmaW5pc2giLCJwYXlsb2FkIiwidGhlbiIsInJlc3VsdCIsImV4Y2VwdGlvbiIsIndyYXBJbnRlcm5hbEV4Y2VwdGlvbiIsIl9lYWNoU3ViIiwiZiIsIl9kaWZmQ29sbGVjdGlvblZpZXdzIiwiYmVmb3JlQ1ZzIiwibGVmdFZhbHVlIiwicmlnaHRWYWx1ZSIsImRvYyIsIl9kZWFjdGl2YXRlIiwib2xkTmFtZWRTdWJzIiwiX3JlY3JlYXRlIiwiX3J1bkhhbmRsZXIiLCJfbm9ZaWVsZHNBbGxvd2VkIiwic3ViSWQiLCJTdWJzY3JpcHRpb24iLCJzdWJOYW1lIiwiX25hbWUiLCJfcmVtb3ZlQWxsRG9jdW1lbnRzIiwicmVzcG9uc2UiLCJodHRwRm9yd2FyZGVkQ291bnQiLCJwYXJzZUludCIsInJlbW90ZUFkZHJlc3MiLCJmb3J3YXJkZWRGb3IiLCJpc1N0cmluZyIsInRyaW0iLCJzcGxpdCIsIl9oYW5kbGVyIiwiX3N1YnNjcmlwdGlvbklkIiwiX3BhcmFtcyIsIl9zdWJzY3JpcHRpb25IYW5kbGUiLCJfZGVhY3RpdmF0ZWQiLCJfc3RvcENhbGxiYWNrcyIsIl9kb2N1bWVudHMiLCJfcmVhZHkiLCJfaWRGaWx0ZXIiLCJpZFN0cmluZ2lmeSIsIk1vbmdvSUQiLCJpZFBhcnNlIiwicmVzIiwiX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24iLCJlIiwiX2lzRGVhY3RpdmF0ZWQiLCJfcHVibGlzaEhhbmRsZXJSZXN1bHQiLCJpc0N1cnNvciIsImMiLCJfcHVibGlzaEN1cnNvciIsInJlYWR5IiwiaXNBcnJheSIsImFsbCIsImNvbGxlY3Rpb25OYW1lcyIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsImN1ciIsIl9jYWxsU3RvcENhbGxiYWNrcyIsImNvbGxlY3Rpb25Eb2NzIiwia2V5cyIsInN0cklkIiwib25TdG9wIiwiX2Vuc3VyZSIsIlNlcnZlciIsImRlZmF1bHRzIiwib25Db25uZWN0aW9uSG9vayIsIkhvb2siLCJkZWJ1Z1ByaW50RXhjZXB0aW9ucyIsInNlc3Npb25zIiwic3RyZWFtX3NlcnZlciIsInJhd19tc2ciLCJfcHJpbnRSZWNlaXZlZEREUCIsInBhcnNlRERQIiwiX2hhbmRsZUNvbm5lY3QiLCJtZXNzYWdlIiwic3RhY2siLCJvbkNvbm5lY3Rpb24iLCJvbk1lc3NhZ2UiLCJzdXBwb3J0IiwiY29udGFpbnMiLCJTVVBQT1JURURfRERQX1ZFUlNJT05TIiwiY2FsY3VsYXRlVmVyc2lvbiIsInB1Ymxpc2giLCJpc09iamVjdCIsImF1dG9wdWJsaXNoIiwiaXNfYXV0byIsIndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCIsImZ1bmMiLCJwb3AiLCJjYWxsQXN5bmMiLCJhcHBseUFzeW5jIiwiYXdhaXQiLCJjdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsImdldCIsImN1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24iLCJtYWtlUnBjU2VlZCIsIl91cmxGb3JTZXNzaW9uIiwic2Vzc2lvbklkIiwiY2xpZW50U3VwcG9ydGVkVmVyc2lvbnMiLCJzZXJ2ZXJTdXBwb3J0ZWRWZXJzaW9ucyIsImNvcnJlY3RWZXJzaW9uIiwiX2NhbGN1bGF0ZVZlcnNpb24iLCJjb250ZXh0IiwiaXNDbGllbnRTYWZlIiwib3JpZ2luYWxNZXNzYWdlIiwiZGV0YWlscyIsImV4cGVjdGVkIiwic2FuaXRpemVkRXJyb3IiLCJkZXNjcmlwdGlvbiIsIk1hdGNoIiwiX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQiLCJGdXR1cmUiLCJhcm1lZCIsImZpcmVkIiwicmV0aXJlZCIsIm91dHN0YW5kaW5nX3dyaXRlcyIsImJlZm9yZV9maXJlX2NhbGxiYWNrcyIsImNvbXBsZXRpb25fY2FsbGJhY2tzIiwiRW52aXJvbm1lbnRWYXJpYWJsZSIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfbWF5YmVGaXJlIiwib25CZWZvcmVGaXJlIiwiYXJtQW5kV2FpdCIsImZ1dHVyZSIsIndhaXQiLCJpbnZva2VDYWxsYmFjayIsIl9Dcm9zc2JhciIsIm5leHRJZCIsImxpc3RlbmVyc0J5Q29sbGVjdGlvbiIsImZhY3RQYWNrYWdlIiwiZmFjdE5hbWUiLCJfY29sbGVjdGlvbkZvck1lc3NhZ2UiLCJsaXN0ZW4iLCJ0cmlnZ2VyIiwicmVjb3JkIiwiZmlyZSIsIm5vdGlmaWNhdGlvbiIsImxpc3RlbmVyc0ZvckNvbGxlY3Rpb24iLCJjYWxsYmFja0lkcyIsImwiLCJfbWF0Y2hlcyIsIk9iamVjdElEIiwidHJpZ2dlclZhbHVlIiwiX0ludmFsaWRhdGlvbkNyb3NzYmFyIiwiRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwiLCJyZWZyZXNoIiwiZGVmYXVsdF9zZXJ2ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE1BQU1DLElBQUlDLE9BQUosQ0FBWSxLQUFaLENBQVYsQyxDQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLElBQUlDLHNCQUFzQkMsRUFBRUMsSUFBRixDQUFPLFlBQVk7QUFDM0MsTUFBSUMsYUFBYSxFQUFqQjtBQUVBLE1BQUlDLDZCQUE2QkMsUUFBUUMsR0FBUixDQUFZQyw0QkFBWixHQUN6QkMsS0FBS0MsS0FBTCxDQUFXSixRQUFRQyxHQUFSLENBQVlDLDRCQUF2QixDQUR5QixHQUM4QixFQUQvRDs7QUFFQSxNQUFJSCwwQkFBSixFQUFnQztBQUM5QkQsZUFBV08sSUFBWCxDQUFnQlosSUFBSUMsT0FBSixDQUFZLG9CQUFaLEVBQWtDWSxTQUFsQyxDQUNkUCwwQkFEYyxDQUFoQjtBQUdEOztBQUVELFNBQU9ELFVBQVA7QUFDRCxDQVp5QixDQUExQjs7QUFjQSxJQUFJUyxhQUFhQywwQkFBMEJDLG9CQUExQixJQUFtRCxFQUFwRTs7QUFFQUMsZUFBZSxZQUFZO0FBQ3pCLE1BQUlDLE9BQU8sSUFBWDtBQUNBQSxPQUFLQyxzQkFBTCxHQUE4QixFQUE5QjtBQUNBRCxP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dmFyIHVybCA9IE5wbS5yZXF1aXJlKCd1cmwnKTtcblxuLy8gQnkgZGVmYXVsdCwgd2UgdXNlIHRoZSBwZXJtZXNzYWdlLWRlZmxhdGUgZXh0ZW5zaW9uIHdpdGggZGVmYXVsdFxuLy8gY29uZmlndXJhdGlvbi4gSWYgJFNFUlZFUl9XRUJTT0NLRVRfQ09NUFJFU1NJT04gaXMgc2V0LCB0aGVuIGl0IG11c3QgYmUgdmFsaWRcbi8vIEpTT04uIElmIGl0IHJlcHJlc2VudHMgYSBmYWxzZXkgdmFsdWUsIHRoZW4gd2UgZG8gbm90IHVzZSBwZXJtZXNzYWdlLWRlZmxhdGVcbi8vIGF0IGFsbDsgb3RoZXJ3aXNlLCB0aGUgSlNPTiB2YWx1ZSBpcyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIGRlZmxhdGUnc1xuLy8gY29uZmlndXJlIG1ldGhvZDsgc2VlXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmF5ZS9wZXJtZXNzYWdlLWRlZmxhdGUtbm9kZS9ibG9iL21hc3Rlci9SRUFETUUubWRcbi8vXG4vLyAoV2UgZG8gdGhpcyBpbiBhbiBfLm9uY2UgaW5zdGVhZCBvZiBhdCBzdGFydHVwLCBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG9cbi8vIGNyYXNoIHRoZSB0b29sIGR1cmluZyBpc29wYWNrZXQgbG9hZCBpZiB5b3VyIEpTT04gZG9lc24ndCBwYXJzZS4gVGhpcyBpcyBvbmx5XG4vLyBhIHByb2JsZW0gYmVjYXVzZSB0aGUgdG9vbCBoYXMgdG8gbG9hZCB0aGUgRERQIHNlcnZlciBjb2RlIGp1c3QgaW4gb3JkZXIgdG9cbi8vIGJlIGEgRERQIGNsaWVudDsgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy8zNDUyIC4pXG52YXIgd2Vic29ja2V0RXh0ZW5zaW9ucyA9IF8ub25jZShmdW5jdGlvbiAoKSB7XG4gIHZhciBleHRlbnNpb25zID0gW107XG5cbiAgdmFyIHdlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnID0gcHJvY2Vzcy5lbnYuU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTlxuICAgICAgICA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTikgOiB7fTtcbiAgaWYgKHdlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnKSB7XG4gICAgZXh0ZW5zaW9ucy5wdXNoKE5wbS5yZXF1aXJlKCdwZXJtZXNzYWdlLWRlZmxhdGUnKS5jb25maWd1cmUoXG4gICAgICB3ZWJzb2NrZXRDb21wcmVzc2lvbkNvbmZpZ1xuICAgICkpO1xuICB9XG5cbiAgcmV0dXJuIGV4dGVuc2lvbnM7XG59KTtcblxudmFyIHBhdGhQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICBcIlwiO1xuXG5TdHJlYW1TZXJ2ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5yZWdpc3RyYXRpb25fY2FsbGJhY2tzID0gW107XG4gIHNlbGYub3Blbl9zb2NrZXRzID0gW107XG5cbiAgLy8gQmVjYXVzZSB3ZSBhcmUgaW5zdGFsbGluZyBkaXJlY3RseSBvbnRvIFdlYkFwcC5odHRwU2VydmVyIGluc3RlYWQgb2YgdXNpbmdcbiAgLy8gV2ViQXBwLmFwcCwgd2UgaGF2ZSB0byBwcm9jZXNzIHRoZSBwYXRoIHByZWZpeCBvdXJzZWx2ZXMuXG4gIHNlbGYucHJlZml4ID0gcGF0aFByZWZpeCArICcvc29ja2pzJztcbiAgUm91dGVQb2xpY3kuZGVjbGFyZShzZWxmLnByZWZpeCArICcvJywgJ25ldHdvcmsnKTtcblxuICAvLyBzZXQgdXAgc29ja2pzXG4gIHZhciBzb2NranMgPSBOcG0ucmVxdWlyZSgnc29ja2pzJyk7XG4gIHZhciBzZXJ2ZXJPcHRpb25zID0ge1xuICAgIHByZWZpeDogc2VsZi5wcmVmaXgsXG4gICAgbG9nOiBmdW5jdGlvbigpIHt9LFxuICAgIC8vIHRoaXMgaXMgdGhlIGRlZmF1bHQsIGJ1dCB3ZSBjb2RlIGl0IGV4cGxpY2l0bHkgYmVjYXVzZSB3ZSBkZXBlbmRcbiAgICAvLyBvbiBpdCBpbiBzdHJlYW1fY2xpZW50OkhFQVJUQkVBVF9USU1FT1VUXG4gICAgaGVhcnRiZWF0X2RlbGF5OiA0NTAwMCxcbiAgICAvLyBUaGUgZGVmYXVsdCBkaXNjb25uZWN0X2RlbGF5IGlzIDUgc2Vjb25kcywgYnV0IGlmIHRoZSBzZXJ2ZXIgZW5kcyB1cCBDUFVcbiAgICAvLyBib3VuZCBmb3IgdGhhdCBtdWNoIHRpbWUsIFNvY2tKUyBtaWdodCBub3Qgbm90aWNlIHRoYXQgdGhlIHVzZXIgaGFzXG4gICAgLy8gcmVjb25uZWN0ZWQgYmVjYXVzZSB0aGUgdGltZXIgKG9mIGRpc2Nvbm5lY3RfZGVsYXkgbXMpIGNhbiBmaXJlIGJlZm9yZVxuICAgIC8vIFNvY2tKUyBwcm9jZXNzZXMgdGhlIG5ldyBjb25uZWN0aW9uLiBFdmVudHVhbGx5IHdlJ2xsIGZpeCB0aGlzIGJ5IG5vdFxuICAgIC8vIGNvbWJpbmluZyBDUFUtaGVhdnkgcHJvY2Vzc2luZyB3aXRoIFNvY2tKUyB0ZXJtaW5hdGlvbiAoZWcgYSBwcm94eSB3aGljaFxuICAgIC8vIGNvbnZlcnRzIHRvIFVuaXggc29ja2V0cykgYnV0IGZvciBub3csIHJhaXNlIHRoZSBkZWxheS5cbiAgICBkaXNjb25uZWN0X2RlbGF5OiA2MCAqIDEwMDAsXG4gICAgLy8gU2V0IHRoZSBVU0VfSlNFU1NJT05JRCBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byBlbmFibGUgc2V0dGluZyB0aGVcbiAgICAvLyBKU0VTU0lPTklEIGNvb2tpZS4gVGhpcyBpcyB1c2VmdWwgZm9yIHNldHRpbmcgdXAgcHJveGllcyB3aXRoXG4gICAgLy8gc2Vzc2lvbiBhZmZpbml0eS5cbiAgICBqc2Vzc2lvbmlkOiAhIXByb2Nlc3MuZW52LlVTRV9KU0VTU0lPTklEXG4gIH07XG5cbiAgLy8gSWYgeW91IGtub3cgeW91ciBzZXJ2ZXIgZW52aXJvbm1lbnQgKGVnLCBwcm94aWVzKSB3aWxsIHByZXZlbnQgd2Vic29ja2V0c1xuICAvLyBmcm9tIGV2ZXIgd29ya2luZywgc2V0ICRESVNBQkxFX1dFQlNPQ0tFVFMgYW5kIFNvY2tKUyBjbGllbnRzIChpZSxcbiAgLy8gYnJvd3NlcnMpIHdpbGwgbm90IHdhc3RlIHRpbWUgYXR0ZW1wdGluZyB0byB1c2UgdGhlbS5cbiAgLy8gKFlvdXIgc2VydmVyIHdpbGwgc3RpbGwgaGF2ZSBhIC93ZWJzb2NrZXQgZW5kcG9pbnQuKVxuICBpZiAocHJvY2Vzcy5lbnYuRElTQUJMRV9XRUJTT0NLRVRTKSB7XG4gICAgc2VydmVyT3B0aW9ucy53ZWJzb2NrZXQgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzZXJ2ZXJPcHRpb25zLmZheWVfc2VydmVyX29wdGlvbnMgPSB7XG4gICAgICBleHRlbnNpb25zOiB3ZWJzb2NrZXRFeHRlbnNpb25zKClcbiAgICB9O1xuICB9XG5cbiAgc2VsZi5zZXJ2ZXIgPSBzb2NranMuY3JlYXRlU2VydmVyKHNlcnZlck9wdGlvbnMpO1xuXG4gIC8vIEluc3RhbGwgdGhlIHNvY2tqcyBoYW5kbGVycywgYnV0IHdlIHdhbnQgdG8ga2VlcCBhcm91bmQgb3VyIG93biBwYXJ0aWN1bGFyXG4gIC8vIHJlcXVlc3QgaGFuZGxlciB0aGF0IGFkanVzdHMgaWRsZSB0aW1lb3V0cyB3aGlsZSB3ZSBoYXZlIGFuIG91dHN0YW5kaW5nXG4gIC8vIHJlcXVlc3QuICBUaGlzIGNvbXBlbnNhdGVzIGZvciB0aGUgZmFjdCB0aGF0IHNvY2tqcyByZW1vdmVzIGFsbCBsaXN0ZW5lcnNcbiAgLy8gZm9yIFwicmVxdWVzdFwiIHRvIGFkZCBpdHMgb3duLlxuICBXZWJBcHAuaHR0cFNlcnZlci5yZW1vdmVMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuICBzZWxmLnNlcnZlci5pbnN0YWxsSGFuZGxlcnMoV2ViQXBwLmh0dHBTZXJ2ZXIpO1xuICBXZWJBcHAuaHR0cFNlcnZlci5hZGRMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuXG4gIC8vIFN1cHBvcnQgdGhlIC93ZWJzb2NrZXQgZW5kcG9pbnRcbiAgc2VsZi5fcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludCgpO1xuXG4gIHNlbGYuc2VydmVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIFdlIHdhbnQgdG8gbWFrZSBzdXJlIHRoYXQgaWYgYSBjbGllbnQgY29ubmVjdHMgdG8gdXMgYW5kIGRvZXMgdGhlIGluaXRpYWxcbiAgICAvLyBXZWJzb2NrZXQgaGFuZHNoYWtlIGJ1dCBuZXZlciBnZXRzIHRvIHRoZSBERFAgaGFuZHNoYWtlLCB0aGF0IHdlXG4gICAgLy8gZXZlbnR1YWxseSBraWxsIHRoZSBzb2NrZXQuICBPbmNlIHRoZSBERFAgaGFuZHNoYWtlIGhhcHBlbnMsIEREUFxuICAgIC8vIGhlYXJ0YmVhdGluZyB3aWxsIHdvcmsuIEFuZCBiZWZvcmUgdGhlIFdlYnNvY2tldCBoYW5kc2hha2UsIHRoZSB0aW1lb3V0c1xuICAgIC8vIHdlIHNldCBhdCB0aGUgc2VydmVyIGxldmVsIGluIHdlYmFwcF9zZXJ2ZXIuanMgd2lsbCB3b3JrLiBCdXRcbiAgICAvLyBmYXllLXdlYnNvY2tldCBjYWxscyBzZXRUaW1lb3V0KDApIG9uIGFueSBzb2NrZXQgaXQgdGFrZXMgb3Zlciwgc28gdGhlcmVcbiAgICAvLyBpcyBhbiBcImluIGJldHdlZW5cIiBzdGF0ZSB3aGVyZSB0aGlzIGRvZXNuJ3QgaGFwcGVuLiAgV2Ugd29yayBhcm91bmQgdGhpc1xuICAgIC8vIGJ5IGV4cGxpY2l0bHkgc2V0dGluZyB0aGUgc29ja2V0IHRpbWVvdXQgdG8gYSByZWxhdGl2ZWx5IGxhcmdlIHRpbWUgaGVyZSxcbiAgICAvLyBhbmQgc2V0dGluZyBpdCBiYWNrIHRvIHplcm8gd2hlbiB3ZSBzZXQgdXAgdGhlIGhlYXJ0YmVhdCBpblxuICAgIC8vIGxpdmVkYXRhX3NlcnZlci5qcy5cbiAgICBzb2NrZXQuc2V0V2Vic29ja2V0VGltZW91dCA9IGZ1bmN0aW9uICh0aW1lb3V0KSB7XG4gICAgICBpZiAoKHNvY2tldC5wcm90b2NvbCA9PT0gJ3dlYnNvY2tldCcgfHxcbiAgICAgICAgICAgc29ja2V0LnByb3RvY29sID09PSAnd2Vic29ja2V0LXJhdycpXG4gICAgICAgICAgJiYgc29ja2V0Ll9zZXNzaW9uLnJlY3YpIHtcbiAgICAgICAgc29ja2V0Ll9zZXNzaW9uLnJlY3YuY29ubmVjdGlvbi5zZXRUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgIH07XG4gICAgc29ja2V0LnNldFdlYnNvY2tldFRpbWVvdXQoNDUgKiAxMDAwKTtcblxuICAgIHNvY2tldC5zZW5kID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHNvY2tldC53cml0ZShkYXRhKTtcbiAgICB9O1xuICAgIHNvY2tldC5vbignY2xvc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLm9wZW5fc29ja2V0cyA9IF8ud2l0aG91dChzZWxmLm9wZW5fc29ja2V0cywgc29ja2V0KTtcbiAgICB9KTtcbiAgICBzZWxmLm9wZW5fc29ja2V0cy5wdXNoKHNvY2tldCk7XG5cbiAgICAvLyBYWFggQ09NUEFUIFdJVEggMC42LjYuIFNlbmQgdGhlIG9sZCBzdHlsZSB3ZWxjb21lIG1lc3NhZ2UsIHdoaWNoXG4gICAgLy8gd2lsbCBmb3JjZSBvbGQgY2xpZW50cyB0byByZWxvYWQuIFJlbW92ZSB0aGlzIG9uY2Ugd2UncmUgbm90XG4gICAgLy8gY29uY2VybmVkIGFib3V0IHBlb3BsZSB1cGdyYWRpbmcgZnJvbSBhIHByZS0wLjcuMCByZWxlYXNlLiBBbHNvLFxuICAgIC8vIHJlbW92ZSB0aGUgY2xhdXNlIGluIHRoZSBjbGllbnQgdGhhdCBpZ25vcmVzIHRoZSB3ZWxjb21lIG1lc3NhZ2VcbiAgICAvLyAobGl2ZWRhdGFfY29ubmVjdGlvbi5qcylcbiAgICBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7c2VydmVyX2lkOiBcIjBcIn0pKTtcblxuICAgIC8vIGNhbGwgYWxsIG91ciBjYWxsYmFja3Mgd2hlbiB3ZSBnZXQgYSBuZXcgc29ja2V0LiB0aGV5IHdpbGwgZG8gdGhlXG4gICAgLy8gd29yayBvZiBzZXR0aW5nIHVwIGhhbmRsZXJzIGFuZCBzdWNoIGZvciBzcGVjaWZpYyBtZXNzYWdlcy5cbiAgICBfLmVhY2goc2VsZi5yZWdpc3RyYXRpb25fY2FsbGJhY2tzLCBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKHNvY2tldCk7XG4gICAgfSk7XG4gIH0pO1xuXG59O1xuXG5fLmV4dGVuZChTdHJlYW1TZXJ2ZXIucHJvdG90eXBlLCB7XG4gIC8vIGNhbGwgbXkgY2FsbGJhY2sgd2hlbiBhIG5ldyBzb2NrZXQgY29ubmVjdHMuXG4gIC8vIGFsc28gY2FsbCBpdCBmb3IgYWxsIGN1cnJlbnQgY29ubmVjdGlvbnMuXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5yZWdpc3RyYXRpb25fY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgIF8uZWFjaChzZWxmLmFsbF9zb2NrZXRzKCksIGZ1bmN0aW9uIChzb2NrZXQpIHtcbiAgICAgIGNhbGxiYWNrKHNvY2tldCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gZ2V0IGEgbGlzdCBvZiBhbGwgc29ja2V0c1xuICBhbGxfc29ja2V0czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gXy52YWx1ZXMoc2VsZi5vcGVuX3NvY2tldHMpO1xuICB9LFxuXG4gIC8vIFJlZGlyZWN0IC93ZWJzb2NrZXQgdG8gL3NvY2tqcy93ZWJzb2NrZXQgaW4gb3JkZXIgdG8gbm90IGV4cG9zZVxuICAvLyBzb2NranMgdG8gY2xpZW50cyB0aGF0IHdhbnQgdG8gdXNlIHJhdyB3ZWJzb2NrZXRzXG4gIF9yZWRpcmVjdFdlYnNvY2tldEVuZHBvaW50OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gVW5mb3J0dW5hdGVseSB3ZSBjYW4ndCB1c2UgYSBjb25uZWN0IG1pZGRsZXdhcmUgaGVyZSBzaW5jZVxuICAgIC8vIHNvY2tqcyBpbnN0YWxscyBpdHNlbGYgcHJpb3IgdG8gYWxsIGV4aXN0aW5nIGxpc3RlbmVyc1xuICAgIC8vIChtZWFuaW5nIHByaW9yIHRvIGFueSBjb25uZWN0IG1pZGRsZXdhcmVzKSBzbyB3ZSBuZWVkIHRvIHRha2VcbiAgICAvLyBhbiBhcHByb2FjaCBzaW1pbGFyIHRvIG92ZXJzaGFkb3dMaXN0ZW5lcnMgaW5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vc29ja2pzL3NvY2tqcy1ub2RlL2Jsb2IvY2Y4MjBjNTVhZjZhOTk1M2UxNjU1ODU1NWEzMWRlY2VhNTU0ZjcwZS9zcmMvdXRpbHMuY29mZmVlXG4gICAgXy5lYWNoKFsncmVxdWVzdCcsICd1cGdyYWRlJ10sIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgaHR0cFNlcnZlciA9IFdlYkFwcC5odHRwU2VydmVyO1xuICAgICAgdmFyIG9sZEh0dHBTZXJ2ZXJMaXN0ZW5lcnMgPSBodHRwU2VydmVyLmxpc3RlbmVycyhldmVudCkuc2xpY2UoMCk7XG4gICAgICBodHRwU2VydmVyLnJlbW92ZUFsbExpc3RlbmVycyhldmVudCk7XG5cbiAgICAgIC8vIHJlcXVlc3QgYW5kIHVwZ3JhZGUgaGF2ZSBkaWZmZXJlbnQgYXJndW1lbnRzIHBhc3NlZCBidXRcbiAgICAgIC8vIHdlIG9ubHkgY2FyZSBhYm91dCB0aGUgZmlyc3Qgb25lIHdoaWNoIGlzIGFsd2F5cyByZXF1ZXN0XG4gICAgICB2YXIgbmV3TGlzdGVuZXIgPSBmdW5jdGlvbihyZXF1ZXN0IC8qLCBtb3JlQXJndW1lbnRzICovKSB7XG4gICAgICAgIC8vIFN0b3JlIGFyZ3VtZW50cyBmb3IgdXNlIHdpdGhpbiB0aGUgY2xvc3VyZSBiZWxvd1xuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAvLyBSZXdyaXRlIC93ZWJzb2NrZXQgYW5kIC93ZWJzb2NrZXQvIHVybHMgdG8gL3NvY2tqcy93ZWJzb2NrZXQgd2hpbGVcbiAgICAgICAgLy8gcHJlc2VydmluZyBxdWVyeSBzdHJpbmcuXG4gICAgICAgIHZhciBwYXJzZWRVcmwgPSB1cmwucGFyc2UocmVxdWVzdC51cmwpO1xuICAgICAgICBpZiAocGFyc2VkVXJsLnBhdGhuYW1lID09PSBwYXRoUHJlZml4ICsgJy93ZWJzb2NrZXQnIHx8XG4gICAgICAgICAgICBwYXJzZWRVcmwucGF0aG5hbWUgPT09IHBhdGhQcmVmaXggKyAnL3dlYnNvY2tldC8nKSB7XG4gICAgICAgICAgcGFyc2VkVXJsLnBhdGhuYW1lID0gc2VsZi5wcmVmaXggKyAnL3dlYnNvY2tldCc7XG4gICAgICAgICAgcmVxdWVzdC51cmwgPSB1cmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKG9sZEh0dHBTZXJ2ZXJMaXN0ZW5lcnMsIGZ1bmN0aW9uKG9sZExpc3RlbmVyKSB7XG4gICAgICAgICAgb2xkTGlzdGVuZXIuYXBwbHkoaHR0cFNlcnZlciwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGh0dHBTZXJ2ZXIuYWRkTGlzdGVuZXIoZXZlbnQsIG5ld0xpc3RlbmVyKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJERFBTZXJ2ZXIgPSB7fTtcblxudmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xuXG4vLyBUaGlzIGZpbGUgY29udGFpbnMgY2xhc3Nlczpcbi8vICogU2Vzc2lvbiAtIFRoZSBzZXJ2ZXIncyBjb25uZWN0aW9uIHRvIGEgc2luZ2xlIEREUCBjbGllbnRcbi8vICogU3Vic2NyaXB0aW9uIC0gQSBzaW5nbGUgc3Vic2NyaXB0aW9uIGZvciBhIHNpbmdsZSBjbGllbnRcbi8vICogU2VydmVyIC0gQW4gZW50aXJlIHNlcnZlciB0aGF0IG1heSB0YWxrIHRvID4gMSBjbGllbnQuIEEgRERQIGVuZHBvaW50LlxuLy9cbi8vIFNlc3Npb24gYW5kIFN1YnNjcmlwdGlvbiBhcmUgZmlsZSBzY29wZS4gRm9yIG5vdywgdW50aWwgd2UgZnJlZXplXG4vLyB0aGUgaW50ZXJmYWNlLCBTZXJ2ZXIgaXMgcGFja2FnZSBzY29wZSAoaW4gdGhlIGZ1dHVyZSBpdCBzaG91bGQgYmVcbi8vIGV4cG9ydGVkLilcblxuLy8gUmVwcmVzZW50cyBhIHNpbmdsZSBkb2N1bWVudCBpbiBhIFNlc3Npb25Db2xsZWN0aW9uVmlld1xudmFyIFNlc3Npb25Eb2N1bWVudFZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5leGlzdHNJbiA9IHt9OyAvLyBzZXQgb2Ygc3Vic2NyaXB0aW9uSGFuZGxlXG4gIHNlbGYuZGF0YUJ5S2V5ID0ge307IC8vIGtleS0+IFsge3N1YnNjcmlwdGlvbkhhbmRsZSwgdmFsdWV9IGJ5IHByZWNlZGVuY2VdXG59O1xuXG5ERFBTZXJ2ZXIuX1Nlc3Npb25Eb2N1bWVudFZpZXcgPSBTZXNzaW9uRG9jdW1lbnRWaWV3O1xuXG5cbl8uZXh0ZW5kKFNlc3Npb25Eb2N1bWVudFZpZXcucHJvdG90eXBlLCB7XG5cbiAgZ2V0RmllbGRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB7fTtcbiAgICBfLmVhY2goc2VsZi5kYXRhQnlLZXksIGZ1bmN0aW9uIChwcmVjZWRlbmNlTGlzdCwga2V5KSB7XG4gICAgICByZXRba2V5XSA9IHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgY2xlYXJGaWVsZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCBjaGFuZ2VDb2xsZWN0b3IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHVibGlzaCBBUEkgaWdub3JlcyBfaWQgaWYgcHJlc2VudCBpbiBmaWVsZHNcbiAgICBpZiAoa2V5ID09PSBcIl9pZFwiKVxuICAgICAgcmV0dXJuO1xuICAgIHZhciBwcmVjZWRlbmNlTGlzdCA9IHNlbGYuZGF0YUJ5S2V5W2tleV07XG5cbiAgICAvLyBJdCdzIG9rYXkgdG8gY2xlYXIgZmllbGRzIHRoYXQgZGlkbid0IGV4aXN0LiBObyBuZWVkIHRvIHRocm93XG4gICAgLy8gYW4gZXJyb3IuXG4gICAgaWYgKCFwcmVjZWRlbmNlTGlzdClcbiAgICAgIHJldHVybjtcblxuICAgIHZhciByZW1vdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVjZWRlbmNlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHByZWNlZGVuY2UgPSBwcmVjZWRlbmNlTGlzdFtpXTtcbiAgICAgIGlmIChwcmVjZWRlbmNlLnN1YnNjcmlwdGlvbkhhbmRsZSA9PT0gc3Vic2NyaXB0aW9uSGFuZGxlKSB7XG4gICAgICAgIC8vIFRoZSB2aWV3J3MgdmFsdWUgY2FuIG9ubHkgY2hhbmdlIGlmIHRoaXMgc3Vic2NyaXB0aW9uIGlzIHRoZSBvbmUgdGhhdFxuICAgICAgICAvLyB1c2VkIHRvIGhhdmUgcHJlY2VkZW5jZS5cbiAgICAgICAgaWYgKGkgPT09IDApXG4gICAgICAgICAgcmVtb3ZlZFZhbHVlID0gcHJlY2VkZW5jZS52YWx1ZTtcbiAgICAgICAgcHJlY2VkZW5jZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKF8uaXNFbXB0eShwcmVjZWRlbmNlTGlzdCkpIHtcbiAgICAgIGRlbGV0ZSBzZWxmLmRhdGFCeUtleVtrZXldO1xuICAgICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChyZW1vdmVkVmFsdWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgIUVKU09OLmVxdWFscyhyZW1vdmVkVmFsdWUsIHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlKSkge1xuICAgICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSBwcmVjZWRlbmNlTGlzdFswXS52YWx1ZTtcbiAgICB9XG4gIH0sXG5cbiAgY2hhbmdlRmllbGQ6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29sbGVjdG9yLCBpc0FkZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBQdWJsaXNoIEFQSSBpZ25vcmVzIF9pZCBpZiBwcmVzZW50IGluIGZpZWxkc1xuICAgIGlmIChrZXkgPT09IFwiX2lkXCIpXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBEb24ndCBzaGFyZSBzdGF0ZSB3aXRoIHRoZSBkYXRhIHBhc3NlZCBpbiBieSB0aGUgdXNlci5cbiAgICB2YWx1ZSA9IEVKU09OLmNsb25lKHZhbHVlKTtcblxuICAgIGlmICghXy5oYXMoc2VsZi5kYXRhQnlLZXksIGtleSkpIHtcbiAgICAgIHNlbGYuZGF0YUJ5S2V5W2tleV0gPSBbe3N1YnNjcmlwdGlvbkhhbmRsZTogc3Vic2NyaXB0aW9uSGFuZGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlfV07XG4gICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHZhbHVlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcHJlY2VkZW5jZUxpc3QgPSBzZWxmLmRhdGFCeUtleVtrZXldO1xuICAgIHZhciBlbHQ7XG4gICAgaWYgKCFpc0FkZCkge1xuICAgICAgZWx0ID0gXy5maW5kKHByZWNlZGVuY2VMaXN0LCBmdW5jdGlvbiAocHJlY2VkZW5jZSkge1xuICAgICAgICByZXR1cm4gcHJlY2VkZW5jZS5zdWJzY3JpcHRpb25IYW5kbGUgPT09IHN1YnNjcmlwdGlvbkhhbmRsZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChlbHQpIHtcbiAgICAgIGlmIChlbHQgPT09IHByZWNlZGVuY2VMaXN0WzBdICYmICFFSlNPTi5lcXVhbHModmFsdWUsIGVsdC52YWx1ZSkpIHtcbiAgICAgICAgLy8gdGhpcyBzdWJzY3JpcHRpb24gaXMgY2hhbmdpbmcgdGhlIHZhbHVlIG9mIHRoaXMgZmllbGQuXG4gICAgICAgIGNoYW5nZUNvbGxlY3RvcltrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICBlbHQudmFsdWUgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcyBzdWJzY3JpcHRpb24gaXMgbmV3bHkgY2FyaW5nIGFib3V0IHRoaXMgZmllbGRcbiAgICAgIHByZWNlZGVuY2VMaXN0LnB1c2goe3N1YnNjcmlwdGlvbkhhbmRsZTogc3Vic2NyaXB0aW9uSGFuZGxlLCB2YWx1ZTogdmFsdWV9KTtcbiAgICB9XG5cbiAgfVxufSk7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNsaWVudCdzIHZpZXcgb2YgYSBzaW5nbGUgY29sbGVjdGlvblxuICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb25OYW1lIE5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gaXQgcmVwcmVzZW50c1xuICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgRnVuY3Rpb24+fSBzZXNzaW9uQ2FsbGJhY2tzIFRoZSBjYWxsYmFja3MgZm9yIGFkZGVkLCBjaGFuZ2VkLCByZW1vdmVkXG4gKiBAY2xhc3MgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3XG4gKi9cbnZhciBTZXNzaW9uQ29sbGVjdGlvblZpZXcgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlc3Npb25DYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gIHNlbGYuZG9jdW1lbnRzID0ge307XG4gIHNlbGYuY2FsbGJhY2tzID0gc2Vzc2lvbkNhbGxiYWNrcztcbn07XG5cbkREUFNlcnZlci5fU2Vzc2lvbkNvbGxlY3Rpb25WaWV3ID0gU2Vzc2lvbkNvbGxlY3Rpb25WaWV3O1xuXG5cbl8uZXh0ZW5kKFNlc3Npb25Db2xsZWN0aW9uVmlldy5wcm90b3R5cGUsIHtcblxuICBpc0VtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBfLmlzRW1wdHkoc2VsZi5kb2N1bWVudHMpO1xuICB9LFxuXG4gIGRpZmY6IGZ1bmN0aW9uIChwcmV2aW91cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMocHJldmlvdXMuZG9jdW1lbnRzLCBzZWxmLmRvY3VtZW50cywge1xuICAgICAgYm90aDogXy5iaW5kKHNlbGYuZGlmZkRvY3VtZW50LCBzZWxmKSxcblxuICAgICAgcmlnaHRPbmx5OiBmdW5jdGlvbiAoaWQsIG5vd0RWKSB7XG4gICAgICAgIHNlbGYuY2FsbGJhY2tzLmFkZGVkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBub3dEVi5nZXRGaWVsZHMoKSk7XG4gICAgICB9LFxuXG4gICAgICBsZWZ0T25seTogZnVuY3Rpb24gKGlkLCBwcmV2RFYpIHtcbiAgICAgICAgc2VsZi5jYWxsYmFja3MucmVtb3ZlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgZGlmZkRvY3VtZW50OiBmdW5jdGlvbiAoaWQsIHByZXZEViwgbm93RFYpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcyA9IHt9O1xuICAgIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhwcmV2RFYuZ2V0RmllbGRzKCksIG5vd0RWLmdldEZpZWxkcygpLCB7XG4gICAgICBib3RoOiBmdW5jdGlvbiAoa2V5LCBwcmV2LCBub3cpIHtcbiAgICAgICAgaWYgKCFFSlNPTi5lcXVhbHMocHJldiwgbm93KSlcbiAgICAgICAgICBmaWVsZHNba2V5XSA9IG5vdztcbiAgICAgIH0sXG4gICAgICByaWdodE9ubHk6IGZ1bmN0aW9uIChrZXksIG5vdykge1xuICAgICAgICBmaWVsZHNba2V5XSA9IG5vdztcbiAgICAgIH0sXG4gICAgICBsZWZ0T25seTogZnVuY3Rpb24oa2V5LCBwcmV2KSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHNlbGYuY2FsbGJhY2tzLmNoYW5nZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgYWRkZWQ6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25IYW5kbGUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRvY1ZpZXcgPSBzZWxmLmRvY3VtZW50c1tpZF07XG4gICAgdmFyIGFkZGVkID0gZmFsc2U7XG4gICAgaWYgKCFkb2NWaWV3KSB7XG4gICAgICBhZGRlZCA9IHRydWU7XG4gICAgICBkb2NWaWV3ID0gbmV3IFNlc3Npb25Eb2N1bWVudFZpZXcoKTtcbiAgICAgIHNlbGYuZG9jdW1lbnRzW2lkXSA9IGRvY1ZpZXc7XG4gICAgfVxuICAgIGRvY1ZpZXcuZXhpc3RzSW5bc3Vic2NyaXB0aW9uSGFuZGxlXSA9IHRydWU7XG4gICAgdmFyIGNoYW5nZUNvbGxlY3RvciA9IHt9O1xuICAgIF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICBkb2NWaWV3LmNoYW5nZUZpZWxkKFxuICAgICAgICBzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgdmFsdWUsIGNoYW5nZUNvbGxlY3RvciwgdHJ1ZSk7XG4gICAgfSk7XG4gICAgaWYgKGFkZGVkKVxuICAgICAgc2VsZi5jYWxsYmFja3MuYWRkZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNoYW5nZUNvbGxlY3Rvcik7XG4gICAgZWxzZVxuICAgICAgc2VsZi5jYWxsYmFja3MuY2hhbmdlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2hhbmdlQ29sbGVjdG9yKTtcbiAgfSxcblxuICBjaGFuZ2VkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgY2hhbmdlZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2hhbmdlZFJlc3VsdCA9IHt9O1xuICAgIHZhciBkb2NWaWV3ID0gc2VsZi5kb2N1bWVudHNbaWRdO1xuICAgIGlmICghZG9jVmlldylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGVsZW1lbnQgd2l0aCBpZCBcIiArIGlkICsgXCIgdG8gY2hhbmdlXCIpO1xuICAgIF8uZWFjaChjaGFuZ2VkLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpXG4gICAgICAgIGRvY1ZpZXcuY2xlYXJGaWVsZChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgY2hhbmdlZFJlc3VsdCk7XG4gICAgICBlbHNlXG4gICAgICAgIGRvY1ZpZXcuY2hhbmdlRmllbGQoc3Vic2NyaXB0aW9uSGFuZGxlLCBrZXksIHZhbHVlLCBjaGFuZ2VkUmVzdWx0KTtcbiAgICB9KTtcbiAgICBzZWxmLmNhbGxiYWNrcy5jaGFuZ2VkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VkUmVzdWx0KTtcbiAgfSxcblxuICByZW1vdmVkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZG9jVmlldyA9IHNlbGYuZG9jdW1lbnRzW2lkXTtcbiAgICBpZiAoIWRvY1ZpZXcpIHtcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoXCJSZW1vdmVkIG5vbmV4aXN0ZW50IGRvY3VtZW50IFwiICsgaWQpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgICBkZWxldGUgZG9jVmlldy5leGlzdHNJbltzdWJzY3JpcHRpb25IYW5kbGVdO1xuICAgIGlmIChfLmlzRW1wdHkoZG9jVmlldy5leGlzdHNJbikpIHtcbiAgICAgIC8vIGl0IGlzIGdvbmUgZnJvbSBldmVyeW9uZVxuICAgICAgc2VsZi5jYWxsYmFja3MucmVtb3ZlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgICBkZWxldGUgc2VsZi5kb2N1bWVudHNbaWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY2hhbmdlZCA9IHt9O1xuICAgICAgLy8gcmVtb3ZlIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gZXZlcnkgcHJlY2VkZW5jZSBsaXN0XG4gICAgICAvLyBhbmQgcmVjb3JkIHRoZSBjaGFuZ2VzXG4gICAgICBfLmVhY2goZG9jVmlldy5kYXRhQnlLZXksIGZ1bmN0aW9uIChwcmVjZWRlbmNlTGlzdCwga2V5KSB7XG4gICAgICAgIGRvY1ZpZXcuY2xlYXJGaWVsZChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgY2hhbmdlZCk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5jYWxsYmFja3MuY2hhbmdlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2hhbmdlZCk7XG4gICAgfVxuICB9XG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFNlc3Npb24gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG52YXIgU2Vzc2lvbiA9IGZ1bmN0aW9uIChzZXJ2ZXIsIHZlcnNpb24sIHNvY2tldCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuaWQgPSBSYW5kb20uaWQoKTtcblxuICBzZWxmLnNlcnZlciA9IHNlcnZlcjtcbiAgc2VsZi52ZXJzaW9uID0gdmVyc2lvbjtcblxuICBzZWxmLmluaXRpYWxpemVkID0gZmFsc2U7XG4gIHNlbGYuc29ja2V0ID0gc29ja2V0O1xuXG4gIC8vIHNldCB0byBudWxsIHdoZW4gdGhlIHNlc3Npb24gaXMgZGVzdHJveWVkLiBtdWx0aXBsZSBwbGFjZXMgYmVsb3dcbiAgLy8gdXNlIHRoaXMgdG8gZGV0ZXJtaW5lIGlmIHRoZSBzZXNzaW9uIGlzIGFsaXZlIG9yIG5vdC5cbiAgc2VsZi5pblF1ZXVlID0gbmV3IE1ldGVvci5fRG91YmxlRW5kZWRRdWV1ZSgpO1xuXG4gIHNlbGYuYmxvY2tlZCA9IGZhbHNlO1xuICBzZWxmLndvcmtlclJ1bm5pbmcgPSBmYWxzZTtcblxuICAvLyBTdWIgb2JqZWN0cyBmb3IgYWN0aXZlIHN1YnNjcmlwdGlvbnNcbiAgc2VsZi5fbmFtZWRTdWJzID0ge307XG4gIHNlbGYuX3VuaXZlcnNhbFN1YnMgPSBbXTtcblxuICBzZWxmLnVzZXJJZCA9IG51bGw7XG5cbiAgc2VsZi5jb2xsZWN0aW9uVmlld3MgPSB7fTtcblxuICAvLyBTZXQgdGhpcyB0byBmYWxzZSB0byBub3Qgc2VuZCBtZXNzYWdlcyB3aGVuIGNvbGxlY3Rpb25WaWV3cyBhcmVcbiAgLy8gbW9kaWZpZWQuIFRoaXMgaXMgZG9uZSB3aGVuIHJlcnVubmluZyBzdWJzIGluIF9zZXRVc2VySWQgYW5kIHRob3NlIG1lc3NhZ2VzXG4gIC8vIGFyZSBjYWxjdWxhdGVkIHZpYSBhIGRpZmYgaW5zdGVhZC5cbiAgc2VsZi5faXNTZW5kaW5nID0gdHJ1ZTtcblxuICAvLyBJZiB0aGlzIGlzIHRydWUsIGRvbid0IHN0YXJ0IGEgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgcHVibGlzaGVyIG9uIHRoaXNcbiAgLy8gc2Vzc2lvbi4gVGhlIHNlc3Npb24gd2lsbCB0YWtlIGNhcmUgb2Ygc3RhcnRpbmcgaXQgd2hlbiBhcHByb3ByaWF0ZS5cbiAgc2VsZi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3VicyA9IGZhbHNlO1xuXG4gIC8vIHdoZW4gd2UgYXJlIHJlcnVubmluZyBzdWJzY3JpcHRpb25zLCBhbnkgcmVhZHkgbWVzc2FnZXNcbiAgLy8gd2Ugd2FudCB0byBidWZmZXIgdXAgZm9yIHdoZW4gd2UgYXJlIGRvbmUgcmVydW5uaW5nIHN1YnNjcmlwdGlvbnNcbiAgc2VsZi5fcGVuZGluZ1JlYWR5ID0gW107XG5cbiAgLy8gTGlzdCBvZiBjYWxsYmFja3MgdG8gY2FsbCB3aGVuIHRoaXMgY29ubmVjdGlvbiBpcyBjbG9zZWQuXG4gIHNlbGYuX2Nsb3NlQ2FsbGJhY2tzID0gW107XG5cblxuICAvLyBYWFggSEFDSzogSWYgYSBzb2NranMgY29ubmVjdGlvbiwgc2F2ZSBvZmYgdGhlIFVSTC4gVGhpcyBpc1xuICAvLyB0ZW1wb3JhcnkgYW5kIHdpbGwgZ28gYXdheSBpbiB0aGUgbmVhciBmdXR1cmUuXG4gIHNlbGYuX3NvY2tldFVybCA9IHNvY2tldC51cmw7XG5cbiAgLy8gQWxsb3cgdGVzdHMgdG8gZGlzYWJsZSByZXNwb25kaW5nIHRvIHBpbmdzLlxuICBzZWxmLl9yZXNwb25kVG9QaW5ncyA9IG9wdGlvbnMucmVzcG9uZFRvUGluZ3M7XG5cbiAgLy8gVGhpcyBvYmplY3QgaXMgdGhlIHB1YmxpYyBpbnRlcmZhY2UgdG8gdGhlIHNlc3Npb24uIEluIHRoZSBwdWJsaWNcbiAgLy8gQVBJLCBpdCBpcyBjYWxsZWQgdGhlIGBjb25uZWN0aW9uYCBvYmplY3QuICBJbnRlcm5hbGx5IHdlIGNhbGwgaXRcbiAgLy8gYSBgY29ubmVjdGlvbkhhbmRsZWAgdG8gYXZvaWQgYW1iaWd1aXR5LlxuICBzZWxmLmNvbm5lY3Rpb25IYW5kbGUgPSB7XG4gICAgaWQ6IHNlbGYuaWQsXG4gICAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuY2xvc2UoKTtcbiAgICB9LFxuICAgIG9uQ2xvc2U6IGZ1bmN0aW9uIChmbikge1xuICAgICAgdmFyIGNiID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmbiwgXCJjb25uZWN0aW9uIG9uQ2xvc2UgY2FsbGJhY2tcIik7XG4gICAgICBpZiAoc2VsZi5pblF1ZXVlKSB7XG4gICAgICAgIHNlbGYuX2Nsb3NlQ2FsbGJhY2tzLnB1c2goY2IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UncmUgYWxyZWFkeSBjbG9zZWQsIGNhbGwgdGhlIGNhbGxiYWNrLlxuICAgICAgICBNZXRlb3IuZGVmZXIoY2IpO1xuICAgICAgfVxuICAgIH0sXG4gICAgY2xpZW50QWRkcmVzczogc2VsZi5fY2xpZW50QWRkcmVzcygpLFxuICAgIGh0dHBIZWFkZXJzOiBzZWxmLnNvY2tldC5oZWFkZXJzXG4gIH07XG5cbiAgc2VsZi5zZW5kKHsgbXNnOiAnY29ubmVjdGVkJywgc2Vzc2lvbjogc2VsZi5pZCB9KTtcblxuICAvLyBPbiBpbml0aWFsIGNvbm5lY3QsIHNwaW4gdXAgYWxsIHRoZSB1bml2ZXJzYWwgcHVibGlzaGVycy5cbiAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuc3RhcnRVbml2ZXJzYWxTdWJzKCk7XG4gIH0pLnJ1bigpO1xuXG4gIGlmICh2ZXJzaW9uICE9PSAncHJlMScgJiYgb3B0aW9ucy5oZWFydGJlYXRJbnRlcnZhbCAhPT0gMCkge1xuICAgIC8vIFdlIG5vIGxvbmdlciBuZWVkIHRoZSBsb3cgbGV2ZWwgdGltZW91dCBiZWNhdXNlIHdlIGhhdmUgaGVhcnRiZWF0aW5nLlxuICAgIHNvY2tldC5zZXRXZWJzb2NrZXRUaW1lb3V0KDApO1xuXG4gICAgc2VsZi5oZWFydGJlYXQgPSBuZXcgRERQQ29tbW9uLkhlYXJ0YmVhdCh7XG4gICAgICBoZWFydGJlYXRJbnRlcnZhbDogb3B0aW9ucy5oZWFydGJlYXRJbnRlcnZhbCxcbiAgICAgIGhlYXJ0YmVhdFRpbWVvdXQ6IG9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCxcbiAgICAgIG9uVGltZW91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmNsb3NlKCk7XG4gICAgICB9LFxuICAgICAgc2VuZFBpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5zZW5kKHttc2c6ICdwaW5nJ30pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHNlbGYuaGVhcnRiZWF0LnN0YXJ0KCk7XG4gIH1cblxuICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICBcImxpdmVkYXRhXCIsIFwic2Vzc2lvbnNcIiwgMSk7XG59O1xuXG5fLmV4dGVuZChTZXNzaW9uLnByb3RvdHlwZSwge1xuXG4gIHNlbmRSZWFkeTogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbklkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNTZW5kaW5nKVxuICAgICAgc2VsZi5zZW5kKHttc2c6IFwicmVhZHlcIiwgc3Viczogc3Vic2NyaXB0aW9uSWRzfSk7XG4gICAgZWxzZSB7XG4gICAgICBfLmVhY2goc3Vic2NyaXB0aW9uSWRzLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSWQpIHtcbiAgICAgICAgc2VsZi5fcGVuZGluZ1JlYWR5LnB1c2goc3Vic2NyaXB0aW9uSWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNlbmRBZGRlZDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc1NlbmRpbmcpXG4gICAgICBzZWxmLnNlbmQoe21zZzogXCJhZGRlZFwiLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IGlkLCBmaWVsZHM6IGZpZWxkc30pO1xuICB9LFxuXG4gIHNlbmRDaGFuZ2VkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKF8uaXNFbXB0eShmaWVsZHMpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHNlbGYuX2lzU2VuZGluZykge1xuICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgbXNnOiBcImNoYW5nZWRcIixcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBzZW5kUmVtb3ZlZDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNTZW5kaW5nKVxuICAgICAgc2VsZi5zZW5kKHttc2c6IFwicmVtb3ZlZFwiLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IGlkfSk7XG4gIH0sXG5cbiAgZ2V0U2VuZENhbGxiYWNrczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgYWRkZWQ6IF8uYmluZChzZWxmLnNlbmRBZGRlZCwgc2VsZiksXG4gICAgICBjaGFuZ2VkOiBfLmJpbmQoc2VsZi5zZW5kQ2hhbmdlZCwgc2VsZiksXG4gICAgICByZW1vdmVkOiBfLmJpbmQoc2VsZi5zZW5kUmVtb3ZlZCwgc2VsZilcbiAgICB9O1xuICB9LFxuXG4gIGdldENvbGxlY3Rpb25WaWV3OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKF8uaGFzKHNlbGYuY29sbGVjdGlvblZpZXdzLCBjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgIHJldHVybiBzZWxmLmNvbGxlY3Rpb25WaWV3c1tjb2xsZWN0aW9uTmFtZV07XG4gICAgfVxuICAgIHZhciByZXQgPSBuZXcgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZ2V0U2VuZENhbGxiYWNrcygpKTtcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3c1tjb2xsZWN0aW9uTmFtZV0gPSByZXQ7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBhZGRlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZpZXcgPSBzZWxmLmdldENvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lKTtcbiAgICB2aWV3LmFkZGVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgcmVtb3ZlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2aWV3ID0gc2VsZi5nZXRDb2xsZWN0aW9uVmlldyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgdmlldy5yZW1vdmVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQpO1xuICAgIGlmICh2aWV3LmlzRW1wdHkoKSkge1xuICAgICAgZGVsZXRlIHNlbGYuY29sbGVjdGlvblZpZXdzW2NvbGxlY3Rpb25OYW1lXTtcbiAgICB9XG4gIH0sXG5cbiAgY2hhbmdlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZpZXcgPSBzZWxmLmdldENvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lKTtcbiAgICB2aWV3LmNoYW5nZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICBzdGFydFVuaXZlcnNhbFN1YnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY29weSBvZiB0aGUgc2V0IG9mIHVuaXZlcnNhbCBoYW5kbGVycyBhbmQgc3RhcnQgdGhlbS4gSWZcbiAgICAvLyBhZGRpdGlvbmFsIHVuaXZlcnNhbCBwdWJsaXNoZXJzIHN0YXJ0IHdoaWxlIHdlJ3JlIHJ1bm5pbmcgdGhlbSAoZHVlIHRvXG4gICAgLy8geWllbGRpbmcpLCB0aGV5IHdpbGwgcnVuIHNlcGFyYXRlbHkgYXMgcGFydCBvZiBTZXJ2ZXIucHVibGlzaC5cbiAgICB2YXIgaGFuZGxlcnMgPSBfLmNsb25lKHNlbGYuc2VydmVyLnVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzKTtcbiAgICBfLmVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICBzZWxmLl9zdGFydFN1YnNjcmlwdGlvbihoYW5kbGVyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBEZXN0cm95IHRoaXMgc2Vzc2lvbiBhbmQgdW5yZWdpc3RlciBpdCBhdCB0aGUgc2VydmVyLlxuICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIERlc3Ryb3kgdGhpcyBzZXNzaW9uLCBldmVuIGlmIGl0J3Mgbm90IHJlZ2lzdGVyZWQgYXQgdGhlXG4gICAgLy8gc2VydmVyLiBTdG9wIGFsbCBwcm9jZXNzaW5nIGFuZCB0ZWFyIGV2ZXJ5dGhpbmcgZG93bi4gSWYgYSBzb2NrZXRcbiAgICAvLyB3YXMgYXR0YWNoZWQsIGNsb3NlIGl0LlxuXG4gICAgLy8gQWxyZWFkeSBkZXN0cm95ZWQuXG4gICAgaWYgKCEgc2VsZi5pblF1ZXVlKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gRHJvcCB0aGUgbWVyZ2UgYm94IGRhdGEgaW1tZWRpYXRlbHkuXG4gICAgc2VsZi5pblF1ZXVlID0gbnVsbDtcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IHt9O1xuXG4gICAgaWYgKHNlbGYuaGVhcnRiZWF0KSB7XG4gICAgICBzZWxmLmhlYXJ0YmVhdC5zdG9wKCk7XG4gICAgICBzZWxmLmhlYXJ0YmVhdCA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuc29ja2V0KSB7XG4gICAgICBzZWxmLnNvY2tldC5jbG9zZSgpO1xuICAgICAgc2VsZi5zb2NrZXQuX21ldGVvclNlc3Npb24gPSBudWxsO1xuICAgIH1cblxuICAgIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJsaXZlZGF0YVwiLCBcInNlc3Npb25zXCIsIC0xKTtcblxuICAgIE1ldGVvci5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBzdG9wIGNhbGxiYWNrcyBjYW4geWllbGQsIHNvIHdlIGRlZmVyIHRoaXMgb24gY2xvc2UuXG4gICAgICAvLyBzdWIuX2lzRGVhY3RpdmF0ZWQoKSBkZXRlY3RzIHRoYXQgd2Ugc2V0IGluUXVldWUgdG8gbnVsbCBhbmRcbiAgICAgIC8vIHRyZWF0cyBpdCBhcyBzZW1pLWRlYWN0aXZhdGVkIChpdCB3aWxsIGlnbm9yZSBpbmNvbWluZyBjYWxsYmFja3MsIGV0YykuXG4gICAgICBzZWxmLl9kZWFjdGl2YXRlQWxsU3Vic2NyaXB0aW9ucygpO1xuXG4gICAgICAvLyBEZWZlciBjYWxsaW5nIHRoZSBjbG9zZSBjYWxsYmFja3MsIHNvIHRoYXQgdGhlIGNhbGxlciBjbG9zaW5nXG4gICAgICAvLyB0aGUgc2Vzc2lvbiBpc24ndCB3YWl0aW5nIGZvciBhbGwgdGhlIGNhbGxiYWNrcyB0byBjb21wbGV0ZS5cbiAgICAgIF8uZWFjaChzZWxmLl9jbG9zZUNhbGxiYWNrcywgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIFVucmVnaXN0ZXIgdGhlIHNlc3Npb24uXG4gICAgc2VsZi5zZXJ2ZXIuX3JlbW92ZVNlc3Npb24oc2VsZik7XG4gIH0sXG5cbiAgLy8gU2VuZCBhIG1lc3NhZ2UgKGRvaW5nIG5vdGhpbmcgaWYgbm8gc29ja2V0IGlzIGNvbm5lY3RlZCByaWdodCBub3cuKVxuICAvLyBJdCBzaG91bGQgYmUgYSBKU09OIG9iamVjdCAoaXQgd2lsbCBiZSBzdHJpbmdpZmllZC4pXG4gIHNlbmQ6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuc29ja2V0KSB7XG4gICAgICBpZiAoTWV0ZW9yLl9wcmludFNlbnRERFApXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJTZW50IEREUFwiLCBERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgICAgc2VsZi5zb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgIH1cbiAgfSxcblxuICAvLyBTZW5kIGEgY29ubmVjdGlvbiBlcnJvci5cbiAgc2VuZEVycm9yOiBmdW5jdGlvbiAocmVhc29uLCBvZmZlbmRpbmdNZXNzYWdlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtc2cgPSB7bXNnOiAnZXJyb3InLCByZWFzb246IHJlYXNvbn07XG4gICAgaWYgKG9mZmVuZGluZ01lc3NhZ2UpXG4gICAgICBtc2cub2ZmZW5kaW5nTWVzc2FnZSA9IG9mZmVuZGluZ01lc3NhZ2U7XG4gICAgc2VsZi5zZW5kKG1zZyk7XG4gIH0sXG5cbiAgLy8gUHJvY2VzcyAnbXNnJyBhcyBhbiBpbmNvbWluZyBtZXNzYWdlLiAoQnV0IGFzIGEgZ3VhcmQgYWdhaW5zdFxuICAvLyByYWNlIGNvbmRpdGlvbnMgZHVyaW5nIHJlY29ubmVjdGlvbiwgaWdub3JlIHRoZSBtZXNzYWdlIGlmXG4gIC8vICdzb2NrZXQnIGlzIG5vdCB0aGUgY3VycmVudGx5IGNvbm5lY3RlZCBzb2NrZXQuKVxuICAvL1xuICAvLyBXZSBydW4gdGhlIG1lc3NhZ2VzIGZyb20gdGhlIGNsaWVudCBvbmUgYXQgYSB0aW1lLCBpbiB0aGUgb3JkZXJcbiAgLy8gZ2l2ZW4gYnkgdGhlIGNsaWVudC4gVGhlIG1lc3NhZ2UgaGFuZGxlciBpcyBwYXNzZWQgYW4gaWRlbXBvdGVudFxuICAvLyBmdW5jdGlvbiAndW5ibG9jaycgd2hpY2ggaXQgbWF5IGNhbGwgdG8gYWxsb3cgb3RoZXIgbWVzc2FnZXMgdG9cbiAgLy8gYmVnaW4gcnVubmluZyBpbiBwYXJhbGxlbCBpbiBhbm90aGVyIGZpYmVyIChmb3IgZXhhbXBsZSwgYSBtZXRob2RcbiAgLy8gdGhhdCB3YW50cyB0byB5aWVsZC4pIE90aGVyd2lzZSwgaXQgaXMgYXV0b21hdGljYWxseSB1bmJsb2NrZWRcbiAgLy8gd2hlbiBpdCByZXR1cm5zLlxuICAvL1xuICAvLyBBY3R1YWxseSwgd2UgZG9uJ3QgaGF2ZSB0byAndG90YWxseSBvcmRlcicgdGhlIG1lc3NhZ2VzIGluIHRoaXNcbiAgLy8gd2F5LCBidXQgaXQncyB0aGUgZWFzaWVzdCB0aGluZyB0aGF0J3MgY29ycmVjdC4gKHVuc3ViIG5lZWRzIHRvXG4gIC8vIGJlIG9yZGVyZWQgYWdhaW5zdCBzdWIsIG1ldGhvZHMgbmVlZCB0byBiZSBvcmRlcmVkIGFnYWluc3QgZWFjaFxuICAvLyBvdGhlci4pXG4gIHByb2Nlc3NNZXNzYWdlOiBmdW5jdGlvbiAobXNnX2luKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5pblF1ZXVlKSAvLyB3ZSBoYXZlIGJlZW4gZGVzdHJveWVkLlxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gUmVzcG9uZCB0byBwaW5nIGFuZCBwb25nIG1lc3NhZ2VzIGltbWVkaWF0ZWx5IHdpdGhvdXQgcXVldWluZy5cbiAgICAvLyBJZiB0aGUgbmVnb3RpYXRlZCBERFAgdmVyc2lvbiBpcyBcInByZTFcIiB3aGljaCBkaWRuJ3Qgc3VwcG9ydFxuICAgIC8vIHBpbmdzLCBwcmVzZXJ2ZSB0aGUgXCJwcmUxXCIgYmVoYXZpb3Igb2YgcmVzcG9uZGluZyB3aXRoIGEgXCJiYWRcbiAgICAvLyByZXF1ZXN0XCIgZm9yIHRoZSB1bmtub3duIG1lc3NhZ2VzLlxuICAgIC8vXG4gICAgLy8gRmliZXJzIGFyZSBuZWVkZWQgYmVjYXVzZSBoZWFydGJlYXQgdXNlcyBNZXRlb3Iuc2V0VGltZW91dCwgd2hpY2hcbiAgICAvLyBuZWVkcyBhIEZpYmVyLiBXZSBjb3VsZCBhY3R1YWxseSB1c2UgcmVndWxhciBzZXRUaW1lb3V0IGFuZCBhdm9pZFxuICAgIC8vIHRoZXNlIG5ldyBmaWJlcnMsIGJ1dCBpdCBpcyBlYXNpZXIgdG8ganVzdCBtYWtlIGV2ZXJ5dGhpbmcgdXNlXG4gICAgLy8gTWV0ZW9yLnNldFRpbWVvdXQgYW5kIG5vdCB0aGluayB0b28gaGFyZC5cbiAgICAvL1xuICAgIC8vIEFueSBtZXNzYWdlIGNvdW50cyBhcyByZWNlaXZpbmcgYSBwb25nLCBhcyBpdCBkZW1vbnN0cmF0ZXMgdGhhdFxuICAgIC8vIHRoZSBjbGllbnQgaXMgc3RpbGwgYWxpdmUuXG4gICAgaWYgKHNlbGYuaGVhcnRiZWF0KSB7XG4gICAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuaGVhcnRiZWF0Lm1lc3NhZ2VSZWNlaXZlZCgpO1xuICAgICAgfSkucnVuKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYudmVyc2lvbiAhPT0gJ3ByZTEnICYmIG1zZ19pbi5tc2cgPT09ICdwaW5nJykge1xuICAgICAgaWYgKHNlbGYuX3Jlc3BvbmRUb1BpbmdzKVxuICAgICAgICBzZWxmLnNlbmQoe21zZzogXCJwb25nXCIsIGlkOiBtc2dfaW4uaWR9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNlbGYudmVyc2lvbiAhPT0gJ3ByZTEnICYmIG1zZ19pbi5tc2cgPT09ICdwb25nJykge1xuICAgICAgLy8gU2luY2UgZXZlcnl0aGluZyBpcyBhIHBvbmcsIG5vdGhpbmcgdG8gZG9cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzZWxmLmluUXVldWUucHVzaChtc2dfaW4pO1xuICAgIGlmIChzZWxmLndvcmtlclJ1bm5pbmcpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi53b3JrZXJSdW5uaW5nID0gdHJ1ZTtcblxuICAgIHZhciBwcm9jZXNzTmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtc2cgPSBzZWxmLmluUXVldWUgJiYgc2VsZi5pblF1ZXVlLnNoaWZ0KCk7XG4gICAgICBpZiAoIW1zZykge1xuICAgICAgICBzZWxmLndvcmtlclJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBibG9ja2VkID0gdHJ1ZTtcblxuICAgICAgICB2YXIgdW5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoIWJsb2NrZWQpXG4gICAgICAgICAgICByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICAgICAgICBibG9ja2VkID0gZmFsc2U7XG4gICAgICAgICAgcHJvY2Vzc05leHQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLnNlcnZlci5vbk1lc3NhZ2VIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2sobXNnLCBzZWxmKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKF8uaGFzKHNlbGYucHJvdG9jb2xfaGFuZGxlcnMsIG1zZy5tc2cpKVxuICAgICAgICAgIHNlbGYucHJvdG9jb2xfaGFuZGxlcnNbbXNnLm1zZ10uY2FsbChzZWxmLCBtc2csIHVuYmxvY2spO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZi5zZW5kRXJyb3IoJ0JhZCByZXF1ZXN0JywgbXNnKTtcbiAgICAgICAgdW5ibG9jaygpOyAvLyBpbiBjYXNlIHRoZSBoYW5kbGVyIGRpZG4ndCBhbHJlYWR5IGRvIGl0XG4gICAgICB9KS5ydW4oKTtcbiAgICB9O1xuXG4gICAgcHJvY2Vzc05leHQoKTtcbiAgfSxcblxuICBwcm90b2NvbF9oYW5kbGVyczoge1xuICAgIHN1YjogZnVuY3Rpb24gKG1zZykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyByZWplY3QgbWFsZm9ybWVkIG1lc3NhZ2VzXG4gICAgICBpZiAodHlwZW9mIChtc2cuaWQpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgdHlwZW9mIChtc2cubmFtZSkgIT09IFwic3RyaW5nXCIgfHxcbiAgICAgICAgICAoKCdwYXJhbXMnIGluIG1zZykgJiYgIShtc2cucGFyYW1zIGluc3RhbmNlb2YgQXJyYXkpKSkge1xuICAgICAgICBzZWxmLnNlbmRFcnJvcihcIk1hbGZvcm1lZCBzdWJzY3JpcHRpb25cIiwgbXNnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNlbGYuc2VydmVyLnB1Ymxpc2hfaGFuZGxlcnNbbXNnLm5hbWVdKSB7XG4gICAgICAgIHNlbGYuc2VuZCh7XG4gICAgICAgICAgbXNnOiAnbm9zdWInLCBpZDogbXNnLmlkLFxuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgYFN1YnNjcmlwdGlvbiAnJHttc2cubmFtZX0nIG5vdCBmb3VuZGApfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKF8uaGFzKHNlbGYuX25hbWVkU3VicywgbXNnLmlkKSlcbiAgICAgICAgLy8gc3VicyBhcmUgaWRlbXBvdGVudCwgb3IgcmF0aGVyLCB0aGV5IGFyZSBpZ25vcmVkIGlmIGEgc3ViXG4gICAgICAgIC8vIHdpdGggdGhhdCBpZCBhbHJlYWR5IGV4aXN0cy4gdGhpcyBpcyBpbXBvcnRhbnQgZHVyaW5nXG4gICAgICAgIC8vIHJlY29ubmVjdC5cbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBYWFggSXQnZCBiZSBtdWNoIGJldHRlciBpZiB3ZSBoYWQgZ2VuZXJpYyBob29rcyB3aGVyZSBhbnkgcGFja2FnZSBjYW5cbiAgICAgIC8vIGhvb2sgaW50byBzdWJzY3JpcHRpb24gaGFuZGxpbmcsIGJ1dCBpbiB0aGUgbWVhbiB3aGlsZSB3ZSBzcGVjaWFsIGNhc2VcbiAgICAgIC8vIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZS4gVGhpcyBpcyBhbHNvIGRvbmUgZm9yIHdlYWsgcmVxdWlyZW1lbnRzIHRvXG4gICAgICAvLyBhZGQgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZSBpbiBjYXNlIHdlIGRvbid0IGhhdmUgQWNjb3VudHMuIEFcbiAgICAgIC8vIHVzZXIgdHJ5aW5nIHRvIHVzZSB0aGUgZGRwLXJhdGUtbGltaXRlciBtdXN0IGV4cGxpY2l0bHkgcmVxdWlyZSBpdC5cbiAgICAgIGlmIChQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10pIHtcbiAgICAgICAgdmFyIEREUFJhdGVMaW1pdGVyID0gUGFja2FnZVsnZGRwLXJhdGUtbGltaXRlciddLkREUFJhdGVMaW1pdGVyO1xuICAgICAgICB2YXIgcmF0ZUxpbWl0ZXJJbnB1dCA9IHtcbiAgICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICAgIGNsaWVudEFkZHJlc3M6IHNlbGYuY29ubmVjdGlvbkhhbmRsZS5jbGllbnRBZGRyZXNzLFxuICAgICAgICAgIHR5cGU6IFwic3Vic2NyaXB0aW9uXCIsXG4gICAgICAgICAgbmFtZTogbXNnLm5hbWUsXG4gICAgICAgICAgY29ubmVjdGlvbklkOiBzZWxmLmlkXG4gICAgICAgIH07XG5cbiAgICAgICAgRERQUmF0ZUxpbWl0ZXIuX2luY3JlbWVudChyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgdmFyIHJhdGVMaW1pdFJlc3VsdCA9IEREUFJhdGVMaW1pdGVyLl9jaGVjayhyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xuICAgICAgICAgIHNlbGYuc2VuZCh7XG4gICAgICAgICAgICBtc2c6ICdub3N1YicsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcihcbiAgICAgICAgICAgICAgJ3Rvby1tYW55LXJlcXVlc3RzJyxcbiAgICAgICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuZ2V0RXJyb3JNZXNzYWdlKHJhdGVMaW1pdFJlc3VsdCksXG4gICAgICAgICAgICAgIHt0aW1lVG9SZXNldDogcmF0ZUxpbWl0UmVzdWx0LnRpbWVUb1Jlc2V0fSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGhhbmRsZXIgPSBzZWxmLnNlcnZlci5wdWJsaXNoX2hhbmRsZXJzW21zZy5uYW1lXTtcblxuICAgICAgc2VsZi5fc3RhcnRTdWJzY3JpcHRpb24oaGFuZGxlciwgbXNnLmlkLCBtc2cucGFyYW1zLCBtc2cubmFtZSk7XG5cbiAgICB9LFxuXG4gICAgdW5zdWI6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5fc3RvcFN1YnNjcmlwdGlvbihtc2cuaWQpO1xuICAgIH0sXG5cbiAgICBtZXRob2Q6IGZ1bmN0aW9uIChtc2csIHVuYmxvY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gcmVqZWN0IG1hbGZvcm1lZCBtZXNzYWdlc1xuICAgICAgLy8gRm9yIG5vdywgd2Ugc2lsZW50bHkgaWdub3JlIHVua25vd24gYXR0cmlidXRlcyxcbiAgICAgIC8vIGZvciBmb3J3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgICAgaWYgKHR5cGVvZiAobXNnLmlkKSAhPT0gXCJzdHJpbmdcIiB8fFxuICAgICAgICAgIHR5cGVvZiAobXNnLm1ldGhvZCkgIT09IFwic3RyaW5nXCIgfHxcbiAgICAgICAgICAoKCdwYXJhbXMnIGluIG1zZykgJiYgIShtc2cucGFyYW1zIGluc3RhbmNlb2YgQXJyYXkpKSB8fFxuICAgICAgICAgICgoJ3JhbmRvbVNlZWQnIGluIG1zZykgJiYgKHR5cGVvZiBtc2cucmFuZG9tU2VlZCAhPT0gXCJzdHJpbmdcIikpKSB7XG4gICAgICAgIHNlbGYuc2VuZEVycm9yKFwiTWFsZm9ybWVkIG1ldGhvZCBpbnZvY2F0aW9uXCIsIG1zZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJhbmRvbVNlZWQgPSBtc2cucmFuZG9tU2VlZCB8fCBudWxsO1xuXG4gICAgICAvLyBzZXQgdXAgdG8gbWFyayB0aGUgbWV0aG9kIGFzIHNhdGlzZmllZCBvbmNlIGFsbCBvYnNlcnZlcnNcbiAgICAgIC8vIChhbmQgc3Vic2NyaXB0aW9ucykgaGF2ZSByZWFjdGVkIHRvIGFueSB3cml0ZXMgdGhhdCB3ZXJlXG4gICAgICAvLyBkb25lLlxuICAgICAgdmFyIGZlbmNlID0gbmV3IEREUFNlcnZlci5fV3JpdGVGZW5jZTtcbiAgICAgIGZlbmNlLm9uQWxsQ29tbWl0dGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gUmV0aXJlIHRoZSBmZW5jZSBzbyB0aGF0IGZ1dHVyZSB3cml0ZXMgYXJlIGFsbG93ZWQuXG4gICAgICAgIC8vIFRoaXMgbWVhbnMgdGhhdCBjYWxsYmFja3MgbGlrZSB0aW1lcnMgYXJlIGZyZWUgdG8gdXNlXG4gICAgICAgIC8vIHRoZSBmZW5jZSwgYW5kIGlmIHRoZXkgZmlyZSBiZWZvcmUgaXQncyBhcm1lZCAoZm9yXG4gICAgICAgIC8vIGV4YW1wbGUsIGJlY2F1c2UgdGhlIG1ldGhvZCB3YWl0cyBmb3IgdGhlbSkgdGhlaXJcbiAgICAgICAgLy8gd3JpdGVzIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlIGZlbmNlLlxuICAgICAgICBmZW5jZS5yZXRpcmUoKTtcbiAgICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgICBtc2c6ICd1cGRhdGVkJywgbWV0aG9kczogW21zZy5pZF19KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBmaW5kIHRoZSBoYW5kbGVyXG4gICAgICB2YXIgaGFuZGxlciA9IHNlbGYuc2VydmVyLm1ldGhvZF9oYW5kbGVyc1ttc2cubWV0aG9kXTtcbiAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICBzZWxmLnNlbmQoe1xuICAgICAgICAgIG1zZzogJ3Jlc3VsdCcsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCBgTWV0aG9kICcke21zZy5tZXRob2R9JyBub3QgZm91bmRgKX0pO1xuICAgICAgICBmZW5jZS5hcm0oKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2V0VXNlcklkID0gZnVuY3Rpb24odXNlcklkKSB7XG4gICAgICAgIHNlbGYuX3NldFVzZXJJZCh1c2VySWQpO1xuICAgICAgfTtcblxuICAgICAgdmFyIGludm9jYXRpb24gPSBuZXcgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb24oe1xuICAgICAgICBpc1NpbXVsYXRpb246IGZhbHNlLFxuICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICBzZXRVc2VySWQ6IHNldFVzZXJJZCxcbiAgICAgICAgdW5ibG9jazogdW5ibG9jayxcbiAgICAgICAgY29ubmVjdGlvbjogc2VsZi5jb25uZWN0aW9uSGFuZGxlLFxuICAgICAgICByYW5kb21TZWVkOiByYW5kb21TZWVkXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgLy8gWFhYIEl0J2QgYmUgYmV0dGVyIGlmIHdlIGNvdWxkIGhvb2sgaW50byBtZXRob2QgaGFuZGxlcnMgYmV0dGVyIGJ1dFxuICAgICAgICAvLyBmb3Igbm93LCB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBkZHAtcmF0ZS1saW1pdGVyIGV4aXN0cyBzaW5jZSB3ZVxuICAgICAgICAvLyBoYXZlIGEgd2VhayByZXF1aXJlbWVudCBmb3IgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZSB0byBiZSBhZGRlZFxuICAgICAgICAvLyB0byBvdXIgYXBwbGljYXRpb24uXG4gICAgICAgIGlmIChQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10pIHtcbiAgICAgICAgICB2YXIgRERQUmF0ZUxpbWl0ZXIgPSBQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10uRERQUmF0ZUxpbWl0ZXI7XG4gICAgICAgICAgdmFyIHJhdGVMaW1pdGVySW5wdXQgPSB7XG4gICAgICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICAgICAgY2xpZW50QWRkcmVzczogc2VsZi5jb25uZWN0aW9uSGFuZGxlLmNsaWVudEFkZHJlc3MsXG4gICAgICAgICAgICB0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgICAgbmFtZTogbXNnLm1ldGhvZCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogc2VsZi5pZFxuICAgICAgICAgIH07XG4gICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuX2luY3JlbWVudChyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgICB2YXIgcmF0ZUxpbWl0UmVzdWx0ID0gRERQUmF0ZUxpbWl0ZXIuX2NoZWNrKHJhdGVMaW1pdGVySW5wdXQpXG4gICAgICAgICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgIFwidG9vLW1hbnktcmVxdWVzdHNcIixcbiAgICAgICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuZ2V0RXJyb3JNZXNzYWdlKHJhdGVMaW1pdFJlc3VsdCksXG4gICAgICAgICAgICAgIHt0aW1lVG9SZXNldDogcmF0ZUxpbWl0UmVzdWx0LnRpbWVUb1Jlc2V0fVxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzb2x2ZShERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLndpdGhWYWx1ZShcbiAgICAgICAgICBmZW5jZSxcbiAgICAgICAgICAoKSA9PiBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLndpdGhWYWx1ZShcbiAgICAgICAgICAgIGludm9jYXRpb24sXG4gICAgICAgICAgICAoKSA9PiBtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MoXG4gICAgICAgICAgICAgIGhhbmRsZXIsIGludm9jYXRpb24sIG1zZy5wYXJhbXMsXG4gICAgICAgICAgICAgIFwiY2FsbCB0byAnXCIgKyBtc2cubWV0aG9kICsgXCInXCJcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgICkpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICAgICAgZmVuY2UuYXJtKCk7XG4gICAgICAgIHVuYmxvY2soKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgbXNnOiBcInJlc3VsdFwiLFxuICAgICAgICBpZDogbXNnLmlkXG4gICAgICB9O1xuXG4gICAgICBwcm9taXNlLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBmaW5pc2goKTtcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGF5bG9hZC5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5zZW5kKHBheWxvYWQpO1xuICAgICAgfSwgKGV4Y2VwdGlvbikgPT4ge1xuICAgICAgICBmaW5pc2goKTtcbiAgICAgICAgcGF5bG9hZC5lcnJvciA9IHdyYXBJbnRlcm5hbEV4Y2VwdGlvbihcbiAgICAgICAgICBleGNlcHRpb24sXG4gICAgICAgICAgYHdoaWxlIGludm9raW5nIG1ldGhvZCAnJHttc2cubWV0aG9kfSdgXG4gICAgICAgICk7XG4gICAgICAgIHNlbGYuc2VuZChwYXlsb2FkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfZWFjaFN1YjogZnVuY3Rpb24gKGYpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5lYWNoKHNlbGYuX25hbWVkU3VicywgZik7XG4gICAgXy5lYWNoKHNlbGYuX3VuaXZlcnNhbFN1YnMsIGYpO1xuICB9LFxuXG4gIF9kaWZmQ29sbGVjdGlvblZpZXdzOiBmdW5jdGlvbiAoYmVmb3JlQ1ZzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhiZWZvcmVDVnMsIHNlbGYuY29sbGVjdGlvblZpZXdzLCB7XG4gICAgICBib3RoOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGxlZnRWYWx1ZSwgcmlnaHRWYWx1ZSkge1xuICAgICAgICByaWdodFZhbHVlLmRpZmYobGVmdFZhbHVlKTtcbiAgICAgIH0sXG4gICAgICByaWdodE9ubHk6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgcmlnaHRWYWx1ZSkge1xuICAgICAgICBfLmVhY2gocmlnaHRWYWx1ZS5kb2N1bWVudHMsIGZ1bmN0aW9uIChkb2NWaWV3LCBpZCkge1xuICAgICAgICAgIHNlbGYuc2VuZEFkZGVkKGNvbGxlY3Rpb25OYW1lLCBpZCwgZG9jVmlldy5nZXRGaWVsZHMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGxlZnRPbmx5OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGxlZnRWYWx1ZSkge1xuICAgICAgICBfLmVhY2gobGVmdFZhbHVlLmRvY3VtZW50cywgZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgICBzZWxmLnNlbmRSZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNldHMgdGhlIGN1cnJlbnQgdXNlciBpZCBpbiBhbGwgYXBwcm9wcmlhdGUgY29udGV4dHMgYW5kIHJlcnVuc1xuICAvLyBhbGwgc3Vic2NyaXB0aW9uc1xuICBfc2V0VXNlcklkOiBmdW5jdGlvbih1c2VySWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodXNlcklkICE9PSBudWxsICYmIHR5cGVvZiB1c2VySWQgIT09IFwic3RyaW5nXCIpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzZXRVc2VySWQgbXVzdCBiZSBjYWxsZWQgb24gc3RyaW5nIG9yIG51bGwsIG5vdCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHVzZXJJZCk7XG5cbiAgICAvLyBQcmV2ZW50IG5ld2x5LWNyZWF0ZWQgdW5pdmVyc2FsIHN1YnNjcmlwdGlvbnMgZnJvbSBiZWluZyBhZGRlZCB0byBvdXJcbiAgICAvLyBzZXNzaW9uOyB0aGV5IHdpbGwgYmUgZm91bmQgYmVsb3cgd2hlbiB3ZSBjYWxsIHN0YXJ0VW5pdmVyc2FsU3Vicy5cbiAgICAvL1xuICAgIC8vIChXZSBkb24ndCBoYXZlIHRvIHdvcnJ5IGFib3V0IG5hbWVkIHN1YnNjcmlwdGlvbnMsIGJlY2F1c2Ugd2Ugb25seSBhZGRcbiAgICAvLyB0aGVtIHdoZW4gd2UgcHJvY2VzcyBhICdzdWInIG1lc3NhZ2UuIFdlIGFyZSBjdXJyZW50bHkgcHJvY2Vzc2luZyBhXG4gICAgLy8gJ21ldGhvZCcgbWVzc2FnZSwgYW5kIHRoZSBtZXRob2QgZGlkIG5vdCB1bmJsb2NrLCBiZWNhdXNlIGl0IGlzIGlsbGVnYWxcbiAgICAvLyB0byBjYWxsIHNldFVzZXJJZCBhZnRlciB1bmJsb2NrLiBUaHVzIHdlIGNhbm5vdCBiZSBjb25jdXJyZW50bHkgYWRkaW5nIGFcbiAgICAvLyBuZXcgbmFtZWQgc3Vic2NyaXB0aW9uLilcbiAgICBzZWxmLl9kb250U3RhcnROZXdVbml2ZXJzYWxTdWJzID0gdHJ1ZTtcblxuICAgIC8vIFByZXZlbnQgY3VycmVudCBzdWJzIGZyb20gdXBkYXRpbmcgb3VyIGNvbGxlY3Rpb25WaWV3cyBhbmQgY2FsbCB0aGVpclxuICAgIC8vIHN0b3AgY2FsbGJhY2tzLiBUaGlzIG1heSB5aWVsZC5cbiAgICBzZWxmLl9lYWNoU3ViKGZ1bmN0aW9uIChzdWIpIHtcbiAgICAgIHN1Yi5fZGVhY3RpdmF0ZSgpO1xuICAgIH0pO1xuXG4gICAgLy8gQWxsIHN1YnMgc2hvdWxkIG5vdyBiZSBkZWFjdGl2YXRlZC4gU3RvcCBzZW5kaW5nIG1lc3NhZ2VzIHRvIHRoZSBjbGllbnQsXG4gICAgLy8gc2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHB1Ymxpc2hlZCBjb2xsZWN0aW9ucywgcmVzZXQgdG8gYW4gZW1wdHkgdmlldywgYW5kXG4gICAgLy8gdXBkYXRlIHRoZSB1c2VySWQuXG4gICAgc2VsZi5faXNTZW5kaW5nID0gZmFsc2U7XG4gICAgdmFyIGJlZm9yZUNWcyA9IHNlbGYuY29sbGVjdGlvblZpZXdzO1xuICAgIHNlbGYuY29sbGVjdGlvblZpZXdzID0ge307XG4gICAgc2VsZi51c2VySWQgPSB1c2VySWQ7XG5cbiAgICAvLyBfc2V0VXNlcklkIGlzIG5vcm1hbGx5IGNhbGxlZCBmcm9tIGEgTWV0ZW9yIG1ldGhvZCB3aXRoXG4gICAgLy8gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiBzZXQuIEJ1dCBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIGlzIG5vdFxuICAgIC8vIGV4cGVjdGVkIHRvIGJlIHNldCBpbnNpZGUgYSBwdWJsaXNoIGZ1bmN0aW9uLCBzbyB3ZSB0ZW1wb3JhcnkgdW5zZXQgaXQuXG4gICAgLy8gSW5zaWRlIGEgcHVibGlzaCBmdW5jdGlvbiBERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24gaXMgc2V0LlxuICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKHVuZGVmaW5lZCwgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gU2F2ZSB0aGUgb2xkIG5hbWVkIHN1YnMsIGFuZCByZXNldCB0byBoYXZpbmcgbm8gc3Vic2NyaXB0aW9ucy5cbiAgICAgIHZhciBvbGROYW1lZFN1YnMgPSBzZWxmLl9uYW1lZFN1YnM7XG4gICAgICBzZWxmLl9uYW1lZFN1YnMgPSB7fTtcbiAgICAgIHNlbGYuX3VuaXZlcnNhbFN1YnMgPSBbXTtcblxuICAgICAgXy5lYWNoKG9sZE5hbWVkU3VicywgZnVuY3Rpb24gKHN1Yiwgc3Vic2NyaXB0aW9uSWQpIHtcbiAgICAgICAgc2VsZi5fbmFtZWRTdWJzW3N1YnNjcmlwdGlvbklkXSA9IHN1Yi5fcmVjcmVhdGUoKTtcbiAgICAgICAgLy8gbmI6IGlmIHRoZSBoYW5kbGVyIHRocm93cyBvciBjYWxscyB0aGlzLmVycm9yKCksIGl0IHdpbGwgaW4gZmFjdFxuICAgICAgICAvLyBpbW1lZGlhdGVseSBzZW5kIGl0cyAnbm9zdWInLiBUaGlzIGlzIE9LLCB0aG91Z2guXG4gICAgICAgIHNlbGYuX25hbWVkU3Vic1tzdWJzY3JpcHRpb25JZF0uX3J1bkhhbmRsZXIoKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBbGxvdyBuZXdseS1jcmVhdGVkIHVuaXZlcnNhbCBzdWJzIHRvIGJlIHN0YXJ0ZWQgb24gb3VyIGNvbm5lY3Rpb24gaW5cbiAgICAgIC8vIHBhcmFsbGVsIHdpdGggdGhlIG9uZXMgd2UncmUgc3Bpbm5pbmcgdXAgaGVyZSwgYW5kIHNwaW4gdXAgdW5pdmVyc2FsXG4gICAgICAvLyBzdWJzLlxuICAgICAgc2VsZi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3VicyA9IGZhbHNlO1xuICAgICAgc2VsZi5zdGFydFVuaXZlcnNhbFN1YnMoKTtcbiAgICB9KTtcblxuICAgIC8vIFN0YXJ0IHNlbmRpbmcgbWVzc2FnZXMgYWdhaW4sIGJlZ2lubmluZyB3aXRoIHRoZSBkaWZmIGZyb20gdGhlIHByZXZpb3VzXG4gICAgLy8gc3RhdGUgb2YgdGhlIHdvcmxkIHRvIHRoZSBjdXJyZW50IHN0YXRlLiBObyB5aWVsZHMgYXJlIGFsbG93ZWQgZHVyaW5nXG4gICAgLy8gdGhpcyBkaWZmLCBzbyB0aGF0IG90aGVyIGNoYW5nZXMgY2Fubm90IGludGVybGVhdmUuXG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5faXNTZW5kaW5nID0gdHJ1ZTtcbiAgICAgIHNlbGYuX2RpZmZDb2xsZWN0aW9uVmlld3MoYmVmb3JlQ1ZzKTtcbiAgICAgIGlmICghXy5pc0VtcHR5KHNlbGYuX3BlbmRpbmdSZWFkeSkpIHtcbiAgICAgICAgc2VsZi5zZW5kUmVhZHkoc2VsZi5fcGVuZGluZ1JlYWR5KTtcbiAgICAgICAgc2VsZi5fcGVuZGluZ1JlYWR5ID0gW107XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX3N0YXJ0U3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAoaGFuZGxlciwgc3ViSWQsIHBhcmFtcywgbmFtZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzdWIgPSBuZXcgU3Vic2NyaXB0aW9uKFxuICAgICAgc2VsZiwgaGFuZGxlciwgc3ViSWQsIHBhcmFtcywgbmFtZSk7XG4gICAgaWYgKHN1YklkKVxuICAgICAgc2VsZi5fbmFtZWRTdWJzW3N1YklkXSA9IHN1YjtcbiAgICBlbHNlXG4gICAgICBzZWxmLl91bml2ZXJzYWxTdWJzLnB1c2goc3ViKTtcblxuICAgIHN1Yi5fcnVuSGFuZGxlcigpO1xuICB9LFxuXG4gIC8vIHRlYXIgZG93biBzcGVjaWZpZWQgc3Vic2NyaXB0aW9uXG4gIF9zdG9wU3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAoc3ViSWQsIGVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHN1Yk5hbWUgPSBudWxsO1xuXG4gICAgaWYgKHN1YklkICYmIHNlbGYuX25hbWVkU3Vic1tzdWJJZF0pIHtcbiAgICAgIHN1Yk5hbWUgPSBzZWxmLl9uYW1lZFN1YnNbc3ViSWRdLl9uYW1lO1xuICAgICAgc2VsZi5fbmFtZWRTdWJzW3N1YklkXS5fcmVtb3ZlQWxsRG9jdW1lbnRzKCk7XG4gICAgICBzZWxmLl9uYW1lZFN1YnNbc3ViSWRdLl9kZWFjdGl2YXRlKCk7XG4gICAgICBkZWxldGUgc2VsZi5fbmFtZWRTdWJzW3N1YklkXTtcbiAgICB9XG5cbiAgICB2YXIgcmVzcG9uc2UgPSB7bXNnOiAnbm9zdWInLCBpZDogc3ViSWR9O1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXNwb25zZS5lcnJvciA9IHdyYXBJbnRlcm5hbEV4Y2VwdGlvbihcbiAgICAgICAgZXJyb3IsXG4gICAgICAgIHN1Yk5hbWUgPyAoXCJmcm9tIHN1YiBcIiArIHN1Yk5hbWUgKyBcIiBpZCBcIiArIHN1YklkKVxuICAgICAgICAgIDogKFwiZnJvbSBzdWIgaWQgXCIgKyBzdWJJZCkpO1xuICAgIH1cblxuICAgIHNlbGYuc2VuZChyZXNwb25zZSk7XG4gIH0sXG5cbiAgLy8gdGVhciBkb3duIGFsbCBzdWJzY3JpcHRpb25zLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBzZW5kIHJlbW92ZWQgb3Igbm9zdWJcbiAgLy8gbWVzc2FnZXMsIHNpbmNlIHdlIGFzc3VtZSB0aGUgY2xpZW50IGlzIGdvbmUuXG4gIF9kZWFjdGl2YXRlQWxsU3Vic2NyaXB0aW9uczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIF8uZWFjaChzZWxmLl9uYW1lZFN1YnMsIGZ1bmN0aW9uIChzdWIsIGlkKSB7XG4gICAgICBzdWIuX2RlYWN0aXZhdGUoKTtcbiAgICB9KTtcbiAgICBzZWxmLl9uYW1lZFN1YnMgPSB7fTtcblxuICAgIF8uZWFjaChzZWxmLl91bml2ZXJzYWxTdWJzLCBmdW5jdGlvbiAoc3ViKSB7XG4gICAgICBzdWIuX2RlYWN0aXZhdGUoKTtcbiAgICB9KTtcbiAgICBzZWxmLl91bml2ZXJzYWxTdWJzID0gW107XG4gIH0sXG5cbiAgLy8gRGV0ZXJtaW5lIHRoZSByZW1vdGUgY2xpZW50J3MgSVAgYWRkcmVzcywgYmFzZWQgb24gdGhlXG4gIC8vIEhUVFBfRk9SV0FSREVEX0NPVU5UIGVudmlyb25tZW50IHZhcmlhYmxlIHJlcHJlc2VudGluZyBob3cgbWFueVxuICAvLyBwcm94aWVzIHRoZSBzZXJ2ZXIgaXMgYmVoaW5kLlxuICBfY2xpZW50QWRkcmVzczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIEZvciB0aGUgcmVwb3J0ZWQgY2xpZW50IGFkZHJlc3MgZm9yIGEgY29ubmVjdGlvbiB0byBiZSBjb3JyZWN0LFxuICAgIC8vIHRoZSBkZXZlbG9wZXIgbXVzdCBzZXQgdGhlIEhUVFBfRk9SV0FSREVEX0NPVU5UIGVudmlyb25tZW50XG4gICAgLy8gdmFyaWFibGUgdG8gYW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBob3BzIHRoZXlcbiAgICAvLyBleHBlY3QgaW4gdGhlIGB4LWZvcndhcmRlZC1mb3JgIGhlYWRlci4gRS5nLiwgc2V0IHRvIFwiMVwiIGlmIHRoZVxuICAgIC8vIHNlcnZlciBpcyBiZWhpbmQgb25lIHByb3h5LlxuICAgIC8vXG4gICAgLy8gVGhpcyBjb3VsZCBiZSBjb21wdXRlZCBvbmNlIGF0IHN0YXJ0dXAgaW5zdGVhZCBvZiBldmVyeSB0aW1lLlxuICAgIHZhciBodHRwRm9yd2FyZGVkQ291bnQgPSBwYXJzZUludChwcm9jZXNzLmVudlsnSFRUUF9GT1JXQVJERURfQ09VTlQnXSkgfHwgMDtcblxuICAgIGlmIChodHRwRm9yd2FyZGVkQ291bnQgPT09IDApXG4gICAgICByZXR1cm4gc2VsZi5zb2NrZXQucmVtb3RlQWRkcmVzcztcblxuICAgIHZhciBmb3J3YXJkZWRGb3IgPSBzZWxmLnNvY2tldC5oZWFkZXJzW1wieC1mb3J3YXJkZWQtZm9yXCJdO1xuICAgIGlmICghIF8uaXNTdHJpbmcoZm9yd2FyZGVkRm9yKSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGZvcndhcmRlZEZvciA9IGZvcndhcmRlZEZvci50cmltKCkuc3BsaXQoL1xccyosXFxzKi8pO1xuXG4gICAgLy8gVHlwaWNhbGx5IHRoZSBmaXJzdCB2YWx1ZSBpbiB0aGUgYHgtZm9yd2FyZGVkLWZvcmAgaGVhZGVyIGlzXG4gICAgLy8gdGhlIG9yaWdpbmFsIElQIGFkZHJlc3Mgb2YgdGhlIGNsaWVudCBjb25uZWN0aW5nIHRvIHRoZSBmaXJzdFxuICAgIC8vIHByb3h5LiAgSG93ZXZlciwgdGhlIGVuZCB1c2VyIGNhbiBlYXNpbHkgc3Bvb2YgdGhlIGhlYWRlciwgaW5cbiAgICAvLyB3aGljaCBjYXNlIHRoZSBmaXJzdCB2YWx1ZShzKSB3aWxsIGJlIHRoZSBmYWtlIElQIGFkZHJlc3MgZnJvbVxuICAgIC8vIHRoZSB1c2VyIHByZXRlbmRpbmcgdG8gYmUgYSBwcm94eSByZXBvcnRpbmcgdGhlIG9yaWdpbmFsIElQXG4gICAgLy8gYWRkcmVzcyB2YWx1ZS4gIEJ5IGNvdW50aW5nIEhUVFBfRk9SV0FSREVEX0NPVU5UIGJhY2sgZnJvbSB0aGVcbiAgICAvLyBlbmQgb2YgdGhlIGxpc3QsIHdlIGVuc3VyZSB0aGF0IHdlIGdldCB0aGUgSVAgYWRkcmVzcyBiZWluZ1xuICAgIC8vIHJlcG9ydGVkIGJ5ICpvdXIqIGZpcnN0IHByb3h5LlxuXG4gICAgaWYgKGh0dHBGb3J3YXJkZWRDb3VudCA8IDAgfHwgaHR0cEZvcndhcmRlZENvdW50ID4gZm9yd2FyZGVkRm9yLmxlbmd0aClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgcmV0dXJuIGZvcndhcmRlZEZvcltmb3J3YXJkZWRGb3IubGVuZ3RoIC0gaHR0cEZvcndhcmRlZENvdW50XTtcbiAgfVxufSk7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKiBTdWJzY3JpcHRpb24gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gY3RvciBmb3IgYSBzdWIgaGFuZGxlOiB0aGUgaW5wdXQgdG8gZWFjaCBwdWJsaXNoIGZ1bmN0aW9uXG5cbi8vIEluc3RhbmNlIG5hbWUgaXMgdGhpcyBiZWNhdXNlIGl0J3MgdXN1YWxseSByZWZlcnJlZCB0byBhcyB0aGlzIGluc2lkZSBhXG4vLyBwdWJsaXNoXG4vKipcbiAqIEBzdW1tYXJ5IFRoZSBzZXJ2ZXIncyBzaWRlIG9mIGEgc3Vic2NyaXB0aW9uXG4gKiBAY2xhc3MgU3Vic2NyaXB0aW9uXG4gKiBAaW5zdGFuY2VOYW1lIHRoaXNcbiAqIEBzaG93SW5zdGFuY2VOYW1lIHRydWVcbiAqL1xudmFyIFN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChcbiAgICBzZXNzaW9uLCBoYW5kbGVyLCBzdWJzY3JpcHRpb25JZCwgcGFyYW1zLCBuYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fc2Vzc2lvbiA9IHNlc3Npb247IC8vIHR5cGUgaXMgU2Vzc2lvblxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBY2Nlc3MgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiBUaGUgaW5jb21pbmcgW2Nvbm5lY3Rpb25dKCNtZXRlb3Jfb25jb25uZWN0aW9uKSBmb3IgdGhpcyBzdWJzY3JpcHRpb24uXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG5hbWUgIGNvbm5lY3Rpb25cbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHNlbGYuY29ubmVjdGlvbiA9IHNlc3Npb24uY29ubmVjdGlvbkhhbmRsZTsgLy8gcHVibGljIEFQSSBvYmplY3RcblxuICBzZWxmLl9oYW5kbGVyID0gaGFuZGxlcjtcblxuICAvLyBteSBzdWJzY3JpcHRpb24gSUQgKGdlbmVyYXRlZCBieSBjbGllbnQsIHVuZGVmaW5lZCBmb3IgdW5pdmVyc2FsIHN1YnMpLlxuICBzZWxmLl9zdWJzY3JpcHRpb25JZCA9IHN1YnNjcmlwdGlvbklkO1xuICAvLyB1bmRlZmluZWQgZm9yIHVuaXZlcnNhbCBzdWJzXG4gIHNlbGYuX25hbWUgPSBuYW1lO1xuXG4gIHNlbGYuX3BhcmFtcyA9IHBhcmFtcyB8fCBbXTtcblxuICAvLyBPbmx5IG5hbWVkIHN1YnNjcmlwdGlvbnMgaGF2ZSBJRHMsIGJ1dCB3ZSBuZWVkIHNvbWUgc29ydCBvZiBzdHJpbmdcbiAgLy8gaW50ZXJuYWxseSB0byBrZWVwIHRyYWNrIG9mIGFsbCBzdWJzY3JpcHRpb25zIGluc2lkZVxuICAvLyBTZXNzaW9uRG9jdW1lbnRWaWV3cy4gV2UgdXNlIHRoaXMgc3Vic2NyaXB0aW9uSGFuZGxlIGZvciB0aGF0LlxuICBpZiAoc2VsZi5fc3Vic2NyaXB0aW9uSWQpIHtcbiAgICBzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUgPSAnTicgKyBzZWxmLl9zdWJzY3JpcHRpb25JZDtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUgPSAnVScgKyBSYW5kb20uaWQoKTtcbiAgfVxuXG4gIC8vIGhhcyBfZGVhY3RpdmF0ZSBiZWVuIGNhbGxlZD9cbiAgc2VsZi5fZGVhY3RpdmF0ZWQgPSBmYWxzZTtcblxuICAvLyBzdG9wIGNhbGxiYWNrcyB0byBnL2MgdGhpcyBzdWIuICBjYWxsZWQgdy8gemVybyBhcmd1bWVudHMuXG4gIHNlbGYuX3N0b3BDYWxsYmFja3MgPSBbXTtcblxuICAvLyB0aGUgc2V0IG9mIChjb2xsZWN0aW9uLCBkb2N1bWVudGlkKSB0aGF0IHRoaXMgc3Vic2NyaXB0aW9uIGhhc1xuICAvLyBhbiBvcGluaW9uIGFib3V0XG4gIHNlbGYuX2RvY3VtZW50cyA9IHt9O1xuXG4gIC8vIHJlbWVtYmVyIGlmIHdlIGFyZSByZWFkeS5cbiAgc2VsZi5fcmVhZHkgPSBmYWxzZTtcblxuICAvLyBQYXJ0IG9mIHRoZSBwdWJsaWMgQVBJOiB0aGUgdXNlciBvZiB0aGlzIHN1Yi5cblxuICAvKipcbiAgICogQHN1bW1hcnkgQWNjZXNzIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gVGhlIGlkIG9mIHRoZSBsb2dnZWQtaW4gdXNlciwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQG5hbWUgIHVzZXJJZFxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHNlbGYudXNlcklkID0gc2Vzc2lvbi51c2VySWQ7XG5cbiAgLy8gRm9yIG5vdywgdGhlIGlkIGZpbHRlciBpcyBnb2luZyB0byBkZWZhdWx0IHRvXG4gIC8vIHRoZSB0by9mcm9tIEREUCBtZXRob2RzIG9uIE1vbmdvSUQsIHRvXG4gIC8vIHNwZWNpZmljYWxseSBkZWFsIHdpdGggbW9uZ28vbWluaW1vbmdvIE9iamVjdElkcy5cblxuICAvLyBMYXRlciwgeW91IHdpbGwgYmUgYWJsZSB0byBtYWtlIHRoaXMgYmUgXCJyYXdcIlxuICAvLyBpZiB5b3Ugd2FudCB0byBwdWJsaXNoIGEgY29sbGVjdGlvbiB0aGF0IHlvdSBrbm93XG4gIC8vIGp1c3QgaGFzIHN0cmluZ3MgZm9yIGtleXMgYW5kIG5vIGZ1bm55IGJ1c2luZXNzLCB0b1xuICAvLyBhIGRkcCBjb25zdW1lciB0aGF0IGlzbid0IG1pbmltb25nb1xuXG4gIHNlbGYuX2lkRmlsdGVyID0ge1xuICAgIGlkU3RyaW5naWZ5OiBNb25nb0lELmlkU3RyaW5naWZ5LFxuICAgIGlkUGFyc2U6IE1vbmdvSUQuaWRQYXJzZVxuICB9O1xuXG4gIFBhY2thZ2UuZmFjdHMgJiYgUGFja2FnZS5mYWN0cy5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibGl2ZWRhdGFcIiwgXCJzdWJzY3JpcHRpb25zXCIsIDEpO1xufTtcblxuXy5leHRlbmQoU3Vic2NyaXB0aW9uLnByb3RvdHlwZSwge1xuICBfcnVuSGFuZGxlcjogZnVuY3Rpb24gKCkge1xuICAgIC8vIFhYWCBzaG91bGQgd2UgdW5ibG9jaygpIGhlcmU/IEVpdGhlciBiZWZvcmUgcnVubmluZyB0aGUgcHVibGlzaFxuICAgIC8vIGZ1bmN0aW9uLCBvciBiZWZvcmUgcnVubmluZyBfcHVibGlzaEN1cnNvci5cbiAgICAvL1xuICAgIC8vIFJpZ2h0IG5vdywgZWFjaCBwdWJsaXNoIGZ1bmN0aW9uIGJsb2NrcyBhbGwgZnV0dXJlIHB1Ymxpc2hlcyBhbmRcbiAgICAvLyBtZXRob2RzIHdhaXRpbmcgb24gZGF0YSBmcm9tIE1vbmdvIChvciB3aGF0ZXZlciBlbHNlIHRoZSBmdW5jdGlvblxuICAgIC8vIGJsb2NrcyBvbikuIFRoaXMgcHJvYmFibHkgc2xvd3MgcGFnZSBsb2FkIGluIGNvbW1vbiBjYXNlcy5cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0cnkge1xuICAgICAgdmFyIHJlcyA9IEREUC5fQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi53aXRoVmFsdWUoXG4gICAgICAgIHNlbGYsXG4gICAgICAgICgpID0+IG1heWJlQXVkaXRBcmd1bWVudENoZWNrcyhcbiAgICAgICAgICBzZWxmLl9oYW5kbGVyLCBzZWxmLCBFSlNPTi5jbG9uZShzZWxmLl9wYXJhbXMpLFxuICAgICAgICAgIC8vIEl0J3MgT0sgdGhhdCB0aGlzIHdvdWxkIGxvb2sgd2VpcmQgZm9yIHVuaXZlcnNhbCBzdWJzY3JpcHRpb25zLFxuICAgICAgICAgIC8vIGJlY2F1c2UgdGhleSBoYXZlIG5vIGFyZ3VtZW50cyBzbyB0aGVyZSBjYW4gbmV2ZXIgYmUgYW5cbiAgICAgICAgICAvLyBhdWRpdC1hcmd1bWVudC1jaGVja3MgZmFpbHVyZS5cbiAgICAgICAgICBcInB1Ymxpc2hlciAnXCIgKyBzZWxmLl9uYW1lICsgXCInXCJcbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzZWxmLmVycm9yKGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIERpZCB0aGUgaGFuZGxlciBjYWxsIHRoaXMuZXJyb3Igb3IgdGhpcy5zdG9wP1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG5cbiAgICBzZWxmLl9wdWJsaXNoSGFuZGxlclJlc3VsdChyZXMpO1xuICB9LFxuXG4gIF9wdWJsaXNoSGFuZGxlclJlc3VsdDogZnVuY3Rpb24gKHJlcykge1xuICAgIC8vIFNQRUNJQUwgQ0FTRTogSW5zdGVhZCBvZiB3cml0aW5nIHRoZWlyIG93biBjYWxsYmFja3MgdGhhdCBpbnZva2VcbiAgICAvLyB0aGlzLmFkZGVkL2NoYW5nZWQvcmVhZHkvZXRjLCB0aGUgdXNlciBjYW4ganVzdCByZXR1cm4gYSBjb2xsZWN0aW9uXG4gICAgLy8gY3Vyc29yIG9yIGFycmF5IG9mIGN1cnNvcnMgZnJvbSB0aGUgcHVibGlzaCBmdW5jdGlvbjsgd2UgY2FsbCB0aGVpclxuICAgIC8vIF9wdWJsaXNoQ3Vyc29yIG1ldGhvZCB3aGljaCBzdGFydHMgb2JzZXJ2aW5nIHRoZSBjdXJzb3IgYW5kIHB1Ymxpc2hlcyB0aGVcbiAgICAvLyByZXN1bHRzLiBOb3RlIHRoYXQgX3B1Ymxpc2hDdXJzb3IgZG9lcyBOT1QgY2FsbCByZWFkeSgpLlxuICAgIC8vXG4gICAgLy8gWFhYIFRoaXMgdXNlcyBhbiB1bmRvY3VtZW50ZWQgaW50ZXJmYWNlIHdoaWNoIG9ubHkgdGhlIE1vbmdvIGN1cnNvclxuICAgIC8vIGludGVyZmFjZSBwdWJsaXNoZXMuIFNob3VsZCB3ZSBtYWtlIHRoaXMgaW50ZXJmYWNlIHB1YmxpYyBhbmQgZW5jb3VyYWdlXG4gICAgLy8gdXNlcnMgdG8gaW1wbGVtZW50IGl0IHRoZW1zZWx2ZXM/IEFyZ3VhYmx5LCBpdCdzIHVubmVjZXNzYXJ5OyB1c2VycyBjYW5cbiAgICAvLyBhbHJlYWR5IHdyaXRlIHRoZWlyIG93biBmdW5jdGlvbnMgbGlrZVxuICAgIC8vICAgdmFyIHB1Ymxpc2hNeVJlYWN0aXZlVGhpbmd5ID0gZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIpIHtcbiAgICAvLyAgICAgTWV0ZW9yLnB1Ymxpc2gobmFtZSwgZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgIHZhciByZWFjdGl2ZVRoaW5neSA9IGhhbmRsZXIoKTtcbiAgICAvLyAgICAgICByZWFjdGl2ZVRoaW5neS5wdWJsaXNoTWUoKTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICB9O1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpc0N1cnNvciA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICByZXR1cm4gYyAmJiBjLl9wdWJsaXNoQ3Vyc29yO1xuICAgIH07XG4gICAgaWYgKGlzQ3Vyc29yKHJlcykpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcy5fcHVibGlzaEN1cnNvcihzZWxmKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc2VsZi5lcnJvcihlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gX3B1Ymxpc2hDdXJzb3Igb25seSByZXR1cm5zIGFmdGVyIHRoZSBpbml0aWFsIGFkZGVkIGNhbGxiYWNrcyBoYXZlIHJ1bi5cbiAgICAgIC8vIG1hcmsgc3Vic2NyaXB0aW9uIGFzIHJlYWR5LlxuICAgICAgc2VsZi5yZWFkeSgpO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHJlcykpIHtcbiAgICAgIC8vIGNoZWNrIGFsbCB0aGUgZWxlbWVudHMgYXJlIGN1cnNvcnNcbiAgICAgIGlmICghIF8uYWxsKHJlcywgaXNDdXJzb3IpKSB7XG4gICAgICAgIHNlbGYuZXJyb3IobmV3IEVycm9yKFwiUHVibGlzaCBmdW5jdGlvbiByZXR1cm5lZCBhbiBhcnJheSBvZiBub24tQ3Vyc29yc1wiKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGZpbmQgZHVwbGljYXRlIGNvbGxlY3Rpb24gbmFtZXNcbiAgICAgIC8vIFhYWCB3ZSBzaG91bGQgc3VwcG9ydCBvdmVybGFwcGluZyBjdXJzb3JzLCBidXQgdGhhdCB3b3VsZCByZXF1aXJlIHRoZVxuICAgICAgLy8gbWVyZ2UgYm94IHRvIGFsbG93IG92ZXJsYXAgd2l0aGluIGEgc3Vic2NyaXB0aW9uXG4gICAgICB2YXIgY29sbGVjdGlvbk5hbWVzID0ge307XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY29sbGVjdGlvbk5hbWUgPSByZXNbaV0uX2dldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgICAgIGlmIChfLmhhcyhjb2xsZWN0aW9uTmFtZXMsIGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgIHNlbGYuZXJyb3IobmV3IEVycm9yKFxuICAgICAgICAgICAgXCJQdWJsaXNoIGZ1bmN0aW9uIHJldHVybmVkIG11bHRpcGxlIGN1cnNvcnMgZm9yIGNvbGxlY3Rpb24gXCIgK1xuICAgICAgICAgICAgICBjb2xsZWN0aW9uTmFtZSkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb2xsZWN0aW9uTmFtZXNbY29sbGVjdGlvbk5hbWVdID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIF8uZWFjaChyZXMsIGZ1bmN0aW9uIChjdXIpIHtcbiAgICAgICAgICBjdXIuX3B1Ymxpc2hDdXJzb3Ioc2VsZik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzZWxmLmVycm9yKGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWxmLnJlYWR5KCk7XG4gICAgfSBlbHNlIGlmIChyZXMpIHtcbiAgICAgIC8vIHRydXRoeSB2YWx1ZXMgb3RoZXIgdGhhbiBjdXJzb3JzIG9yIGFycmF5cyBhcmUgcHJvYmFibHkgYVxuICAgICAgLy8gdXNlciBtaXN0YWtlIChwb3NzaWJsZSByZXR1cm5pbmcgYSBNb25nbyBkb2N1bWVudCB2aWEsIHNheSxcbiAgICAgIC8vIGBjb2xsLmZpbmRPbmUoKWApLlxuICAgICAgc2VsZi5lcnJvcihuZXcgRXJyb3IoXCJQdWJsaXNoIGZ1bmN0aW9uIGNhbiBvbmx5IHJldHVybiBhIEN1cnNvciBvciBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcImFuIGFycmF5IG9mIEN1cnNvcnNcIikpO1xuICAgIH1cbiAgfSxcblxuICAvLyBUaGlzIGNhbGxzIGFsbCBzdG9wIGNhbGxiYWNrcyBhbmQgcHJldmVudHMgdGhlIGhhbmRsZXIgZnJvbSB1cGRhdGluZyBhbnlcbiAgLy8gU2Vzc2lvbkNvbGxlY3Rpb25WaWV3cyBmdXJ0aGVyLiBJdCdzIHVzZWQgd2hlbiB0aGUgdXNlciB1bnN1YnNjcmliZXMgb3JcbiAgLy8gZGlzY29ubmVjdHMsIGFzIHdlbGwgYXMgZHVyaW5nIHNldFVzZXJJZCByZS1ydW5zLiBJdCBkb2VzICpOT1QqIHNlbmRcbiAgLy8gcmVtb3ZlZCBtZXNzYWdlcyBmb3IgdGhlIHB1Ymxpc2hlZCBvYmplY3RzOyBpZiB0aGF0IGlzIG5lY2Vzc2FyeSwgY2FsbFxuICAvLyBfcmVtb3ZlQWxsRG9jdW1lbnRzIGZpcnN0LlxuICBfZGVhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9kZWFjdGl2YXRlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9kZWFjdGl2YXRlZCA9IHRydWU7XG4gICAgc2VsZi5fY2FsbFN0b3BDYWxsYmFja3MoKTtcbiAgICBQYWNrYWdlLmZhY3RzICYmIFBhY2thZ2UuZmFjdHMuRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibGl2ZWRhdGFcIiwgXCJzdWJzY3JpcHRpb25zXCIsIC0xKTtcbiAgfSxcblxuICBfY2FsbFN0b3BDYWxsYmFja3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gdGVsbCBsaXN0ZW5lcnMsIHNvIHRoZXkgY2FuIGNsZWFuIHVwXG4gICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuX3N0b3BDYWxsYmFja3M7XG4gICAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBTZW5kIHJlbW92ZSBtZXNzYWdlcyBmb3IgZXZlcnkgZG9jdW1lbnQuXG4gIF9yZW1vdmVBbGxEb2N1bWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKHNlbGYuX2RvY3VtZW50cywgZnVuY3Rpb24oY29sbGVjdGlvbkRvY3MsIGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBfLmtleXMgaW5zdGVhZCBvZiB0aGUgZGljdGlvbmFyeSBpdHNlbGYsIHNpbmNlIHdlJ2xsIGJlXG4gICAgICAgIC8vIG11dGF0aW5nIGl0LlxuICAgICAgICBfLmVhY2goXy5rZXlzKGNvbGxlY3Rpb25Eb2NzKSwgZnVuY3Rpb24gKHN0cklkKSB7XG4gICAgICAgICAgc2VsZi5yZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBzZWxmLl9pZEZpbHRlci5pZFBhcnNlKHN0cklkKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIG5ldyBTdWJzY3JpcHRpb24gZm9yIHRoZSBzYW1lIHNlc3Npb24gd2l0aCB0aGUgc2FtZVxuICAvLyBpbml0aWFsIGNyZWF0aW9uIHBhcmFtZXRlcnMuIFRoaXMgaXNuJ3QgYSBjbG9uZTogaXQgZG9lc24ndCBoYXZlXG4gIC8vIHRoZSBzYW1lIF9kb2N1bWVudHMgY2FjaGUsIHN0b3BwZWQgc3RhdGUgb3IgY2FsbGJhY2tzOyBtYXkgaGF2ZSBhXG4gIC8vIGRpZmZlcmVudCBfc3Vic2NyaXB0aW9uSGFuZGxlLCBhbmQgZ2V0cyBpdHMgdXNlcklkIGZyb20gdGhlXG4gIC8vIHNlc3Npb24sIG5vdCBmcm9tIHRoaXMgb2JqZWN0LlxuICBfcmVjcmVhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBTdWJzY3JpcHRpb24oXG4gICAgICBzZWxmLl9zZXNzaW9uLCBzZWxmLl9oYW5kbGVyLCBzZWxmLl9zdWJzY3JpcHRpb25JZCwgc2VsZi5fcGFyYW1zLFxuICAgICAgc2VsZi5fbmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgU3RvcHMgdGhpcyBjbGllbnQncyBzdWJzY3JpcHRpb24sIHRyaWdnZXJpbmcgYSBjYWxsIG9uIHRoZSBjbGllbnQgdG8gdGhlIGBvblN0b3BgIGNhbGxiYWNrIHBhc3NlZCB0byBbYE1ldGVvci5zdWJzY3JpYmVgXSgjbWV0ZW9yX3N1YnNjcmliZSksIGlmIGFueS4gSWYgYGVycm9yYCBpcyBub3QgYSBbYE1ldGVvci5FcnJvcmBdKCNtZXRlb3JfZXJyb3IpLCBpdCB3aWxsIGJlIFtzYW5pdGl6ZWRdKCNtZXRlb3JfZXJyb3IpLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byBwYXNzIHRvIHRoZSBjbGllbnQuXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCwgZXJyb3IpO1xuICB9LFxuXG4gIC8vIE5vdGUgdGhhdCB3aGlsZSBvdXIgRERQIGNsaWVudCB3aWxsIG5vdGljZSB0aGF0IHlvdSd2ZSBjYWxsZWQgc3RvcCgpIG9uIHRoZVxuICAvLyBzZXJ2ZXIgKGFuZCBjbGVhbiB1cCBpdHMgX3N1YnNjcmlwdGlvbnMgdGFibGUpIHdlIGRvbid0IGFjdHVhbGx5IHByb3ZpZGUgYVxuICAvLyBtZWNoYW5pc20gZm9yIGFuIGFwcCB0byBub3RpY2UgdGhpcyAodGhlIHN1YnNjcmliZSBvbkVycm9yIGNhbGxiYWNrIG9ubHlcbiAgLy8gdHJpZ2dlcnMgaWYgdGhlcmUgaXMgYW4gZXJyb3IpLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gIFN0b3BzIHRoaXMgY2xpZW50J3Mgc3Vic2NyaXB0aW9uIGFuZCBpbnZva2VzIHRoZSBjbGllbnQncyBgb25TdG9wYCBjYWxsYmFjayB3aXRoIG5vIGVycm9yLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgUmVnaXN0ZXJzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIHN1YnNjcmlwdGlvbiBpcyBzdG9wcGVkLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAqL1xuICBvblN0b3A6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2ssICdvblN0b3AgY2FsbGJhY2snLCBzZWxmKTtcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgY2FsbGJhY2soKTtcbiAgICBlbHNlXG4gICAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBzdWIgaGFzIGJlZW4gZGVhY3RpdmF0ZWQsICpPUiogaWYgdGhlIHNlc3Npb24gd2FzXG4gIC8vIGRlc3Ryb3llZCBidXQgdGhlIGRlZmVycmVkIGNhbGwgdG8gX2RlYWN0aXZhdGVBbGxTdWJzY3JpcHRpb25zIGhhc24ndFxuICAvLyBoYXBwZW5lZCB5ZXQuXG4gIF9pc0RlYWN0aXZhdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9kZWFjdGl2YXRlZCB8fCBzZWxmLl9zZXNzaW9uLmluUXVldWUgPT09IG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgbmV3IGRvY3VtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIG5ldyBkb2N1bWVudCdzIElELlxuICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIFRoZSBmaWVsZHMgaW4gdGhlIG5ldyBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGFkZGVkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBpZCA9IHNlbGYuX2lkRmlsdGVyLmlkU3RyaW5naWZ5KGlkKTtcbiAgICBNZXRlb3IuX2Vuc3VyZShzZWxmLl9kb2N1bWVudHMsIGNvbGxlY3Rpb25OYW1lKVtpZF0gPSB0cnVlO1xuICAgIHNlbGYuX3Nlc3Npb24uYWRkZWQoc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaW4gdGhlIHJlY29yZCBzZXQgaGFzIGJlZW4gbW9kaWZpZWQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgY2hhbmdlZCBkb2N1bWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBjaGFuZ2VkIGRvY3VtZW50J3MgSUQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgVGhlIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBoYXZlIGNoYW5nZWQsIHRvZ2V0aGVyIHdpdGggdGhlaXIgbmV3IHZhbHVlcy4gIElmIGEgZmllbGQgaXMgbm90IHByZXNlbnQgaW4gYGZpZWxkc2AgaXQgd2FzIGxlZnQgdW5jaGFuZ2VkOyBpZiBpdCBpcyBwcmVzZW50IGluIGBmaWVsZHNgIGFuZCBoYXMgYSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpdCB3YXMgcmVtb3ZlZCBmcm9tIHRoZSBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGNoYW5nZWQ6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgcmV0dXJuO1xuICAgIGlkID0gc2VsZi5faWRGaWx0ZXIuaWRTdHJpbmdpZnkoaWQpO1xuICAgIHNlbGYuX3Nlc3Npb24uY2hhbmdlZChzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBJbmZvcm1zIHRoZSBzdWJzY3JpYmVyIHRoYXQgYSBkb2N1bWVudCBoYXMgYmVlbiByZW1vdmVkIGZyb20gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCB0aGUgZG9jdW1lbnQgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIElEIG9mIHRoZSBkb2N1bWVudCB0aGF0IGhhcyBiZWVuIHJlbW92ZWQuXG4gICAqL1xuICByZW1vdmVkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWQgPSBzZWxmLl9pZEZpbHRlci5pZFN0cmluZ2lmeShpZCk7XG4gICAgLy8gV2UgZG9uJ3QgYm90aGVyIHRvIGRlbGV0ZSBzZXRzIG9mIHRoaW5ncyBpbiBhIGNvbGxlY3Rpb24gaWYgdGhlXG4gICAgLy8gY29sbGVjdGlvbiBpcyBlbXB0eS4gIEl0IGNvdWxkIGJyZWFrIF9yZW1vdmVBbGxEb2N1bWVudHMuXG4gICAgZGVsZXRlIHNlbGYuX2RvY3VtZW50c1tjb2xsZWN0aW9uTmFtZV1baWRdO1xuICAgIHNlbGYuX3Nlc3Npb24ucmVtb3ZlZChzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGFuIGluaXRpYWwsIGNvbXBsZXRlIHNuYXBzaG90IG9mIHRoZSByZWNvcmQgc2V0IGhhcyBiZWVuIHNlbnQuICBUaGlzIHdpbGwgdHJpZ2dlciBhIGNhbGwgb24gdGhlIGNsaWVudCB0byB0aGUgYG9uUmVhZHlgIGNhbGxiYWNrIHBhc3NlZCB0byAgW2BNZXRlb3Iuc3Vic2NyaWJlYF0oI21ldGVvcl9zdWJzY3JpYmUpLCBpZiBhbnkuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCFzZWxmLl9zdWJzY3JpcHRpb25JZClcbiAgICAgIHJldHVybjsgIC8vIHVubmVjZXNzYXJ5IGJ1dCBpZ25vcmVkIGZvciB1bml2ZXJzYWwgc3ViXG4gICAgaWYgKCFzZWxmLl9yZWFkeSkge1xuICAgICAgc2VsZi5fc2Vzc2lvbi5zZW5kUmVhZHkoW3NlbGYuX3N1YnNjcmlwdGlvbklkXSk7XG4gICAgICBzZWxmLl9yZWFkeSA9IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFNlcnZlciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5TZXJ2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGhlIGRlZmF1bHQgaGVhcnRiZWF0IGludGVydmFsIGlzIDMwIHNlY29uZHMgb24gdGhlIHNlcnZlciBhbmQgMzVcbiAgLy8gc2Vjb25kcyBvbiB0aGUgY2xpZW50LiAgU2luY2UgdGhlIGNsaWVudCBkb2Vzbid0IG5lZWQgdG8gc2VuZCBhXG4gIC8vIHBpbmcgYXMgbG9uZyBhcyBpdCBpcyByZWNlaXZpbmcgcGluZ3MsIHRoaXMgbWVhbnMgdGhhdCBwaW5nc1xuICAvLyBub3JtYWxseSBnbyBmcm9tIHRoZSBzZXJ2ZXIgdG8gdGhlIGNsaWVudC5cbiAgLy9cbiAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgLy8gTWV0ZW9yLnNlcnZlci5vcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQhIFRoaXMgaXMgYSBoYWNrLCBidXQgaXQncyBsaWZlLlxuICBzZWxmLm9wdGlvbnMgPSBfLmRlZmF1bHRzKG9wdGlvbnMgfHwge30sIHtcbiAgICBoZWFydGJlYXRJbnRlcnZhbDogMTUwMDAsXG4gICAgaGVhcnRiZWF0VGltZW91dDogMTUwMDAsXG4gICAgLy8gRm9yIHRlc3RpbmcsIGFsbG93IHJlc3BvbmRpbmcgdG8gcGluZ3MgdG8gYmUgZGlzYWJsZWQuXG4gICAgcmVzcG9uZFRvUGluZ3M6IHRydWVcbiAgfSk7XG5cbiAgLy8gTWFwIG9mIGNhbGxiYWNrcyB0byBjYWxsIHdoZW4gYSBuZXcgY29ubmVjdGlvbiBjb21lcyBpbiB0byB0aGVcbiAgLy8gc2VydmVyIGFuZCBjb21wbGV0ZXMgRERQIHZlcnNpb24gbmVnb3RpYXRpb24uIFVzZSBhbiBvYmplY3QgaW5zdGVhZFxuICAvLyBvZiBhbiBhcnJheSBzbyB3ZSBjYW4gc2FmZWx5IHJlbW92ZSBvbmUgZnJvbSB0aGUgbGlzdCB3aGlsZVxuICAvLyBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgc2VsZi5vbkNvbm5lY3Rpb25Ib29rID0gbmV3IEhvb2soe1xuICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uQ29ubmVjdGlvbiBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIC8vIE1hcCBvZiBjYWxsYmFja3MgdG8gY2FsbCB3aGVuIGEgbmV3IG1lc3NhZ2UgY29tZXMgaW4uXG4gIHNlbGYub25NZXNzYWdlSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbk1lc3NhZ2UgY2FsbGJhY2tcIlxuICB9KTtcblxuICBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMgPSB7fTtcbiAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycyA9IFtdO1xuXG4gIHNlbGYubWV0aG9kX2hhbmRsZXJzID0ge307XG5cbiAgc2VsZi5zZXNzaW9ucyA9IHt9OyAvLyBtYXAgZnJvbSBpZCB0byBzZXNzaW9uXG5cbiAgc2VsZi5zdHJlYW1fc2VydmVyID0gbmV3IFN0cmVhbVNlcnZlcjtcblxuICBzZWxmLnN0cmVhbV9zZXJ2ZXIucmVnaXN0ZXIoZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tldCBpbXBsZW1lbnRzIHRoZSBTb2NrSlNDb25uZWN0aW9uIGludGVyZmFjZVxuICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG51bGw7XG5cbiAgICB2YXIgc2VuZEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgb2ZmZW5kaW5nTWVzc2FnZSkge1xuICAgICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICAgIGlmIChvZmZlbmRpbmdNZXNzYWdlKVxuICAgICAgICBtc2cub2ZmZW5kaW5nTWVzc2FnZSA9IG9mZmVuZGluZ01lc3NhZ2U7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgIH07XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCBmdW5jdGlvbiAocmF3X21zZykge1xuICAgICAgaWYgKE1ldGVvci5fcHJpbnRSZWNlaXZlZEREUCkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiUmVjZWl2ZWQgRERQXCIsIHJhd19tc2cpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgbXNnID0gRERQQ29tbW9uLnBhcnNlRERQKHJhd19tc2cpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ1BhcnNlIGVycm9yJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ0JhZCByZXF1ZXN0JywgbXNnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ2Nvbm5lY3QnKSB7XG4gICAgICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICAgICAgc2VuZEVycm9yKFwiQWxyZWFkeSBjb25uZWN0ZWRcIiwgbXNnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5faGFuZGxlQ29ubmVjdChzb2NrZXQsIG1zZyk7XG4gICAgICAgICAgfSkucnVuKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzb2NrZXQuX21ldGVvclNlc3Npb24pIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ011c3QgY29ubmVjdCBmaXJzdCcsIG1zZyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5wcm9jZXNzTWVzc2FnZShtc2cpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBYWFggcHJpbnQgc3RhY2sgbmljZWx5XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJJbnRlcm5hbCBleGNlcHRpb24gd2hpbGUgcHJvY2Vzc2luZyBtZXNzYWdlXCIsIG1zZyxcbiAgICAgICAgICAgICAgICAgICAgICBlLm1lc3NhZ2UsIGUuc3RhY2spO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzb2NrZXQuX21ldGVvclNlc3Npb24pIHtcbiAgICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5jbG9zZSgpO1xuICAgICAgICB9KS5ydW4oKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5fLmV4dGVuZChTZXJ2ZXIucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gYSBuZXcgRERQIGNvbm5lY3Rpb24gaXMgbWFkZSB0byB0aGUgc2VydmVyLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBuZXcgRERQIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWQuXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKi9cbiAgb25Db25uZWN0aW9uOiBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYub25Db25uZWN0aW9uSG9vay5yZWdpc3Rlcihmbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gYSBuZXcgRERQIG1lc3NhZ2UgaXMgcmVjZWl2ZWQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIG5ldyBERFAgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBvbk1lc3NhZ2U6IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5vbk1lc3NhZ2VIb29rLnJlZ2lzdGVyKGZuKTtcbiAgfSxcblxuICBfaGFuZGxlQ29ubmVjdDogZnVuY3Rpb24gKHNvY2tldCwgbXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gVGhlIGNvbm5lY3QgbWVzc2FnZSBtdXN0IHNwZWNpZnkgYSB2ZXJzaW9uIGFuZCBhbiBhcnJheSBvZiBzdXBwb3J0ZWRcbiAgICAvLyB2ZXJzaW9ucywgYW5kIGl0IG11c3QgY2xhaW0gdG8gc3VwcG9ydCB3aGF0IGl0IGlzIHByb3Bvc2luZy5cbiAgICBpZiAoISh0eXBlb2YgKG1zZy52ZXJzaW9uKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICBfLmlzQXJyYXkobXNnLnN1cHBvcnQpICYmXG4gICAgICAgICAgXy5hbGwobXNnLnN1cHBvcnQsIF8uaXNTdHJpbmcpICYmXG4gICAgICAgICAgXy5jb250YWlucyhtc2cuc3VwcG9ydCwgbXNnLnZlcnNpb24pKSkge1xuICAgICAgc29ja2V0LnNlbmQoRERQQ29tbW9uLnN0cmluZ2lmeUREUCh7bXNnOiAnZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogRERQQ29tbW9uLlNVUFBPUlRFRF9ERFBfVkVSU0lPTlNbMF19KSk7XG4gICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbiB0aGUgZnV0dXJlLCBoYW5kbGUgc2Vzc2lvbiByZXN1bXB0aW9uOiBzb21ldGhpbmcgbGlrZTpcbiAgICAvLyAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uID0gc2VsZi5zZXNzaW9uc1ttc2cuc2Vzc2lvbl1cbiAgICB2YXIgdmVyc2lvbiA9IGNhbGN1bGF0ZVZlcnNpb24obXNnLnN1cHBvcnQsIEREUENvbW1vbi5TVVBQT1JURURfRERQX1ZFUlNJT05TKTtcblxuICAgIGlmIChtc2cudmVyc2lvbiAhPT0gdmVyc2lvbikge1xuICAgICAgLy8gVGhlIGJlc3QgdmVyc2lvbiB0byB1c2UgKGFjY29yZGluZyB0byB0aGUgY2xpZW50J3Mgc3RhdGVkIHByZWZlcmVuY2VzKVxuICAgICAgLy8gaXMgbm90IHRoZSBvbmUgdGhlIGNsaWVudCBpcyB0cnlpbmcgdG8gdXNlLiBJbmZvcm0gdGhlbSBhYm91dCB0aGUgYmVzdFxuICAgICAgLy8gdmVyc2lvbiB0byB1c2UuXG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKHttc2c6ICdmYWlsZWQnLCB2ZXJzaW9uOiB2ZXJzaW9ufSkpO1xuICAgICAgc29ja2V0LmNsb3NlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gWWF5LCB2ZXJzaW9uIG1hdGNoZXMhIENyZWF0ZSBhIG5ldyBzZXNzaW9uLlxuICAgIC8vIE5vdGU6IFRyb3Bvc3BoZXJlIGRlcGVuZHMgb24gdGhlIGFiaWxpdHkgdG8gbXV0YXRlXG4gICAgLy8gTWV0ZW9yLnNlcnZlci5vcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQhIFRoaXMgaXMgYSBoYWNrLCBidXQgaXQncyBsaWZlLlxuICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG5ldyBTZXNzaW9uKHNlbGYsIHZlcnNpb24sIHNvY2tldCwgc2VsZi5vcHRpb25zKTtcbiAgICBzZWxmLnNlc3Npb25zW3NvY2tldC5fbWV0ZW9yU2Vzc2lvbi5pZF0gPSBzb2NrZXQuX21ldGVvclNlc3Npb247XG4gICAgc2VsZi5vbkNvbm5lY3Rpb25Ib29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoc29ja2V0Ll9tZXRlb3JTZXNzaW9uKVxuICAgICAgICBjYWxsYmFjayhzb2NrZXQuX21ldGVvclNlc3Npb24uY29ubmVjdGlvbkhhbmRsZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgcHVibGlzaCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbmFtZSB7U3RyaW5nfSBpZGVudGlmaWVyIGZvciBxdWVyeVxuICAgKiBAcGFyYW0gaGFuZGxlciB7RnVuY3Rpb259IHB1Ymxpc2ggaGFuZGxlclxuICAgKiBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fVxuICAgKlxuICAgKiBTZXJ2ZXIgd2lsbCBjYWxsIGhhbmRsZXIgZnVuY3Rpb24gb24gZWFjaCBuZXcgc3Vic2NyaXB0aW9uLFxuICAgKiBlaXRoZXIgd2hlbiByZWNlaXZpbmcgRERQIHN1YiBtZXNzYWdlIGZvciBhIG5hbWVkIHN1YnNjcmlwdGlvbiwgb3Igb25cbiAgICogRERQIGNvbm5lY3QgZm9yIGEgdW5pdmVyc2FsIHN1YnNjcmlwdGlvbi5cbiAgICpcbiAgICogSWYgbmFtZSBpcyBudWxsLCB0aGlzIHdpbGwgYmUgYSBzdWJzY3JpcHRpb24gdGhhdCBpc1xuICAgKiBhdXRvbWF0aWNhbGx5IGVzdGFibGlzaGVkIGFuZCBwZXJtYW5lbnRseSBvbiBmb3IgYWxsIGNvbm5lY3RlZFxuICAgKiBjbGllbnQsIGluc3RlYWQgb2YgYSBzdWJzY3JpcHRpb24gdGhhdCBjYW4gYmUgdHVybmVkIG9uIGFuZCBvZmZcbiAgICogd2l0aCBzdWJzY3JpYmUoKS5cbiAgICpcbiAgICogb3B0aW9ucyB0byBjb250YWluOlxuICAgKiAgLSAobW9zdGx5IGludGVybmFsKSBpc19hdXRvOiB0cnVlIGlmIGdlbmVyYXRlZCBhdXRvbWF0aWNhbGx5XG4gICAqICAgIGZyb20gYW4gYXV0b3B1Ymxpc2ggaG9vay4gdGhpcyBpcyBmb3IgY29zbWV0aWMgcHVycG9zZXMgb25seVxuICAgKiAgICAoaXQgbGV0cyB1cyBkZXRlcm1pbmUgd2hldGhlciB0byBwcmludCBhIHdhcm5pbmcgc3VnZ2VzdGluZ1xuICAgKiAgICB0aGF0IHlvdSB0dXJuIG9mZiBhdXRvcHVibGlzaC4pXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBQdWJsaXNoIGEgcmVjb3JkIHNldC5cbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lIElmIFN0cmluZywgbmFtZSBvZiB0aGUgcmVjb3JkIHNldC4gIElmIE9iamVjdCwgcHVibGljYXRpb25zIERpY3Rpb25hcnkgb2YgcHVibGlzaCBmdW5jdGlvbnMgYnkgbmFtZS4gIElmIGBudWxsYCwgdGhlIHNldCBoYXMgbm8gbmFtZSwgYW5kIHRoZSByZWNvcmQgc2V0IGlzIGF1dG9tYXRpY2FsbHkgc2VudCB0byBhbGwgY29ubmVjdGVkIGNsaWVudHMuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gY2FsbGVkIG9uIHRoZSBzZXJ2ZXIgZWFjaCB0aW1lIGEgY2xpZW50IHN1YnNjcmliZXMuICBJbnNpZGUgdGhlIGZ1bmN0aW9uLCBgdGhpc2AgaXMgdGhlIHB1Ymxpc2ggaGFuZGxlciBvYmplY3QsIGRlc2NyaWJlZCBiZWxvdy4gIElmIHRoZSBjbGllbnQgcGFzc2VkIGFyZ3VtZW50cyB0byBgc3Vic2NyaWJlYCwgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50cy5cbiAgICovXG4gIHB1Ymxpc2g6IGZ1bmN0aW9uIChuYW1lLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCEgXy5pc09iamVjdChuYW1lKSkge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIGlmIChuYW1lICYmIG5hbWUgaW4gc2VsZi5wdWJsaXNoX2hhbmRsZXJzKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJJZ25vcmluZyBkdXBsaWNhdGUgcHVibGlzaCBuYW1lZCAnXCIgKyBuYW1lICsgXCInXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChQYWNrYWdlLmF1dG9wdWJsaXNoICYmICFvcHRpb25zLmlzX2F1dG8pIHtcbiAgICAgICAgLy8gVGhleSBoYXZlIGF1dG9wdWJsaXNoIG9uLCB5ZXQgdGhleSdyZSB0cnlpbmcgdG8gbWFudWFsbHlcbiAgICAgICAgLy8gcGlja2luZyBzdHVmZiB0byBwdWJsaXNoLiBUaGV5IHByb2JhYmx5IHNob3VsZCB0dXJuIG9mZlxuICAgICAgICAvLyBhdXRvcHVibGlzaC4gKFRoaXMgY2hlY2sgaXNuJ3QgcGVyZmVjdCAtLSBpZiB5b3UgY3JlYXRlIGFcbiAgICAgICAgLy8gcHVibGlzaCBiZWZvcmUgeW91IHR1cm4gb24gYXV0b3B1Ymxpc2gsIGl0IHdvbid0IGNhdGNoXG4gICAgICAgIC8vIGl0LiBCdXQgdGhpcyB3aWxsIGRlZmluaXRlbHkgaGFuZGxlIHRoZSBzaW1wbGUgY2FzZSB3aGVyZVxuICAgICAgICAvLyB5b3UndmUgYWRkZWQgdGhlIGF1dG9wdWJsaXNoIHBhY2thZ2UgdG8geW91ciBhcHAsIGFuZCBhcmVcbiAgICAgICAgLy8gY2FsbGluZyBwdWJsaXNoIGZyb20geW91ciBhcHAgY29kZS4pXG4gICAgICAgIGlmICghc2VsZi53YXJuZWRfYWJvdXRfYXV0b3B1Ymxpc2gpIHtcbiAgICAgICAgICBzZWxmLndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCA9IHRydWU7XG4gICAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcbiAgICBcIioqIFlvdSd2ZSBzZXQgdXAgc29tZSBkYXRhIHN1YnNjcmlwdGlvbnMgd2l0aCBNZXRlb3IucHVibGlzaCgpLCBidXRcXG5cIiArXG4gICAgXCIqKiB5b3Ugc3RpbGwgaGF2ZSBhdXRvcHVibGlzaCB0dXJuZWQgb24uIEJlY2F1c2UgYXV0b3B1Ymxpc2ggaXMgc3RpbGxcXG5cIiArXG4gICAgXCIqKiBvbiwgeW91ciBNZXRlb3IucHVibGlzaCgpIGNhbGxzIHdvbid0IGhhdmUgbXVjaCBlZmZlY3QuIEFsbCBkYXRhXFxuXCIgK1xuICAgIFwiKiogd2lsbCBzdGlsbCBiZSBzZW50IHRvIGFsbCBjbGllbnRzLlxcblwiICtcbiAgICBcIioqXFxuXCIgK1xuICAgIFwiKiogVHVybiBvZmYgYXV0b3B1Ymxpc2ggYnkgcmVtb3ZpbmcgdGhlIGF1dG9wdWJsaXNoIHBhY2thZ2U6XFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiAgICQgbWV0ZW9yIHJlbW92ZSBhdXRvcHVibGlzaFxcblwiICtcbiAgICBcIioqXFxuXCIgK1xuICAgIFwiKiogLi4gYW5kIG1ha2Ugc3VyZSB5b3UgaGF2ZSBNZXRlb3IucHVibGlzaCgpIGFuZCBNZXRlb3Iuc3Vic2NyaWJlKCkgY2FsbHNcXG5cIiArXG4gICAgXCIqKiBmb3IgZWFjaCBjb2xsZWN0aW9uIHRoYXQgeW91IHdhbnQgY2xpZW50cyB0byBzZWUuXFxuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChuYW1lKVxuICAgICAgICBzZWxmLnB1Ymxpc2hfaGFuZGxlcnNbbmFtZV0gPSBoYW5kbGVyO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHNlbGYudW5pdmVyc2FsX3B1Ymxpc2hfaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICAgICAgLy8gU3BpbiB1cCB0aGUgbmV3IHB1Ymxpc2hlciBvbiBhbnkgZXhpc3Rpbmcgc2Vzc2lvbiB0b28uIFJ1biBlYWNoXG4gICAgICAgIC8vIHNlc3Npb24ncyBzdWJzY3JpcHRpb24gaW4gYSBuZXcgRmliZXIsIHNvIHRoYXQgdGhlcmUncyBubyBjaGFuZ2UgZm9yXG4gICAgICAgIC8vIHNlbGYuc2Vzc2lvbnMgdG8gY2hhbmdlIHdoaWxlIHdlJ3JlIHJ1bm5pbmcgdGhpcyBsb29wLlxuICAgICAgICBfLmVhY2goc2VsZi5zZXNzaW9ucywgZnVuY3Rpb24gKHNlc3Npb24pIHtcbiAgICAgICAgICBpZiAoIXNlc3Npb24uX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMpIHtcbiAgICAgICAgICAgIEZpYmVyKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBzZXNzaW9uLl9zdGFydFN1YnNjcmlwdGlvbihoYW5kbGVyKTtcbiAgICAgICAgICAgIH0pLnJ1bigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBfLmVhY2gobmFtZSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBzZWxmLnB1Ymxpc2goa2V5LCB2YWx1ZSwge30pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF9yZW1vdmVTZXNzaW9uOiBmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5zZXNzaW9uc1tzZXNzaW9uLmlkXSkge1xuICAgICAgZGVsZXRlIHNlbGYuc2Vzc2lvbnNbc2Vzc2lvbi5pZF07XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBEZWZpbmVzIGZ1bmN0aW9ucyB0aGF0IGNhbiBiZSBpbnZva2VkIG92ZXIgdGhlIG5ldHdvcmsgYnkgY2xpZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBtZXRob2RzIERpY3Rpb25hcnkgd2hvc2Uga2V5cyBhcmUgbWV0aG9kIG5hbWVzIGFuZCB2YWx1ZXMgYXJlIGZ1bmN0aW9ucy5cbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBtZXRob2RzOiBmdW5jdGlvbiAobWV0aG9kcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmVhY2gobWV0aG9kcywgZnVuY3Rpb24gKGZ1bmMsIG5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kICdcIiArIG5hbWUgKyBcIicgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgaWYgKHNlbGYubWV0aG9kX2hhbmRsZXJzW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIG1ldGhvZCBuYW1lZCAnXCIgKyBuYW1lICsgXCInIGlzIGFscmVhZHkgZGVmaW5lZFwiKTtcbiAgICAgIHNlbGYubWV0aG9kX2hhbmRsZXJzW25hbWVdID0gZnVuYztcbiAgICB9KTtcbiAgfSxcblxuICBjYWxsOiBmdW5jdGlvbiAobmFtZSwgLi4uYXJncykge1xuICAgIGlmIChhcmdzLmxlbmd0aCAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIElmIGl0J3MgYSBmdW5jdGlvbiwgdGhlIGxhc3QgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBjYWxsYmFjaywgbm90XG4gICAgICAvLyBhIHBhcmFtZXRlciB0byB0aGUgcmVtb3RlIG1ldGhvZC5cbiAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYXBwbHkobmFtZSwgYXJncywgY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIEEgdmVyc2lvbiBvZiB0aGUgY2FsbCBtZXRob2QgdGhhdCBhbHdheXMgcmV0dXJucyBhIFByb21pc2UuXG4gIGNhbGxBc3luYzogZnVuY3Rpb24gKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5hcHBseUFzeW5jKG5hbWUsIGFyZ3MpO1xuICB9LFxuXG4gIGFwcGx5OiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBXZSB3ZXJlIHBhc3NlZCAzIGFyZ3VtZW50cy4gVGhleSBtYXkgYmUgZWl0aGVyIChuYW1lLCBhcmdzLCBvcHRpb25zKVxuICAgIC8vIG9yIChuYW1lLCBhcmdzLCBjYWxsYmFjaylcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9taXNlID0gdGhpcy5hcHBseUFzeW5jKG5hbWUsIGFyZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSByZXN1bHQgaW4gd2hpY2hldmVyIHdheSB0aGUgY2FsbGVyIGFza2VkIGZvciBpdC4gTm90ZSB0aGF0IHdlXG4gICAgLy8gZG8gTk9UIGJsb2NrIG9uIHRoZSB3cml0ZSBmZW5jZSBpbiBhbiBhbmFsb2dvdXMgd2F5IHRvIGhvdyB0aGUgY2xpZW50XG4gICAgLy8gYmxvY2tzIG9uIHRoZSByZWxldmFudCBkYXRhIGJlaW5nIHZpc2libGUsIHNvIHlvdSBhcmUgTk9UIGd1YXJhbnRlZWQgdGhhdFxuICAgIC8vIGN1cnNvciBvYnNlcnZlIGNhbGxiYWNrcyBoYXZlIGZpcmVkIHdoZW4geW91ciBjYWxsYmFjayBpcyBpbnZva2VkLiAoV2VcbiAgICAvLyBjYW4gY2hhbmdlIHRoaXMgaWYgdGhlcmUncyBhIHJlYWwgdXNlIGNhc2UuKVxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICByZXN1bHQgPT4gY2FsbGJhY2sodW5kZWZpbmVkLCByZXN1bHQpLFxuICAgICAgICBleGNlcHRpb24gPT4gY2FsbGJhY2soZXhjZXB0aW9uKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByb21pc2UuYXdhaXQoKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gQHBhcmFtIG9wdGlvbnMge09wdGlvbmFsIE9iamVjdH1cbiAgYXBwbHlBc3luYzogZnVuY3Rpb24gKG5hbWUsIGFyZ3MsIG9wdGlvbnMpIHtcbiAgICAvLyBSdW4gdGhlIGhhbmRsZXJcbiAgICB2YXIgaGFuZGxlciA9IHRoaXMubWV0aG9kX2hhbmRsZXJzW25hbWVdO1xuICAgIGlmICghIGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgbmV3IE1ldGVvci5FcnJvcig0MDQsIGBNZXRob2QgJyR7bmFtZX0nIG5vdCBmb3VuZGApXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgaXMgYSBtZXRob2QgY2FsbCBmcm9tIHdpdGhpbiBhbm90aGVyIG1ldGhvZCBvciBwdWJsaXNoIGZ1bmN0aW9uLFxuICAgIC8vIGdldCB0aGUgdXNlciBzdGF0ZSBmcm9tIHRoZSBvdXRlciBtZXRob2Qgb3IgcHVibGlzaCBmdW5jdGlvbiwgb3RoZXJ3aXNlXG4gICAgLy8gZG9uJ3QgYWxsb3cgc2V0VXNlcklkIHRvIGJlIGNhbGxlZFxuICAgIHZhciB1c2VySWQgPSBudWxsO1xuICAgIHZhciBzZXRVc2VySWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgc2V0VXNlcklkIG9uIGEgc2VydmVyIGluaXRpYXRlZCBtZXRob2QgY2FsbFwiKTtcbiAgICB9O1xuICAgIHZhciBjb25uZWN0aW9uID0gbnVsbDtcbiAgICB2YXIgY3VycmVudE1ldGhvZEludm9jYXRpb24gPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uID0gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciByYW5kb21TZWVkID0gbnVsbDtcbiAgICBpZiAoY3VycmVudE1ldGhvZEludm9jYXRpb24pIHtcbiAgICAgIHVzZXJJZCA9IGN1cnJlbnRNZXRob2RJbnZvY2F0aW9uLnVzZXJJZDtcbiAgICAgIHNldFVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICBjdXJyZW50TWV0aG9kSW52b2NhdGlvbi5zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIH07XG4gICAgICBjb25uZWN0aW9uID0gY3VycmVudE1ldGhvZEludm9jYXRpb24uY29ubmVjdGlvbjtcbiAgICAgIHJhbmRvbVNlZWQgPSBERFBDb21tb24ubWFrZVJwY1NlZWQoY3VycmVudE1ldGhvZEludm9jYXRpb24sIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAoY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbikge1xuICAgICAgdXNlcklkID0gY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi51c2VySWQ7XG4gICAgICBzZXRVc2VySWQgPSBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi5fc2Vzc2lvbi5fc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgICB9O1xuICAgICAgY29ubmVjdGlvbiA9IGN1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24uY29ubmVjdGlvbjtcbiAgICB9XG5cbiAgICB2YXIgaW52b2NhdGlvbiA9IG5ldyBERFBDb21tb24uTWV0aG9kSW52b2NhdGlvbih7XG4gICAgICBpc1NpbXVsYXRpb246IGZhbHNlLFxuICAgICAgdXNlcklkLFxuICAgICAgc2V0VXNlcklkLFxuICAgICAgY29ubmVjdGlvbixcbiAgICAgIHJhbmRvbVNlZWRcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmUoXG4gICAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLndpdGhWYWx1ZShcbiAgICAgICAgaW52b2NhdGlvbixcbiAgICAgICAgKCkgPT4gbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgIGhhbmRsZXIsIGludm9jYXRpb24sIEVKU09OLmNsb25lKGFyZ3MpLFxuICAgICAgICAgIFwiaW50ZXJuYWwgY2FsbCB0byAnXCIgKyBuYW1lICsgXCInXCJcbiAgICAgICAgKVxuICAgICAgKVxuICAgICkpLnRoZW4oRUpTT04uY2xvbmUpO1xuICB9LFxuXG4gIF91cmxGb3JTZXNzaW9uOiBmdW5jdGlvbiAoc2Vzc2lvbklkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzZXNzaW9uID0gc2VsZi5zZXNzaW9uc1tzZXNzaW9uSWRdO1xuICAgIGlmIChzZXNzaW9uKVxuICAgICAgcmV0dXJuIHNlc3Npb24uX3NvY2tldFVybDtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufSk7XG5cbnZhciBjYWxjdWxhdGVWZXJzaW9uID0gZnVuY3Rpb24gKGNsaWVudFN1cHBvcnRlZFZlcnNpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyU3VwcG9ydGVkVmVyc2lvbnMpIHtcbiAgdmFyIGNvcnJlY3RWZXJzaW9uID0gXy5maW5kKGNsaWVudFN1cHBvcnRlZFZlcnNpb25zLCBmdW5jdGlvbiAodmVyc2lvbikge1xuICAgIHJldHVybiBfLmNvbnRhaW5zKHNlcnZlclN1cHBvcnRlZFZlcnNpb25zLCB2ZXJzaW9uKTtcbiAgfSk7XG4gIGlmICghY29ycmVjdFZlcnNpb24pIHtcbiAgICBjb3JyZWN0VmVyc2lvbiA9IHNlcnZlclN1cHBvcnRlZFZlcnNpb25zWzBdO1xuICB9XG4gIHJldHVybiBjb3JyZWN0VmVyc2lvbjtcbn07XG5cbkREUFNlcnZlci5fY2FsY3VsYXRlVmVyc2lvbiA9IGNhbGN1bGF0ZVZlcnNpb247XG5cblxuLy8gXCJibGluZFwiIGV4Y2VwdGlvbnMgb3RoZXIgdGhhbiB0aG9zZSB0aGF0IHdlcmUgZGVsaWJlcmF0ZWx5IHRocm93biB0byBzaWduYWxcbi8vIGVycm9ycyB0byB0aGUgY2xpZW50XG52YXIgd3JhcEludGVybmFsRXhjZXB0aW9uID0gZnVuY3Rpb24gKGV4Y2VwdGlvbiwgY29udGV4dCkge1xuICBpZiAoIWV4Y2VwdGlvbikgcmV0dXJuIGV4Y2VwdGlvbjtcblxuICAvLyBUbyBhbGxvdyBwYWNrYWdlcyB0byB0aHJvdyBlcnJvcnMgaW50ZW5kZWQgZm9yIHRoZSBjbGllbnQgYnV0IG5vdCBoYXZlIHRvXG4gIC8vIGRlcGVuZCBvbiB0aGUgTWV0ZW9yLkVycm9yIGNsYXNzLCBgaXNDbGllbnRTYWZlYCBjYW4gYmUgc2V0IHRvIHRydWUgb24gYW55XG4gIC8vIGVycm9yIGJlZm9yZSBpdCBpcyB0aHJvd24uXG4gIGlmIChleGNlcHRpb24uaXNDbGllbnRTYWZlKSB7XG4gICAgaWYgKCEoZXhjZXB0aW9uIGluc3RhbmNlb2YgTWV0ZW9yLkVycm9yKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWxNZXNzYWdlID0gZXhjZXB0aW9uLm1lc3NhZ2U7XG4gICAgICBleGNlcHRpb24gPSBuZXcgTWV0ZW9yLkVycm9yKGV4Y2VwdGlvbi5lcnJvciwgZXhjZXB0aW9uLnJlYXNvbiwgZXhjZXB0aW9uLmRldGFpbHMpO1xuICAgICAgZXhjZXB0aW9uLm1lc3NhZ2UgPSBvcmlnaW5hbE1lc3NhZ2U7XG4gICAgfVxuICAgIHJldHVybiBleGNlcHRpb247XG4gIH1cblxuICAvLyB0ZXN0cyBjYW4gc2V0IHRoZSAnZXhwZWN0ZWQnIGZsYWcgb24gYW4gZXhjZXB0aW9uIHNvIGl0IHdvbid0IGdvIHRvIHRoZVxuICAvLyBzZXJ2ZXIgbG9nXG4gIGlmICghZXhjZXB0aW9uLmV4cGVjdGVkKSB7XG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIkV4Y2VwdGlvbiBcIiArIGNvbnRleHQsIGV4Y2VwdGlvbi5zdGFjayk7XG4gICAgaWYgKGV4Y2VwdGlvbi5zYW5pdGl6ZWRFcnJvcikge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIlNhbml0aXplZCBhbmQgcmVwb3J0ZWQgdG8gdGhlIGNsaWVudCBhczpcIiwgZXhjZXB0aW9uLnNhbml0aXplZEVycm9yLm1lc3NhZ2UpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpZCB0aGUgZXJyb3IgY29udGFpbiBtb3JlIGRldGFpbHMgdGhhdCBjb3VsZCBoYXZlIGJlZW4gdXNlZnVsIGlmIGNhdWdodCBpblxuICAvLyBzZXJ2ZXIgY29kZSAob3IgaWYgdGhyb3duIGZyb20gbm9uLWNsaWVudC1vcmlnaW5hdGVkIGNvZGUpLCBidXQgYWxzb1xuICAvLyBwcm92aWRlZCBhIFwic2FuaXRpemVkXCIgdmVyc2lvbiB3aXRoIG1vcmUgY29udGV4dCB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXJcbiAgLy8gZXJyb3I/IFVzZSB0aGF0LlxuICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yKSB7XG4gICAgaWYgKGV4Y2VwdGlvbi5zYW5pdGl6ZWRFcnJvci5pc0NsaWVudFNhZmUpXG4gICAgICByZXR1cm4gZXhjZXB0aW9uLnNhbml0aXplZEVycm9yO1xuICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gXCIgKyBjb250ZXh0ICsgXCIgcHJvdmlkZXMgYSBzYW5pdGl6ZWRFcnJvciB0aGF0IFwiICtcbiAgICAgICAgICAgICAgICAgIFwiZG9lcyBub3QgaGF2ZSBpc0NsaWVudFNhZmUgcHJvcGVydHkgc2V0OyBpZ25vcmluZ1wiKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIik7XG59O1xuXG5cbi8vIEF1ZGl0IGFyZ3VtZW50IGNoZWNrcywgaWYgdGhlIGF1ZGl0LWFyZ3VtZW50LWNoZWNrcyBwYWNrYWdlIGV4aXN0cyAoaXQgaXMgYVxuLy8gd2VhayBkZXBlbmRlbmN5IG9mIHRoaXMgcGFja2FnZSkuXG52YXIgbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzID0gZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICBpZiAoUGFja2FnZVsnYXVkaXQtYXJndW1lbnQtY2hlY2tzJ10pIHtcbiAgICByZXR1cm4gTWF0Y2guX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQoXG4gICAgICBmLCBjb250ZXh0LCBhcmdzLCBkZXNjcmlwdGlvbik7XG4gIH1cbiAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG59O1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbi8vIEEgd3JpdGUgZmVuY2UgY29sbGVjdHMgYSBncm91cCBvZiB3cml0ZXMsIGFuZCBwcm92aWRlcyBhIGNhbGxiYWNrXG4vLyB3aGVuIGFsbCBvZiB0aGUgd3JpdGVzIGFyZSBmdWxseSBjb21taXR0ZWQgYW5kIHByb3BhZ2F0ZWQgKGFsbFxuLy8gb2JzZXJ2ZXJzIGhhdmUgYmVlbiBub3RpZmllZCBvZiB0aGUgd3JpdGUgYW5kIGFja25vd2xlZGdlZCBpdC4pXG4vL1xuRERQU2VydmVyLl9Xcml0ZUZlbmNlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5hcm1lZCA9IGZhbHNlO1xuICBzZWxmLmZpcmVkID0gZmFsc2U7XG4gIHNlbGYucmV0aXJlZCA9IGZhbHNlO1xuICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcyA9IDA7XG4gIHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzID0gW107XG4gIHNlbGYuY29tcGxldGlvbl9jYWxsYmFja3MgPSBbXTtcbn07XG5cbi8vIFRoZSBjdXJyZW50IHdyaXRlIGZlbmNlLiBXaGVuIHRoZXJlIGlzIGEgY3VycmVudCB3cml0ZSBmZW5jZSwgY29kZVxuLy8gdGhhdCB3cml0ZXMgdG8gZGF0YWJhc2VzIHNob3VsZCByZWdpc3RlciB0aGVpciB3cml0ZXMgd2l0aCBpdCB1c2luZ1xuLy8gYmVnaW5Xcml0ZSgpLlxuLy9cbkREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UgPSBuZXcgTWV0ZW9yLkVudmlyb25tZW50VmFyaWFibGU7XG5cbl8uZXh0ZW5kKEREUFNlcnZlci5fV3JpdGVGZW5jZS5wcm90b3R5cGUsIHtcbiAgLy8gU3RhcnQgdHJhY2tpbmcgYSB3cml0ZSwgYW5kIHJldHVybiBhbiBvYmplY3QgdG8gcmVwcmVzZW50IGl0LiBUaGVcbiAgLy8gb2JqZWN0IGhhcyBhIHNpbmdsZSBtZXRob2QsIGNvbW1pdHRlZCgpLiBUaGlzIG1ldGhvZCBzaG91bGQgYmVcbiAgLy8gY2FsbGVkIHdoZW4gdGhlIHdyaXRlIGlzIGZ1bGx5IGNvbW1pdHRlZCBhbmQgcHJvcGFnYXRlZC4gWW91IGNhblxuICAvLyBjb250aW51ZSB0byBhZGQgd3JpdGVzIHRvIHRoZSBXcml0ZUZlbmNlIHVwIHVudGlsIGl0IGlzIHRyaWdnZXJlZFxuICAvLyAoY2FsbHMgaXRzIGNhbGxiYWNrcyBiZWNhdXNlIGFsbCB3cml0ZXMgaGF2ZSBjb21taXR0ZWQuKVxuICBiZWdpbldyaXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYucmV0aXJlZClcbiAgICAgIHJldHVybiB7IGNvbW1pdHRlZDogZnVuY3Rpb24gKCkge30gfTtcblxuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIGFkZCB3cml0ZXNcIik7XG5cbiAgICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcysrO1xuICAgIHZhciBjb21taXR0ZWQgPSBmYWxzZTtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbWl0dGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb21taXR0ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY29tbWl0dGVkIGNhbGxlZCB0d2ljZSBvbiB0aGUgc2FtZSB3cml0ZVwiKTtcbiAgICAgICAgY29tbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5vdXRzdGFuZGluZ193cml0ZXMtLTtcbiAgICAgICAgc2VsZi5fbWF5YmVGaXJlKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvLyBBcm0gdGhlIGZlbmNlLiBPbmNlIHRoZSBmZW5jZSBpcyBhcm1lZCwgYW5kIHRoZXJlIGFyZSBubyBtb3JlXG4gIC8vIHVuY29tbWl0dGVkIHdyaXRlcywgaXQgd2lsbCBhY3RpdmF0ZS5cbiAgYXJtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmID09PSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpKVxuICAgICAgdGhyb3cgRXJyb3IoXCJDYW4ndCBhcm0gdGhlIGN1cnJlbnQgZmVuY2VcIik7XG4gICAgc2VsZi5hcm1lZCA9IHRydWU7XG4gICAgc2VsZi5fbWF5YmVGaXJlKCk7XG4gIH0sXG5cbiAgLy8gUmVnaXN0ZXIgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb25jZSBiZWZvcmUgZmlyaW5nIHRoZSBmZW5jZS5cbiAgLy8gQ2FsbGJhY2sgZnVuY3Rpb24gY2FuIGFkZCBuZXcgd3JpdGVzIHRvIHRoZSBmZW5jZSwgaW4gd2hpY2ggY2FzZVxuICAvLyBpdCB3b24ndCBmaXJlIHVudGlsIHRob3NlIHdyaXRlcyBhcmUgZG9uZSBhcyB3ZWxsLlxuICBvbkJlZm9yZUZpcmU6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcImFkZCBhIGNhbGxiYWNrXCIpO1xuICAgIHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gIH0sXG5cbiAgLy8gUmVnaXN0ZXIgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZmVuY2UgZmlyZXMuXG4gIG9uQWxsQ29tbWl0dGVkOiBmdW5jdGlvbiAoZnVuYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5maXJlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImZlbmNlIGhhcyBhbHJlYWR5IGFjdGl2YXRlZCAtLSB0b28gbGF0ZSB0byBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJhZGQgYSBjYWxsYmFja1wiKTtcbiAgICBzZWxmLmNvbXBsZXRpb25fY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gIH0sXG5cbiAgLy8gQ29udmVuaWVuY2UgZnVuY3Rpb24uIEFybXMgdGhlIGZlbmNlLCB0aGVuIGJsb2NrcyB1bnRpbCBpdCBmaXJlcy5cbiAgYXJtQW5kV2FpdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLm9uQWxsQ29tbWl0dGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGZ1dHVyZVsncmV0dXJuJ10oKTtcbiAgICB9KTtcbiAgICBzZWxmLmFybSgpO1xuICAgIGZ1dHVyZS53YWl0KCk7XG4gIH0sXG5cbiAgX21heWJlRmlyZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5maXJlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIndyaXRlIGZlbmNlIGFscmVhZHkgYWN0aXZhdGVkP1wiKTtcbiAgICBpZiAoc2VsZi5hcm1lZCAmJiAhc2VsZi5vdXRzdGFuZGluZ193cml0ZXMpIHtcbiAgICAgIGZ1bmN0aW9uIGludm9rZUNhbGxiYWNrIChmdW5jKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnVuYyhzZWxmKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcImV4Y2VwdGlvbiBpbiB3cml0ZSBmZW5jZSBjYWxsYmFjazpcIiwgZXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcysrO1xuICAgICAgd2hpbGUgKHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzO1xuICAgICAgICBzZWxmLmJlZm9yZV9maXJlX2NhbGxiYWNrcyA9IFtdO1xuICAgICAgICBfLmVhY2goY2FsbGJhY2tzLCBpbnZva2VDYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcy0tO1xuXG4gICAgICBpZiAoIXNlbGYub3V0c3RhbmRpbmdfd3JpdGVzKSB7XG4gICAgICAgIHNlbGYuZmlyZWQgPSB0cnVlO1xuICAgICAgICB2YXIgY2FsbGJhY2tzID0gc2VsZi5jb21wbGV0aW9uX2NhbGxiYWNrcztcbiAgICAgICAgc2VsZi5jb21wbGV0aW9uX2NhbGxiYWNrcyA9IFtdO1xuICAgICAgICBfLmVhY2goY2FsbGJhY2tzLCBpbnZva2VDYWxsYmFjayk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vIERlYWN0aXZhdGUgdGhpcyBmZW5jZSBzbyB0aGF0IGFkZGluZyBtb3JlIHdyaXRlcyBoYXMgbm8gZWZmZWN0LlxuICAvLyBUaGUgZmVuY2UgbXVzdCBoYXZlIGFscmVhZHkgZmlyZWQuXG4gIHJldGlyZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISBzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmV0aXJlIGEgZmVuY2UgdGhhdCBoYXNuJ3QgZmlyZWQuXCIpO1xuICAgIHNlbGYucmV0aXJlZCA9IHRydWU7XG4gIH1cbn0pO1xuIiwiLy8gQSBcImNyb3NzYmFyXCIgaXMgYSBjbGFzcyB0aGF0IHByb3ZpZGVzIHN0cnVjdHVyZWQgbm90aWZpY2F0aW9uIHJlZ2lzdHJhdGlvbi5cbi8vIFNlZSBfbWF0Y2ggZm9yIHRoZSBkZWZpbml0aW9uIG9mIGhvdyBhIG5vdGlmaWNhdGlvbiBtYXRjaGVzIGEgdHJpZ2dlci5cbi8vIEFsbCBub3RpZmljYXRpb25zIGFuZCB0cmlnZ2VycyBtdXN0IGhhdmUgYSBzdHJpbmcga2V5IG5hbWVkICdjb2xsZWN0aW9uJy5cblxuRERQU2VydmVyLl9Dcm9zc2JhciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgc2VsZi5uZXh0SWQgPSAxO1xuICAvLyBtYXAgZnJvbSBjb2xsZWN0aW9uIG5hbWUgKHN0cmluZykgLT4gbGlzdGVuZXIgaWQgLT4gb2JqZWN0LiBlYWNoIG9iamVjdCBoYXNcbiAgLy8ga2V5cyAndHJpZ2dlcicsICdjYWxsYmFjaycuICBBcyBhIGhhY2ssIHRoZSBlbXB0eSBzdHJpbmcgbWVhbnMgXCJub1xuICAvLyBjb2xsZWN0aW9uXCIuXG4gIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uID0ge307XG4gIHNlbGYuZmFjdFBhY2thZ2UgPSBvcHRpb25zLmZhY3RQYWNrYWdlIHx8IFwibGl2ZWRhdGFcIjtcbiAgc2VsZi5mYWN0TmFtZSA9IG9wdGlvbnMuZmFjdE5hbWUgfHwgbnVsbDtcbn07XG5cbl8uZXh0ZW5kKEREUFNlcnZlci5fQ3Jvc3NiYXIucHJvdG90eXBlLCB7XG4gIC8vIG1zZyBpcyBhIHRyaWdnZXIgb3IgYSBub3RpZmljYXRpb25cbiAgX2NvbGxlY3Rpb25Gb3JNZXNzYWdlOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIF8uaGFzKG1zZywgJ2NvbGxlY3Rpb24nKSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mKG1zZy5jb2xsZWN0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmIChtc2cuY29sbGVjdGlvbiA9PT0gJycpXG4gICAgICAgIHRocm93IEVycm9yKFwiTWVzc2FnZSBoYXMgZW1wdHkgY29sbGVjdGlvbiFcIik7XG4gICAgICByZXR1cm4gbXNnLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiTWVzc2FnZSBoYXMgbm9uLXN0cmluZyBjb2xsZWN0aW9uIVwiKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gTGlzdGVuIGZvciBub3RpZmljYXRpb24gdGhhdCBtYXRjaCAndHJpZ2dlcicuIEEgbm90aWZpY2F0aW9uXG4gIC8vIG1hdGNoZXMgaWYgaXQgaGFzIHRoZSBrZXktdmFsdWUgcGFpcnMgaW4gdHJpZ2dlciBhcyBhXG4gIC8vIHN1YnNldC4gV2hlbiBhIG5vdGlmaWNhdGlvbiBtYXRjaGVzLCBjYWxsICdjYWxsYmFjaycsIHBhc3NpbmdcbiAgLy8gdGhlIGFjdHVhbCBub3RpZmljYXRpb24uXG4gIC8vXG4gIC8vIFJldHVybnMgYSBsaXN0ZW4gaGFuZGxlLCB3aGljaCBpcyBhbiBvYmplY3Qgd2l0aCBhIG1ldGhvZFxuICAvLyBzdG9wKCkuIENhbGwgc3RvcCgpIHRvIHN0b3AgbGlzdGVuaW5nLlxuICAvL1xuICAvLyBYWFggSXQgc2hvdWxkIGJlIGxlZ2FsIHRvIGNhbGwgZmlyZSgpIGZyb20gaW5zaWRlIGEgbGlzdGVuKClcbiAgLy8gY2FsbGJhY2s/XG4gIGxpc3RlbjogZnVuY3Rpb24gKHRyaWdnZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpZCA9IHNlbGYubmV4dElkKys7XG5cbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2NvbGxlY3Rpb25Gb3JNZXNzYWdlKHRyaWdnZXIpO1xuICAgIHZhciByZWNvcmQgPSB7dHJpZ2dlcjogRUpTT04uY2xvbmUodHJpZ2dlciksIGNhbGxiYWNrOiBjYWxsYmFja307XG4gICAgaWYgKCEgXy5oYXMoc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24sIGNvbGxlY3Rpb24pKSB7XG4gICAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXSA9IHt9O1xuICAgIH1cbiAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXVtpZF0gPSByZWNvcmQ7XG5cbiAgICBpZiAoc2VsZi5mYWN0TmFtZSAmJiBQYWNrYWdlLmZhY3RzKSB7XG4gICAgICBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIHNlbGYuZmFjdFBhY2thZ2UsIHNlbGYuZmFjdE5hbWUsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLmZhY3ROYW1lICYmIFBhY2thZ2UuZmFjdHMpIHtcbiAgICAgICAgICBQYWNrYWdlLmZhY3RzLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgICBzZWxmLmZhY3RQYWNrYWdlLCBzZWxmLmZhY3ROYW1lLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dW2lkXTtcbiAgICAgICAgaWYgKF8uaXNFbXB0eShzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXSkpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8vIEZpcmUgdGhlIHByb3ZpZGVkICdub3RpZmljYXRpb24nIChhbiBvYmplY3Qgd2hvc2UgYXR0cmlidXRlXG4gIC8vIHZhbHVlcyBhcmUgYWxsIEpTT04tY29tcGF0aWJpbGUpIC0tIGluZm9ybSBhbGwgbWF0Y2hpbmcgbGlzdGVuZXJzXG4gIC8vIChyZWdpc3RlcmVkIHdpdGggbGlzdGVuKCkpLlxuICAvL1xuICAvLyBJZiBmaXJlKCkgaXMgY2FsbGVkIGluc2lkZSBhIHdyaXRlIGZlbmNlLCB0aGVuIGVhY2ggb2YgdGhlXG4gIC8vIGxpc3RlbmVyIGNhbGxiYWNrcyB3aWxsIGJlIGNhbGxlZCBpbnNpZGUgdGhlIHdyaXRlIGZlbmNlIGFzIHdlbGwuXG4gIC8vXG4gIC8vIFRoZSBsaXN0ZW5lcnMgbWF5IGJlIGludm9rZWQgaW4gcGFyYWxsZWwsIHJhdGhlciB0aGFuIHNlcmlhbGx5LlxuICBmaXJlOiBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLl9jb2xsZWN0aW9uRm9yTWVzc2FnZShub3RpZmljYXRpb24pO1xuXG4gICAgaWYgKCEgXy5oYXMoc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24sIGNvbGxlY3Rpb24pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVyc0ZvckNvbGxlY3Rpb24gPSBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXTtcbiAgICB2YXIgY2FsbGJhY2tJZHMgPSBbXTtcbiAgICBfLmVhY2gobGlzdGVuZXJzRm9yQ29sbGVjdGlvbiwgZnVuY3Rpb24gKGwsIGlkKSB7XG4gICAgICBpZiAoc2VsZi5fbWF0Y2hlcyhub3RpZmljYXRpb24sIGwudHJpZ2dlcikpIHtcbiAgICAgICAgY2FsbGJhY2tJZHMucHVzaChpZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBMaXN0ZW5lciBjYWxsYmFja3MgY2FuIHlpZWxkLCBzbyB3ZSBuZWVkIHRvIGZpcnN0IGZpbmQgYWxsIHRoZSBvbmVzIHRoYXRcbiAgICAvLyBtYXRjaCBpbiBhIHNpbmdsZSBpdGVyYXRpb24gb3ZlciBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbiAod2hpY2ggY2FuJ3RcbiAgICAvLyBiZSBtdXRhdGVkIGR1cmluZyB0aGlzIGl0ZXJhdGlvbiksIGFuZCB0aGVuIGludm9rZSB0aGUgbWF0Y2hpbmdcbiAgICAvLyBjYWxsYmFja3MsIGNoZWNraW5nIGJlZm9yZSBlYWNoIGNhbGwgdG8gZW5zdXJlIHRoZXkgaGF2ZW4ndCBzdG9wcGVkLlxuICAgIC8vIE5vdGUgdGhhdCB3ZSBkb24ndCBoYXZlIHRvIGNoZWNrIHRoYXRcbiAgICAvLyBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXSBzdGlsbCA9PT0gbGlzdGVuZXJzRm9yQ29sbGVjdGlvbixcbiAgICAvLyBiZWNhdXNlIHRoZSBvbmx5IHdheSB0aGF0IHN0b3BzIGJlaW5nIHRydWUgaXMgaWYgbGlzdGVuZXJzRm9yQ29sbGVjdGlvblxuICAgIC8vIGZpcnN0IGdldHMgcmVkdWNlZCBkb3duIHRvIHRoZSBlbXB0eSBvYmplY3QgKGFuZCB0aGVuIG5ldmVyIGdldHNcbiAgICAvLyBpbmNyZWFzZWQgYWdhaW4pLlxuICAgIF8uZWFjaChjYWxsYmFja0lkcywgZnVuY3Rpb24gKGlkKSB7XG4gICAgICBpZiAoXy5oYXMobGlzdGVuZXJzRm9yQ29sbGVjdGlvbiwgaWQpKSB7XG4gICAgICAgIGxpc3RlbmVyc0ZvckNvbGxlY3Rpb25baWRdLmNhbGxiYWNrKG5vdGlmaWNhdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gQSBub3RpZmljYXRpb24gbWF0Y2hlcyBhIHRyaWdnZXIgaWYgYWxsIGtleXMgdGhhdCBleGlzdCBpbiBib3RoIGFyZSBlcXVhbC5cbiAgLy9cbiAgLy8gRXhhbXBsZXM6XG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIn1cbiAgLy8gICAgKGEgbm9uLXRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBtYXRjaGVzIGFcbiAgLy8gICAgIG5vbi10YXJnZXRlZCBxdWVyeSlcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9IG1hdGNoZXMgVDp7Y29sbGVjdGlvbjogXCJDXCJ9XG4gIC8vICAgIChhIHRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBtYXRjaGVzIGEgbm9uLXRhcmdldGVkIHF1ZXJ5KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCJ9IG1hdGNoZXMgVDp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn1cbiAgLy8gICAgKGEgbm9uLXRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBtYXRjaGVzIGFcbiAgLy8gICAgIHRhcmdldGVkIHF1ZXJ5KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifVxuICAvLyAgICAoYSB0YXJnZXRlZCB3cml0ZSB0byBhIGNvbGxlY3Rpb24gbWF0Y2hlcyBhIHRhcmdldGVkIHF1ZXJ5IHRhcmdldGVkXG4gIC8vICAgICBhdCB0aGUgc2FtZSBkb2N1bWVudClcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9IGRvZXMgbm90IG1hdGNoIFQ6e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJZXCJ9XG4gIC8vICAgIChhIHRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBkb2VzIG5vdCBtYXRjaCBhIHRhcmdldGVkIHF1ZXJ5XG4gIC8vICAgICB0YXJnZXRlZCBhdCBhIGRpZmZlcmVudCBkb2N1bWVudClcbiAgX21hdGNoZXM6IGZ1bmN0aW9uIChub3RpZmljYXRpb24sIHRyaWdnZXIpIHtcbiAgICAvLyBNb3N0IG5vdGlmaWNhdGlvbnMgdGhhdCB1c2UgdGhlIGNyb3NzYmFyIGhhdmUgYSBzdHJpbmcgYGNvbGxlY3Rpb25gIGFuZFxuICAgIC8vIG1heWJlIGFuIGBpZGAgdGhhdCBpcyBhIHN0cmluZyBvciBPYmplY3RJRC4gV2UncmUgYWxyZWFkeSBkaXZpZGluZyB1cFxuICAgIC8vIHRyaWdnZXJzIGJ5IGNvbGxlY3Rpb24sIGJ1dCBsZXQncyBmYXN0LXRyYWNrIFwibm9wZSwgZGlmZmVyZW50IElEXCIgKGFuZFxuICAgIC8vIGF2b2lkIHRoZSBvdmVybHkgZ2VuZXJpYyBFSlNPTi5lcXVhbHMpLiBUaGlzIG1ha2VzIGEgbm90aWNlYWJsZVxuICAgIC8vIHBlcmZvcm1hbmNlIGRpZmZlcmVuY2U7IHNlZSBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9wdWxsLzM2OTdcbiAgICBpZiAodHlwZW9mKG5vdGlmaWNhdGlvbi5pZCkgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIHR5cGVvZih0cmlnZ2VyLmlkKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgbm90aWZpY2F0aW9uLmlkICE9PSB0cmlnZ2VyLmlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChub3RpZmljYXRpb24uaWQgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEICYmXG4gICAgICAgIHRyaWdnZXIuaWQgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEICYmXG4gICAgICAgICEgbm90aWZpY2F0aW9uLmlkLmVxdWFscyh0cmlnZ2VyLmlkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBfLmFsbCh0cmlnZ2VyLCBmdW5jdGlvbiAodHJpZ2dlclZhbHVlLCBrZXkpIHtcbiAgICAgIHJldHVybiAhXy5oYXMobm90aWZpY2F0aW9uLCBrZXkpIHx8XG4gICAgICAgIEVKU09OLmVxdWFscyh0cmlnZ2VyVmFsdWUsIG5vdGlmaWNhdGlvbltrZXldKTtcbiAgICB9KTtcbiAgfVxufSk7XG5cbi8vIFRoZSBcImludmFsaWRhdGlvbiBjcm9zc2JhclwiIGlzIGEgc3BlY2lmaWMgaW5zdGFuY2UgdXNlZCBieSB0aGUgRERQIHNlcnZlciB0b1xuLy8gaW1wbGVtZW50IHdyaXRlIGZlbmNlIG5vdGlmaWNhdGlvbnMuIExpc3RlbmVyIGNhbGxiYWNrcyBvbiB0aGlzIGNyb3NzYmFyXG4vLyBzaG91bGQgY2FsbCBiZWdpbldyaXRlIG9uIHRoZSBjdXJyZW50IHdyaXRlIGZlbmNlIGJlZm9yZSB0aGV5IHJldHVybiwgaWYgdGhleVxuLy8gd2FudCB0byBkZWxheSB0aGUgd3JpdGUgZmVuY2UgZnJvbSBmaXJpbmcgKGllLCB0aGUgRERQIG1ldGhvZC1kYXRhLXVwZGF0ZWRcbi8vIG1lc3NhZ2UgZnJvbSBiZWluZyBzZW50KS5cbkREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIgPSBuZXcgRERQU2VydmVyLl9Dcm9zc2Jhcih7XG4gIGZhY3ROYW1lOiBcImludmFsaWRhdGlvbi1jcm9zc2Jhci1saXN0ZW5lcnNcIlxufSk7XG4iLCJpZiAocHJvY2Vzcy5lbnYuRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwpIHtcbiAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCA9XG4gICAgcHJvY2Vzcy5lbnYuRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkw7XG59XG5cbk1ldGVvci5zZXJ2ZXIgPSBuZXcgU2VydmVyO1xuXG5NZXRlb3IucmVmcmVzaCA9IGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgRERQU2VydmVyLl9JbnZhbGlkYXRpb25Dcm9zc2Jhci5maXJlKG5vdGlmaWNhdGlvbik7XG59O1xuXG4vLyBQcm94eSB0aGUgcHVibGljIG1ldGhvZHMgb2YgTWV0ZW9yLnNlcnZlciBzbyB0aGV5IGNhblxuLy8gYmUgY2FsbGVkIGRpcmVjdGx5IG9uIE1ldGVvci5cbl8uZWFjaChbJ3B1Ymxpc2gnLCAnbWV0aG9kcycsICdjYWxsJywgJ2FwcGx5JywgJ29uQ29ubmVjdGlvbicsICdvbk1lc3NhZ2UnXSxcbiAgICAgICBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgTWV0ZW9yW25hbWVdID0gXy5iaW5kKE1ldGVvci5zZXJ2ZXJbbmFtZV0sIE1ldGVvci5zZXJ2ZXIpO1xuICAgICAgIH0pO1xuXG4vLyBNZXRlb3Iuc2VydmVyIHVzZWQgdG8gYmUgY2FsbGVkIE1ldGVvci5kZWZhdWx0X3NlcnZlci4gUHJvdmlkZVxuLy8gYmFja2NvbXBhdCBhcyBhIGNvdXJ0ZXN5IGV2ZW4gdGhvdWdoIGl0IHdhcyBuZXZlciBkb2N1bWVudGVkLlxuLy8gWFhYIENPTVBBVCBXSVRIIDAuNi40XG5NZXRlb3IuZGVmYXVsdF9zZXJ2ZXIgPSBNZXRlb3Iuc2VydmVyO1xuIl19
