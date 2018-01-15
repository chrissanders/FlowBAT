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
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Retry = Package.retry.Retry;
var IdMap = Package['id-map'].IdMap;
var ECMAScript = Package.ecmascript.ECMAScript;
var Hook = Package['callback-hook'].Hook;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options, toSockjsUrl, toWebsocketUrl, allConnections, DDP;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-client":{"stream_client_nodejs.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/stream_client_nodejs.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const module1 = module;
let DDP, LivedataTest;
module1.watch(require("./namespace.js"), {
  DDP(v) {
    DDP = v;
  },

  LivedataTest(v) {
    LivedataTest = v;
  }

}, 0);
// @param endpoint {String} URL to Meteor app
//   "http://subdomain.meteor.com/" or "/" or
//   "ddp+sockjs://foo-**.meteor.com/sockjs"
//
// We do some rewriting of the URL to eventually make it "ws://" or "wss://",
// whatever was passed in.  At the very least, what Meteor.absoluteUrl() returns
// us should work.
//
// We don't do any heartbeating. (The logic that did this in sockjs was removed,
// because it used a built-in sockjs mechanism. We could do it with WebSocket
// ping frames or with DDP-level messages.)
LivedataTest.ClientStream = class ClientStream {
  constructor(endpoint, options) {
    const self = this;
    options = options || {};
    self.options = Object.assign({
      retry: true
    }, options);
    self.client = null; // created in _launchConnection

    self.endpoint = endpoint;
    self.headers = self.options.headers || {};
    self.npmFayeOptions = self.options.npmFayeOptions || {};

    self._initCommon(self.options); //// Kickoff!


    self._launchConnection();
  } // data is a utf8 string. Data sent while not connected is dropped on
  // the floor, and it is up the user of this API to retransmit lost
  // messages on 'reset'


  send(data) {
    var self = this;

    if (self.currentStatus.connected) {
      self.client.send(data);
    }
  } // Changes where this connection points


  _changeUrl(url) {
    var self = this;
    self.endpoint = url;
  }

  _onConnect(client) {
    var self = this;

    if (client !== self.client) {
      // This connection is not from the last call to _launchConnection.
      // But _launchConnection calls _cleanup which closes previous connections.
      // It's our belief that this stifles future 'open' events, but maybe
      // we are wrong?
      throw new Error("Got open from inactive client " + !!self.client);
    }

    if (self._forcedToDisconnect) {
      // We were asked to disconnect between trying to open the connection and
      // actually opening it. Let's just pretend this never happened.
      self.client.close();
      self.client = null;
      return;
    }

    if (self.currentStatus.connected) {
      // We already have a connection. It must have been the case that we
      // started two parallel connection attempts (because we wanted to
      // 'reconnect now' on a hanging connection and we had no way to cancel the
      // connection attempt.) But this shouldn't happen (similarly to the client
      // !== self.client check above).
      throw new Error("Two parallel connections?");
    }

    self._clearConnectionTimer(); // update status


    self.currentStatus.status = "connected";
    self.currentStatus.connected = true;
    self.currentStatus.retryCount = 0;
    self.statusChanged(); // fire resets. This must come after status change so that clients
    // can call send from within a reset callback.

    _.each(self.eventCallbacks.reset, function (callback) {
      callback();
    });
  }

  _cleanup(maybeError) {
    var self = this;

    self._clearConnectionTimer();

    if (self.client) {
      var client = self.client;
      self.client = null;
      client.close();

      _.each(self.eventCallbacks.disconnect, function (callback) {
        callback(maybeError);
      });
    }
  }

  _clearConnectionTimer() {
    var self = this;

    if (self.connectionTimer) {
      clearTimeout(self.connectionTimer);
      self.connectionTimer = null;
    }
  }

  _getProxyUrl(targetUrl) {
    var self = this; // Similar to code in tools/http-helpers.js.

    var proxy = process.env.HTTP_PROXY || process.env.http_proxy || null; // if we're going to a secure url, try the https_proxy env variable first.

    if (targetUrl.match(/^wss:/)) {
      proxy = process.env.HTTPS_PROXY || process.env.https_proxy || proxy;
    }

    return proxy;
  }

  _launchConnection() {
    var self = this;

    self._cleanup(); // cleanup the old socket, if there was one.
    // Since server-to-server DDP is still an experimental feature, we only
    // require the module if we actually create a server-to-server
    // connection.


    var FayeWebSocket = Npm.require('faye-websocket');

    var deflate = Npm.require('permessage-deflate');

    var targetUrl = toWebsocketUrl(self.endpoint);
    var fayeOptions = {
      headers: self.headers,
      extensions: [deflate]
    };
    fayeOptions = _.extend(fayeOptions, self.npmFayeOptions);

    var proxyUrl = self._getProxyUrl(targetUrl);

    if (proxyUrl) {
      fayeOptions.proxy = {
        origin: proxyUrl
      };
    }

    ; // We would like to specify 'ddp' as the subprotocol here. The npm module we
    // used to use as a client would fail the handshake if we ask for a
    // subprotocol and the server doesn't send one back (and sockjs doesn't).
    // Faye doesn't have that behavior; it's unclear from reading RFC 6455 if
    // Faye is erroneous or not.  So for now, we don't specify protocols.

    var subprotocols = [];
    var client = self.client = new FayeWebSocket.Client(targetUrl, subprotocols, fayeOptions);

    self._clearConnectionTimer();

    self.connectionTimer = Meteor.setTimeout(function () {
      self._lostConnection(new DDP.ConnectionError("DDP connection timed out"));
    }, self.CONNECT_TIMEOUT);
    self.client.on('open', Meteor.bindEnvironment(function () {
      return self._onConnect(client);
    }, "stream connect callback"));

    var clientOnIfCurrent = function (event, description, f) {
      self.client.on(event, Meteor.bindEnvironment(function () {
        // Ignore events from any connection we've already cleaned up.
        if (client !== self.client) return;
        f.apply(this, arguments);
      }, description));
    };

    clientOnIfCurrent('error', 'stream error callback', function (error) {
      if (!self.options._dontPrintErrors) Meteor._debug("stream error", error.message); // Faye's 'error' object is not a JS error (and among other things,
      // doesn't stringify well). Convert it to one.

      self._lostConnection(new DDP.ConnectionError(error.message));
    });
    clientOnIfCurrent('close', 'stream close callback', function () {
      self._lostConnection();
    });
    clientOnIfCurrent('message', 'stream message callback', function (message) {
      // Ignore binary frames, where message.data is a Buffer
      if (typeof message.data !== "string") return;

      _.each(self.eventCallbacks.message, function (callback) {
        callback(message.data);
      });
    });
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stream_client_common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/stream_client_common.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let DDP, LivedataTest;
module.watch(require("./namespace.js"), {
  DDP(v) {
    DDP = v;
  },

  LivedataTest(v) {
    LivedataTest = v;
  }

}, 0);

// XXX from Underscore.String (http://epeli.github.com/underscore.string/)
var startsWith = function (str, starts) {
  return str.length >= starts.length && str.substring(0, starts.length) === starts;
};

var endsWith = function (str, ends) {
  return str.length >= ends.length && str.substring(str.length - ends.length) === ends;
}; // @param url {String} URL to Meteor app, eg:
//   "/" or "madewith.meteor.com" or "https://foo.meteor.com"
//   or "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"
// @returns {String} URL to the endpoint with the specific scheme and subPath, e.g.
// for scheme "http" and subPath "sockjs"
//   "http://subdomain.meteor.com/sockjs" or "/sockjs"
//   or "https://ddp--1234-foo.meteor.com/sockjs"


var translateUrl = function (url, newSchemeBase, subPath) {
  if (!newSchemeBase) {
    newSchemeBase = "http";
  }

  var ddpUrlMatch = url.match(/^ddp(i?)\+sockjs:\/\//);
  var httpUrlMatch = url.match(/^http(s?):\/\//);
  var newScheme;

  if (ddpUrlMatch) {
    // Remove scheme and split off the host.
    var urlAfterDDP = url.substr(ddpUrlMatch[0].length);
    newScheme = ddpUrlMatch[1] === "i" ? newSchemeBase : newSchemeBase + "s";
    var slashPos = urlAfterDDP.indexOf('/');
    var host = slashPos === -1 ? urlAfterDDP : urlAfterDDP.substr(0, slashPos);
    var rest = slashPos === -1 ? '' : urlAfterDDP.substr(slashPos); // In the host (ONLY!), change '*' characters into random digits. This
    // allows different stream connections to connect to different hostnames
    // and avoid browser per-hostname connection limits.

    host = host.replace(/\*/g, function () {
      return Math.floor(Random.fraction() * 10);
    });
    return newScheme + '://' + host + rest;
  } else if (httpUrlMatch) {
    newScheme = !httpUrlMatch[1] ? newSchemeBase : newSchemeBase + "s";
    var urlAfterHttp = url.substr(httpUrlMatch[0].length);
    url = newScheme + "://" + urlAfterHttp;
  } // Prefix FQDNs but not relative URLs


  if (url.indexOf("://") === -1 && !startsWith(url, "/")) {
    url = newSchemeBase + "://" + url;
  } // XXX This is not what we should be doing: if I have a site
  // deployed at "/foo", then DDP.connect("/") should actually connect
  // to "/", not to "/foo". "/" is an absolute path. (Contrast: if
  // deployed at "/foo", it would be reasonable for DDP.connect("bar")
  // to connect to "/foo/bar").
  //
  // We should make this properly honor absolute paths rather than
  // forcing the path to be relative to the site root. Simultaneously,
  // we should set DDP_DEFAULT_CONNECTION_URL to include the site
  // root. See also client_convenience.js #RationalizingRelativeDDPURLs


  url = Meteor._relativeToSiteRootUrl(url);
  if (endsWith(url, "/")) return url + subPath;else return url + "/" + subPath;
};

toSockjsUrl = function (url) {
  return translateUrl(url, "http", "sockjs");
};

toWebsocketUrl = function (url) {
  var ret = translateUrl(url, "ws", "websocket");
  return ret;
};

LivedataTest.toSockjsUrl = toSockjsUrl;

_.extend(LivedataTest.ClientStream.prototype, {
  // Register for callbacks.
  on: function (name, callback) {
    var self = this;
    if (name !== 'message' && name !== 'reset' && name !== 'disconnect') throw new Error("unknown event type: " + name);
    if (!self.eventCallbacks[name]) self.eventCallbacks[name] = [];
    self.eventCallbacks[name].push(callback);
  },
  _initCommon: function (options) {
    var self = this;
    options = options || {}; //// Constants
    // how long to wait until we declare the connection attempt
    // failed.

    self.CONNECT_TIMEOUT = options.connectTimeoutMs || 10000;
    self.eventCallbacks = {}; // name -> [callback]

    self._forcedToDisconnect = false; //// Reactive status

    self.currentStatus = {
      status: "connecting",
      connected: false,
      retryCount: 0
    };
    self.statusListeners = typeof Tracker !== 'undefined' && new Tracker.Dependency();

    self.statusChanged = function () {
      if (self.statusListeners) self.statusListeners.changed();
    }; //// Retry logic


    self._retry = new Retry();
    self.connectionTimer = null;
  },
  // Trigger a reconnect.
  reconnect: function (options) {
    var self = this;
    options = options || {};

    if (options.url) {
      self._changeUrl(options.url);
    }

    if (options._sockjsOptions) {
      self.options._sockjsOptions = options._sockjsOptions;
    }

    if (self.currentStatus.connected) {
      if (options._force || options.url) {
        // force reconnect.
        self._lostConnection(new DDP.ForcedReconnectError());
      } // else, noop.


      return;
    } // if we're mid-connection, stop it.


    if (self.currentStatus.status === "connecting") {
      // Pretend it's a clean close.
      self._lostConnection();
    }

    self._retry.clear();

    self.currentStatus.retryCount -= 1; // don't count manual retries

    self._retryNow();
  },
  disconnect: function (options) {
    var self = this;
    options = options || {}; // Failed is permanent. If we're failed, don't let people go back
    // online by calling 'disconnect' then 'reconnect'.

    if (self._forcedToDisconnect) return; // If _permanent is set, permanently disconnect a stream. Once a stream
    // is forced to disconnect, it can never reconnect. This is for
    // error cases such as ddp version mismatch, where trying again
    // won't fix the problem.

    if (options._permanent) {
      self._forcedToDisconnect = true;
    }

    self._cleanup();

    self._retry.clear();

    self.currentStatus = {
      status: options._permanent ? "failed" : "offline",
      connected: false,
      retryCount: 0
    };
    if (options._permanent && options._error) self.currentStatus.reason = options._error;
    self.statusChanged();
  },
  // maybeError is set unless it's a clean protocol-level close.
  _lostConnection: function (maybeError) {
    var self = this;

    self._cleanup(maybeError);

    self._retryLater(maybeError); // sets status. no need to do it here.

  },
  // fired when we detect that we've gone online. try to reconnect
  // immediately.
  _online: function () {
    // if we've requested to be offline by disconnecting, don't reconnect.
    if (this.currentStatus.status != "offline") this.reconnect();
  },
  _retryLater: function (maybeError) {
    var self = this;
    var timeout = 0;

    if (self.options.retry || maybeError && maybeError.errorType === "DDP.ForcedReconnectError") {
      timeout = self._retry.retryLater(self.currentStatus.retryCount, _.bind(self._retryNow, self));
      self.currentStatus.status = "waiting";
      self.currentStatus.retryTime = new Date().getTime() + timeout;
    } else {
      self.currentStatus.status = "failed";
      delete self.currentStatus.retryTime;
    }

    self.currentStatus.connected = false;
    self.statusChanged();
  },
  _retryNow: function () {
    var self = this;
    if (self._forcedToDisconnect) return;
    self.currentStatus.retryCount += 1;
    self.currentStatus.status = "connecting";
    self.currentStatus.connected = false;
    delete self.currentStatus.retryTime;
    self.statusChanged();

    self._launchConnection();
  },
  // Get current status. Reactive.
  status: function () {
    var self = this;
    if (self.statusListeners) self.statusListeners.depend();
    return self.currentStatus;
  }
});

DDP.ConnectionError = Meteor.makeErrorType("DDP.ConnectionError", function (message) {
  var self = this;
  self.message = message;
});
DDP.ForcedReconnectError = Meteor.makeErrorType("DDP.ForcedReconnectError", function () {});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/livedata_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let DDP, LivedataTest;
module.watch(require("./namespace.js"), {
  DDP(v) {
    DDP = v;
  },

  LivedataTest(v) {
    LivedataTest = v;
  }

}, 0);
LivedataTest.SUPPORTED_DDP_VERSIONS = DDPCommon.SUPPORTED_DDP_VERSIONS; // This is private but it's used in a few places. accounts-base uses
// it to get the current user. Meteor.setTimeout and friends clear
// it. We can probably find a better way to factor this.

DDP._CurrentMethodInvocation = new Meteor.EnvironmentVariable();
DDP._CurrentPublicationInvocation = new Meteor.EnvironmentVariable(); // XXX: Keep DDP._CurrentInvocation for backwards-compatibility.

DDP._CurrentInvocation = DDP._CurrentMethodInvocation;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"random_stream.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/random_stream.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let DDP;
module.watch(require("./namespace.js"), {
  DDP(v) {
    DDP = v;
  }

}, 0);

// Returns the named sequence of pseudo-random values.
// The scope will be DDP._CurrentMethodInvocation.get(), so the stream will produce
// consistent values for method calls on the client and server.
DDP.randomStream = function (name) {
  var scope = DDP._CurrentMethodInvocation.get();

  return DDPCommon.RandomStream.get(scope, name);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_connection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/livedata_connection.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let DDP, LivedataTest;
module.watch(require("./namespace.js"), {
  DDP(v) {
    DDP = v;
  },

  LivedataTest(v) {
    LivedataTest = v;
  }

}, 0);
let MongoIDMap;
module.watch(require("./id_map.js"), {
  MongoIDMap(v) {
    MongoIDMap = v;
  }

}, 1);

if (Meteor.isServer) {
  var Fiber = Npm.require('fibers');

  var Future = Npm.require('fibers/future');
} // @param url {String|Object} URL to Meteor app,
//   or an object as a test hook (see code)
// Options:
//   reloadWithOutstanding: is it OK to reload if there are outstanding methods?
//   headers: extra headers to send on the websockets connection, for
//     server-to-server DDP only
//   _sockjsOptions: Specifies options to pass through to the sockjs client
//   onDDPNegotiationVersionFailure: callback when version negotiation fails.
//
// XXX There should be a way to destroy a DDP connection, causing all
// outstanding method calls to fail.
//
// XXX Our current way of handling failure and reconnection is great
// for an app (where we want to tolerate being disconnected as an
// expect state, and keep trying forever to reconnect) but cumbersome
// for something like a command line tool that wants to make a
// connection, call a method, and print an error if connection
// fails. We should have better usability in the latter case (while
// still transparently reconnecting if it's just a transient failure
// or the server migrating us).


var Connection = function (url, options) {
  var self = this;
  options = _.extend({
    onConnected: function () {},
    onDDPVersionNegotiationFailure: function (description) {
      Meteor._debug(description);
    },
    heartbeatInterval: 17500,
    heartbeatTimeout: 15000,
    npmFayeOptions: {},
    // These options are only for testing.
    reloadWithOutstanding: false,
    supportedDDPVersions: DDPCommon.SUPPORTED_DDP_VERSIONS,
    retry: true,
    respondToPings: true,
    // When updates are coming within this ms interval, batch them together.
    bufferedWritesInterval: 5,
    // Flush buffers immediately if writes are happening continuously for more than this many ms.
    bufferedWritesMaxAge: 500
  }, options); // If set, called when we reconnect, queuing method calls _before_ the
  // existing outstanding ones.
  // NOTE: This feature has been preserved for backwards compatibility. The
  // preferred method of setting a callback on reconnect is to use
  // DDP.onReconnect.

  self.onReconnect = null; // as a test hook, allow passing a stream instead of a url.

  if (typeof url === "object") {
    self._stream = url;
  } else {
    self._stream = new LivedataTest.ClientStream(url, {
      retry: options.retry,
      headers: options.headers,
      _sockjsOptions: options._sockjsOptions,
      // Used to keep some tests quiet, or for other cases in which
      // the right thing to do with connection errors is to silently
      // fail (e.g. sending package usage stats). At some point we
      // should have a real API for handling client-stream-level
      // errors.
      _dontPrintErrors: options._dontPrintErrors,
      connectTimeoutMs: options.connectTimeoutMs,
      npmFayeOptions: options.npmFayeOptions
    });
  }

  self._lastSessionId = null;
  self._versionSuggestion = null; // The last proposed DDP version.

  self._version = null; // The DDP version agreed on by client and server.

  self._stores = {}; // name -> object with methods

  self._methodHandlers = {}; // name -> func

  self._nextMethodId = 1;
  self._supportedDDPVersions = options.supportedDDPVersions;
  self._heartbeatInterval = options.heartbeatInterval;
  self._heartbeatTimeout = options.heartbeatTimeout; // Tracks methods which the user has tried to call but which have not yet
  // called their user callback (ie, they are waiting on their result or for all
  // of their writes to be written to the local cache). Map from method ID to
  // MethodInvoker object.

  self._methodInvokers = {}; // Tracks methods which the user has called but whose result messages have not
  // arrived yet.
  //
  // _outstandingMethodBlocks is an array of blocks of methods. Each block
  // represents a set of methods that can run at the same time. The first block
  // represents the methods which are currently in flight; subsequent blocks
  // must wait for previous blocks to be fully finished before they can be sent
  // to the server.
  //
  // Each block is an object with the following fields:
  // - methods: a list of MethodInvoker objects
  // - wait: a boolean; if true, this block had a single method invoked with
  //         the "wait" option
  //
  // There will never be adjacent blocks with wait=false, because the only thing
  // that makes methods need to be serialized is a wait method.
  //
  // Methods are removed from the first block when their "result" is
  // received. The entire first block is only removed when all of the in-flight
  // methods have received their results (so the "methods" list is empty) *AND*
  // all of the data written by those methods are visible in the local cache. So
  // it is possible for the first block's methods list to be empty, if we are
  // still waiting for some objects to quiesce.
  //
  // Example:
  //  _outstandingMethodBlocks = [
  //    {wait: false, methods: []},
  //    {wait: true, methods: [<MethodInvoker for 'login'>]},
  //    {wait: false, methods: [<MethodInvoker for 'foo'>,
  //                            <MethodInvoker for 'bar'>]}]
  // This means that there were some methods which were sent to the server and
  // which have returned their results, but some of the data written by
  // the methods may not be visible in the local cache. Once all that data is
  // visible, we will send a 'login' method. Once the login method has returned
  // and all the data is visible (including re-running subs if userId changes),
  // we will send the 'foo' and 'bar' methods in parallel.

  self._outstandingMethodBlocks = []; // method ID -> array of objects with keys 'collection' and 'id', listing
  // documents written by a given method's stub. keys are associated with
  // methods whose stub wrote at least one document, and whose data-done message
  // has not yet been received.

  self._documentsWrittenByStub = {}; // collection -> IdMap of "server document" object. A "server document" has:
  // - "document": the version of the document according the
  //   server (ie, the snapshot before a stub wrote it, amended by any changes
  //   received from the server)
  //   It is undefined if we think the document does not exist
  // - "writtenByStubs": a set of method IDs whose stubs wrote to the document
  //   whose "data done" messages have not yet been processed

  self._serverDocuments = {}; // Array of callbacks to be called after the next update of the local
  // cache. Used for:
  //  - Calling methodInvoker.dataVisible and sub ready callbacks after
  //    the relevant data is flushed.
  //  - Invoking the callbacks of "half-finished" methods after reconnect
  //    quiescence. Specifically, methods whose result was received over the old
  //    connection (so we don't re-send it) but whose data had not been made
  //    visible.

  self._afterUpdateCallbacks = []; // In two contexts, we buffer all incoming data messages and then process them
  // all at once in a single update:
  //   - During reconnect, we buffer all data messages until all subs that had
  //     been ready before reconnect are ready again, and all methods that are
  //     active have returned their "data done message"; then
  //   - During the execution of a "wait" method, we buffer all data messages
  //     until the wait method gets its "data done" message. (If the wait method
  //     occurs during reconnect, it doesn't get any special handling.)
  // all data messages are processed in one update.
  //
  // The following fields are used for this "quiescence" process.
  // This buffers the messages that aren't being processed yet.

  self._messagesBufferedUntilQuiescence = []; // Map from method ID -> true. Methods are removed from this when their
  // "data done" message is received, and we will not quiesce until it is
  // empty.

  self._methodsBlockingQuiescence = {}; // map from sub ID -> true for subs that were ready (ie, called the sub
  // ready callback) before reconnect but haven't become ready again yet

  self._subsBeingRevived = {}; // map from sub._id -> true
  // if true, the next data update should reset all stores. (set during
  // reconnect.)

  self._resetStores = false; // name -> array of updates for (yet to be created) collections

  self._updatesForUnknownStores = {}; // if we're blocking a migration, the retry func

  self._retryMigrate = null;
  self.__flushBufferedWrites = Meteor.bindEnvironment(self._flushBufferedWrites, "flushing DDP buffered writes", self); // Collection name -> array of messages.

  self._bufferedWrites = {}; // When current buffer of updates must be flushed at, in ms timestamp.

  self._bufferedWritesFlushAt = null; // Timeout handle for the next processing of all pending writes

  self._bufferedWritesFlushHandle = null;
  self._bufferedWritesInterval = options.bufferedWritesInterval;
  self._bufferedWritesMaxAge = options.bufferedWritesMaxAge; // metadata for subscriptions.  Map from sub ID to object with keys:
  //   - id
  //   - name
  //   - params
  //   - inactive (if true, will be cleaned up if not reused in re-run)
  //   - ready (has the 'ready' message been received?)
  //   - readyCallback (an optional callback to call when ready)
  //   - errorCallback (an optional callback to call if the sub terminates with
  //                    an error, XXX COMPAT WITH 1.0.3.1)
  //   - stopCallback (an optional callback to call when the sub terminates
  //     for any reason, with an error argument if an error triggered the stop)

  self._subscriptions = {}; // Reactive userId.

  self._userId = null;
  self._userIdDeps = new Tracker.Dependency(); // Block auto-reload while we're waiting for method responses.

  if (Meteor.isClient && Package.reload && !options.reloadWithOutstanding) {
    Package.reload.Reload._onMigrate(function (retry) {
      if (!self._readyToMigrate()) {
        if (self._retryMigrate) throw new Error("Two migrations in progress?");
        self._retryMigrate = retry;
        return false;
      } else {
        return [true];
      }
    });
  }

  var onMessage = function (raw_msg) {
    try {
      var msg = DDPCommon.parseDDP(raw_msg);
    } catch (e) {
      Meteor._debug("Exception while parsing DDP", e);

      return;
    } // Any message counts as receiving a pong, as it demonstrates that
    // the server is still alive.


    if (self._heartbeat) {
      self._heartbeat.messageReceived();
    }

    if (msg === null || !msg.msg) {
      // XXX COMPAT WITH 0.6.6. ignore the old welcome message for back
      // compat.  Remove this 'if' once the server stops sending welcome
      // messages (stream_server.js).
      if (!(msg && msg.server_id)) Meteor._debug("discarding invalid livedata message", msg);
      return;
    }

    if (msg.msg === 'connected') {
      self._version = self._versionSuggestion;

      self._livedata_connected(msg);

      options.onConnected();
    } else if (msg.msg === 'failed') {
      if (_.contains(self._supportedDDPVersions, msg.version)) {
        self._versionSuggestion = msg.version;

        self._stream.reconnect({
          _force: true
        });
      } else {
        var description = "DDP version negotiation failed; server requested version " + msg.version;

        self._stream.disconnect({
          _permanent: true,
          _error: description
        });

        options.onDDPVersionNegotiationFailure(description);
      }
    } else if (msg.msg === 'ping' && options.respondToPings) {
      self._send({
        msg: "pong",
        id: msg.id
      });
    } else if (msg.msg === 'pong') {// noop, as we assume everything's a pong
    } else if (_.include(['added', 'changed', 'removed', 'ready', 'updated'], msg.msg)) self._livedata_data(msg);else if (msg.msg === 'nosub') self._livedata_nosub(msg);else if (msg.msg === 'result') self._livedata_result(msg);else if (msg.msg === 'error') self._livedata_error(msg);else Meteor._debug("discarding unknown livedata message type", msg);
  };

  var onReset = function () {
    // Send a connect message at the beginning of the stream.
    // NOTE: reset is called even on the first connection, so this is
    // the only place we send this message.
    var msg = {
      msg: 'connect'
    };
    if (self._lastSessionId) msg.session = self._lastSessionId;
    msg.version = self._versionSuggestion || self._supportedDDPVersions[0];
    self._versionSuggestion = msg.version;
    msg.support = self._supportedDDPVersions;

    self._send(msg); // Mark non-retry calls as failed. This has to be done early as getting these methods out of the
    // current block is pretty important to making sure that quiescence is properly calculated, as
    // well as possibly moving on to another useful block.
    // Only bother testing if there is an outstandingMethodBlock (there might not be, especially if
    // we are connecting for the first time.


    if (self._outstandingMethodBlocks.length > 0) {
      // If there is an outstanding method block, we only care about the first one as that is the
      // one that could have already sent messages with no response, that are not allowed to retry.
      const currentMethodBlock = self._outstandingMethodBlocks[0].methods;
      self._outstandingMethodBlocks[0].methods = currentMethodBlock.filter(methodInvoker => {
        // Methods with 'noRetry' option set are not allowed to re-send after
        // recovering dropped connection.
        if (methodInvoker.sentMessage && methodInvoker.noRetry) {
          // Make sure that the method is told that it failed.
          methodInvoker.receiveResult(new Meteor.Error('invocation-failed', 'Method invocation might have failed due to dropped connection. ' + 'Failing because `noRetry` option was passed to Meteor.apply.'));
        } // Only keep a method if it wasn't sent or it's allowed to retry.
        // This may leave the block empty, but we don't move on to the next
        // block until the callback has been delivered, in _outstandingMethodFinished.


        return !(methodInvoker.sentMessage && methodInvoker.noRetry);
      });
    } // Now, to minimize setup latency, go ahead and blast out all of
    // our pending methods ands subscriptions before we've even taken
    // the necessary RTT to know if we successfully reconnected. (1)
    // They're supposed to be idempotent, and where they are not,
    // they can block retry in apply; (2) even if we did reconnect,
    // we're not sure what messages might have gotten lost
    // (in either direction) since we were disconnected (TCP being
    // sloppy about that.)
    // If the current block of methods all got their results (but didn't all get
    // their data visible), discard the empty block now.


    if (!_.isEmpty(self._outstandingMethodBlocks) && _.isEmpty(self._outstandingMethodBlocks[0].methods)) {
      self._outstandingMethodBlocks.shift();
    } // Mark all messages as unsent, they have not yet been sent on this
    // connection.


    _.each(self._methodInvokers, function (m) {
      m.sentMessage = false;
    }); // If an `onReconnect` handler is set, call it first. Go through
    // some hoops to ensure that methods that are called from within
    // `onReconnect` get executed _before_ ones that were originally
    // outstanding (since `onReconnect` is used to re-establish auth
    // certificates)


    self._callOnReconnectAndSendAppropriateOutstandingMethods(); // add new subscriptions at the end. this way they take effect after
    // the handlers and we don't see flicker.


    _.each(self._subscriptions, function (sub, id) {
      self._send({
        msg: 'sub',
        id: id,
        name: sub.name,
        params: sub.params
      });
    });
  };

  var onDisconnect = function () {
    if (self._heartbeat) {
      self._heartbeat.stop();

      self._heartbeat = null;
    }
  };

  if (Meteor.isServer) {
    self._stream.on('message', Meteor.bindEnvironment(onMessage, "handling DDP message"));

    self._stream.on('reset', Meteor.bindEnvironment(onReset, "handling DDP reset"));

    self._stream.on('disconnect', Meteor.bindEnvironment(onDisconnect, "handling DDP disconnect"));
  } else {
    self._stream.on('message', onMessage);

    self._stream.on('reset', onReset);

    self._stream.on('disconnect', onDisconnect);
  }
}; // A MethodInvoker manages sending a method to the server and calling the user's
// callbacks. On construction, it registers itself in the connection's
// _methodInvokers map; it removes itself once the method is fully finished and
// the callback is invoked. This occurs when it has both received a result,
// and the data written by it is fully visible.


var MethodInvoker = function (options) {
  var self = this; // Public (within this file) fields.

  self.methodId = options.methodId;
  self.sentMessage = false;
  self._callback = options.callback;
  self._connection = options.connection;
  self._message = options.message;

  self._onResultReceived = options.onResultReceived || function () {};

  self._wait = options.wait;
  self.noRetry = options.noRetry;
  self._methodResult = null;
  self._dataVisible = false; // Register with the connection.

  self._connection._methodInvokers[self.methodId] = self;
};

_.extend(MethodInvoker.prototype, {
  // Sends the method message to the server. May be called additional times if
  // we lose the connection and reconnect before receiving a result.
  sendMessage: function () {
    var self = this; // This function is called before sending a method (including resending on
    // reconnect). We should only (re)send methods where we don't already have a
    // result!

    if (self.gotResult()) throw new Error("sendingMethod is called on method with result"); // If we're re-sending it, it doesn't matter if data was written the first
    // time.

    self._dataVisible = false;
    self.sentMessage = true; // If this is a wait method, make all data messages be buffered until it is
    // done.

    if (self._wait) self._connection._methodsBlockingQuiescence[self.methodId] = true; // Actually send the message.

    self._connection._send(self._message);
  },
  // Invoke the callback, if we have both a result and know that all data has
  // been written to the local cache.
  _maybeInvokeCallback: function () {
    var self = this;

    if (self._methodResult && self._dataVisible) {
      // Call the callback. (This won't throw: the callback was wrapped with
      // bindEnvironment.)
      self._callback(self._methodResult[0], self._methodResult[1]); // Forget about this method.


      delete self._connection._methodInvokers[self.methodId]; // Let the connection know that this method is finished, so it can try to
      // move on to the next block of methods.

      self._connection._outstandingMethodFinished();
    }
  },
  // Call with the result of the method from the server. Only may be called
  // once; once it is called, you should not call sendMessage again.
  // If the user provided an onResultReceived callback, call it immediately.
  // Then invoke the main callback if data is also visible.
  receiveResult: function (err, result) {
    var self = this;
    if (self.gotResult()) throw new Error("Methods should only receive results once");
    self._methodResult = [err, result];

    self._onResultReceived(err, result);

    self._maybeInvokeCallback();
  },
  // Call this when all data written by the method is visible. This means that
  // the method has returns its "data is done" message *AND* all server
  // documents that are buffered at that time have been written to the local
  // cache. Invokes the main callback if the result has been received.
  dataVisible: function () {
    var self = this;
    self._dataVisible = true;

    self._maybeInvokeCallback();
  },
  // True if receiveResult has been called.
  gotResult: function () {
    var self = this;
    return !!self._methodResult;
  }
});

_.extend(Connection.prototype, {
  // 'name' is the name of the data on the wire that should go in the
  // store. 'wrappedStore' should be an object with methods beginUpdate, update,
  // endUpdate, saveOriginals, retrieveOriginals. see Collection for an example.
  registerStore: function (name, wrappedStore) {
    var self = this;
    if (name in self._stores) return false; // Wrap the input object in an object which makes any store method not
    // implemented by 'store' into a no-op.

    var store = {};

    _.each(['update', 'beginUpdate', 'endUpdate', 'saveOriginals', 'retrieveOriginals', 'getDoc', '_getCollection'], function (method) {
      store[method] = function () {
        return wrappedStore[method] ? wrappedStore[method].apply(wrappedStore, arguments) : undefined;
      };
    });

    self._stores[name] = store;
    var queued = self._updatesForUnknownStores[name];

    if (queued) {
      store.beginUpdate(queued.length, false);

      _.each(queued, function (msg) {
        store.update(msg);
      });

      store.endUpdate();
      delete self._updatesForUnknownStores[name];
    }

    return true;
  },
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @summary Subscribe to a record set.  Returns a handle that provides
   * `stop()` and `ready()` methods.
   * @locus Client
   * @param {String} name Name of the subscription.  Matches the name of the
   * server's `publish()` call.
   * @param {EJSONable} [arg1,arg2...] Optional arguments passed to publisher
   * function on server.
   * @param {Function|Object} [callbacks] Optional. May include `onStop`
   * and `onReady` callbacks. If there is an error, it is passed as an
   * argument to `onStop`. If a function is passed instead of an object, it
   * is interpreted as an `onReady` callback.
   */subscribe: function (name /* .. [arguments] .. (callback|callbacks) */) {
    var self = this;
    var params = Array.prototype.slice.call(arguments, 1);
    var callbacks = {};

    if (params.length) {
      var lastParam = params[params.length - 1];

      if (_.isFunction(lastParam)) {
        callbacks.onReady = params.pop();
      } else if (lastParam && // XXX COMPAT WITH 1.0.3.1 onError used to exist, but now we use
      // onStop with an error callback instead.
      _.any([lastParam.onReady, lastParam.onError, lastParam.onStop], _.isFunction)) {
        callbacks = params.pop();
      }
    } // Is there an existing sub with the same name and param, run in an
    // invalidated Computation? This will happen if we are rerunning an
    // existing computation.
    //
    // For example, consider a rerun of:
    //
    //     Tracker.autorun(function () {
    //       Meteor.subscribe("foo", Session.get("foo"));
    //       Meteor.subscribe("bar", Session.get("bar"));
    //     });
    //
    // If "foo" has changed but "bar" has not, we will match the "bar"
    // subcribe to an existing inactive subscription in order to not
    // unsub and resub the subscription unnecessarily.
    //
    // We only look for one such sub; if there are N apparently-identical subs
    // being invalidated, we will require N matching subscribe calls to keep
    // them all active.


    var existing = _.find(self._subscriptions, function (sub) {
      return sub.inactive && sub.name === name && EJSON.equals(sub.params, params);
    });

    var id;

    if (existing) {
      id = existing.id;
      existing.inactive = false; // reactivate

      if (callbacks.onReady) {
        // If the sub is not already ready, replace any ready callback with the
        // one provided now. (It's not really clear what users would expect for
        // an onReady callback inside an autorun; the semantics we provide is
        // that at the time the sub first becomes ready, we call the last
        // onReady callback provided, if any.)
        // If the sub is already ready, run the ready callback right away.
        // It seems that users would expect an onReady callback inside an
        // autorun to trigger once the the sub first becomes ready and also
        // when re-subs happens.
        if (existing.ready) {
          callbacks.onReady();
        } else {
          existing.readyCallback = callbacks.onReady;
        }
      } // XXX COMPAT WITH 1.0.3.1 we used to have onError but now we call
      // onStop with an optional error argument


      if (callbacks.onError) {
        // Replace existing callback if any, so that errors aren't
        // double-reported.
        existing.errorCallback = callbacks.onError;
      }

      if (callbacks.onStop) {
        existing.stopCallback = callbacks.onStop;
      }
    } else {
      // New sub! Generate an id, save it locally, and send message.
      id = Random.id();
      self._subscriptions[id] = {
        id: id,
        name: name,
        params: EJSON.clone(params),
        inactive: false,
        ready: false,
        readyDeps: new Tracker.Dependency(),
        readyCallback: callbacks.onReady,
        // XXX COMPAT WITH 1.0.3.1 #errorCallback
        errorCallback: callbacks.onError,
        stopCallback: callbacks.onStop,
        connection: self,
        remove: function () {
          delete this.connection._subscriptions[this.id];
          this.ready && this.readyDeps.changed();
        },
        stop: function () {
          this.connection._send({
            msg: 'unsub',
            id: id
          });

          this.remove();

          if (callbacks.onStop) {
            callbacks.onStop();
          }
        }
      };

      self._send({
        msg: 'sub',
        id: id,
        name: name,
        params: params
      });
    } // return a handle to the application.


    var handle = {
      stop: function () {
        if (!_.has(self._subscriptions, id)) return;

        self._subscriptions[id].stop();
      },
      ready: function () {
        // return false if we've unsubscribed.
        if (!_.has(self._subscriptions, id)) return false;
        var record = self._subscriptions[id];
        record.readyDeps.depend();
        return record.ready;
      },
      subscriptionId: id
    };

    if (Tracker.active) {
      // We're in a reactive computation, so we'd like to unsubscribe when the
      // computation is invalidated... but not if the rerun just re-subscribes
      // to the same subscription!  When a rerun happens, we use onInvalidate
      // as a change to mark the subscription "inactive" so that it can
      // be reused from the rerun.  If it isn't reused, it's killed from
      // an afterFlush.
      Tracker.onInvalidate(function (c) {
        if (_.has(self._subscriptions, id)) self._subscriptions[id].inactive = true;
        Tracker.afterFlush(function () {
          if (_.has(self._subscriptions, id) && self._subscriptions[id].inactive) handle.stop();
        });
      });
    }

    return handle;
  },
  // options:
  // - onLateError {Function(error)} called if an error was received after the ready event.
  //     (errors received before ready cause an error to be thrown)
  _subscribeAndWait: function (name, args, options) {
    var self = this;
    var f = new Future();
    var ready = false;
    var handle;
    args = args || [];
    args.push({
      onReady: function () {
        ready = true;
        f['return']();
      },
      onError: function (e) {
        if (!ready) f['throw'](e);else options && options.onLateError && options.onLateError(e);
      }
    });
    handle = self.subscribe.apply(self, [name].concat(args));
    f.wait();
    return handle;
  },
  methods: function (methods) {
    var self = this;

    _.each(methods, function (func, name) {
      if (typeof func !== 'function') throw new Error("Method '" + name + "' must be a function");
      if (self._methodHandlers[name]) throw new Error("A method named '" + name + "' is already defined");
      self._methodHandlers[name] = func;
    });
  },
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @summary Invokes a method passing any number of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable} [arg1,arg2...] Optional method arguments
   * @param {Function} [asyncCallback] Optional callback, which is called asynchronously with the error or result after the method is complete. If not provided, the method runs synchronously if possible (see below).
   */call: function (name /* .. [arguments] .. callback */) {
    // if it's a function, the last argument is the result callback,
    // not a parameter to the remote method.
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length && typeof args[args.length - 1] === "function") var callback = args.pop();
    return this.apply(name, args, callback);
  },
  // @param options {Optional Object}
  //   wait: Boolean - Should we wait to call this until all current methods
  //                   are fully finished, and block subsequent method calls
  //                   until this method is fully finished?
  //                   (does not affect methods called from within this method)
  //   onResultReceived: Function - a callback to call as soon as the method
  //                                result is received. the data written by
  //                                the method may not yet be in the cache!
  //   returnStubValue: Boolean - If true then in cases where we would have
  //                              otherwise discarded the stub's return value
  //                              and returned undefined, instead we go ahead
  //                              and return it.  Specifically, this is any
  //                              time other than when (a) we are already
  //                              inside a stub or (b) we are in Node and no
  //                              callback was provided.  Currently we require
  //                              this flag to be explicitly passed to reduce
  //                              the likelihood that stub return values will
  //                              be confused with server return values; we
  //                              may improve this in future.
  // @param callback {Optional Function}
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @summary Invoke a method passing an array of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable[]} args Method arguments
   * @param {Object} [options]
   * @param {Boolean} options.wait (Client only) If true, don't send this method until all previous method calls have completed, and don't send any subsequent method calls until this one is completed.
   * @param {Function} options.onResultReceived (Client only) This callback is invoked with the error or result of the method (just like `asyncCallback`) as soon as the error or result is available. The local cache may not yet reflect the writes performed by the method.
   * @param {Boolean} options.noRetry (Client only) if true, don't send this method again on reload, simply call the callback an error with the error code 'invocation-failed'.
   * @param {Boolean} options.throwStubExceptions (Client only) If true, exceptions thrown by method stubs will be thrown instead of logged, and the method will not be invoked on the server.
   * @param {Function} [asyncCallback] Optional callback; same semantics as in [`Meteor.call`](#meteor_call).
   */apply: function (name, args, options, callback) {
    var self = this; // We were passed 3 arguments. They may be either (name, args, options)
    // or (name, args, callback)

    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }

    options = options || {};

    if (callback) {
      // XXX would it be better form to do the binding in stream.on,
      // or caller, instead of here?
      // XXX improve error message (and how we report it)
      callback = Meteor.bindEnvironment(callback, "delivering result of invoking '" + name + "'");
    } // Keep our args safe from mutation (eg if we don't send the message for a
    // while because of a wait method).


    args = EJSON.clone(args); // Lazily allocate method ID once we know that it'll be needed.

    var methodId = function () {
      var id;
      return function () {
        if (id === undefined) id = '' + self._nextMethodId++;
        return id;
      };
    }();

    var enclosing = DDP._CurrentMethodInvocation.get();

    var alreadyInSimulation = enclosing && enclosing.isSimulation; // Lazily generate a randomSeed, only if it is requested by the stub.
    // The random streams only have utility if they're used on both the client
    // and the server; if the client doesn't generate any 'random' values
    // then we don't expect the server to generate any either.
    // Less commonly, the server may perform different actions from the client,
    // and may in fact generate values where the client did not, but we don't
    // have any client-side values to match, so even here we may as well just
    // use a random seed on the server.  In that case, we don't pass the
    // randomSeed to save bandwidth, and we don't even generate it to save a
    // bit of CPU and to avoid consuming entropy.

    var randomSeed = null;

    var randomSeedGenerator = function () {
      if (randomSeed === null) {
        randomSeed = DDPCommon.makeRpcSeed(enclosing, name);
      }

      return randomSeed;
    }; // Run the stub, if we have one. The stub is supposed to make some
    // temporary writes to the database to give the user a smooth experience
    // until the actual result of executing the method comes back from the
    // server (whereupon the temporary writes to the database will be reversed
    // during the beginUpdate/endUpdate process.)
    //
    // Normally, we ignore the return value of the stub (even if it is an
    // exception), in favor of the real return value from the server. The
    // exception is if the *caller* is a stub. In that case, we're not going
    // to do a RPC, so we use the return value of the stub as our return
    // value.


    var stub = self._methodHandlers[name];

    if (stub) {
      var setUserId = function (userId) {
        self.setUserId(userId);
      };

      var invocation = new DDPCommon.MethodInvocation({
        isSimulation: true,
        userId: self.userId(),
        setUserId: setUserId,
        randomSeed: function () {
          return randomSeedGenerator();
        }
      });
      if (!alreadyInSimulation) self._saveOriginals();

      try {
        // Note that unlike in the corresponding server code, we never audit
        // that stubs check() their arguments.
        var stubReturnValue = DDP._CurrentMethodInvocation.withValue(invocation, function () {
          if (Meteor.isServer) {
            // Because saveOriginals and retrieveOriginals aren't reentrant,
            // don't allow stubs to yield.
            return Meteor._noYieldsAllowed(function () {
              // re-clone, so that the stub can't affect our caller's values
              return stub.apply(invocation, EJSON.clone(args));
            });
          } else {
            return stub.apply(invocation, EJSON.clone(args));
          }
        });
      } catch (e) {
        var exception = e;
      }

      if (!alreadyInSimulation) self._retrieveAndStoreOriginals(methodId());
    } // If we're in a simulation, stop and return the result we have,
    // rather than going on to do an RPC. If there was no stub,
    // we'll end up returning undefined.


    if (alreadyInSimulation) {
      if (callback) {
        callback(exception, stubReturnValue);
        return undefined;
      }

      if (exception) throw exception;
      return stubReturnValue;
    } // If an exception occurred in a stub, and we're ignoring it
    // because we're doing an RPC and want to use what the server
    // returns instead, log it so the developer knows
    // (unless they explicitly ask to see the error).
    //
    // Tests can set the 'expected' flag on an exception so it won't
    // go to log.


    if (exception) {
      if (options.throwStubExceptions) {
        throw exception;
      } else if (!exception.expected) {
        Meteor._debug("Exception while simulating the effect of invoking '" + name + "'", exception, exception.stack);
      }
    } // At this point we're definitely doing an RPC, and we're going to
    // return the value of the RPC to the caller.
    // If the caller didn't give a callback, decide what to do.


    if (!callback) {
      if (Meteor.isClient) {
        // On the client, we don't have fibers, so we can't block. The
        // only thing we can do is to return undefined and discard the
        // result of the RPC. If an error occurred then print the error
        // to the console.
        callback = function (err) {
          err && Meteor._debug("Error invoking Method '" + name + "':", err.message);
        };
      } else {
        // On the server, make the function synchronous. Throw on
        // errors, return on success.
        var future = new Future();
        callback = future.resolver();
      }
    } // Send the RPC. Note that on the client, it is important that the
    // stub have finished before we send the RPC, so that we know we have
    // a complete list of which local documents the stub wrote.


    var message = {
      msg: 'method',
      method: name,
      params: args,
      id: methodId()
    }; // Send the randomSeed only if we used it

    if (randomSeed !== null) {
      message.randomSeed = randomSeed;
    }

    var methodInvoker = new MethodInvoker({
      methodId: methodId(),
      callback: callback,
      connection: self,
      onResultReceived: options.onResultReceived,
      wait: !!options.wait,
      message: message,
      noRetry: !!options.noRetry
    });

    if (options.wait) {
      // It's a wait method! Wait methods go in their own block.
      self._outstandingMethodBlocks.push({
        wait: true,
        methods: [methodInvoker]
      });
    } else {
      // Not a wait method. Start a new block if the previous block was a wait
      // block, and add it to the last block of methods.
      if (_.isEmpty(self._outstandingMethodBlocks) || _.last(self._outstandingMethodBlocks).wait) self._outstandingMethodBlocks.push({
        wait: false,
        methods: []
      });

      _.last(self._outstandingMethodBlocks).methods.push(methodInvoker);
    } // If we added it to the first block, send it out now.


    if (self._outstandingMethodBlocks.length === 1) methodInvoker.sendMessage(); // If we're using the default callback on the server,
    // block waiting for the result.

    if (future) {
      return future.wait();
    }

    return options.returnStubValue ? stubReturnValue : undefined;
  },
  // Before calling a method stub, prepare all stores to track changes and allow
  // _retrieveAndStoreOriginals to get the original versions of changed
  // documents.
  _saveOriginals: function () {
    var self = this;
    if (!self._waitingForQuiescence()) self._flushBufferedWrites();

    _.each(self._stores, function (s) {
      s.saveOriginals();
    });
  },
  // Retrieves the original versions of all documents modified by the stub for
  // method 'methodId' from all stores and saves them to _serverDocuments (keyed
  // by document) and _documentsWrittenByStub (keyed by method ID).
  _retrieveAndStoreOriginals: function (methodId) {
    var self = this;
    if (self._documentsWrittenByStub[methodId]) throw new Error("Duplicate methodId in _retrieveAndStoreOriginals");
    var docsWritten = [];

    _.each(self._stores, function (s, collection) {
      var originals = s.retrieveOriginals(); // not all stores define retrieveOriginals

      if (!originals) return;
      originals.forEach(function (doc, id) {
        docsWritten.push({
          collection: collection,
          id: id
        });
        if (!_.has(self._serverDocuments, collection)) self._serverDocuments[collection] = new MongoIDMap();

        var serverDoc = self._serverDocuments[collection].setDefault(id, {});

        if (serverDoc.writtenByStubs) {
          // We're not the first stub to write this doc. Just add our method ID
          // to the record.
          serverDoc.writtenByStubs[methodId] = true;
        } else {
          // First stub! Save the original value and our method ID.
          serverDoc.document = doc;
          serverDoc.flushCallbacks = [];
          serverDoc.writtenByStubs = {};
          serverDoc.writtenByStubs[methodId] = true;
        }
      });
    });

    if (!_.isEmpty(docsWritten)) {
      self._documentsWrittenByStub[methodId] = docsWritten;
    }
  },
  // This is very much a private function we use to make the tests
  // take up fewer server resources after they complete.
  _unsubscribeAll: function () {
    var self = this;

    _.each(_.clone(self._subscriptions), function (sub, id) {
      // Avoid killing the autoupdate subscription so that developers
      // still get hot code pushes when writing tests.
      //
      // XXX it's a hack to encode knowledge about autoupdate here,
      // but it doesn't seem worth it yet to have a special API for
      // subscriptions to preserve after unit tests.
      if (sub.name !== 'meteor_autoupdate_clientVersions') {
        self._subscriptions[id].stop();
      }
    });
  },
  // Sends the DDP stringification of the given message object
  _send: function (obj) {
    var self = this;

    self._stream.send(DDPCommon.stringifyDDP(obj));
  },
  // We detected via DDP-level heartbeats that we've lost the
  // connection.  Unlike `disconnect` or `close`, a lost connection
  // will be automatically retried.
  _lostConnection: function (error) {
    var self = this;

    self._stream._lostConnection(error);
  },
  /**
   * @summary Get the current connection status. A reactive data source.
   * @locus Client
   * @memberOf Meteor
   * @importFromPackage meteor
   */status: function () /*passthrough args*/{
    var self = this;
    return self._stream.status.apply(self._stream, arguments);
  },
  /**
   * @summary Force an immediate reconnection attempt if the client is not connected to the server.
   This method does nothing if the client is already connected.
   * @locus Client
   * @memberOf Meteor
   * @importFromPackage meteor
   */reconnect: function () /*passthrough args*/{
    var self = this;
    return self._stream.reconnect.apply(self._stream, arguments);
  },
  /**
   * @summary Disconnect the client from the server.
   * @locus Client
   * @memberOf Meteor
   * @importFromPackage meteor
   */disconnect: function () /*passthrough args*/{
    var self = this;
    return self._stream.disconnect.apply(self._stream, arguments);
  },
  close: function () {
    var self = this;
    return self._stream.disconnect({
      _permanent: true
    });
  },
  ///
  /// Reactive user system
  ///
  userId: function () {
    var self = this;
    if (self._userIdDeps) self._userIdDeps.depend();
    return self._userId;
  },
  setUserId: function (userId) {
    var self = this; // Avoid invalidating dependents if setUserId is called with current value.

    if (self._userId === userId) return;
    self._userId = userId;
    if (self._userIdDeps) self._userIdDeps.changed();
  },
  // Returns true if we are in a state after reconnect of waiting for subs to be
  // revived or early methods to finish their data, or we are waiting for a
  // "wait" method to finish.
  _waitingForQuiescence: function () {
    var self = this;
    return !_.isEmpty(self._subsBeingRevived) || !_.isEmpty(self._methodsBlockingQuiescence);
  },
  // Returns true if any method whose message has been sent to the server has
  // not yet invoked its user callback.
  _anyMethodsAreOutstanding: function () {
    var self = this;
    return _.any(_.pluck(self._methodInvokers, 'sentMessage'));
  },
  _livedata_connected: function (msg) {
    var self = this;

    if (self._version !== 'pre1' && self._heartbeatInterval !== 0) {
      self._heartbeat = new DDPCommon.Heartbeat({
        heartbeatInterval: self._heartbeatInterval,
        heartbeatTimeout: self._heartbeatTimeout,
        onTimeout: function () {
          self._lostConnection(new DDP.ConnectionError("DDP heartbeat timed out"));
        },
        sendPing: function () {
          self._send({
            msg: 'ping'
          });
        }
      });

      self._heartbeat.start();
    } // If this is a reconnect, we'll have to reset all stores.


    if (self._lastSessionId) self._resetStores = true;

    if (typeof msg.session === "string") {
      var reconnectedToPreviousSession = self._lastSessionId === msg.session;
      self._lastSessionId = msg.session;
    }

    if (reconnectedToPreviousSession) {
      // Successful reconnection -- pick up where we left off.  Note that right
      // now, this never happens: the server never connects us to a previous
      // session, because DDP doesn't provide enough data for the server to know
      // what messages the client has processed. We need to improve DDP to make
      // this possible, at which point we'll probably need more code here.
      return;
    } // Server doesn't have our data any more. Re-sync a new session.
    // Forget about messages we were buffering for unknown collections. They'll
    // be resent if still relevant.


    self._updatesForUnknownStores = {};

    if (self._resetStores) {
      // Forget about the effects of stubs. We'll be resetting all collections
      // anyway.
      self._documentsWrittenByStub = {};
      self._serverDocuments = {};
    } // Clear _afterUpdateCallbacks.


    self._afterUpdateCallbacks = []; // Mark all named subscriptions which are ready (ie, we already called the
    // ready callback) as needing to be revived.
    // XXX We should also block reconnect quiescence until unnamed subscriptions
    //     (eg, autopublish) are done re-publishing to avoid flicker!

    self._subsBeingRevived = {};

    _.each(self._subscriptions, function (sub, id) {
      if (sub.ready) self._subsBeingRevived[id] = true;
    }); // Arrange for "half-finished" methods to have their callbacks run, and
    // track methods that were sent on this connection so that we don't
    // quiesce until they are all done.
    //
    // Start by clearing _methodsBlockingQuiescence: methods sent before
    // reconnect don't matter, and any "wait" methods sent on the new connection
    // that we drop here will be restored by the loop below.


    self._methodsBlockingQuiescence = {};

    if (self._resetStores) {
      _.each(self._methodInvokers, function (invoker) {
        if (invoker.gotResult()) {
          // This method already got its result, but it didn't call its callback
          // because its data didn't become visible. We did not resend the
          // method RPC. We'll call its callback when we get a full quiesce,
          // since that's as close as we'll get to "data must be visible".
          self._afterUpdateCallbacks.push(_.bind(invoker.dataVisible, invoker));
        } else if (invoker.sentMessage) {
          // This method has been sent on this connection (maybe as a resend
          // from the last connection, maybe from onReconnect, maybe just very
          // quickly before processing the connected message).
          //
          // We don't need to do anything special to ensure its callbacks get
          // called, but we'll count it as a method which is preventing
          // reconnect quiescence. (eg, it might be a login method that was run
          // from onReconnect, and we don't want to see flicker by seeing a
          // logged-out state.)
          self._methodsBlockingQuiescence[invoker.methodId] = true;
        }
      });
    }

    self._messagesBufferedUntilQuiescence = []; // If we're not waiting on any methods or subs, we can reset the stores and
    // call the callbacks immediately.

    if (!self._waitingForQuiescence()) {
      if (self._resetStores) {
        _.each(self._stores, function (s) {
          s.beginUpdate(0, true);
          s.endUpdate();
        });

        self._resetStores = false;
      }

      self._runAfterUpdateCallbacks();
    }
  },
  _processOneDataMessage: function (msg, updates) {
    var self = this; // Using underscore here so as not to need to capitalize.

    self['_process_' + msg.msg](msg, updates);
  },
  _livedata_data: function (msg) {
    var self = this;

    if (self._waitingForQuiescence()) {
      self._messagesBufferedUntilQuiescence.push(msg);

      if (msg.msg === "nosub") delete self._subsBeingRevived[msg.id];

      _.each(msg.subs || [], function (subId) {
        delete self._subsBeingRevived[subId];
      });

      _.each(msg.methods || [], function (methodId) {
        delete self._methodsBlockingQuiescence[methodId];
      });

      if (self._waitingForQuiescence()) return; // No methods or subs are blocking quiescence!
      // We'll now process and all of our buffered messages, reset all stores,
      // and apply them all at once.

      _.each(self._messagesBufferedUntilQuiescence, function (bufferedMsg) {
        self._processOneDataMessage(bufferedMsg, self._bufferedWrites);
      });

      self._messagesBufferedUntilQuiescence = [];
    } else {
      self._processOneDataMessage(msg, self._bufferedWrites);
    } // Immediately flush writes when:
    //  1. Buffering is disabled. Or;
    //  2. any non-(added/changed/removed) message arrives.


    var standardWrite = _.include(['added', 'changed', 'removed'], msg.msg);

    if (self._bufferedWritesInterval === 0 || !standardWrite) {
      self._flushBufferedWrites();

      return;
    }

    if (self._bufferedWritesFlushAt === null) {
      self._bufferedWritesFlushAt = new Date().valueOf() + self._bufferedWritesMaxAge;
    } else if (self._bufferedWritesFlushAt < new Date().valueOf()) {
      self._flushBufferedWrites();

      return;
    }

    if (self._bufferedWritesFlushHandle) {
      clearTimeout(self._bufferedWritesFlushHandle);
    }

    self._bufferedWritesFlushHandle = setTimeout(self.__flushBufferedWrites, self._bufferedWritesInterval);
  },
  _flushBufferedWrites: function () {
    var self = this;

    if (self._bufferedWritesFlushHandle) {
      clearTimeout(self._bufferedWritesFlushHandle);
      self._bufferedWritesFlushHandle = null;
    }

    self._bufferedWritesFlushAt = null; // We need to clear the buffer before passing it to
    //  performWrites. As there's no guarantee that it
    //  will exit cleanly.

    var writes = self._bufferedWrites;
    self._bufferedWrites = {};

    self._performWrites(writes);
  },
  _performWrites: function (updates) {
    var self = this;

    if (self._resetStores || !_.isEmpty(updates)) {
      // Begin a transactional update of each store.
      _.each(self._stores, function (s, storeName) {
        s.beginUpdate(_.has(updates, storeName) ? updates[storeName].length : 0, self._resetStores);
      });

      self._resetStores = false;

      _.each(updates, function (updateMessages, storeName) {
        var store = self._stores[storeName];

        if (store) {
          _.each(updateMessages, function (updateMessage) {
            store.update(updateMessage);
          });
        } else {
          // Nobody's listening for this data. Queue it up until
          // someone wants it.
          // XXX memory use will grow without bound if you forget to
          // create a collection or just don't care about it... going
          // to have to do something about that.
          if (!_.has(self._updatesForUnknownStores, storeName)) self._updatesForUnknownStores[storeName] = [];
          Array.prototype.push.apply(self._updatesForUnknownStores[storeName], updateMessages);
        }
      }); // End update transaction.


      _.each(self._stores, function (s) {
        s.endUpdate();
      });
    }

    self._runAfterUpdateCallbacks();
  },
  // Call any callbacks deferred with _runWhenAllServerDocsAreFlushed whose
  // relevant docs have been flushed, as well as dataVisible callbacks at
  // reconnect-quiescence time.
  _runAfterUpdateCallbacks: function () {
    var self = this;
    var callbacks = self._afterUpdateCallbacks;
    self._afterUpdateCallbacks = [];

    _.each(callbacks, function (c) {
      c();
    });
  },
  _pushUpdate: function (updates, collection, msg) {
    var self = this;

    if (!_.has(updates, collection)) {
      updates[collection] = [];
    }

    updates[collection].push(msg);
  },
  _getServerDoc: function (collection, id) {
    var self = this;
    if (!_.has(self._serverDocuments, collection)) return null;
    var serverDocsForCollection = self._serverDocuments[collection];
    return serverDocsForCollection.get(id) || null;
  },
  _process_added: function (msg, updates) {
    var self = this;
    var id = MongoID.idParse(msg.id);

    var serverDoc = self._getServerDoc(msg.collection, id);

    if (serverDoc) {
      // Some outstanding stub wrote here.
      var isExisting = serverDoc.document !== undefined;
      serverDoc.document = msg.fields || {};
      serverDoc.document._id = id;

      if (self._resetStores) {
        // During reconnect the server is sending adds for existing ids.
        // Always push an update so that document stays in the store after
        // reset. Use current version of the document for this update, so
        // that stub-written values are preserved.
        var currentDoc = self._stores[msg.collection].getDoc(msg.id);

        if (currentDoc !== undefined) msg.fields = currentDoc;

        self._pushUpdate(updates, msg.collection, msg);
      } else if (isExisting) {
        throw new Error("Server sent add for existing id: " + msg.id);
      }
    } else {
      self._pushUpdate(updates, msg.collection, msg);
    }
  },
  _process_changed: function (msg, updates) {
    var self = this;

    var serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));

    if (serverDoc) {
      if (serverDoc.document === undefined) throw new Error("Server sent changed for nonexisting id: " + msg.id);
      DiffSequence.applyChanges(serverDoc.document, msg.fields);
    } else {
      self._pushUpdate(updates, msg.collection, msg);
    }
  },
  _process_removed: function (msg, updates) {
    var self = this;

    var serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));

    if (serverDoc) {
      // Some outstanding stub wrote here.
      if (serverDoc.document === undefined) throw new Error("Server sent removed for nonexisting id:" + msg.id);
      serverDoc.document = undefined;
    } else {
      self._pushUpdate(updates, msg.collection, {
        msg: 'removed',
        collection: msg.collection,
        id: msg.id
      });
    }
  },
  _process_updated: function (msg, updates) {
    var self = this; // Process "method done" messages.

    _.each(msg.methods, function (methodId) {
      _.each(self._documentsWrittenByStub[methodId], function (written) {
        var serverDoc = self._getServerDoc(written.collection, written.id);

        if (!serverDoc) throw new Error("Lost serverDoc for " + JSON.stringify(written));
        if (!serverDoc.writtenByStubs[methodId]) throw new Error("Doc " + JSON.stringify(written) + " not written by  method " + methodId);
        delete serverDoc.writtenByStubs[methodId];

        if (_.isEmpty(serverDoc.writtenByStubs)) {
          // All methods whose stubs wrote this method have completed! We can
          // now copy the saved document to the database (reverting the stub's
          // change if the server did not write to this object, or applying the
          // server's writes if it did).
          // This is a fake ddp 'replace' message.  It's just for talking
          // between livedata connections and minimongo.  (We have to stringify
          // the ID because it's supposed to look like a wire message.)
          self._pushUpdate(updates, written.collection, {
            msg: 'replace',
            id: MongoID.idStringify(written.id),
            replace: serverDoc.document
          }); // Call all flush callbacks.


          _.each(serverDoc.flushCallbacks, function (c) {
            c();
          }); // Delete this completed serverDocument. Don't bother to GC empty
          // IdMaps inside self._serverDocuments, since there probably aren't
          // many collections and they'll be written repeatedly.


          self._serverDocuments[written.collection].remove(written.id);
        }
      });

      delete self._documentsWrittenByStub[methodId]; // We want to call the data-written callback, but we can't do so until all
      // currently buffered messages are flushed.

      var callbackInvoker = self._methodInvokers[methodId];
      if (!callbackInvoker) throw new Error("No callback invoker for method " + methodId);

      self._runWhenAllServerDocsAreFlushed(_.bind(callbackInvoker.dataVisible, callbackInvoker));
    });
  },
  _process_ready: function (msg, updates) {
    var self = this; // Process "sub ready" messages. "sub ready" messages don't take effect
    // until all current server documents have been flushed to the local
    // database. We can use a write fence to implement this.

    _.each(msg.subs, function (subId) {
      self._runWhenAllServerDocsAreFlushed(function () {
        var subRecord = self._subscriptions[subId]; // Did we already unsubscribe?

        if (!subRecord) return; // Did we already receive a ready message? (Oops!)

        if (subRecord.ready) return;
        subRecord.ready = true;
        subRecord.readyCallback && subRecord.readyCallback();
        subRecord.readyDeps.changed();
      });
    });
  },
  // Ensures that "f" will be called after all documents currently in
  // _serverDocuments have been written to the local cache. f will not be called
  // if the connection is lost before then!
  _runWhenAllServerDocsAreFlushed: function (f) {
    var self = this;

    var runFAfterUpdates = function () {
      self._afterUpdateCallbacks.push(f);
    };

    var unflushedServerDocCount = 0;

    var onServerDocFlush = function () {
      --unflushedServerDocCount;

      if (unflushedServerDocCount === 0) {
        // This was the last doc to flush! Arrange to run f after the updates
        // have been applied.
        runFAfterUpdates();
      }
    };

    _.each(self._serverDocuments, function (collectionDocs) {
      collectionDocs.forEach(function (serverDoc) {
        var writtenByStubForAMethodWithSentMessage = _.any(serverDoc.writtenByStubs, function (dummy, methodId) {
          var invoker = self._methodInvokers[methodId];
          return invoker && invoker.sentMessage;
        });

        if (writtenByStubForAMethodWithSentMessage) {
          ++unflushedServerDocCount;
          serverDoc.flushCallbacks.push(onServerDocFlush);
        }
      });
    });

    if (unflushedServerDocCount === 0) {
      // There aren't any buffered docs --- we can call f as soon as the current
      // round of updates is applied!
      runFAfterUpdates();
    }
  },
  _livedata_nosub: function (msg) {
    var self = this; // First pass it through _livedata_data, which only uses it to help get
    // towards quiescence.

    self._livedata_data(msg); // Do the rest of our processing immediately, with no
    // buffering-until-quiescence.
    // we weren't subbed anyway, or we initiated the unsub.


    if (!_.has(self._subscriptions, msg.id)) return; // XXX COMPAT WITH 1.0.3.1 #errorCallback

    var errorCallback = self._subscriptions[msg.id].errorCallback;
    var stopCallback = self._subscriptions[msg.id].stopCallback;

    self._subscriptions[msg.id].remove();

    var meteorErrorFromMsg = function (msgArg) {
      return msgArg && msgArg.error && new Meteor.Error(msgArg.error.error, msgArg.error.reason, msgArg.error.details);
    }; // XXX COMPAT WITH 1.0.3.1 #errorCallback


    if (errorCallback && msg.error) {
      errorCallback(meteorErrorFromMsg(msg));
    }

    if (stopCallback) {
      stopCallback(meteorErrorFromMsg(msg));
    }
  },
  _process_nosub: function () {// This is called as part of the "buffer until quiescence" process, but
    // nosub's effect is always immediate. It only goes in the buffer at all
    // because it's possible for a nosub to be the thing that triggers
    // quiescence, if we were waiting for a sub to be revived and it dies
    // instead.
  },
  _livedata_result: function (msg) {
    // id, result or error. error has error (code), reason, details
    var self = this; // Lets make sure there are no buffered writes before returning result.

    if (!_.isEmpty(self._bufferedWrites)) {
      self._flushBufferedWrites();
    } // find the outstanding request
    // should be O(1) in nearly all realistic use cases


    if (_.isEmpty(self._outstandingMethodBlocks)) {
      Meteor._debug("Received method result but no methods outstanding");

      return;
    }

    var currentMethodBlock = self._outstandingMethodBlocks[0].methods;
    var m;

    for (var i = 0; i < currentMethodBlock.length; i++) {
      m = currentMethodBlock[i];
      if (m.methodId === msg.id) break;
    }

    if (!m) {
      Meteor._debug("Can't match method response to original method call", msg);

      return;
    } // Remove from current method block. This may leave the block empty, but we
    // don't move on to the next block until the callback has been delivered, in
    // _outstandingMethodFinished.


    currentMethodBlock.splice(i, 1);

    if (_.has(msg, 'error')) {
      m.receiveResult(new Meteor.Error(msg.error.error, msg.error.reason, msg.error.details));
    } else {
      // msg.result may be undefined if the method didn't return a
      // value
      m.receiveResult(undefined, msg.result);
    }
  },
  // Called by MethodInvoker after a method's callback is invoked.  If this was
  // the last outstanding method in the current block, runs the next block. If
  // there are no more methods, consider accepting a hot code push.
  _outstandingMethodFinished: function () {
    var self = this;
    if (self._anyMethodsAreOutstanding()) return; // No methods are outstanding. This should mean that the first block of
    // methods is empty. (Or it might not exist, if this was a method that
    // half-finished before disconnect/reconnect.)

    if (!_.isEmpty(self._outstandingMethodBlocks)) {
      var firstBlock = self._outstandingMethodBlocks.shift();

      if (!_.isEmpty(firstBlock.methods)) throw new Error("No methods outstanding but nonempty block: " + JSON.stringify(firstBlock)); // Send the outstanding methods now in the first block.

      if (!_.isEmpty(self._outstandingMethodBlocks)) self._sendOutstandingMethods();
    } // Maybe accept a hot code push.


    self._maybeMigrate();
  },
  // Sends messages for all the methods in the first block in
  // _outstandingMethodBlocks.
  _sendOutstandingMethods: function () {
    var self = this;
    if (_.isEmpty(self._outstandingMethodBlocks)) return;

    _.each(self._outstandingMethodBlocks[0].methods, function (m) {
      m.sendMessage();
    });
  },
  _livedata_error: function (msg) {
    Meteor._debug("Received error from server: ", msg.reason);

    if (msg.offendingMessage) Meteor._debug("For: ", msg.offendingMessage);
  },
  _callOnReconnectAndSendAppropriateOutstandingMethods: function () {
    var self = this;
    var oldOutstandingMethodBlocks = self._outstandingMethodBlocks;
    self._outstandingMethodBlocks = [];
    self.onReconnect && self.onReconnect();

    DDP._reconnectHook.each(function (callback) {
      callback(self);
      return true;
    });

    if (_.isEmpty(oldOutstandingMethodBlocks)) return; // We have at least one block worth of old outstanding methods to try
    // again. First: did onReconnect actually send anything? If not, we just
    // restore all outstanding methods and run the first block.

    if (_.isEmpty(self._outstandingMethodBlocks)) {
      self._outstandingMethodBlocks = oldOutstandingMethodBlocks;

      self._sendOutstandingMethods();

      return;
    } // OK, there are blocks on both sides. Special case: merge the last block of
    // the reconnect methods with the first block of the original methods, if
    // neither of them are "wait" blocks.


    if (!_.last(self._outstandingMethodBlocks).wait && !oldOutstandingMethodBlocks[0].wait) {
      _.each(oldOutstandingMethodBlocks[0].methods, function (m) {
        _.last(self._outstandingMethodBlocks).methods.push(m); // If this "last block" is also the first block, send the message.


        if (self._outstandingMethodBlocks.length === 1) m.sendMessage();
      });

      oldOutstandingMethodBlocks.shift();
    } // Now add the rest of the original blocks on.


    _.each(oldOutstandingMethodBlocks, function (block) {
      self._outstandingMethodBlocks.push(block);
    });
  },
  // We can accept a hot code push if there are no methods in flight.
  _readyToMigrate: function () {
    var self = this;
    return _.isEmpty(self._methodInvokers);
  },
  // If we were blocking a migration, see if it's now possible to continue.
  // Call whenever the set of outstanding/blocked methods shrinks.
  _maybeMigrate: function () {
    var self = this;

    if (self._retryMigrate && self._readyToMigrate()) {
      self._retryMigrate();

      self._retryMigrate = null;
    }
  }
});

