(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Random = Package.random.Random;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var exposeLivedata, exposeMongoLivedata, Fibers, MeteorX;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/meteorhacks_meteorx/lib/livedata.js                                                 //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
exposeLivedata = function(namespace) {
  //instrumenting session
  var fakeSocket = {send: function() {}, close: function() {}, headers: []};
  var ddpConnectMessage = {msg: 'connect', version: 'pre1', support: ['pre1']};
  Meteor.default_server._handleConnect(fakeSocket, ddpConnectMessage);

  if(fakeSocket._meteorSession) { //for newer meteor versions
    namespace.Session = fakeSocket._meteorSession.constructor;

    exposeSubscription(fakeSocket._meteorSession, namespace);
    exposeSessionCollectionView(fakeSocket._meteorSession, namespace);

    if(Meteor.default_server._closeSession) {
      //0.7.x +
      Meteor.default_server._closeSession(fakeSocket._meteorSession);
    } else if(Meteor.default_server._destroySession) {
      //0.6.6.x
      Meteor.default_server._destroySession(fakeSocket._meteorSession);
    }
  } else if(fakeSocket.meteor_session) { //support for 0.6.5.x
    namespace.Session = fakeSocket.meteor_session.constructor;

    //instrumenting subscription
    exposeSubscription(fakeSocket.meteor_session, namespace);
    exposeSessionCollectionView(fakeSocket._meteorSession, namespace);

    fakeSocket.meteor_session.detach(fakeSocket);
  } else {
    console.error('expose: session exposing failed');
  }
};

function exposeSubscription(session, namespace) {
  var subId = Random.id();
  var publicationHandler = function() {this.ready()};
  var pubName = '__dummy_pub_' + Random.id();

  session._startSubscription(publicationHandler, subId, [], pubName);
  var subscription = session._namedSubs[subId];
  namespace.Subscription = subscription.constructor;

  //cleaning up
  session._stopSubscription(subId);
}

function exposeSessionCollectionView(session, namespace) {
  var documentView = session.getCollectionView();
  namespace.SessionCollectionView = documentView.constructor;

  var id = 'the-id';
  documentView.added('sample-handle', id, {aa: 10});
  namespace.SessionDocumentView = documentView.documents[id].constructor;
}
//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/meteorhacks_meteorx/lib/mongo-livedata.js                                           //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
exposeMongoLivedata = function(namespace) {
  var MongoColl = (typeof Mongo != "undefined")? Mongo.Collection: Meteor.Collection;
  var coll = new MongoColl('__dummy_coll_' + Random.id());
  //we need wait until db get connected with meteor, .findOne() does that
  coll.findOne();

  namespace.MongoConnection = MongoInternals.defaultRemoteCollectionDriver().mongo.constructor;
  var cursor = coll.find();
  namespace.MongoCursor = cursor.constructor;
  exposeOplogDriver(namespace, coll);
  exposePollingDriver(namespace, coll);
  exposeMultiplexer(namespace, coll);
}

function exposeOplogDriver(namespace, coll) {
  var driver = _getObserverDriver(coll.find({}));
  // verify observer driver is an oplog driver
  if(driver && typeof driver.constructor.cursorSupported == 'function') {
    namespace.MongoOplogDriver = driver.constructor;
  }
}

function exposePollingDriver(namespace, coll) {
  var cursor = coll.find({}, {limit: 20, _disableOplog: true});
  var driver = _getObserverDriver(cursor);
  // verify observer driver is a polling driver
  if(driver && typeof driver.constructor.cursorSupported == 'undefined') {
    namespace.MongoPollingDriver = driver.constructor;
  }
}

function exposeMultiplexer(namespace, coll) {
  var multiplexer = _getMultiplexer(coll.find({}));
  if(multiplexer) {
    namespace.Multiplexer = multiplexer.constructor;
  }
}

function _getObserverDriver(cursor) {
  var multiplexer = _getMultiplexer(cursor);
  if(multiplexer && multiplexer._observeDriver) {
    return multiplexer._observeDriver;
  }
}

function _getMultiplexer(cursor) {
  var handler = cursor.observeChanges({added: Function.prototype});
  handler.stop();
  return handler._multiplexer;
}

//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/meteorhacks_meteorx/lib/server.js                                                   //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
Fibers = Npm.require('fibers');

MeteorX = {};
MeteorX._readyCallbacks = [];
MeteorX._ready = false;

MeteorX.onReady = function(cb) {
  if(MeteorX._ready) {
    return runWithAFiber(cb);
  }

  this._readyCallbacks.push(cb);
};

MeteorX.Server = Meteor.server.constructor;
exposeLivedata(MeteorX);

// Before using any other MeteorX apis we need to hijack Mongo related code
// That'w what we are doing here.
Meteor.startup(function() {
  runWithAFiber(function() {
    exposeMongoLivedata(MeteorX);
  });

  MeteorX._readyCallbacks.forEach(function(fn) {
    runWithAFiber(fn);
  });
  MeteorX._ready = true;
});

function runWithAFiber(cb) {
  if(Fibers.current) {
    cb();
  } else {
    new Fiber(cb).run();
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['meteorhacks:meteorx'] = {}, {
  MeteorX: MeteorX
});

})();