LivedataTest.Connection = Connection; // @param url {String} URL to Meteor app,
//     e.g.:
//     "subdomain.meteor.com",
//     "http://subdomain.meteor.com",
//     "/",
//     "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"
/**
 * @summary Connect to the server of a different Meteor application to subscribe to its document sets and invoke its remote methods.
 * @locus Anywhere
 * @param {String} url The URL of another Meteor application.
 */

DDP.connect = function (url, options) {
  var ret = new Connection(url, options);
  allConnections.push(ret); // hack. see below.

  return ret;
};

DDP._reconnectHook = new Hook({
  bindEnvironment: false
}); /**
     * @summary Register a function to call as the first step of
     * reconnecting. This function can call methods which will be executed before
     * any other outstanding methods. For example, this can be used to re-establish
     * the appropriate authentication context on the connection.
     * @locus Anywhere
     * @param {Function} callback The function to call. It will be called with a
     * single argument, the [connection object](#ddp_connect) that is reconnecting.
     */

DDP.onReconnect = function (callback) {
  return DDP._reconnectHook.register(callback);
}; // Hack for `spiderable` package: a way to see if the page is done
// loading all the data it needs.
//


allConnections = [];

DDP._allSubscriptionsReady = function () {
  return _.all(allConnections, function (conn) {
    return _.all(conn._subscriptions, function (sub) {
      return sub.ready;
    });
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"namespace.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/namespace.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DDP: () => DDP,
  LivedataTest: () => LivedataTest
});
const DDP = {};
const LivedataTest = {};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"id_map.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/id_map.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  MongoIDMap: () => MongoIDMap
});

class MongoIDMap extends IdMap {
  constructor() {
    super(MongoID.idStringify, MongoID.idParse);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/ddp-client/stream_client_nodejs.js");
require("./node_modules/meteor/ddp-client/stream_client_common.js");
require("./node_modules/meteor/ddp-client/livedata_common.js");
require("./node_modules/meteor/ddp-client/random_stream.js");
require("./node_modules/meteor/ddp-client/livedata_connection.js");
var exports = require("./node_modules/meteor/ddp-client/namespace.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ddp-client'] = exports, {
  DDP: DDP
});

})();

//# sourceURL=meteor://💻app/packages/ddp-client.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9zdHJlYW1fY2xpZW50X25vZGVqcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9zdHJlYW1fY2xpZW50X2NvbW1vbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9saXZlZGF0YV9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2RkcC1jbGllbnQvcmFuZG9tX3N0cmVhbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9saXZlZGF0YV9jb25uZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY2xpZW50L25hbWVzcGFjZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9pZF9tYXAuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsIkREUCIsIkxpdmVkYXRhVGVzdCIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJDbGllbnRTdHJlYW0iLCJjb25zdHJ1Y3RvciIsImVuZHBvaW50Iiwib3B0aW9ucyIsInNlbGYiLCJPYmplY3QiLCJhc3NpZ24iLCJyZXRyeSIsImNsaWVudCIsImhlYWRlcnMiLCJucG1GYXllT3B0aW9ucyIsIl9pbml0Q29tbW9uIiwiX2xhdW5jaENvbm5lY3Rpb24iLCJzZW5kIiwiZGF0YSIsImN1cnJlbnRTdGF0dXMiLCJjb25uZWN0ZWQiLCJfY2hhbmdlVXJsIiwidXJsIiwiX29uQ29ubmVjdCIsIkVycm9yIiwiX2ZvcmNlZFRvRGlzY29ubmVjdCIsImNsb3NlIiwiX2NsZWFyQ29ubmVjdGlvblRpbWVyIiwic3RhdHVzIiwicmV0cnlDb3VudCIsInN0YXR1c0NoYW5nZWQiLCJfIiwiZWFjaCIsImV2ZW50Q2FsbGJhY2tzIiwicmVzZXQiLCJjYWxsYmFjayIsIl9jbGVhbnVwIiwibWF5YmVFcnJvciIsImRpc2Nvbm5lY3QiLCJjb25uZWN0aW9uVGltZXIiLCJjbGVhclRpbWVvdXQiLCJfZ2V0UHJveHlVcmwiLCJ0YXJnZXRVcmwiLCJwcm94eSIsInByb2Nlc3MiLCJlbnYiLCJIVFRQX1BST1hZIiwiaHR0cF9wcm94eSIsIm1hdGNoIiwiSFRUUFNfUFJPWFkiLCJodHRwc19wcm94eSIsIkZheWVXZWJTb2NrZXQiLCJOcG0iLCJkZWZsYXRlIiwidG9XZWJzb2NrZXRVcmwiLCJmYXllT3B0aW9ucyIsImV4dGVuc2lvbnMiLCJleHRlbmQiLCJwcm94eVVybCIsIm9yaWdpbiIsInN1YnByb3RvY29scyIsIkNsaWVudCIsIk1ldGVvciIsInNldFRpbWVvdXQiLCJfbG9zdENvbm5lY3Rpb24iLCJDb25uZWN0aW9uRXJyb3IiLCJDT05ORUNUX1RJTUVPVVQiLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsImNsaWVudE9uSWZDdXJyZW50IiwiZXZlbnQiLCJkZXNjcmlwdGlvbiIsImYiLCJhcHBseSIsImFyZ3VtZW50cyIsImVycm9yIiwiX2RvbnRQcmludEVycm9ycyIsIl9kZWJ1ZyIsIm1lc3NhZ2UiLCJzdGFydHNXaXRoIiwic3RyIiwic3RhcnRzIiwibGVuZ3RoIiwic3Vic3RyaW5nIiwiZW5kc1dpdGgiLCJlbmRzIiwidHJhbnNsYXRlVXJsIiwibmV3U2NoZW1lQmFzZSIsInN1YlBhdGgiLCJkZHBVcmxNYXRjaCIsImh0dHBVcmxNYXRjaCIsIm5ld1NjaGVtZSIsInVybEFmdGVyRERQIiwic3Vic3RyIiwic2xhc2hQb3MiLCJpbmRleE9mIiwiaG9zdCIsInJlc3QiLCJyZXBsYWNlIiwiTWF0aCIsImZsb29yIiwiUmFuZG9tIiwiZnJhY3Rpb24iLCJ1cmxBZnRlckh0dHAiLCJfcmVsYXRpdmVUb1NpdGVSb290VXJsIiwidG9Tb2NranNVcmwiLCJyZXQiLCJwcm90b3R5cGUiLCJuYW1lIiwicHVzaCIsImNvbm5lY3RUaW1lb3V0TXMiLCJzdGF0dXNMaXN0ZW5lcnMiLCJUcmFja2VyIiwiRGVwZW5kZW5jeSIsImNoYW5nZWQiLCJfcmV0cnkiLCJSZXRyeSIsInJlY29ubmVjdCIsIl9zb2NranNPcHRpb25zIiwiX2ZvcmNlIiwiRm9yY2VkUmVjb25uZWN0RXJyb3IiLCJjbGVhciIsIl9yZXRyeU5vdyIsIl9wZXJtYW5lbnQiLCJfZXJyb3IiLCJyZWFzb24iLCJfcmV0cnlMYXRlciIsIl9vbmxpbmUiLCJ0aW1lb3V0IiwiZXJyb3JUeXBlIiwicmV0cnlMYXRlciIsImJpbmQiLCJyZXRyeVRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsImRlcGVuZCIsIm1ha2VFcnJvclR5cGUiLCJTVVBQT1JURURfRERQX1ZFUlNJT05TIiwiRERQQ29tbW9uIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiRW52aXJvbm1lbnRWYXJpYWJsZSIsIl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uIiwiX0N1cnJlbnRJbnZvY2F0aW9uIiwicmFuZG9tU3RyZWFtIiwic2NvcGUiLCJnZXQiLCJSYW5kb21TdHJlYW0iLCJNb25nb0lETWFwIiwiaXNTZXJ2ZXIiLCJGaWJlciIsIkZ1dHVyZSIsIkNvbm5lY3Rpb24iLCJvbkNvbm5lY3RlZCIsIm9uRERQVmVyc2lvbk5lZ290aWF0aW9uRmFpbHVyZSIsImhlYXJ0YmVhdEludGVydmFsIiwiaGVhcnRiZWF0VGltZW91dCIsInJlbG9hZFdpdGhPdXRzdGFuZGluZyIsInN1cHBvcnRlZEREUFZlcnNpb25zIiwicmVzcG9uZFRvUGluZ3MiLCJidWZmZXJlZFdyaXRlc0ludGVydmFsIiwiYnVmZmVyZWRXcml0ZXNNYXhBZ2UiLCJvblJlY29ubmVjdCIsIl9zdHJlYW0iLCJfbGFzdFNlc3Npb25JZCIsIl92ZXJzaW9uU3VnZ2VzdGlvbiIsIl92ZXJzaW9uIiwiX3N0b3JlcyIsIl9tZXRob2RIYW5kbGVycyIsIl9uZXh0TWV0aG9kSWQiLCJfc3VwcG9ydGVkRERQVmVyc2lvbnMiLCJfaGVhcnRiZWF0SW50ZXJ2YWwiLCJfaGVhcnRiZWF0VGltZW91dCIsIl9tZXRob2RJbnZva2VycyIsIl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyIsIl9kb2N1bWVudHNXcml0dGVuQnlTdHViIiwiX3NlcnZlckRvY3VtZW50cyIsIl9hZnRlclVwZGF0ZUNhbGxiYWNrcyIsIl9tZXNzYWdlc0J1ZmZlcmVkVW50aWxRdWllc2NlbmNlIiwiX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UiLCJfc3Vic0JlaW5nUmV2aXZlZCIsIl9yZXNldFN0b3JlcyIsIl91cGRhdGVzRm9yVW5rbm93blN0b3JlcyIsIl9yZXRyeU1pZ3JhdGUiLCJfX2ZsdXNoQnVmZmVyZWRXcml0ZXMiLCJfZmx1c2hCdWZmZXJlZFdyaXRlcyIsIl9idWZmZXJlZFdyaXRlcyIsIl9idWZmZXJlZFdyaXRlc0ZsdXNoQXQiLCJfYnVmZmVyZWRXcml0ZXNGbHVzaEhhbmRsZSIsIl9idWZmZXJlZFdyaXRlc0ludGVydmFsIiwiX2J1ZmZlcmVkV3JpdGVzTWF4QWdlIiwiX3N1YnNjcmlwdGlvbnMiLCJfdXNlcklkIiwiX3VzZXJJZERlcHMiLCJpc0NsaWVudCIsIlBhY2thZ2UiLCJyZWxvYWQiLCJSZWxvYWQiLCJfb25NaWdyYXRlIiwiX3JlYWR5VG9NaWdyYXRlIiwib25NZXNzYWdlIiwicmF3X21zZyIsIm1zZyIsInBhcnNlRERQIiwiZSIsIl9oZWFydGJlYXQiLCJtZXNzYWdlUmVjZWl2ZWQiLCJzZXJ2ZXJfaWQiLCJfbGl2ZWRhdGFfY29ubmVjdGVkIiwiY29udGFpbnMiLCJ2ZXJzaW9uIiwiX3NlbmQiLCJpZCIsImluY2x1ZGUiLCJfbGl2ZWRhdGFfZGF0YSIsIl9saXZlZGF0YV9ub3N1YiIsIl9saXZlZGF0YV9yZXN1bHQiLCJfbGl2ZWRhdGFfZXJyb3IiLCJvblJlc2V0Iiwic2Vzc2lvbiIsInN1cHBvcnQiLCJjdXJyZW50TWV0aG9kQmxvY2siLCJtZXRob2RzIiwiZmlsdGVyIiwibWV0aG9kSW52b2tlciIsInNlbnRNZXNzYWdlIiwibm9SZXRyeSIsInJlY2VpdmVSZXN1bHQiLCJpc0VtcHR5Iiwic2hpZnQiLCJtIiwiX2NhbGxPblJlY29ubmVjdEFuZFNlbmRBcHByb3ByaWF0ZU91dHN0YW5kaW5nTWV0aG9kcyIsInN1YiIsInBhcmFtcyIsIm9uRGlzY29ubmVjdCIsInN0b3AiLCJNZXRob2RJbnZva2VyIiwibWV0aG9kSWQiLCJfY2FsbGJhY2siLCJfY29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJfbWVzc2FnZSIsIl9vblJlc3VsdFJlY2VpdmVkIiwib25SZXN1bHRSZWNlaXZlZCIsIl93YWl0Iiwid2FpdCIsIl9tZXRob2RSZXN1bHQiLCJfZGF0YVZpc2libGUiLCJzZW5kTWVzc2FnZSIsImdvdFJlc3VsdCIsIl9tYXliZUludm9rZUNhbGxiYWNrIiwiX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQiLCJlcnIiLCJyZXN1bHQiLCJkYXRhVmlzaWJsZSIsInJlZ2lzdGVyU3RvcmUiLCJ3cmFwcGVkU3RvcmUiLCJzdG9yZSIsIm1ldGhvZCIsInVuZGVmaW5lZCIsInF1ZXVlZCIsImJlZ2luVXBkYXRlIiwidXBkYXRlIiwiZW5kVXBkYXRlIiwic3Vic2NyaWJlIiwiQXJyYXkiLCJzbGljZSIsImNhbGwiLCJjYWxsYmFja3MiLCJsYXN0UGFyYW0iLCJpc0Z1bmN0aW9uIiwib25SZWFkeSIsInBvcCIsImFueSIsIm9uRXJyb3IiLCJvblN0b3AiLCJleGlzdGluZyIsImZpbmQiLCJpbmFjdGl2ZSIsIkVKU09OIiwiZXF1YWxzIiwicmVhZHkiLCJyZWFkeUNhbGxiYWNrIiwiZXJyb3JDYWxsYmFjayIsInN0b3BDYWxsYmFjayIsImNsb25lIiwicmVhZHlEZXBzIiwicmVtb3ZlIiwiaGFuZGxlIiwiaGFzIiwicmVjb3JkIiwic3Vic2NyaXB0aW9uSWQiLCJhY3RpdmUiLCJvbkludmFsaWRhdGUiLCJjIiwiYWZ0ZXJGbHVzaCIsIl9zdWJzY3JpYmVBbmRXYWl0IiwiYXJncyIsIm9uTGF0ZUVycm9yIiwiY29uY2F0IiwiZnVuYyIsImVuY2xvc2luZyIsImFscmVhZHlJblNpbXVsYXRpb24iLCJpc1NpbXVsYXRpb24iLCJyYW5kb21TZWVkIiwicmFuZG9tU2VlZEdlbmVyYXRvciIsIm1ha2VScGNTZWVkIiwic3R1YiIsInNldFVzZXJJZCIsInVzZXJJZCIsImludm9jYXRpb24iLCJNZXRob2RJbnZvY2F0aW9uIiwiX3NhdmVPcmlnaW5hbHMiLCJzdHViUmV0dXJuVmFsdWUiLCJ3aXRoVmFsdWUiLCJfbm9ZaWVsZHNBbGxvd2VkIiwiZXhjZXB0aW9uIiwiX3JldHJpZXZlQW5kU3RvcmVPcmlnaW5hbHMiLCJ0aHJvd1N0dWJFeGNlcHRpb25zIiwiZXhwZWN0ZWQiLCJzdGFjayIsImZ1dHVyZSIsInJlc29sdmVyIiwibGFzdCIsInJldHVyblN0dWJWYWx1ZSIsIl93YWl0aW5nRm9yUXVpZXNjZW5jZSIsInMiLCJzYXZlT3JpZ2luYWxzIiwiZG9jc1dyaXR0ZW4iLCJjb2xsZWN0aW9uIiwib3JpZ2luYWxzIiwicmV0cmlldmVPcmlnaW5hbHMiLCJmb3JFYWNoIiwiZG9jIiwic2VydmVyRG9jIiwic2V0RGVmYXVsdCIsIndyaXR0ZW5CeVN0dWJzIiwiZG9jdW1lbnQiLCJmbHVzaENhbGxiYWNrcyIsIl91bnN1YnNjcmliZUFsbCIsIm9iaiIsInN0cmluZ2lmeUREUCIsIl9hbnlNZXRob2RzQXJlT3V0c3RhbmRpbmciLCJwbHVjayIsIkhlYXJ0YmVhdCIsIm9uVGltZW91dCIsInNlbmRQaW5nIiwic3RhcnQiLCJyZWNvbm5lY3RlZFRvUHJldmlvdXNTZXNzaW9uIiwiaW52b2tlciIsIl9ydW5BZnRlclVwZGF0ZUNhbGxiYWNrcyIsIl9wcm9jZXNzT25lRGF0YU1lc3NhZ2UiLCJ1cGRhdGVzIiwic3VicyIsInN1YklkIiwiYnVmZmVyZWRNc2ciLCJzdGFuZGFyZFdyaXRlIiwidmFsdWVPZiIsIndyaXRlcyIsIl9wZXJmb3JtV3JpdGVzIiwic3RvcmVOYW1lIiwidXBkYXRlTWVzc2FnZXMiLCJ1cGRhdGVNZXNzYWdlIiwiX3B1c2hVcGRhdGUiLCJfZ2V0U2VydmVyRG9jIiwic2VydmVyRG9jc0ZvckNvbGxlY3Rpb24iLCJfcHJvY2Vzc19hZGRlZCIsIk1vbmdvSUQiLCJpZFBhcnNlIiwiaXNFeGlzdGluZyIsImZpZWxkcyIsIl9pZCIsImN1cnJlbnREb2MiLCJnZXREb2MiLCJfcHJvY2Vzc19jaGFuZ2VkIiwiRGlmZlNlcXVlbmNlIiwiYXBwbHlDaGFuZ2VzIiwiX3Byb2Nlc3NfcmVtb3ZlZCIsIl9wcm9jZXNzX3VwZGF0ZWQiLCJ3cml0dGVuIiwiSlNPTiIsInN0cmluZ2lmeSIsImlkU3RyaW5naWZ5IiwiY2FsbGJhY2tJbnZva2VyIiwiX3J1bldoZW5BbGxTZXJ2ZXJEb2NzQXJlRmx1c2hlZCIsIl9wcm9jZXNzX3JlYWR5Iiwic3ViUmVjb3JkIiwicnVuRkFmdGVyVXBkYXRlcyIsInVuZmx1c2hlZFNlcnZlckRvY0NvdW50Iiwib25TZXJ2ZXJEb2NGbHVzaCIsImNvbGxlY3Rpb25Eb2NzIiwid3JpdHRlbkJ5U3R1YkZvckFNZXRob2RXaXRoU2VudE1lc3NhZ2UiLCJkdW1teSIsIm1ldGVvckVycm9yRnJvbU1zZyIsIm1zZ0FyZyIsImRldGFpbHMiLCJfcHJvY2Vzc19ub3N1YiIsImkiLCJzcGxpY2UiLCJmaXJzdEJsb2NrIiwiX3NlbmRPdXRzdGFuZGluZ01ldGhvZHMiLCJfbWF5YmVNaWdyYXRlIiwib2ZmZW5kaW5nTWVzc2FnZSIsIm9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzIiwiX3JlY29ubmVjdEhvb2siLCJibG9jayIsImNvbm5lY3QiLCJhbGxDb25uZWN0aW9ucyIsIkhvb2siLCJyZWdpc3RlciIsIl9hbGxTdWJzY3JpcHRpb25zUmVhZHkiLCJhbGwiLCJjb25uIiwiZXhwb3J0IiwiSWRNYXAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsVUFBUUMsTUFBZDtBQUFxQixJQUFJQyxHQUFKLEVBQVFDLFlBQVI7QUFBcUJILFFBQVFJLEtBQVIsQ0FBY0MsUUFBUSxnQkFBUixDQUFkLEVBQXdDO0FBQUNILE1BQUlJLENBQUosRUFBTTtBQUFDSixVQUFJSSxDQUFKO0FBQU0sR0FBZDs7QUFBZUgsZUFBYUcs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RlY7QUFJRDs7QUFObUMsQyIsImZpbGUiOiIvcGFja2FnZXMvZGRwLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEREUCwgTGl2ZWRhdGFUZXN0IH0gZnJvbSBcIi4vbmFtZXNwYWNlLmpzXCI7XG5cbi8vIEBwYXJhbSBlbmRwb2ludCB7U3RyaW5nfSBVUkwgdG8gTWV0ZW9yIGFwcFxuLy8gICBcImh0dHA6Ly9zdWJkb21haW4ubWV0ZW9yLmNvbS9cIiBvciBcIi9cIiBvclxuLy8gICBcImRkcCtzb2NranM6Ly9mb28tKioubWV0ZW9yLmNvbS9zb2NranNcIlxuLy9cbi8vIFdlIGRvIHNvbWUgcmV3cml0aW5nIG9mIHRoZSBVUkwgdG8gZXZlbnR1YWxseSBtYWtlIGl0IFwid3M6Ly9cIiBvciBcIndzczovL1wiLFxuLy8gd2hhdGV2ZXIgd2FzIHBhc3NlZCBpbi4gIEF0IHRoZSB2ZXJ5IGxlYXN0LCB3aGF0IE1ldGVvci5hYnNvbHV0ZVVybCgpIHJldHVybnNcbi8vIHVzIHNob3VsZCB3b3JrLlxuLy9cbi8vIFdlIGRvbid0IGRvIGFueSBoZWFydGJlYXRpbmcuIChUaGUgbG9naWMgdGhhdCBkaWQgdGhpcyBpbiBzb2NranMgd2FzIHJlbW92ZWQsXG4vLyBiZWNhdXNlIGl0IHVzZWQgYSBidWlsdC1pbiBzb2NranMgbWVjaGFuaXNtLiBXZSBjb3VsZCBkbyBpdCB3aXRoIFdlYlNvY2tldFxuLy8gcGluZyBmcmFtZXMgb3Igd2l0aCBERFAtbGV2ZWwgbWVzc2FnZXMuKVxuTGl2ZWRhdGFUZXN0LkNsaWVudFN0cmVhbSA9IGNsYXNzIENsaWVudFN0cmVhbSB7XG4gIGNvbnN0cnVjdG9yKGVuZHBvaW50LCBvcHRpb25zKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBzZWxmLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgIHJldHJ5OiB0cnVlXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICBzZWxmLmNsaWVudCA9IG51bGw7ICAvLyBjcmVhdGVkIGluIF9sYXVuY2hDb25uZWN0aW9uXG4gICAgc2VsZi5lbmRwb2ludCA9IGVuZHBvaW50O1xuXG4gICAgc2VsZi5oZWFkZXJzID0gc2VsZi5vcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgc2VsZi5ucG1GYXllT3B0aW9ucyA9IHNlbGYub3B0aW9ucy5ucG1GYXllT3B0aW9ucyB8fCB7fTtcblxuICAgIHNlbGYuX2luaXRDb21tb24oc2VsZi5vcHRpb25zKTtcblxuICAgIC8vLy8gS2lja29mZiFcbiAgICBzZWxmLl9sYXVuY2hDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvLyBkYXRhIGlzIGEgdXRmOCBzdHJpbmcuIERhdGEgc2VudCB3aGlsZSBub3QgY29ubmVjdGVkIGlzIGRyb3BwZWQgb25cbiAgLy8gdGhlIGZsb29yLCBhbmQgaXQgaXMgdXAgdGhlIHVzZXIgb2YgdGhpcyBBUEkgdG8gcmV0cmFuc21pdCBsb3N0XG4gIC8vIG1lc3NhZ2VzIG9uICdyZXNldCdcbiAgc2VuZChkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLmN1cnJlbnRTdGF0dXMuY29ubmVjdGVkKSB7XG4gICAgICBzZWxmLmNsaWVudC5zZW5kKGRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoYW5nZXMgd2hlcmUgdGhpcyBjb25uZWN0aW9uIHBvaW50c1xuICBfY2hhbmdlVXJsKHVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLmVuZHBvaW50ID0gdXJsO1xuICB9XG5cbiAgX29uQ29ubmVjdChjbGllbnQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoY2xpZW50ICE9PSBzZWxmLmNsaWVudCkge1xuICAgICAgLy8gVGhpcyBjb25uZWN0aW9uIGlzIG5vdCBmcm9tIHRoZSBsYXN0IGNhbGwgdG8gX2xhdW5jaENvbm5lY3Rpb24uXG4gICAgICAvLyBCdXQgX2xhdW5jaENvbm5lY3Rpb24gY2FsbHMgX2NsZWFudXAgd2hpY2ggY2xvc2VzIHByZXZpb3VzIGNvbm5lY3Rpb25zLlxuICAgICAgLy8gSXQncyBvdXIgYmVsaWVmIHRoYXQgdGhpcyBzdGlmbGVzIGZ1dHVyZSAnb3BlbicgZXZlbnRzLCBidXQgbWF5YmVcbiAgICAgIC8vIHdlIGFyZSB3cm9uZz9cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdvdCBvcGVuIGZyb20gaW5hY3RpdmUgY2xpZW50IFwiICsgISFzZWxmLmNsaWVudCk7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX2ZvcmNlZFRvRGlzY29ubmVjdCkge1xuICAgICAgLy8gV2Ugd2VyZSBhc2tlZCB0byBkaXNjb25uZWN0IGJldHdlZW4gdHJ5aW5nIHRvIG9wZW4gdGhlIGNvbm5lY3Rpb24gYW5kXG4gICAgICAvLyBhY3R1YWxseSBvcGVuaW5nIGl0LiBMZXQncyBqdXN0IHByZXRlbmQgdGhpcyBuZXZlciBoYXBwZW5lZC5cbiAgICAgIHNlbGYuY2xpZW50LmNsb3NlKCk7XG4gICAgICBzZWxmLmNsaWVudCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQpIHtcbiAgICAgIC8vIFdlIGFscmVhZHkgaGF2ZSBhIGNvbm5lY3Rpb24uIEl0IG11c3QgaGF2ZSBiZWVuIHRoZSBjYXNlIHRoYXQgd2VcbiAgICAgIC8vIHN0YXJ0ZWQgdHdvIHBhcmFsbGVsIGNvbm5lY3Rpb24gYXR0ZW1wdHMgKGJlY2F1c2Ugd2Ugd2FudGVkIHRvXG4gICAgICAvLyAncmVjb25uZWN0IG5vdycgb24gYSBoYW5naW5nIGNvbm5lY3Rpb24gYW5kIHdlIGhhZCBubyB3YXkgdG8gY2FuY2VsIHRoZVxuICAgICAgLy8gY29ubmVjdGlvbiBhdHRlbXB0LikgQnV0IHRoaXMgc2hvdWxkbid0IGhhcHBlbiAoc2ltaWxhcmx5IHRvIHRoZSBjbGllbnRcbiAgICAgIC8vICE9PSBzZWxmLmNsaWVudCBjaGVjayBhYm92ZSkuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUd28gcGFyYWxsZWwgY29ubmVjdGlvbnM/XCIpO1xuICAgIH1cblxuICAgIHNlbGYuX2NsZWFyQ29ubmVjdGlvblRpbWVyKCk7XG5cbiAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgc2VsZi5jdXJyZW50U3RhdHVzLnN0YXR1cyA9IFwiY29ubmVjdGVkXCI7XG4gICAgc2VsZi5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgc2VsZi5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQgPSAwO1xuICAgIHNlbGYuc3RhdHVzQ2hhbmdlZCgpO1xuXG4gICAgLy8gZmlyZSByZXNldHMuIFRoaXMgbXVzdCBjb21lIGFmdGVyIHN0YXR1cyBjaGFuZ2Ugc28gdGhhdCBjbGllbnRzXG4gICAgLy8gY2FuIGNhbGwgc2VuZCBmcm9tIHdpdGhpbiBhIHJlc2V0IGNhbGxiYWNrLlxuICAgIF8uZWFjaChzZWxmLmV2ZW50Q2FsbGJhY2tzLnJlc2V0LCBmdW5jdGlvbiAoY2FsbGJhY2spIHsgY2FsbGJhY2soKTsgfSk7XG4gIH1cblxuICBfY2xlYW51cChtYXliZUVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fY2xlYXJDb25uZWN0aW9uVGltZXIoKTtcbiAgICBpZiAoc2VsZi5jbGllbnQpIHtcbiAgICAgIHZhciBjbGllbnQgPSBzZWxmLmNsaWVudDtcbiAgICAgIHNlbGYuY2xpZW50ID0gbnVsbDtcbiAgICAgIGNsaWVudC5jbG9zZSgpO1xuXG4gICAgICBfLmVhY2goc2VsZi5ldmVudENhbGxiYWNrcy5kaXNjb25uZWN0LCBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sobWF5YmVFcnJvcik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfY2xlYXJDb25uZWN0aW9uVGltZXIoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuY29ubmVjdGlvblRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5jb25uZWN0aW9uVGltZXIpO1xuICAgICAgc2VsZi5jb25uZWN0aW9uVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRQcm94eVVybCh0YXJnZXRVcmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gU2ltaWxhciB0byBjb2RlIGluIHRvb2xzL2h0dHAtaGVscGVycy5qcy5cbiAgICB2YXIgcHJveHkgPSBwcm9jZXNzLmVudi5IVFRQX1BST1hZIHx8IHByb2Nlc3MuZW52Lmh0dHBfcHJveHkgfHwgbnVsbDtcbiAgICAvLyBpZiB3ZSdyZSBnb2luZyB0byBhIHNlY3VyZSB1cmwsIHRyeSB0aGUgaHR0cHNfcHJveHkgZW52IHZhcmlhYmxlIGZpcnN0LlxuICAgIGlmICh0YXJnZXRVcmwubWF0Y2goL153c3M6LykpIHtcbiAgICAgIHByb3h5ID0gcHJvY2Vzcy5lbnYuSFRUUFNfUFJPWFkgfHwgcHJvY2Vzcy5lbnYuaHR0cHNfcHJveHkgfHwgcHJveHk7XG4gICAgfVxuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIF9sYXVuY2hDb25uZWN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9jbGVhbnVwKCk7IC8vIGNsZWFudXAgdGhlIG9sZCBzb2NrZXQsIGlmIHRoZXJlIHdhcyBvbmUuXG5cbiAgICAvLyBTaW5jZSBzZXJ2ZXItdG8tc2VydmVyIEREUCBpcyBzdGlsbCBhbiBleHBlcmltZW50YWwgZmVhdHVyZSwgd2Ugb25seVxuICAgIC8vIHJlcXVpcmUgdGhlIG1vZHVsZSBpZiB3ZSBhY3R1YWxseSBjcmVhdGUgYSBzZXJ2ZXItdG8tc2VydmVyXG4gICAgLy8gY29ubmVjdGlvbi5cbiAgICB2YXIgRmF5ZVdlYlNvY2tldCA9IE5wbS5yZXF1aXJlKCdmYXllLXdlYnNvY2tldCcpO1xuICAgIHZhciBkZWZsYXRlID0gTnBtLnJlcXVpcmUoJ3Blcm1lc3NhZ2UtZGVmbGF0ZScpO1xuXG4gICAgdmFyIHRhcmdldFVybCA9IHRvV2Vic29ja2V0VXJsKHNlbGYuZW5kcG9pbnQpO1xuICAgIHZhciBmYXllT3B0aW9ucyA9IHtcbiAgICAgIGhlYWRlcnM6IHNlbGYuaGVhZGVycyxcbiAgICAgIGV4dGVuc2lvbnM6IFtkZWZsYXRlXVxuICAgIH07XG4gICAgZmF5ZU9wdGlvbnMgPSBfLmV4dGVuZChmYXllT3B0aW9ucywgc2VsZi5ucG1GYXllT3B0aW9ucyk7XG4gICAgdmFyIHByb3h5VXJsID0gc2VsZi5fZ2V0UHJveHlVcmwodGFyZ2V0VXJsKTtcbiAgICBpZiAocHJveHlVcmwpIHtcbiAgICAgIGZheWVPcHRpb25zLnByb3h5ID0geyBvcmlnaW46IHByb3h5VXJsIH07XG4gICAgfTtcblxuICAgIC8vIFdlIHdvdWxkIGxpa2UgdG8gc3BlY2lmeSAnZGRwJyBhcyB0aGUgc3VicHJvdG9jb2wgaGVyZS4gVGhlIG5wbSBtb2R1bGUgd2VcbiAgICAvLyB1c2VkIHRvIHVzZSBhcyBhIGNsaWVudCB3b3VsZCBmYWlsIHRoZSBoYW5kc2hha2UgaWYgd2UgYXNrIGZvciBhXG4gICAgLy8gc3VicHJvdG9jb2wgYW5kIHRoZSBzZXJ2ZXIgZG9lc24ndCBzZW5kIG9uZSBiYWNrIChhbmQgc29ja2pzIGRvZXNuJ3QpLlxuICAgIC8vIEZheWUgZG9lc24ndCBoYXZlIHRoYXQgYmVoYXZpb3I7IGl0J3MgdW5jbGVhciBmcm9tIHJlYWRpbmcgUkZDIDY0NTUgaWZcbiAgICAvLyBGYXllIGlzIGVycm9uZW91cyBvciBub3QuICBTbyBmb3Igbm93LCB3ZSBkb24ndCBzcGVjaWZ5IHByb3RvY29scy5cbiAgICB2YXIgc3VicHJvdG9jb2xzID0gW107XG5cbiAgICB2YXIgY2xpZW50ID0gc2VsZi5jbGllbnQgPSBuZXcgRmF5ZVdlYlNvY2tldC5DbGllbnQoXG4gICAgICB0YXJnZXRVcmwsIHN1YnByb3RvY29scywgZmF5ZU9wdGlvbnMpO1xuXG4gICAgc2VsZi5fY2xlYXJDb25uZWN0aW9uVGltZXIoKTtcbiAgICBzZWxmLmNvbm5lY3Rpb25UaW1lciA9IE1ldGVvci5zZXRUaW1lb3V0KFxuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9sb3N0Q29ubmVjdGlvbihcbiAgICAgICAgICBuZXcgRERQLkNvbm5lY3Rpb25FcnJvcihcIkREUCBjb25uZWN0aW9uIHRpbWVkIG91dFwiKSk7XG4gICAgICB9LFxuICAgICAgc2VsZi5DT05ORUNUX1RJTUVPVVQpO1xuXG4gICAgc2VsZi5jbGllbnQub24oJ29wZW4nLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBzZWxmLl9vbkNvbm5lY3QoY2xpZW50KTtcbiAgICB9LCBcInN0cmVhbSBjb25uZWN0IGNhbGxiYWNrXCIpKTtcblxuICAgIHZhciBjbGllbnRPbklmQ3VycmVudCA9IGZ1bmN0aW9uIChldmVudCwgZGVzY3JpcHRpb24sIGYpIHtcbiAgICAgIHNlbGYuY2xpZW50Lm9uKGV2ZW50LCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gSWdub3JlIGV2ZW50cyBmcm9tIGFueSBjb25uZWN0aW9uIHdlJ3ZlIGFscmVhZHkgY2xlYW5lZCB1cC5cbiAgICAgICAgaWYgKGNsaWVudCAhPT0gc2VsZi5jbGllbnQpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9LCBkZXNjcmlwdGlvbikpO1xuICAgIH07XG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnZXJyb3InLCAnc3RyZWFtIGVycm9yIGNhbGxiYWNrJywgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBpZiAoIXNlbGYub3B0aW9ucy5fZG9udFByaW50RXJyb3JzKVxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwic3RyZWFtIGVycm9yXCIsIGVycm9yLm1lc3NhZ2UpO1xuXG4gICAgICAvLyBGYXllJ3MgJ2Vycm9yJyBvYmplY3QgaXMgbm90IGEgSlMgZXJyb3IgKGFuZCBhbW9uZyBvdGhlciB0aGluZ3MsXG4gICAgICAvLyBkb2Vzbid0IHN0cmluZ2lmeSB3ZWxsKS4gQ29udmVydCBpdCB0byBvbmUuXG4gICAgICBzZWxmLl9sb3N0Q29ubmVjdGlvbihuZXcgRERQLkNvbm5lY3Rpb25FcnJvcihlcnJvci5tZXNzYWdlKSk7XG4gICAgfSk7XG5cblxuICAgIGNsaWVudE9uSWZDdXJyZW50KCdjbG9zZScsICdzdHJlYW0gY2xvc2UgY2FsbGJhY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9sb3N0Q29ubmVjdGlvbigpO1xuICAgIH0pO1xuXG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnbWVzc2FnZScsICdzdHJlYW0gbWVzc2FnZSBjYWxsYmFjaycsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAvLyBJZ25vcmUgYmluYXJ5IGZyYW1lcywgd2hlcmUgbWVzc2FnZS5kYXRhIGlzIGEgQnVmZmVyXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuZGF0YSAhPT0gXCJzdHJpbmdcIilcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBfLmVhY2goc2VsZi5ldmVudENhbGxiYWNrcy5tZXNzYWdlLCBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sobWVzc2FnZS5kYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59O1xuIiwiaW1wb3J0IHsgRERQLCBMaXZlZGF0YVRlc3QgfSBmcm9tIFwiLi9uYW1lc3BhY2UuanNcIjtcblxuLy8gWFhYIGZyb20gVW5kZXJzY29yZS5TdHJpbmcgKGh0dHA6Ly9lcGVsaS5naXRodWIuY29tL3VuZGVyc2NvcmUuc3RyaW5nLylcbnZhciBzdGFydHNXaXRoID0gZnVuY3Rpb24oc3RyLCBzdGFydHMpIHtcbiAgcmV0dXJuIHN0ci5sZW5ndGggPj0gc3RhcnRzLmxlbmd0aCAmJlxuICAgIHN0ci5zdWJzdHJpbmcoMCwgc3RhcnRzLmxlbmd0aCkgPT09IHN0YXJ0cztcbn07XG52YXIgZW5kc1dpdGggPSBmdW5jdGlvbihzdHIsIGVuZHMpIHtcbiAgcmV0dXJuIHN0ci5sZW5ndGggPj0gZW5kcy5sZW5ndGggJiZcbiAgICBzdHIuc3Vic3RyaW5nKHN0ci5sZW5ndGggLSBlbmRzLmxlbmd0aCkgPT09IGVuZHM7XG59O1xuXG4vLyBAcGFyYW0gdXJsIHtTdHJpbmd9IFVSTCB0byBNZXRlb3IgYXBwLCBlZzpcbi8vICAgXCIvXCIgb3IgXCJtYWRld2l0aC5tZXRlb3IuY29tXCIgb3IgXCJodHRwczovL2Zvby5tZXRlb3IuY29tXCJcbi8vICAgb3IgXCJkZHArc29ja2pzOi8vZGRwLS0qKioqLWZvby5tZXRlb3IuY29tL3NvY2tqc1wiXG4vLyBAcmV0dXJucyB7U3RyaW5nfSBVUkwgdG8gdGhlIGVuZHBvaW50IHdpdGggdGhlIHNwZWNpZmljIHNjaGVtZSBhbmQgc3ViUGF0aCwgZS5nLlxuLy8gZm9yIHNjaGVtZSBcImh0dHBcIiBhbmQgc3ViUGF0aCBcInNvY2tqc1wiXG4vLyAgIFwiaHR0cDovL3N1YmRvbWFpbi5tZXRlb3IuY29tL3NvY2tqc1wiIG9yIFwiL3NvY2tqc1wiXG4vLyAgIG9yIFwiaHR0cHM6Ly9kZHAtLTEyMzQtZm9vLm1ldGVvci5jb20vc29ja2pzXCJcbnZhciB0cmFuc2xhdGVVcmwgPSAgZnVuY3Rpb24odXJsLCBuZXdTY2hlbWVCYXNlLCBzdWJQYXRoKSB7XG4gIGlmICghIG5ld1NjaGVtZUJhc2UpIHtcbiAgICBuZXdTY2hlbWVCYXNlID0gXCJodHRwXCI7XG4gIH1cblxuICB2YXIgZGRwVXJsTWF0Y2ggPSB1cmwubWF0Y2goL15kZHAoaT8pXFwrc29ja2pzOlxcL1xcLy8pO1xuICB2YXIgaHR0cFVybE1hdGNoID0gdXJsLm1hdGNoKC9eaHR0cChzPyk6XFwvXFwvLyk7XG4gIHZhciBuZXdTY2hlbWU7XG4gIGlmIChkZHBVcmxNYXRjaCkge1xuICAgIC8vIFJlbW92ZSBzY2hlbWUgYW5kIHNwbGl0IG9mZiB0aGUgaG9zdC5cbiAgICB2YXIgdXJsQWZ0ZXJERFAgPSB1cmwuc3Vic3RyKGRkcFVybE1hdGNoWzBdLmxlbmd0aCk7XG4gICAgbmV3U2NoZW1lID0gZGRwVXJsTWF0Y2hbMV0gPT09IFwiaVwiID8gbmV3U2NoZW1lQmFzZSA6IG5ld1NjaGVtZUJhc2UgKyBcInNcIjtcbiAgICB2YXIgc2xhc2hQb3MgPSB1cmxBZnRlckREUC5pbmRleE9mKCcvJyk7XG4gICAgdmFyIGhvc3QgPVxuICAgICAgICAgIHNsYXNoUG9zID09PSAtMSA/IHVybEFmdGVyRERQIDogdXJsQWZ0ZXJERFAuc3Vic3RyKDAsIHNsYXNoUG9zKTtcbiAgICB2YXIgcmVzdCA9IHNsYXNoUG9zID09PSAtMSA/ICcnIDogdXJsQWZ0ZXJERFAuc3Vic3RyKHNsYXNoUG9zKTtcblxuICAgIC8vIEluIHRoZSBob3N0IChPTkxZISksIGNoYW5nZSAnKicgY2hhcmFjdGVycyBpbnRvIHJhbmRvbSBkaWdpdHMuIFRoaXNcbiAgICAvLyBhbGxvd3MgZGlmZmVyZW50IHN0cmVhbSBjb25uZWN0aW9ucyB0byBjb25uZWN0IHRvIGRpZmZlcmVudCBob3N0bmFtZXNcbiAgICAvLyBhbmQgYXZvaWQgYnJvd3NlciBwZXItaG9zdG5hbWUgY29ubmVjdGlvbiBsaW1pdHMuXG4gICAgaG9zdCA9IGhvc3QucmVwbGFjZSgvXFwqL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKFJhbmRvbS5mcmFjdGlvbigpKjEwKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdTY2hlbWUgKyAnOi8vJyArIGhvc3QgKyByZXN0O1xuICB9IGVsc2UgaWYgKGh0dHBVcmxNYXRjaCkge1xuICAgIG5ld1NjaGVtZSA9ICFodHRwVXJsTWF0Y2hbMV0gPyBuZXdTY2hlbWVCYXNlIDogbmV3U2NoZW1lQmFzZSArIFwic1wiO1xuICAgIHZhciB1cmxBZnRlckh0dHAgPSB1cmwuc3Vic3RyKGh0dHBVcmxNYXRjaFswXS5sZW5ndGgpO1xuICAgIHVybCA9IG5ld1NjaGVtZSArIFwiOi8vXCIgKyB1cmxBZnRlckh0dHA7XG4gIH1cblxuICAvLyBQcmVmaXggRlFETnMgYnV0IG5vdCByZWxhdGl2ZSBVUkxzXG4gIGlmICh1cmwuaW5kZXhPZihcIjovL1wiKSA9PT0gLTEgJiYgIXN0YXJ0c1dpdGgodXJsLCBcIi9cIikpIHtcbiAgICB1cmwgPSBuZXdTY2hlbWVCYXNlICsgXCI6Ly9cIiArIHVybDtcbiAgfVxuXG4gIC8vIFhYWCBUaGlzIGlzIG5vdCB3aGF0IHdlIHNob3VsZCBiZSBkb2luZzogaWYgSSBoYXZlIGEgc2l0ZVxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgdGhlbiBERFAuY29ubmVjdChcIi9cIikgc2hvdWxkIGFjdHVhbGx5IGNvbm5lY3RcbiAgLy8gdG8gXCIvXCIsIG5vdCB0byBcIi9mb29cIi4gXCIvXCIgaXMgYW4gYWJzb2x1dGUgcGF0aC4gKENvbnRyYXN0OiBpZlxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgaXQgd291bGQgYmUgcmVhc29uYWJsZSBmb3IgRERQLmNvbm5lY3QoXCJiYXJcIilcbiAgLy8gdG8gY29ubmVjdCB0byBcIi9mb28vYmFyXCIpLlxuICAvL1xuICAvLyBXZSBzaG91bGQgbWFrZSB0aGlzIHByb3Blcmx5IGhvbm9yIGFic29sdXRlIHBhdGhzIHJhdGhlciB0aGFuXG4gIC8vIGZvcmNpbmcgdGhlIHBhdGggdG8gYmUgcmVsYXRpdmUgdG8gdGhlIHNpdGUgcm9vdC4gU2ltdWx0YW5lb3VzbHksXG4gIC8vIHdlIHNob3VsZCBzZXQgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgdG8gaW5jbHVkZSB0aGUgc2l0ZVxuICAvLyByb290LiBTZWUgYWxzbyBjbGllbnRfY29udmVuaWVuY2UuanMgI1JhdGlvbmFsaXppbmdSZWxhdGl2ZUREUFVSTHNcbiAgdXJsID0gTWV0ZW9yLl9yZWxhdGl2ZVRvU2l0ZVJvb3RVcmwodXJsKTtcblxuICBpZiAoZW5kc1dpdGgodXJsLCBcIi9cIikpXG4gICAgcmV0dXJuIHVybCArIHN1YlBhdGg7XG4gIGVsc2VcbiAgICByZXR1cm4gdXJsICsgXCIvXCIgKyBzdWJQYXRoO1xufTtcblxudG9Tb2NranNVcmwgPSBmdW5jdGlvbiAodXJsKSB7XG4gIHJldHVybiB0cmFuc2xhdGVVcmwodXJsLCBcImh0dHBcIiwgXCJzb2NranNcIik7XG59O1xuXG50b1dlYnNvY2tldFVybCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgdmFyIHJldCA9IHRyYW5zbGF0ZVVybCh1cmwsIFwid3NcIiwgXCJ3ZWJzb2NrZXRcIik7XG4gIHJldHVybiByZXQ7XG59O1xuXG5MaXZlZGF0YVRlc3QudG9Tb2NranNVcmwgPSB0b1NvY2tqc1VybDtcblxuIFxuXy5leHRlbmQoTGl2ZWRhdGFUZXN0LkNsaWVudFN0cmVhbS5wcm90b3R5cGUsIHtcblxuICAvLyBSZWdpc3RlciBmb3IgY2FsbGJhY2tzLlxuICBvbjogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKG5hbWUgIT09ICdtZXNzYWdlJyAmJiBuYW1lICE9PSAncmVzZXQnICYmIG5hbWUgIT09ICdkaXNjb25uZWN0JylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gZXZlbnQgdHlwZTogXCIgKyBuYW1lKTtcblxuICAgIGlmICghc2VsZi5ldmVudENhbGxiYWNrc1tuYW1lXSlcbiAgICAgIHNlbGYuZXZlbnRDYWxsYmFja3NbbmFtZV0gPSBbXTtcbiAgICBzZWxmLmV2ZW50Q2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICB9LFxuXG5cbiAgX2luaXRDb21tb246IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8vLyBDb25zdGFudHNcblxuICAgIC8vIGhvdyBsb25nIHRvIHdhaXQgdW50aWwgd2UgZGVjbGFyZSB0aGUgY29ubmVjdGlvbiBhdHRlbXB0XG4gICAgLy8gZmFpbGVkLlxuICAgIHNlbGYuQ09OTkVDVF9USU1FT1VUID0gb3B0aW9ucy5jb25uZWN0VGltZW91dE1zIHx8IDEwMDAwO1xuXG4gICAgc2VsZi5ldmVudENhbGxiYWNrcyA9IHt9OyAvLyBuYW1lIC0+IFtjYWxsYmFja11cblxuICAgIHNlbGYuX2ZvcmNlZFRvRGlzY29ubmVjdCA9IGZhbHNlO1xuXG4gICAgLy8vLyBSZWFjdGl2ZSBzdGF0dXNcbiAgICBzZWxmLmN1cnJlbnRTdGF0dXMgPSB7XG4gICAgICBzdGF0dXM6IFwiY29ubmVjdGluZ1wiLFxuICAgICAgY29ubmVjdGVkOiBmYWxzZSxcbiAgICAgIHJldHJ5Q291bnQ6IDBcbiAgICB9O1xuXG5cbiAgICBzZWxmLnN0YXR1c0xpc3RlbmVycyA9IHR5cGVvZiBUcmFja2VyICE9PSAndW5kZWZpbmVkJyAmJiBuZXcgVHJhY2tlci5EZXBlbmRlbmN5O1xuICAgIHNlbGYuc3RhdHVzQ2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLnN0YXR1c0xpc3RlbmVycylcbiAgICAgICAgc2VsZi5zdGF0dXNMaXN0ZW5lcnMuY2hhbmdlZCgpO1xuICAgIH07XG5cbiAgICAvLy8vIFJldHJ5IGxvZ2ljXG4gICAgc2VsZi5fcmV0cnkgPSBuZXcgUmV0cnk7XG4gICAgc2VsZi5jb25uZWN0aW9uVGltZXIgPSBudWxsO1xuXG4gIH0sXG5cbiAgLy8gVHJpZ2dlciBhIHJlY29ubmVjdC5cbiAgcmVjb25uZWN0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmIChvcHRpb25zLnVybCkge1xuICAgICAgc2VsZi5fY2hhbmdlVXJsKG9wdGlvbnMudXJsKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5fc29ja2pzT3B0aW9ucykge1xuICAgICAgc2VsZi5vcHRpb25zLl9zb2NranNPcHRpb25zID0gb3B0aW9ucy5fc29ja2pzT3B0aW9ucztcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCkge1xuICAgICAgaWYgKG9wdGlvbnMuX2ZvcmNlIHx8IG9wdGlvbnMudXJsKSB7XG4gICAgICAgIC8vIGZvcmNlIHJlY29ubmVjdC5cbiAgICAgICAgc2VsZi5fbG9zdENvbm5lY3Rpb24obmV3IEREUC5Gb3JjZWRSZWNvbm5lY3RFcnJvcik7XG4gICAgICB9IC8vIGVsc2UsIG5vb3AuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UncmUgbWlkLWNvbm5lY3Rpb24sIHN0b3AgaXQuXG4gICAgaWYgKHNlbGYuY3VycmVudFN0YXR1cy5zdGF0dXMgPT09IFwiY29ubmVjdGluZ1wiKSB7XG4gICAgICAvLyBQcmV0ZW5kIGl0J3MgYSBjbGVhbiBjbG9zZS5cbiAgICAgIHNlbGYuX2xvc3RDb25uZWN0aW9uKCk7XG4gICAgfVxuXG4gICAgc2VsZi5fcmV0cnkuY2xlYXIoKTtcbiAgICBzZWxmLmN1cnJlbnRTdGF0dXMucmV0cnlDb3VudCAtPSAxOyAvLyBkb24ndCBjb3VudCBtYW51YWwgcmV0cmllc1xuICAgIHNlbGYuX3JldHJ5Tm93KCk7XG4gIH0sXG5cbiAgZGlzY29ubmVjdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAvLyBGYWlsZWQgaXMgcGVybWFuZW50LiBJZiB3ZSdyZSBmYWlsZWQsIGRvbid0IGxldCBwZW9wbGUgZ28gYmFja1xuICAgIC8vIG9ubGluZSBieSBjYWxsaW5nICdkaXNjb25uZWN0JyB0aGVuICdyZWNvbm5lY3QnLlxuICAgIGlmIChzZWxmLl9mb3JjZWRUb0Rpc2Nvbm5lY3QpXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBJZiBfcGVybWFuZW50IGlzIHNldCwgcGVybWFuZW50bHkgZGlzY29ubmVjdCBhIHN0cmVhbS4gT25jZSBhIHN0cmVhbVxuICAgIC8vIGlzIGZvcmNlZCB0byBkaXNjb25uZWN0LCBpdCBjYW4gbmV2ZXIgcmVjb25uZWN0LiBUaGlzIGlzIGZvclxuICAgIC8vIGVycm9yIGNhc2VzIHN1Y2ggYXMgZGRwIHZlcnNpb24gbWlzbWF0Y2gsIHdoZXJlIHRyeWluZyBhZ2FpblxuICAgIC8vIHdvbid0IGZpeCB0aGUgcHJvYmxlbS5cbiAgICBpZiAob3B0aW9ucy5fcGVybWFuZW50KSB7XG4gICAgICBzZWxmLl9mb3JjZWRUb0Rpc2Nvbm5lY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIHNlbGYuX2NsZWFudXAoKTtcbiAgICBzZWxmLl9yZXRyeS5jbGVhcigpO1xuXG4gICAgc2VsZi5jdXJyZW50U3RhdHVzID0ge1xuICAgICAgc3RhdHVzOiAob3B0aW9ucy5fcGVybWFuZW50ID8gXCJmYWlsZWRcIiA6IFwib2ZmbGluZVwiKSxcbiAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICByZXRyeUNvdW50OiAwXG4gICAgfTtcblxuICAgIGlmIChvcHRpb25zLl9wZXJtYW5lbnQgJiYgb3B0aW9ucy5fZXJyb3IpXG4gICAgICBzZWxmLmN1cnJlbnRTdGF0dXMucmVhc29uID0gb3B0aW9ucy5fZXJyb3I7XG5cbiAgICBzZWxmLnN0YXR1c0NoYW5nZWQoKTtcbiAgfSxcblxuICAvLyBtYXliZUVycm9yIGlzIHNldCB1bmxlc3MgaXQncyBhIGNsZWFuIHByb3RvY29sLWxldmVsIGNsb3NlLlxuICBfbG9zdENvbm5lY3Rpb246IGZ1bmN0aW9uIChtYXliZUVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fY2xlYW51cChtYXliZUVycm9yKTtcbiAgICBzZWxmLl9yZXRyeUxhdGVyKG1heWJlRXJyb3IpOyAvLyBzZXRzIHN0YXR1cy4gbm8gbmVlZCB0byBkbyBpdCBoZXJlLlxuICB9LFxuXG4gIC8vIGZpcmVkIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgZ29uZSBvbmxpbmUuIHRyeSB0byByZWNvbm5lY3RcbiAgLy8gaW1tZWRpYXRlbHkuXG4gIF9vbmxpbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpZiB3ZSd2ZSByZXF1ZXN0ZWQgdG8gYmUgb2ZmbGluZSBieSBkaXNjb25uZWN0aW5nLCBkb24ndCByZWNvbm5lY3QuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgIT0gXCJvZmZsaW5lXCIpXG4gICAgICB0aGlzLnJlY29ubmVjdCgpO1xuICB9LFxuXG4gIF9yZXRyeUxhdGVyOiBmdW5jdGlvbiAobWF5YmVFcnJvcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciB0aW1lb3V0ID0gMDtcbiAgICBpZiAoc2VsZi5vcHRpb25zLnJldHJ5IHx8XG4gICAgICAgIChtYXliZUVycm9yICYmIG1heWJlRXJyb3IuZXJyb3JUeXBlID09PSBcIkREUC5Gb3JjZWRSZWNvbm5lY3RFcnJvclwiKSkge1xuICAgICAgdGltZW91dCA9IHNlbGYuX3JldHJ5LnJldHJ5TGF0ZXIoXG4gICAgICAgIHNlbGYuY3VycmVudFN0YXR1cy5yZXRyeUNvdW50LFxuICAgICAgICBfLmJpbmQoc2VsZi5fcmV0cnlOb3csIHNlbGYpXG4gICAgICApO1xuICAgICAgc2VsZi5jdXJyZW50U3RhdHVzLnN0YXR1cyA9IFwid2FpdGluZ1wiO1xuICAgICAgc2VsZi5jdXJyZW50U3RhdHVzLnJldHJ5VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKyB0aW1lb3V0O1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLmN1cnJlbnRTdGF0dXMuc3RhdHVzID0gXCJmYWlsZWRcIjtcbiAgICAgIGRlbGV0ZSBzZWxmLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIH1cblxuICAgIHNlbGYuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICBzZWxmLnN0YXR1c0NoYW5nZWQoKTtcbiAgfSxcblxuICBfcmV0cnlOb3c6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fZm9yY2VkVG9EaXNjb25uZWN0KVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQgKz0gMTtcbiAgICBzZWxmLmN1cnJlbnRTdGF0dXMuc3RhdHVzID0gXCJjb25uZWN0aW5nXCI7XG4gICAgc2VsZi5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIGRlbGV0ZSBzZWxmLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIHNlbGYuc3RhdHVzQ2hhbmdlZCgpO1xuXG4gICAgc2VsZi5fbGF1bmNoQ29ubmVjdGlvbigpO1xuICB9LFxuXG5cbiAgLy8gR2V0IGN1cnJlbnQgc3RhdHVzLiBSZWFjdGl2ZS5cbiAgc3RhdHVzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLnN0YXR1c0xpc3RlbmVycylcbiAgICAgIHNlbGYuc3RhdHVzTGlzdGVuZXJzLmRlcGVuZCgpO1xuICAgIHJldHVybiBzZWxmLmN1cnJlbnRTdGF0dXM7XG4gIH1cbn0pO1xuXG5ERFAuQ29ubmVjdGlvbkVycm9yID0gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXG4gIFwiRERQLkNvbm5lY3Rpb25FcnJvclwiLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLm1lc3NhZ2UgPSBtZXNzYWdlO1xufSk7XG5cbkREUC5Gb3JjZWRSZWNvbm5lY3RFcnJvciA9IE1ldGVvci5tYWtlRXJyb3JUeXBlKFxuICBcIkREUC5Gb3JjZWRSZWNvbm5lY3RFcnJvclwiLCBmdW5jdGlvbiAoKSB7fSk7XG4iLCJpbXBvcnQgeyBERFAsIExpdmVkYXRhVGVzdCB9IGZyb20gXCIuL25hbWVzcGFjZS5qc1wiO1xuXG5MaXZlZGF0YVRlc3QuU1VQUE9SVEVEX0REUF9WRVJTSU9OUyA9IEREUENvbW1vbi5TVVBQT1JURURfRERQX1ZFUlNJT05TO1xuXG4vLyBUaGlzIGlzIHByaXZhdGUgYnV0IGl0J3MgdXNlZCBpbiBhIGZldyBwbGFjZXMuIGFjY291bnRzLWJhc2UgdXNlc1xuLy8gaXQgdG8gZ2V0IHRoZSBjdXJyZW50IHVzZXIuIE1ldGVvci5zZXRUaW1lb3V0IGFuZCBmcmllbmRzIGNsZWFyXG4vLyBpdC4gV2UgY2FuIHByb2JhYmx5IGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGZhY3RvciB0aGlzLlxuRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiA9IG5ldyBNZXRlb3IuRW52aXJvbm1lbnRWYXJpYWJsZTtcbkREUC5fQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbiA9IG5ldyBNZXRlb3IuRW52aXJvbm1lbnRWYXJpYWJsZTtcblxuLy8gWFhYOiBLZWVwIEREUC5fQ3VycmVudEludm9jYXRpb24gZm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5LlxuRERQLl9DdXJyZW50SW52b2NhdGlvbiA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb247XG4iLCJpbXBvcnQgeyBERFAgfSBmcm9tIFwiLi9uYW1lc3BhY2UuanNcIjtcblxuLy8gUmV0dXJucyB0aGUgbmFtZWQgc2VxdWVuY2Ugb2YgcHNldWRvLXJhbmRvbSB2YWx1ZXMuXG4vLyBUaGUgc2NvcGUgd2lsbCBiZSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpLCBzbyB0aGUgc3RyZWFtIHdpbGwgcHJvZHVjZVxuLy8gY29uc2lzdGVudCB2YWx1ZXMgZm9yIG1ldGhvZCBjYWxscyBvbiB0aGUgY2xpZW50IGFuZCBzZXJ2ZXIuXG5ERFAucmFuZG9tU3RyZWFtID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgdmFyIHNjb3BlID0gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5nZXQoKTtcbiAgcmV0dXJuIEREUENvbW1vbi5SYW5kb21TdHJlYW0uZ2V0KHNjb3BlLCBuYW1lKTtcbn07XG5cblxuIiwiaW1wb3J0IHsgRERQLCBMaXZlZGF0YVRlc3QgfSBmcm9tIFwiLi9uYW1lc3BhY2UuanNcIjtcbmltcG9ydCB7IE1vbmdvSURNYXAgfSBmcm9tIFwiLi9pZF9tYXAuanNcIjtcblxuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICB2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG4gIHZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xufVxuXG4vLyBAcGFyYW0gdXJsIHtTdHJpbmd8T2JqZWN0fSBVUkwgdG8gTWV0ZW9yIGFwcCxcbi8vICAgb3IgYW4gb2JqZWN0IGFzIGEgdGVzdCBob29rIChzZWUgY29kZSlcbi8vIE9wdGlvbnM6XG4vLyAgIHJlbG9hZFdpdGhPdXRzdGFuZGluZzogaXMgaXQgT0sgdG8gcmVsb2FkIGlmIHRoZXJlIGFyZSBvdXRzdGFuZGluZyBtZXRob2RzP1xuLy8gICBoZWFkZXJzOiBleHRyYSBoZWFkZXJzIHRvIHNlbmQgb24gdGhlIHdlYnNvY2tldHMgY29ubmVjdGlvbiwgZm9yXG4vLyAgICAgc2VydmVyLXRvLXNlcnZlciBERFAgb25seVxuLy8gICBfc29ja2pzT3B0aW9uczogU3BlY2lmaWVzIG9wdGlvbnMgdG8gcGFzcyB0aHJvdWdoIHRvIHRoZSBzb2NranMgY2xpZW50XG4vLyAgIG9uRERQTmVnb3RpYXRpb25WZXJzaW9uRmFpbHVyZTogY2FsbGJhY2sgd2hlbiB2ZXJzaW9uIG5lZ290aWF0aW9uIGZhaWxzLlxuLy9cbi8vIFhYWCBUaGVyZSBzaG91bGQgYmUgYSB3YXkgdG8gZGVzdHJveSBhIEREUCBjb25uZWN0aW9uLCBjYXVzaW5nIGFsbFxuLy8gb3V0c3RhbmRpbmcgbWV0aG9kIGNhbGxzIHRvIGZhaWwuXG4vL1xuLy8gWFhYIE91ciBjdXJyZW50IHdheSBvZiBoYW5kbGluZyBmYWlsdXJlIGFuZCByZWNvbm5lY3Rpb24gaXMgZ3JlYXRcbi8vIGZvciBhbiBhcHAgKHdoZXJlIHdlIHdhbnQgdG8gdG9sZXJhdGUgYmVpbmcgZGlzY29ubmVjdGVkIGFzIGFuXG4vLyBleHBlY3Qgc3RhdGUsIGFuZCBrZWVwIHRyeWluZyBmb3JldmVyIHRvIHJlY29ubmVjdCkgYnV0IGN1bWJlcnNvbWVcbi8vIGZvciBzb21ldGhpbmcgbGlrZSBhIGNvbW1hbmQgbGluZSB0b29sIHRoYXQgd2FudHMgdG8gbWFrZSBhXG4vLyBjb25uZWN0aW9uLCBjYWxsIGEgbWV0aG9kLCBhbmQgcHJpbnQgYW4gZXJyb3IgaWYgY29ubmVjdGlvblxuLy8gZmFpbHMuIFdlIHNob3VsZCBoYXZlIGJldHRlciB1c2FiaWxpdHkgaW4gdGhlIGxhdHRlciBjYXNlICh3aGlsZVxuLy8gc3RpbGwgdHJhbnNwYXJlbnRseSByZWNvbm5lY3RpbmcgaWYgaXQncyBqdXN0IGEgdHJhbnNpZW50IGZhaWx1cmVcbi8vIG9yIHRoZSBzZXJ2ZXIgbWlncmF0aW5nIHVzKS5cbnZhciBDb25uZWN0aW9uID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgb25Db25uZWN0ZWQ6IGZ1bmN0aW9uICgpIHt9LFxuICAgIG9uRERQVmVyc2lvbk5lZ290aWF0aW9uRmFpbHVyZTogZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKGRlc2NyaXB0aW9uKTtcbiAgICB9LFxuICAgIGhlYXJ0YmVhdEludGVydmFsOiAxNzUwMCxcbiAgICBoZWFydGJlYXRUaW1lb3V0OiAxNTAwMCxcbiAgICBucG1GYXllT3B0aW9uczoge30sXG4gICAgLy8gVGhlc2Ugb3B0aW9ucyBhcmUgb25seSBmb3IgdGVzdGluZy5cbiAgICByZWxvYWRXaXRoT3V0c3RhbmRpbmc6IGZhbHNlLFxuICAgIHN1cHBvcnRlZEREUFZlcnNpb25zOiBERFBDb21tb24uU1VQUE9SVEVEX0REUF9WRVJTSU9OUyxcbiAgICByZXRyeTogdHJ1ZSxcbiAgICByZXNwb25kVG9QaW5nczogdHJ1ZSxcbiAgICAvLyBXaGVuIHVwZGF0ZXMgYXJlIGNvbWluZyB3aXRoaW4gdGhpcyBtcyBpbnRlcnZhbCwgYmF0Y2ggdGhlbSB0b2dldGhlci5cbiAgICBidWZmZXJlZFdyaXRlc0ludGVydmFsOiA1LFxuICAgIC8vIEZsdXNoIGJ1ZmZlcnMgaW1tZWRpYXRlbHkgaWYgd3JpdGVzIGFyZSBoYXBwZW5pbmcgY29udGludW91c2x5IGZvciBtb3JlIHRoYW4gdGhpcyBtYW55IG1zLlxuICAgIGJ1ZmZlcmVkV3JpdGVzTWF4QWdlOiA1MDBcbiAgfSwgb3B0aW9ucyk7XG5cbiAgLy8gSWYgc2V0LCBjYWxsZWQgd2hlbiB3ZSByZWNvbm5lY3QsIHF1ZXVpbmcgbWV0aG9kIGNhbGxzIF9iZWZvcmVfIHRoZVxuICAvLyBleGlzdGluZyBvdXRzdGFuZGluZyBvbmVzLlxuICAvLyBOT1RFOiBUaGlzIGZlYXR1cmUgaGFzIGJlZW4gcHJlc2VydmVkIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gVGhlXG4gIC8vIHByZWZlcnJlZCBtZXRob2Qgb2Ygc2V0dGluZyBhIGNhbGxiYWNrIG9uIHJlY29ubmVjdCBpcyB0byB1c2VcbiAgLy8gRERQLm9uUmVjb25uZWN0LlxuICBzZWxmLm9uUmVjb25uZWN0ID0gbnVsbDtcblxuICAvLyBhcyBhIHRlc3QgaG9vaywgYWxsb3cgcGFzc2luZyBhIHN0cmVhbSBpbnN0ZWFkIG9mIGEgdXJsLlxuICBpZiAodHlwZW9mIHVybCA9PT0gXCJvYmplY3RcIikge1xuICAgIHNlbGYuX3N0cmVhbSA9IHVybDtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9zdHJlYW0gPSBuZXcgTGl2ZWRhdGFUZXN0LkNsaWVudFN0cmVhbSh1cmwsIHtcbiAgICAgIHJldHJ5OiBvcHRpb25zLnJldHJ5LFxuICAgICAgaGVhZGVyczogb3B0aW9ucy5oZWFkZXJzLFxuICAgICAgX3NvY2tqc09wdGlvbnM6IG9wdGlvbnMuX3NvY2tqc09wdGlvbnMsXG4gICAgICAvLyBVc2VkIHRvIGtlZXAgc29tZSB0ZXN0cyBxdWlldCwgb3IgZm9yIG90aGVyIGNhc2VzIGluIHdoaWNoXG4gICAgICAvLyB0aGUgcmlnaHQgdGhpbmcgdG8gZG8gd2l0aCBjb25uZWN0aW9uIGVycm9ycyBpcyB0byBzaWxlbnRseVxuICAgICAgLy8gZmFpbCAoZS5nLiBzZW5kaW5nIHBhY2thZ2UgdXNhZ2Ugc3RhdHMpLiBBdCBzb21lIHBvaW50IHdlXG4gICAgICAvLyBzaG91bGQgaGF2ZSBhIHJlYWwgQVBJIGZvciBoYW5kbGluZyBjbGllbnQtc3RyZWFtLWxldmVsXG4gICAgICAvLyBlcnJvcnMuXG4gICAgICBfZG9udFByaW50RXJyb3JzOiBvcHRpb25zLl9kb250UHJpbnRFcnJvcnMsXG4gICAgICBjb25uZWN0VGltZW91dE1zOiBvcHRpb25zLmNvbm5lY3RUaW1lb3V0TXMsXG4gICAgICBucG1GYXllT3B0aW9uczogb3B0aW9ucy5ucG1GYXllT3B0aW9uc1xuICAgIH0pO1xuICB9XG5cbiAgc2VsZi5fbGFzdFNlc3Npb25JZCA9IG51bGw7XG4gIHNlbGYuX3ZlcnNpb25TdWdnZXN0aW9uID0gbnVsbDsgIC8vIFRoZSBsYXN0IHByb3Bvc2VkIEREUCB2ZXJzaW9uLlxuICBzZWxmLl92ZXJzaW9uID0gbnVsbDsgICAvLyBUaGUgRERQIHZlcnNpb24gYWdyZWVkIG9uIGJ5IGNsaWVudCBhbmQgc2VydmVyLlxuICBzZWxmLl9zdG9yZXMgPSB7fTsgLy8gbmFtZSAtPiBvYmplY3Qgd2l0aCBtZXRob2RzXG4gIHNlbGYuX21ldGhvZEhhbmRsZXJzID0ge307IC8vIG5hbWUgLT4gZnVuY1xuICBzZWxmLl9uZXh0TWV0aG9kSWQgPSAxO1xuICBzZWxmLl9zdXBwb3J0ZWRERFBWZXJzaW9ucyA9IG9wdGlvbnMuc3VwcG9ydGVkRERQVmVyc2lvbnM7XG5cbiAgc2VsZi5faGVhcnRiZWF0SW50ZXJ2YWwgPSBvcHRpb25zLmhlYXJ0YmVhdEludGVydmFsO1xuICBzZWxmLl9oZWFydGJlYXRUaW1lb3V0ID0gb3B0aW9ucy5oZWFydGJlYXRUaW1lb3V0O1xuXG4gIC8vIFRyYWNrcyBtZXRob2RzIHdoaWNoIHRoZSB1c2VyIGhhcyB0cmllZCB0byBjYWxsIGJ1dCB3aGljaCBoYXZlIG5vdCB5ZXRcbiAgLy8gY2FsbGVkIHRoZWlyIHVzZXIgY2FsbGJhY2sgKGllLCB0aGV5IGFyZSB3YWl0aW5nIG9uIHRoZWlyIHJlc3VsdCBvciBmb3IgYWxsXG4gIC8vIG9mIHRoZWlyIHdyaXRlcyB0byBiZSB3cml0dGVuIHRvIHRoZSBsb2NhbCBjYWNoZSkuIE1hcCBmcm9tIG1ldGhvZCBJRCB0b1xuICAvLyBNZXRob2RJbnZva2VyIG9iamVjdC5cbiAgc2VsZi5fbWV0aG9kSW52b2tlcnMgPSB7fTtcblxuICAvLyBUcmFja3MgbWV0aG9kcyB3aGljaCB0aGUgdXNlciBoYXMgY2FsbGVkIGJ1dCB3aG9zZSByZXN1bHQgbWVzc2FnZXMgaGF2ZSBub3RcbiAgLy8gYXJyaXZlZCB5ZXQuXG4gIC8vXG4gIC8vIF9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyBpcyBhbiBhcnJheSBvZiBibG9ja3Mgb2YgbWV0aG9kcy4gRWFjaCBibG9ja1xuICAvLyByZXByZXNlbnRzIGEgc2V0IG9mIG1ldGhvZHMgdGhhdCBjYW4gcnVuIGF0IHRoZSBzYW1lIHRpbWUuIFRoZSBmaXJzdCBibG9ja1xuICAvLyByZXByZXNlbnRzIHRoZSBtZXRob2RzIHdoaWNoIGFyZSBjdXJyZW50bHkgaW4gZmxpZ2h0OyBzdWJzZXF1ZW50IGJsb2Nrc1xuICAvLyBtdXN0IHdhaXQgZm9yIHByZXZpb3VzIGJsb2NrcyB0byBiZSBmdWxseSBmaW5pc2hlZCBiZWZvcmUgdGhleSBjYW4gYmUgc2VudFxuICAvLyB0byB0aGUgc2VydmVyLlxuICAvL1xuICAvLyBFYWNoIGJsb2NrIGlzIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAvLyAtIG1ldGhvZHM6IGEgbGlzdCBvZiBNZXRob2RJbnZva2VyIG9iamVjdHNcbiAgLy8gLSB3YWl0OiBhIGJvb2xlYW47IGlmIHRydWUsIHRoaXMgYmxvY2sgaGFkIGEgc2luZ2xlIG1ldGhvZCBpbnZva2VkIHdpdGhcbiAgLy8gICAgICAgICB0aGUgXCJ3YWl0XCIgb3B0aW9uXG4gIC8vXG4gIC8vIFRoZXJlIHdpbGwgbmV2ZXIgYmUgYWRqYWNlbnQgYmxvY2tzIHdpdGggd2FpdD1mYWxzZSwgYmVjYXVzZSB0aGUgb25seSB0aGluZ1xuICAvLyB0aGF0IG1ha2VzIG1ldGhvZHMgbmVlZCB0byBiZSBzZXJpYWxpemVkIGlzIGEgd2FpdCBtZXRob2QuXG4gIC8vXG4gIC8vIE1ldGhvZHMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgZmlyc3QgYmxvY2sgd2hlbiB0aGVpciBcInJlc3VsdFwiIGlzXG4gIC8vIHJlY2VpdmVkLiBUaGUgZW50aXJlIGZpcnN0IGJsb2NrIGlzIG9ubHkgcmVtb3ZlZCB3aGVuIGFsbCBvZiB0aGUgaW4tZmxpZ2h0XG4gIC8vIG1ldGhvZHMgaGF2ZSByZWNlaXZlZCB0aGVpciByZXN1bHRzIChzbyB0aGUgXCJtZXRob2RzXCIgbGlzdCBpcyBlbXB0eSkgKkFORCpcbiAgLy8gYWxsIG9mIHRoZSBkYXRhIHdyaXR0ZW4gYnkgdGhvc2UgbWV0aG9kcyBhcmUgdmlzaWJsZSBpbiB0aGUgbG9jYWwgY2FjaGUuIFNvXG4gIC8vIGl0IGlzIHBvc3NpYmxlIGZvciB0aGUgZmlyc3QgYmxvY2sncyBtZXRob2RzIGxpc3QgdG8gYmUgZW1wdHksIGlmIHdlIGFyZVxuICAvLyBzdGlsbCB3YWl0aW5nIGZvciBzb21lIG9iamVjdHMgdG8gcXVpZXNjZS5cbiAgLy9cbiAgLy8gRXhhbXBsZTpcbiAgLy8gIF9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyA9IFtcbiAgLy8gICAge3dhaXQ6IGZhbHNlLCBtZXRob2RzOiBbXX0sXG4gIC8vICAgIHt3YWl0OiB0cnVlLCBtZXRob2RzOiBbPE1ldGhvZEludm9rZXIgZm9yICdsb2dpbic+XX0sXG4gIC8vICAgIHt3YWl0OiBmYWxzZSwgbWV0aG9kczogWzxNZXRob2RJbnZva2VyIGZvciAnZm9vJz4sXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNZXRob2RJbnZva2VyIGZvciAnYmFyJz5dfV1cbiAgLy8gVGhpcyBtZWFucyB0aGF0IHRoZXJlIHdlcmUgc29tZSBtZXRob2RzIHdoaWNoIHdlcmUgc2VudCB0byB0aGUgc2VydmVyIGFuZFxuICAvLyB3aGljaCBoYXZlIHJldHVybmVkIHRoZWlyIHJlc3VsdHMsIGJ1dCBzb21lIG9mIHRoZSBkYXRhIHdyaXR0ZW4gYnlcbiAgLy8gdGhlIG1ldGhvZHMgbWF5IG5vdCBiZSB2aXNpYmxlIGluIHRoZSBsb2NhbCBjYWNoZS4gT25jZSBhbGwgdGhhdCBkYXRhIGlzXG4gIC8vIHZpc2libGUsIHdlIHdpbGwgc2VuZCBhICdsb2dpbicgbWV0aG9kLiBPbmNlIHRoZSBsb2dpbiBtZXRob2QgaGFzIHJldHVybmVkXG4gIC8vIGFuZCBhbGwgdGhlIGRhdGEgaXMgdmlzaWJsZSAoaW5jbHVkaW5nIHJlLXJ1bm5pbmcgc3VicyBpZiB1c2VySWQgY2hhbmdlcyksXG4gIC8vIHdlIHdpbGwgc2VuZCB0aGUgJ2ZvbycgYW5kICdiYXInIG1ldGhvZHMgaW4gcGFyYWxsZWwuXG4gIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzID0gW107XG5cbiAgLy8gbWV0aG9kIElEIC0+IGFycmF5IG9mIG9iamVjdHMgd2l0aCBrZXlzICdjb2xsZWN0aW9uJyBhbmQgJ2lkJywgbGlzdGluZ1xuICAvLyBkb2N1bWVudHMgd3JpdHRlbiBieSBhIGdpdmVuIG1ldGhvZCdzIHN0dWIuIGtleXMgYXJlIGFzc29jaWF0ZWQgd2l0aFxuICAvLyBtZXRob2RzIHdob3NlIHN0dWIgd3JvdGUgYXQgbGVhc3Qgb25lIGRvY3VtZW50LCBhbmQgd2hvc2UgZGF0YS1kb25lIG1lc3NhZ2VcbiAgLy8gaGFzIG5vdCB5ZXQgYmVlbiByZWNlaXZlZC5cbiAgc2VsZi5fZG9jdW1lbnRzV3JpdHRlbkJ5U3R1YiA9IHt9O1xuICAvLyBjb2xsZWN0aW9uIC0+IElkTWFwIG9mIFwic2VydmVyIGRvY3VtZW50XCIgb2JqZWN0LiBBIFwic2VydmVyIGRvY3VtZW50XCIgaGFzOlxuICAvLyAtIFwiZG9jdW1lbnRcIjogdGhlIHZlcnNpb24gb2YgdGhlIGRvY3VtZW50IGFjY29yZGluZyB0aGVcbiAgLy8gICBzZXJ2ZXIgKGllLCB0aGUgc25hcHNob3QgYmVmb3JlIGEgc3R1YiB3cm90ZSBpdCwgYW1lbmRlZCBieSBhbnkgY2hhbmdlc1xuICAvLyAgIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlcilcbiAgLy8gICBJdCBpcyB1bmRlZmluZWQgaWYgd2UgdGhpbmsgdGhlIGRvY3VtZW50IGRvZXMgbm90IGV4aXN0XG4gIC8vIC0gXCJ3cml0dGVuQnlTdHVic1wiOiBhIHNldCBvZiBtZXRob2QgSURzIHdob3NlIHN0dWJzIHdyb3RlIHRvIHRoZSBkb2N1bWVudFxuICAvLyAgIHdob3NlIFwiZGF0YSBkb25lXCIgbWVzc2FnZXMgaGF2ZSBub3QgeWV0IGJlZW4gcHJvY2Vzc2VkXG4gIHNlbGYuX3NlcnZlckRvY3VtZW50cyA9IHt9O1xuXG4gIC8vIEFycmF5IG9mIGNhbGxiYWNrcyB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG5leHQgdXBkYXRlIG9mIHRoZSBsb2NhbFxuICAvLyBjYWNoZS4gVXNlZCBmb3I6XG4gIC8vICAtIENhbGxpbmcgbWV0aG9kSW52b2tlci5kYXRhVmlzaWJsZSBhbmQgc3ViIHJlYWR5IGNhbGxiYWNrcyBhZnRlclxuICAvLyAgICB0aGUgcmVsZXZhbnQgZGF0YSBpcyBmbHVzaGVkLlxuICAvLyAgLSBJbnZva2luZyB0aGUgY2FsbGJhY2tzIG9mIFwiaGFsZi1maW5pc2hlZFwiIG1ldGhvZHMgYWZ0ZXIgcmVjb25uZWN0XG4gIC8vICAgIHF1aWVzY2VuY2UuIFNwZWNpZmljYWxseSwgbWV0aG9kcyB3aG9zZSByZXN1bHQgd2FzIHJlY2VpdmVkIG92ZXIgdGhlIG9sZFxuICAvLyAgICBjb25uZWN0aW9uIChzbyB3ZSBkb24ndCByZS1zZW5kIGl0KSBidXQgd2hvc2UgZGF0YSBoYWQgbm90IGJlZW4gbWFkZVxuICAvLyAgICB2aXNpYmxlLlxuICBzZWxmLl9hZnRlclVwZGF0ZUNhbGxiYWNrcyA9IFtdO1xuXG4gIC8vIEluIHR3byBjb250ZXh0cywgd2UgYnVmZmVyIGFsbCBpbmNvbWluZyBkYXRhIG1lc3NhZ2VzIGFuZCB0aGVuIHByb2Nlc3MgdGhlbVxuICAvLyBhbGwgYXQgb25jZSBpbiBhIHNpbmdsZSB1cGRhdGU6XG4gIC8vICAgLSBEdXJpbmcgcmVjb25uZWN0LCB3ZSBidWZmZXIgYWxsIGRhdGEgbWVzc2FnZXMgdW50aWwgYWxsIHN1YnMgdGhhdCBoYWRcbiAgLy8gICAgIGJlZW4gcmVhZHkgYmVmb3JlIHJlY29ubmVjdCBhcmUgcmVhZHkgYWdhaW4sIGFuZCBhbGwgbWV0aG9kcyB0aGF0IGFyZVxuICAvLyAgICAgYWN0aXZlIGhhdmUgcmV0dXJuZWQgdGhlaXIgXCJkYXRhIGRvbmUgbWVzc2FnZVwiOyB0aGVuXG4gIC8vICAgLSBEdXJpbmcgdGhlIGV4ZWN1dGlvbiBvZiBhIFwid2FpdFwiIG1ldGhvZCwgd2UgYnVmZmVyIGFsbCBkYXRhIG1lc3NhZ2VzXG4gIC8vICAgICB1bnRpbCB0aGUgd2FpdCBtZXRob2QgZ2V0cyBpdHMgXCJkYXRhIGRvbmVcIiBtZXNzYWdlLiAoSWYgdGhlIHdhaXQgbWV0aG9kXG4gIC8vICAgICBvY2N1cnMgZHVyaW5nIHJlY29ubmVjdCwgaXQgZG9lc24ndCBnZXQgYW55IHNwZWNpYWwgaGFuZGxpbmcuKVxuICAvLyBhbGwgZGF0YSBtZXNzYWdlcyBhcmUgcHJvY2Vzc2VkIGluIG9uZSB1cGRhdGUuXG4gIC8vXG4gIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIGFyZSB1c2VkIGZvciB0aGlzIFwicXVpZXNjZW5jZVwiIHByb2Nlc3MuXG5cbiAgLy8gVGhpcyBidWZmZXJzIHRoZSBtZXNzYWdlcyB0aGF0IGFyZW4ndCBiZWluZyBwcm9jZXNzZWQgeWV0LlxuICBzZWxmLl9tZXNzYWdlc0J1ZmZlcmVkVW50aWxRdWllc2NlbmNlID0gW107XG4gIC8vIE1hcCBmcm9tIG1ldGhvZCBJRCAtPiB0cnVlLiBNZXRob2RzIGFyZSByZW1vdmVkIGZyb20gdGhpcyB3aGVuIHRoZWlyXG4gIC8vIFwiZGF0YSBkb25lXCIgbWVzc2FnZSBpcyByZWNlaXZlZCwgYW5kIHdlIHdpbGwgbm90IHF1aWVzY2UgdW50aWwgaXQgaXNcbiAgLy8gZW1wdHkuXG4gIHNlbGYuX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UgPSB7fTtcbiAgLy8gbWFwIGZyb20gc3ViIElEIC0+IHRydWUgZm9yIHN1YnMgdGhhdCB3ZXJlIHJlYWR5IChpZSwgY2FsbGVkIHRoZSBzdWJcbiAgLy8gcmVhZHkgY2FsbGJhY2spIGJlZm9yZSByZWNvbm5lY3QgYnV0IGhhdmVuJ3QgYmVjb21lIHJlYWR5IGFnYWluIHlldFxuICBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkID0ge307IC8vIG1hcCBmcm9tIHN1Yi5faWQgLT4gdHJ1ZVxuICAvLyBpZiB0cnVlLCB0aGUgbmV4dCBkYXRhIHVwZGF0ZSBzaG91bGQgcmVzZXQgYWxsIHN0b3Jlcy4gKHNldCBkdXJpbmdcbiAgLy8gcmVjb25uZWN0LilcbiAgc2VsZi5fcmVzZXRTdG9yZXMgPSBmYWxzZTtcblxuICAvLyBuYW1lIC0+IGFycmF5IG9mIHVwZGF0ZXMgZm9yICh5ZXQgdG8gYmUgY3JlYXRlZCkgY29sbGVjdGlvbnNcbiAgc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXMgPSB7fTtcbiAgLy8gaWYgd2UncmUgYmxvY2tpbmcgYSBtaWdyYXRpb24sIHRoZSByZXRyeSBmdW5jXG4gIHNlbGYuX3JldHJ5TWlncmF0ZSA9IG51bGw7XG5cbiAgc2VsZi5fX2ZsdXNoQnVmZmVyZWRXcml0ZXMgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KFxuICAgIHNlbGYuX2ZsdXNoQnVmZmVyZWRXcml0ZXMsIFwiZmx1c2hpbmcgRERQIGJ1ZmZlcmVkIHdyaXRlc1wiLCBzZWxmKTtcbiAgLy8gQ29sbGVjdGlvbiBuYW1lIC0+IGFycmF5IG9mIG1lc3NhZ2VzLlxuICBzZWxmLl9idWZmZXJlZFdyaXRlcyA9IHt9O1xuICAvLyBXaGVuIGN1cnJlbnQgYnVmZmVyIG9mIHVwZGF0ZXMgbXVzdCBiZSBmbHVzaGVkIGF0LCBpbiBtcyB0aW1lc3RhbXAuXG4gIHNlbGYuX2J1ZmZlcmVkV3JpdGVzRmx1c2hBdCA9IG51bGw7XG4gIC8vIFRpbWVvdXQgaGFuZGxlIGZvciB0aGUgbmV4dCBwcm9jZXNzaW5nIG9mIGFsbCBwZW5kaW5nIHdyaXRlc1xuICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlID0gbnVsbDtcblxuICBzZWxmLl9idWZmZXJlZFdyaXRlc0ludGVydmFsID0gb3B0aW9ucy5idWZmZXJlZFdyaXRlc0ludGVydmFsO1xuICBzZWxmLl9idWZmZXJlZFdyaXRlc01heEFnZSA9IG9wdGlvbnMuYnVmZmVyZWRXcml0ZXNNYXhBZ2U7XG5cbiAgLy8gbWV0YWRhdGEgZm9yIHN1YnNjcmlwdGlvbnMuICBNYXAgZnJvbSBzdWIgSUQgdG8gb2JqZWN0IHdpdGgga2V5czpcbiAgLy8gICAtIGlkXG4gIC8vICAgLSBuYW1lXG4gIC8vICAgLSBwYXJhbXNcbiAgLy8gICAtIGluYWN0aXZlIChpZiB0cnVlLCB3aWxsIGJlIGNsZWFuZWQgdXAgaWYgbm90IHJldXNlZCBpbiByZS1ydW4pXG4gIC8vICAgLSByZWFkeSAoaGFzIHRoZSAncmVhZHknIG1lc3NhZ2UgYmVlbiByZWNlaXZlZD8pXG4gIC8vICAgLSByZWFkeUNhbGxiYWNrIChhbiBvcHRpb25hbCBjYWxsYmFjayB0byBjYWxsIHdoZW4gcmVhZHkpXG4gIC8vICAgLSBlcnJvckNhbGxiYWNrIChhbiBvcHRpb25hbCBjYWxsYmFjayB0byBjYWxsIGlmIHRoZSBzdWIgdGVybWluYXRlcyB3aXRoXG4gIC8vICAgICAgICAgICAgICAgICAgICBhbiBlcnJvciwgWFhYIENPTVBBVCBXSVRIIDEuMC4zLjEpXG4gIC8vICAgLSBzdG9wQ2FsbGJhY2sgKGFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgc3ViIHRlcm1pbmF0ZXNcbiAgLy8gICAgIGZvciBhbnkgcmVhc29uLCB3aXRoIGFuIGVycm9yIGFyZ3VtZW50IGlmIGFuIGVycm9yIHRyaWdnZXJlZCB0aGUgc3RvcClcbiAgc2VsZi5fc3Vic2NyaXB0aW9ucyA9IHt9O1xuXG4gIC8vIFJlYWN0aXZlIHVzZXJJZC5cbiAgc2VsZi5fdXNlcklkID0gbnVsbDtcbiAgc2VsZi5fdXNlcklkRGVwcyA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3k7XG5cbiAgLy8gQmxvY2sgYXV0by1yZWxvYWQgd2hpbGUgd2UncmUgd2FpdGluZyBmb3IgbWV0aG9kIHJlc3BvbnNlcy5cbiAgaWYgKE1ldGVvci5pc0NsaWVudCAmJiBQYWNrYWdlLnJlbG9hZCAmJiAhb3B0aW9ucy5yZWxvYWRXaXRoT3V0c3RhbmRpbmcpIHtcbiAgICBQYWNrYWdlLnJlbG9hZC5SZWxvYWQuX29uTWlncmF0ZShmdW5jdGlvbiAocmV0cnkpIHtcbiAgICAgIGlmICghc2VsZi5fcmVhZHlUb01pZ3JhdGUoKSkge1xuICAgICAgICBpZiAoc2VsZi5fcmV0cnlNaWdyYXRlKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlR3byBtaWdyYXRpb25zIGluIHByb2dyZXNzP1wiKTtcbiAgICAgICAgc2VsZi5fcmV0cnlNaWdyYXRlID0gcmV0cnk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbdHJ1ZV07XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgb25NZXNzYWdlID0gZnVuY3Rpb24gKHJhd19tc2cpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIG1zZyA9IEREUENvbW1vbi5wYXJzZUREUChyYXdfbXNnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRXhjZXB0aW9uIHdoaWxlIHBhcnNpbmcgRERQXCIsIGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFueSBtZXNzYWdlIGNvdW50cyBhcyByZWNlaXZpbmcgYSBwb25nLCBhcyBpdCBkZW1vbnN0cmF0ZXMgdGhhdFxuICAgIC8vIHRoZSBzZXJ2ZXIgaXMgc3RpbGwgYWxpdmUuXG4gICAgaWYgKHNlbGYuX2hlYXJ0YmVhdCkge1xuICAgICAgc2VsZi5faGVhcnRiZWF0Lm1lc3NhZ2VSZWNlaXZlZCgpO1xuICAgIH1cblxuICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgIC8vIFhYWCBDT01QQVQgV0lUSCAwLjYuNi4gaWdub3JlIHRoZSBvbGQgd2VsY29tZSBtZXNzYWdlIGZvciBiYWNrXG4gICAgICAvLyBjb21wYXQuICBSZW1vdmUgdGhpcyAnaWYnIG9uY2UgdGhlIHNlcnZlciBzdG9wcyBzZW5kaW5nIHdlbGNvbWVcbiAgICAgIC8vIG1lc3NhZ2VzIChzdHJlYW1fc2VydmVyLmpzKS5cbiAgICAgIGlmICghIChtc2cgJiYgbXNnLnNlcnZlcl9pZCkpXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJkaXNjYXJkaW5nIGludmFsaWQgbGl2ZWRhdGEgbWVzc2FnZVwiLCBtc2cpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChtc2cubXNnID09PSAnY29ubmVjdGVkJykge1xuICAgICAgc2VsZi5fdmVyc2lvbiA9IHNlbGYuX3ZlcnNpb25TdWdnZXN0aW9uO1xuICAgICAgc2VsZi5fbGl2ZWRhdGFfY29ubmVjdGVkKG1zZyk7XG4gICAgICBvcHRpb25zLm9uQ29ubmVjdGVkKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1zZy5tc2cgPT09ICdmYWlsZWQnKSB7XG4gICAgICBpZiAoXy5jb250YWlucyhzZWxmLl9zdXBwb3J0ZWRERFBWZXJzaW9ucywgbXNnLnZlcnNpb24pKSB7XG4gICAgICAgIHNlbGYuX3ZlcnNpb25TdWdnZXN0aW9uID0gbXNnLnZlcnNpb247XG4gICAgICAgIHNlbGYuX3N0cmVhbS5yZWNvbm5lY3Qoe19mb3JjZTogdHJ1ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID1cbiAgICAgICAgICAgICAgXCJERFAgdmVyc2lvbiBuZWdvdGlhdGlvbiBmYWlsZWQ7IHNlcnZlciByZXF1ZXN0ZWQgdmVyc2lvbiBcIiArIG1zZy52ZXJzaW9uO1xuICAgICAgICBzZWxmLl9zdHJlYW0uZGlzY29ubmVjdCh7X3Blcm1hbmVudDogdHJ1ZSwgX2Vycm9yOiBkZXNjcmlwdGlvbn0pO1xuICAgICAgICBvcHRpb25zLm9uRERQVmVyc2lvbk5lZ290aWF0aW9uRmFpbHVyZShkZXNjcmlwdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKG1zZy5tc2cgPT09ICdwaW5nJyAmJiBvcHRpb25zLnJlc3BvbmRUb1BpbmdzKSB7XG4gICAgICBzZWxmLl9zZW5kKHttc2c6IFwicG9uZ1wiLCBpZDogbXNnLmlkfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1zZy5tc2cgPT09ICdwb25nJykge1xuICAgICAgLy8gbm9vcCwgYXMgd2UgYXNzdW1lIGV2ZXJ5dGhpbmcncyBhIHBvbmdcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pbmNsdWRlKFsnYWRkZWQnLCAnY2hhbmdlZCcsICdyZW1vdmVkJywgJ3JlYWR5JywgJ3VwZGF0ZWQnXSwgbXNnLm1zZykpXG4gICAgICBzZWxmLl9saXZlZGF0YV9kYXRhKG1zZyk7XG4gICAgZWxzZSBpZiAobXNnLm1zZyA9PT0gJ25vc3ViJylcbiAgICAgIHNlbGYuX2xpdmVkYXRhX25vc3ViKG1zZyk7XG4gICAgZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3Jlc3VsdCcpXG4gICAgICBzZWxmLl9saXZlZGF0YV9yZXN1bHQobXNnKTtcbiAgICBlbHNlIGlmIChtc2cubXNnID09PSAnZXJyb3InKVxuICAgICAgc2VsZi5fbGl2ZWRhdGFfZXJyb3IobXNnKTtcbiAgICBlbHNlXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiZGlzY2FyZGluZyB1bmtub3duIGxpdmVkYXRhIG1lc3NhZ2UgdHlwZVwiLCBtc2cpO1xuICB9O1xuXG4gIHZhciBvblJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFNlbmQgYSBjb25uZWN0IG1lc3NhZ2UgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuICAgIC8vIE5PVEU6IHJlc2V0IGlzIGNhbGxlZCBldmVuIG9uIHRoZSBmaXJzdCBjb25uZWN0aW9uLCBzbyB0aGlzIGlzXG4gICAgLy8gdGhlIG9ubHkgcGxhY2Ugd2Ugc2VuZCB0aGlzIG1lc3NhZ2UuXG4gICAgdmFyIG1zZyA9IHttc2c6ICdjb25uZWN0J307XG4gICAgaWYgKHNlbGYuX2xhc3RTZXNzaW9uSWQpXG4gICAgICBtc2cuc2Vzc2lvbiA9IHNlbGYuX2xhc3RTZXNzaW9uSWQ7XG4gICAgbXNnLnZlcnNpb24gPSBzZWxmLl92ZXJzaW9uU3VnZ2VzdGlvbiB8fCBzZWxmLl9zdXBwb3J0ZWRERFBWZXJzaW9uc1swXTtcbiAgICBzZWxmLl92ZXJzaW9uU3VnZ2VzdGlvbiA9IG1zZy52ZXJzaW9uO1xuICAgIG1zZy5zdXBwb3J0ID0gc2VsZi5fc3VwcG9ydGVkRERQVmVyc2lvbnM7XG4gICAgc2VsZi5fc2VuZChtc2cpO1xuXG4gICAgLy8gTWFyayBub24tcmV0cnkgY2FsbHMgYXMgZmFpbGVkLiBUaGlzIGhhcyB0byBiZSBkb25lIGVhcmx5IGFzIGdldHRpbmcgdGhlc2UgbWV0aG9kcyBvdXQgb2YgdGhlXG4gICAgLy8gY3VycmVudCBibG9jayBpcyBwcmV0dHkgaW1wb3J0YW50IHRvIG1ha2luZyBzdXJlIHRoYXQgcXVpZXNjZW5jZSBpcyBwcm9wZXJseSBjYWxjdWxhdGVkLCBhc1xuICAgIC8vIHdlbGwgYXMgcG9zc2libHkgbW92aW5nIG9uIHRvIGFub3RoZXIgdXNlZnVsIGJsb2NrLlxuXG4gICAgLy8gT25seSBib3RoZXIgdGVzdGluZyBpZiB0aGVyZSBpcyBhbiBvdXRzdGFuZGluZ01ldGhvZEJsb2NrICh0aGVyZSBtaWdodCBub3QgYmUsIGVzcGVjaWFsbHkgaWZcbiAgICAvLyB3ZSBhcmUgY29ubmVjdGluZyBmb3IgdGhlIGZpcnN0IHRpbWUuXG4gICAgaWYgKHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGFuIG91dHN0YW5kaW5nIG1ldGhvZCBibG9jaywgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBmaXJzdCBvbmUgYXMgdGhhdCBpcyB0aGVcbiAgICAgIC8vIG9uZSB0aGF0IGNvdWxkIGhhdmUgYWxyZWFkeSBzZW50IG1lc3NhZ2VzIHdpdGggbm8gcmVzcG9uc2UsIHRoYXQgYXJlIG5vdCBhbGxvd2VkIHRvIHJldHJ5LlxuICAgICAgY29uc3QgY3VycmVudE1ldGhvZEJsb2NrID0gc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3NbMF0ubWV0aG9kcztcbiAgICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLm1ldGhvZHMgPSBjdXJyZW50TWV0aG9kQmxvY2suZmlsdGVyKChtZXRob2RJbnZva2VyKSA9PiB7XG5cbiAgICAgICAgLy8gTWV0aG9kcyB3aXRoICdub1JldHJ5JyBvcHRpb24gc2V0IGFyZSBub3QgYWxsb3dlZCB0byByZS1zZW5kIGFmdGVyXG4gICAgICAgIC8vIHJlY292ZXJpbmcgZHJvcHBlZCBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobWV0aG9kSW52b2tlci5zZW50TWVzc2FnZSAmJiBtZXRob2RJbnZva2VyLm5vUmV0cnkpIHtcbiAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgbWV0aG9kIGlzIHRvbGQgdGhhdCBpdCBmYWlsZWQuXG4gICAgICAgICAgbWV0aG9kSW52b2tlci5yZWNlaXZlUmVzdWx0KG5ldyBNZXRlb3IuRXJyb3IoJ2ludm9jYXRpb24tZmFpbGVkJyxcbiAgICAgICAgICAgICdNZXRob2QgaW52b2NhdGlvbiBtaWdodCBoYXZlIGZhaWxlZCBkdWUgdG8gZHJvcHBlZCBjb25uZWN0aW9uLiAnICtcbiAgICAgICAgICAgICdGYWlsaW5nIGJlY2F1c2UgYG5vUmV0cnlgIG9wdGlvbiB3YXMgcGFzc2VkIHRvIE1ldGVvci5hcHBseS4nKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGtlZXAgYSBtZXRob2QgaWYgaXQgd2Fzbid0IHNlbnQgb3IgaXQncyBhbGxvd2VkIHRvIHJldHJ5LlxuICAgICAgICAvLyBUaGlzIG1heSBsZWF2ZSB0aGUgYmxvY2sgZW1wdHksIGJ1dCB3ZSBkb24ndCBtb3ZlIG9uIHRvIHRoZSBuZXh0XG4gICAgICAgIC8vIGJsb2NrIHVudGlsIHRoZSBjYWxsYmFjayBoYXMgYmVlbiBkZWxpdmVyZWQsIGluIF9vdXRzdGFuZGluZ01ldGhvZEZpbmlzaGVkLlxuICAgICAgICByZXR1cm4gIShtZXRob2RJbnZva2VyLnNlbnRNZXNzYWdlICYmIG1ldGhvZEludm9rZXIubm9SZXRyeSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBOb3csIHRvIG1pbmltaXplIHNldHVwIGxhdGVuY3ksIGdvIGFoZWFkIGFuZCBibGFzdCBvdXQgYWxsIG9mXG4gICAgLy8gb3VyIHBlbmRpbmcgbWV0aG9kcyBhbmRzIHN1YnNjcmlwdGlvbnMgYmVmb3JlIHdlJ3ZlIGV2ZW4gdGFrZW5cbiAgICAvLyB0aGUgbmVjZXNzYXJ5IFJUVCB0byBrbm93IGlmIHdlIHN1Y2Nlc3NmdWxseSByZWNvbm5lY3RlZC4gKDEpXG4gICAgLy8gVGhleSdyZSBzdXBwb3NlZCB0byBiZSBpZGVtcG90ZW50LCBhbmQgd2hlcmUgdGhleSBhcmUgbm90LFxuICAgIC8vIHRoZXkgY2FuIGJsb2NrIHJldHJ5IGluIGFwcGx5OyAoMikgZXZlbiBpZiB3ZSBkaWQgcmVjb25uZWN0LFxuICAgIC8vIHdlJ3JlIG5vdCBzdXJlIHdoYXQgbWVzc2FnZXMgbWlnaHQgaGF2ZSBnb3R0ZW4gbG9zdFxuICAgIC8vIChpbiBlaXRoZXIgZGlyZWN0aW9uKSBzaW5jZSB3ZSB3ZXJlIGRpc2Nvbm5lY3RlZCAoVENQIGJlaW5nXG4gICAgLy8gc2xvcHB5IGFib3V0IHRoYXQuKVxuXG4gICAgLy8gSWYgdGhlIGN1cnJlbnQgYmxvY2sgb2YgbWV0aG9kcyBhbGwgZ290IHRoZWlyIHJlc3VsdHMgKGJ1dCBkaWRuJ3QgYWxsIGdldFxuICAgIC8vIHRoZWlyIGRhdGEgdmlzaWJsZSksIGRpc2NhcmQgdGhlIGVtcHR5IGJsb2NrIG5vdy5cbiAgICBpZiAoISBfLmlzRW1wdHkoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpICYmXG4gICAgICAgIF8uaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrc1swXS5tZXRob2RzKSkge1xuICAgICAgc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3Muc2hpZnQoKTtcbiAgICB9XG5cbiAgICAvLyBNYXJrIGFsbCBtZXNzYWdlcyBhcyB1bnNlbnQsIHRoZXkgaGF2ZSBub3QgeWV0IGJlZW4gc2VudCBvbiB0aGlzXG4gICAgLy8gY29ubmVjdGlvbi5cbiAgICBfLmVhY2goc2VsZi5fbWV0aG9kSW52b2tlcnMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICBtLnNlbnRNZXNzYWdlID0gZmFsc2U7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBhbiBgb25SZWNvbm5lY3RgIGhhbmRsZXIgaXMgc2V0LCBjYWxsIGl0IGZpcnN0LiBHbyB0aHJvdWdoXG4gICAgLy8gc29tZSBob29wcyB0byBlbnN1cmUgdGhhdCBtZXRob2RzIHRoYXQgYXJlIGNhbGxlZCBmcm9tIHdpdGhpblxuICAgIC8vIGBvblJlY29ubmVjdGAgZ2V0IGV4ZWN1dGVkIF9iZWZvcmVfIG9uZXMgdGhhdCB3ZXJlIG9yaWdpbmFsbHlcbiAgICAvLyBvdXRzdGFuZGluZyAoc2luY2UgYG9uUmVjb25uZWN0YCBpcyB1c2VkIHRvIHJlLWVzdGFibGlzaCBhdXRoXG4gICAgLy8gY2VydGlmaWNhdGVzKVxuICAgIHNlbGYuX2NhbGxPblJlY29ubmVjdEFuZFNlbmRBcHByb3ByaWF0ZU91dHN0YW5kaW5nTWV0aG9kcygpO1xuXG4gICAgLy8gYWRkIG5ldyBzdWJzY3JpcHRpb25zIGF0IHRoZSBlbmQuIHRoaXMgd2F5IHRoZXkgdGFrZSBlZmZlY3QgYWZ0ZXJcbiAgICAvLyB0aGUgaGFuZGxlcnMgYW5kIHdlIGRvbid0IHNlZSBmbGlja2VyLlxuICAgIF8uZWFjaChzZWxmLl9zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3ViLCBpZCkge1xuICAgICAgc2VsZi5fc2VuZCh7XG4gICAgICAgIG1zZzogJ3N1YicsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgbmFtZTogc3ViLm5hbWUsXG4gICAgICAgIHBhcmFtczogc3ViLnBhcmFtc1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIG9uRGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc2VsZi5faGVhcnRiZWF0KSB7XG4gICAgICBzZWxmLl9oZWFydGJlYXQuc3RvcCgpO1xuICAgICAgc2VsZi5faGVhcnRiZWF0ID0gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgIHNlbGYuX3N0cmVhbS5vbignbWVzc2FnZScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQob25NZXNzYWdlLCBcImhhbmRsaW5nIEREUCBtZXNzYWdlXCIpKTtcbiAgICBzZWxmLl9zdHJlYW0ub24oJ3Jlc2V0JywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChvblJlc2V0LCBcImhhbmRsaW5nIEREUCByZXNldFwiKSk7XG4gICAgc2VsZi5fc3RyZWFtLm9uKCdkaXNjb25uZWN0JywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChvbkRpc2Nvbm5lY3QsIFwiaGFuZGxpbmcgRERQIGRpc2Nvbm5lY3RcIikpO1xuICB9IGVsc2Uge1xuICAgIHNlbGYuX3N0cmVhbS5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgc2VsZi5fc3RyZWFtLm9uKCdyZXNldCcsIG9uUmVzZXQpO1xuICAgIHNlbGYuX3N0cmVhbS5vbignZGlzY29ubmVjdCcsIG9uRGlzY29ubmVjdCk7XG4gIH1cbn07XG5cbi8vIEEgTWV0aG9kSW52b2tlciBtYW5hZ2VzIHNlbmRpbmcgYSBtZXRob2QgdG8gdGhlIHNlcnZlciBhbmQgY2FsbGluZyB0aGUgdXNlcidzXG4vLyBjYWxsYmFja3MuIE9uIGNvbnN0cnVjdGlvbiwgaXQgcmVnaXN0ZXJzIGl0c2VsZiBpbiB0aGUgY29ubmVjdGlvbidzXG4vLyBfbWV0aG9kSW52b2tlcnMgbWFwOyBpdCByZW1vdmVzIGl0c2VsZiBvbmNlIHRoZSBtZXRob2QgaXMgZnVsbHkgZmluaXNoZWQgYW5kXG4vLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZC4gVGhpcyBvY2N1cnMgd2hlbiBpdCBoYXMgYm90aCByZWNlaXZlZCBhIHJlc3VsdCxcbi8vIGFuZCB0aGUgZGF0YSB3cml0dGVuIGJ5IGl0IGlzIGZ1bGx5IHZpc2libGUuXG52YXIgTWV0aG9kSW52b2tlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBQdWJsaWMgKHdpdGhpbiB0aGlzIGZpbGUpIGZpZWxkcy5cbiAgc2VsZi5tZXRob2RJZCA9IG9wdGlvbnMubWV0aG9kSWQ7XG4gIHNlbGYuc2VudE1lc3NhZ2UgPSBmYWxzZTtcblxuICBzZWxmLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG4gIHNlbGYuX2Nvbm5lY3Rpb24gPSBvcHRpb25zLmNvbm5lY3Rpb247XG4gIHNlbGYuX21lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2U7XG4gIHNlbGYuX29uUmVzdWx0UmVjZWl2ZWQgPSBvcHRpb25zLm9uUmVzdWx0UmVjZWl2ZWQgfHwgZnVuY3Rpb24gKCkge307XG4gIHNlbGYuX3dhaXQgPSBvcHRpb25zLndhaXQ7XG4gIHNlbGYubm9SZXRyeSA9IG9wdGlvbnMubm9SZXRyeTtcbiAgc2VsZi5fbWV0aG9kUmVzdWx0ID0gbnVsbDtcbiAgc2VsZi5fZGF0YVZpc2libGUgPSBmYWxzZTtcblxuICAvLyBSZWdpc3RlciB3aXRoIHRoZSBjb25uZWN0aW9uLlxuICBzZWxmLl9jb25uZWN0aW9uLl9tZXRob2RJbnZva2Vyc1tzZWxmLm1ldGhvZElkXSA9IHNlbGY7XG59O1xuXy5leHRlbmQoTWV0aG9kSW52b2tlci5wcm90b3R5cGUsIHtcbiAgLy8gU2VuZHMgdGhlIG1ldGhvZCBtZXNzYWdlIHRvIHRoZSBzZXJ2ZXIuIE1heSBiZSBjYWxsZWQgYWRkaXRpb25hbCB0aW1lcyBpZlxuICAvLyB3ZSBsb3NlIHRoZSBjb25uZWN0aW9uIGFuZCByZWNvbm5lY3QgYmVmb3JlIHJlY2VpdmluZyBhIHJlc3VsdC5cbiAgc2VuZE1lc3NhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYmVmb3JlIHNlbmRpbmcgYSBtZXRob2QgKGluY2x1ZGluZyByZXNlbmRpbmcgb25cbiAgICAvLyByZWNvbm5lY3QpLiBXZSBzaG91bGQgb25seSAocmUpc2VuZCBtZXRob2RzIHdoZXJlIHdlIGRvbid0IGFscmVhZHkgaGF2ZSBhXG4gICAgLy8gcmVzdWx0IVxuICAgIGlmIChzZWxmLmdvdFJlc3VsdCgpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2VuZGluZ01ldGhvZCBpcyBjYWxsZWQgb24gbWV0aG9kIHdpdGggcmVzdWx0XCIpO1xuXG5cbiAgICAvLyBJZiB3ZSdyZSByZS1zZW5kaW5nIGl0LCBpdCBkb2Vzbid0IG1hdHRlciBpZiBkYXRhIHdhcyB3cml0dGVuIHRoZSBmaXJzdFxuICAgIC8vIHRpbWUuXG4gICAgc2VsZi5fZGF0YVZpc2libGUgPSBmYWxzZTtcbiAgICBzZWxmLnNlbnRNZXNzYWdlID0gdHJ1ZTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSB3YWl0IG1ldGhvZCwgbWFrZSBhbGwgZGF0YSBtZXNzYWdlcyBiZSBidWZmZXJlZCB1bnRpbCBpdCBpc1xuICAgIC8vIGRvbmUuXG4gICAgaWYgKHNlbGYuX3dhaXQpXG4gICAgICBzZWxmLl9jb25uZWN0aW9uLl9tZXRob2RzQmxvY2tpbmdRdWllc2NlbmNlW3NlbGYubWV0aG9kSWRdID0gdHJ1ZTtcblxuICAgIC8vIEFjdHVhbGx5IHNlbmQgdGhlIG1lc3NhZ2UuXG4gICAgc2VsZi5fY29ubmVjdGlvbi5fc2VuZChzZWxmLl9tZXNzYWdlKTtcbiAgfSxcbiAgLy8gSW52b2tlIHRoZSBjYWxsYmFjaywgaWYgd2UgaGF2ZSBib3RoIGEgcmVzdWx0IGFuZCBrbm93IHRoYXQgYWxsIGRhdGEgaGFzXG4gIC8vIGJlZW4gd3JpdHRlbiB0byB0aGUgbG9jYWwgY2FjaGUuXG4gIF9tYXliZUludm9rZUNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9tZXRob2RSZXN1bHQgJiYgc2VsZi5fZGF0YVZpc2libGUpIHtcbiAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrLiAoVGhpcyB3b24ndCB0aHJvdzogdGhlIGNhbGxiYWNrIHdhcyB3cmFwcGVkIHdpdGhcbiAgICAgIC8vIGJpbmRFbnZpcm9ubWVudC4pXG4gICAgICBzZWxmLl9jYWxsYmFjayhzZWxmLl9tZXRob2RSZXN1bHRbMF0sIHNlbGYuX21ldGhvZFJlc3VsdFsxXSk7XG5cbiAgICAgIC8vIEZvcmdldCBhYm91dCB0aGlzIG1ldGhvZC5cbiAgICAgIGRlbGV0ZSBzZWxmLl9jb25uZWN0aW9uLl9tZXRob2RJbnZva2Vyc1tzZWxmLm1ldGhvZElkXTtcblxuICAgICAgLy8gTGV0IHRoZSBjb25uZWN0aW9uIGtub3cgdGhhdCB0aGlzIG1ldGhvZCBpcyBmaW5pc2hlZCwgc28gaXQgY2FuIHRyeSB0b1xuICAgICAgLy8gbW92ZSBvbiB0byB0aGUgbmV4dCBibG9jayBvZiBtZXRob2RzLlxuICAgICAgc2VsZi5fY29ubmVjdGlvbi5fb3V0c3RhbmRpbmdNZXRob2RGaW5pc2hlZCgpO1xuICAgIH1cbiAgfSxcbiAgLy8gQ2FsbCB3aXRoIHRoZSByZXN1bHQgb2YgdGhlIG1ldGhvZCBmcm9tIHRoZSBzZXJ2ZXIuIE9ubHkgbWF5IGJlIGNhbGxlZFxuICAvLyBvbmNlOyBvbmNlIGl0IGlzIGNhbGxlZCwgeW91IHNob3VsZCBub3QgY2FsbCBzZW5kTWVzc2FnZSBhZ2Fpbi5cbiAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYW4gb25SZXN1bHRSZWNlaXZlZCBjYWxsYmFjaywgY2FsbCBpdCBpbW1lZGlhdGVseS5cbiAgLy8gVGhlbiBpbnZva2UgdGhlIG1haW4gY2FsbGJhY2sgaWYgZGF0YSBpcyBhbHNvIHZpc2libGUuXG4gIHJlY2VpdmVSZXN1bHQ6IGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5nb3RSZXN1bHQoKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZHMgc2hvdWxkIG9ubHkgcmVjZWl2ZSByZXN1bHRzIG9uY2VcIik7XG4gICAgc2VsZi5fbWV0aG9kUmVzdWx0ID0gW2VyciwgcmVzdWx0XTtcbiAgICBzZWxmLl9vblJlc3VsdFJlY2VpdmVkKGVyciwgcmVzdWx0KTtcbiAgICBzZWxmLl9tYXliZUludm9rZUNhbGxiYWNrKCk7XG4gIH0sXG4gIC8vIENhbGwgdGhpcyB3aGVuIGFsbCBkYXRhIHdyaXR0ZW4gYnkgdGhlIG1ldGhvZCBpcyB2aXNpYmxlLiBUaGlzIG1lYW5zIHRoYXRcbiAgLy8gdGhlIG1ldGhvZCBoYXMgcmV0dXJucyBpdHMgXCJkYXRhIGlzIGRvbmVcIiBtZXNzYWdlICpBTkQqIGFsbCBzZXJ2ZXJcbiAgLy8gZG9jdW1lbnRzIHRoYXQgYXJlIGJ1ZmZlcmVkIGF0IHRoYXQgdGltZSBoYXZlIGJlZW4gd3JpdHRlbiB0byB0aGUgbG9jYWxcbiAgLy8gY2FjaGUuIEludm9rZXMgdGhlIG1haW4gY2FsbGJhY2sgaWYgdGhlIHJlc3VsdCBoYXMgYmVlbiByZWNlaXZlZC5cbiAgZGF0YVZpc2libGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fZGF0YVZpc2libGUgPSB0cnVlO1xuICAgIHNlbGYuX21heWJlSW52b2tlQ2FsbGJhY2soKTtcbiAgfSxcbiAgLy8gVHJ1ZSBpZiByZWNlaXZlUmVzdWx0IGhhcyBiZWVuIGNhbGxlZC5cbiAgZ290UmVzdWx0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiAhIXNlbGYuX21ldGhvZFJlc3VsdDtcbiAgfVxufSk7XG5cbl8uZXh0ZW5kKENvbm5lY3Rpb24ucHJvdG90eXBlLCB7XG4gIC8vICduYW1lJyBpcyB0aGUgbmFtZSBvZiB0aGUgZGF0YSBvbiB0aGUgd2lyZSB0aGF0IHNob3VsZCBnbyBpbiB0aGVcbiAgLy8gc3RvcmUuICd3cmFwcGVkU3RvcmUnIHNob3VsZCBiZSBhbiBvYmplY3Qgd2l0aCBtZXRob2RzIGJlZ2luVXBkYXRlLCB1cGRhdGUsXG4gIC8vIGVuZFVwZGF0ZSwgc2F2ZU9yaWdpbmFscywgcmV0cmlldmVPcmlnaW5hbHMuIHNlZSBDb2xsZWN0aW9uIGZvciBhbiBleGFtcGxlLlxuICByZWdpc3RlclN0b3JlOiBmdW5jdGlvbiAobmFtZSwgd3JhcHBlZFN0b3JlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKG5hbWUgaW4gc2VsZi5fc3RvcmVzKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gV3JhcCB0aGUgaW5wdXQgb2JqZWN0IGluIGFuIG9iamVjdCB3aGljaCBtYWtlcyBhbnkgc3RvcmUgbWV0aG9kIG5vdFxuICAgIC8vIGltcGxlbWVudGVkIGJ5ICdzdG9yZScgaW50byBhIG5vLW9wLlxuICAgIHZhciBzdG9yZSA9IHt9O1xuICAgIF8uZWFjaChbJ3VwZGF0ZScsICdiZWdpblVwZGF0ZScsICdlbmRVcGRhdGUnLCAnc2F2ZU9yaWdpbmFscycsXG4gICAgICAgICAgICAncmV0cmlldmVPcmlnaW5hbHMnLCAnZ2V0RG9jJyxcblx0XHRcdCdfZ2V0Q29sbGVjdGlvbiddLCBmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgICAgICAgIHN0b3JlW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh3cmFwcGVkU3RvcmVbbWV0aG9kXVxuICAgICAgICAgICAgICAgICAgICAgICAgPyB3cmFwcGVkU3RvcmVbbWV0aG9kXS5hcHBseSh3cmFwcGVkU3RvcmUsIGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgc2VsZi5fc3RvcmVzW25hbWVdID0gc3RvcmU7XG5cbiAgICB2YXIgcXVldWVkID0gc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXNbbmFtZV07XG4gICAgaWYgKHF1ZXVlZCkge1xuICAgICAgc3RvcmUuYmVnaW5VcGRhdGUocXVldWVkLmxlbmd0aCwgZmFsc2UpO1xuICAgICAgXy5lYWNoKHF1ZXVlZCwgZnVuY3Rpb24gKG1zZykge1xuICAgICAgICBzdG9yZS51cGRhdGUobXNnKTtcbiAgICAgIH0pO1xuICAgICAgc3RvcmUuZW5kVXBkYXRlKCk7XG4gICAgICBkZWxldGUgc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXNbbmFtZV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAc3VtbWFyeSBTdWJzY3JpYmUgdG8gYSByZWNvcmQgc2V0LiAgUmV0dXJucyBhIGhhbmRsZSB0aGF0IHByb3ZpZGVzXG4gICAqIGBzdG9wKClgIGFuZCBgcmVhZHkoKWAgbWV0aG9kcy5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBzdWJzY3JpcHRpb24uICBNYXRjaGVzIHRoZSBuYW1lIG9mIHRoZVxuICAgKiBzZXJ2ZXIncyBgcHVibGlzaCgpYCBjYWxsLlxuICAgKiBAcGFyYW0ge0VKU09OYWJsZX0gW2FyZzEsYXJnMi4uLl0gT3B0aW9uYWwgYXJndW1lbnRzIHBhc3NlZCB0byBwdWJsaXNoZXJcbiAgICogZnVuY3Rpb24gb24gc2VydmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdH0gW2NhbGxiYWNrc10gT3B0aW9uYWwuIE1heSBpbmNsdWRlIGBvblN0b3BgXG4gICAqIGFuZCBgb25SZWFkeWAgY2FsbGJhY2tzLiBJZiB0aGVyZSBpcyBhbiBlcnJvciwgaXQgaXMgcGFzc2VkIGFzIGFuXG4gICAqIGFyZ3VtZW50IHRvIGBvblN0b3BgLiBJZiBhIGZ1bmN0aW9uIGlzIHBhc3NlZCBpbnN0ZWFkIG9mIGFuIG9iamVjdCwgaXRcbiAgICogaXMgaW50ZXJwcmV0ZWQgYXMgYW4gYG9uUmVhZHlgIGNhbGxiYWNrLlxuICAgKi9cbiAgc3Vic2NyaWJlOiBmdW5jdGlvbiAobmFtZSAvKiAuLiBbYXJndW1lbnRzXSAuLiAoY2FsbGJhY2t8Y2FsbGJhY2tzKSAqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBwYXJhbXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHZhciBjYWxsYmFja3MgPSB7fTtcbiAgICBpZiAocGFyYW1zLmxlbmd0aCkge1xuICAgICAgdmFyIGxhc3RQYXJhbSA9IHBhcmFtc1twYXJhbXMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKGxhc3RQYXJhbSkpIHtcbiAgICAgICAgY2FsbGJhY2tzLm9uUmVhZHkgPSBwYXJhbXMucG9wKCk7XG4gICAgICB9IGVsc2UgaWYgKGxhc3RQYXJhbSAmJlxuICAgICAgICAvLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMSBvbkVycm9yIHVzZWQgdG8gZXhpc3QsIGJ1dCBub3cgd2UgdXNlXG4gICAgICAgIC8vIG9uU3RvcCB3aXRoIGFuIGVycm9yIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgICAgIF8uYW55KFtsYXN0UGFyYW0ub25SZWFkeSwgbGFzdFBhcmFtLm9uRXJyb3IsIGxhc3RQYXJhbS5vblN0b3BdLFxuICAgICAgICAgIF8uaXNGdW5jdGlvbikpIHtcbiAgICAgICAgY2FsbGJhY2tzID0gcGFyYW1zLnBvcCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElzIHRoZXJlIGFuIGV4aXN0aW5nIHN1YiB3aXRoIHRoZSBzYW1lIG5hbWUgYW5kIHBhcmFtLCBydW4gaW4gYW5cbiAgICAvLyBpbnZhbGlkYXRlZCBDb21wdXRhdGlvbj8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcmVydW5uaW5nIGFuXG4gICAgLy8gZXhpc3RpbmcgY29tcHV0YXRpb24uXG4gICAgLy9cbiAgICAvLyBGb3IgZXhhbXBsZSwgY29uc2lkZXIgYSByZXJ1biBvZjpcbiAgICAvL1xuICAgIC8vICAgICBUcmFja2VyLmF1dG9ydW4oZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgIE1ldGVvci5zdWJzY3JpYmUoXCJmb29cIiwgU2Vzc2lvbi5nZXQoXCJmb29cIikpO1xuICAgIC8vICAgICAgIE1ldGVvci5zdWJzY3JpYmUoXCJiYXJcIiwgU2Vzc2lvbi5nZXQoXCJiYXJcIikpO1xuICAgIC8vICAgICB9KTtcbiAgICAvL1xuICAgIC8vIElmIFwiZm9vXCIgaGFzIGNoYW5nZWQgYnV0IFwiYmFyXCIgaGFzIG5vdCwgd2Ugd2lsbCBtYXRjaCB0aGUgXCJiYXJcIlxuICAgIC8vIHN1YmNyaWJlIHRvIGFuIGV4aXN0aW5nIGluYWN0aXZlIHN1YnNjcmlwdGlvbiBpbiBvcmRlciB0byBub3RcbiAgICAvLyB1bnN1YiBhbmQgcmVzdWIgdGhlIHN1YnNjcmlwdGlvbiB1bm5lY2Vzc2FyaWx5LlxuICAgIC8vXG4gICAgLy8gV2Ugb25seSBsb29rIGZvciBvbmUgc3VjaCBzdWI7IGlmIHRoZXJlIGFyZSBOIGFwcGFyZW50bHktaWRlbnRpY2FsIHN1YnNcbiAgICAvLyBiZWluZyBpbnZhbGlkYXRlZCwgd2Ugd2lsbCByZXF1aXJlIE4gbWF0Y2hpbmcgc3Vic2NyaWJlIGNhbGxzIHRvIGtlZXBcbiAgICAvLyB0aGVtIGFsbCBhY3RpdmUuXG4gICAgdmFyIGV4aXN0aW5nID0gXy5maW5kKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWIpIHtcbiAgICAgIHJldHVybiBzdWIuaW5hY3RpdmUgJiYgc3ViLm5hbWUgPT09IG5hbWUgJiZcbiAgICAgICAgRUpTT04uZXF1YWxzKHN1Yi5wYXJhbXMsIHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICB2YXIgaWQ7XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBpZCA9IGV4aXN0aW5nLmlkO1xuICAgICAgZXhpc3RpbmcuaW5hY3RpdmUgPSBmYWxzZTsgLy8gcmVhY3RpdmF0ZVxuXG4gICAgICBpZiAoY2FsbGJhY2tzLm9uUmVhZHkpIHtcbiAgICAgICAgLy8gSWYgdGhlIHN1YiBpcyBub3QgYWxyZWFkeSByZWFkeSwgcmVwbGFjZSBhbnkgcmVhZHkgY2FsbGJhY2sgd2l0aCB0aGVcbiAgICAgICAgLy8gb25lIHByb3ZpZGVkIG5vdy4gKEl0J3Mgbm90IHJlYWxseSBjbGVhciB3aGF0IHVzZXJzIHdvdWxkIGV4cGVjdCBmb3JcbiAgICAgICAgLy8gYW4gb25SZWFkeSBjYWxsYmFjayBpbnNpZGUgYW4gYXV0b3J1bjsgdGhlIHNlbWFudGljcyB3ZSBwcm92aWRlIGlzXG4gICAgICAgIC8vIHRoYXQgYXQgdGhlIHRpbWUgdGhlIHN1YiBmaXJzdCBiZWNvbWVzIHJlYWR5LCB3ZSBjYWxsIHRoZSBsYXN0XG4gICAgICAgIC8vIG9uUmVhZHkgY2FsbGJhY2sgcHJvdmlkZWQsIGlmIGFueS4pXG4gICAgICAgIC8vIElmIHRoZSBzdWIgaXMgYWxyZWFkeSByZWFkeSwgcnVuIHRoZSByZWFkeSBjYWxsYmFjayByaWdodCBhd2F5LlxuICAgICAgICAvLyBJdCBzZWVtcyB0aGF0IHVzZXJzIHdvdWxkIGV4cGVjdCBhbiBvblJlYWR5IGNhbGxiYWNrIGluc2lkZSBhblxuICAgICAgICAvLyBhdXRvcnVuIHRvIHRyaWdnZXIgb25jZSB0aGUgdGhlIHN1YiBmaXJzdCBiZWNvbWVzIHJlYWR5IGFuZCBhbHNvXG4gICAgICAgIC8vIHdoZW4gcmUtc3VicyBoYXBwZW5zLlxuICAgICAgICBpZiAoZXhpc3RpbmcucmVhZHkpIHtcbiAgICAgICAgICBjYWxsYmFja3Mub25SZWFkeSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV4aXN0aW5nLnJlYWR5Q2FsbGJhY2sgPSBjYWxsYmFja3Mub25SZWFkeTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMSB3ZSB1c2VkIHRvIGhhdmUgb25FcnJvciBidXQgbm93IHdlIGNhbGxcbiAgICAgIC8vIG9uU3RvcCB3aXRoIGFuIG9wdGlvbmFsIGVycm9yIGFyZ3VtZW50XG4gICAgICBpZiAoY2FsbGJhY2tzLm9uRXJyb3IpIHtcbiAgICAgICAgLy8gUmVwbGFjZSBleGlzdGluZyBjYWxsYmFjayBpZiBhbnksIHNvIHRoYXQgZXJyb3JzIGFyZW4ndFxuICAgICAgICAvLyBkb3VibGUtcmVwb3J0ZWQuXG4gICAgICAgIGV4aXN0aW5nLmVycm9yQ2FsbGJhY2sgPSBjYWxsYmFja3Mub25FcnJvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbGxiYWNrcy5vblN0b3ApIHtcbiAgICAgICAgZXhpc3Rpbmcuc3RvcENhbGxiYWNrID0gY2FsbGJhY2tzLm9uU3RvcDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTmV3IHN1YiEgR2VuZXJhdGUgYW4gaWQsIHNhdmUgaXQgbG9jYWxseSwgYW5kIHNlbmQgbWVzc2FnZS5cbiAgICAgIGlkID0gUmFuZG9tLmlkKCk7XG4gICAgICBzZWxmLl9zdWJzY3JpcHRpb25zW2lkXSA9IHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBwYXJhbXM6IEVKU09OLmNsb25lKHBhcmFtcyksXG4gICAgICAgIGluYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgcmVhZHk6IGZhbHNlLFxuICAgICAgICByZWFkeURlcHM6IG5ldyBUcmFja2VyLkRlcGVuZGVuY3ksXG4gICAgICAgIHJlYWR5Q2FsbGJhY2s6IGNhbGxiYWNrcy5vblJlYWR5LFxuICAgICAgICAvLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMSAjZXJyb3JDYWxsYmFja1xuICAgICAgICBlcnJvckNhbGxiYWNrOiBjYWxsYmFja3Mub25FcnJvcixcbiAgICAgICAgc3RvcENhbGxiYWNrOiBjYWxsYmFja3Mub25TdG9wLFxuICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbm5lY3Rpb24uX3N1YnNjcmlwdGlvbnNbdGhpcy5pZF07XG4gICAgICAgICAgdGhpcy5yZWFkeSAmJiB0aGlzLnJlYWR5RGVwcy5jaGFuZ2VkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5fc2VuZCh7bXNnOiAndW5zdWInLCBpZDogaWR9KTtcbiAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5vblN0b3ApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5vblN0b3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBzZWxmLl9zZW5kKHttc2c6ICdzdWInLCBpZDogaWQsIG5hbWU6IG5hbWUsIHBhcmFtczogcGFyYW1zfSk7XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuIGEgaGFuZGxlIHRvIHRoZSBhcHBsaWNhdGlvbi5cbiAgICB2YXIgaGFuZGxlID0ge1xuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV8uaGFzKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGlkKSlcbiAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgc2VsZi5fc3Vic2NyaXB0aW9uc1tpZF0uc3RvcCgpO1xuICAgICAgfSxcbiAgICAgIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHJldHVybiBmYWxzZSBpZiB3ZSd2ZSB1bnN1YnNjcmliZWQuXG4gICAgICAgIGlmICghXy5oYXMoc2VsZi5fc3Vic2NyaXB0aW9ucywgaWQpKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIHJlY29yZCA9IHNlbGYuX3N1YnNjcmlwdGlvbnNbaWRdO1xuICAgICAgICByZWNvcmQucmVhZHlEZXBzLmRlcGVuZCgpO1xuICAgICAgICByZXR1cm4gcmVjb3JkLnJlYWR5O1xuICAgICAgfSxcbiAgICAgIHN1YnNjcmlwdGlvbklkOiBpZFxuICAgIH07XG5cbiAgICBpZiAoVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIC8vIFdlJ3JlIGluIGEgcmVhY3RpdmUgY29tcHV0YXRpb24sIHNvIHdlJ2QgbGlrZSB0byB1bnN1YnNjcmliZSB3aGVuIHRoZVxuICAgICAgLy8gY29tcHV0YXRpb24gaXMgaW52YWxpZGF0ZWQuLi4gYnV0IG5vdCBpZiB0aGUgcmVydW4ganVzdCByZS1zdWJzY3JpYmVzXG4gICAgICAvLyB0byB0aGUgc2FtZSBzdWJzY3JpcHRpb24hICBXaGVuIGEgcmVydW4gaGFwcGVucywgd2UgdXNlIG9uSW52YWxpZGF0ZVxuICAgICAgLy8gYXMgYSBjaGFuZ2UgdG8gbWFyayB0aGUgc3Vic2NyaXB0aW9uIFwiaW5hY3RpdmVcIiBzbyB0aGF0IGl0IGNhblxuICAgICAgLy8gYmUgcmV1c2VkIGZyb20gdGhlIHJlcnVuLiAgSWYgaXQgaXNuJ3QgcmV1c2VkLCBpdCdzIGtpbGxlZCBmcm9tXG4gICAgICAvLyBhbiBhZnRlckZsdXNoLlxuICAgICAgVHJhY2tlci5vbkludmFsaWRhdGUoZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgaWYgKF8uaGFzKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGlkKSlcbiAgICAgICAgICBzZWxmLl9zdWJzY3JpcHRpb25zW2lkXS5pbmFjdGl2ZSA9IHRydWU7XG5cbiAgICAgICAgVHJhY2tlci5hZnRlckZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoc2VsZi5fc3Vic2NyaXB0aW9ucywgaWQpICYmXG4gICAgICAgICAgICAgIHNlbGYuX3N1YnNjcmlwdGlvbnNbaWRdLmluYWN0aXZlKVxuICAgICAgICAgICAgaGFuZGxlLnN0b3AoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlO1xuICB9LFxuXG4gIC8vIG9wdGlvbnM6XG4gIC8vIC0gb25MYXRlRXJyb3Ige0Z1bmN0aW9uKGVycm9yKX0gY2FsbGVkIGlmIGFuIGVycm9yIHdhcyByZWNlaXZlZCBhZnRlciB0aGUgcmVhZHkgZXZlbnQuXG4gIC8vICAgICAoZXJyb3JzIHJlY2VpdmVkIGJlZm9yZSByZWFkeSBjYXVzZSBhbiBlcnJvciB0byBiZSB0aHJvd24pXG4gIF9zdWJzY3JpYmVBbmRXYWl0OiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZiA9IG5ldyBGdXR1cmUoKTtcbiAgICB2YXIgcmVhZHkgPSBmYWxzZTtcbiAgICB2YXIgaGFuZGxlO1xuICAgIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICAgIGFyZ3MucHVzaCh7XG4gICAgICBvblJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgZlsncmV0dXJuJ10oKTtcbiAgICAgIH0sXG4gICAgICBvbkVycm9yOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoIXJlYWR5KVxuICAgICAgICAgIGZbJ3Rocm93J10oZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBvcHRpb25zICYmIG9wdGlvbnMub25MYXRlRXJyb3IgJiYgb3B0aW9ucy5vbkxhdGVFcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGhhbmRsZSA9IHNlbGYuc3Vic2NyaWJlLmFwcGx5KHNlbGYsIFtuYW1lXS5jb25jYXQoYXJncykpO1xuICAgIGYud2FpdCgpO1xuICAgIHJldHVybiBoYW5kbGU7XG4gIH0sXG5cbiAgbWV0aG9kczogZnVuY3Rpb24gKG1ldGhvZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5lYWNoKG1ldGhvZHMsIGZ1bmN0aW9uIChmdW5jLCBuYW1lKSB7XG4gICAgICBpZiAodHlwZW9mIGZ1bmMgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCAnXCIgKyBuYW1lICsgXCInIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgIGlmIChzZWxmLl9tZXRob2RIYW5kbGVyc1tuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBtZXRob2QgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBpcyBhbHJlYWR5IGRlZmluZWRcIik7XG4gICAgICBzZWxmLl9tZXRob2RIYW5kbGVyc1tuYW1lXSA9IGZ1bmM7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAc3VtbWFyeSBJbnZva2VzIGEgbWV0aG9kIHBhc3NpbmcgYW55IG51bWJlciBvZiBhcmd1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAgICogQHBhcmFtIHtFSlNPTmFibGV9IFthcmcxLGFyZzIuLi5dIE9wdGlvbmFsIG1ldGhvZCBhcmd1bWVudHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2FzeW5jQ2FsbGJhY2tdIE9wdGlvbmFsIGNhbGxiYWNrLCB3aGljaCBpcyBjYWxsZWQgYXN5bmNocm9ub3VzbHkgd2l0aCB0aGUgZXJyb3Igb3IgcmVzdWx0IGFmdGVyIHRoZSBtZXRob2QgaXMgY29tcGxldGUuIElmIG5vdCBwcm92aWRlZCwgdGhlIG1ldGhvZCBydW5zIHN5bmNocm9ub3VzbHkgaWYgcG9zc2libGUgKHNlZSBiZWxvdykuXG4gICAqL1xuICBjYWxsOiBmdW5jdGlvbiAobmFtZSAvKiAuLiBbYXJndW1lbnRzXSAuLiBjYWxsYmFjayAqLykge1xuICAgIC8vIGlmIGl0J3MgYSBmdW5jdGlvbiwgdGhlIGxhc3QgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBjYWxsYmFjayxcbiAgICAvLyBub3QgYSBwYXJhbWV0ZXIgdG8gdGhlIHJlbW90ZSBtZXRob2QuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChhcmdzLmxlbmd0aCAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgIHJldHVybiB0aGlzLmFwcGx5KG5hbWUsIGFyZ3MsIGNhbGxiYWNrKTtcbiAgfSxcblxuICAvLyBAcGFyYW0gb3B0aW9ucyB7T3B0aW9uYWwgT2JqZWN0fVxuICAvLyAgIHdhaXQ6IEJvb2xlYW4gLSBTaG91bGQgd2Ugd2FpdCB0byBjYWxsIHRoaXMgdW50aWwgYWxsIGN1cnJlbnQgbWV0aG9kc1xuICAvLyAgICAgICAgICAgICAgICAgICBhcmUgZnVsbHkgZmluaXNoZWQsIGFuZCBibG9jayBzdWJzZXF1ZW50IG1ldGhvZCBjYWxsc1xuICAvLyAgICAgICAgICAgICAgICAgICB1bnRpbCB0aGlzIG1ldGhvZCBpcyBmdWxseSBmaW5pc2hlZD9cbiAgLy8gICAgICAgICAgICAgICAgICAgKGRvZXMgbm90IGFmZmVjdCBtZXRob2RzIGNhbGxlZCBmcm9tIHdpdGhpbiB0aGlzIG1ldGhvZClcbiAgLy8gICBvblJlc3VsdFJlY2VpdmVkOiBGdW5jdGlvbiAtIGEgY2FsbGJhY2sgdG8gY2FsbCBhcyBzb29uIGFzIHRoZSBtZXRob2RcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCBpcyByZWNlaXZlZC4gdGhlIGRhdGEgd3JpdHRlbiBieVxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG1ldGhvZCBtYXkgbm90IHlldCBiZSBpbiB0aGUgY2FjaGUhXG4gIC8vICAgcmV0dXJuU3R1YlZhbHVlOiBCb29sZWFuIC0gSWYgdHJ1ZSB0aGVuIGluIGNhc2VzIHdoZXJlIHdlIHdvdWxkIGhhdmVcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgZGlzY2FyZGVkIHRoZSBzdHViJ3MgcmV0dXJuIHZhbHVlXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kIHJldHVybmVkIHVuZGVmaW5lZCwgaW5zdGVhZCB3ZSBnbyBhaGVhZFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCByZXR1cm4gaXQuICBTcGVjaWZpY2FsbHksIHRoaXMgaXMgYW55XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZSBvdGhlciB0aGFuIHdoZW4gKGEpIHdlIGFyZSBhbHJlYWR5XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zaWRlIGEgc3R1YiBvciAoYikgd2UgYXJlIGluIE5vZGUgYW5kIG5vXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgd2FzIHByb3ZpZGVkLiAgQ3VycmVudGx5IHdlIHJlcXVpcmVcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzIGZsYWcgdG8gYmUgZXhwbGljaXRseSBwYXNzZWQgdG8gcmVkdWNlXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGxpa2VsaWhvb2QgdGhhdCBzdHViIHJldHVybiB2YWx1ZXMgd2lsbFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlIGNvbmZ1c2VkIHdpdGggc2VydmVyIHJldHVybiB2YWx1ZXM7IHdlXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF5IGltcHJvdmUgdGhpcyBpbiBmdXR1cmUuXG4gIC8vIEBwYXJhbSBjYWxsYmFjayB7T3B0aW9uYWwgRnVuY3Rpb259XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAc3VtbWFyeSBJbnZva2UgYSBtZXRob2QgcGFzc2luZyBhbiBhcnJheSBvZiBhcmd1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAgICogQHBhcmFtIHtFSlNPTmFibGVbXX0gYXJncyBNZXRob2QgYXJndW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLndhaXQgKENsaWVudCBvbmx5KSBJZiB0cnVlLCBkb24ndCBzZW5kIHRoaXMgbWV0aG9kIHVudGlsIGFsbCBwcmV2aW91cyBtZXRob2QgY2FsbHMgaGF2ZSBjb21wbGV0ZWQsIGFuZCBkb24ndCBzZW5kIGFueSBzdWJzZXF1ZW50IG1ldGhvZCBjYWxscyB1bnRpbCB0aGlzIG9uZSBpcyBjb21wbGV0ZWQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMub25SZXN1bHRSZWNlaXZlZCAoQ2xpZW50IG9ubHkpIFRoaXMgY2FsbGJhY2sgaXMgaW52b2tlZCB3aXRoIHRoZSBlcnJvciBvciByZXN1bHQgb2YgdGhlIG1ldGhvZCAoanVzdCBsaWtlIGBhc3luY0NhbGxiYWNrYCkgYXMgc29vbiBhcyB0aGUgZXJyb3Igb3IgcmVzdWx0IGlzIGF2YWlsYWJsZS4gVGhlIGxvY2FsIGNhY2hlIG1heSBub3QgeWV0IHJlZmxlY3QgdGhlIHdyaXRlcyBwZXJmb3JtZWQgYnkgdGhlIG1ldGhvZC5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm5vUmV0cnkgKENsaWVudCBvbmx5KSBpZiB0cnVlLCBkb24ndCBzZW5kIHRoaXMgbWV0aG9kIGFnYWluIG9uIHJlbG9hZCwgc2ltcGx5IGNhbGwgdGhlIGNhbGxiYWNrIGFuIGVycm9yIHdpdGggdGhlIGVycm9yIGNvZGUgJ2ludm9jYXRpb24tZmFpbGVkJy5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnRocm93U3R1YkV4Y2VwdGlvbnMgKENsaWVudCBvbmx5KSBJZiB0cnVlLCBleGNlcHRpb25zIHRocm93biBieSBtZXRob2Qgc3R1YnMgd2lsbCBiZSB0aHJvd24gaW5zdGVhZCBvZiBsb2dnZWQsIGFuZCB0aGUgbWV0aG9kIHdpbGwgbm90IGJlIGludm9rZWQgb24gdGhlIHNlcnZlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2FzeW5jQ2FsbGJhY2tdIE9wdGlvbmFsIGNhbGxiYWNrOyBzYW1lIHNlbWFudGljcyBhcyBpbiBbYE1ldGVvci5jYWxsYF0oI21ldGVvcl9jYWxsKS5cbiAgICovXG4gIGFwcGx5OiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBXZSB3ZXJlIHBhc3NlZCAzIGFyZ3VtZW50cy4gVGhleSBtYXkgYmUgZWl0aGVyIChuYW1lLCBhcmdzLCBvcHRpb25zKVxuICAgIC8vIG9yIChuYW1lLCBhcmdzLCBjYWxsYmFjaylcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAvLyBYWFggd291bGQgaXQgYmUgYmV0dGVyIGZvcm0gdG8gZG8gdGhlIGJpbmRpbmcgaW4gc3RyZWFtLm9uLFxuICAgICAgLy8gb3IgY2FsbGVyLCBpbnN0ZWFkIG9mIGhlcmU/XG4gICAgICAvLyBYWFggaW1wcm92ZSBlcnJvciBtZXNzYWdlIChhbmQgaG93IHdlIHJlcG9ydCBpdClcbiAgICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIFwiZGVsaXZlcmluZyByZXN1bHQgb2YgaW52b2tpbmcgJ1wiICsgbmFtZSArIFwiJ1wiXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEtlZXAgb3VyIGFyZ3Mgc2FmZSBmcm9tIG11dGF0aW9uIChlZyBpZiB3ZSBkb24ndCBzZW5kIHRoZSBtZXNzYWdlIGZvciBhXG4gICAgLy8gd2hpbGUgYmVjYXVzZSBvZiBhIHdhaXQgbWV0aG9kKS5cbiAgICBhcmdzID0gRUpTT04uY2xvbmUoYXJncyk7XG5cbiAgICAvLyBMYXppbHkgYWxsb2NhdGUgbWV0aG9kIElEIG9uY2Ugd2Uga25vdyB0aGF0IGl0J2xsIGJlIG5lZWRlZC5cbiAgICB2YXIgbWV0aG9kSWQgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGlkO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlkID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgaWQgPSAnJyArIChzZWxmLl9uZXh0TWV0aG9kSWQrKyk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICAgIH07XG4gICAgfSkoKTtcblxuICAgIHZhciBlbmNsb3NpbmcgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciBhbHJlYWR5SW5TaW11bGF0aW9uID0gZW5jbG9zaW5nICYmIGVuY2xvc2luZy5pc1NpbXVsYXRpb247XG5cbiAgICAvLyBMYXppbHkgZ2VuZXJhdGUgYSByYW5kb21TZWVkLCBvbmx5IGlmIGl0IGlzIHJlcXVlc3RlZCBieSB0aGUgc3R1Yi5cbiAgICAvLyBUaGUgcmFuZG9tIHN0cmVhbXMgb25seSBoYXZlIHV0aWxpdHkgaWYgdGhleSdyZSB1c2VkIG9uIGJvdGggdGhlIGNsaWVudFxuICAgIC8vIGFuZCB0aGUgc2VydmVyOyBpZiB0aGUgY2xpZW50IGRvZXNuJ3QgZ2VuZXJhdGUgYW55ICdyYW5kb20nIHZhbHVlc1xuICAgIC8vIHRoZW4gd2UgZG9uJ3QgZXhwZWN0IHRoZSBzZXJ2ZXIgdG8gZ2VuZXJhdGUgYW55IGVpdGhlci5cbiAgICAvLyBMZXNzIGNvbW1vbmx5LCB0aGUgc2VydmVyIG1heSBwZXJmb3JtIGRpZmZlcmVudCBhY3Rpb25zIGZyb20gdGhlIGNsaWVudCxcbiAgICAvLyBhbmQgbWF5IGluIGZhY3QgZ2VuZXJhdGUgdmFsdWVzIHdoZXJlIHRoZSBjbGllbnQgZGlkIG5vdCwgYnV0IHdlIGRvbid0XG4gICAgLy8gaGF2ZSBhbnkgY2xpZW50LXNpZGUgdmFsdWVzIHRvIG1hdGNoLCBzbyBldmVuIGhlcmUgd2UgbWF5IGFzIHdlbGwganVzdFxuICAgIC8vIHVzZSBhIHJhbmRvbSBzZWVkIG9uIHRoZSBzZXJ2ZXIuICBJbiB0aGF0IGNhc2UsIHdlIGRvbid0IHBhc3MgdGhlXG4gICAgLy8gcmFuZG9tU2VlZCB0byBzYXZlIGJhbmR3aWR0aCwgYW5kIHdlIGRvbid0IGV2ZW4gZ2VuZXJhdGUgaXQgdG8gc2F2ZSBhXG4gICAgLy8gYml0IG9mIENQVSBhbmQgdG8gYXZvaWQgY29uc3VtaW5nIGVudHJvcHkuXG4gICAgdmFyIHJhbmRvbVNlZWQgPSBudWxsO1xuICAgIHZhciByYW5kb21TZWVkR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHJhbmRvbVNlZWQgPT09IG51bGwpIHtcbiAgICAgICAgcmFuZG9tU2VlZCA9IEREUENvbW1vbi5tYWtlUnBjU2VlZChlbmNsb3NpbmcsIG5hbWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJhbmRvbVNlZWQ7XG4gICAgfTtcblxuICAgIC8vIFJ1biB0aGUgc3R1YiwgaWYgd2UgaGF2ZSBvbmUuIFRoZSBzdHViIGlzIHN1cHBvc2VkIHRvIG1ha2Ugc29tZVxuICAgIC8vIHRlbXBvcmFyeSB3cml0ZXMgdG8gdGhlIGRhdGFiYXNlIHRvIGdpdmUgdGhlIHVzZXIgYSBzbW9vdGggZXhwZXJpZW5jZVxuICAgIC8vIHVudGlsIHRoZSBhY3R1YWwgcmVzdWx0IG9mIGV4ZWN1dGluZyB0aGUgbWV0aG9kIGNvbWVzIGJhY2sgZnJvbSB0aGVcbiAgICAvLyBzZXJ2ZXIgKHdoZXJldXBvbiB0aGUgdGVtcG9yYXJ5IHdyaXRlcyB0byB0aGUgZGF0YWJhc2Ugd2lsbCBiZSByZXZlcnNlZFxuICAgIC8vIGR1cmluZyB0aGUgYmVnaW5VcGRhdGUvZW5kVXBkYXRlIHByb2Nlc3MuKVxuICAgIC8vXG4gICAgLy8gTm9ybWFsbHksIHdlIGlnbm9yZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBzdHViIChldmVuIGlmIGl0IGlzIGFuXG4gICAgLy8gZXhjZXB0aW9uKSwgaW4gZmF2b3Igb2YgdGhlIHJlYWwgcmV0dXJuIHZhbHVlIGZyb20gdGhlIHNlcnZlci4gVGhlXG4gICAgLy8gZXhjZXB0aW9uIGlzIGlmIHRoZSAqY2FsbGVyKiBpcyBhIHN0dWIuIEluIHRoYXQgY2FzZSwgd2UncmUgbm90IGdvaW5nXG4gICAgLy8gdG8gZG8gYSBSUEMsIHNvIHdlIHVzZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBzdHViIGFzIG91ciByZXR1cm5cbiAgICAvLyB2YWx1ZS5cblxuICAgIHZhciBzdHViID0gc2VsZi5fbWV0aG9kSGFuZGxlcnNbbmFtZV07XG4gICAgaWYgKHN0dWIpIHtcbiAgICAgIHZhciBzZXRVc2VySWQgPSBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgc2VsZi5zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBpbnZvY2F0aW9uID0gbmV3IEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uKHtcbiAgICAgICAgaXNTaW11bGF0aW9uOiB0cnVlLFxuICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkKCksXG4gICAgICAgIHNldFVzZXJJZDogc2V0VXNlcklkLFxuICAgICAgICByYW5kb21TZWVkOiBmdW5jdGlvbiAoKSB7IHJldHVybiByYW5kb21TZWVkR2VuZXJhdG9yKCk7IH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWFscmVhZHlJblNpbXVsYXRpb24pXG4gICAgICAgIHNlbGYuX3NhdmVPcmlnaW5hbHMoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTm90ZSB0aGF0IHVubGlrZSBpbiB0aGUgY29ycmVzcG9uZGluZyBzZXJ2ZXIgY29kZSwgd2UgbmV2ZXIgYXVkaXRcbiAgICAgICAgLy8gdGhhdCBzdHVicyBjaGVjaygpIHRoZWlyIGFyZ3VtZW50cy5cbiAgICAgICAgdmFyIHN0dWJSZXR1cm5WYWx1ZSA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKGludm9jYXRpb24sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICAgICAgICAvLyBCZWNhdXNlIHNhdmVPcmlnaW5hbHMgYW5kIHJldHJpZXZlT3JpZ2luYWxzIGFyZW4ndCByZWVudHJhbnQsXG4gICAgICAgICAgICAvLyBkb24ndCBhbGxvdyBzdHVicyB0byB5aWVsZC5cbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIC8vIHJlLWNsb25lLCBzbyB0aGF0IHRoZSBzdHViIGNhbid0IGFmZmVjdCBvdXIgY2FsbGVyJ3MgdmFsdWVzXG4gICAgICAgICAgICAgIHJldHVybiBzdHViLmFwcGx5KGludm9jYXRpb24sIEVKU09OLmNsb25lKGFyZ3MpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3R1Yi5hcHBseShpbnZvY2F0aW9uLCBFSlNPTi5jbG9uZShhcmdzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBleGNlcHRpb24gPSBlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFscmVhZHlJblNpbXVsYXRpb24pXG4gICAgICAgIHNlbGYuX3JldHJpZXZlQW5kU3RvcmVPcmlnaW5hbHMobWV0aG9kSWQoKSk7XG4gICAgfVxuXG4gICAgLy8gSWYgd2UncmUgaW4gYSBzaW11bGF0aW9uLCBzdG9wIGFuZCByZXR1cm4gdGhlIHJlc3VsdCB3ZSBoYXZlLFxuICAgIC8vIHJhdGhlciB0aGFuIGdvaW5nIG9uIHRvIGRvIGFuIFJQQy4gSWYgdGhlcmUgd2FzIG5vIHN0dWIsXG4gICAgLy8gd2UnbGwgZW5kIHVwIHJldHVybmluZyB1bmRlZmluZWQuXG4gICAgaWYgKGFscmVhZHlJblNpbXVsYXRpb24pIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhleGNlcHRpb24sIHN0dWJSZXR1cm5WYWx1ZSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAoZXhjZXB0aW9uKVxuICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICByZXR1cm4gc3R1YlJldHVyblZhbHVlO1xuICAgIH1cblxuICAgIC8vIElmIGFuIGV4Y2VwdGlvbiBvY2N1cnJlZCBpbiBhIHN0dWIsIGFuZCB3ZSdyZSBpZ25vcmluZyBpdFxuICAgIC8vIGJlY2F1c2Ugd2UncmUgZG9pbmcgYW4gUlBDIGFuZCB3YW50IHRvIHVzZSB3aGF0IHRoZSBzZXJ2ZXJcbiAgICAvLyByZXR1cm5zIGluc3RlYWQsIGxvZyBpdCBzbyB0aGUgZGV2ZWxvcGVyIGtub3dzXG4gICAgLy8gKHVubGVzcyB0aGV5IGV4cGxpY2l0bHkgYXNrIHRvIHNlZSB0aGUgZXJyb3IpLlxuICAgIC8vXG4gICAgLy8gVGVzdHMgY2FuIHNldCB0aGUgJ2V4cGVjdGVkJyBmbGFnIG9uIGFuIGV4Y2VwdGlvbiBzbyBpdCB3b24ndFxuICAgIC8vIGdvIHRvIGxvZy5cbiAgICBpZiAoZXhjZXB0aW9uKSB7XG4gICAgICBpZiAob3B0aW9ucy50aHJvd1N0dWJFeGNlcHRpb25zKSB7XG4gICAgICAgIHRocm93IGV4Y2VwdGlvbjtcbiAgICAgIH0gZWxzZSBpZiAoIWV4Y2VwdGlvbi5leHBlY3RlZCkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiRXhjZXB0aW9uIHdoaWxlIHNpbXVsYXRpbmcgdGhlIGVmZmVjdCBvZiBpbnZva2luZyAnXCIgK1xuICAgICAgICAgIG5hbWUgKyBcIidcIiwgZXhjZXB0aW9uLCBleGNlcHRpb24uc3RhY2spO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gQXQgdGhpcyBwb2ludCB3ZSdyZSBkZWZpbml0ZWx5IGRvaW5nIGFuIFJQQywgYW5kIHdlJ3JlIGdvaW5nIHRvXG4gICAgLy8gcmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgUlBDIHRvIHRoZSBjYWxsZXIuXG5cbiAgICAvLyBJZiB0aGUgY2FsbGVyIGRpZG4ndCBnaXZlIGEgY2FsbGJhY2ssIGRlY2lkZSB3aGF0IHRvIGRvLlxuICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgICAgLy8gT24gdGhlIGNsaWVudCwgd2UgZG9uJ3QgaGF2ZSBmaWJlcnMsIHNvIHdlIGNhbid0IGJsb2NrLiBUaGVcbiAgICAgICAgLy8gb25seSB0aGluZyB3ZSBjYW4gZG8gaXMgdG8gcmV0dXJuIHVuZGVmaW5lZCBhbmQgZGlzY2FyZCB0aGVcbiAgICAgICAgLy8gcmVzdWx0IG9mIHRoZSBSUEMuIElmIGFuIGVycm9yIG9jY3VycmVkIHRoZW4gcHJpbnQgdGhlIGVycm9yXG4gICAgICAgIC8vIHRvIHRoZSBjb25zb2xlLlxuICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBlcnIgJiYgTWV0ZW9yLl9kZWJ1ZyhcIkVycm9yIGludm9raW5nIE1ldGhvZCAnXCIgKyBuYW1lICsgXCInOlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9uIHRoZSBzZXJ2ZXIsIG1ha2UgdGhlIGZ1bmN0aW9uIHN5bmNocm9ub3VzLiBUaHJvdyBvblxuICAgICAgICAvLyBlcnJvcnMsIHJldHVybiBvbiBzdWNjZXNzLlxuICAgICAgICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgICAgICAgY2FsbGJhY2sgPSBmdXR1cmUucmVzb2x2ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gU2VuZCB0aGUgUlBDLiBOb3RlIHRoYXQgb24gdGhlIGNsaWVudCwgaXQgaXMgaW1wb3J0YW50IHRoYXQgdGhlXG4gICAgLy8gc3R1YiBoYXZlIGZpbmlzaGVkIGJlZm9yZSB3ZSBzZW5kIHRoZSBSUEMsIHNvIHRoYXQgd2Uga25vdyB3ZSBoYXZlXG4gICAgLy8gYSBjb21wbGV0ZSBsaXN0IG9mIHdoaWNoIGxvY2FsIGRvY3VtZW50cyB0aGUgc3R1YiB3cm90ZS5cbiAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgIG1zZzogJ21ldGhvZCcsXG4gICAgICBtZXRob2Q6IG5hbWUsXG4gICAgICBwYXJhbXM6IGFyZ3MsXG4gICAgICBpZDogbWV0aG9kSWQoKVxuICAgIH07XG5cbiAgICAvLyBTZW5kIHRoZSByYW5kb21TZWVkIG9ubHkgaWYgd2UgdXNlZCBpdFxuICAgIGlmIChyYW5kb21TZWVkICE9PSBudWxsKSB7XG4gICAgICBtZXNzYWdlLnJhbmRvbVNlZWQgPSByYW5kb21TZWVkO1xuICAgIH1cblxuICAgIHZhciBtZXRob2RJbnZva2VyID0gbmV3IE1ldGhvZEludm9rZXIoe1xuICAgICAgbWV0aG9kSWQ6IG1ldGhvZElkKCksXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgb25SZXN1bHRSZWNlaXZlZDogb3B0aW9ucy5vblJlc3VsdFJlY2VpdmVkLFxuICAgICAgd2FpdDogISFvcHRpb25zLndhaXQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgbm9SZXRyeTogISFvcHRpb25zLm5vUmV0cnlcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLndhaXQpIHtcbiAgICAgIC8vIEl0J3MgYSB3YWl0IG1ldGhvZCEgV2FpdCBtZXRob2RzIGdvIGluIHRoZWlyIG93biBibG9jay5cbiAgICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLnB1c2goXG4gICAgICAgIHt3YWl0OiB0cnVlLCBtZXRob2RzOiBbbWV0aG9kSW52b2tlcl19KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90IGEgd2FpdCBtZXRob2QuIFN0YXJ0IGEgbmV3IGJsb2NrIGlmIHRoZSBwcmV2aW91cyBibG9jayB3YXMgYSB3YWl0XG4gICAgICAvLyBibG9jaywgYW5kIGFkZCBpdCB0byB0aGUgbGFzdCBibG9jayBvZiBtZXRob2RzLlxuICAgICAgaWYgKF8uaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykgfHxcbiAgICAgICAgICBfLmxhc3Qoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpLndhaXQpXG4gICAgICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLnB1c2goe3dhaXQ6IGZhbHNlLCBtZXRob2RzOiBbXX0pO1xuICAgICAgXy5sYXN0KHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzKS5tZXRob2RzLnB1c2gobWV0aG9kSW52b2tlcik7XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgYWRkZWQgaXQgdG8gdGhlIGZpcnN0IGJsb2NrLCBzZW5kIGl0IG91dCBub3cuXG4gICAgaWYgKHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLmxlbmd0aCA9PT0gMSlcbiAgICAgIG1ldGhvZEludm9rZXIuc2VuZE1lc3NhZ2UoKTtcblxuICAgIC8vIElmIHdlJ3JlIHVzaW5nIHRoZSBkZWZhdWx0IGNhbGxiYWNrIG9uIHRoZSBzZXJ2ZXIsXG4gICAgLy8gYmxvY2sgd2FpdGluZyBmb3IgdGhlIHJlc3VsdC5cbiAgICBpZiAoZnV0dXJlKSB7XG4gICAgICByZXR1cm4gZnV0dXJlLndhaXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIG9wdGlvbnMucmV0dXJuU3R1YlZhbHVlID8gc3R1YlJldHVyblZhbHVlIDogdW5kZWZpbmVkO1xuICB9LFxuXG4gIC8vIEJlZm9yZSBjYWxsaW5nIGEgbWV0aG9kIHN0dWIsIHByZXBhcmUgYWxsIHN0b3JlcyB0byB0cmFjayBjaGFuZ2VzIGFuZCBhbGxvd1xuICAvLyBfcmV0cmlldmVBbmRTdG9yZU9yaWdpbmFscyB0byBnZXQgdGhlIG9yaWdpbmFsIHZlcnNpb25zIG9mIGNoYW5nZWRcbiAgLy8gZG9jdW1lbnRzLlxuICBfc2F2ZU9yaWdpbmFsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX3dhaXRpbmdGb3JRdWllc2NlbmNlKCkpXG4gICAgICBzZWxmLl9mbHVzaEJ1ZmZlcmVkV3JpdGVzKCk7XG4gICAgXy5lYWNoKHNlbGYuX3N0b3JlcywgZnVuY3Rpb24gKHMpIHtcbiAgICAgIHMuc2F2ZU9yaWdpbmFscygpO1xuICAgIH0pO1xuICB9LFxuICAvLyBSZXRyaWV2ZXMgdGhlIG9yaWdpbmFsIHZlcnNpb25zIG9mIGFsbCBkb2N1bWVudHMgbW9kaWZpZWQgYnkgdGhlIHN0dWIgZm9yXG4gIC8vIG1ldGhvZCAnbWV0aG9kSWQnIGZyb20gYWxsIHN0b3JlcyBhbmQgc2F2ZXMgdGhlbSB0byBfc2VydmVyRG9jdW1lbnRzIChrZXllZFxuICAvLyBieSBkb2N1bWVudCkgYW5kIF9kb2N1bWVudHNXcml0dGVuQnlTdHViIChrZXllZCBieSBtZXRob2QgSUQpLlxuICBfcmV0cmlldmVBbmRTdG9yZU9yaWdpbmFsczogZnVuY3Rpb24gKG1ldGhvZElkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9kb2N1bWVudHNXcml0dGVuQnlTdHViW21ldGhvZElkXSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkR1cGxpY2F0ZSBtZXRob2RJZCBpbiBfcmV0cmlldmVBbmRTdG9yZU9yaWdpbmFsc1wiKTtcblxuICAgIHZhciBkb2NzV3JpdHRlbiA9IFtdO1xuICAgIF8uZWFjaChzZWxmLl9zdG9yZXMsIGZ1bmN0aW9uIChzLCBjb2xsZWN0aW9uKSB7XG4gICAgICB2YXIgb3JpZ2luYWxzID0gcy5yZXRyaWV2ZU9yaWdpbmFscygpO1xuICAgICAgLy8gbm90IGFsbCBzdG9yZXMgZGVmaW5lIHJldHJpZXZlT3JpZ2luYWxzXG4gICAgICBpZiAoIW9yaWdpbmFscylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgb3JpZ2luYWxzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgZG9jc1dyaXR0ZW4ucHVzaCh7Y29sbGVjdGlvbjogY29sbGVjdGlvbiwgaWQ6IGlkfSk7XG4gICAgICAgIGlmICghXy5oYXMoc2VsZi5fc2VydmVyRG9jdW1lbnRzLCBjb2xsZWN0aW9uKSlcbiAgICAgICAgICBzZWxmLl9zZXJ2ZXJEb2N1bWVudHNbY29sbGVjdGlvbl0gPSBuZXcgTW9uZ29JRE1hcDtcbiAgICAgICAgdmFyIHNlcnZlckRvYyA9IHNlbGYuX3NlcnZlckRvY3VtZW50c1tjb2xsZWN0aW9uXS5zZXREZWZhdWx0KGlkLCB7fSk7XG4gICAgICAgIGlmIChzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMpIHtcbiAgICAgICAgICAvLyBXZSdyZSBub3QgdGhlIGZpcnN0IHN0dWIgdG8gd3JpdGUgdGhpcyBkb2MuIEp1c3QgYWRkIG91ciBtZXRob2QgSURcbiAgICAgICAgICAvLyB0byB0aGUgcmVjb3JkLlxuICAgICAgICAgIHNlcnZlckRvYy53cml0dGVuQnlTdHVic1ttZXRob2RJZF0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEZpcnN0IHN0dWIhIFNhdmUgdGhlIG9yaWdpbmFsIHZhbHVlIGFuZCBvdXIgbWV0aG9kIElELlxuICAgICAgICAgIHNlcnZlckRvYy5kb2N1bWVudCA9IGRvYztcbiAgICAgICAgICBzZXJ2ZXJEb2MuZmx1c2hDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMgPSB7fTtcbiAgICAgICAgICBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnNbbWV0aG9kSWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKCFfLmlzRW1wdHkoZG9jc1dyaXR0ZW4pKSB7XG4gICAgICBzZWxmLl9kb2N1bWVudHNXcml0dGVuQnlTdHViW21ldGhvZElkXSA9IGRvY3NXcml0dGVuO1xuICAgIH1cbiAgfSxcblxuICAvLyBUaGlzIGlzIHZlcnkgbXVjaCBhIHByaXZhdGUgZnVuY3Rpb24gd2UgdXNlIHRvIG1ha2UgdGhlIHRlc3RzXG4gIC8vIHRha2UgdXAgZmV3ZXIgc2VydmVyIHJlc291cmNlcyBhZnRlciB0aGV5IGNvbXBsZXRlLlxuICBfdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5lYWNoKF8uY2xvbmUoc2VsZi5fc3Vic2NyaXB0aW9ucyksIGZ1bmN0aW9uIChzdWIsIGlkKSB7XG4gICAgICAvLyBBdm9pZCBraWxsaW5nIHRoZSBhdXRvdXBkYXRlIHN1YnNjcmlwdGlvbiBzbyB0aGF0IGRldmVsb3BlcnNcbiAgICAgIC8vIHN0aWxsIGdldCBob3QgY29kZSBwdXNoZXMgd2hlbiB3cml0aW5nIHRlc3RzLlxuICAgICAgLy9cbiAgICAgIC8vIFhYWCBpdCdzIGEgaGFjayB0byBlbmNvZGUga25vd2xlZGdlIGFib3V0IGF1dG91cGRhdGUgaGVyZSxcbiAgICAgIC8vIGJ1dCBpdCBkb2Vzbid0IHNlZW0gd29ydGggaXQgeWV0IHRvIGhhdmUgYSBzcGVjaWFsIEFQSSBmb3JcbiAgICAgIC8vIHN1YnNjcmlwdGlvbnMgdG8gcHJlc2VydmUgYWZ0ZXIgdW5pdCB0ZXN0cy5cbiAgICAgIGlmIChzdWIubmFtZSAhPT0gJ21ldGVvcl9hdXRvdXBkYXRlX2NsaWVudFZlcnNpb25zJykge1xuICAgICAgICBzZWxmLl9zdWJzY3JpcHRpb25zW2lkXS5zdG9wKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2VuZHMgdGhlIEREUCBzdHJpbmdpZmljYXRpb24gb2YgdGhlIGdpdmVuIG1lc3NhZ2Ugb2JqZWN0XG4gIF9zZW5kOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3N0cmVhbS5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAob2JqKSk7XG4gIH0sXG5cbiAgLy8gV2UgZGV0ZWN0ZWQgdmlhIEREUC1sZXZlbCBoZWFydGJlYXRzIHRoYXQgd2UndmUgbG9zdCB0aGVcbiAgLy8gY29ubmVjdGlvbi4gIFVubGlrZSBgZGlzY29ubmVjdGAgb3IgYGNsb3NlYCwgYSBsb3N0IGNvbm5lY3Rpb25cbiAgLy8gd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJldHJpZWQuXG4gIF9sb3N0Q29ubmVjdGlvbjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3N0cmVhbS5fbG9zdENvbm5lY3Rpb24oZXJyb3IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBHZXQgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiBzdGF0dXMuIEEgcmVhY3RpdmUgZGF0YSBzb3VyY2UuXG4gICAqIEBsb2N1cyBDbGllbnRcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBzdGF0dXM6IGZ1bmN0aW9uICgvKnBhc3N0aHJvdWdoIGFyZ3MqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5fc3RyZWFtLnN0YXR1cy5hcHBseShzZWxmLl9zdHJlYW0sIGFyZ3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZvcmNlIGFuIGltbWVkaWF0ZSByZWNvbm5lY3Rpb24gYXR0ZW1wdCBpZiB0aGUgY2xpZW50IGlzIG5vdCBjb25uZWN0ZWQgdG8gdGhlIHNlcnZlci5cblxuICBUaGlzIG1ldGhvZCBkb2VzIG5vdGhpbmcgaWYgdGhlIGNsaWVudCBpcyBhbHJlYWR5IGNvbm5lY3RlZC5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIHJlY29ubmVjdDogZnVuY3Rpb24gKC8qcGFzc3Rocm91Z2ggYXJncyovKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9zdHJlYW0ucmVjb25uZWN0LmFwcGx5KHNlbGYuX3N0cmVhbSwgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRGlzY29ubmVjdCB0aGUgY2xpZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIGRpc2Nvbm5lY3Q6IGZ1bmN0aW9uICgvKnBhc3N0aHJvdWdoIGFyZ3MqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5fc3RyZWFtLmRpc2Nvbm5lY3QuYXBwbHkoc2VsZi5fc3RyZWFtLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9zdHJlYW0uZGlzY29ubmVjdCh7X3Blcm1hbmVudDogdHJ1ZX0pO1xuICB9LFxuXG4gIC8vL1xuICAvLy8gUmVhY3RpdmUgdXNlciBzeXN0ZW1cbiAgLy8vXG4gIHVzZXJJZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fdXNlcklkRGVwcylcbiAgICAgIHNlbGYuX3VzZXJJZERlcHMuZGVwZW5kKCk7XG4gICAgcmV0dXJuIHNlbGYuX3VzZXJJZDtcbiAgfSxcblxuICBzZXRVc2VySWQ6IGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gQXZvaWQgaW52YWxpZGF0aW5nIGRlcGVuZGVudHMgaWYgc2V0VXNlcklkIGlzIGNhbGxlZCB3aXRoIGN1cnJlbnQgdmFsdWUuXG4gICAgaWYgKHNlbGYuX3VzZXJJZCA9PT0gdXNlcklkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3VzZXJJZCA9IHVzZXJJZDtcbiAgICBpZiAoc2VsZi5fdXNlcklkRGVwcylcbiAgICAgIHNlbGYuX3VzZXJJZERlcHMuY2hhbmdlZCgpO1xuICB9LFxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB3ZSBhcmUgaW4gYSBzdGF0ZSBhZnRlciByZWNvbm5lY3Qgb2Ygd2FpdGluZyBmb3Igc3VicyB0byBiZVxuICAvLyByZXZpdmVkIG9yIGVhcmx5IG1ldGhvZHMgdG8gZmluaXNoIHRoZWlyIGRhdGEsIG9yIHdlIGFyZSB3YWl0aW5nIGZvciBhXG4gIC8vIFwid2FpdFwiIG1ldGhvZCB0byBmaW5pc2guXG4gIF93YWl0aW5nRm9yUXVpZXNjZW5jZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gKCEgXy5pc0VtcHR5KHNlbGYuX3N1YnNCZWluZ1Jldml2ZWQpIHx8XG4gICAgICAgICAgICAhIF8uaXNFbXB0eShzZWxmLl9tZXRob2RzQmxvY2tpbmdRdWllc2NlbmNlKSk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIGFueSBtZXRob2Qgd2hvc2UgbWVzc2FnZSBoYXMgYmVlbiBzZW50IHRvIHRoZSBzZXJ2ZXIgaGFzXG4gIC8vIG5vdCB5ZXQgaW52b2tlZCBpdHMgdXNlciBjYWxsYmFjay5cbiAgX2FueU1ldGhvZHNBcmVPdXRzdGFuZGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gXy5hbnkoXy5wbHVjayhzZWxmLl9tZXRob2RJbnZva2VycywgJ3NlbnRNZXNzYWdlJykpO1xuICB9LFxuXG4gIF9saXZlZGF0YV9jb25uZWN0ZWQ6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fdmVyc2lvbiAhPT0gJ3ByZTEnICYmIHNlbGYuX2hlYXJ0YmVhdEludGVydmFsICE9PSAwKSB7XG4gICAgICBzZWxmLl9oZWFydGJlYXQgPSBuZXcgRERQQ29tbW9uLkhlYXJ0YmVhdCh7XG4gICAgICAgIGhlYXJ0YmVhdEludGVydmFsOiBzZWxmLl9oZWFydGJlYXRJbnRlcnZhbCxcbiAgICAgICAgaGVhcnRiZWF0VGltZW91dDogc2VsZi5faGVhcnRiZWF0VGltZW91dCxcbiAgICAgICAgb25UaW1lb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5fbG9zdENvbm5lY3Rpb24oXG4gICAgICAgICAgICBuZXcgRERQLkNvbm5lY3Rpb25FcnJvcihcIkREUCBoZWFydGJlYXQgdGltZWQgb3V0XCIpKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VuZFBpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLl9zZW5kKHttc2c6ICdwaW5nJ30pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHNlbGYuX2hlYXJ0YmVhdC5zdGFydCgpO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgaXMgYSByZWNvbm5lY3QsIHdlJ2xsIGhhdmUgdG8gcmVzZXQgYWxsIHN0b3Jlcy5cbiAgICBpZiAoc2VsZi5fbGFzdFNlc3Npb25JZClcbiAgICAgIHNlbGYuX3Jlc2V0U3RvcmVzID0gdHJ1ZTtcblxuICAgIGlmICh0eXBlb2YgKG1zZy5zZXNzaW9uKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdmFyIHJlY29ubmVjdGVkVG9QcmV2aW91c1Nlc3Npb24gPSAoc2VsZi5fbGFzdFNlc3Npb25JZCA9PT0gbXNnLnNlc3Npb24pO1xuICAgICAgc2VsZi5fbGFzdFNlc3Npb25JZCA9IG1zZy5zZXNzaW9uO1xuICAgIH1cblxuICAgIGlmIChyZWNvbm5lY3RlZFRvUHJldmlvdXNTZXNzaW9uKSB7XG4gICAgICAvLyBTdWNjZXNzZnVsIHJlY29ubmVjdGlvbiAtLSBwaWNrIHVwIHdoZXJlIHdlIGxlZnQgb2ZmLiAgTm90ZSB0aGF0IHJpZ2h0XG4gICAgICAvLyBub3csIHRoaXMgbmV2ZXIgaGFwcGVuczogdGhlIHNlcnZlciBuZXZlciBjb25uZWN0cyB1cyB0byBhIHByZXZpb3VzXG4gICAgICAvLyBzZXNzaW9uLCBiZWNhdXNlIEREUCBkb2Vzbid0IHByb3ZpZGUgZW5vdWdoIGRhdGEgZm9yIHRoZSBzZXJ2ZXIgdG8ga25vd1xuICAgICAgLy8gd2hhdCBtZXNzYWdlcyB0aGUgY2xpZW50IGhhcyBwcm9jZXNzZWQuIFdlIG5lZWQgdG8gaW1wcm92ZSBERFAgdG8gbWFrZVxuICAgICAgLy8gdGhpcyBwb3NzaWJsZSwgYXQgd2hpY2ggcG9pbnQgd2UnbGwgcHJvYmFibHkgbmVlZCBtb3JlIGNvZGUgaGVyZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTZXJ2ZXIgZG9lc24ndCBoYXZlIG91ciBkYXRhIGFueSBtb3JlLiBSZS1zeW5jIGEgbmV3IHNlc3Npb24uXG5cbiAgICAvLyBGb3JnZXQgYWJvdXQgbWVzc2FnZXMgd2Ugd2VyZSBidWZmZXJpbmcgZm9yIHVua25vd24gY29sbGVjdGlvbnMuIFRoZXknbGxcbiAgICAvLyBiZSByZXNlbnQgaWYgc3RpbGwgcmVsZXZhbnQuXG4gICAgc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXMgPSB7fTtcblxuICAgIGlmIChzZWxmLl9yZXNldFN0b3Jlcykge1xuICAgICAgLy8gRm9yZ2V0IGFib3V0IHRoZSBlZmZlY3RzIG9mIHN0dWJzLiBXZSdsbCBiZSByZXNldHRpbmcgYWxsIGNvbGxlY3Rpb25zXG4gICAgICAvLyBhbnl3YXkuXG4gICAgICBzZWxmLl9kb2N1bWVudHNXcml0dGVuQnlTdHViID0ge307XG4gICAgICBzZWxmLl9zZXJ2ZXJEb2N1bWVudHMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBDbGVhciBfYWZ0ZXJVcGRhdGVDYWxsYmFja3MuXG4gICAgc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3MgPSBbXTtcblxuICAgIC8vIE1hcmsgYWxsIG5hbWVkIHN1YnNjcmlwdGlvbnMgd2hpY2ggYXJlIHJlYWR5IChpZSwgd2UgYWxyZWFkeSBjYWxsZWQgdGhlXG4gICAgLy8gcmVhZHkgY2FsbGJhY2spIGFzIG5lZWRpbmcgdG8gYmUgcmV2aXZlZC5cbiAgICAvLyBYWFggV2Ugc2hvdWxkIGFsc28gYmxvY2sgcmVjb25uZWN0IHF1aWVzY2VuY2UgdW50aWwgdW5uYW1lZCBzdWJzY3JpcHRpb25zXG4gICAgLy8gICAgIChlZywgYXV0b3B1Ymxpc2gpIGFyZSBkb25lIHJlLXB1Ymxpc2hpbmcgdG8gYXZvaWQgZmxpY2tlciFcbiAgICBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkID0ge307XG4gICAgXy5lYWNoKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWIsIGlkKSB7XG4gICAgICBpZiAoc3ViLnJlYWR5KVxuICAgICAgICBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkW2lkXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICAvLyBBcnJhbmdlIGZvciBcImhhbGYtZmluaXNoZWRcIiBtZXRob2RzIHRvIGhhdmUgdGhlaXIgY2FsbGJhY2tzIHJ1biwgYW5kXG4gICAgLy8gdHJhY2sgbWV0aG9kcyB0aGF0IHdlcmUgc2VudCBvbiB0aGlzIGNvbm5lY3Rpb24gc28gdGhhdCB3ZSBkb24ndFxuICAgIC8vIHF1aWVzY2UgdW50aWwgdGhleSBhcmUgYWxsIGRvbmUuXG4gICAgLy9cbiAgICAvLyBTdGFydCBieSBjbGVhcmluZyBfbWV0aG9kc0Jsb2NraW5nUXVpZXNjZW5jZTogbWV0aG9kcyBzZW50IGJlZm9yZVxuICAgIC8vIHJlY29ubmVjdCBkb24ndCBtYXR0ZXIsIGFuZCBhbnkgXCJ3YWl0XCIgbWV0aG9kcyBzZW50IG9uIHRoZSBuZXcgY29ubmVjdGlvblxuICAgIC8vIHRoYXQgd2UgZHJvcCBoZXJlIHdpbGwgYmUgcmVzdG9yZWQgYnkgdGhlIGxvb3AgYmVsb3cuXG4gICAgc2VsZi5fbWV0aG9kc0Jsb2NraW5nUXVpZXNjZW5jZSA9IHt9O1xuICAgIGlmIChzZWxmLl9yZXNldFN0b3Jlcykge1xuICAgICAgXy5lYWNoKHNlbGYuX21ldGhvZEludm9rZXJzLCBmdW5jdGlvbiAoaW52b2tlcikge1xuICAgICAgICBpZiAoaW52b2tlci5nb3RSZXN1bHQoKSkge1xuICAgICAgICAgIC8vIFRoaXMgbWV0aG9kIGFscmVhZHkgZ290IGl0cyByZXN1bHQsIGJ1dCBpdCBkaWRuJ3QgY2FsbCBpdHMgY2FsbGJhY2tcbiAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBkYXRhIGRpZG4ndCBiZWNvbWUgdmlzaWJsZS4gV2UgZGlkIG5vdCByZXNlbmQgdGhlXG4gICAgICAgICAgLy8gbWV0aG9kIFJQQy4gV2UnbGwgY2FsbCBpdHMgY2FsbGJhY2sgd2hlbiB3ZSBnZXQgYSBmdWxsIHF1aWVzY2UsXG4gICAgICAgICAgLy8gc2luY2UgdGhhdCdzIGFzIGNsb3NlIGFzIHdlJ2xsIGdldCB0byBcImRhdGEgbXVzdCBiZSB2aXNpYmxlXCIuXG4gICAgICAgICAgc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3MucHVzaChfLmJpbmQoaW52b2tlci5kYXRhVmlzaWJsZSwgaW52b2tlcikpO1xuICAgICAgICB9IGVsc2UgaWYgKGludm9rZXIuc2VudE1lc3NhZ2UpIHtcbiAgICAgICAgICAvLyBUaGlzIG1ldGhvZCBoYXMgYmVlbiBzZW50IG9uIHRoaXMgY29ubmVjdGlvbiAobWF5YmUgYXMgYSByZXNlbmRcbiAgICAgICAgICAvLyBmcm9tIHRoZSBsYXN0IGNvbm5lY3Rpb24sIG1heWJlIGZyb20gb25SZWNvbm5lY3QsIG1heWJlIGp1c3QgdmVyeVxuICAgICAgICAgIC8vIHF1aWNrbHkgYmVmb3JlIHByb2Nlc3NpbmcgdGhlIGNvbm5lY3RlZCBtZXNzYWdlKS5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55dGhpbmcgc3BlY2lhbCB0byBlbnN1cmUgaXRzIGNhbGxiYWNrcyBnZXRcbiAgICAgICAgICAvLyBjYWxsZWQsIGJ1dCB3ZSdsbCBjb3VudCBpdCBhcyBhIG1ldGhvZCB3aGljaCBpcyBwcmV2ZW50aW5nXG4gICAgICAgICAgLy8gcmVjb25uZWN0IHF1aWVzY2VuY2UuIChlZywgaXQgbWlnaHQgYmUgYSBsb2dpbiBtZXRob2QgdGhhdCB3YXMgcnVuXG4gICAgICAgICAgLy8gZnJvbSBvblJlY29ubmVjdCwgYW5kIHdlIGRvbid0IHdhbnQgdG8gc2VlIGZsaWNrZXIgYnkgc2VlaW5nIGFcbiAgICAgICAgICAvLyBsb2dnZWQtb3V0IHN0YXRlLilcbiAgICAgICAgICBzZWxmLl9tZXRob2RzQmxvY2tpbmdRdWllc2NlbmNlW2ludm9rZXIubWV0aG9kSWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZSA9IFtdO1xuXG4gICAgLy8gSWYgd2UncmUgbm90IHdhaXRpbmcgb24gYW55IG1ldGhvZHMgb3Igc3Vicywgd2UgY2FuIHJlc2V0IHRoZSBzdG9yZXMgYW5kXG4gICAgLy8gY2FsbCB0aGUgY2FsbGJhY2tzIGltbWVkaWF0ZWx5LlxuICAgIGlmICghc2VsZi5fd2FpdGluZ0ZvclF1aWVzY2VuY2UoKSkge1xuICAgICAgaWYgKHNlbGYuX3Jlc2V0U3RvcmVzKSB7XG4gICAgICAgIF8uZWFjaChzZWxmLl9zdG9yZXMsIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgcy5iZWdpblVwZGF0ZSgwLCB0cnVlKTtcbiAgICAgICAgICBzLmVuZFVwZGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi5fcmVzZXRTdG9yZXMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHNlbGYuX3J1bkFmdGVyVXBkYXRlQ2FsbGJhY2tzKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgX3Byb2Nlc3NPbmVEYXRhTWVzc2FnZTogZnVuY3Rpb24gKG1zZywgdXBkYXRlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBVc2luZyB1bmRlcnNjb3JlIGhlcmUgc28gYXMgbm90IHRvIG5lZWQgdG8gY2FwaXRhbGl6ZS5cbiAgICBzZWxmWydfcHJvY2Vzc18nICsgbXNnLm1zZ10obXNnLCB1cGRhdGVzKTtcbiAgfSxcblxuXG4gIF9saXZlZGF0YV9kYXRhOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3dhaXRpbmdGb3JRdWllc2NlbmNlKCkpIHtcbiAgICAgIHNlbGYuX21lc3NhZ2VzQnVmZmVyZWRVbnRpbFF1aWVzY2VuY2UucHVzaChtc2cpO1xuXG4gICAgICBpZiAobXNnLm1zZyA9PT0gXCJub3N1YlwiKVxuICAgICAgICBkZWxldGUgc2VsZi5fc3Vic0JlaW5nUmV2aXZlZFttc2cuaWRdO1xuXG4gICAgICBfLmVhY2gobXNnLnN1YnMgfHwgW10sIGZ1bmN0aW9uIChzdWJJZCkge1xuICAgICAgICBkZWxldGUgc2VsZi5fc3Vic0JlaW5nUmV2aXZlZFtzdWJJZF07XG4gICAgICB9KTtcbiAgICAgIF8uZWFjaChtc2cubWV0aG9kcyB8fCBbXSwgZnVuY3Rpb24gKG1ldGhvZElkKSB7XG4gICAgICAgIGRlbGV0ZSBzZWxmLl9tZXRob2RzQmxvY2tpbmdRdWllc2NlbmNlW21ldGhvZElkXTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoc2VsZi5fd2FpdGluZ0ZvclF1aWVzY2VuY2UoKSlcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBObyBtZXRob2RzIG9yIHN1YnMgYXJlIGJsb2NraW5nIHF1aWVzY2VuY2UhXG4gICAgICAvLyBXZSdsbCBub3cgcHJvY2VzcyBhbmQgYWxsIG9mIG91ciBidWZmZXJlZCBtZXNzYWdlcywgcmVzZXQgYWxsIHN0b3JlcyxcbiAgICAgIC8vIGFuZCBhcHBseSB0aGVtIGFsbCBhdCBvbmNlLlxuICAgICAgXy5lYWNoKHNlbGYuX21lc3NhZ2VzQnVmZmVyZWRVbnRpbFF1aWVzY2VuY2UsIGZ1bmN0aW9uIChidWZmZXJlZE1zZykge1xuICAgICAgICBzZWxmLl9wcm9jZXNzT25lRGF0YU1lc3NhZ2UoYnVmZmVyZWRNc2csIHNlbGYuX2J1ZmZlcmVkV3JpdGVzKTtcbiAgICAgIH0pO1xuICAgICAgc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLl9wcm9jZXNzT25lRGF0YU1lc3NhZ2UobXNnLCBzZWxmLl9idWZmZXJlZFdyaXRlcyk7XG4gICAgfVxuXG4gICAgLy8gSW1tZWRpYXRlbHkgZmx1c2ggd3JpdGVzIHdoZW46XG4gICAgLy8gIDEuIEJ1ZmZlcmluZyBpcyBkaXNhYmxlZC4gT3I7XG4gICAgLy8gIDIuIGFueSBub24tKGFkZGVkL2NoYW5nZWQvcmVtb3ZlZCkgbWVzc2FnZSBhcnJpdmVzLlxuICAgIHZhciBzdGFuZGFyZFdyaXRlID0gXy5pbmNsdWRlKFsnYWRkZWQnLCAnY2hhbmdlZCcsICdyZW1vdmVkJ10sIG1zZy5tc2cpO1xuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ludGVydmFsID09PSAwIHx8ICFzdGFuZGFyZFdyaXRlKSB7XG4gICAgICBzZWxmLl9mbHVzaEJ1ZmZlcmVkV3JpdGVzKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX2J1ZmZlcmVkV3JpdGVzRmx1c2hBdCA9PT0gbnVsbCkge1xuICAgICAgc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEF0ID0gbmV3IERhdGUoKS52YWx1ZU9mKCkgKyBzZWxmLl9idWZmZXJlZFdyaXRlc01heEFnZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEF0IDwgbmV3IERhdGUoKS52YWx1ZU9mKCkpIHtcbiAgICAgIHNlbGYuX2ZsdXNoQnVmZmVyZWRXcml0ZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEhhbmRsZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHNlbGYuX2J1ZmZlcmVkV3JpdGVzRmx1c2hIYW5kbGUpO1xuICAgIH1cbiAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlID0gc2V0VGltZW91dChzZWxmLl9fZmx1c2hCdWZmZXJlZFdyaXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzSW50ZXJ2YWwpO1xuICB9LFxuXG4gIF9mbHVzaEJ1ZmZlcmVkV3JpdGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEhhbmRsZSk7XG4gICAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlID0gbnVsbDtcbiAgICB9XG5cbiAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoQXQgPSBudWxsO1xuICAgIC8vIFdlIG5lZWQgdG8gY2xlYXIgdGhlIGJ1ZmZlciBiZWZvcmUgcGFzc2luZyBpdCB0b1xuICAgIC8vICBwZXJmb3JtV3JpdGVzLiBBcyB0aGVyZSdzIG5vIGd1YXJhbnRlZSB0aGF0IGl0XG4gICAgLy8gIHdpbGwgZXhpdCBjbGVhbmx5LlxuICAgIHZhciB3cml0ZXMgPSBzZWxmLl9idWZmZXJlZFdyaXRlcztcbiAgICBzZWxmLl9idWZmZXJlZFdyaXRlcyA9IHt9O1xuICAgIHNlbGYuX3BlcmZvcm1Xcml0ZXMod3JpdGVzKTtcbiAgfSxcblxuICBfcGVyZm9ybVdyaXRlczogZnVuY3Rpb24odXBkYXRlcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3Jlc2V0U3RvcmVzIHx8ICFfLmlzRW1wdHkodXBkYXRlcykpIHtcbiAgICAgIC8vIEJlZ2luIGEgdHJhbnNhY3Rpb25hbCB1cGRhdGUgb2YgZWFjaCBzdG9yZS5cbiAgICAgIF8uZWFjaChzZWxmLl9zdG9yZXMsIGZ1bmN0aW9uIChzLCBzdG9yZU5hbWUpIHtcbiAgICAgICAgcy5iZWdpblVwZGF0ZShfLmhhcyh1cGRhdGVzLCBzdG9yZU5hbWUpID8gdXBkYXRlc1tzdG9yZU5hbWVdLmxlbmd0aCA6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVzZXRTdG9yZXMpO1xuICAgICAgfSk7XG4gICAgICBzZWxmLl9yZXNldFN0b3JlcyA9IGZhbHNlO1xuXG4gICAgICBfLmVhY2godXBkYXRlcywgZnVuY3Rpb24gKHVwZGF0ZU1lc3NhZ2VzLCBzdG9yZU5hbWUpIHtcbiAgICAgICAgdmFyIHN0b3JlID0gc2VsZi5fc3RvcmVzW3N0b3JlTmFtZV07XG4gICAgICAgIGlmIChzdG9yZSkge1xuICAgICAgICAgIF8uZWFjaCh1cGRhdGVNZXNzYWdlcywgZnVuY3Rpb24gKHVwZGF0ZU1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHN0b3JlLnVwZGF0ZSh1cGRhdGVNZXNzYWdlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb2JvZHkncyBsaXN0ZW5pbmcgZm9yIHRoaXMgZGF0YS4gUXVldWUgaXQgdXAgdW50aWxcbiAgICAgICAgICAvLyBzb21lb25lIHdhbnRzIGl0LlxuICAgICAgICAgIC8vIFhYWCBtZW1vcnkgdXNlIHdpbGwgZ3JvdyB3aXRob3V0IGJvdW5kIGlmIHlvdSBmb3JnZXQgdG9cbiAgICAgICAgICAvLyBjcmVhdGUgYSBjb2xsZWN0aW9uIG9yIGp1c3QgZG9uJ3QgY2FyZSBhYm91dCBpdC4uLiBnb2luZ1xuICAgICAgICAgIC8vIHRvIGhhdmUgdG8gZG8gc29tZXRoaW5nIGFib3V0IHRoYXQuXG4gICAgICAgICAgaWYgKCFfLmhhcyhzZWxmLl91cGRhdGVzRm9yVW5rbm93blN0b3Jlcywgc3RvcmVOYW1lKSlcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZXNGb3JVbmtub3duU3RvcmVzW3N0b3JlTmFtZV0gPSBbXTtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShzZWxmLl91cGRhdGVzRm9yVW5rbm93blN0b3Jlc1tzdG9yZU5hbWVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZU1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEVuZCB1cGRhdGUgdHJhbnNhY3Rpb24uXG4gICAgICBfLmVhY2goc2VsZi5fc3RvcmVzLCBmdW5jdGlvbiAocykgeyBzLmVuZFVwZGF0ZSgpOyB9KTtcbiAgICB9XG5cbiAgICBzZWxmLl9ydW5BZnRlclVwZGF0ZUNhbGxiYWNrcygpO1xuICB9LFxuXG4gIC8vIENhbGwgYW55IGNhbGxiYWNrcyBkZWZlcnJlZCB3aXRoIF9ydW5XaGVuQWxsU2VydmVyRG9jc0FyZUZsdXNoZWQgd2hvc2VcbiAgLy8gcmVsZXZhbnQgZG9jcyBoYXZlIGJlZW4gZmx1c2hlZCwgYXMgd2VsbCBhcyBkYXRhVmlzaWJsZSBjYWxsYmFja3MgYXRcbiAgLy8gcmVjb25uZWN0LXF1aWVzY2VuY2UgdGltZS5cbiAgX3J1bkFmdGVyVXBkYXRlQ2FsbGJhY2tzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjYWxsYmFja3MgPSBzZWxmLl9hZnRlclVwZGF0ZUNhbGxiYWNrcztcbiAgICBzZWxmLl9hZnRlclVwZGF0ZUNhbGxiYWNrcyA9IFtdO1xuICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBjKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3B1c2hVcGRhdGU6IGZ1bmN0aW9uICh1cGRhdGVzLCBjb2xsZWN0aW9uLCBtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFfLmhhcyh1cGRhdGVzLCBjb2xsZWN0aW9uKSkge1xuICAgICAgdXBkYXRlc1tjb2xsZWN0aW9uXSA9IFtdO1xuICAgIH1cbiAgICB1cGRhdGVzW2NvbGxlY3Rpb25dLnB1c2gobXNnKTtcbiAgfSxcblxuICBfZ2V0U2VydmVyRG9jOiBmdW5jdGlvbiAoY29sbGVjdGlvbiwgaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFfLmhhcyhzZWxmLl9zZXJ2ZXJEb2N1bWVudHMsIGNvbGxlY3Rpb24pKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgdmFyIHNlcnZlckRvY3NGb3JDb2xsZWN0aW9uID0gc2VsZi5fc2VydmVyRG9jdW1lbnRzW2NvbGxlY3Rpb25dO1xuICAgIHJldHVybiBzZXJ2ZXJEb2NzRm9yQ29sbGVjdGlvbi5nZXQoaWQpIHx8IG51bGw7XG4gIH0sXG5cbiAgX3Byb2Nlc3NfYWRkZWQ6IGZ1bmN0aW9uIChtc2csIHVwZGF0ZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGlkID0gTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCk7XG4gICAgdmFyIHNlcnZlckRvYyA9IHNlbGYuX2dldFNlcnZlckRvYyhtc2cuY29sbGVjdGlvbiwgaWQpO1xuICAgIGlmIChzZXJ2ZXJEb2MpIHtcbiAgICAgIC8vIFNvbWUgb3V0c3RhbmRpbmcgc3R1YiB3cm90ZSBoZXJlLlxuICAgICAgdmFyIGlzRXhpc3RpbmcgPSAoc2VydmVyRG9jLmRvY3VtZW50ICE9PSB1bmRlZmluZWQpO1xuXG4gICAgICBzZXJ2ZXJEb2MuZG9jdW1lbnQgPSBtc2cuZmllbGRzIHx8IHt9O1xuICAgICAgc2VydmVyRG9jLmRvY3VtZW50Ll9pZCA9IGlkO1xuXG4gICAgICBpZiAoc2VsZi5fcmVzZXRTdG9yZXMpIHtcbiAgICAgICAgLy8gRHVyaW5nIHJlY29ubmVjdCB0aGUgc2VydmVyIGlzIHNlbmRpbmcgYWRkcyBmb3IgZXhpc3RpbmcgaWRzLlxuICAgICAgICAvLyBBbHdheXMgcHVzaCBhbiB1cGRhdGUgc28gdGhhdCBkb2N1bWVudCBzdGF5cyBpbiB0aGUgc3RvcmUgYWZ0ZXJcbiAgICAgICAgLy8gcmVzZXQuIFVzZSBjdXJyZW50IHZlcnNpb24gb2YgdGhlIGRvY3VtZW50IGZvciB0aGlzIHVwZGF0ZSwgc29cbiAgICAgICAgLy8gdGhhdCBzdHViLXdyaXR0ZW4gdmFsdWVzIGFyZSBwcmVzZXJ2ZWQuXG4gICAgICAgIHZhciBjdXJyZW50RG9jID0gc2VsZi5fc3RvcmVzW21zZy5jb2xsZWN0aW9uXS5nZXREb2MobXNnLmlkKTtcbiAgICAgICAgaWYgKGN1cnJlbnREb2MgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICBtc2cuZmllbGRzID0gY3VycmVudERvYztcblxuICAgICAgICBzZWxmLl9wdXNoVXBkYXRlKHVwZGF0ZXMsIG1zZy5jb2xsZWN0aW9uLCBtc2cpO1xuICAgICAgfSBlbHNlIGlmIChpc0V4aXN0aW5nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlcnZlciBzZW50IGFkZCBmb3IgZXhpc3RpbmcgaWQ6IFwiICsgbXNnLmlkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCBtc2cuY29sbGVjdGlvbiwgbXNnKTtcbiAgICB9XG4gIH0sXG5cbiAgX3Byb2Nlc3NfY2hhbmdlZDogZnVuY3Rpb24gKG1zZywgdXBkYXRlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2VydmVyRG9jID0gc2VsZi5fZ2V0U2VydmVyRG9jKFxuICAgICAgbXNnLmNvbGxlY3Rpb24sIE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpKTtcbiAgICBpZiAoc2VydmVyRG9jKSB7XG4gICAgICBpZiAoc2VydmVyRG9jLmRvY3VtZW50ID09PSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlcnZlciBzZW50IGNoYW5nZWQgZm9yIG5vbmV4aXN0aW5nIGlkOiBcIiArIG1zZy5pZCk7XG4gICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKHNlcnZlckRvYy5kb2N1bWVudCwgbXNnLmZpZWxkcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3B1c2hVcGRhdGUodXBkYXRlcywgbXNnLmNvbGxlY3Rpb24sIG1zZyk7XG4gICAgfVxuICB9LFxuXG4gIF9wcm9jZXNzX3JlbW92ZWQ6IGZ1bmN0aW9uIChtc2csIHVwZGF0ZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNlcnZlckRvYyA9IHNlbGYuX2dldFNlcnZlckRvYyhcbiAgICAgIG1zZy5jb2xsZWN0aW9uLCBNb25nb0lELmlkUGFyc2UobXNnLmlkKSk7XG4gICAgaWYgKHNlcnZlckRvYykge1xuICAgICAgLy8gU29tZSBvdXRzdGFuZGluZyBzdHViIHdyb3RlIGhlcmUuXG4gICAgICBpZiAoc2VydmVyRG9jLmRvY3VtZW50ID09PSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlcnZlciBzZW50IHJlbW92ZWQgZm9yIG5vbmV4aXN0aW5nIGlkOlwiICsgbXNnLmlkKTtcbiAgICAgIHNlcnZlckRvYy5kb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCBtc2cuY29sbGVjdGlvbiwge1xuICAgICAgICBtc2c6ICdyZW1vdmVkJyxcbiAgICAgICAgY29sbGVjdGlvbjogbXNnLmNvbGxlY3Rpb24sXG4gICAgICAgIGlkOiBtc2cuaWRcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfcHJvY2Vzc191cGRhdGVkOiBmdW5jdGlvbiAobXNnLCB1cGRhdGVzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFByb2Nlc3MgXCJtZXRob2QgZG9uZVwiIG1lc3NhZ2VzLlxuICAgIF8uZWFjaChtc2cubWV0aG9kcywgZnVuY3Rpb24gKG1ldGhvZElkKSB7XG4gICAgICBfLmVhY2goc2VsZi5fZG9jdW1lbnRzV3JpdHRlbkJ5U3R1YlttZXRob2RJZF0sIGZ1bmN0aW9uICh3cml0dGVuKSB7XG4gICAgICAgIHZhciBzZXJ2ZXJEb2MgPSBzZWxmLl9nZXRTZXJ2ZXJEb2Mod3JpdHRlbi5jb2xsZWN0aW9uLCB3cml0dGVuLmlkKTtcbiAgICAgICAgaWYgKCFzZXJ2ZXJEb2MpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTG9zdCBzZXJ2ZXJEb2MgZm9yIFwiICsgSlNPTi5zdHJpbmdpZnkod3JpdHRlbikpO1xuICAgICAgICBpZiAoIXNlcnZlckRvYy53cml0dGVuQnlTdHVic1ttZXRob2RJZF0pXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9jIFwiICsgSlNPTi5zdHJpbmdpZnkod3JpdHRlbikgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBub3Qgd3JpdHRlbiBieSAgbWV0aG9kIFwiICsgbWV0aG9kSWQpO1xuICAgICAgICBkZWxldGUgc2VydmVyRG9jLndyaXR0ZW5CeVN0dWJzW21ldGhvZElkXTtcbiAgICAgICAgaWYgKF8uaXNFbXB0eShzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMpKSB7XG4gICAgICAgICAgLy8gQWxsIG1ldGhvZHMgd2hvc2Ugc3R1YnMgd3JvdGUgdGhpcyBtZXRob2QgaGF2ZSBjb21wbGV0ZWQhIFdlIGNhblxuICAgICAgICAgIC8vIG5vdyBjb3B5IHRoZSBzYXZlZCBkb2N1bWVudCB0byB0aGUgZGF0YWJhc2UgKHJldmVydGluZyB0aGUgc3R1YidzXG4gICAgICAgICAgLy8gY2hhbmdlIGlmIHRoZSBzZXJ2ZXIgZGlkIG5vdCB3cml0ZSB0byB0aGlzIG9iamVjdCwgb3IgYXBwbHlpbmcgdGhlXG4gICAgICAgICAgLy8gc2VydmVyJ3Mgd3JpdGVzIGlmIGl0IGRpZCkuXG5cbiAgICAgICAgICAvLyBUaGlzIGlzIGEgZmFrZSBkZHAgJ3JlcGxhY2UnIG1lc3NhZ2UuICBJdCdzIGp1c3QgZm9yIHRhbGtpbmdcbiAgICAgICAgICAvLyBiZXR3ZWVuIGxpdmVkYXRhIGNvbm5lY3Rpb25zIGFuZCBtaW5pbW9uZ28uICAoV2UgaGF2ZSB0byBzdHJpbmdpZnlcbiAgICAgICAgICAvLyB0aGUgSUQgYmVjYXVzZSBpdCdzIHN1cHBvc2VkIHRvIGxvb2sgbGlrZSBhIHdpcmUgbWVzc2FnZS4pXG4gICAgICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCB3cml0dGVuLmNvbGxlY3Rpb24sIHtcbiAgICAgICAgICAgIG1zZzogJ3JlcGxhY2UnLFxuICAgICAgICAgICAgaWQ6IE1vbmdvSUQuaWRTdHJpbmdpZnkod3JpdHRlbi5pZCksXG4gICAgICAgICAgICByZXBsYWNlOiBzZXJ2ZXJEb2MuZG9jdW1lbnRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBDYWxsIGFsbCBmbHVzaCBjYWxsYmFja3MuXG4gICAgICAgICAgXy5lYWNoKHNlcnZlckRvYy5mbHVzaENhbGxiYWNrcywgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgIGMoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIERlbGV0ZSB0aGlzIGNvbXBsZXRlZCBzZXJ2ZXJEb2N1bWVudC4gRG9uJ3QgYm90aGVyIHRvIEdDIGVtcHR5XG4gICAgICAgICAgLy8gSWRNYXBzIGluc2lkZSBzZWxmLl9zZXJ2ZXJEb2N1bWVudHMsIHNpbmNlIHRoZXJlIHByb2JhYmx5IGFyZW4ndFxuICAgICAgICAgIC8vIG1hbnkgY29sbGVjdGlvbnMgYW5kIHRoZXknbGwgYmUgd3JpdHRlbiByZXBlYXRlZGx5LlxuICAgICAgICAgIHNlbGYuX3NlcnZlckRvY3VtZW50c1t3cml0dGVuLmNvbGxlY3Rpb25dLnJlbW92ZSh3cml0dGVuLmlkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBkZWxldGUgc2VsZi5fZG9jdW1lbnRzV3JpdHRlbkJ5U3R1YlttZXRob2RJZF07XG5cbiAgICAgIC8vIFdlIHdhbnQgdG8gY2FsbCB0aGUgZGF0YS13cml0dGVuIGNhbGxiYWNrLCBidXQgd2UgY2FuJ3QgZG8gc28gdW50aWwgYWxsXG4gICAgICAvLyBjdXJyZW50bHkgYnVmZmVyZWQgbWVzc2FnZXMgYXJlIGZsdXNoZWQuXG4gICAgICB2YXIgY2FsbGJhY2tJbnZva2VyID0gc2VsZi5fbWV0aG9kSW52b2tlcnNbbWV0aG9kSWRdO1xuICAgICAgaWYgKCFjYWxsYmFja0ludm9rZXIpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGNhbGxiYWNrIGludm9rZXIgZm9yIG1ldGhvZCBcIiArIG1ldGhvZElkKTtcbiAgICAgIHNlbGYuX3J1bldoZW5BbGxTZXJ2ZXJEb2NzQXJlRmx1c2hlZChcbiAgICAgICAgXy5iaW5kKGNhbGxiYWNrSW52b2tlci5kYXRhVmlzaWJsZSwgY2FsbGJhY2tJbnZva2VyKSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3Byb2Nlc3NfcmVhZHk6IGZ1bmN0aW9uIChtc2csIHVwZGF0ZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHJvY2VzcyBcInN1YiByZWFkeVwiIG1lc3NhZ2VzLiBcInN1YiByZWFkeVwiIG1lc3NhZ2VzIGRvbid0IHRha2UgZWZmZWN0XG4gICAgLy8gdW50aWwgYWxsIGN1cnJlbnQgc2VydmVyIGRvY3VtZW50cyBoYXZlIGJlZW4gZmx1c2hlZCB0byB0aGUgbG9jYWxcbiAgICAvLyBkYXRhYmFzZS4gV2UgY2FuIHVzZSBhIHdyaXRlIGZlbmNlIHRvIGltcGxlbWVudCB0aGlzLlxuICAgIF8uZWFjaChtc2cuc3VicywgZnVuY3Rpb24gKHN1YklkKSB7XG4gICAgICBzZWxmLl9ydW5XaGVuQWxsU2VydmVyRG9jc0FyZUZsdXNoZWQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3ViUmVjb3JkID0gc2VsZi5fc3Vic2NyaXB0aW9uc1tzdWJJZF07XG4gICAgICAgIC8vIERpZCB3ZSBhbHJlYWR5IHVuc3Vic2NyaWJlP1xuICAgICAgICBpZiAoIXN1YlJlY29yZClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIERpZCB3ZSBhbHJlYWR5IHJlY2VpdmUgYSByZWFkeSBtZXNzYWdlPyAoT29wcyEpXG4gICAgICAgIGlmIChzdWJSZWNvcmQucmVhZHkpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBzdWJSZWNvcmQucmVhZHkgPSB0cnVlO1xuICAgICAgICBzdWJSZWNvcmQucmVhZHlDYWxsYmFjayAmJiBzdWJSZWNvcmQucmVhZHlDYWxsYmFjaygpO1xuICAgICAgICBzdWJSZWNvcmQucmVhZHlEZXBzLmNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIEVuc3VyZXMgdGhhdCBcImZcIiB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbGwgZG9jdW1lbnRzIGN1cnJlbnRseSBpblxuICAvLyBfc2VydmVyRG9jdW1lbnRzIGhhdmUgYmVlbiB3cml0dGVuIHRvIHRoZSBsb2NhbCBjYWNoZS4gZiB3aWxsIG5vdCBiZSBjYWxsZWRcbiAgLy8gaWYgdGhlIGNvbm5lY3Rpb24gaXMgbG9zdCBiZWZvcmUgdGhlbiFcbiAgX3J1bldoZW5BbGxTZXJ2ZXJEb2NzQXJlRmx1c2hlZDogZnVuY3Rpb24gKGYpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJ1bkZBZnRlclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9hZnRlclVwZGF0ZUNhbGxiYWNrcy5wdXNoKGYpO1xuICAgIH07XG4gICAgdmFyIHVuZmx1c2hlZFNlcnZlckRvY0NvdW50ID0gMDtcbiAgICB2YXIgb25TZXJ2ZXJEb2NGbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC0tdW5mbHVzaGVkU2VydmVyRG9jQ291bnQ7XG4gICAgICBpZiAodW5mbHVzaGVkU2VydmVyRG9jQ291bnQgPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyB3YXMgdGhlIGxhc3QgZG9jIHRvIGZsdXNoISBBcnJhbmdlIHRvIHJ1biBmIGFmdGVyIHRoZSB1cGRhdGVzXG4gICAgICAgIC8vIGhhdmUgYmVlbiBhcHBsaWVkLlxuICAgICAgICBydW5GQWZ0ZXJVcGRhdGVzKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBfLmVhY2goc2VsZi5fc2VydmVyRG9jdW1lbnRzLCBmdW5jdGlvbiAoY29sbGVjdGlvbkRvY3MpIHtcbiAgICAgIGNvbGxlY3Rpb25Eb2NzLmZvckVhY2goZnVuY3Rpb24gKHNlcnZlckRvYykge1xuICAgICAgICB2YXIgd3JpdHRlbkJ5U3R1YkZvckFNZXRob2RXaXRoU2VudE1lc3NhZ2UgPSBfLmFueShcbiAgICAgICAgICBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMsIGZ1bmN0aW9uIChkdW1teSwgbWV0aG9kSWQpIHtcbiAgICAgICAgICAgIHZhciBpbnZva2VyID0gc2VsZi5fbWV0aG9kSW52b2tlcnNbbWV0aG9kSWRdO1xuICAgICAgICAgICAgcmV0dXJuIGludm9rZXIgJiYgaW52b2tlci5zZW50TWVzc2FnZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKHdyaXR0ZW5CeVN0dWJGb3JBTWV0aG9kV2l0aFNlbnRNZXNzYWdlKSB7XG4gICAgICAgICAgKyt1bmZsdXNoZWRTZXJ2ZXJEb2NDb3VudDtcbiAgICAgICAgICBzZXJ2ZXJEb2MuZmx1c2hDYWxsYmFja3MucHVzaChvblNlcnZlckRvY0ZsdXNoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHVuZmx1c2hlZFNlcnZlckRvY0NvdW50ID09PSAwKSB7XG4gICAgICAvLyBUaGVyZSBhcmVuJ3QgYW55IGJ1ZmZlcmVkIGRvY3MgLS0tIHdlIGNhbiBjYWxsIGYgYXMgc29vbiBhcyB0aGUgY3VycmVudFxuICAgICAgLy8gcm91bmQgb2YgdXBkYXRlcyBpcyBhcHBsaWVkIVxuICAgICAgcnVuRkFmdGVyVXBkYXRlcygpO1xuICAgIH1cbiAgfSxcblxuICBfbGl2ZWRhdGFfbm9zdWI6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBGaXJzdCBwYXNzIGl0IHRocm91Z2ggX2xpdmVkYXRhX2RhdGEsIHdoaWNoIG9ubHkgdXNlcyBpdCB0byBoZWxwIGdldFxuICAgIC8vIHRvd2FyZHMgcXVpZXNjZW5jZS5cbiAgICBzZWxmLl9saXZlZGF0YV9kYXRhKG1zZyk7XG5cbiAgICAvLyBEbyB0aGUgcmVzdCBvZiBvdXIgcHJvY2Vzc2luZyBpbW1lZGlhdGVseSwgd2l0aCBub1xuICAgIC8vIGJ1ZmZlcmluZy11bnRpbC1xdWllc2NlbmNlLlxuXG4gICAgLy8gd2Ugd2VyZW4ndCBzdWJiZWQgYW55d2F5LCBvciB3ZSBpbml0aWF0ZWQgdGhlIHVuc3ViLlxuICAgIGlmICghXy5oYXMoc2VsZi5fc3Vic2NyaXB0aW9ucywgbXNnLmlkKSlcbiAgICAgIHJldHVybjtcblxuICAgIC8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4xICNlcnJvckNhbGxiYWNrXG4gICAgdmFyIGVycm9yQ2FsbGJhY2sgPSBzZWxmLl9zdWJzY3JpcHRpb25zW21zZy5pZF0uZXJyb3JDYWxsYmFjaztcbiAgICB2YXIgc3RvcENhbGxiYWNrID0gc2VsZi5fc3Vic2NyaXB0aW9uc1ttc2cuaWRdLnN0b3BDYWxsYmFjaztcblxuICAgIHNlbGYuX3N1YnNjcmlwdGlvbnNbbXNnLmlkXS5yZW1vdmUoKTtcblxuICAgIHZhciBtZXRlb3JFcnJvckZyb21Nc2cgPSBmdW5jdGlvbiAobXNnQXJnKSB7XG4gICAgICByZXR1cm4gbXNnQXJnICYmIG1zZ0FyZy5lcnJvciAmJiBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICBtc2dBcmcuZXJyb3IuZXJyb3IsIG1zZ0FyZy5lcnJvci5yZWFzb24sIG1zZ0FyZy5lcnJvci5kZXRhaWxzKTtcbiAgICB9XG5cbiAgICAvLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMSAjZXJyb3JDYWxsYmFja1xuICAgIGlmIChlcnJvckNhbGxiYWNrICYmIG1zZy5lcnJvcikge1xuICAgICAgZXJyb3JDYWxsYmFjayhtZXRlb3JFcnJvckZyb21Nc2cobXNnKSk7XG4gICAgfVxuXG4gICAgaWYgKHN0b3BDYWxsYmFjaykge1xuICAgICAgc3RvcENhbGxiYWNrKG1ldGVvckVycm9yRnJvbU1zZyhtc2cpKTtcbiAgICB9XG4gIH0sXG5cbiAgX3Byb2Nlc3Nfbm9zdWI6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUaGlzIGlzIGNhbGxlZCBhcyBwYXJ0IG9mIHRoZSBcImJ1ZmZlciB1bnRpbCBxdWllc2NlbmNlXCIgcHJvY2VzcywgYnV0XG4gICAgLy8gbm9zdWIncyBlZmZlY3QgaXMgYWx3YXlzIGltbWVkaWF0ZS4gSXQgb25seSBnb2VzIGluIHRoZSBidWZmZXIgYXQgYWxsXG4gICAgLy8gYmVjYXVzZSBpdCdzIHBvc3NpYmxlIGZvciBhIG5vc3ViIHRvIGJlIHRoZSB0aGluZyB0aGF0IHRyaWdnZXJzXG4gICAgLy8gcXVpZXNjZW5jZSwgaWYgd2Ugd2VyZSB3YWl0aW5nIGZvciBhIHN1YiB0byBiZSByZXZpdmVkIGFuZCBpdCBkaWVzXG4gICAgLy8gaW5zdGVhZC5cbiAgfSxcblxuICBfbGl2ZWRhdGFfcmVzdWx0OiBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gaWQsIHJlc3VsdCBvciBlcnJvci4gZXJyb3IgaGFzIGVycm9yIChjb2RlKSwgcmVhc29uLCBkZXRhaWxzXG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBMZXRzIG1ha2Ugc3VyZSB0aGVyZSBhcmUgbm8gYnVmZmVyZWQgd3JpdGVzIGJlZm9yZSByZXR1cm5pbmcgcmVzdWx0LlxuICAgIGlmICghXy5pc0VtcHR5KHNlbGYuX2J1ZmZlcmVkV3JpdGVzKSkge1xuICAgICAgc2VsZi5fZmx1c2hCdWZmZXJlZFdyaXRlcygpO1xuICAgIH1cblxuICAgIC8vIGZpbmQgdGhlIG91dHN0YW5kaW5nIHJlcXVlc3RcbiAgICAvLyBzaG91bGQgYmUgTygxKSBpbiBuZWFybHkgYWxsIHJlYWxpc3RpYyB1c2UgY2FzZXNcbiAgICBpZiAoXy5pc0VtcHR5KHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzKSkge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIlJlY2VpdmVkIG1ldGhvZCByZXN1bHQgYnV0IG5vIG1ldGhvZHMgb3V0c3RhbmRpbmdcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBjdXJyZW50TWV0aG9kQmxvY2sgPSBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrc1swXS5tZXRob2RzO1xuICAgIHZhciBtO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3VycmVudE1ldGhvZEJsb2NrLmxlbmd0aDsgaSsrKSB7XG4gICAgICBtID0gY3VycmVudE1ldGhvZEJsb2NrW2ldO1xuICAgICAgaWYgKG0ubWV0aG9kSWQgPT09IG1zZy5pZClcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKCFtKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiQ2FuJ3QgbWF0Y2ggbWV0aG9kIHJlc3BvbnNlIHRvIG9yaWdpbmFsIG1ldGhvZCBjYWxsXCIsIG1zZyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGZyb20gY3VycmVudCBtZXRob2QgYmxvY2suIFRoaXMgbWF5IGxlYXZlIHRoZSBibG9jayBlbXB0eSwgYnV0IHdlXG4gICAgLy8gZG9uJ3QgbW92ZSBvbiB0byB0aGUgbmV4dCBibG9jayB1bnRpbCB0aGUgY2FsbGJhY2sgaGFzIGJlZW4gZGVsaXZlcmVkLCBpblxuICAgIC8vIF9vdXRzdGFuZGluZ01ldGhvZEZpbmlzaGVkLlxuICAgIGN1cnJlbnRNZXRob2RCbG9jay5zcGxpY2UoaSwgMSk7XG5cbiAgICBpZiAoXy5oYXMobXNnLCAnZXJyb3InKSkge1xuICAgICAgbS5yZWNlaXZlUmVzdWx0KG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgIG1zZy5lcnJvci5lcnJvciwgbXNnLmVycm9yLnJlYXNvbixcbiAgICAgICAgbXNnLmVycm9yLmRldGFpbHMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbXNnLnJlc3VsdCBtYXkgYmUgdW5kZWZpbmVkIGlmIHRoZSBtZXRob2QgZGlkbid0IHJldHVybiBhXG4gICAgICAvLyB2YWx1ZVxuICAgICAgbS5yZWNlaXZlUmVzdWx0KHVuZGVmaW5lZCwgbXNnLnJlc3VsdCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIENhbGxlZCBieSBNZXRob2RJbnZva2VyIGFmdGVyIGEgbWV0aG9kJ3MgY2FsbGJhY2sgaXMgaW52b2tlZC4gIElmIHRoaXMgd2FzXG4gIC8vIHRoZSBsYXN0IG91dHN0YW5kaW5nIG1ldGhvZCBpbiB0aGUgY3VycmVudCBibG9jaywgcnVucyB0aGUgbmV4dCBibG9jay4gSWZcbiAgLy8gdGhlcmUgYXJlIG5vIG1vcmUgbWV0aG9kcywgY29uc2lkZXIgYWNjZXB0aW5nIGEgaG90IGNvZGUgcHVzaC5cbiAgX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2FueU1ldGhvZHNBcmVPdXRzdGFuZGluZygpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gTm8gbWV0aG9kcyBhcmUgb3V0c3RhbmRpbmcuIFRoaXMgc2hvdWxkIG1lYW4gdGhhdCB0aGUgZmlyc3QgYmxvY2sgb2ZcbiAgICAvLyBtZXRob2RzIGlzIGVtcHR5LiAoT3IgaXQgbWlnaHQgbm90IGV4aXN0LCBpZiB0aGlzIHdhcyBhIG1ldGhvZCB0aGF0XG4gICAgLy8gaGFsZi1maW5pc2hlZCBiZWZvcmUgZGlzY29ubmVjdC9yZWNvbm5lY3QuKVxuICAgIGlmICghIF8uaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpIHtcbiAgICAgIHZhciBmaXJzdEJsb2NrID0gc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3Muc2hpZnQoKTtcbiAgICAgIGlmICghIF8uaXNFbXB0eShmaXJzdEJsb2NrLm1ldGhvZHMpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBtZXRob2RzIG91dHN0YW5kaW5nIGJ1dCBub25lbXB0eSBibG9jazogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZmlyc3RCbG9jaykpO1xuXG4gICAgICAvLyBTZW5kIHRoZSBvdXRzdGFuZGluZyBtZXRob2RzIG5vdyBpbiB0aGUgZmlyc3QgYmxvY2suXG4gICAgICBpZiAoIV8uaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpXG4gICAgICAgIHNlbGYuX3NlbmRPdXRzdGFuZGluZ01ldGhvZHMoKTtcbiAgICB9XG5cbiAgICAvLyBNYXliZSBhY2NlcHQgYSBob3QgY29kZSBwdXNoLlxuICAgIHNlbGYuX21heWJlTWlncmF0ZSgpO1xuICB9LFxuXG4gIC8vIFNlbmRzIG1lc3NhZ2VzIGZvciBhbGwgdGhlIG1ldGhvZHMgaW4gdGhlIGZpcnN0IGJsb2NrIGluXG4gIC8vIF9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5cbiAgX3NlbmRPdXRzdGFuZGluZ01ldGhvZHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoXy5pc0VtcHR5KHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzKSlcbiAgICAgIHJldHVybjtcbiAgICBfLmVhY2goc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3NbMF0ubWV0aG9kcywgZnVuY3Rpb24gKG0pIHtcbiAgICAgIG0uc2VuZE1lc3NhZ2UoKTtcbiAgICB9KTtcbiAgfSxcblxuICBfbGl2ZWRhdGFfZXJyb3I6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiUmVjZWl2ZWQgZXJyb3IgZnJvbSBzZXJ2ZXI6IFwiLCBtc2cucmVhc29uKTtcbiAgICBpZiAobXNnLm9mZmVuZGluZ01lc3NhZ2UpXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRm9yOiBcIiwgbXNnLm9mZmVuZGluZ01lc3NhZ2UpO1xuICB9LFxuXG4gIF9jYWxsT25SZWNvbm5lY3RBbmRTZW5kQXBwcm9wcmlhdGVPdXRzdGFuZGluZ01ldGhvZHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb2xkT3V0c3RhbmRpbmdNZXRob2RCbG9ja3MgPSBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcztcbiAgICBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyA9IFtdO1xuXG4gICAgc2VsZi5vblJlY29ubmVjdCAmJiBzZWxmLm9uUmVjb25uZWN0KCk7XG4gICAgRERQLl9yZWNvbm5lY3RIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhzZWxmKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgaWYgKF8uaXNFbXB0eShvbGRPdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBXZSBoYXZlIGF0IGxlYXN0IG9uZSBibG9jayB3b3J0aCBvZiBvbGQgb3V0c3RhbmRpbmcgbWV0aG9kcyB0byB0cnlcbiAgICAvLyBhZ2Fpbi4gRmlyc3Q6IGRpZCBvblJlY29ubmVjdCBhY3R1YWxseSBzZW5kIGFueXRoaW5nPyBJZiBub3QsIHdlIGp1c3RcbiAgICAvLyByZXN0b3JlIGFsbCBvdXRzdGFuZGluZyBtZXRob2RzIGFuZCBydW4gdGhlIGZpcnN0IGJsb2NrLlxuICAgIGlmIChfLmlzRW1wdHkoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpKSB7XG4gICAgICBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyA9IG9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzO1xuICAgICAgc2VsZi5fc2VuZE91dHN0YW5kaW5nTWV0aG9kcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE9LLCB0aGVyZSBhcmUgYmxvY2tzIG9uIGJvdGggc2lkZXMuIFNwZWNpYWwgY2FzZTogbWVyZ2UgdGhlIGxhc3QgYmxvY2sgb2ZcbiAgICAvLyB0aGUgcmVjb25uZWN0IG1ldGhvZHMgd2l0aCB0aGUgZmlyc3QgYmxvY2sgb2YgdGhlIG9yaWdpbmFsIG1ldGhvZHMsIGlmXG4gICAgLy8gbmVpdGhlciBvZiB0aGVtIGFyZSBcIndhaXRcIiBibG9ja3MuXG4gICAgaWYgKCFfLmxhc3Qoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpLndhaXQgJiZcbiAgICAgICAgIW9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLndhaXQpIHtcbiAgICAgIF8uZWFjaChvbGRPdXRzdGFuZGluZ01ldGhvZEJsb2Nrc1swXS5tZXRob2RzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICBfLmxhc3Qoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpLm1ldGhvZHMucHVzaChtKTtcblxuICAgICAgICAvLyBJZiB0aGlzIFwibGFzdCBibG9ja1wiIGlzIGFsc28gdGhlIGZpcnN0IGJsb2NrLCBzZW5kIHRoZSBtZXNzYWdlLlxuICAgICAgICBpZiAoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MubGVuZ3RoID09PSAxKVxuICAgICAgICAgIG0uc2VuZE1lc3NhZ2UoKTtcbiAgICAgIH0pO1xuXG4gICAgICBvbGRPdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5zaGlmdCgpO1xuICAgIH1cblxuICAgIC8vIE5vdyBhZGQgdGhlIHJlc3Qgb2YgdGhlIG9yaWdpbmFsIGJsb2NrcyBvbi5cbiAgICBfLmVhY2gob2xkT3V0c3RhbmRpbmdNZXRob2RCbG9ja3MsIGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MucHVzaChibG9jayk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gV2UgY2FuIGFjY2VwdCBhIGhvdCBjb2RlIHB1c2ggaWYgdGhlcmUgYXJlIG5vIG1ldGhvZHMgaW4gZmxpZ2h0LlxuICBfcmVhZHlUb01pZ3JhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gXy5pc0VtcHR5KHNlbGYuX21ldGhvZEludm9rZXJzKTtcbiAgfSxcblxuICAvLyBJZiB3ZSB3ZXJlIGJsb2NraW5nIGEgbWlncmF0aW9uLCBzZWUgaWYgaXQncyBub3cgcG9zc2libGUgdG8gY29udGludWUuXG4gIC8vIENhbGwgd2hlbmV2ZXIgdGhlIHNldCBvZiBvdXRzdGFuZGluZy9ibG9ja2VkIG1ldGhvZHMgc2hyaW5rcy5cbiAgX21heWJlTWlncmF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fcmV0cnlNaWdyYXRlICYmIHNlbGYuX3JlYWR5VG9NaWdyYXRlKCkpIHtcbiAgICAgIHNlbGYuX3JldHJ5TWlncmF0ZSgpO1xuICAgICAgc2VsZi5fcmV0cnlNaWdyYXRlID0gbnVsbDtcbiAgICB9XG4gIH1cbn0pO1xuXG5MaXZlZGF0YVRlc3QuQ29ubmVjdGlvbiA9IENvbm5lY3Rpb247XG5cbi8vIEBwYXJhbSB1cmwge1N0cmluZ30gVVJMIHRvIE1ldGVvciBhcHAsXG4vLyAgICAgZS5nLjpcbi8vICAgICBcInN1YmRvbWFpbi5tZXRlb3IuY29tXCIsXG4vLyAgICAgXCJodHRwOi8vc3ViZG9tYWluLm1ldGVvci5jb21cIixcbi8vICAgICBcIi9cIixcbi8vICAgICBcImRkcCtzb2NranM6Ly9kZHAtLSoqKiotZm9vLm1ldGVvci5jb20vc29ja2pzXCJcblxuLyoqXG4gKiBAc3VtbWFyeSBDb25uZWN0IHRvIHRoZSBzZXJ2ZXIgb2YgYSBkaWZmZXJlbnQgTWV0ZW9yIGFwcGxpY2F0aW9uIHRvIHN1YnNjcmliZSB0byBpdHMgZG9jdW1lbnQgc2V0cyBhbmQgaW52b2tlIGl0cyByZW1vdGUgbWV0aG9kcy5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIG9mIGFub3RoZXIgTWV0ZW9yIGFwcGxpY2F0aW9uLlxuICovXG5ERFAuY29ubmVjdCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IG5ldyBDb25uZWN0aW9uKHVybCwgb3B0aW9ucyk7XG4gIGFsbENvbm5lY3Rpb25zLnB1c2gocmV0KTsgLy8gaGFjay4gc2VlIGJlbG93LlxuICByZXR1cm4gcmV0O1xufTtcblxuRERQLl9yZWNvbm5lY3RIb29rID0gbmV3IEhvb2soeyBiaW5kRW52aXJvbm1lbnQ6IGZhbHNlIH0pO1xuXG4vKipcbiAqIEBzdW1tYXJ5IFJlZ2lzdGVyIGEgZnVuY3Rpb24gdG8gY2FsbCBhcyB0aGUgZmlyc3Qgc3RlcCBvZlxuICogcmVjb25uZWN0aW5nLiBUaGlzIGZ1bmN0aW9uIGNhbiBjYWxsIG1ldGhvZHMgd2hpY2ggd2lsbCBiZSBleGVjdXRlZCBiZWZvcmVcbiAqIGFueSBvdGhlciBvdXRzdGFuZGluZyBtZXRob2RzLiBGb3IgZXhhbXBsZSwgdGhpcyBjYW4gYmUgdXNlZCB0byByZS1lc3RhYmxpc2hcbiAqIHRoZSBhcHByb3ByaWF0ZSBhdXRoZW50aWNhdGlvbiBjb250ZXh0IG9uIHRoZSBjb25uZWN0aW9uLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBhXG4gKiBzaW5nbGUgYXJndW1lbnQsIHRoZSBbY29ubmVjdGlvbiBvYmplY3RdKCNkZHBfY29ubmVjdCkgdGhhdCBpcyByZWNvbm5lY3RpbmcuXG4gKi9cbkREUC5vblJlY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICByZXR1cm4gRERQLl9yZWNvbm5lY3RIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbn07XG5cbi8vIEhhY2sgZm9yIGBzcGlkZXJhYmxlYCBwYWNrYWdlOiBhIHdheSB0byBzZWUgaWYgdGhlIHBhZ2UgaXMgZG9uZVxuLy8gbG9hZGluZyBhbGwgdGhlIGRhdGEgaXQgbmVlZHMuXG4vL1xuYWxsQ29ubmVjdGlvbnMgPSBbXTtcbkREUC5fYWxsU3Vic2NyaXB0aW9uc1JlYWR5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gXy5hbGwoYWxsQ29ubmVjdGlvbnMsIGZ1bmN0aW9uIChjb25uKSB7XG4gICAgcmV0dXJuIF8uYWxsKGNvbm4uX3N1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWIpIHtcbiAgICAgIHJldHVybiBzdWIucmVhZHk7XG4gICAgfSk7XG4gIH0pO1xufTtcbiIsIi8qKlxuICogQG5hbWVzcGFjZSBERFBcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgRERQLXJlbGF0ZWQgbWV0aG9kcy9jbGFzc2VzLlxuICovXG5leHBvcnQgY29uc3QgRERQID0ge307XG5leHBvcnQgY29uc3QgTGl2ZWRhdGFUZXN0ID0ge307XG4iLCJleHBvcnQgY2xhc3MgTW9uZ29JRE1hcCBleHRlbmRzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBNb25nb0lELmlkU3RyaW5naWZ5LFxuICAgICAgTW9uZ29JRC5pZFBhcnNlLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==
