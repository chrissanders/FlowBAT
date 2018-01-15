(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Hook = Package['callback-hook'].Hook;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Accounts, options, EXPIRE_TOKENS_INTERVAL_MS, CONNECTION_CLOSE_DELAY_MS;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-base":{"server_main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/server_main.js                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
const module1 = module;
module1.export({
  AccountsServer: () => AccountsServer
});
let AccountsServer;
module1.watch(require("./accounts_server.js"), {
  AccountsServer(v) {
    AccountsServer = v;
  }

}, 0);
module1.watch(require("./accounts_rate_limit.js"));
module1.watch(require("./url_server.js"));
/**
 * @namespace Accounts
 * @summary The namespace for all server-side accounts-related methods.
 */Accounts = new AccountsServer(Meteor.server); // Users table. Don't use the normal autopublish, since we want to hide
// some fields. Code to autopublish this is in accounts_server.js.
// XXX Allow users to configure this collection name.
/**
 * @summary A [Mongo.Collection](#collections) containing user documents.
 * @locus Anywhere
 * @type {Mongo.Collection}
 * @importFromPackage meteor
*/
Meteor.users = Accounts.users;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"accounts_common.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/accounts_common.js                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  AccountsCommon: () => AccountsCommon
});

class AccountsCommon {
  constructor(options) {
    // Currently this is read directly by packages like accounts-password
    // and accounts-ui-unstyled.
    this._options = {}; // Note that setting this.connection = null causes this.users to be a
    // LocalCollection, which is not what we want.

    this.connection = undefined;

    this._initConnection(options || {}); // There is an allow call in accounts_server.js that restricts writes to
    // this collection.


    this.users = new Mongo.Collection("users", {
      _preventAutopublish: true,
      connection: this.connection
    }); // Callback exceptions are printed with Meteor._debug and ignored.

    this._onLoginHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLogin callback"
    });
    this._onLoginFailureHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLoginFailure callback"
    });
    this._onLogoutHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLogout callback"
    });
  } /**
     * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.
     * @locus Anywhere
     */

  userId() {
    throw new Error("userId method not implemented");
  } /**
     * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.
     * @locus Anywhere
     */

  user() {
    var userId = this.userId();
    return userId ? this.users.findOne(userId) : null;
  } // Set up config for the accounts system. Call this on both the client
  // and the server.
  //
  // Note that this method gets overridden on AccountsServer.prototype, but
  // the overriding method calls the overridden method.
  //
  // XXX we should add some enforcement that this is called on both the
  // client and the server. Otherwise, a user can
  // 'forbidClientAccountCreation' only on the client and while it looks
  // like their app is secure, the server will still accept createUser
  // calls. https://github.com/meteor/meteor/issues/828
  //
  // @param options {Object} an object with fields:
  // - sendVerificationEmail {Boolean}
  //     Send email address verification emails to new users created from
  //     client signups.
  // - forbidClientAccountCreation {Boolean}
  //     Do not allow clients to create accounts directly.
  // - restrictCreationByEmailDomain {Function or String}
  //     Require created users to have an email matching the function or
  //     having the string as domain.
  // - loginExpirationInDays {Number}
  //     Number of days since login until a user is logged out (login token
  //     expires).
  // - passwordResetTokenExpirationInDays {Number}
  //     Number of days since password reset token creation until the
  //     token cannt be used any longer (password reset token expires).
  // - ambiguousErrorMessages {Boolean}
  //     Return ambiguous error messages from login failures to prevent
  //     user enumeration.
  /**
   * @summary Set global accounts options.
   * @locus Anywhere
   * @param {Object} options
   * @param {Boolean} options.sendVerificationEmail New users with an email address will receive an address verification email.
   * @param {Boolean} options.forbidClientAccountCreation Calls to [`createUser`](#accounts_createuser) from the client will be rejected. In addition, if you are using [accounts-ui](#accountsui), the "Create account" link will not be available.
   * @param {String | Function} options.restrictCreationByEmailDomain If set to a string, only allows new users if the domain part of their email address matches the string. If set to a function, only allows new users if the function returns true.  The function is passed the full email address of the proposed new user.  Works with password-based sign-in and external services that expose email addresses (Google, Facebook, GitHub). All existing users still can log in after enabling this option. Example: `Accounts.config({ restrictCreationByEmailDomain: 'school.edu' })`.
   * @param {Number} options.loginExpirationInDays The number of days from when a user logs in until their token expires and they are logged out. Defaults to 90. Set to `null` to disable login expiration.
   * @param {String} options.oauthSecretKey When using the `oauth-encryption` package, the 16 byte key using to encrypt sensitive account credentials in the database, encoded in base64.  This option may only be specifed on the server.  See packages/oauth-encryption/README.md for details.
   * @param {Number} options.passwordResetTokenExpirationInDays The number of days from when a link to reset password is sent until token expires and user can't reset password with the link anymore. Defaults to 3.
   * @param {Number} options.passwordEnrollTokenExpirationInDays The number of days from when a link to set inital password is sent until token expires and user can't set password with the link anymore. Defaults to 30.
   * @param {Boolean} options.ambiguousErrorMessages Return ambiguous error messages from login failures to prevent user enumeration. Defaults to false.
   */

  config(options) {
    var self = this; // We don't want users to accidentally only call Accounts.config on the
    // client, where some of the options will have partial effects (eg removing
    // the "create account" button from accounts-ui if forbidClientAccountCreation
    // is set, or redirecting Google login to a specific-domain page) without
    // having their full effects.

    if (Meteor.isServer) {
      __meteor_runtime_config__.accountsConfigCalled = true;
    } else if (!__meteor_runtime_config__.accountsConfigCalled) {
      // XXX would be nice to "crash" the client and replace the UI with an error
      // message, but there's no trivial way to do this.
      Meteor._debug("Accounts.config was called on the client but not on the " + "server; some configuration options may not take effect.");
    } // We need to validate the oauthSecretKey option at the time
    // Accounts.config is called. We also deliberately don't store the
    // oauthSecretKey in Accounts._options.


    if (_.has(options, "oauthSecretKey")) {
      if (Meteor.isClient) throw new Error("The oauthSecretKey option may only be specified on the server");
      if (!Package["oauth-encryption"]) throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");
      Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);
      options = _.omit(options, "oauthSecretKey");
    } // validate option keys


    var VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation", "passwordEnrollTokenExpirationInDays", "restrictCreationByEmailDomain", "loginExpirationInDays", "passwordResetTokenExpirationInDays", "ambiguousErrorMessages"];

    _.each(_.keys(options), function (key) {
      if (!_.contains(VALID_KEYS, key)) {
        throw new Error("Accounts.config: Invalid key: " + key);
      }
    }); // set values in Accounts._options


    _.each(VALID_KEYS, function (key) {
      if (key in options) {
        if (key in self._options) {
          throw new Error("Can't set `" + key + "` more than once");
        }

        self._options[key] = options[key];
      }
    });
  } /**
     * @summary Register a callback to be called after a login attempt succeeds.
     * @locus Anywhere
     * @param {Function} func The callback to be called when login is successful.
     */

  onLogin(func) {
    return this._onLoginHook.register(func);
  } /**
     * @summary Register a callback to be called after a login attempt fails.
     * @locus Anywhere
     * @param {Function} func The callback to be called after the login has failed.
     */

  onLoginFailure(func) {
    return this._onLoginFailureHook.register(func);
  } /**
     * @summary Register a callback to be called after a logout attempt succeeds.
     * @locus Anywhere
     * @param {Function} func The callback to be called when logout is successful.
     */

  onLogout(func) {
    return this._onLogoutHook.register(func);
  }

  _initConnection(options) {
    if (!Meteor.isClient) {
      return;
    } // The connection used by the Accounts system. This is the connection
    // that will get logged in by Meteor.login(), and this is the
    // connection whose login state will be reflected by Meteor.userId().
    //
    // It would be much preferable for this to be in accounts_client.js,
    // but it has to be here because it's needed to create the
    // Meteor.users collection.


    if (options.connection) {
      this.connection = options.connection;
    } else if (options.ddpUrl) {
      this.connection = DDP.connect(options.ddpUrl);
    } else if (typeof __meteor_runtime_config__ !== "undefined" && __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {
      // Temporary, internal hook to allow the server to point the client
      // to a different authentication server. This is for a very
      // particular use case that comes up when implementing a oauth
      // server. Unsupported and may go away at any point in time.
      //
      // We will eventually provide a general way to use account-base
      // against any DDP connection, not just one special one.
      this.connection = DDP.connect(__meteor_runtime_config__.ACCOUNTS_CONNECTION_URL);
    } else {
      this.connection = Meteor.connection;
    }
  }

  _getTokenLifetimeMs() {
    // When loginExpirationInDays is set to null, we'll use a really high
    // number of days (LOGIN_UNEXPIRABLE_TOKEN_DAYS) to simulate an
    // unexpiring token.
    const loginExpirationInDays = this._options.loginExpirationInDays === null ? LOGIN_UNEXPIRING_TOKEN_DAYS : this._options.loginExpirationInDays;
    return (loginExpirationInDays || DEFAULT_LOGIN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;
  }

  _getPasswordResetTokenLifetimeMs() {
    return (this._options.passwordResetTokenExpirationInDays || DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;
  }

  _getPasswordEnrollTokenLifetimeMs() {
    return (this._options.passwordEnrollTokenExpirationInDays || DEFAULT_PASSWORD_ENROLL_TOKEN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;
  }

  _tokenExpiration(when) {
    // We pass when through the Date constructor for backwards compatibility;
    // `when` used to be a number.
    return new Date(new Date(when).getTime() + this._getTokenLifetimeMs());
  }

  _tokenExpiresSoon(when) {
    var minLifetimeMs = .1 * this._getTokenLifetimeMs();

    var minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;
    if (minLifetimeMs > minLifetimeCapMs) minLifetimeMs = minLifetimeCapMs;
    return new Date() > new Date(when) - minLifetimeMs;
  }

}

var Ap = AccountsCommon.prototype; // Note that Accounts is defined separately in accounts_client.js and
// accounts_server.js.
/**
 * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.
 * @locus Anywhere but publish functions
 * @importFromPackage meteor
 */

Meteor.userId = function () {
  return Accounts.userId();
}; /**
    * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.
    * @locus Anywhere but publish functions
    * @importFromPackage meteor
    */

Meteor.user = function () {
  return Accounts.user();
}; // how long (in days) until a login token expires


const DEFAULT_LOGIN_EXPIRATION_DAYS = 90; // Expose for testing.

Ap.DEFAULT_LOGIN_EXPIRATION_DAYS = DEFAULT_LOGIN_EXPIRATION_DAYS; // how long (in days) until reset password token expires

var DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS = 3; // how long (in days) until enrol password token expires

var DEFAULT_PASSWORD_ENROLL_TOKEN_EXPIRATION_DAYS = 30; // Clients don't try to auto-login with a token that is going to expire within
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.
// Tries to avoid abrupt disconnects from expiring tokens.

var MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour
// how often (in milliseconds) we check for expired tokens

EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000; // 10 minutes
// how long we wait before logging out clients when Meteor.logoutOtherClients is
// called

CONNECTION_CLOSE_DELAY_MS = 10 * 1000; // A large number of expiration days (approximately 100 years worth) that is
// used when creating unexpiring tokens.

const LOGIN_UNEXPIRING_TOKEN_DAYS = 365 * 100; // Expose for testing.

Ap.LOGIN_UNEXPIRING_TOKEN_DAYS = LOGIN_UNEXPIRING_TOKEN_DAYS; // loginServiceConfiguration and ConfigError are maintained for backwards compatibility

Meteor.startup(function () {
  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
  Ap.loginServiceConfiguration = ServiceConfiguration.configurations;
  Ap.ConfigError = ServiceConfiguration.ConfigError;
}); // Thrown when the user cancels the login process (eg, closes an oauth
// popup, declines retina scan, etc)

var lceName = 'Accounts.LoginCancelledError';
Ap.LoginCancelledError = Meteor.makeErrorType(lceName, function (description) {
  this.message = description;
});
Ap.LoginCancelledError.prototype.name = lceName; // This is used to transmit specific subclass errors over the wire. We should
// come up with a more generic way to do this (eg, with some sort of symbolic
// error code rather than a number).

Ap.LoginCancelledError.numericError = 0x8acdc2f;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"accounts_rate_limit.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/accounts_rate_limit.js                                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let AccountsCommon;
module.watch(require("./accounts_common.js"), {
  AccountsCommon(v) {
    AccountsCommon = v;
  }

}, 0);
var Ap = AccountsCommon.prototype;
var defaultRateLimiterRuleId; // Removes default rate limiting rule

Ap.removeDefaultRateLimit = function () {
  const resp = DDPRateLimiter.removeRule(defaultRateLimiterRuleId);
  defaultRateLimiterRuleId = null;
  return resp;
}; // Add a default rule of limiting logins, creating new users and password reset
// to 5 times every 10 seconds per connection.


Ap.addDefaultRateLimit = function () {
  if (!defaultRateLimiterRuleId) {
    defaultRateLimiterRuleId = DDPRateLimiter.addRule({
      userId: null,
      clientAddress: null,
      type: 'method',
      name: function (name) {
        return _.contains(['login', 'createUser', 'resetPassword', 'forgotPassword'], name);
      },
      connectionId: function (connectionId) {
        return true;
      }
    }, 5, 10000);
  }
};

Ap.addDefaultRateLimit();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"accounts_server.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/accounts_server.js                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.export({
  AccountsServer: () => AccountsServer
});
let AccountsCommon;
module.watch(require("./accounts_common.js"), {
  AccountsCommon(v) {
    AccountsCommon = v;
  }

}, 0);

var crypto = Npm.require('crypto');

class AccountsServer extends AccountsCommon {
  // Note that this constructor is less likely to be instantiated multiple
  // times than the `AccountsClient` constructor, because a single server
  // can provide only one set of methods.
  constructor(server) {
    super();
    this._server = server || Meteor.server; // Set up the server's methods, as if by calling Meteor.methods.

    this._initServerMethods();

    this._initAccountDataHooks(); // If autopublish is on, publish these user fields. Login service
    // packages (eg accounts-google) add to these by calling
    // addAutopublishFields.  Notably, this isn't implemented with multiple
    // publishes since DDP only merges only across top-level fields, not
    // subfields (such as 'services.facebook.accessToken')


    this._autopublishFields = {
      loggedInUser: ['profile', 'username', 'emails'],
      otherUsers: ['profile', 'username']
    };

    this._initServerPublications(); // connectionId -> {connection, loginToken}


    this._accountData = {}; // connection id -> observe handle for the login token that this connection is
    // currently associated with, or a number. The number indicates that we are in
    // the process of setting up the observe (using a number instead of a single
    // sentinel allows multiple attempts to set up the observe to identify which
    // one was theirs).

    this._userObservesForConnections = {};
    this._nextUserObserveNumber = 1; // for the number described above.
    // list of all registered handlers.

    this._loginHandlers = [];
    setupUsersCollection(this.users);
    setupDefaultLoginHandlers(this);
    setExpireTokensInterval(this);
    this._validateLoginHook = new Hook({
      bindEnvironment: false
    });
    this._validateNewUserHooks = [defaultValidateNewUserHook.bind(this)];

    this._deleteSavedTokensForAllUsersOnStartup();

    this._skipCaseInsensitiveChecksForTest = {};
  } ///
  /// CURRENT USER
  ///
  // @override of "abstract" non-implementation in accounts_common.js


  userId() {
    // This function only works if called inside a method or a pubication.
    // Using any of the infomation from Meteor.user() in a method or
    // publish function will always use the value from when the function first
    // runs. This is likely not what the user expects. The way to make this work
    // in a method or publish function is to do Meteor.find(this.userId).observe
    // and recompute when the user record changes.
    const currentInvocation = DDP._CurrentMethodInvocation.get() || DDP._CurrentPublicationInvocation.get();

    if (!currentInvocation) throw new Error("Meteor.userId can only be invoked in method calls or publications.");
    return currentInvocation.userId;
  } ///
  /// LOGIN HOOKS
  ///
  /**
   * @summary Validate login attempts.
   * @locus Server
   * @param {Function} func Called whenever a login is attempted (either successful or unsuccessful).  A login can be aborted by returning a falsy value or throwing an exception.
   */

  validateLoginAttempt(func) {
    // Exceptions inside the hook callback are passed up to us.
    return this._validateLoginHook.register(func);
  } /**
     * @summary Set restrictions on new user creation.
     * @locus Server
     * @param {Function} func Called whenever a new user is created. Takes the new user object, and returns true to allow the creation or false to abort.
     */

  validateNewUser(func) {
    this._validateNewUserHooks.push(func);
  } ///
  /// CREATE USER HOOKS
  ///
  /**
   * @summary Customize new user creation.
   * @locus Server
   * @param {Function} func Called whenever a new user is created. Return the new user object, or throw an `Error` to abort the creation.
   */

  onCreateUser(func) {
    if (this._onCreateUserHook) {
      throw new Error("Can only call onCreateUser once");
    }

    this._onCreateUserHook = func;
  }

}

;
var Ap = AccountsServer.prototype; // Give each login hook callback a fresh cloned copy of the attempt
// object, but don't clone the connection.
//

function cloneAttemptWithConnection(connection, attempt) {
  var clonedAttempt = EJSON.clone(attempt);
  clonedAttempt.connection = connection;
  return clonedAttempt;
}

Ap._validateLogin = function (connection, attempt) {
  this._validateLoginHook.each(function (callback) {
    var ret;

    try {
      ret = callback(cloneAttemptWithConnection(connection, attempt));
    } catch (e) {
      attempt.allowed = false; // XXX this means the last thrown error overrides previous error
      // messages. Maybe this is surprising to users and we should make
      // overriding errors more explicit. (see
      // https://github.com/meteor/meteor/issues/1960)

      attempt.error = e;
      return true;
    }

    if (!ret) {
      attempt.allowed = false; // don't override a specific error provided by a previous
      // validator or the initial attempt (eg "incorrect password").

      if (!attempt.error) attempt.error = new Meteor.Error(403, "Login forbidden");
    }

    return true;
  });
};

Ap._successfulLogin = function (connection, attempt) {
  this._onLoginHook.each(function (callback) {
    callback(cloneAttemptWithConnection(connection, attempt));
    return true;
  });
};

Ap._failedLogin = function (connection, attempt) {
  this._onLoginFailureHook.each(function (callback) {
    callback(cloneAttemptWithConnection(connection, attempt));
    return true;
  });
};

Ap._successfulLogout = function (connection, userId) {
  const user = userId && this.users.findOne(userId);

  this._onLogoutHook.each(function (callback) {
    callback({
      user,
      connection
    });
    return true;
  });
}; ///
/// LOGIN METHODS
///
// Login methods return to the client an object containing these
// fields when the user was logged in successfully:
//
//   id: userId
//   token: *
//   tokenExpires: *
//
// tokenExpires is optional and intends to provide a hint to the
// client as to when the token will expire. If not provided, the
// client will call Accounts._tokenExpiration, passing it the date
// that it received the token.
//
// The login method will throw an error back to the client if the user
// failed to log in.
//
//
// Login handlers and service specific login methods such as
// `createUser` internally return a `result` object containing these
// fields:
//
//   type:
//     optional string; the service name, overrides the handler
//     default if present.
//
//   error:
//     exception; if the user is not allowed to login, the reason why.
//
//   userId:
//     string; the user id of the user attempting to login (if
//     known), required for an allowed login.
//
//   options:
//     optional object merged into the result returned by the login
//     method; used by HAMK from SRP.
//
//   stampedLoginToken:
//     optional object with `token` and `when` indicating the login
//     token is already present in the database, returned by the
//     "resume" login handler.
//
// For convenience, login methods can also throw an exception, which
// is converted into an {error} result.  However, if the id of the
// user attempting the login is known, a {userId, error} result should
// be returned instead since the user id is not captured when an
// exception is thrown.
//
// This internal `result` object is automatically converted into the
// public {id, token, tokenExpires} object returned to the client.
// Try a login method, converting thrown exceptions into an {error}
// result.  The `type` argument is a default, inserted into the result
// object if not explicitly returned.
//


var tryLoginMethod = function (type, fn) {
  var result;

  try {
    result = fn();
  } catch (e) {
    result = {
      error: e
    };
  }

  if (result && !result.type && type) result.type = type;
  return result;
}; // Log in a user on a connection.
//
// We use the method invocation to set the user id on the connection,
// not the connection object directly. setUserId is tied to methods to
// enforce clear ordering of method application (using wait methods on
// the client, and a no setUserId after unblock restriction on the
// server)
//
// The `stampedLoginToken` parameter is optional.  When present, it
// indicates that the login token has already been inserted into the
// database and doesn't need to be inserted again.  (It's used by the
// "resume" login handler).


Ap._loginUser = function (methodInvocation, userId, stampedLoginToken) {
  var self = this;

  if (!stampedLoginToken) {
    stampedLoginToken = self._generateStampedLoginToken();

    self._insertLoginToken(userId, stampedLoginToken);
  } // This order (and the avoidance of yields) is important to make
  // sure that when publish functions are rerun, they see a
  // consistent view of the world: the userId is set and matches
  // the login token on the connection (not that there is
  // currently a public API for reading the login token on a
  // connection).


  Meteor._noYieldsAllowed(function () {
    self._setLoginToken(userId, methodInvocation.connection, self._hashLoginToken(stampedLoginToken.token));
  });

  methodInvocation.setUserId(userId);
  return {
    id: userId,
    token: stampedLoginToken.token,
    tokenExpires: self._tokenExpiration(stampedLoginToken.when)
  };
}; // After a login method has completed, call the login hooks.  Note
// that `attemptLogin` is called for *all* login attempts, even ones
// which aren't successful (such as an invalid password, etc).
//
// If the login is allowed and isn't aborted by a validate login hook
// callback, log in the user.
//


Ap._attemptLogin = function (methodInvocation, methodName, methodArgs, result) {
  if (!result) throw new Error("result is required"); // XXX A programming error in a login handler can lead to this occuring, and
  // then we don't call onLogin or onLoginFailure callbacks. Should
  // tryLoginMethod catch this case and turn it into an error?

  if (!result.userId && !result.error) throw new Error("A login method must specify a userId or an error");
  var user;
  if (result.userId) user = this.users.findOne(result.userId);
  var attempt = {
    type: result.type || "unknown",
    allowed: !!(result.userId && !result.error),
    methodName: methodName,
    methodArguments: _.toArray(methodArgs)
  };
  if (result.error) attempt.error = result.error;
  if (user) attempt.user = user; // _validateLogin may mutate `attempt` by adding an error and changing allowed
  // to false, but that's the only change it can make (and the user's callbacks
  // only get a clone of `attempt`).

  this._validateLogin(methodInvocation.connection, attempt);

  if (attempt.allowed) {
    var ret = _.extend(this._loginUser(methodInvocation, result.userId, result.stampedLoginToken), result.options || {});

    this._successfulLogin(methodInvocation.connection, attempt);

    return ret;
  } else {
    this._failedLogin(methodInvocation.connection, attempt);

    throw attempt.error;
  }
}; // All service specific login methods should go through this function.
// Ensure that thrown exceptions are caught and that login hook
// callbacks are still called.
//


Ap._loginMethod = function (methodInvocation, methodName, methodArgs, type, fn) {
  return this._attemptLogin(methodInvocation, methodName, methodArgs, tryLoginMethod(type, fn));
}; // Report a login attempt failed outside the context of a normal login
// method. This is for use in the case where there is a multi-step login
// procedure (eg SRP based password login). If a method early in the
// chain fails, it should call this function to report a failure. There
// is no corresponding method for a successful login; methods that can
// succeed at logging a user in should always be actual login methods
// (using either Accounts._loginMethod or Accounts.registerLoginHandler).


Ap._reportLoginFailure = function (methodInvocation, methodName, methodArgs, result) {
  var attempt = {
    type: result.type || "unknown",
    allowed: false,
    error: result.error,
    methodName: methodName,
    methodArguments: _.toArray(methodArgs)
  };

  if (result.userId) {
    attempt.user = this.users.findOne(result.userId);
  }

  this._validateLogin(methodInvocation.connection, attempt);

  this._failedLogin(methodInvocation.connection, attempt); // _validateLogin may mutate attempt to set a new error message. Return
  // the modified version.


  return attempt;
}; ///
/// LOGIN HANDLERS
///
// The main entry point for auth packages to hook in to login.
//
// A login handler is a login method which can return `undefined` to
// indicate that the login request is not handled by this handler.
//
// @param name {String} Optional.  The service name, used by default
// if a specific service name isn't returned in the result.
//
// @param handler {Function} A function that receives an options object
// (as passed as an argument to the `login` method) and returns one of:
// - `undefined`, meaning don't handle;
// - a login method result object


Ap.registerLoginHandler = function (name, handler) {
  if (!handler) {
    handler = name;
    name = null;
  }

  this._loginHandlers.push({
    name: name,
    handler: handler
  });
}; // Checks a user's credentials against all the registered login
// handlers, and returns a login token if the credentials are valid. It
// is like the login method, except that it doesn't set the logged-in
// user on the connection. Throws a Meteor.Error if logging in fails,
// including the case where none of the login handlers handled the login
// request. Otherwise, returns {id: userId, token: *, tokenExpires: *}.
//
// For example, if you want to login with a plaintext password, `options` could be
//   { user: { username: <username> }, password: <password> }, or
//   { user: { email: <email> }, password: <password> }.
// Try all of the registered login handlers until one of them doesn't
// return `undefined`, meaning it handled this call to `login`. Return
// that return value.


Ap._runLoginHandlers = function (methodInvocation, options) {
  for (var i = 0; i < this._loginHandlers.length; ++i) {
    var handler = this._loginHandlers[i];
    var result = tryLoginMethod(handler.name, function () {
      return handler.handler.call(methodInvocation, options);
    });

    if (result) {
      return result;
    }

    if (result !== undefined) {
      throw new Meteor.Error(400, "A login handler should return a result or undefined");
    }
  }

  return {
    type: null,
    error: new Meteor.Error(400, "Unrecognized options for login request")
  };
}; // Deletes the given loginToken from the database.
//
// For new-style hashed token, this will cause all connections
// associated with the token to be closed.
//
// Any connections associated with old-style unhashed tokens will be
// in the process of becoming associated with hashed tokens and then
// they'll get closed.


Ap.destroyToken = function (userId, loginToken) {
  this.users.update(userId, {
    $pull: {
      "services.resume.loginTokens": {
        $or: [{
          hashedToken: loginToken
        }, {
          token: loginToken
        }]
      }
    }
  });
};

Ap._initServerMethods = function () {
  // The methods created in this function need to be created here so that
  // this variable is available in their scope.
  var accounts = this; // This object will be populated with methods and then passed to
  // accounts._server.methods further below.

  var methods = {}; // @returns {Object|null}
  //   If successful, returns {token: reconnectToken, id: userId}
  //   If unsuccessful (for example, if the user closed the oauth login popup),
  //     throws an error describing the reason

  methods.login = function (options) {
    var self = this; // Login handlers should really also check whatever field they look at in
    // options, but we don't enforce it.

    check(options, Object);

    var result = accounts._runLoginHandlers(self, options);

    return accounts._attemptLogin(self, "login", arguments, result);
  };

  methods.logout = function () {
    var token = accounts._getLoginToken(this.connection.id);

    accounts._setLoginToken(this.userId, this.connection, null);

    if (token && this.userId) accounts.destroyToken(this.userId, token);

    accounts._successfulLogout(this.connection, this.userId);

    this.setUserId(null);
  }; // Delete all the current user's tokens and close all open connections logged
  // in as this user. Returns a fresh new login token that this client can
  // use. Tests set Accounts._noConnectionCloseDelayForTest to delete tokens
  // immediately instead of using a delay.
  //
  // XXX COMPAT WITH 0.7.2
  // This single `logoutOtherClients` method has been replaced with two
  // methods, one that you call to get a new token, and another that you
  // call to remove all tokens except your own. The new design allows
  // clients to know when other clients have actually been logged
  // out. (The `logoutOtherClients` method guarantees the caller that
  // the other clients will be logged out at some point, but makes no
  // guarantees about when.) This method is left in for backwards
  // compatibility, especially since application code might be calling
  // this method directly.
  //
  // @returns {Object} Object with token and tokenExpires keys.


  methods.logoutOtherClients = function () {
    var self = this;
    var user = accounts.users.findOne(self.userId, {
      fields: {
        "services.resume.loginTokens": true
      }
    });

    if (user) {
      // Save the current tokens in the database to be deleted in
      // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the
      // caller's browser time to find the fresh token in localStorage. We save
      // the tokens in the database in case we crash before actually deleting
      // them.
      var tokens = user.services.resume.loginTokens;

      var newToken = accounts._generateStampedLoginToken();

      var userId = self.userId;
      accounts.users.update(userId, {
        $set: {
          "services.resume.loginTokensToDelete": tokens,
          "services.resume.haveLoginTokensToDelete": true
        },
        $push: {
          "services.resume.loginTokens": accounts._hashStampedToken(newToken)
        }
      });
      Meteor.setTimeout(function () {
        // The observe on Meteor.users will take care of closing the connections
        // associated with `tokens`.
        accounts._deleteSavedTokensForUser(userId, tokens);
      }, accounts._noConnectionCloseDelayForTest ? 0 : CONNECTION_CLOSE_DELAY_MS); // We do not set the login token on this connection, but instead the
      // observe closes the connection and the client will reconnect with the
      // new token.

      return {
        token: newToken.token,
        tokenExpires: accounts._tokenExpiration(newToken.when)
      };
    } else {
      throw new Meteor.Error("You are not logged in.");
    }
  }; // Generates a new login token with the same expiration as the
  // connection's current token and saves it to the database. Associates
  // the connection with this new token and returns it. Throws an error
  // if called on a connection that isn't logged in.
  //
  // @returns Object
  //   If successful, returns { token: <new token>, id: <user id>,
  //   tokenExpires: <expiration date> }.


  methods.getNewToken = function () {
    var self = this;
    var user = accounts.users.findOne(self.userId, {
      fields: {
        "services.resume.loginTokens": 1
      }
    });

    if (!self.userId || !user) {
      throw new Meteor.Error("You are not logged in.");
    } // Be careful not to generate a new token that has a later
    // expiration than the curren token. Otherwise, a bad guy with a
    // stolen token could use this method to stop his stolen token from
    // ever expiring.


    var currentHashedToken = accounts._getLoginToken(self.connection.id);

    var currentStampedToken = _.find(user.services.resume.loginTokens, function (stampedToken) {
      return stampedToken.hashedToken === currentHashedToken;
    });

    if (!currentStampedToken) {
      // safety belt: this should never happen
      throw new Meteor.Error("Invalid login token");
    }

    var newStampedToken = accounts._generateStampedLoginToken();

    newStampedToken.when = currentStampedToken.when;

    accounts._insertLoginToken(self.userId, newStampedToken);

    return accounts._loginUser(self, self.userId, newStampedToken);
  }; // Removes all tokens except the token associated with the current
  // connection. Throws an error if the connection is not logged
  // in. Returns nothing on success.


  methods.removeOtherTokens = function () {
    var self = this;

    if (!self.userId) {
      throw new Meteor.Error("You are not logged in.");
    }

    var currentToken = accounts._getLoginToken(self.connection.id);

    accounts.users.update(self.userId, {
      $pull: {
        "services.resume.loginTokens": {
          hashedToken: {
            $ne: currentToken
          }
        }
      }
    });
  }; // Allow a one-time configuration for a login service. Modifications
  // to this collection are also allowed in insecure mode.


  methods.configureLoginService = function (options) {
    check(options, Match.ObjectIncluding({
      service: String
    })); // Don't let random users configure a service we haven't added yet (so
    // that when we do later add it, it's set up with their configuration
    // instead of ours).
    // XXX if service configuration is oauth-specific then this code should
    //     be in accounts-oauth; if it's not then the registry should be
    //     in this package

    if (!(accounts.oauth && _.contains(accounts.oauth.serviceNames(), options.service))) {
      throw new Meteor.Error(403, "Service unknown");
    }

    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
    if (ServiceConfiguration.configurations.findOne({
      service: options.service
    })) throw new Meteor.Error(403, "Service " + options.service + " already configured");
    if (_.has(options, "secret") && usingOAuthEncryption()) options.secret = OAuthEncryption.seal(options.secret);
    ServiceConfiguration.configurations.insert(options);
  };

  accounts._server.methods(methods);
};

Ap._initAccountDataHooks = function () {
  var accounts = this;

  accounts._server.onConnection(function (connection) {
    accounts._accountData[connection.id] = {
      connection: connection
    };
    connection.onClose(function () {
      accounts._removeTokenFromConnection(connection.id);

      delete accounts._accountData[connection.id];
    });
  });
};

Ap._initServerPublications = function () {
  var accounts = this; // Publish all login service configuration fields other than secret.

  accounts._server.publish("meteor.loginServiceConfiguration", function () {
    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
    return ServiceConfiguration.configurations.find({}, {
      fields: {
        secret: 0
      }
    });
  }, {
    is_auto: true
  }); // not techincally autopublish, but stops the warning.
  // Publish the current user's record to the client.


  accounts._server.publish(null, function () {
    if (this.userId) {
      return accounts.users.find({
        _id: this.userId
      }, {
        fields: {
          profile: 1,
          username: 1,
          emails: 1
        }
      });
    } else {
      return null;
    }
  }, /*suppress autopublish warning*/{
    is_auto: true
  }); // Use Meteor.startup to give other packages a chance to call
  // addAutopublishFields.


  Package.autopublish && Meteor.startup(function () {
    // ['profile', 'username'] -> {profile: 1, username: 1}
    var toFieldSelector = function (fields) {
      return _.object(_.map(fields, function (field) {
        return [field, 1];
      }));
    };

    accounts._server.publish(null, function () {
      if (this.userId) {
        return accounts.users.find({
          _id: this.userId
        }, {
          fields: toFieldSelector(accounts._autopublishFields.loggedInUser)
        });
      } else {
        return null;
      }
    }, /*suppress autopublish warning*/{
      is_auto: true
    }); // XXX this publish is neither dedup-able nor is it optimized by our special
    // treatment of queries on a specific _id. Therefore this will have O(n^2)
    // run-time performance every time a user document is changed (eg someone
    // logging in). If this is a problem, we can instead write a manual publish
    // function which filters out fields based on 'this.userId'.


    accounts._server.publish(null, function () {
      var selector = this.userId ? {
        _id: {
          $ne: this.userId
        }
      } : {};
      return accounts.users.find(selector, {
        fields: toFieldSelector(accounts._autopublishFields.otherUsers)
      });
    }, /*suppress autopublish warning*/{
      is_auto: true
    });
  });
}; // Add to the list of fields or subfields to be automatically
// published if autopublish is on. Must be called from top-level
// code (ie, before Meteor.startup hooks run).
//
// @param opts {Object} with:
//   - forLoggedInUser {Array} Array of fields published to the logged-in user
//   - forOtherUsers {Array} Array of fields published to users that aren't logged in


Ap.addAutopublishFields = function (opts) {
  this._autopublishFields.loggedInUser.push.apply(this._autopublishFields.loggedInUser, opts.forLoggedInUser);

  this._autopublishFields.otherUsers.push.apply(this._autopublishFields.otherUsers, opts.forOtherUsers);
}; ///
/// ACCOUNT DATA
///
// HACK: This is used by 'meteor-accounts' to get the loginToken for a
// connection. Maybe there should be a public way to do that.


Ap._getAccountData = function (connectionId, field) {
  var data = this._accountData[connectionId];
  return data && data[field];
};

Ap._setAccountData = function (connectionId, field, value) {
  var data = this._accountData[connectionId]; // safety belt. shouldn't happen. accountData is set in onConnection,
  // we don't have a connectionId until it is set.

  if (!data) return;
  if (value === undefined) delete data[field];else data[field] = value;
}; ///
/// RECONNECT TOKENS
///
/// support reconnecting using a meteor login token


Ap._hashLoginToken = function (loginToken) {
  var hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
}; // {token, when} => {hashedToken, when}


Ap._hashStampedToken = function (stampedToken) {
  return _.extend(_.omit(stampedToken, 'token'), {
    hashedToken: this._hashLoginToken(stampedToken.token)
  });
}; // Using $addToSet avoids getting an index error if another client
// logging in simultaneously has already inserted the new hashed
// token.


Ap._insertHashedLoginToken = function (userId, hashedToken, query) {
  query = query ? _.clone(query) : {};
  query._id = userId;
  this.users.update(query, {
    $addToSet: {
      "services.resume.loginTokens": hashedToken
    }
  });
}; // Exported for tests.


Ap._insertLoginToken = function (userId, stampedToken, query) {
  this._insertHashedLoginToken(userId, this._hashStampedToken(stampedToken), query);
};

Ap._clearAllLoginTokens = function (userId) {
  this.users.update(userId, {
    $set: {
      'services.resume.loginTokens': []
    }
  });
}; // test hook


Ap._getUserObserve = function (connectionId) {
  return this._userObservesForConnections[connectionId];
}; // Clean up this connection's association with the token: that is, stop
// the observe that we started when we associated the connection with
// this token.


Ap._removeTokenFromConnection = function (connectionId) {
  if (_.has(this._userObservesForConnections, connectionId)) {
    var observe = this._userObservesForConnections[connectionId];

    if (typeof observe === 'number') {
      // We're in the process of setting up an observe for this connection. We
      // can't clean up that observe yet, but if we delete the placeholder for
      // this connection, then the observe will get cleaned up as soon as it has
      // been set up.
      delete this._userObservesForConnections[connectionId];
    } else {
      delete this._userObservesForConnections[connectionId];
      observe.stop();
    }
  }
};

Ap._getLoginToken = function (connectionId) {
  return this._getAccountData(connectionId, 'loginToken');
}; // newToken is a hashed token.


Ap._setLoginToken = function (userId, connection, newToken) {
  var self = this;

  self._removeTokenFromConnection(connection.id);

  self._setAccountData(connection.id, 'loginToken', newToken);

  if (newToken) {
    // Set up an observe for this token. If the token goes away, we need
    // to close the connection.  We defer the observe because there's
    // no need for it to be on the critical path for login; we just need
    // to ensure that the connection will get closed at some point if
    // the token gets deleted.
    //
    // Initially, we set the observe for this connection to a number; this
    // signifies to other code (which might run while we yield) that we are in
    // the process of setting up an observe for this connection. Once the
    // observe is ready to go, we replace the number with the real observe
    // handle (unless the placeholder has been deleted or replaced by a
    // different placehold number, signifying that the connection was closed
    // already -- in this case we just clean up the observe that we started).
    var myObserveNumber = ++self._nextUserObserveNumber;
    self._userObservesForConnections[connection.id] = myObserveNumber;
    Meteor.defer(function () {
      // If something else happened on this connection in the meantime (it got
      // closed, or another call to _setLoginToken happened), just do
      // nothing. We don't need to start an observe for an old connection or old
      // token.
      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {
        return;
      }

      var foundMatchingUser; // Because we upgrade unhashed login tokens to hashed tokens at
      // login time, sessions will only be logged in with a hashed
      // token. Thus we only need to observe hashed tokens here.

      var observe = self.users.find({
        _id: userId,
        'services.resume.loginTokens.hashedToken': newToken
      }, {
        fields: {
          _id: 1
        }
      }).observeChanges({
        added: function () {
          foundMatchingUser = true;
        },
        removed: function () {
          connection.close(); // The onClose callback for the connection takes care of
          // cleaning up the observe handle and any other state we have
          // lying around.
        }
      }); // If the user ran another login or logout command we were waiting for the
      // defer or added to fire (ie, another call to _setLoginToken occurred),
      // then we let the later one win (start an observe, etc) and just stop our
      // observe now.
      //
      // Similarly, if the connection was already closed, then the onClose
      // callback would have called _removeTokenFromConnection and there won't
      // be an entry in _userObservesForConnections. We can stop the observe.

      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {
        observe.stop();
        return;
      }

      self._userObservesForConnections[connection.id] = observe;

      if (!foundMatchingUser) {
        // We've set up an observe on the user associated with `newToken`,
        // so if the new token is removed from the database, we'll close
        // the connection. But the token might have already been deleted
        // before we set up the observe, which wouldn't have closed the
        // connection because the observe wasn't running yet.
        connection.close();
      }
    });
  }
};

function setupDefaultLoginHandlers(accounts) {
  accounts.registerLoginHandler("resume", function (options) {
    return defaultResumeLoginHandler.call(this, accounts, options);
  });
} // Login handler for resume tokens.


function defaultResumeLoginHandler(accounts, options) {
  if (!options.resume) return undefined;
  check(options.resume, String);

  var hashedToken = accounts._hashLoginToken(options.resume); // First look for just the new-style hashed login token, to avoid
  // sending the unhashed token to the database in a query if we don't
  // need to.


  var user = accounts.users.findOne({
    "services.resume.loginTokens.hashedToken": hashedToken
  });

  if (!user) {
    // If we didn't find the hashed login token, try also looking for
    // the old-style unhashed token.  But we need to look for either
    // the old-style token OR the new-style token, because another
    // client connection logging in simultaneously might have already
    // converted the token.
    user = accounts.users.findOne({
      $or: [{
        "services.resume.loginTokens.hashedToken": hashedToken
      }, {
        "services.resume.loginTokens.token": options.resume
      }]
    });
  }

  if (!user) return {
    error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")
  }; // Find the token, which will either be an object with fields
  // {hashedToken, when} for a hashed token or {token, when} for an
  // unhashed token.

  var oldUnhashedStyleToken;

  var token = _.find(user.services.resume.loginTokens, function (token) {
    return token.hashedToken === hashedToken;
  });

  if (token) {
    oldUnhashedStyleToken = false;
  } else {
    token = _.find(user.services.resume.loginTokens, function (token) {
      return token.token === options.resume;
    });
    oldUnhashedStyleToken = true;
  }

  var tokenExpires = accounts._tokenExpiration(token.when);

  if (new Date() >= tokenExpires) return {
    userId: user._id,
    error: new Meteor.Error(403, "Your session has expired. Please log in again.")
  }; // Update to a hashed token when an unhashed token is encountered.

  if (oldUnhashedStyleToken) {
    // Only add the new hashed token if the old unhashed token still
    // exists (this avoids resurrecting the token if it was deleted
    // after we read it).  Using $addToSet avoids getting an index
    // error if another client logging in simultaneously has already
    // inserted the new hashed token.
    accounts.users.update({
      _id: user._id,
      "services.resume.loginTokens.token": options.resume
    }, {
      $addToSet: {
        "services.resume.loginTokens": {
          "hashedToken": hashedToken,
          "when": token.when
        }
      }
    }); // Remove the old token *after* adding the new, since otherwise
    // another client trying to login between our removing the old and
    // adding the new wouldn't find a token to login with.

    accounts.users.update(user._id, {
      $pull: {
        "services.resume.loginTokens": {
          "token": options.resume
        }
      }
    });
  }

  return {
    userId: user._id,
    stampedLoginToken: {
      token: options.resume,
      when: token.when
    }
  };
} // (Also used by Meteor Accounts server and tests).
//


Ap._generateStampedLoginToken = function () {
  return {
    token: Random.secret(),
    when: new Date()
  };
}; ///
/// TOKEN EXPIRATION
///


function expirePasswordToken(accounts, oldestValidDate, tokenFilter, userId) {
  const userFilter = userId ? {
    _id: userId
  } : {};
  const resetRangeOr = {
    $or: [{
      "services.password.reset.when": {
        $lt: oldestValidDate
      }
    }, {
      "services.password.reset.when": {
        $lt: +oldestValidDate
      }
    }]
  };
  const expireFilter = {
    $and: [tokenFilter, resetRangeOr]
  };
  accounts.users.update((0, _extends3.default)({}, userFilter, expireFilter), {
    $unset: {
      "services.password.reset": ""
    }
  }, {
    multi: true
  });
} // Deletes expired tokens from the database and closes all open connections
// associated with these tokens.
//
// Exported for tests. Also, the arguments are only used by
// tests. oldestValidDate is simulate expiring tokens without waiting
// for them to actually expire. userId is used by tests to only expire
// tokens for the test user.


Ap._expireTokens = function (oldestValidDate, userId) {
  var tokenLifetimeMs = this._getTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


  if (oldestValidDate && !userId || !oldestValidDate && userId) {
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");
  }

  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
  var userFilter = userId ? {
    _id: userId
  } : {}; // Backwards compatible with older versions of meteor that stored login token
  // timestamps as numbers.

  this.users.update(_.extend(userFilter, {
    $or: [{
      "services.resume.loginTokens.when": {
        $lt: oldestValidDate
      }
    }, {
      "services.resume.loginTokens.when": {
        $lt: +oldestValidDate
      }
    }]
  }), {
    $pull: {
      "services.resume.loginTokens": {
        $or: [{
          when: {
            $lt: oldestValidDate
          }
        }, {
          when: {
            $lt: +oldestValidDate
          }
        }]
      }
    }
  }, {
    multi: true
  }); // The observe on Meteor.users will take care of closing connections for
  // expired tokens.
}; // Deletes expired password reset tokens from the database.
//
// Exported for tests. Also, the arguments are only used by
// tests. oldestValidDate is simulate expiring tokens without waiting
// for them to actually expire. userId is used by tests to only expire
// tokens for the test user.


Ap._expirePasswordResetTokens = function (oldestValidDate, userId) {
  var tokenLifetimeMs = this._getPasswordResetTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


  if (oldestValidDate && !userId || !oldestValidDate && userId) {
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");
  }

  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
  var tokenFilter = {
    $or: [{
      "services.password.reset.reason": "reset"
    }, {
      "services.password.reset.reason": {
        $exists: false
      }
    }]
  };
  expirePasswordToken(this, oldestValidDate, tokenFilter, userId);
}; // Deletes expired password enroll tokens from the database.
//
// Exported for tests. Also, the arguments are only used by
// tests. oldestValidDate is simulate expiring tokens without waiting
// for them to actually expire. userId is used by tests to only expire
// tokens for the test user.


Ap._expirePasswordEnrollTokens = function (oldestValidDate, userId) {
  var tokenLifetimeMs = this._getPasswordEnrollTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


  if (oldestValidDate && !userId || !oldestValidDate && userId) {
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");
  }

  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
  var tokenFilter = {
    "services.password.reset.reason": "enroll"
  };
  expirePasswordToken(this, oldestValidDate, tokenFilter, userId);
}; // @override from accounts_common.js


Ap.config = function (options) {
  // Call the overridden implementation of the method.
  var superResult = AccountsCommon.prototype.config.apply(this, arguments); // If the user set loginExpirationInDays to null, then we need to clear the
  // timer that periodically expires tokens.

  if (_.has(this._options, "loginExpirationInDays") && this._options.loginExpirationInDays === null && this.expireTokenInterval) {
    Meteor.clearInterval(this.expireTokenInterval);
    this.expireTokenInterval = null;
  }

  return superResult;
};

function setExpireTokensInterval(accounts) {
  accounts.expireTokenInterval = Meteor.setInterval(function () {
    accounts._expireTokens();

    accounts._expirePasswordResetTokens();

    accounts._expirePasswordEnrollTokens();
  }, EXPIRE_TOKENS_INTERVAL_MS);
} ///
/// OAuth Encryption Support
///


var OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;

function usingOAuthEncryption() {
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();
} // OAuth service data is temporarily stored in the pending credentials
// collection during the oauth authentication process.  Sensitive data
// such as access tokens are encrypted without the user id because
// we don't know the user id yet.  We re-encrypt these fields with the
// user id included when storing the service data permanently in
// the users collection.
//


function pinEncryptedFieldsToUser(serviceData, userId) {
  _.each(_.keys(serviceData), function (key) {
    var value = serviceData[key];
    if (OAuthEncryption && OAuthEncryption.isSealed(value)) value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);
    serviceData[key] = value;
  });
} // Encrypt unencrypted login service secrets when oauth-encryption is
// added.
//
// XXX For the oauthSecretKey to be available here at startup, the
// developer must call Accounts.config({oauthSecretKey: ...}) at load
// time, instead of in a Meteor.startup block, because the startup
// block in the app code will run after this accounts-base startup
// block.  Perhaps we need a post-startup callback?


Meteor.startup(function () {
  if (!usingOAuthEncryption()) {
    return;
  }

  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
  ServiceConfiguration.configurations.find({
    $and: [{
      secret: {
        $exists: true
      }
    }, {
      "secret.algorithm": {
        $exists: false
      }
    }]
  }).forEach(function (config) {
    ServiceConfiguration.configurations.update(config._id, {
      $set: {
        secret: OAuthEncryption.seal(config.secret)
      }
    });
  });
}); // XXX see comment on Accounts.createUser in passwords_server about adding a
// second "server options" argument.

function defaultCreateUserHook(options, user) {
  if (options.profile) user.profile = options.profile;
  return user;
} // Called by accounts-password


Ap.insertUserDoc = function (options, user) {
  // - clone user document, to protect from modification
  // - add createdAt timestamp
  // - prepare an _id, so that you can modify other collections (eg
  // create a first task for every new user)
  //
  // XXX If the onCreateUser or validateNewUser hooks fail, we might
  // end up having modified some other collection
  // inappropriately. The solution is probably to have onCreateUser
  // accept two callbacks - one that gets called before inserting
  // the user document (in which you can modify its contents), and
  // one that gets called after (in which you should change other
  // collections)
  user = _.extend({
    createdAt: new Date(),
    _id: Random.id()
  }, user);

  if (user.services) {
    _.each(user.services, function (serviceData) {
      pinEncryptedFieldsToUser(serviceData, user._id);
    });
  }

  var fullUser;

  if (this._onCreateUserHook) {
    fullUser = this._onCreateUserHook(options, user); // This is *not* part of the API. We need this because we can't isolate
    // the global server environment between tests, meaning we can't test
    // both having a create user hook set and not having one set.

    if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);
  } else {
    fullUser = defaultCreateUserHook(options, user);
  }

  _.each(this._validateNewUserHooks, function (hook) {
    if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");
  });

  var userId;

  try {
    userId = this.users.insert(fullUser);
  } catch (e) {
    // XXX string parsing sucks, maybe
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day
    if (e.name !== 'MongoError') throw e;
    if (e.code !== 11000) throw e;
    if (e.errmsg.indexOf('emails.address') !== -1) throw new Meteor.Error(403, "Email already exists.");
    if (e.errmsg.indexOf('username') !== -1) throw new Meteor.Error(403, "Username already exists."); // XXX better error reporting for services.facebook.id duplicate, etc

    throw e;
  }

  return userId;
}; // Helper function: returns false if email does not match company domain from
// the configuration.


Ap._testEmailDomain = function (email) {
  var domain = this._options.restrictCreationByEmailDomain;
  return !domain || _.isFunction(domain) && domain(email) || _.isString(domain) && new RegExp('@' + Meteor._escapeRegExp(domain) + '$', 'i').test(email);
}; // Validate new user's email or Google/Facebook/GitHub account's email


function defaultValidateNewUserHook(user) {
  var self = this;
  var domain = self._options.restrictCreationByEmailDomain;
  if (!domain) return true;
  var emailIsGood = false;

  if (!_.isEmpty(user.emails)) {
    emailIsGood = _.any(user.emails, function (email) {
      return self._testEmailDomain(email.address);
    });
  } else if (!_.isEmpty(user.services)) {
    // Find any email of any service and check it
    emailIsGood = _.any(user.services, function (service) {
      return service.email && self._testEmailDomain(service.email);
    });
  }

  if (emailIsGood) return true;
  if (_.isString(domain)) throw new Meteor.Error(403, "@" + domain + " email required");else throw new Meteor.Error(403, "Email doesn't match the criteria.");
} ///
/// MANAGING USER OBJECTS
///
// Updates or creates a user after we authenticate with a 3rd party.
//
// @param serviceName {String} Service name (eg, twitter).
// @param serviceData {Object} Data to store in the user's record
//        under services[serviceName]. Must include an "id" field
//        which is a unique identifier for the user in the service.
// @param options {Object, optional} Other options to pass to insertUserDoc
//        (eg, profile)
// @returns {Object} Object with token and id keys, like the result
//        of the "login" method.
//


Ap.updateOrCreateUserFromExternalService = function (serviceName, serviceData, options) {
  options = _.clone(options || {});
  if (serviceName === "password" || serviceName === "resume") throw new Error("Can't use updateOrCreateUserFromExternalService with internal service " + serviceName);
  if (!_.has(serviceData, 'id')) throw new Error("Service data for service " + serviceName + " must include id"); // Look for a user with the appropriate service user id.

  var selector = {};
  var serviceIdKey = "services." + serviceName + ".id"; // XXX Temporary special case for Twitter. (Issue #629)
  //   The serviceData.id will be a string representation of an integer.
  //   We want it to match either a stored string or int representation.
  //   This is to cater to earlier versions of Meteor storing twitter
  //   user IDs in number form, and recent versions storing them as strings.
  //   This can be removed once migration technology is in place, and twitter
  //   users stored with integer IDs have been migrated to string IDs.

  if (serviceName === "twitter" && !isNaN(serviceData.id)) {
    selector["$or"] = [{}, {}];
    selector["$or"][0][serviceIdKey] = serviceData.id;
    selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);
  } else {
    selector[serviceIdKey] = serviceData.id;
  }

  var user = this.users.findOne(selector);

  if (user) {
    pinEncryptedFieldsToUser(serviceData, user._id); // We *don't* process options (eg, profile) for update, but we do replace
    // the serviceData (eg, so that we keep an unexpired access token and
    // don't cache old email addresses in serviceData.email).
    // XXX provide an onUpdateUser hook which would let apps update
    //     the profile too

    var setAttrs = {};

    _.each(serviceData, function (value, key) {
      setAttrs["services." + serviceName + "." + key] = value;
    }); // XXX Maybe we should re-use the selector above and notice if the update
    //     touches nothing?


    this.users.update(user._id, {
      $set: setAttrs
    });
    return {
      type: serviceName,
      userId: user._id
    };
  } else {
    // Create a new user with the service data. Pass other options through to
    // insertUserDoc.
    user = {
      services: {}
    };
    user.services[serviceName] = serviceData;
    return {
      type: serviceName,
      userId: this.insertUserDoc(options, user)
    };
  }
};

function setupUsersCollection(users) {
  ///
  /// RESTRICTING WRITES TO USER OBJECTS
  ///
  users.allow({
    // clients can modify the profile field of their own document, and
    // nothing else.
    update: function (userId, user, fields, modifier) {
      // make sure it is our record
      if (user._id !== userId) return false; // user can only modify the 'profile' field. sets to multiple
      // sub-keys (eg profile.foo and profile.bar) are merged into entry
      // in the fields list.

      if (fields.length !== 1 || fields[0] !== 'profile') return false;
      return true;
    },
    fetch: ['_id'] // we only look at _id.

  }); /// DEFAULT INDEXES ON USERS

  users._ensureIndex('username', {
    unique: 1,
    sparse: 1
  });

  users._ensureIndex('emails.address', {
    unique: 1,
    sparse: 1
  });

  users._ensureIndex('services.resume.loginTokens.hashedToken', {
    unique: 1,
    sparse: 1
  });

  users._ensureIndex('services.resume.loginTokens.token', {
    unique: 1,
    sparse: 1
  }); // For taking care of logoutOtherClients calls that crashed before the
  // tokens were deleted.


  users._ensureIndex('services.resume.haveLoginTokensToDelete', {
    sparse: 1
  }); // For expiring login tokens


  users._ensureIndex("services.resume.loginTokens.when", {
    sparse: 1
  }); // For expiring password tokens


  users._ensureIndex('services.password.reset.when', {
    sparse: 1
  });
} ///
/// CLEAN UP FOR `logoutOtherClients`
///


Ap._deleteSavedTokensForUser = function (userId, tokensToDelete) {
  if (tokensToDelete) {
    this.users.update(userId, {
      $unset: {
        "services.resume.haveLoginTokensToDelete": 1,
        "services.resume.loginTokensToDelete": 1
      },
      $pullAll: {
        "services.resume.loginTokens": tokensToDelete
      }
    });
  }
};

Ap._deleteSavedTokensForAllUsersOnStartup = function () {
  var self = this; // If we find users who have saved tokens to delete on startup, delete
  // them now. It's possible that the server could have crashed and come
  // back up before new tokens are found in localStorage, but this
  // shouldn't happen very often. We shouldn't put a delay here because
  // that would give a lot of power to an attacker with a stolen login
  // token and the ability to crash the server.

  Meteor.startup(function () {
    self.users.find({
      "services.resume.haveLoginTokensToDelete": true
    }, {
      "services.resume.loginTokensToDelete": 1
    }).forEach(function (user) {
      self._deleteSavedTokensForUser(user._id, user.services.resume.loginTokensToDelete);
    });
  });
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"url_server.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/url_server.js                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let AccountsServer;
module.watch(require("./accounts_server.js"), {
  AccountsServer(v) {
    AccountsServer = v;
  }

}, 0);
// XXX These should probably not actually be public?
AccountsServer.prototype.urls = {
  resetPassword: function (token) {
    return Meteor.absoluteUrl('#/reset-password/' + token);
  },
  verifyEmail: function (token) {
    return Meteor.absoluteUrl('#/verify-email/' + token);
  },
  enrollAccount: function (token) {
    return Meteor.absoluteUrl('#/enroll-account/' + token);
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/accounts-base/server_main.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['accounts-base'] = exports, {
  Accounts: Accounts
});

})();

//# sourceURL=meteor://💻app/packages/accounts-base.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtYmFzZS9zZXJ2ZXJfbWFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtYmFzZS9hY2NvdW50c19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLWJhc2UvYWNjb3VudHNfcmF0ZV9saW1pdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtYmFzZS9hY2NvdW50c19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLWJhc2UvdXJsX3NlcnZlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUxIiwibW9kdWxlIiwiZXhwb3J0IiwiQWNjb3VudHNTZXJ2ZXIiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiQWNjb3VudHMiLCJNZXRlb3IiLCJzZXJ2ZXIiLCJ1c2VycyIsIkFjY291bnRzQ29tbW9uIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwiX29wdGlvbnMiLCJjb25uZWN0aW9uIiwidW5kZWZpbmVkIiwiX2luaXRDb25uZWN0aW9uIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwiX3ByZXZlbnRBdXRvcHVibGlzaCIsIl9vbkxvZ2luSG9vayIsIkhvb2siLCJiaW5kRW52aXJvbm1lbnQiLCJkZWJ1Z1ByaW50RXhjZXB0aW9ucyIsIl9vbkxvZ2luRmFpbHVyZUhvb2siLCJfb25Mb2dvdXRIb29rIiwidXNlcklkIiwiRXJyb3IiLCJ1c2VyIiwiZmluZE9uZSIsImNvbmZpZyIsInNlbGYiLCJpc1NlcnZlciIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJhY2NvdW50c0NvbmZpZ0NhbGxlZCIsIl9kZWJ1ZyIsIl8iLCJoYXMiLCJpc0NsaWVudCIsIlBhY2thZ2UiLCJPQXV0aEVuY3J5cHRpb24iLCJsb2FkS2V5Iiwib2F1dGhTZWNyZXRLZXkiLCJvbWl0IiwiVkFMSURfS0VZUyIsImVhY2giLCJrZXlzIiwia2V5IiwiY29udGFpbnMiLCJvbkxvZ2luIiwiZnVuYyIsInJlZ2lzdGVyIiwib25Mb2dpbkZhaWx1cmUiLCJvbkxvZ291dCIsImRkcFVybCIsIkREUCIsImNvbm5lY3QiLCJBQ0NPVU5UU19DT05ORUNUSU9OX1VSTCIsIl9nZXRUb2tlbkxpZmV0aW1lTXMiLCJsb2dpbkV4cGlyYXRpb25JbkRheXMiLCJMT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVMiLCJERUZBVUxUX0xPR0lOX0VYUElSQVRJT05fREFZUyIsIl9nZXRQYXNzd29yZFJlc2V0VG9rZW5MaWZldGltZU1zIiwicGFzc3dvcmRSZXNldFRva2VuRXhwaXJhdGlvbkluRGF5cyIsIkRFRkFVTFRfUEFTU1dPUkRfUkVTRVRfVE9LRU5fRVhQSVJBVElPTl9EQVlTIiwiX2dldFBhc3N3b3JkRW5yb2xsVG9rZW5MaWZldGltZU1zIiwicGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb25JbkRheXMiLCJERUZBVUxUX1BBU1NXT1JEX0VOUk9MTF9UT0tFTl9FWFBJUkFUSU9OX0RBWVMiLCJfdG9rZW5FeHBpcmF0aW9uIiwid2hlbiIsIkRhdGUiLCJnZXRUaW1lIiwiX3Rva2VuRXhwaXJlc1Nvb24iLCJtaW5MaWZldGltZU1zIiwibWluTGlmZXRpbWVDYXBNcyIsIk1JTl9UT0tFTl9MSUZFVElNRV9DQVBfU0VDUyIsIkFwIiwicHJvdG90eXBlIiwiRVhQSVJFX1RPS0VOU19JTlRFUlZBTF9NUyIsIkNPTk5FQ1RJT05fQ0xPU0VfREVMQVlfTVMiLCJzdGFydHVwIiwiU2VydmljZUNvbmZpZ3VyYXRpb24iLCJsb2dpblNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJDb25maWdFcnJvciIsImxjZU5hbWUiLCJMb2dpbkNhbmNlbGxlZEVycm9yIiwibWFrZUVycm9yVHlwZSIsImRlc2NyaXB0aW9uIiwibWVzc2FnZSIsIm5hbWUiLCJudW1lcmljRXJyb3IiLCJkZWZhdWx0UmF0ZUxpbWl0ZXJSdWxlSWQiLCJyZW1vdmVEZWZhdWx0UmF0ZUxpbWl0IiwicmVzcCIsIkREUFJhdGVMaW1pdGVyIiwicmVtb3ZlUnVsZSIsImFkZERlZmF1bHRSYXRlTGltaXQiLCJhZGRSdWxlIiwiY2xpZW50QWRkcmVzcyIsInR5cGUiLCJjb25uZWN0aW9uSWQiLCJjcnlwdG8iLCJOcG0iLCJfc2VydmVyIiwiX2luaXRTZXJ2ZXJNZXRob2RzIiwiX2luaXRBY2NvdW50RGF0YUhvb2tzIiwiX2F1dG9wdWJsaXNoRmllbGRzIiwibG9nZ2VkSW5Vc2VyIiwib3RoZXJVc2VycyIsIl9pbml0U2VydmVyUHVibGljYXRpb25zIiwiX2FjY291bnREYXRhIiwiX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zIiwiX25leHRVc2VyT2JzZXJ2ZU51bWJlciIsIl9sb2dpbkhhbmRsZXJzIiwic2V0dXBVc2Vyc0NvbGxlY3Rpb24iLCJzZXR1cERlZmF1bHRMb2dpbkhhbmRsZXJzIiwic2V0RXhwaXJlVG9rZW5zSW50ZXJ2YWwiLCJfdmFsaWRhdGVMb2dpbkhvb2siLCJfdmFsaWRhdGVOZXdVc2VySG9va3MiLCJkZWZhdWx0VmFsaWRhdGVOZXdVc2VySG9vayIsImJpbmQiLCJfZGVsZXRlU2F2ZWRUb2tlbnNGb3JBbGxVc2Vyc09uU3RhcnR1cCIsIl9za2lwQ2FzZUluc2Vuc2l0aXZlQ2hlY2tzRm9yVGVzdCIsImN1cnJlbnRJbnZvY2F0aW9uIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiZ2V0IiwiX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24iLCJ2YWxpZGF0ZUxvZ2luQXR0ZW1wdCIsInZhbGlkYXRlTmV3VXNlciIsInB1c2giLCJvbkNyZWF0ZVVzZXIiLCJfb25DcmVhdGVVc2VySG9vayIsImNsb25lQXR0ZW1wdFdpdGhDb25uZWN0aW9uIiwiYXR0ZW1wdCIsImNsb25lZEF0dGVtcHQiLCJFSlNPTiIsImNsb25lIiwiX3ZhbGlkYXRlTG9naW4iLCJjYWxsYmFjayIsInJldCIsImUiLCJhbGxvd2VkIiwiZXJyb3IiLCJfc3VjY2Vzc2Z1bExvZ2luIiwiX2ZhaWxlZExvZ2luIiwiX3N1Y2Nlc3NmdWxMb2dvdXQiLCJ0cnlMb2dpbk1ldGhvZCIsImZuIiwicmVzdWx0IiwiX2xvZ2luVXNlciIsIm1ldGhvZEludm9jYXRpb24iLCJzdGFtcGVkTG9naW5Ub2tlbiIsIl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuIiwiX2luc2VydExvZ2luVG9rZW4iLCJfbm9ZaWVsZHNBbGxvd2VkIiwiX3NldExvZ2luVG9rZW4iLCJfaGFzaExvZ2luVG9rZW4iLCJ0b2tlbiIsInNldFVzZXJJZCIsImlkIiwidG9rZW5FeHBpcmVzIiwiX2F0dGVtcHRMb2dpbiIsIm1ldGhvZE5hbWUiLCJtZXRob2RBcmdzIiwibWV0aG9kQXJndW1lbnRzIiwidG9BcnJheSIsImV4dGVuZCIsIl9sb2dpbk1ldGhvZCIsIl9yZXBvcnRMb2dpbkZhaWx1cmUiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsImhhbmRsZXIiLCJfcnVuTG9naW5IYW5kbGVycyIsImkiLCJsZW5ndGgiLCJjYWxsIiwiZGVzdHJveVRva2VuIiwibG9naW5Ub2tlbiIsInVwZGF0ZSIsIiRwdWxsIiwiJG9yIiwiaGFzaGVkVG9rZW4iLCJhY2NvdW50cyIsIm1ldGhvZHMiLCJsb2dpbiIsImNoZWNrIiwiT2JqZWN0IiwiYXJndW1lbnRzIiwibG9nb3V0IiwiX2dldExvZ2luVG9rZW4iLCJsb2dvdXRPdGhlckNsaWVudHMiLCJmaWVsZHMiLCJ0b2tlbnMiLCJzZXJ2aWNlcyIsInJlc3VtZSIsImxvZ2luVG9rZW5zIiwibmV3VG9rZW4iLCIkc2V0IiwiJHB1c2giLCJfaGFzaFN0YW1wZWRUb2tlbiIsInNldFRpbWVvdXQiLCJfZGVsZXRlU2F2ZWRUb2tlbnNGb3JVc2VyIiwiX25vQ29ubmVjdGlvbkNsb3NlRGVsYXlGb3JUZXN0IiwiZ2V0TmV3VG9rZW4iLCJjdXJyZW50SGFzaGVkVG9rZW4iLCJjdXJyZW50U3RhbXBlZFRva2VuIiwiZmluZCIsInN0YW1wZWRUb2tlbiIsIm5ld1N0YW1wZWRUb2tlbiIsInJlbW92ZU90aGVyVG9rZW5zIiwiY3VycmVudFRva2VuIiwiJG5lIiwiY29uZmlndXJlTG9naW5TZXJ2aWNlIiwiTWF0Y2giLCJPYmplY3RJbmNsdWRpbmciLCJzZXJ2aWNlIiwiU3RyaW5nIiwib2F1dGgiLCJzZXJ2aWNlTmFtZXMiLCJ1c2luZ09BdXRoRW5jcnlwdGlvbiIsInNlY3JldCIsInNlYWwiLCJpbnNlcnQiLCJvbkNvbm5lY3Rpb24iLCJvbkNsb3NlIiwiX3JlbW92ZVRva2VuRnJvbUNvbm5lY3Rpb24iLCJwdWJsaXNoIiwiaXNfYXV0byIsIl9pZCIsInByb2ZpbGUiLCJ1c2VybmFtZSIsImVtYWlscyIsImF1dG9wdWJsaXNoIiwidG9GaWVsZFNlbGVjdG9yIiwib2JqZWN0IiwibWFwIiwiZmllbGQiLCJzZWxlY3RvciIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwib3B0cyIsImFwcGx5IiwiZm9yTG9nZ2VkSW5Vc2VyIiwiZm9yT3RoZXJVc2VycyIsIl9nZXRBY2NvdW50RGF0YSIsImRhdGEiLCJfc2V0QWNjb3VudERhdGEiLCJ2YWx1ZSIsImhhc2giLCJjcmVhdGVIYXNoIiwiZGlnZXN0IiwiX2luc2VydEhhc2hlZExvZ2luVG9rZW4iLCJxdWVyeSIsIiRhZGRUb1NldCIsIl9jbGVhckFsbExvZ2luVG9rZW5zIiwiX2dldFVzZXJPYnNlcnZlIiwib2JzZXJ2ZSIsInN0b3AiLCJteU9ic2VydmVOdW1iZXIiLCJkZWZlciIsImZvdW5kTWF0Y2hpbmdVc2VyIiwib2JzZXJ2ZUNoYW5nZXMiLCJhZGRlZCIsInJlbW92ZWQiLCJjbG9zZSIsImRlZmF1bHRSZXN1bWVMb2dpbkhhbmRsZXIiLCJvbGRVbmhhc2hlZFN0eWxlVG9rZW4iLCJSYW5kb20iLCJleHBpcmVQYXNzd29yZFRva2VuIiwib2xkZXN0VmFsaWREYXRlIiwidG9rZW5GaWx0ZXIiLCJ1c2VyRmlsdGVyIiwicmVzZXRSYW5nZU9yIiwiJGx0IiwiZXhwaXJlRmlsdGVyIiwiJGFuZCIsIiR1bnNldCIsIm11bHRpIiwiX2V4cGlyZVRva2VucyIsInRva2VuTGlmZXRpbWVNcyIsIl9leHBpcmVQYXNzd29yZFJlc2V0VG9rZW5zIiwiJGV4aXN0cyIsIl9leHBpcmVQYXNzd29yZEVucm9sbFRva2VucyIsInN1cGVyUmVzdWx0IiwiZXhwaXJlVG9rZW5JbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImtleUlzTG9hZGVkIiwicGluRW5jcnlwdGVkRmllbGRzVG9Vc2VyIiwic2VydmljZURhdGEiLCJpc1NlYWxlZCIsIm9wZW4iLCJmb3JFYWNoIiwiZGVmYXVsdENyZWF0ZVVzZXJIb29rIiwiaW5zZXJ0VXNlckRvYyIsImNyZWF0ZWRBdCIsImZ1bGxVc2VyIiwiaG9vayIsImNvZGUiLCJlcnJtc2ciLCJpbmRleE9mIiwiX3Rlc3RFbWFpbERvbWFpbiIsImVtYWlsIiwiZG9tYWluIiwicmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW4iLCJpc0Z1bmN0aW9uIiwiaXNTdHJpbmciLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwidGVzdCIsImVtYWlsSXNHb29kIiwiaXNFbXB0eSIsImFueSIsImFkZHJlc3MiLCJ1cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlIiwic2VydmljZU5hbWUiLCJzZXJ2aWNlSWRLZXkiLCJpc05hTiIsInBhcnNlSW50Iiwic2V0QXR0cnMiLCJhbGxvdyIsIm1vZGlmaWVyIiwiZmV0Y2giLCJfZW5zdXJlSW5kZXgiLCJ1bmlxdWUiLCJzcGFyc2UiLCJ0b2tlbnNUb0RlbGV0ZSIsIiRwdWxsQWxsIiwibG9naW5Ub2tlbnNUb0RlbGV0ZSIsInVybHMiLCJyZXNldFBhc3N3b3JkIiwiYWJzb2x1dGVVcmwiLCJ2ZXJpZnlFbWFpbCIsImVucm9sbEFjY291bnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU1BLFVBQVFDLE1BQWQ7QUFBcUJELFFBQVFFLE1BQVIsQ0FBZTtBQUFDQyxrQkFBZSxNQUFJQTtBQUFwQixDQUFmO0FBQW9E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R0FEUCxFQUVFeE0sS0FBS3FLLFFBQUwsQ0FBY0MsTUFBZCxDQUFxQnFJLG1CQUZ2QjtBQUlELEtBVEQ7QUFVRCxHQVhEO0FBWUQsQ0FyQkQsQzs7Ozs7Ozs7Ozs7QUNuL0NBLElBQUlyVSxjQUFKO0FBQW1CRixPQUFPRyxLQUFQLENBQWFDLFFBQVEsc0JBQVIsQ0FBYixFQUE2QztBQUFDRixpQkFBZUcsQ0FBZixFQUFpQjtBQUFDSCxxQkFBZUcsQ0FBZjtBQUFpQjs7QUFBcEMsQ0FBN0MsRUFBbUYsQ0FBbkY7QUFFbkI7QUFFQUgsZUFBZTJFLFNBQWYsQ0FBeUIyUCxJQUF6QixHQUFnQztBQUM5QkMsaUJBQWUsVUFBVTNLLEtBQVYsRUFBaUI7QUFDOUIsV0FBT3ZKLE9BQU9tVSxXQUFQLENBQW1CLHNCQUFzQjVLLEtBQXpDLENBQVA7QUFDRCxHQUg2QjtBQUs5QjZLLGVBQWEsVUFBVTdLLEtBQVYsRUFBaUI7QUFDNUIsV0FBT3ZKLE9BQU9tVSxXQUFQLENBQW1CLG9CQUFvQjVLLEtBQXZDLENBQVA7QUFDRCxHQVA2QjtBQVM5QjhLLGlCQUFlLFVBQVU5SyxLQUFWLEVBQWlCO0FBQzlCLFdBQU92SixPQUFPbVUsV0FBUCxDQUFtQixzQkFBc0I1SyxLQUF6QyxDQUFQO0FBQ0Q7QUFYNkIsQ0FBaEMsQyIsImZpbGUiOiIvcGFja2FnZXMvYWNjb3VudHMtYmFzZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QWNjb3VudHNTZXJ2ZXJ9IGZyb20gXCIuL2FjY291bnRzX3NlcnZlci5qc1wiO1xuaW1wb3J0IFwiLi9hY2NvdW50c19yYXRlX2xpbWl0LmpzXCI7XG5pbXBvcnQgXCIuL3VybF9zZXJ2ZXIuanNcIjtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIEFjY291bnRzXG4gKiBAc3VtbWFyeSBUaGUgbmFtZXNwYWNlIGZvciBhbGwgc2VydmVyLXNpZGUgYWNjb3VudHMtcmVsYXRlZCBtZXRob2RzLlxuICovXG5BY2NvdW50cyA9IG5ldyBBY2NvdW50c1NlcnZlcihNZXRlb3Iuc2VydmVyKTtcblxuLy8gVXNlcnMgdGFibGUuIERvbid0IHVzZSB0aGUgbm9ybWFsIGF1dG9wdWJsaXNoLCBzaW5jZSB3ZSB3YW50IHRvIGhpZGVcbi8vIHNvbWUgZmllbGRzLiBDb2RlIHRvIGF1dG9wdWJsaXNoIHRoaXMgaXMgaW4gYWNjb3VudHNfc2VydmVyLmpzLlxuLy8gWFhYIEFsbG93IHVzZXJzIHRvIGNvbmZpZ3VyZSB0aGlzIGNvbGxlY3Rpb24gbmFtZS5cblxuLyoqXG4gKiBAc3VtbWFyeSBBIFtNb25nby5Db2xsZWN0aW9uXSgjY29sbGVjdGlvbnMpIGNvbnRhaW5pbmcgdXNlciBkb2N1bWVudHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEB0eXBlIHtNb25nby5Db2xsZWN0aW9ufVxuICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuKi9cbk1ldGVvci51c2VycyA9IEFjY291bnRzLnVzZXJzO1xuXG5leHBvcnQge1xuICAvLyBTaW5jZSB0aGlzIGZpbGUgaXMgdGhlIG1haW4gbW9kdWxlIGZvciB0aGUgc2VydmVyIHZlcnNpb24gb2YgdGhlXG4gIC8vIGFjY291bnRzLWJhc2UgcGFja2FnZSwgcHJvcGVydGllcyBvZiBub24tZW50cnktcG9pbnQgbW9kdWxlcyBuZWVkIHRvXG4gIC8vIGJlIHJlLWV4cG9ydGVkIGluIG9yZGVyIHRvIGJlIGFjY2Vzc2libGUgdG8gbW9kdWxlcyB0aGF0IGltcG9ydCB0aGVcbiAgLy8gYWNjb3VudHMtYmFzZSBwYWNrYWdlLlxuICBBY2NvdW50c1NlcnZlclxufTtcbiIsIi8qKlxuICogQHN1bW1hcnkgU3VwZXItY29uc3RydWN0b3IgZm9yIEFjY291bnRzQ2xpZW50IGFuZCBBY2NvdW50c1NlcnZlci5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzIEFjY291bnRzQ29tbW9uXG4gKiBAaW5zdGFuY2VuYW1lIGFjY291bnRzQ2xpZW50T3JTZXJ2ZXJcbiAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IGFuIG9iamVjdCB3aXRoIGZpZWxkczpcbiAqIC0gY29ubmVjdGlvbiB7T2JqZWN0fSBPcHRpb25hbCBERFAgY29ubmVjdGlvbiB0byByZXVzZS5cbiAqIC0gZGRwVXJsIHtTdHJpbmd9IE9wdGlvbmFsIFVSTCBmb3IgY3JlYXRpbmcgYSBuZXcgRERQIGNvbm5lY3Rpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBBY2NvdW50c0NvbW1vbiB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAvLyBDdXJyZW50bHkgdGhpcyBpcyByZWFkIGRpcmVjdGx5IGJ5IHBhY2thZ2VzIGxpa2UgYWNjb3VudHMtcGFzc3dvcmRcbiAgICAvLyBhbmQgYWNjb3VudHMtdWktdW5zdHlsZWQuXG4gICAgdGhpcy5fb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gTm90ZSB0aGF0IHNldHRpbmcgdGhpcy5jb25uZWN0aW9uID0gbnVsbCBjYXVzZXMgdGhpcy51c2VycyB0byBiZSBhXG4gICAgLy8gTG9jYWxDb2xsZWN0aW9uLCB3aGljaCBpcyBub3Qgd2hhdCB3ZSB3YW50LlxuICAgIHRoaXMuY29ubmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9pbml0Q29ubmVjdGlvbihvcHRpb25zIHx8IHt9KTtcblxuICAgIC8vIFRoZXJlIGlzIGFuIGFsbG93IGNhbGwgaW4gYWNjb3VudHNfc2VydmVyLmpzIHRoYXQgcmVzdHJpY3RzIHdyaXRlcyB0b1xuICAgIC8vIHRoaXMgY29sbGVjdGlvbi5cbiAgICB0aGlzLnVzZXJzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJ1c2Vyc1wiLCB7XG4gICAgICBfcHJldmVudEF1dG9wdWJsaXNoOiB0cnVlLFxuICAgICAgY29ubmVjdGlvbjogdGhpcy5jb25uZWN0aW9uXG4gICAgfSk7XG5cbiAgICAvLyBDYWxsYmFjayBleGNlcHRpb25zIGFyZSBwcmludGVkIHdpdGggTWV0ZW9yLl9kZWJ1ZyBhbmQgaWdub3JlZC5cbiAgICB0aGlzLl9vbkxvZ2luSG9vayA9IG5ldyBIb29rKHtcbiAgICAgIGJpbmRFbnZpcm9ubWVudDogZmFsc2UsXG4gICAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbkxvZ2luIGNhbGxiYWNrXCJcbiAgICB9KTtcblxuICAgIHRoaXMuX29uTG9naW5GYWlsdXJlSG9vayA9IG5ldyBIb29rKHtcbiAgICAgIGJpbmRFbnZpcm9ubWVudDogZmFsc2UsXG4gICAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbkxvZ2luRmFpbHVyZSBjYWxsYmFja1wiXG4gICAgfSk7XG5cbiAgICB0aGlzLl9vbkxvZ291dEhvb2sgPSBuZXcgSG9vayh7XG4gICAgICBiaW5kRW52aXJvbm1lbnQ6IGZhbHNlLFxuICAgICAgZGVidWdQcmludEV4Y2VwdGlvbnM6IFwib25Mb2dvdXQgY2FsbGJhY2tcIlxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEdldCB0aGUgY3VycmVudCB1c2VyIGlkLCBvciBgbnVsbGAgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4uIEEgcmVhY3RpdmUgZGF0YSBzb3VyY2UuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKi9cbiAgdXNlcklkKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInVzZXJJZCBtZXRob2Qgbm90IGltcGxlbWVudGVkXCIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEdldCB0aGUgY3VycmVudCB1c2VyIHJlY29yZCwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLiBBIHJlYWN0aXZlIGRhdGEgc291cmNlLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICovXG4gIHVzZXIoKSB7XG4gICAgdmFyIHVzZXJJZCA9IHRoaXMudXNlcklkKCk7XG4gICAgcmV0dXJuIHVzZXJJZCA/IHRoaXMudXNlcnMuZmluZE9uZSh1c2VySWQpIDogbnVsbDtcbiAgfVxuXG4gIC8vIFNldCB1cCBjb25maWcgZm9yIHRoZSBhY2NvdW50cyBzeXN0ZW0uIENhbGwgdGhpcyBvbiBib3RoIHRoZSBjbGllbnRcbiAgLy8gYW5kIHRoZSBzZXJ2ZXIuXG4gIC8vXG4gIC8vIE5vdGUgdGhhdCB0aGlzIG1ldGhvZCBnZXRzIG92ZXJyaWRkZW4gb24gQWNjb3VudHNTZXJ2ZXIucHJvdG90eXBlLCBidXRcbiAgLy8gdGhlIG92ZXJyaWRpbmcgbWV0aG9kIGNhbGxzIHRoZSBvdmVycmlkZGVuIG1ldGhvZC5cbiAgLy9cbiAgLy8gWFhYIHdlIHNob3VsZCBhZGQgc29tZSBlbmZvcmNlbWVudCB0aGF0IHRoaXMgaXMgY2FsbGVkIG9uIGJvdGggdGhlXG4gIC8vIGNsaWVudCBhbmQgdGhlIHNlcnZlci4gT3RoZXJ3aXNlLCBhIHVzZXIgY2FuXG4gIC8vICdmb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb24nIG9ubHkgb24gdGhlIGNsaWVudCBhbmQgd2hpbGUgaXQgbG9va3NcbiAgLy8gbGlrZSB0aGVpciBhcHAgaXMgc2VjdXJlLCB0aGUgc2VydmVyIHdpbGwgc3RpbGwgYWNjZXB0IGNyZWF0ZVVzZXJcbiAgLy8gY2FsbHMuIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy84MjhcbiAgLy9cbiAgLy8gQHBhcmFtIG9wdGlvbnMge09iamVjdH0gYW4gb2JqZWN0IHdpdGggZmllbGRzOlxuICAvLyAtIHNlbmRWZXJpZmljYXRpb25FbWFpbCB7Qm9vbGVhbn1cbiAgLy8gICAgIFNlbmQgZW1haWwgYWRkcmVzcyB2ZXJpZmljYXRpb24gZW1haWxzIHRvIG5ldyB1c2VycyBjcmVhdGVkIGZyb21cbiAgLy8gICAgIGNsaWVudCBzaWdudXBzLlxuICAvLyAtIGZvcmJpZENsaWVudEFjY291bnRDcmVhdGlvbiB7Qm9vbGVhbn1cbiAgLy8gICAgIERvIG5vdCBhbGxvdyBjbGllbnRzIHRvIGNyZWF0ZSBhY2NvdW50cyBkaXJlY3RseS5cbiAgLy8gLSByZXN0cmljdENyZWF0aW9uQnlFbWFpbERvbWFpbiB7RnVuY3Rpb24gb3IgU3RyaW5nfVxuICAvLyAgICAgUmVxdWlyZSBjcmVhdGVkIHVzZXJzIHRvIGhhdmUgYW4gZW1haWwgbWF0Y2hpbmcgdGhlIGZ1bmN0aW9uIG9yXG4gIC8vICAgICBoYXZpbmcgdGhlIHN0cmluZyBhcyBkb21haW4uXG4gIC8vIC0gbG9naW5FeHBpcmF0aW9uSW5EYXlzIHtOdW1iZXJ9XG4gIC8vICAgICBOdW1iZXIgb2YgZGF5cyBzaW5jZSBsb2dpbiB1bnRpbCBhIHVzZXIgaXMgbG9nZ2VkIG91dCAobG9naW4gdG9rZW5cbiAgLy8gICAgIGV4cGlyZXMpLlxuICAvLyAtIHBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb25JbkRheXMge051bWJlcn1cbiAgLy8gICAgIE51bWJlciBvZiBkYXlzIHNpbmNlIHBhc3N3b3JkIHJlc2V0IHRva2VuIGNyZWF0aW9uIHVudGlsIHRoZVxuICAvLyAgICAgdG9rZW4gY2FubnQgYmUgdXNlZCBhbnkgbG9uZ2VyIChwYXNzd29yZCByZXNldCB0b2tlbiBleHBpcmVzKS5cbiAgLy8gLSBhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIHtCb29sZWFufVxuICAvLyAgICAgUmV0dXJuIGFtYmlndW91cyBlcnJvciBtZXNzYWdlcyBmcm9tIGxvZ2luIGZhaWx1cmVzIHRvIHByZXZlbnRcbiAgLy8gICAgIHVzZXIgZW51bWVyYXRpb24uXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFNldCBnbG9iYWwgYWNjb3VudHMgb3B0aW9ucy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5zZW5kVmVyaWZpY2F0aW9uRW1haWwgTmV3IHVzZXJzIHdpdGggYW4gZW1haWwgYWRkcmVzcyB3aWxsIHJlY2VpdmUgYW4gYWRkcmVzcyB2ZXJpZmljYXRpb24gZW1haWwuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5mb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb24gQ2FsbHMgdG8gW2BjcmVhdGVVc2VyYF0oI2FjY291bnRzX2NyZWF0ZXVzZXIpIGZyb20gdGhlIGNsaWVudCB3aWxsIGJlIHJlamVjdGVkLiBJbiBhZGRpdGlvbiwgaWYgeW91IGFyZSB1c2luZyBbYWNjb3VudHMtdWldKCNhY2NvdW50c3VpKSwgdGhlIFwiQ3JlYXRlIGFjY291bnRcIiBsaW5rIHdpbGwgbm90IGJlIGF2YWlsYWJsZS5cbiAgICogQHBhcmFtIHtTdHJpbmcgfCBGdW5jdGlvbn0gb3B0aW9ucy5yZXN0cmljdENyZWF0aW9uQnlFbWFpbERvbWFpbiBJZiBzZXQgdG8gYSBzdHJpbmcsIG9ubHkgYWxsb3dzIG5ldyB1c2VycyBpZiB0aGUgZG9tYWluIHBhcnQgb2YgdGhlaXIgZW1haWwgYWRkcmVzcyBtYXRjaGVzIHRoZSBzdHJpbmcuIElmIHNldCB0byBhIGZ1bmN0aW9uLCBvbmx5IGFsbG93cyBuZXcgdXNlcnMgaWYgdGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZS4gIFRoZSBmdW5jdGlvbiBpcyBwYXNzZWQgdGhlIGZ1bGwgZW1haWwgYWRkcmVzcyBvZiB0aGUgcHJvcG9zZWQgbmV3IHVzZXIuICBXb3JrcyB3aXRoIHBhc3N3b3JkLWJhc2VkIHNpZ24taW4gYW5kIGV4dGVybmFsIHNlcnZpY2VzIHRoYXQgZXhwb3NlIGVtYWlsIGFkZHJlc3NlcyAoR29vZ2xlLCBGYWNlYm9vaywgR2l0SHViKS4gQWxsIGV4aXN0aW5nIHVzZXJzIHN0aWxsIGNhbiBsb2cgaW4gYWZ0ZXIgZW5hYmxpbmcgdGhpcyBvcHRpb24uIEV4YW1wbGU6IGBBY2NvdW50cy5jb25maWcoeyByZXN0cmljdENyZWF0aW9uQnlFbWFpbERvbWFpbjogJ3NjaG9vbC5lZHUnIH0pYC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubG9naW5FeHBpcmF0aW9uSW5EYXlzIFRoZSBudW1iZXIgb2YgZGF5cyBmcm9tIHdoZW4gYSB1c2VyIGxvZ3MgaW4gdW50aWwgdGhlaXIgdG9rZW4gZXhwaXJlcyBhbmQgdGhleSBhcmUgbG9nZ2VkIG91dC4gRGVmYXVsdHMgdG8gOTAuIFNldCB0byBgbnVsbGAgdG8gZGlzYWJsZSBsb2dpbiBleHBpcmF0aW9uLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5vYXV0aFNlY3JldEtleSBXaGVuIHVzaW5nIHRoZSBgb2F1dGgtZW5jcnlwdGlvbmAgcGFja2FnZSwgdGhlIDE2IGJ5dGUga2V5IHVzaW5nIHRvIGVuY3J5cHQgc2Vuc2l0aXZlIGFjY291bnQgY3JlZGVudGlhbHMgaW4gdGhlIGRhdGFiYXNlLCBlbmNvZGVkIGluIGJhc2U2NC4gIFRoaXMgb3B0aW9uIG1heSBvbmx5IGJlIHNwZWNpZmVkIG9uIHRoZSBzZXJ2ZXIuICBTZWUgcGFja2FnZXMvb2F1dGgtZW5jcnlwdGlvbi9SRUFETUUubWQgZm9yIGRldGFpbHMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb25JbkRheXMgVGhlIG51bWJlciBvZiBkYXlzIGZyb20gd2hlbiBhIGxpbmsgdG8gcmVzZXQgcGFzc3dvcmQgaXMgc2VudCB1bnRpbCB0b2tlbiBleHBpcmVzIGFuZCB1c2VyIGNhbid0IHJlc2V0IHBhc3N3b3JkIHdpdGggdGhlIGxpbmsgYW55bW9yZS4gRGVmYXVsdHMgdG8gMy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb25JbkRheXMgVGhlIG51bWJlciBvZiBkYXlzIGZyb20gd2hlbiBhIGxpbmsgdG8gc2V0IGluaXRhbCBwYXNzd29yZCBpcyBzZW50IHVudGlsIHRva2VuIGV4cGlyZXMgYW5kIHVzZXIgY2FuJ3Qgc2V0IHBhc3N3b3JkIHdpdGggdGhlIGxpbmsgYW55bW9yZS4gRGVmYXVsdHMgdG8gMzAuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5hbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIFJldHVybiBhbWJpZ3VvdXMgZXJyb3IgbWVzc2FnZXMgZnJvbSBsb2dpbiBmYWlsdXJlcyB0byBwcmV2ZW50IHVzZXIgZW51bWVyYXRpb24uIERlZmF1bHRzIHRvIGZhbHNlLlxuICAgKi9cbiAgY29uZmlnKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBXZSBkb24ndCB3YW50IHVzZXJzIHRvIGFjY2lkZW50YWxseSBvbmx5IGNhbGwgQWNjb3VudHMuY29uZmlnIG9uIHRoZVxuICAgIC8vIGNsaWVudCwgd2hlcmUgc29tZSBvZiB0aGUgb3B0aW9ucyB3aWxsIGhhdmUgcGFydGlhbCBlZmZlY3RzIChlZyByZW1vdmluZ1xuICAgIC8vIHRoZSBcImNyZWF0ZSBhY2NvdW50XCIgYnV0dG9uIGZyb20gYWNjb3VudHMtdWkgaWYgZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uXG4gICAgLy8gaXMgc2V0LCBvciByZWRpcmVjdGluZyBHb29nbGUgbG9naW4gdG8gYSBzcGVjaWZpYy1kb21haW4gcGFnZSkgd2l0aG91dFxuICAgIC8vIGhhdmluZyB0aGVpciBmdWxsIGVmZmVjdHMuXG4gICAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5hY2NvdW50c0NvbmZpZ0NhbGxlZCA9IHRydWU7XG4gICAgfSBlbHNlIGlmICghX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5hY2NvdW50c0NvbmZpZ0NhbGxlZCkge1xuICAgICAgLy8gWFhYIHdvdWxkIGJlIG5pY2UgdG8gXCJjcmFzaFwiIHRoZSBjbGllbnQgYW5kIHJlcGxhY2UgdGhlIFVJIHdpdGggYW4gZXJyb3JcbiAgICAgIC8vIG1lc3NhZ2UsIGJ1dCB0aGVyZSdzIG5vIHRyaXZpYWwgd2F5IHRvIGRvIHRoaXMuXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiQWNjb3VudHMuY29uZmlnIHdhcyBjYWxsZWQgb24gdGhlIGNsaWVudCBidXQgbm90IG9uIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwic2VydmVyOyBzb21lIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBtYXkgbm90IHRha2UgZWZmZWN0LlwiKTtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIHZhbGlkYXRlIHRoZSBvYXV0aFNlY3JldEtleSBvcHRpb24gYXQgdGhlIHRpbWVcbiAgICAvLyBBY2NvdW50cy5jb25maWcgaXMgY2FsbGVkLiBXZSBhbHNvIGRlbGliZXJhdGVseSBkb24ndCBzdG9yZSB0aGVcbiAgICAvLyBvYXV0aFNlY3JldEtleSBpbiBBY2NvdW50cy5fb3B0aW9ucy5cbiAgICBpZiAoXy5oYXMob3B0aW9ucywgXCJvYXV0aFNlY3JldEtleVwiKSkge1xuICAgICAgaWYgKE1ldGVvci5pc0NsaWVudClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIG9hdXRoU2VjcmV0S2V5IG9wdGlvbiBtYXkgb25seSBiZSBzcGVjaWZpZWQgb24gdGhlIHNlcnZlclwiKTtcbiAgICAgIGlmICghIFBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgb2F1dGgtZW5jcnlwdGlvbiBwYWNrYWdlIG11c3QgYmUgbG9hZGVkIHRvIHNldCBvYXV0aFNlY3JldEtleVwiKTtcbiAgICAgIFBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdLk9BdXRoRW5jcnlwdGlvbi5sb2FkS2V5KG9wdGlvbnMub2F1dGhTZWNyZXRLZXkpO1xuICAgICAgb3B0aW9ucyA9IF8ub21pdChvcHRpb25zLCBcIm9hdXRoU2VjcmV0S2V5XCIpO1xuICAgIH1cblxuICAgIC8vIHZhbGlkYXRlIG9wdGlvbiBrZXlzXG4gICAgdmFyIFZBTElEX0tFWVMgPSBbXCJzZW5kVmVyaWZpY2F0aW9uRW1haWxcIiwgXCJmb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb25cIiwgXCJwYXNzd29yZEVucm9sbFRva2VuRXhwaXJhdGlvbkluRGF5c1wiLFxuICAgICAgICAgICAgICAgICAgICAgIFwicmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW5cIiwgXCJsb2dpbkV4cGlyYXRpb25JbkRheXNcIiwgXCJwYXNzd29yZFJlc2V0VG9rZW5FeHBpcmF0aW9uSW5EYXlzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzXCJdO1xuICAgIF8uZWFjaChfLmtleXMob3B0aW9ucyksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmICghXy5jb250YWlucyhWQUxJRF9LRVlTLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFjY291bnRzLmNvbmZpZzogSW52YWxpZCBrZXk6IFwiICsga2V5KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHNldCB2YWx1ZXMgaW4gQWNjb3VudHMuX29wdGlvbnNcbiAgICBfLmVhY2goVkFMSURfS0VZUywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgIGlmIChrZXkgaW4gc2VsZi5fb3B0aW9ucykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHNldCBgXCIgKyBrZXkgKyBcImAgbW9yZSB0aGFuIG9uY2VcIik7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5fb3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIGFmdGVyIGEgbG9naW4gYXR0ZW1wdCBzdWNjZWVkcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIGxvZ2luIGlzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBvbkxvZ2luKGZ1bmMpIHtcbiAgICByZXR1cm4gdGhpcy5fb25Mb2dpbkhvb2sucmVnaXN0ZXIoZnVuYyk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBjYWxsZWQgYWZ0ZXIgYSBsb2dpbiBhdHRlbXB0IGZhaWxzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBsb2dpbiBoYXMgZmFpbGVkLlxuICAgKi9cbiAgb25Mb2dpbkZhaWx1cmUoZnVuYykge1xuICAgIHJldHVybiB0aGlzLl9vbkxvZ2luRmFpbHVyZUhvb2sucmVnaXN0ZXIoZnVuYyk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBjYWxsZWQgYWZ0ZXIgYSBsb2dvdXQgYXR0ZW1wdCBzdWNjZWVkcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIGxvZ291dCBpcyBzdWNjZXNzZnVsLlxuICAgKi9cbiAgb25Mb2dvdXQoZnVuYykge1xuICAgIHJldHVybiB0aGlzLl9vbkxvZ291dEhvb2sucmVnaXN0ZXIoZnVuYyk7XG4gIH1cblxuICBfaW5pdENvbm5lY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICghIE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZSBjb25uZWN0aW9uIHVzZWQgYnkgdGhlIEFjY291bnRzIHN5c3RlbS4gVGhpcyBpcyB0aGUgY29ubmVjdGlvblxuICAgIC8vIHRoYXQgd2lsbCBnZXQgbG9nZ2VkIGluIGJ5IE1ldGVvci5sb2dpbigpLCBhbmQgdGhpcyBpcyB0aGVcbiAgICAvLyBjb25uZWN0aW9uIHdob3NlIGxvZ2luIHN0YXRlIHdpbGwgYmUgcmVmbGVjdGVkIGJ5IE1ldGVvci51c2VySWQoKS5cbiAgICAvL1xuICAgIC8vIEl0IHdvdWxkIGJlIG11Y2ggcHJlZmVyYWJsZSBmb3IgdGhpcyB0byBiZSBpbiBhY2NvdW50c19jbGllbnQuanMsXG4gICAgLy8gYnV0IGl0IGhhcyB0byBiZSBoZXJlIGJlY2F1c2UgaXQncyBuZWVkZWQgdG8gY3JlYXRlIHRoZVxuICAgIC8vIE1ldGVvci51c2VycyBjb2xsZWN0aW9uLlxuXG4gICAgaWYgKG9wdGlvbnMuY29ubmVjdGlvbikge1xuICAgICAgdGhpcy5jb25uZWN0aW9uID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kZHBVcmwpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbiA9IEREUC5jb25uZWN0KG9wdGlvbnMuZGRwVXJsKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkFDQ09VTlRTX0NPTk5FQ1RJT05fVVJMKSB7XG4gICAgICAvLyBUZW1wb3JhcnksIGludGVybmFsIGhvb2sgdG8gYWxsb3cgdGhlIHNlcnZlciB0byBwb2ludCB0aGUgY2xpZW50XG4gICAgICAvLyB0byBhIGRpZmZlcmVudCBhdXRoZW50aWNhdGlvbiBzZXJ2ZXIuIFRoaXMgaXMgZm9yIGEgdmVyeVxuICAgICAgLy8gcGFydGljdWxhciB1c2UgY2FzZSB0aGF0IGNvbWVzIHVwIHdoZW4gaW1wbGVtZW50aW5nIGEgb2F1dGhcbiAgICAgIC8vIHNlcnZlci4gVW5zdXBwb3J0ZWQgYW5kIG1heSBnbyBhd2F5IGF0IGFueSBwb2ludCBpbiB0aW1lLlxuICAgICAgLy9cbiAgICAgIC8vIFdlIHdpbGwgZXZlbnR1YWxseSBwcm92aWRlIGEgZ2VuZXJhbCB3YXkgdG8gdXNlIGFjY291bnQtYmFzZVxuICAgICAgLy8gYWdhaW5zdCBhbnkgRERQIGNvbm5lY3Rpb24sIG5vdCBqdXN0IG9uZSBzcGVjaWFsIG9uZS5cbiAgICAgIHRoaXMuY29ubmVjdGlvbiA9XG4gICAgICAgIEREUC5jb25uZWN0KF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uQUNDT1VOVFNfQ09OTkVDVElPTl9VUkwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24gPSBNZXRlb3IuY29ubmVjdGlvbjtcbiAgICB9XG4gIH1cblxuICBfZ2V0VG9rZW5MaWZldGltZU1zKCkge1xuICAgIC8vIFdoZW4gbG9naW5FeHBpcmF0aW9uSW5EYXlzIGlzIHNldCB0byBudWxsLCB3ZSdsbCB1c2UgYSByZWFsbHkgaGlnaFxuICAgIC8vIG51bWJlciBvZiBkYXlzIChMT0dJTl9VTkVYUElSQUJMRV9UT0tFTl9EQVlTKSB0byBzaW11bGF0ZSBhblxuICAgIC8vIHVuZXhwaXJpbmcgdG9rZW4uXG4gICAgY29uc3QgbG9naW5FeHBpcmF0aW9uSW5EYXlzID1cbiAgICAgICh0aGlzLl9vcHRpb25zLmxvZ2luRXhwaXJhdGlvbkluRGF5cyA9PT0gbnVsbClcbiAgICAgICAgPyBMT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVNcbiAgICAgICAgOiB0aGlzLl9vcHRpb25zLmxvZ2luRXhwaXJhdGlvbkluRGF5cztcbiAgICByZXR1cm4gKGxvZ2luRXhwaXJhdGlvbkluRGF5c1xuICAgICAgICB8fCBERUZBVUxUX0xPR0lOX0VYUElSQVRJT05fREFZUykgKiAyNCAqIDYwICogNjAgKiAxMDAwO1xuICB9XG5cbiAgX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9vcHRpb25zLnBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb25JbkRheXMgfHxcbiAgICAgICAgICAgIERFRkFVTFRfUEFTU1dPUkRfUkVTRVRfVE9LRU5fRVhQSVJBVElPTl9EQVlTKSAqIDI0ICogNjAgKiA2MCAqIDEwMDA7XG4gIH1cblxuICBfZ2V0UGFzc3dvcmRFbnJvbGxUb2tlbkxpZmV0aW1lTXMoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9vcHRpb25zLnBhc3N3b3JkRW5yb2xsVG9rZW5FeHBpcmF0aW9uSW5EYXlzIHx8XG4gICAgICAgIERFRkFVTFRfUEFTU1dPUkRfRU5ST0xMX1RPS0VOX0VYUElSQVRJT05fREFZUykgKiAyNCAqIDYwICogNjAgKiAxMDAwO1xuICB9XG5cbiAgX3Rva2VuRXhwaXJhdGlvbih3aGVuKSB7XG4gICAgLy8gV2UgcGFzcyB3aGVuIHRocm91Z2ggdGhlIERhdGUgY29uc3RydWN0b3IgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5O1xuICAgIC8vIGB3aGVuYCB1c2VkIHRvIGJlIGEgbnVtYmVyLlxuICAgIHJldHVybiBuZXcgRGF0ZSgobmV3IERhdGUod2hlbikpLmdldFRpbWUoKSArIHRoaXMuX2dldFRva2VuTGlmZXRpbWVNcygpKTtcbiAgfVxuXG4gIF90b2tlbkV4cGlyZXNTb29uKHdoZW4pIHtcbiAgICB2YXIgbWluTGlmZXRpbWVNcyA9IC4xICogdGhpcy5fZ2V0VG9rZW5MaWZldGltZU1zKCk7XG4gICAgdmFyIG1pbkxpZmV0aW1lQ2FwTXMgPSBNSU5fVE9LRU5fTElGRVRJTUVfQ0FQX1NFQ1MgKiAxMDAwO1xuICAgIGlmIChtaW5MaWZldGltZU1zID4gbWluTGlmZXRpbWVDYXBNcylcbiAgICAgIG1pbkxpZmV0aW1lTXMgPSBtaW5MaWZldGltZUNhcE1zO1xuICAgIHJldHVybiBuZXcgRGF0ZSgpID4gKG5ldyBEYXRlKHdoZW4pIC0gbWluTGlmZXRpbWVNcyk7XG4gIH1cbn1cblxudmFyIEFwID0gQWNjb3VudHNDb21tb24ucHJvdG90eXBlO1xuXG4vLyBOb3RlIHRoYXQgQWNjb3VudHMgaXMgZGVmaW5lZCBzZXBhcmF0ZWx5IGluIGFjY291bnRzX2NsaWVudC5qcyBhbmRcbi8vIGFjY291bnRzX3NlcnZlci5qcy5cblxuLyoqXG4gKiBAc3VtbWFyeSBHZXQgdGhlIGN1cnJlbnQgdXNlciBpZCwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLiBBIHJlYWN0aXZlIGRhdGEgc291cmNlLlxuICogQGxvY3VzIEFueXdoZXJlIGJ1dCBwdWJsaXNoIGZ1bmN0aW9uc1xuICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICovXG5NZXRlb3IudXNlcklkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gQWNjb3VudHMudXNlcklkKCk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IEdldCB0aGUgY3VycmVudCB1c2VyIHJlY29yZCwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLiBBIHJlYWN0aXZlIGRhdGEgc291cmNlLlxuICogQGxvY3VzIEFueXdoZXJlIGJ1dCBwdWJsaXNoIGZ1bmN0aW9uc1xuICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICovXG5NZXRlb3IudXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIEFjY291bnRzLnVzZXIoKTtcbn07XG5cbi8vIGhvdyBsb25nIChpbiBkYXlzKSB1bnRpbCBhIGxvZ2luIHRva2VuIGV4cGlyZXNcbmNvbnN0IERFRkFVTFRfTE9HSU5fRVhQSVJBVElPTl9EQVlTID0gOTA7XG4vLyBFeHBvc2UgZm9yIHRlc3RpbmcuXG5BcC5ERUZBVUxUX0xPR0lOX0VYUElSQVRJT05fREFZUyA9IERFRkFVTFRfTE9HSU5fRVhQSVJBVElPTl9EQVlTO1xuXG4vLyBob3cgbG9uZyAoaW4gZGF5cykgdW50aWwgcmVzZXQgcGFzc3dvcmQgdG9rZW4gZXhwaXJlc1xudmFyIERFRkFVTFRfUEFTU1dPUkRfUkVTRVRfVE9LRU5fRVhQSVJBVElPTl9EQVlTID0gMztcbi8vIGhvdyBsb25nIChpbiBkYXlzKSB1bnRpbCBlbnJvbCBwYXNzd29yZCB0b2tlbiBleHBpcmVzXG52YXIgREVGQVVMVF9QQVNTV09SRF9FTlJPTExfVE9LRU5fRVhQSVJBVElPTl9EQVlTID0gMzA7XG4vLyBDbGllbnRzIGRvbid0IHRyeSB0byBhdXRvLWxvZ2luIHdpdGggYSB0b2tlbiB0aGF0IGlzIGdvaW5nIHRvIGV4cGlyZSB3aXRoaW5cbi8vIC4xICogREVGQVVMVF9MT0dJTl9FWFBJUkFUSU9OX0RBWVMsIGNhcHBlZCBhdCBNSU5fVE9LRU5fTElGRVRJTUVfQ0FQX1NFQ1MuXG4vLyBUcmllcyB0byBhdm9pZCBhYnJ1cHQgZGlzY29ubmVjdHMgZnJvbSBleHBpcmluZyB0b2tlbnMuXG52YXIgTUlOX1RPS0VOX0xJRkVUSU1FX0NBUF9TRUNTID0gMzYwMDsgLy8gb25lIGhvdXJcbi8vIGhvdyBvZnRlbiAoaW4gbWlsbGlzZWNvbmRzKSB3ZSBjaGVjayBmb3IgZXhwaXJlZCB0b2tlbnNcbkVYUElSRV9UT0tFTlNfSU5URVJWQUxfTVMgPSA2MDAgKiAxMDAwOyAvLyAxMCBtaW51dGVzXG4vLyBob3cgbG9uZyB3ZSB3YWl0IGJlZm9yZSBsb2dnaW5nIG91dCBjbGllbnRzIHdoZW4gTWV0ZW9yLmxvZ291dE90aGVyQ2xpZW50cyBpc1xuLy8gY2FsbGVkXG5DT05ORUNUSU9OX0NMT1NFX0RFTEFZX01TID0gMTAgKiAxMDAwO1xuXG4vLyBBIGxhcmdlIG51bWJlciBvZiBleHBpcmF0aW9uIGRheXMgKGFwcHJveGltYXRlbHkgMTAwIHllYXJzIHdvcnRoKSB0aGF0IGlzXG4vLyB1c2VkIHdoZW4gY3JlYXRpbmcgdW5leHBpcmluZyB0b2tlbnMuXG5jb25zdCBMT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVMgPSAzNjUgKiAxMDA7XG4vLyBFeHBvc2UgZm9yIHRlc3RpbmcuXG5BcC5MT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVMgPSBMT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVM7XG5cbi8vIGxvZ2luU2VydmljZUNvbmZpZ3VyYXRpb24gYW5kIENvbmZpZ0Vycm9yIGFyZSBtYWludGFpbmVkIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICB2YXIgU2VydmljZUNvbmZpZ3VyYXRpb24gPVxuICAgIFBhY2thZ2VbJ3NlcnZpY2UtY29uZmlndXJhdGlvbiddLlNlcnZpY2VDb25maWd1cmF0aW9uO1xuICBBcC5sb2dpblNlcnZpY2VDb25maWd1cmF0aW9uID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnM7XG4gIEFwLkNvbmZpZ0Vycm9yID0gU2VydmljZUNvbmZpZ3VyYXRpb24uQ29uZmlnRXJyb3I7XG59KTtcblxuLy8gVGhyb3duIHdoZW4gdGhlIHVzZXIgY2FuY2VscyB0aGUgbG9naW4gcHJvY2VzcyAoZWcsIGNsb3NlcyBhbiBvYXV0aFxuLy8gcG9wdXAsIGRlY2xpbmVzIHJldGluYSBzY2FuLCBldGMpXG52YXIgbGNlTmFtZSA9ICdBY2NvdW50cy5Mb2dpbkNhbmNlbGxlZEVycm9yJztcbkFwLkxvZ2luQ2FuY2VsbGVkRXJyb3IgPSBNZXRlb3IubWFrZUVycm9yVHlwZShcbiAgbGNlTmFtZSxcbiAgZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZGVzY3JpcHRpb247XG4gIH1cbik7XG5BcC5Mb2dpbkNhbmNlbGxlZEVycm9yLnByb3RvdHlwZS5uYW1lID0gbGNlTmFtZTtcblxuLy8gVGhpcyBpcyB1c2VkIHRvIHRyYW5zbWl0IHNwZWNpZmljIHN1YmNsYXNzIGVycm9ycyBvdmVyIHRoZSB3aXJlLiBXZSBzaG91bGRcbi8vIGNvbWUgdXAgd2l0aCBhIG1vcmUgZ2VuZXJpYyB3YXkgdG8gZG8gdGhpcyAoZWcsIHdpdGggc29tZSBzb3J0IG9mIHN5bWJvbGljXG4vLyBlcnJvciBjb2RlIHJhdGhlciB0aGFuIGEgbnVtYmVyKS5cbkFwLkxvZ2luQ2FuY2VsbGVkRXJyb3IubnVtZXJpY0Vycm9yID0gMHg4YWNkYzJmO1xuIiwiaW1wb3J0IHtBY2NvdW50c0NvbW1vbn0gZnJvbSBcIi4vYWNjb3VudHNfY29tbW9uLmpzXCI7XG5cbnZhciBBcCA9IEFjY291bnRzQ29tbW9uLnByb3RvdHlwZTtcbnZhciBkZWZhdWx0UmF0ZUxpbWl0ZXJSdWxlSWQ7XG4vLyBSZW1vdmVzIGRlZmF1bHQgcmF0ZSBsaW1pdGluZyBydWxlXG5BcC5yZW1vdmVEZWZhdWx0UmF0ZUxpbWl0ID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCByZXNwID0gRERQUmF0ZUxpbWl0ZXIucmVtb3ZlUnVsZShkZWZhdWx0UmF0ZUxpbWl0ZXJSdWxlSWQpO1xuICBkZWZhdWx0UmF0ZUxpbWl0ZXJSdWxlSWQgPSBudWxsO1xuICByZXR1cm4gcmVzcDtcbn07XG5cbi8vIEFkZCBhIGRlZmF1bHQgcnVsZSBvZiBsaW1pdGluZyBsb2dpbnMsIGNyZWF0aW5nIG5ldyB1c2VycyBhbmQgcGFzc3dvcmQgcmVzZXRcbi8vIHRvIDUgdGltZXMgZXZlcnkgMTAgc2Vjb25kcyBwZXIgY29ubmVjdGlvbi5cbkFwLmFkZERlZmF1bHRSYXRlTGltaXQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghZGVmYXVsdFJhdGVMaW1pdGVyUnVsZUlkKSB7XG4gICAgZGVmYXVsdFJhdGVMaW1pdGVyUnVsZUlkID0gRERQUmF0ZUxpbWl0ZXIuYWRkUnVsZSh7XG4gICAgICB1c2VySWQ6IG51bGwsXG4gICAgICBjbGllbnRBZGRyZXNzOiBudWxsLFxuICAgICAgdHlwZTogJ21ldGhvZCcsXG4gICAgICBuYW1lOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhbJ2xvZ2luJywgJ2NyZWF0ZVVzZXInLCAncmVzZXRQYXNzd29yZCcsXG4gICAgICAgICAgJ2ZvcmdvdFBhc3N3b3JkJ10sIG5hbWUpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3Rpb25JZDogZnVuY3Rpb24gKGNvbm5lY3Rpb25JZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9LCA1LCAxMDAwMCk7XG4gIH1cbn07XG5cbkFwLmFkZERlZmF1bHRSYXRlTGltaXQoKTtcbiIsInZhciBjcnlwdG8gPSBOcG0ucmVxdWlyZSgnY3J5cHRvJyk7XG5cbmltcG9ydCB7QWNjb3VudHNDb21tb259IGZyb20gXCIuL2FjY291bnRzX2NvbW1vbi5qc1wiO1xuXG4vKipcbiAqIEBzdW1tYXJ5IENvbnN0cnVjdG9yIGZvciB0aGUgYEFjY291bnRzYCBuYW1lc3BhY2Ugb24gdGhlIHNlcnZlci5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBjbGFzcyBBY2NvdW50c1NlcnZlclxuICogQGV4dGVuZHMgQWNjb3VudHNDb21tb25cbiAqIEBpbnN0YW5jZW5hbWUgYWNjb3VudHNTZXJ2ZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzZXJ2ZXIgQSBzZXJ2ZXIgb2JqZWN0IHN1Y2ggYXMgYE1ldGVvci5zZXJ2ZXJgLlxuICovXG5leHBvcnQgY2xhc3MgQWNjb3VudHNTZXJ2ZXIgZXh0ZW5kcyBBY2NvdW50c0NvbW1vbiB7XG4gIC8vIE5vdGUgdGhhdCB0aGlzIGNvbnN0cnVjdG9yIGlzIGxlc3MgbGlrZWx5IHRvIGJlIGluc3RhbnRpYXRlZCBtdWx0aXBsZVxuICAvLyB0aW1lcyB0aGFuIHRoZSBgQWNjb3VudHNDbGllbnRgIGNvbnN0cnVjdG9yLCBiZWNhdXNlIGEgc2luZ2xlIHNlcnZlclxuICAvLyBjYW4gcHJvdmlkZSBvbmx5IG9uZSBzZXQgb2YgbWV0aG9kcy5cbiAgY29uc3RydWN0b3Ioc2VydmVyKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuX3NlcnZlciA9IHNlcnZlciB8fCBNZXRlb3Iuc2VydmVyO1xuICAgIC8vIFNldCB1cCB0aGUgc2VydmVyJ3MgbWV0aG9kcywgYXMgaWYgYnkgY2FsbGluZyBNZXRlb3IubWV0aG9kcy5cbiAgICB0aGlzLl9pbml0U2VydmVyTWV0aG9kcygpO1xuXG4gICAgdGhpcy5faW5pdEFjY291bnREYXRhSG9va3MoKTtcblxuICAgIC8vIElmIGF1dG9wdWJsaXNoIGlzIG9uLCBwdWJsaXNoIHRoZXNlIHVzZXIgZmllbGRzLiBMb2dpbiBzZXJ2aWNlXG4gICAgLy8gcGFja2FnZXMgKGVnIGFjY291bnRzLWdvb2dsZSkgYWRkIHRvIHRoZXNlIGJ5IGNhbGxpbmdcbiAgICAvLyBhZGRBdXRvcHVibGlzaEZpZWxkcy4gIE5vdGFibHksIHRoaXMgaXNuJ3QgaW1wbGVtZW50ZWQgd2l0aCBtdWx0aXBsZVxuICAgIC8vIHB1Ymxpc2hlcyBzaW5jZSBERFAgb25seSBtZXJnZXMgb25seSBhY3Jvc3MgdG9wLWxldmVsIGZpZWxkcywgbm90XG4gICAgLy8gc3ViZmllbGRzIChzdWNoIGFzICdzZXJ2aWNlcy5mYWNlYm9vay5hY2Nlc3NUb2tlbicpXG4gICAgdGhpcy5fYXV0b3B1Ymxpc2hGaWVsZHMgPSB7XG4gICAgICBsb2dnZWRJblVzZXI6IFsncHJvZmlsZScsICd1c2VybmFtZScsICdlbWFpbHMnXSxcbiAgICAgIG90aGVyVXNlcnM6IFsncHJvZmlsZScsICd1c2VybmFtZSddXG4gICAgfTtcbiAgICB0aGlzLl9pbml0U2VydmVyUHVibGljYXRpb25zKCk7XG5cbiAgICAvLyBjb25uZWN0aW9uSWQgLT4ge2Nvbm5lY3Rpb24sIGxvZ2luVG9rZW59XG4gICAgdGhpcy5fYWNjb3VudERhdGEgPSB7fTtcblxuICAgIC8vIGNvbm5lY3Rpb24gaWQgLT4gb2JzZXJ2ZSBoYW5kbGUgZm9yIHRoZSBsb2dpbiB0b2tlbiB0aGF0IHRoaXMgY29ubmVjdGlvbiBpc1xuICAgIC8vIGN1cnJlbnRseSBhc3NvY2lhdGVkIHdpdGgsIG9yIGEgbnVtYmVyLiBUaGUgbnVtYmVyIGluZGljYXRlcyB0aGF0IHdlIGFyZSBpblxuICAgIC8vIHRoZSBwcm9jZXNzIG9mIHNldHRpbmcgdXAgdGhlIG9ic2VydmUgKHVzaW5nIGEgbnVtYmVyIGluc3RlYWQgb2YgYSBzaW5nbGVcbiAgICAvLyBzZW50aW5lbCBhbGxvd3MgbXVsdGlwbGUgYXR0ZW1wdHMgdG8gc2V0IHVwIHRoZSBvYnNlcnZlIHRvIGlkZW50aWZ5IHdoaWNoXG4gICAgLy8gb25lIHdhcyB0aGVpcnMpLlxuICAgIHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zID0ge307XG4gICAgdGhpcy5fbmV4dFVzZXJPYnNlcnZlTnVtYmVyID0gMTsgIC8vIGZvciB0aGUgbnVtYmVyIGRlc2NyaWJlZCBhYm92ZS5cblxuICAgIC8vIGxpc3Qgb2YgYWxsIHJlZ2lzdGVyZWQgaGFuZGxlcnMuXG4gICAgdGhpcy5fbG9naW5IYW5kbGVycyA9IFtdO1xuXG4gICAgc2V0dXBVc2Vyc0NvbGxlY3Rpb24odGhpcy51c2Vycyk7XG4gICAgc2V0dXBEZWZhdWx0TG9naW5IYW5kbGVycyh0aGlzKTtcbiAgICBzZXRFeHBpcmVUb2tlbnNJbnRlcnZhbCh0aGlzKTtcblxuICAgIHRoaXMuX3ZhbGlkYXRlTG9naW5Ib29rID0gbmV3IEhvb2soeyBiaW5kRW52aXJvbm1lbnQ6IGZhbHNlIH0pO1xuICAgIHRoaXMuX3ZhbGlkYXRlTmV3VXNlckhvb2tzID0gW1xuICAgICAgZGVmYXVsdFZhbGlkYXRlTmV3VXNlckhvb2suYmluZCh0aGlzKVxuICAgIF07XG5cbiAgICB0aGlzLl9kZWxldGVTYXZlZFRva2Vuc0ZvckFsbFVzZXJzT25TdGFydHVwKCk7XG5cbiAgICB0aGlzLl9za2lwQ2FzZUluc2Vuc2l0aXZlQ2hlY2tzRm9yVGVzdCA9IHt9O1xuICB9XG5cbiAgLy8vXG4gIC8vLyBDVVJSRU5UIFVTRVJcbiAgLy8vXG5cbiAgLy8gQG92ZXJyaWRlIG9mIFwiYWJzdHJhY3RcIiBub24taW1wbGVtZW50YXRpb24gaW4gYWNjb3VudHNfY29tbW9uLmpzXG4gIHVzZXJJZCgpIHtcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaWYgY2FsbGVkIGluc2lkZSBhIG1ldGhvZCBvciBhIHB1YmljYXRpb24uXG4gICAgLy8gVXNpbmcgYW55IG9mIHRoZSBpbmZvbWF0aW9uIGZyb20gTWV0ZW9yLnVzZXIoKSBpbiBhIG1ldGhvZCBvclxuICAgIC8vIHB1Ymxpc2ggZnVuY3Rpb24gd2lsbCBhbHdheXMgdXNlIHRoZSB2YWx1ZSBmcm9tIHdoZW4gdGhlIGZ1bmN0aW9uIGZpcnN0XG4gICAgLy8gcnVucy4gVGhpcyBpcyBsaWtlbHkgbm90IHdoYXQgdGhlIHVzZXIgZXhwZWN0cy4gVGhlIHdheSB0byBtYWtlIHRoaXMgd29ya1xuICAgIC8vIGluIGEgbWV0aG9kIG9yIHB1Ymxpc2ggZnVuY3Rpb24gaXMgdG8gZG8gTWV0ZW9yLmZpbmQodGhpcy51c2VySWQpLm9ic2VydmVcbiAgICAvLyBhbmQgcmVjb21wdXRlIHdoZW4gdGhlIHVzZXIgcmVjb3JkIGNoYW5nZXMuXG4gICAgY29uc3QgY3VycmVudEludm9jYXRpb24gPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpIHx8IEREUC5fQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi5nZXQoKTtcbiAgICBpZiAoIWN1cnJlbnRJbnZvY2F0aW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0ZW9yLnVzZXJJZCBjYW4gb25seSBiZSBpbnZva2VkIGluIG1ldGhvZCBjYWxscyBvciBwdWJsaWNhdGlvbnMuXCIpO1xuICAgIHJldHVybiBjdXJyZW50SW52b2NhdGlvbi51c2VySWQ7XG4gIH1cblxuICAvLy9cbiAgLy8vIExPR0lOIEhPT0tTXG4gIC8vL1xuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBWYWxpZGF0ZSBsb2dpbiBhdHRlbXB0cy5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIENhbGxlZCB3aGVuZXZlciBhIGxvZ2luIGlzIGF0dGVtcHRlZCAoZWl0aGVyIHN1Y2Nlc3NmdWwgb3IgdW5zdWNjZXNzZnVsKS4gIEEgbG9naW4gY2FuIGJlIGFib3J0ZWQgYnkgcmV0dXJuaW5nIGEgZmFsc3kgdmFsdWUgb3IgdGhyb3dpbmcgYW4gZXhjZXB0aW9uLlxuICAgKi9cbiAgdmFsaWRhdGVMb2dpbkF0dGVtcHQoZnVuYykge1xuICAgIC8vIEV4Y2VwdGlvbnMgaW5zaWRlIHRoZSBob29rIGNhbGxiYWNrIGFyZSBwYXNzZWQgdXAgdG8gdXMuXG4gICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRlTG9naW5Ib29rLnJlZ2lzdGVyKGZ1bmMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFNldCByZXN0cmljdGlvbnMgb24gbmV3IHVzZXIgY3JlYXRpb24uXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBDYWxsZWQgd2hlbmV2ZXIgYSBuZXcgdXNlciBpcyBjcmVhdGVkLiBUYWtlcyB0aGUgbmV3IHVzZXIgb2JqZWN0LCBhbmQgcmV0dXJucyB0cnVlIHRvIGFsbG93IHRoZSBjcmVhdGlvbiBvciBmYWxzZSB0byBhYm9ydC5cbiAgICovXG4gIHZhbGlkYXRlTmV3VXNlcihmdW5jKSB7XG4gICAgdGhpcy5fdmFsaWRhdGVOZXdVc2VySG9va3MucHVzaChmdW5jKTtcbiAgfVxuXG4gIC8vL1xuICAvLy8gQ1JFQVRFIFVTRVIgSE9PS1NcbiAgLy8vXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEN1c3RvbWl6ZSBuZXcgdXNlciBjcmVhdGlvbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIENhbGxlZCB3aGVuZXZlciBhIG5ldyB1c2VyIGlzIGNyZWF0ZWQuIFJldHVybiB0aGUgbmV3IHVzZXIgb2JqZWN0LCBvciB0aHJvdyBhbiBgRXJyb3JgIHRvIGFib3J0IHRoZSBjcmVhdGlvbi5cbiAgICovXG4gIG9uQ3JlYXRlVXNlcihmdW5jKSB7XG4gICAgaWYgKHRoaXMuX29uQ3JlYXRlVXNlckhvb2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgb25DcmVhdGVVc2VyIG9uY2VcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fb25DcmVhdGVVc2VySG9vayA9IGZ1bmM7XG4gIH1cbn07XG5cbnZhciBBcCA9IEFjY291bnRzU2VydmVyLnByb3RvdHlwZTtcblxuLy8gR2l2ZSBlYWNoIGxvZ2luIGhvb2sgY2FsbGJhY2sgYSBmcmVzaCBjbG9uZWQgY29weSBvZiB0aGUgYXR0ZW1wdFxuLy8gb2JqZWN0LCBidXQgZG9uJ3QgY2xvbmUgdGhlIGNvbm5lY3Rpb24uXG4vL1xuZnVuY3Rpb24gY2xvbmVBdHRlbXB0V2l0aENvbm5lY3Rpb24oY29ubmVjdGlvbiwgYXR0ZW1wdCkge1xuICB2YXIgY2xvbmVkQXR0ZW1wdCA9IEVKU09OLmNsb25lKGF0dGVtcHQpO1xuICBjbG9uZWRBdHRlbXB0LmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICByZXR1cm4gY2xvbmVkQXR0ZW1wdDtcbn1cblxuQXAuX3ZhbGlkYXRlTG9naW4gPSBmdW5jdGlvbiAoY29ubmVjdGlvbiwgYXR0ZW1wdCkge1xuICB0aGlzLl92YWxpZGF0ZUxvZ2luSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciByZXQ7XG4gICAgdHJ5IHtcbiAgICAgIHJldCA9IGNhbGxiYWNrKGNsb25lQXR0ZW1wdFdpdGhDb25uZWN0aW9uKGNvbm5lY3Rpb24sIGF0dGVtcHQpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGF0dGVtcHQuYWxsb3dlZCA9IGZhbHNlO1xuICAgICAgLy8gWFhYIHRoaXMgbWVhbnMgdGhlIGxhc3QgdGhyb3duIGVycm9yIG92ZXJyaWRlcyBwcmV2aW91cyBlcnJvclxuICAgICAgLy8gbWVzc2FnZXMuIE1heWJlIHRoaXMgaXMgc3VycHJpc2luZyB0byB1c2VycyBhbmQgd2Ugc2hvdWxkIG1ha2VcbiAgICAgIC8vIG92ZXJyaWRpbmcgZXJyb3JzIG1vcmUgZXhwbGljaXQuIChzZWVcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy8xOTYwKVxuICAgICAgYXR0ZW1wdC5lcnJvciA9IGU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCEgcmV0KSB7XG4gICAgICBhdHRlbXB0LmFsbG93ZWQgPSBmYWxzZTtcbiAgICAgIC8vIGRvbid0IG92ZXJyaWRlIGEgc3BlY2lmaWMgZXJyb3IgcHJvdmlkZWQgYnkgYSBwcmV2aW91c1xuICAgICAgLy8gdmFsaWRhdG9yIG9yIHRoZSBpbml0aWFsIGF0dGVtcHQgKGVnIFwiaW5jb3JyZWN0IHBhc3N3b3JkXCIpLlxuICAgICAgaWYgKCFhdHRlbXB0LmVycm9yKVxuICAgICAgICBhdHRlbXB0LmVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiTG9naW4gZm9yYmlkZGVuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59O1xuXG5cbkFwLl9zdWNjZXNzZnVsTG9naW4gPSBmdW5jdGlvbiAoY29ubmVjdGlvbiwgYXR0ZW1wdCkge1xuICB0aGlzLl9vbkxvZ2luSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrKGNsb25lQXR0ZW1wdFdpdGhDb25uZWN0aW9uKGNvbm5lY3Rpb24sIGF0dGVtcHQpKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59O1xuXG5BcC5fZmFpbGVkTG9naW4gPSBmdW5jdGlvbiAoY29ubmVjdGlvbiwgYXR0ZW1wdCkge1xuICB0aGlzLl9vbkxvZ2luRmFpbHVyZUhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayhjbG9uZUF0dGVtcHRXaXRoQ29ubmVjdGlvbihjb25uZWN0aW9uLCBhdHRlbXB0KSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xufTtcblxuQXAuX3N1Y2Nlc3NmdWxMb2dvdXQgPSBmdW5jdGlvbiAoY29ubmVjdGlvbiwgdXNlcklkKSB7XG4gIGNvbnN0IHVzZXIgPSB1c2VySWQgJiYgdGhpcy51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gIHRoaXMuX29uTG9nb3V0SG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrKHsgdXNlciwgY29ubmVjdGlvbiB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59O1xuXG4vLy9cbi8vLyBMT0dJTiBNRVRIT0RTXG4vLy9cblxuLy8gTG9naW4gbWV0aG9kcyByZXR1cm4gdG8gdGhlIGNsaWVudCBhbiBvYmplY3QgY29udGFpbmluZyB0aGVzZVxuLy8gZmllbGRzIHdoZW4gdGhlIHVzZXIgd2FzIGxvZ2dlZCBpbiBzdWNjZXNzZnVsbHk6XG4vL1xuLy8gICBpZDogdXNlcklkXG4vLyAgIHRva2VuOiAqXG4vLyAgIHRva2VuRXhwaXJlczogKlxuLy9cbi8vIHRva2VuRXhwaXJlcyBpcyBvcHRpb25hbCBhbmQgaW50ZW5kcyB0byBwcm92aWRlIGEgaGludCB0byB0aGVcbi8vIGNsaWVudCBhcyB0byB3aGVuIHRoZSB0b2tlbiB3aWxsIGV4cGlyZS4gSWYgbm90IHByb3ZpZGVkLCB0aGVcbi8vIGNsaWVudCB3aWxsIGNhbGwgQWNjb3VudHMuX3Rva2VuRXhwaXJhdGlvbiwgcGFzc2luZyBpdCB0aGUgZGF0ZVxuLy8gdGhhdCBpdCByZWNlaXZlZCB0aGUgdG9rZW4uXG4vL1xuLy8gVGhlIGxvZ2luIG1ldGhvZCB3aWxsIHRocm93IGFuIGVycm9yIGJhY2sgdG8gdGhlIGNsaWVudCBpZiB0aGUgdXNlclxuLy8gZmFpbGVkIHRvIGxvZyBpbi5cbi8vXG4vL1xuLy8gTG9naW4gaGFuZGxlcnMgYW5kIHNlcnZpY2Ugc3BlY2lmaWMgbG9naW4gbWV0aG9kcyBzdWNoIGFzXG4vLyBgY3JlYXRlVXNlcmAgaW50ZXJuYWxseSByZXR1cm4gYSBgcmVzdWx0YCBvYmplY3QgY29udGFpbmluZyB0aGVzZVxuLy8gZmllbGRzOlxuLy9cbi8vICAgdHlwZTpcbi8vICAgICBvcHRpb25hbCBzdHJpbmc7IHRoZSBzZXJ2aWNlIG5hbWUsIG92ZXJyaWRlcyB0aGUgaGFuZGxlclxuLy8gICAgIGRlZmF1bHQgaWYgcHJlc2VudC5cbi8vXG4vLyAgIGVycm9yOlxuLy8gICAgIGV4Y2VwdGlvbjsgaWYgdGhlIHVzZXIgaXMgbm90IGFsbG93ZWQgdG8gbG9naW4sIHRoZSByZWFzb24gd2h5LlxuLy9cbi8vICAgdXNlcklkOlxuLy8gICAgIHN0cmluZzsgdGhlIHVzZXIgaWQgb2YgdGhlIHVzZXIgYXR0ZW1wdGluZyB0byBsb2dpbiAoaWZcbi8vICAgICBrbm93biksIHJlcXVpcmVkIGZvciBhbiBhbGxvd2VkIGxvZ2luLlxuLy9cbi8vICAgb3B0aW9uczpcbi8vICAgICBvcHRpb25hbCBvYmplY3QgbWVyZ2VkIGludG8gdGhlIHJlc3VsdCByZXR1cm5lZCBieSB0aGUgbG9naW5cbi8vICAgICBtZXRob2Q7IHVzZWQgYnkgSEFNSyBmcm9tIFNSUC5cbi8vXG4vLyAgIHN0YW1wZWRMb2dpblRva2VuOlxuLy8gICAgIG9wdGlvbmFsIG9iamVjdCB3aXRoIGB0b2tlbmAgYW5kIGB3aGVuYCBpbmRpY2F0aW5nIHRoZSBsb2dpblxuLy8gICAgIHRva2VuIGlzIGFscmVhZHkgcHJlc2VudCBpbiB0aGUgZGF0YWJhc2UsIHJldHVybmVkIGJ5IHRoZVxuLy8gICAgIFwicmVzdW1lXCIgbG9naW4gaGFuZGxlci5cbi8vXG4vLyBGb3IgY29udmVuaWVuY2UsIGxvZ2luIG1ldGhvZHMgY2FuIGFsc28gdGhyb3cgYW4gZXhjZXB0aW9uLCB3aGljaFxuLy8gaXMgY29udmVydGVkIGludG8gYW4ge2Vycm9yfSByZXN1bHQuICBIb3dldmVyLCBpZiB0aGUgaWQgb2YgdGhlXG4vLyB1c2VyIGF0dGVtcHRpbmcgdGhlIGxvZ2luIGlzIGtub3duLCBhIHt1c2VySWQsIGVycm9yfSByZXN1bHQgc2hvdWxkXG4vLyBiZSByZXR1cm5lZCBpbnN0ZWFkIHNpbmNlIHRoZSB1c2VyIGlkIGlzIG5vdCBjYXB0dXJlZCB3aGVuIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duLlxuLy9cbi8vIFRoaXMgaW50ZXJuYWwgYHJlc3VsdGAgb2JqZWN0IGlzIGF1dG9tYXRpY2FsbHkgY29udmVydGVkIGludG8gdGhlXG4vLyBwdWJsaWMge2lkLCB0b2tlbiwgdG9rZW5FeHBpcmVzfSBvYmplY3QgcmV0dXJuZWQgdG8gdGhlIGNsaWVudC5cblxuXG4vLyBUcnkgYSBsb2dpbiBtZXRob2QsIGNvbnZlcnRpbmcgdGhyb3duIGV4Y2VwdGlvbnMgaW50byBhbiB7ZXJyb3J9XG4vLyByZXN1bHQuICBUaGUgYHR5cGVgIGFyZ3VtZW50IGlzIGEgZGVmYXVsdCwgaW5zZXJ0ZWQgaW50byB0aGUgcmVzdWx0XG4vLyBvYmplY3QgaWYgbm90IGV4cGxpY2l0bHkgcmV0dXJuZWQuXG4vL1xudmFyIHRyeUxvZ2luTWV0aG9kID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHZhciByZXN1bHQ7XG4gIHRyeSB7XG4gICAgcmVzdWx0ID0gZm4oKTtcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIHJlc3VsdCA9IHtlcnJvcjogZX07XG4gIH1cblxuICBpZiAocmVzdWx0ICYmICFyZXN1bHQudHlwZSAmJiB0eXBlKVxuICAgIHJlc3VsdC50eXBlID0gdHlwZTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vLyBMb2cgaW4gYSB1c2VyIG9uIGEgY29ubmVjdGlvbi5cbi8vXG4vLyBXZSB1c2UgdGhlIG1ldGhvZCBpbnZvY2F0aW9uIHRvIHNldCB0aGUgdXNlciBpZCBvbiB0aGUgY29ubmVjdGlvbixcbi8vIG5vdCB0aGUgY29ubmVjdGlvbiBvYmplY3QgZGlyZWN0bHkuIHNldFVzZXJJZCBpcyB0aWVkIHRvIG1ldGhvZHMgdG9cbi8vIGVuZm9yY2UgY2xlYXIgb3JkZXJpbmcgb2YgbWV0aG9kIGFwcGxpY2F0aW9uICh1c2luZyB3YWl0IG1ldGhvZHMgb25cbi8vIHRoZSBjbGllbnQsIGFuZCBhIG5vIHNldFVzZXJJZCBhZnRlciB1bmJsb2NrIHJlc3RyaWN0aW9uIG9uIHRoZVxuLy8gc2VydmVyKVxuLy9cbi8vIFRoZSBgc3RhbXBlZExvZ2luVG9rZW5gIHBhcmFtZXRlciBpcyBvcHRpb25hbC4gIFdoZW4gcHJlc2VudCwgaXRcbi8vIGluZGljYXRlcyB0aGF0IHRoZSBsb2dpbiB0b2tlbiBoYXMgYWxyZWFkeSBiZWVuIGluc2VydGVkIGludG8gdGhlXG4vLyBkYXRhYmFzZSBhbmQgZG9lc24ndCBuZWVkIHRvIGJlIGluc2VydGVkIGFnYWluLiAgKEl0J3MgdXNlZCBieSB0aGVcbi8vIFwicmVzdW1lXCIgbG9naW4gaGFuZGxlcikuXG5BcC5fbG9naW5Vc2VyID0gZnVuY3Rpb24gKG1ldGhvZEludm9jYXRpb24sIHVzZXJJZCwgc3RhbXBlZExvZ2luVG9rZW4pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHN0YW1wZWRMb2dpblRva2VuKSB7XG4gICAgc3RhbXBlZExvZ2luVG9rZW4gPSBzZWxmLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG4gICAgc2VsZi5faW5zZXJ0TG9naW5Ub2tlbih1c2VySWQsIHN0YW1wZWRMb2dpblRva2VuKTtcbiAgfVxuXG4gIC8vIFRoaXMgb3JkZXIgKGFuZCB0aGUgYXZvaWRhbmNlIG9mIHlpZWxkcykgaXMgaW1wb3J0YW50IHRvIG1ha2VcbiAgLy8gc3VyZSB0aGF0IHdoZW4gcHVibGlzaCBmdW5jdGlvbnMgYXJlIHJlcnVuLCB0aGV5IHNlZSBhXG4gIC8vIGNvbnNpc3RlbnQgdmlldyBvZiB0aGUgd29ybGQ6IHRoZSB1c2VySWQgaXMgc2V0IGFuZCBtYXRjaGVzXG4gIC8vIHRoZSBsb2dpbiB0b2tlbiBvbiB0aGUgY29ubmVjdGlvbiAobm90IHRoYXQgdGhlcmUgaXNcbiAgLy8gY3VycmVudGx5IGEgcHVibGljIEFQSSBmb3IgcmVhZGluZyB0aGUgbG9naW4gdG9rZW4gb24gYVxuICAvLyBjb25uZWN0aW9uKS5cbiAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3NldExvZ2luVG9rZW4oXG4gICAgICB1c2VySWQsXG4gICAgICBtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sXG4gICAgICBzZWxmLl9oYXNoTG9naW5Ub2tlbihzdGFtcGVkTG9naW5Ub2tlbi50b2tlbilcbiAgICApO1xuICB9KTtcblxuICBtZXRob2RJbnZvY2F0aW9uLnNldFVzZXJJZCh1c2VySWQpO1xuXG4gIHJldHVybiB7XG4gICAgaWQ6IHVzZXJJZCxcbiAgICB0b2tlbjogc3RhbXBlZExvZ2luVG9rZW4udG9rZW4sXG4gICAgdG9rZW5FeHBpcmVzOiBzZWxmLl90b2tlbkV4cGlyYXRpb24oc3RhbXBlZExvZ2luVG9rZW4ud2hlbilcbiAgfTtcbn07XG5cblxuLy8gQWZ0ZXIgYSBsb2dpbiBtZXRob2QgaGFzIGNvbXBsZXRlZCwgY2FsbCB0aGUgbG9naW4gaG9va3MuICBOb3RlXG4vLyB0aGF0IGBhdHRlbXB0TG9naW5gIGlzIGNhbGxlZCBmb3IgKmFsbCogbG9naW4gYXR0ZW1wdHMsIGV2ZW4gb25lc1xuLy8gd2hpY2ggYXJlbid0IHN1Y2Nlc3NmdWwgKHN1Y2ggYXMgYW4gaW52YWxpZCBwYXNzd29yZCwgZXRjKS5cbi8vXG4vLyBJZiB0aGUgbG9naW4gaXMgYWxsb3dlZCBhbmQgaXNuJ3QgYWJvcnRlZCBieSBhIHZhbGlkYXRlIGxvZ2luIGhvb2tcbi8vIGNhbGxiYWNrLCBsb2cgaW4gdGhlIHVzZXIuXG4vL1xuQXAuX2F0dGVtcHRMb2dpbiA9IGZ1bmN0aW9uIChcbiAgbWV0aG9kSW52b2NhdGlvbixcbiAgbWV0aG9kTmFtZSxcbiAgbWV0aG9kQXJncyxcbiAgcmVzdWx0XG4pIHtcbiAgaWYgKCFyZXN1bHQpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwicmVzdWx0IGlzIHJlcXVpcmVkXCIpO1xuXG4gIC8vIFhYWCBBIHByb2dyYW1taW5nIGVycm9yIGluIGEgbG9naW4gaGFuZGxlciBjYW4gbGVhZCB0byB0aGlzIG9jY3VyaW5nLCBhbmRcbiAgLy8gdGhlbiB3ZSBkb24ndCBjYWxsIG9uTG9naW4gb3Igb25Mb2dpbkZhaWx1cmUgY2FsbGJhY2tzLiBTaG91bGRcbiAgLy8gdHJ5TG9naW5NZXRob2QgY2F0Y2ggdGhpcyBjYXNlIGFuZCB0dXJuIGl0IGludG8gYW4gZXJyb3I/XG4gIGlmICghcmVzdWx0LnVzZXJJZCAmJiAhcmVzdWx0LmVycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkEgbG9naW4gbWV0aG9kIG11c3Qgc3BlY2lmeSBhIHVzZXJJZCBvciBhbiBlcnJvclwiKTtcblxuICB2YXIgdXNlcjtcbiAgaWYgKHJlc3VsdC51c2VySWQpXG4gICAgdXNlciA9IHRoaXMudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcblxuICB2YXIgYXR0ZW1wdCA9IHtcbiAgICB0eXBlOiByZXN1bHQudHlwZSB8fCBcInVua25vd25cIixcbiAgICBhbGxvd2VkOiAhISAocmVzdWx0LnVzZXJJZCAmJiAhcmVzdWx0LmVycm9yKSxcbiAgICBtZXRob2ROYW1lOiBtZXRob2ROYW1lLFxuICAgIG1ldGhvZEFyZ3VtZW50czogXy50b0FycmF5KG1ldGhvZEFyZ3MpXG4gIH07XG4gIGlmIChyZXN1bHQuZXJyb3IpXG4gICAgYXR0ZW1wdC5lcnJvciA9IHJlc3VsdC5lcnJvcjtcbiAgaWYgKHVzZXIpXG4gICAgYXR0ZW1wdC51c2VyID0gdXNlcjtcblxuICAvLyBfdmFsaWRhdGVMb2dpbiBtYXkgbXV0YXRlIGBhdHRlbXB0YCBieSBhZGRpbmcgYW4gZXJyb3IgYW5kIGNoYW5naW5nIGFsbG93ZWRcbiAgLy8gdG8gZmFsc2UsIGJ1dCB0aGF0J3MgdGhlIG9ubHkgY2hhbmdlIGl0IGNhbiBtYWtlIChhbmQgdGhlIHVzZXIncyBjYWxsYmFja3NcbiAgLy8gb25seSBnZXQgYSBjbG9uZSBvZiBgYXR0ZW1wdGApLlxuICB0aGlzLl92YWxpZGF0ZUxvZ2luKG1ldGhvZEludm9jYXRpb24uY29ubmVjdGlvbiwgYXR0ZW1wdCk7XG5cbiAgaWYgKGF0dGVtcHQuYWxsb3dlZCkge1xuICAgIHZhciByZXQgPSBfLmV4dGVuZChcbiAgICAgIHRoaXMuX2xvZ2luVXNlcihcbiAgICAgICAgbWV0aG9kSW52b2NhdGlvbixcbiAgICAgICAgcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgcmVzdWx0LnN0YW1wZWRMb2dpblRva2VuXG4gICAgICApLFxuICAgICAgcmVzdWx0Lm9wdGlvbnMgfHwge31cbiAgICApO1xuICAgIHRoaXMuX3N1Y2Nlc3NmdWxMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhpcy5fZmFpbGVkTG9naW4obWV0aG9kSW52b2NhdGlvbi5jb25uZWN0aW9uLCBhdHRlbXB0KTtcbiAgICB0aHJvdyBhdHRlbXB0LmVycm9yO1xuICB9XG59O1xuXG5cbi8vIEFsbCBzZXJ2aWNlIHNwZWNpZmljIGxvZ2luIG1ldGhvZHMgc2hvdWxkIGdvIHRocm91Z2ggdGhpcyBmdW5jdGlvbi5cbi8vIEVuc3VyZSB0aGF0IHRocm93biBleGNlcHRpb25zIGFyZSBjYXVnaHQgYW5kIHRoYXQgbG9naW4gaG9va1xuLy8gY2FsbGJhY2tzIGFyZSBzdGlsbCBjYWxsZWQuXG4vL1xuQXAuX2xvZ2luTWV0aG9kID0gZnVuY3Rpb24gKFxuICBtZXRob2RJbnZvY2F0aW9uLFxuICBtZXRob2ROYW1lLFxuICBtZXRob2RBcmdzLFxuICB0eXBlLFxuICBmblxuKSB7XG4gIHJldHVybiB0aGlzLl9hdHRlbXB0TG9naW4oXG4gICAgbWV0aG9kSW52b2NhdGlvbixcbiAgICBtZXRob2ROYW1lLFxuICAgIG1ldGhvZEFyZ3MsXG4gICAgdHJ5TG9naW5NZXRob2QodHlwZSwgZm4pXG4gICk7XG59O1xuXG5cbi8vIFJlcG9ydCBhIGxvZ2luIGF0dGVtcHQgZmFpbGVkIG91dHNpZGUgdGhlIGNvbnRleHQgb2YgYSBub3JtYWwgbG9naW5cbi8vIG1ldGhvZC4gVGhpcyBpcyBmb3IgdXNlIGluIHRoZSBjYXNlIHdoZXJlIHRoZXJlIGlzIGEgbXVsdGktc3RlcCBsb2dpblxuLy8gcHJvY2VkdXJlIChlZyBTUlAgYmFzZWQgcGFzc3dvcmQgbG9naW4pLiBJZiBhIG1ldGhvZCBlYXJseSBpbiB0aGVcbi8vIGNoYWluIGZhaWxzLCBpdCBzaG91bGQgY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHJlcG9ydCBhIGZhaWx1cmUuIFRoZXJlXG4vLyBpcyBubyBjb3JyZXNwb25kaW5nIG1ldGhvZCBmb3IgYSBzdWNjZXNzZnVsIGxvZ2luOyBtZXRob2RzIHRoYXQgY2FuXG4vLyBzdWNjZWVkIGF0IGxvZ2dpbmcgYSB1c2VyIGluIHNob3VsZCBhbHdheXMgYmUgYWN0dWFsIGxvZ2luIG1ldGhvZHNcbi8vICh1c2luZyBlaXRoZXIgQWNjb3VudHMuX2xvZ2luTWV0aG9kIG9yIEFjY291bnRzLnJlZ2lzdGVyTG9naW5IYW5kbGVyKS5cbkFwLl9yZXBvcnRMb2dpbkZhaWx1cmUgPSBmdW5jdGlvbiAoXG4gIG1ldGhvZEludm9jYXRpb24sXG4gIG1ldGhvZE5hbWUsXG4gIG1ldGhvZEFyZ3MsXG4gIHJlc3VsdFxuKSB7XG4gIHZhciBhdHRlbXB0ID0ge1xuICAgIHR5cGU6IHJlc3VsdC50eXBlIHx8IFwidW5rbm93blwiLFxuICAgIGFsbG93ZWQ6IGZhbHNlLFxuICAgIGVycm9yOiByZXN1bHQuZXJyb3IsXG4gICAgbWV0aG9kTmFtZTogbWV0aG9kTmFtZSxcbiAgICBtZXRob2RBcmd1bWVudHM6IF8udG9BcnJheShtZXRob2RBcmdzKVxuICB9O1xuXG4gIGlmIChyZXN1bHQudXNlcklkKSB7XG4gICAgYXR0ZW1wdC51c2VyID0gdGhpcy51c2Vycy5maW5kT25lKHJlc3VsdC51c2VySWQpO1xuICB9XG5cbiAgdGhpcy5fdmFsaWRhdGVMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuICB0aGlzLl9mYWlsZWRMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuXG4gIC8vIF92YWxpZGF0ZUxvZ2luIG1heSBtdXRhdGUgYXR0ZW1wdCB0byBzZXQgYSBuZXcgZXJyb3IgbWVzc2FnZS4gUmV0dXJuXG4gIC8vIHRoZSBtb2RpZmllZCB2ZXJzaW9uLlxuICByZXR1cm4gYXR0ZW1wdDtcbn07XG5cblxuLy8vXG4vLy8gTE9HSU4gSEFORExFUlNcbi8vL1xuXG4vLyBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3IgYXV0aCBwYWNrYWdlcyB0byBob29rIGluIHRvIGxvZ2luLlxuLy9cbi8vIEEgbG9naW4gaGFuZGxlciBpcyBhIGxvZ2luIG1ldGhvZCB3aGljaCBjYW4gcmV0dXJuIGB1bmRlZmluZWRgIHRvXG4vLyBpbmRpY2F0ZSB0aGF0IHRoZSBsb2dpbiByZXF1ZXN0IGlzIG5vdCBoYW5kbGVkIGJ5IHRoaXMgaGFuZGxlci5cbi8vXG4vLyBAcGFyYW0gbmFtZSB7U3RyaW5nfSBPcHRpb25hbC4gIFRoZSBzZXJ2aWNlIG5hbWUsIHVzZWQgYnkgZGVmYXVsdFxuLy8gaWYgYSBzcGVjaWZpYyBzZXJ2aWNlIG5hbWUgaXNuJ3QgcmV0dXJuZWQgaW4gdGhlIHJlc3VsdC5cbi8vXG4vLyBAcGFyYW0gaGFuZGxlciB7RnVuY3Rpb259IEEgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyBhbiBvcHRpb25zIG9iamVjdFxuLy8gKGFzIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgYGxvZ2luYCBtZXRob2QpIGFuZCByZXR1cm5zIG9uZSBvZjpcbi8vIC0gYHVuZGVmaW5lZGAsIG1lYW5pbmcgZG9uJ3QgaGFuZGxlO1xuLy8gLSBhIGxvZ2luIG1ldGhvZCByZXN1bHQgb2JqZWN0XG5cbkFwLnJlZ2lzdGVyTG9naW5IYW5kbGVyID0gZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIpIHtcbiAgaWYgKCEgaGFuZGxlcikge1xuICAgIGhhbmRsZXIgPSBuYW1lO1xuICAgIG5hbWUgPSBudWxsO1xuICB9XG5cbiAgdGhpcy5fbG9naW5IYW5kbGVycy5wdXNoKHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgfSk7XG59O1xuXG5cbi8vIENoZWNrcyBhIHVzZXIncyBjcmVkZW50aWFscyBhZ2FpbnN0IGFsbCB0aGUgcmVnaXN0ZXJlZCBsb2dpblxuLy8gaGFuZGxlcnMsIGFuZCByZXR1cm5zIGEgbG9naW4gdG9rZW4gaWYgdGhlIGNyZWRlbnRpYWxzIGFyZSB2YWxpZC4gSXRcbi8vIGlzIGxpa2UgdGhlIGxvZ2luIG1ldGhvZCwgZXhjZXB0IHRoYXQgaXQgZG9lc24ndCBzZXQgdGhlIGxvZ2dlZC1pblxuLy8gdXNlciBvbiB0aGUgY29ubmVjdGlvbi4gVGhyb3dzIGEgTWV0ZW9yLkVycm9yIGlmIGxvZ2dpbmcgaW4gZmFpbHMsXG4vLyBpbmNsdWRpbmcgdGhlIGNhc2Ugd2hlcmUgbm9uZSBvZiB0aGUgbG9naW4gaGFuZGxlcnMgaGFuZGxlZCB0aGUgbG9naW5cbi8vIHJlcXVlc3QuIE90aGVyd2lzZSwgcmV0dXJucyB7aWQ6IHVzZXJJZCwgdG9rZW46ICosIHRva2VuRXhwaXJlczogKn0uXG4vL1xuLy8gRm9yIGV4YW1wbGUsIGlmIHlvdSB3YW50IHRvIGxvZ2luIHdpdGggYSBwbGFpbnRleHQgcGFzc3dvcmQsIGBvcHRpb25zYCBjb3VsZCBiZVxuLy8gICB7IHVzZXI6IHsgdXNlcm5hbWU6IDx1c2VybmFtZT4gfSwgcGFzc3dvcmQ6IDxwYXNzd29yZD4gfSwgb3Jcbi8vICAgeyB1c2VyOiB7IGVtYWlsOiA8ZW1haWw+IH0sIHBhc3N3b3JkOiA8cGFzc3dvcmQ+IH0uXG5cbi8vIFRyeSBhbGwgb2YgdGhlIHJlZ2lzdGVyZWQgbG9naW4gaGFuZGxlcnMgdW50aWwgb25lIG9mIHRoZW0gZG9lc24ndFxuLy8gcmV0dXJuIGB1bmRlZmluZWRgLCBtZWFuaW5nIGl0IGhhbmRsZWQgdGhpcyBjYWxsIHRvIGBsb2dpbmAuIFJldHVyblxuLy8gdGhhdCByZXR1cm4gdmFsdWUuXG5BcC5fcnVuTG9naW5IYW5kbGVycyA9IGZ1bmN0aW9uIChtZXRob2RJbnZvY2F0aW9uLCBvcHRpb25zKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbG9naW5IYW5kbGVycy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBoYW5kbGVyID0gdGhpcy5fbG9naW5IYW5kbGVyc1tpXTtcblxuICAgIHZhciByZXN1bHQgPSB0cnlMb2dpbk1ldGhvZChcbiAgICAgIGhhbmRsZXIubmFtZSxcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIuaGFuZGxlci5jYWxsKG1ldGhvZEludm9jYXRpb24sIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiQSBsb2dpbiBoYW5kbGVyIHNob3VsZCByZXR1cm4gYSByZXN1bHQgb3IgdW5kZWZpbmVkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdHlwZTogbnVsbCxcbiAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiVW5yZWNvZ25pemVkIG9wdGlvbnMgZm9yIGxvZ2luIHJlcXVlc3RcIilcbiAgfTtcbn07XG5cbi8vIERlbGV0ZXMgdGhlIGdpdmVuIGxvZ2luVG9rZW4gZnJvbSB0aGUgZGF0YWJhc2UuXG4vL1xuLy8gRm9yIG5ldy1zdHlsZSBoYXNoZWQgdG9rZW4sIHRoaXMgd2lsbCBjYXVzZSBhbGwgY29ubmVjdGlvbnNcbi8vIGFzc29jaWF0ZWQgd2l0aCB0aGUgdG9rZW4gdG8gYmUgY2xvc2VkLlxuLy9cbi8vIEFueSBjb25uZWN0aW9ucyBhc3NvY2lhdGVkIHdpdGggb2xkLXN0eWxlIHVuaGFzaGVkIHRva2VucyB3aWxsIGJlXG4vLyBpbiB0aGUgcHJvY2VzcyBvZiBiZWNvbWluZyBhc3NvY2lhdGVkIHdpdGggaGFzaGVkIHRva2VucyBhbmQgdGhlblxuLy8gdGhleSdsbCBnZXQgY2xvc2VkLlxuQXAuZGVzdHJveVRva2VuID0gZnVuY3Rpb24gKHVzZXJJZCwgbG9naW5Ub2tlbikge1xuICB0aGlzLnVzZXJzLnVwZGF0ZSh1c2VySWQsIHtcbiAgICAkcHVsbDoge1xuICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjoge1xuICAgICAgICAkb3I6IFtcbiAgICAgICAgICB7IGhhc2hlZFRva2VuOiBsb2dpblRva2VuIH0sXG4gICAgICAgICAgeyB0b2tlbjogbG9naW5Ub2tlbiB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuQXAuX2luaXRTZXJ2ZXJNZXRob2RzID0gZnVuY3Rpb24gKCkge1xuICAvLyBUaGUgbWV0aG9kcyBjcmVhdGVkIGluIHRoaXMgZnVuY3Rpb24gbmVlZCB0byBiZSBjcmVhdGVkIGhlcmUgc28gdGhhdFxuICAvLyB0aGlzIHZhcmlhYmxlIGlzIGF2YWlsYWJsZSBpbiB0aGVpciBzY29wZS5cbiAgdmFyIGFjY291bnRzID0gdGhpcztcblxuICAvLyBUaGlzIG9iamVjdCB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIG1ldGhvZHMgYW5kIHRoZW4gcGFzc2VkIHRvXG4gIC8vIGFjY291bnRzLl9zZXJ2ZXIubWV0aG9kcyBmdXJ0aGVyIGJlbG93LlxuICB2YXIgbWV0aG9kcyA9IHt9O1xuXG4gIC8vIEByZXR1cm5zIHtPYmplY3R8bnVsbH1cbiAgLy8gICBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIHt0b2tlbjogcmVjb25uZWN0VG9rZW4sIGlkOiB1c2VySWR9XG4gIC8vICAgSWYgdW5zdWNjZXNzZnVsIChmb3IgZXhhbXBsZSwgaWYgdGhlIHVzZXIgY2xvc2VkIHRoZSBvYXV0aCBsb2dpbiBwb3B1cCksXG4gIC8vICAgICB0aHJvd3MgYW4gZXJyb3IgZGVzY3JpYmluZyB0aGUgcmVhc29uXG4gIG1ldGhvZHMubG9naW4gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIExvZ2luIGhhbmRsZXJzIHNob3VsZCByZWFsbHkgYWxzbyBjaGVjayB3aGF0ZXZlciBmaWVsZCB0aGV5IGxvb2sgYXQgaW5cbiAgICAvLyBvcHRpb25zLCBidXQgd2UgZG9uJ3QgZW5mb3JjZSBpdC5cbiAgICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuXG4gICAgdmFyIHJlc3VsdCA9IGFjY291bnRzLl9ydW5Mb2dpbkhhbmRsZXJzKHNlbGYsIG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIGFjY291bnRzLl9hdHRlbXB0TG9naW4oc2VsZiwgXCJsb2dpblwiLCBhcmd1bWVudHMsIHJlc3VsdCk7XG4gIH07XG5cbiAgbWV0aG9kcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRva2VuID0gYWNjb3VudHMuX2dldExvZ2luVG9rZW4odGhpcy5jb25uZWN0aW9uLmlkKTtcbiAgICBhY2NvdW50cy5fc2V0TG9naW5Ub2tlbih0aGlzLnVzZXJJZCwgdGhpcy5jb25uZWN0aW9uLCBudWxsKTtcbiAgICBpZiAodG9rZW4gJiYgdGhpcy51c2VySWQpXG4gICAgICBhY2NvdW50cy5kZXN0cm95VG9rZW4odGhpcy51c2VySWQsIHRva2VuKTtcbiAgICBhY2NvdW50cy5fc3VjY2Vzc2Z1bExvZ291dCh0aGlzLmNvbm5lY3Rpb24sIHRoaXMudXNlcklkKTtcbiAgICB0aGlzLnNldFVzZXJJZChudWxsKTtcbiAgfTtcblxuICAvLyBEZWxldGUgYWxsIHRoZSBjdXJyZW50IHVzZXIncyB0b2tlbnMgYW5kIGNsb3NlIGFsbCBvcGVuIGNvbm5lY3Rpb25zIGxvZ2dlZFxuICAvLyBpbiBhcyB0aGlzIHVzZXIuIFJldHVybnMgYSBmcmVzaCBuZXcgbG9naW4gdG9rZW4gdGhhdCB0aGlzIGNsaWVudCBjYW5cbiAgLy8gdXNlLiBUZXN0cyBzZXQgQWNjb3VudHMuX25vQ29ubmVjdGlvbkNsb3NlRGVsYXlGb3JUZXN0IHRvIGRlbGV0ZSB0b2tlbnNcbiAgLy8gaW1tZWRpYXRlbHkgaW5zdGVhZCBvZiB1c2luZyBhIGRlbGF5LlxuICAvL1xuICAvLyBYWFggQ09NUEFUIFdJVEggMC43LjJcbiAgLy8gVGhpcyBzaW5nbGUgYGxvZ291dE90aGVyQ2xpZW50c2AgbWV0aG9kIGhhcyBiZWVuIHJlcGxhY2VkIHdpdGggdHdvXG4gIC8vIG1ldGhvZHMsIG9uZSB0aGF0IHlvdSBjYWxsIHRvIGdldCBhIG5ldyB0b2tlbiwgYW5kIGFub3RoZXIgdGhhdCB5b3VcbiAgLy8gY2FsbCB0byByZW1vdmUgYWxsIHRva2VucyBleGNlcHQgeW91ciBvd24uIFRoZSBuZXcgZGVzaWduIGFsbG93c1xuICAvLyBjbGllbnRzIHRvIGtub3cgd2hlbiBvdGhlciBjbGllbnRzIGhhdmUgYWN0dWFsbHkgYmVlbiBsb2dnZWRcbiAgLy8gb3V0LiAoVGhlIGBsb2dvdXRPdGhlckNsaWVudHNgIG1ldGhvZCBndWFyYW50ZWVzIHRoZSBjYWxsZXIgdGhhdFxuICAvLyB0aGUgb3RoZXIgY2xpZW50cyB3aWxsIGJlIGxvZ2dlZCBvdXQgYXQgc29tZSBwb2ludCwgYnV0IG1ha2VzIG5vXG4gIC8vIGd1YXJhbnRlZXMgYWJvdXQgd2hlbi4pIFRoaXMgbWV0aG9kIGlzIGxlZnQgaW4gZm9yIGJhY2t3YXJkc1xuICAvLyBjb21wYXRpYmlsaXR5LCBlc3BlY2lhbGx5IHNpbmNlIGFwcGxpY2F0aW9uIGNvZGUgbWlnaHQgYmUgY2FsbGluZ1xuICAvLyB0aGlzIG1ldGhvZCBkaXJlY3RseS5cbiAgLy9cbiAgLy8gQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggdG9rZW4gYW5kIHRva2VuRXhwaXJlcyBrZXlzLlxuICBtZXRob2RzLmxvZ291dE90aGVyQ2xpZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHVzZXIgPSBhY2NvdW50cy51c2Vycy5maW5kT25lKHNlbGYudXNlcklkLCB7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh1c2VyKSB7XG4gICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IHRva2VucyBpbiB0aGUgZGF0YWJhc2UgdG8gYmUgZGVsZXRlZCBpblxuICAgICAgLy8gQ09OTkVDVElPTl9DTE9TRV9ERUxBWV9NUyBtcy4gVGhpcyBnaXZlcyBvdGhlciBjb25uZWN0aW9ucyBpbiB0aGVcbiAgICAgIC8vIGNhbGxlcidzIGJyb3dzZXIgdGltZSB0byBmaW5kIHRoZSBmcmVzaCB0b2tlbiBpbiBsb2NhbFN0b3JhZ2UuIFdlIHNhdmVcbiAgICAgIC8vIHRoZSB0b2tlbnMgaW4gdGhlIGRhdGFiYXNlIGluIGNhc2Ugd2UgY3Jhc2ggYmVmb3JlIGFjdHVhbGx5IGRlbGV0aW5nXG4gICAgICAvLyB0aGVtLlxuICAgICAgdmFyIHRva2VucyA9IHVzZXIuc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zO1xuICAgICAgdmFyIG5ld1Rva2VuID0gYWNjb3VudHMuX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4oKTtcbiAgICAgIHZhciB1c2VySWQgPSBzZWxmLnVzZXJJZDtcbiAgICAgIGFjY291bnRzLnVzZXJzLnVwZGF0ZSh1c2VySWQsIHtcbiAgICAgICAgJHNldDoge1xuICAgICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zVG9EZWxldGVcIjogdG9rZW5zLFxuICAgICAgICAgIFwic2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgJHB1c2g6IHsgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogYWNjb3VudHMuX2hhc2hTdGFtcGVkVG9rZW4obmV3VG9rZW4pIH1cbiAgICAgIH0pO1xuICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBUaGUgb2JzZXJ2ZSBvbiBNZXRlb3IudXNlcnMgd2lsbCB0YWtlIGNhcmUgb2YgY2xvc2luZyB0aGUgY29ubmVjdGlvbnNcbiAgICAgICAgLy8gYXNzb2NpYXRlZCB3aXRoIGB0b2tlbnNgLlxuICAgICAgICBhY2NvdW50cy5fZGVsZXRlU2F2ZWRUb2tlbnNGb3JVc2VyKHVzZXJJZCwgdG9rZW5zKTtcbiAgICAgIH0sIGFjY291bnRzLl9ub0Nvbm5lY3Rpb25DbG9zZURlbGF5Rm9yVGVzdCA/IDAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgQ09OTkVDVElPTl9DTE9TRV9ERUxBWV9NUyk7XG4gICAgICAvLyBXZSBkbyBub3Qgc2V0IHRoZSBsb2dpbiB0b2tlbiBvbiB0aGlzIGNvbm5lY3Rpb24sIGJ1dCBpbnN0ZWFkIHRoZVxuICAgICAgLy8gb2JzZXJ2ZSBjbG9zZXMgdGhlIGNvbm5lY3Rpb24gYW5kIHRoZSBjbGllbnQgd2lsbCByZWNvbm5lY3Qgd2l0aCB0aGVcbiAgICAgIC8vIG5ldyB0b2tlbi5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRva2VuOiBuZXdUb2tlbi50b2tlbixcbiAgICAgICAgdG9rZW5FeHBpcmVzOiBhY2NvdW50cy5fdG9rZW5FeHBpcmF0aW9uKG5ld1Rva2VuLndoZW4pXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwiWW91IGFyZSBub3QgbG9nZ2VkIGluLlwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gR2VuZXJhdGVzIGEgbmV3IGxvZ2luIHRva2VuIHdpdGggdGhlIHNhbWUgZXhwaXJhdGlvbiBhcyB0aGVcbiAgLy8gY29ubmVjdGlvbidzIGN1cnJlbnQgdG9rZW4gYW5kIHNhdmVzIGl0IHRvIHRoZSBkYXRhYmFzZS4gQXNzb2NpYXRlc1xuICAvLyB0aGUgY29ubmVjdGlvbiB3aXRoIHRoaXMgbmV3IHRva2VuIGFuZCByZXR1cm5zIGl0LiBUaHJvd3MgYW4gZXJyb3JcbiAgLy8gaWYgY2FsbGVkIG9uIGEgY29ubmVjdGlvbiB0aGF0IGlzbid0IGxvZ2dlZCBpbi5cbiAgLy9cbiAgLy8gQHJldHVybnMgT2JqZWN0XG4gIC8vICAgSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyB7IHRva2VuOiA8bmV3IHRva2VuPiwgaWQ6IDx1c2VyIGlkPixcbiAgLy8gICB0b2tlbkV4cGlyZXM6IDxleHBpcmF0aW9uIGRhdGU+IH0uXG4gIG1ldGhvZHMuZ2V0TmV3VG9rZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB1c2VyID0gYWNjb3VudHMudXNlcnMuZmluZE9uZShzZWxmLnVzZXJJZCwge1xuICAgICAgZmllbGRzOiB7IFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IDEgfVxuICAgIH0pO1xuICAgIGlmICghIHNlbGYudXNlcklkIHx8ICEgdXNlcikge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcIllvdSBhcmUgbm90IGxvZ2dlZCBpbi5cIik7XG4gICAgfVxuICAgIC8vIEJlIGNhcmVmdWwgbm90IHRvIGdlbmVyYXRlIGEgbmV3IHRva2VuIHRoYXQgaGFzIGEgbGF0ZXJcbiAgICAvLyBleHBpcmF0aW9uIHRoYW4gdGhlIGN1cnJlbiB0b2tlbi4gT3RoZXJ3aXNlLCBhIGJhZCBndXkgd2l0aCBhXG4gICAgLy8gc3RvbGVuIHRva2VuIGNvdWxkIHVzZSB0aGlzIG1ldGhvZCB0byBzdG9wIGhpcyBzdG9sZW4gdG9rZW4gZnJvbVxuICAgIC8vIGV2ZXIgZXhwaXJpbmcuXG4gICAgdmFyIGN1cnJlbnRIYXNoZWRUb2tlbiA9IGFjY291bnRzLl9nZXRMb2dpblRva2VuKHNlbGYuY29ubmVjdGlvbi5pZCk7XG4gICAgdmFyIGN1cnJlbnRTdGFtcGVkVG9rZW4gPSBfLmZpbmQoXG4gICAgICB1c2VyLnNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2VucyxcbiAgICAgIGZ1bmN0aW9uIChzdGFtcGVkVG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHN0YW1wZWRUb2tlbi5oYXNoZWRUb2tlbiA9PT0gY3VycmVudEhhc2hlZFRva2VuO1xuICAgICAgfVxuICAgICk7XG4gICAgaWYgKCEgY3VycmVudFN0YW1wZWRUb2tlbikgeyAvLyBzYWZldHkgYmVsdDogdGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuXG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwiSW52YWxpZCBsb2dpbiB0b2tlblwiKTtcbiAgICB9XG4gICAgdmFyIG5ld1N0YW1wZWRUb2tlbiA9IGFjY291bnRzLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG4gICAgbmV3U3RhbXBlZFRva2VuLndoZW4gPSBjdXJyZW50U3RhbXBlZFRva2VuLndoZW47XG4gICAgYWNjb3VudHMuX2luc2VydExvZ2luVG9rZW4oc2VsZi51c2VySWQsIG5ld1N0YW1wZWRUb2tlbik7XG4gICAgcmV0dXJuIGFjY291bnRzLl9sb2dpblVzZXIoc2VsZiwgc2VsZi51c2VySWQsIG5ld1N0YW1wZWRUb2tlbik7XG4gIH07XG5cbiAgLy8gUmVtb3ZlcyBhbGwgdG9rZW5zIGV4Y2VwdCB0aGUgdG9rZW4gYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50XG4gIC8vIGNvbm5lY3Rpb24uIFRocm93cyBhbiBlcnJvciBpZiB0aGUgY29ubmVjdGlvbiBpcyBub3QgbG9nZ2VkXG4gIC8vIGluLiBSZXR1cm5zIG5vdGhpbmcgb24gc3VjY2Vzcy5cbiAgbWV0aG9kcy5yZW1vdmVPdGhlclRva2VucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgc2VsZi51c2VySWQpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJZb3UgYXJlIG5vdCBsb2dnZWQgaW4uXCIpO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFRva2VuID0gYWNjb3VudHMuX2dldExvZ2luVG9rZW4oc2VsZi5jb25uZWN0aW9uLmlkKTtcbiAgICBhY2NvdW50cy51c2Vycy51cGRhdGUoc2VsZi51c2VySWQsIHtcbiAgICAgICRwdWxsOiB7XG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IHsgaGFzaGVkVG9rZW46IHsgJG5lOiBjdXJyZW50VG9rZW4gfSB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQWxsb3cgYSBvbmUtdGltZSBjb25maWd1cmF0aW9uIGZvciBhIGxvZ2luIHNlcnZpY2UuIE1vZGlmaWNhdGlvbnNcbiAgLy8gdG8gdGhpcyBjb2xsZWN0aW9uIGFyZSBhbHNvIGFsbG93ZWQgaW4gaW5zZWN1cmUgbW9kZS5cbiAgbWV0aG9kcy5jb25maWd1cmVMb2dpblNlcnZpY2UgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7c2VydmljZTogU3RyaW5nfSkpO1xuICAgIC8vIERvbid0IGxldCByYW5kb20gdXNlcnMgY29uZmlndXJlIGEgc2VydmljZSB3ZSBoYXZlbid0IGFkZGVkIHlldCAoc29cbiAgICAvLyB0aGF0IHdoZW4gd2UgZG8gbGF0ZXIgYWRkIGl0LCBpdCdzIHNldCB1cCB3aXRoIHRoZWlyIGNvbmZpZ3VyYXRpb25cbiAgICAvLyBpbnN0ZWFkIG9mIG91cnMpLlxuICAgIC8vIFhYWCBpZiBzZXJ2aWNlIGNvbmZpZ3VyYXRpb24gaXMgb2F1dGgtc3BlY2lmaWMgdGhlbiB0aGlzIGNvZGUgc2hvdWxkXG4gICAgLy8gICAgIGJlIGluIGFjY291bnRzLW9hdXRoOyBpZiBpdCdzIG5vdCB0aGVuIHRoZSByZWdpc3RyeSBzaG91bGQgYmVcbiAgICAvLyAgICAgaW4gdGhpcyBwYWNrYWdlXG4gICAgaWYgKCEoYWNjb3VudHMub2F1dGhcbiAgICAgICAgICAmJiBfLmNvbnRhaW5zKGFjY291bnRzLm9hdXRoLnNlcnZpY2VOYW1lcygpLCBvcHRpb25zLnNlcnZpY2UpKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiU2VydmljZSB1bmtub3duXCIpO1xuICAgIH1cblxuICAgIHZhciBTZXJ2aWNlQ29uZmlndXJhdGlvbiA9XG4gICAgICBQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXS5TZXJ2aWNlQ29uZmlndXJhdGlvbjtcbiAgICBpZiAoU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7c2VydmljZTogb3B0aW9ucy5zZXJ2aWNlfSkpXG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJTZXJ2aWNlIFwiICsgb3B0aW9ucy5zZXJ2aWNlICsgXCIgYWxyZWFkeSBjb25maWd1cmVkXCIpO1xuXG4gICAgaWYgKF8uaGFzKG9wdGlvbnMsIFwic2VjcmV0XCIpICYmIHVzaW5nT0F1dGhFbmNyeXB0aW9uKCkpXG4gICAgICBvcHRpb25zLnNlY3JldCA9IE9BdXRoRW5jcnlwdGlvbi5zZWFsKG9wdGlvbnMuc2VjcmV0KTtcblxuICAgIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmluc2VydChvcHRpb25zKTtcbiAgfTtcblxuICBhY2NvdW50cy5fc2VydmVyLm1ldGhvZHMobWV0aG9kcyk7XG59O1xuXG5BcC5faW5pdEFjY291bnREYXRhSG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhY2NvdW50cyA9IHRoaXM7XG5cbiAgYWNjb3VudHMuX3NlcnZlci5vbkNvbm5lY3Rpb24oZnVuY3Rpb24gKGNvbm5lY3Rpb24pIHtcbiAgICBhY2NvdW50cy5fYWNjb3VudERhdGFbY29ubmVjdGlvbi5pZF0gPSB7XG4gICAgICBjb25uZWN0aW9uOiBjb25uZWN0aW9uXG4gICAgfTtcblxuICAgIGNvbm5lY3Rpb24ub25DbG9zZShmdW5jdGlvbiAoKSB7XG4gICAgICBhY2NvdW50cy5fcmVtb3ZlVG9rZW5Gcm9tQ29ubmVjdGlvbihjb25uZWN0aW9uLmlkKTtcbiAgICAgIGRlbGV0ZSBhY2NvdW50cy5fYWNjb3VudERhdGFbY29ubmVjdGlvbi5pZF07XG4gICAgfSk7XG4gIH0pO1xufTtcblxuQXAuX2luaXRTZXJ2ZXJQdWJsaWNhdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhY2NvdW50cyA9IHRoaXM7XG5cbiAgLy8gUHVibGlzaCBhbGwgbG9naW4gc2VydmljZSBjb25maWd1cmF0aW9uIGZpZWxkcyBvdGhlciB0aGFuIHNlY3JldC5cbiAgYWNjb3VudHMuX3NlcnZlci5wdWJsaXNoKFwibWV0ZW9yLmxvZ2luU2VydmljZUNvbmZpZ3VyYXRpb25cIiwgZnVuY3Rpb24gKCkge1xuICAgIHZhciBTZXJ2aWNlQ29uZmlndXJhdGlvbiA9XG4gICAgICBQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXS5TZXJ2aWNlQ29uZmlndXJhdGlvbjtcbiAgICByZXR1cm4gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZCh7fSwge2ZpZWxkczoge3NlY3JldDogMH19KTtcbiAgfSwge2lzX2F1dG86IHRydWV9KTsgLy8gbm90IHRlY2hpbmNhbGx5IGF1dG9wdWJsaXNoLCBidXQgc3RvcHMgdGhlIHdhcm5pbmcuXG5cbiAgLy8gUHVibGlzaCB0aGUgY3VycmVudCB1c2VyJ3MgcmVjb3JkIHRvIHRoZSBjbGllbnQuXG4gIGFjY291bnRzLl9zZXJ2ZXIucHVibGlzaChudWxsLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICByZXR1cm4gYWNjb3VudHMudXNlcnMuZmluZCh7XG4gICAgICAgIF9pZDogdGhpcy51c2VySWRcbiAgICAgIH0sIHtcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgcHJvZmlsZTogMSxcbiAgICAgICAgICB1c2VybmFtZTogMSxcbiAgICAgICAgICBlbWFpbHM6IDFcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSwgLypzdXBwcmVzcyBhdXRvcHVibGlzaCB3YXJuaW5nKi97aXNfYXV0bzogdHJ1ZX0pO1xuXG4gIC8vIFVzZSBNZXRlb3Iuc3RhcnR1cCB0byBnaXZlIG90aGVyIHBhY2thZ2VzIGEgY2hhbmNlIHRvIGNhbGxcbiAgLy8gYWRkQXV0b3B1Ymxpc2hGaWVsZHMuXG4gIFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiYgTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICAgIC8vIFsncHJvZmlsZScsICd1c2VybmFtZSddIC0+IHtwcm9maWxlOiAxLCB1c2VybmFtZTogMX1cbiAgICB2YXIgdG9GaWVsZFNlbGVjdG9yID0gZnVuY3Rpb24gKGZpZWxkcykge1xuICAgICAgcmV0dXJuIF8ub2JqZWN0KF8ubWFwKGZpZWxkcywgZnVuY3Rpb24gKGZpZWxkKSB7XG4gICAgICAgIHJldHVybiBbZmllbGQsIDFdO1xuICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBhY2NvdW50cy5fc2VydmVyLnB1Ymxpc2gobnVsbCwgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICAgIHJldHVybiBhY2NvdW50cy51c2Vycy5maW5kKHtcbiAgICAgICAgICBfaWQ6IHRoaXMudXNlcklkXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBmaWVsZHM6IHRvRmllbGRTZWxlY3RvcihhY2NvdW50cy5fYXV0b3B1Ymxpc2hGaWVsZHMubG9nZ2VkSW5Vc2VyKVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sIC8qc3VwcHJlc3MgYXV0b3B1Ymxpc2ggd2FybmluZyove2lzX2F1dG86IHRydWV9KTtcblxuICAgIC8vIFhYWCB0aGlzIHB1Ymxpc2ggaXMgbmVpdGhlciBkZWR1cC1hYmxlIG5vciBpcyBpdCBvcHRpbWl6ZWQgYnkgb3VyIHNwZWNpYWxcbiAgICAvLyB0cmVhdG1lbnQgb2YgcXVlcmllcyBvbiBhIHNwZWNpZmljIF9pZC4gVGhlcmVmb3JlIHRoaXMgd2lsbCBoYXZlIE8obl4yKVxuICAgIC8vIHJ1bi10aW1lIHBlcmZvcm1hbmNlIGV2ZXJ5IHRpbWUgYSB1c2VyIGRvY3VtZW50IGlzIGNoYW5nZWQgKGVnIHNvbWVvbmVcbiAgICAvLyBsb2dnaW5nIGluKS4gSWYgdGhpcyBpcyBhIHByb2JsZW0sIHdlIGNhbiBpbnN0ZWFkIHdyaXRlIGEgbWFudWFsIHB1Ymxpc2hcbiAgICAvLyBmdW5jdGlvbiB3aGljaCBmaWx0ZXJzIG91dCBmaWVsZHMgYmFzZWQgb24gJ3RoaXMudXNlcklkJy5cbiAgICBhY2NvdW50cy5fc2VydmVyLnB1Ymxpc2gobnVsbCwgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy51c2VySWQgPyB7XG4gICAgICAgIF9pZDogeyAkbmU6IHRoaXMudXNlcklkIH1cbiAgICAgIH0gOiB7fTtcblxuICAgICAgcmV0dXJuIGFjY291bnRzLnVzZXJzLmZpbmQoc2VsZWN0b3IsIHtcbiAgICAgICAgZmllbGRzOiB0b0ZpZWxkU2VsZWN0b3IoYWNjb3VudHMuX2F1dG9wdWJsaXNoRmllbGRzLm90aGVyVXNlcnMpXG4gICAgICB9KTtcbiAgICB9LCAvKnN1cHByZXNzIGF1dG9wdWJsaXNoIHdhcm5pbmcqL3tpc19hdXRvOiB0cnVlfSk7XG4gIH0pO1xufTtcblxuLy8gQWRkIHRvIHRoZSBsaXN0IG9mIGZpZWxkcyBvciBzdWJmaWVsZHMgdG8gYmUgYXV0b21hdGljYWxseVxuLy8gcHVibGlzaGVkIGlmIGF1dG9wdWJsaXNoIGlzIG9uLiBNdXN0IGJlIGNhbGxlZCBmcm9tIHRvcC1sZXZlbFxuLy8gY29kZSAoaWUsIGJlZm9yZSBNZXRlb3Iuc3RhcnR1cCBob29rcyBydW4pLlxuLy9cbi8vIEBwYXJhbSBvcHRzIHtPYmplY3R9IHdpdGg6XG4vLyAgIC0gZm9yTG9nZ2VkSW5Vc2VyIHtBcnJheX0gQXJyYXkgb2YgZmllbGRzIHB1Ymxpc2hlZCB0byB0aGUgbG9nZ2VkLWluIHVzZXJcbi8vICAgLSBmb3JPdGhlclVzZXJzIHtBcnJheX0gQXJyYXkgb2YgZmllbGRzIHB1Ymxpc2hlZCB0byB1c2VycyB0aGF0IGFyZW4ndCBsb2dnZWQgaW5cbkFwLmFkZEF1dG9wdWJsaXNoRmllbGRzID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgdGhpcy5fYXV0b3B1Ymxpc2hGaWVsZHMubG9nZ2VkSW5Vc2VyLnB1c2guYXBwbHkoXG4gICAgdGhpcy5fYXV0b3B1Ymxpc2hGaWVsZHMubG9nZ2VkSW5Vc2VyLCBvcHRzLmZvckxvZ2dlZEluVXNlcik7XG4gIHRoaXMuX2F1dG9wdWJsaXNoRmllbGRzLm90aGVyVXNlcnMucHVzaC5hcHBseShcbiAgICB0aGlzLl9hdXRvcHVibGlzaEZpZWxkcy5vdGhlclVzZXJzLCBvcHRzLmZvck90aGVyVXNlcnMpO1xufTtcblxuLy8vXG4vLy8gQUNDT1VOVCBEQVRBXG4vLy9cblxuLy8gSEFDSzogVGhpcyBpcyB1c2VkIGJ5ICdtZXRlb3ItYWNjb3VudHMnIHRvIGdldCB0aGUgbG9naW5Ub2tlbiBmb3IgYVxuLy8gY29ubmVjdGlvbi4gTWF5YmUgdGhlcmUgc2hvdWxkIGJlIGEgcHVibGljIHdheSB0byBkbyB0aGF0LlxuQXAuX2dldEFjY291bnREYXRhID0gZnVuY3Rpb24gKGNvbm5lY3Rpb25JZCwgZmllbGQpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLl9hY2NvdW50RGF0YVtjb25uZWN0aW9uSWRdO1xuICByZXR1cm4gZGF0YSAmJiBkYXRhW2ZpZWxkXTtcbn07XG5cbkFwLl9zZXRBY2NvdW50RGF0YSA9IGZ1bmN0aW9uIChjb25uZWN0aW9uSWQsIGZpZWxkLCB2YWx1ZSkge1xuICB2YXIgZGF0YSA9IHRoaXMuX2FjY291bnREYXRhW2Nvbm5lY3Rpb25JZF07XG5cbiAgLy8gc2FmZXR5IGJlbHQuIHNob3VsZG4ndCBoYXBwZW4uIGFjY291bnREYXRhIGlzIHNldCBpbiBvbkNvbm5lY3Rpb24sXG4gIC8vIHdlIGRvbid0IGhhdmUgYSBjb25uZWN0aW9uSWQgdW50aWwgaXQgaXMgc2V0LlxuICBpZiAoIWRhdGEpXG4gICAgcmV0dXJuO1xuXG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKVxuICAgIGRlbGV0ZSBkYXRhW2ZpZWxkXTtcbiAgZWxzZVxuICAgIGRhdGFbZmllbGRdID0gdmFsdWU7XG59O1xuXG5cbi8vL1xuLy8vIFJFQ09OTkVDVCBUT0tFTlNcbi8vL1xuLy8vIHN1cHBvcnQgcmVjb25uZWN0aW5nIHVzaW5nIGEgbWV0ZW9yIGxvZ2luIHRva2VuXG5cbkFwLl9oYXNoTG9naW5Ub2tlbiA9IGZ1bmN0aW9uIChsb2dpblRva2VuKSB7XG4gIHZhciBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICBoYXNoLnVwZGF0ZShsb2dpblRva2VuKTtcbiAgcmV0dXJuIGhhc2guZGlnZXN0KCdiYXNlNjQnKTtcbn07XG5cblxuLy8ge3Rva2VuLCB3aGVufSA9PiB7aGFzaGVkVG9rZW4sIHdoZW59XG5BcC5faGFzaFN0YW1wZWRUb2tlbiA9IGZ1bmN0aW9uIChzdGFtcGVkVG9rZW4pIHtcbiAgcmV0dXJuIF8uZXh0ZW5kKF8ub21pdChzdGFtcGVkVG9rZW4sICd0b2tlbicpLCB7XG4gICAgaGFzaGVkVG9rZW46IHRoaXMuX2hhc2hMb2dpblRva2VuKHN0YW1wZWRUb2tlbi50b2tlbilcbiAgfSk7XG59O1xuXG5cbi8vIFVzaW5nICRhZGRUb1NldCBhdm9pZHMgZ2V0dGluZyBhbiBpbmRleCBlcnJvciBpZiBhbm90aGVyIGNsaWVudFxuLy8gbG9nZ2luZyBpbiBzaW11bHRhbmVvdXNseSBoYXMgYWxyZWFkeSBpbnNlcnRlZCB0aGUgbmV3IGhhc2hlZFxuLy8gdG9rZW4uXG5BcC5faW5zZXJ0SGFzaGVkTG9naW5Ub2tlbiA9IGZ1bmN0aW9uICh1c2VySWQsIGhhc2hlZFRva2VuLCBxdWVyeSkge1xuICBxdWVyeSA9IHF1ZXJ5ID8gXy5jbG9uZShxdWVyeSkgOiB7fTtcbiAgcXVlcnkuX2lkID0gdXNlcklkO1xuICB0aGlzLnVzZXJzLnVwZGF0ZShxdWVyeSwge1xuICAgICRhZGRUb1NldDoge1xuICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogaGFzaGVkVG9rZW5cbiAgICB9XG4gIH0pO1xufTtcblxuXG4vLyBFeHBvcnRlZCBmb3IgdGVzdHMuXG5BcC5faW5zZXJ0TG9naW5Ub2tlbiA9IGZ1bmN0aW9uICh1c2VySWQsIHN0YW1wZWRUb2tlbiwgcXVlcnkpIHtcbiAgdGhpcy5faW5zZXJ0SGFzaGVkTG9naW5Ub2tlbihcbiAgICB1c2VySWQsXG4gICAgdGhpcy5faGFzaFN0YW1wZWRUb2tlbihzdGFtcGVkVG9rZW4pLFxuICAgIHF1ZXJ5XG4gICk7XG59O1xuXG5cbkFwLl9jbGVhckFsbExvZ2luVG9rZW5zID0gZnVuY3Rpb24gKHVzZXJJZCkge1xuICB0aGlzLnVzZXJzLnVwZGF0ZSh1c2VySWQsIHtcbiAgICAkc2V0OiB7XG4gICAgICAnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJzogW11cbiAgICB9XG4gIH0pO1xufTtcblxuLy8gdGVzdCBob29rXG5BcC5fZ2V0VXNlck9ic2VydmUgPSBmdW5jdGlvbiAoY29ubmVjdGlvbklkKSB7XG4gIHJldHVybiB0aGlzLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdO1xufTtcblxuLy8gQ2xlYW4gdXAgdGhpcyBjb25uZWN0aW9uJ3MgYXNzb2NpYXRpb24gd2l0aCB0aGUgdG9rZW46IHRoYXQgaXMsIHN0b3Bcbi8vIHRoZSBvYnNlcnZlIHRoYXQgd2Ugc3RhcnRlZCB3aGVuIHdlIGFzc29jaWF0ZWQgdGhlIGNvbm5lY3Rpb24gd2l0aFxuLy8gdGhpcyB0b2tlbi5cbkFwLl9yZW1vdmVUb2tlbkZyb21Db25uZWN0aW9uID0gZnVuY3Rpb24gKGNvbm5lY3Rpb25JZCkge1xuICBpZiAoXy5oYXModGhpcy5fdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnMsIGNvbm5lY3Rpb25JZCkpIHtcbiAgICB2YXIgb2JzZXJ2ZSA9IHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF07XG4gICAgaWYgKHR5cGVvZiBvYnNlcnZlID09PSAnbnVtYmVyJykge1xuICAgICAgLy8gV2UncmUgaW4gdGhlIHByb2Nlc3Mgb2Ygc2V0dGluZyB1cCBhbiBvYnNlcnZlIGZvciB0aGlzIGNvbm5lY3Rpb24uIFdlXG4gICAgICAvLyBjYW4ndCBjbGVhbiB1cCB0aGF0IG9ic2VydmUgeWV0LCBidXQgaWYgd2UgZGVsZXRlIHRoZSBwbGFjZWhvbGRlciBmb3JcbiAgICAgIC8vIHRoaXMgY29ubmVjdGlvbiwgdGhlbiB0aGUgb2JzZXJ2ZSB3aWxsIGdldCBjbGVhbmVkIHVwIGFzIHNvb24gYXMgaXQgaGFzXG4gICAgICAvLyBiZWVuIHNldCB1cC5cbiAgICAgIGRlbGV0ZSB0aGlzLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgdGhpcy5fdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnNbY29ubmVjdGlvbklkXTtcbiAgICAgIG9ic2VydmUuc3RvcCgpO1xuICAgIH1cbiAgfVxufTtcblxuQXAuX2dldExvZ2luVG9rZW4gPSBmdW5jdGlvbiAoY29ubmVjdGlvbklkKSB7XG4gIHJldHVybiB0aGlzLl9nZXRBY2NvdW50RGF0YShjb25uZWN0aW9uSWQsICdsb2dpblRva2VuJyk7XG59O1xuXG4vLyBuZXdUb2tlbiBpcyBhIGhhc2hlZCB0b2tlbi5cbkFwLl9zZXRMb2dpblRva2VuID0gZnVuY3Rpb24gKHVzZXJJZCwgY29ubmVjdGlvbiwgbmV3VG9rZW4pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuX3JlbW92ZVRva2VuRnJvbUNvbm5lY3Rpb24oY29ubmVjdGlvbi5pZCk7XG4gIHNlbGYuX3NldEFjY291bnREYXRhKGNvbm5lY3Rpb24uaWQsICdsb2dpblRva2VuJywgbmV3VG9rZW4pO1xuXG4gIGlmIChuZXdUb2tlbikge1xuICAgIC8vIFNldCB1cCBhbiBvYnNlcnZlIGZvciB0aGlzIHRva2VuLiBJZiB0aGUgdG9rZW4gZ29lcyBhd2F5LCB3ZSBuZWVkXG4gICAgLy8gdG8gY2xvc2UgdGhlIGNvbm5lY3Rpb24uICBXZSBkZWZlciB0aGUgb2JzZXJ2ZSBiZWNhdXNlIHRoZXJlJ3NcbiAgICAvLyBubyBuZWVkIGZvciBpdCB0byBiZSBvbiB0aGUgY3JpdGljYWwgcGF0aCBmb3IgbG9naW47IHdlIGp1c3QgbmVlZFxuICAgIC8vIHRvIGVuc3VyZSB0aGF0IHRoZSBjb25uZWN0aW9uIHdpbGwgZ2V0IGNsb3NlZCBhdCBzb21lIHBvaW50IGlmXG4gICAgLy8gdGhlIHRva2VuIGdldHMgZGVsZXRlZC5cbiAgICAvL1xuICAgIC8vIEluaXRpYWxseSwgd2Ugc2V0IHRoZSBvYnNlcnZlIGZvciB0aGlzIGNvbm5lY3Rpb24gdG8gYSBudW1iZXI7IHRoaXNcbiAgICAvLyBzaWduaWZpZXMgdG8gb3RoZXIgY29kZSAod2hpY2ggbWlnaHQgcnVuIHdoaWxlIHdlIHlpZWxkKSB0aGF0IHdlIGFyZSBpblxuICAgIC8vIHRoZSBwcm9jZXNzIG9mIHNldHRpbmcgdXAgYW4gb2JzZXJ2ZSBmb3IgdGhpcyBjb25uZWN0aW9uLiBPbmNlIHRoZVxuICAgIC8vIG9ic2VydmUgaXMgcmVhZHkgdG8gZ28sIHdlIHJlcGxhY2UgdGhlIG51bWJlciB3aXRoIHRoZSByZWFsIG9ic2VydmVcbiAgICAvLyBoYW5kbGUgKHVubGVzcyB0aGUgcGxhY2Vob2xkZXIgaGFzIGJlZW4gZGVsZXRlZCBvciByZXBsYWNlZCBieSBhXG4gICAgLy8gZGlmZmVyZW50IHBsYWNlaG9sZCBudW1iZXIsIHNpZ25pZnlpbmcgdGhhdCB0aGUgY29ubmVjdGlvbiB3YXMgY2xvc2VkXG4gICAgLy8gYWxyZWFkeSAtLSBpbiB0aGlzIGNhc2Ugd2UganVzdCBjbGVhbiB1cCB0aGUgb2JzZXJ2ZSB0aGF0IHdlIHN0YXJ0ZWQpLlxuICAgIHZhciBteU9ic2VydmVOdW1iZXIgPSArK3NlbGYuX25leHRVc2VyT2JzZXJ2ZU51bWJlcjtcbiAgICBzZWxmLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uLmlkXSA9IG15T2JzZXJ2ZU51bWJlcjtcbiAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgc29tZXRoaW5nIGVsc2UgaGFwcGVuZWQgb24gdGhpcyBjb25uZWN0aW9uIGluIHRoZSBtZWFudGltZSAoaXQgZ290XG4gICAgICAvLyBjbG9zZWQsIG9yIGFub3RoZXIgY2FsbCB0byBfc2V0TG9naW5Ub2tlbiBoYXBwZW5lZCksIGp1c3QgZG9cbiAgICAgIC8vIG5vdGhpbmcuIFdlIGRvbid0IG5lZWQgdG8gc3RhcnQgYW4gb2JzZXJ2ZSBmb3IgYW4gb2xkIGNvbm5lY3Rpb24gb3Igb2xkXG4gICAgICAvLyB0b2tlbi5cbiAgICAgIGlmIChzZWxmLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uLmlkXSAhPT0gbXlPYnNlcnZlTnVtYmVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGZvdW5kTWF0Y2hpbmdVc2VyO1xuICAgICAgLy8gQmVjYXVzZSB3ZSB1cGdyYWRlIHVuaGFzaGVkIGxvZ2luIHRva2VucyB0byBoYXNoZWQgdG9rZW5zIGF0XG4gICAgICAvLyBsb2dpbiB0aW1lLCBzZXNzaW9ucyB3aWxsIG9ubHkgYmUgbG9nZ2VkIGluIHdpdGggYSBoYXNoZWRcbiAgICAgIC8vIHRva2VuLiBUaHVzIHdlIG9ubHkgbmVlZCB0byBvYnNlcnZlIGhhc2hlZCB0b2tlbnMgaGVyZS5cbiAgICAgIHZhciBvYnNlcnZlID0gc2VsZi51c2Vycy5maW5kKHtcbiAgICAgICAgX2lkOiB1c2VySWQsXG4gICAgICAgICdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nOiBuZXdUb2tlblxuICAgICAgfSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSkub2JzZXJ2ZUNoYW5nZXMoe1xuICAgICAgICBhZGRlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZvdW5kTWF0Y2hpbmdVc2VyID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAvLyBUaGUgb25DbG9zZSBjYWxsYmFjayBmb3IgdGhlIGNvbm5lY3Rpb24gdGFrZXMgY2FyZSBvZlxuICAgICAgICAgIC8vIGNsZWFuaW5nIHVwIHRoZSBvYnNlcnZlIGhhbmRsZSBhbmQgYW55IG90aGVyIHN0YXRlIHdlIGhhdmVcbiAgICAgICAgICAvLyBseWluZyBhcm91bmQuXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBJZiB0aGUgdXNlciByYW4gYW5vdGhlciBsb2dpbiBvciBsb2dvdXQgY29tbWFuZCB3ZSB3ZXJlIHdhaXRpbmcgZm9yIHRoZVxuICAgICAgLy8gZGVmZXIgb3IgYWRkZWQgdG8gZmlyZSAoaWUsIGFub3RoZXIgY2FsbCB0byBfc2V0TG9naW5Ub2tlbiBvY2N1cnJlZCksXG4gICAgICAvLyB0aGVuIHdlIGxldCB0aGUgbGF0ZXIgb25lIHdpbiAoc3RhcnQgYW4gb2JzZXJ2ZSwgZXRjKSBhbmQganVzdCBzdG9wIG91clxuICAgICAgLy8gb2JzZXJ2ZSBub3cuXG4gICAgICAvL1xuICAgICAgLy8gU2ltaWxhcmx5LCBpZiB0aGUgY29ubmVjdGlvbiB3YXMgYWxyZWFkeSBjbG9zZWQsIHRoZW4gdGhlIG9uQ2xvc2VcbiAgICAgIC8vIGNhbGxiYWNrIHdvdWxkIGhhdmUgY2FsbGVkIF9yZW1vdmVUb2tlbkZyb21Db25uZWN0aW9uIGFuZCB0aGVyZSB3b24ndFxuICAgICAgLy8gYmUgYW4gZW50cnkgaW4gX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zLiBXZSBjYW4gc3RvcCB0aGUgb2JzZXJ2ZS5cbiAgICAgIGlmIChzZWxmLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uLmlkXSAhPT0gbXlPYnNlcnZlTnVtYmVyKSB7XG4gICAgICAgIG9ic2VydmUuc3RvcCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHNlbGYuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb24uaWRdID0gb2JzZXJ2ZTtcblxuICAgICAgaWYgKCEgZm91bmRNYXRjaGluZ1VzZXIpIHtcbiAgICAgICAgLy8gV2UndmUgc2V0IHVwIGFuIG9ic2VydmUgb24gdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIGBuZXdUb2tlbmAsXG4gICAgICAgIC8vIHNvIGlmIHRoZSBuZXcgdG9rZW4gaXMgcmVtb3ZlZCBmcm9tIHRoZSBkYXRhYmFzZSwgd2UnbGwgY2xvc2VcbiAgICAgICAgLy8gdGhlIGNvbm5lY3Rpb24uIEJ1dCB0aGUgdG9rZW4gbWlnaHQgaGF2ZSBhbHJlYWR5IGJlZW4gZGVsZXRlZFxuICAgICAgICAvLyBiZWZvcmUgd2Ugc2V0IHVwIHRoZSBvYnNlcnZlLCB3aGljaCB3b3VsZG4ndCBoYXZlIGNsb3NlZCB0aGVcbiAgICAgICAgLy8gY29ubmVjdGlvbiBiZWNhdXNlIHRoZSBvYnNlcnZlIHdhc24ndCBydW5uaW5nIHlldC5cbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5mdW5jdGlvbiBzZXR1cERlZmF1bHRMb2dpbkhhbmRsZXJzKGFjY291bnRzKSB7XG4gIGFjY291bnRzLnJlZ2lzdGVyTG9naW5IYW5kbGVyKFwicmVzdW1lXCIsIGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRSZXN1bWVMb2dpbkhhbmRsZXIuY2FsbCh0aGlzLCBhY2NvdW50cywgb3B0aW9ucyk7XG4gIH0pO1xufVxuXG4vLyBMb2dpbiBoYW5kbGVyIGZvciByZXN1bWUgdG9rZW5zLlxuZnVuY3Rpb24gZGVmYXVsdFJlc3VtZUxvZ2luSGFuZGxlcihhY2NvdW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMucmVzdW1lKVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgY2hlY2sob3B0aW9ucy5yZXN1bWUsIFN0cmluZyk7XG5cbiAgdmFyIGhhc2hlZFRva2VuID0gYWNjb3VudHMuX2hhc2hMb2dpblRva2VuKG9wdGlvbnMucmVzdW1lKTtcblxuICAvLyBGaXJzdCBsb29rIGZvciBqdXN0IHRoZSBuZXctc3R5bGUgaGFzaGVkIGxvZ2luIHRva2VuLCB0byBhdm9pZFxuICAvLyBzZW5kaW5nIHRoZSB1bmhhc2hlZCB0b2tlbiB0byB0aGUgZGF0YWJhc2UgaW4gYSBxdWVyeSBpZiB3ZSBkb24ndFxuICAvLyBuZWVkIHRvLlxuICB2YXIgdXNlciA9IGFjY291bnRzLnVzZXJzLmZpbmRPbmUoXG4gICAge1wic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuXCI6IGhhc2hlZFRva2VufSk7XG5cbiAgaWYgKCEgdXNlcikge1xuICAgIC8vIElmIHdlIGRpZG4ndCBmaW5kIHRoZSBoYXNoZWQgbG9naW4gdG9rZW4sIHRyeSBhbHNvIGxvb2tpbmcgZm9yXG4gICAgLy8gdGhlIG9sZC1zdHlsZSB1bmhhc2hlZCB0b2tlbi4gIEJ1dCB3ZSBuZWVkIHRvIGxvb2sgZm9yIGVpdGhlclxuICAgIC8vIHRoZSBvbGQtc3R5bGUgdG9rZW4gT1IgdGhlIG5ldy1zdHlsZSB0b2tlbiwgYmVjYXVzZSBhbm90aGVyXG4gICAgLy8gY2xpZW50IGNvbm5lY3Rpb24gbG9nZ2luZyBpbiBzaW11bHRhbmVvdXNseSBtaWdodCBoYXZlIGFscmVhZHlcbiAgICAvLyBjb252ZXJ0ZWQgdGhlIHRva2VuLlxuICAgIHVzZXIgPSBhY2NvdW50cy51c2Vycy5maW5kT25lKHtcbiAgICAgICRvcjogW1xuICAgICAgICB7XCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW5cIjogaGFzaGVkVG9rZW59LFxuICAgICAgICB7XCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMudG9rZW5cIjogb3B0aW9ucy5yZXN1bWV9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBpZiAoISB1c2VyKVxuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiWW91J3ZlIGJlZW4gbG9nZ2VkIG91dCBieSB0aGUgc2VydmVyLiBQbGVhc2UgbG9nIGluIGFnYWluLlwiKVxuICAgIH07XG5cbiAgLy8gRmluZCB0aGUgdG9rZW4sIHdoaWNoIHdpbGwgZWl0aGVyIGJlIGFuIG9iamVjdCB3aXRoIGZpZWxkc1xuICAvLyB7aGFzaGVkVG9rZW4sIHdoZW59IGZvciBhIGhhc2hlZCB0b2tlbiBvciB7dG9rZW4sIHdoZW59IGZvciBhblxuICAvLyB1bmhhc2hlZCB0b2tlbi5cbiAgdmFyIG9sZFVuaGFzaGVkU3R5bGVUb2tlbjtcbiAgdmFyIHRva2VuID0gXy5maW5kKHVzZXIuc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLCBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICByZXR1cm4gdG9rZW4uaGFzaGVkVG9rZW4gPT09IGhhc2hlZFRva2VuO1xuICB9KTtcbiAgaWYgKHRva2VuKSB7XG4gICAgb2xkVW5oYXNoZWRTdHlsZVRva2VuID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdG9rZW4gPSBfLmZpbmQodXNlci5zZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMsIGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgcmV0dXJuIHRva2VuLnRva2VuID09PSBvcHRpb25zLnJlc3VtZTtcbiAgICB9KTtcbiAgICBvbGRVbmhhc2hlZFN0eWxlVG9rZW4gPSB0cnVlO1xuICB9XG5cbiAgdmFyIHRva2VuRXhwaXJlcyA9IGFjY291bnRzLl90b2tlbkV4cGlyYXRpb24odG9rZW4ud2hlbik7XG4gIGlmIChuZXcgRGF0ZSgpID49IHRva2VuRXhwaXJlcylcbiAgICByZXR1cm4ge1xuICAgICAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJZb3VyIHNlc3Npb24gaGFzIGV4cGlyZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uXCIpXG4gICAgfTtcblxuICAvLyBVcGRhdGUgdG8gYSBoYXNoZWQgdG9rZW4gd2hlbiBhbiB1bmhhc2hlZCB0b2tlbiBpcyBlbmNvdW50ZXJlZC5cbiAgaWYgKG9sZFVuaGFzaGVkU3R5bGVUb2tlbikge1xuICAgIC8vIE9ubHkgYWRkIHRoZSBuZXcgaGFzaGVkIHRva2VuIGlmIHRoZSBvbGQgdW5oYXNoZWQgdG9rZW4gc3RpbGxcbiAgICAvLyBleGlzdHMgKHRoaXMgYXZvaWRzIHJlc3VycmVjdGluZyB0aGUgdG9rZW4gaWYgaXQgd2FzIGRlbGV0ZWRcbiAgICAvLyBhZnRlciB3ZSByZWFkIGl0KS4gIFVzaW5nICRhZGRUb1NldCBhdm9pZHMgZ2V0dGluZyBhbiBpbmRleFxuICAgIC8vIGVycm9yIGlmIGFub3RoZXIgY2xpZW50IGxvZ2dpbmcgaW4gc2ltdWx0YW5lb3VzbHkgaGFzIGFscmVhZHlcbiAgICAvLyBpbnNlcnRlZCB0aGUgbmV3IGhhc2hlZCB0b2tlbi5cbiAgICBhY2NvdW50cy51c2Vycy51cGRhdGUoXG4gICAgICB7XG4gICAgICAgIF9pZDogdXNlci5faWQsXG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLnRva2VuXCI6IG9wdGlvbnMucmVzdW1lXG4gICAgICB9LFxuICAgICAgeyRhZGRUb1NldDoge1xuICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiB7XG4gICAgICAgICAgXCJoYXNoZWRUb2tlblwiOiBoYXNoZWRUb2tlbixcbiAgICAgICAgICBcIndoZW5cIjogdG9rZW4ud2hlblxuICAgICAgICB9XG4gICAgICB9fVxuICAgICk7XG5cbiAgICAvLyBSZW1vdmUgdGhlIG9sZCB0b2tlbiAqYWZ0ZXIqIGFkZGluZyB0aGUgbmV3LCBzaW5jZSBvdGhlcndpc2VcbiAgICAvLyBhbm90aGVyIGNsaWVudCB0cnlpbmcgdG8gbG9naW4gYmV0d2VlbiBvdXIgcmVtb3ZpbmcgdGhlIG9sZCBhbmRcbiAgICAvLyBhZGRpbmcgdGhlIG5ldyB3b3VsZG4ndCBmaW5kIGEgdG9rZW4gdG8gbG9naW4gd2l0aC5cbiAgICBhY2NvdW50cy51c2Vycy51cGRhdGUodXNlci5faWQsIHtcbiAgICAgICRwdWxsOiB7XG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IHsgXCJ0b2tlblwiOiBvcHRpb25zLnJlc3VtZSB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgc3RhbXBlZExvZ2luVG9rZW46IHtcbiAgICAgIHRva2VuOiBvcHRpb25zLnJlc3VtZSxcbiAgICAgIHdoZW46IHRva2VuLndoZW5cbiAgICB9XG4gIH07XG59XG5cbi8vIChBbHNvIHVzZWQgYnkgTWV0ZW9yIEFjY291bnRzIHNlcnZlciBhbmQgdGVzdHMpLlxuLy9cbkFwLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHRva2VuOiBSYW5kb20uc2VjcmV0KCksXG4gICAgd2hlbjogbmV3IERhdGVcbiAgfTtcbn07XG5cbi8vL1xuLy8vIFRPS0VOIEVYUElSQVRJT05cbi8vL1xuXG5mdW5jdGlvbiBleHBpcmVQYXNzd29yZFRva2VuKGFjY291bnRzLCBvbGRlc3RWYWxpZERhdGUsIHRva2VuRmlsdGVyLCB1c2VySWQpIHtcbiAgY29uc3QgdXNlckZpbHRlciA9IHVzZXJJZCA/IHtfaWQ6IHVzZXJJZH0gOiB7fTtcbiAgY29uc3QgcmVzZXRSYW5nZU9yID0ge1xuICAgICRvcjogW1xuICAgICAgeyBcInNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LndoZW5cIjogeyAkbHQ6IG9sZGVzdFZhbGlkRGF0ZSB9IH0sXG4gICAgICB7IFwic2VydmljZXMucGFzc3dvcmQucmVzZXQud2hlblwiOiB7ICRsdDogK29sZGVzdFZhbGlkRGF0ZSB9IH1cbiAgICBdXG4gIH07XG4gIGNvbnN0IGV4cGlyZUZpbHRlciA9IHsgJGFuZDogW3Rva2VuRmlsdGVyLCByZXNldFJhbmdlT3JdIH07XG5cbiAgYWNjb3VudHMudXNlcnMudXBkYXRlKHsuLi51c2VyRmlsdGVyLCAuLi5leHBpcmVGaWx0ZXJ9LCB7XG4gICAgJHVuc2V0OiB7XG4gICAgICBcInNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0XCI6IFwiXCJcbiAgICB9XG4gIH0sIHsgbXVsdGk6IHRydWUgfSk7XG59XG5cbi8vIERlbGV0ZXMgZXhwaXJlZCB0b2tlbnMgZnJvbSB0aGUgZGF0YWJhc2UgYW5kIGNsb3NlcyBhbGwgb3BlbiBjb25uZWN0aW9uc1xuLy8gYXNzb2NpYXRlZCB3aXRoIHRoZXNlIHRva2Vucy5cbi8vXG4vLyBFeHBvcnRlZCBmb3IgdGVzdHMuIEFsc28sIHRoZSBhcmd1bWVudHMgYXJlIG9ubHkgdXNlZCBieVxuLy8gdGVzdHMuIG9sZGVzdFZhbGlkRGF0ZSBpcyBzaW11bGF0ZSBleHBpcmluZyB0b2tlbnMgd2l0aG91dCB3YWl0aW5nXG4vLyBmb3IgdGhlbSB0byBhY3R1YWxseSBleHBpcmUuIHVzZXJJZCBpcyB1c2VkIGJ5IHRlc3RzIHRvIG9ubHkgZXhwaXJlXG4vLyB0b2tlbnMgZm9yIHRoZSB0ZXN0IHVzZXIuXG5BcC5fZXhwaXJlVG9rZW5zID0gZnVuY3Rpb24gKG9sZGVzdFZhbGlkRGF0ZSwgdXNlcklkKSB7XG4gIHZhciB0b2tlbkxpZmV0aW1lTXMgPSB0aGlzLl9nZXRUb2tlbkxpZmV0aW1lTXMoKTtcblxuICAvLyB3aGVuIGNhbGxpbmcgZnJvbSBhIHRlc3Qgd2l0aCBleHRyYSBhcmd1bWVudHMsIHlvdSBtdXN0IHNwZWNpZnkgYm90aCFcbiAgaWYgKChvbGRlc3RWYWxpZERhdGUgJiYgIXVzZXJJZCkgfHwgKCFvbGRlc3RWYWxpZERhdGUgJiYgdXNlcklkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkJhZCB0ZXN0LiBNdXN0IHNwZWNpZnkgYm90aCBvbGRlc3RWYWxpZERhdGUgYW5kIHVzZXJJZC5cIik7XG4gIH1cblxuICBvbGRlc3RWYWxpZERhdGUgPSBvbGRlc3RWYWxpZERhdGUgfHxcbiAgICAobmV3IERhdGUobmV3IERhdGUoKSAtIHRva2VuTGlmZXRpbWVNcykpO1xuICB2YXIgdXNlckZpbHRlciA9IHVzZXJJZCA/IHtfaWQ6IHVzZXJJZH0gOiB7fTtcblxuXG4gIC8vIEJhY2t3YXJkcyBjb21wYXRpYmxlIHdpdGggb2xkZXIgdmVyc2lvbnMgb2YgbWV0ZW9yIHRoYXQgc3RvcmVkIGxvZ2luIHRva2VuXG4gIC8vIHRpbWVzdGFtcHMgYXMgbnVtYmVycy5cbiAgdGhpcy51c2Vycy51cGRhdGUoXy5leHRlbmQodXNlckZpbHRlciwge1xuICAgICRvcjogW1xuICAgICAgeyBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy53aGVuXCI6IHsgJGx0OiBvbGRlc3RWYWxpZERhdGUgfSB9LFxuICAgICAgeyBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy53aGVuXCI6IHsgJGx0OiArb2xkZXN0VmFsaWREYXRlIH0gfVxuICAgIF1cbiAgfSksIHtcbiAgICAkcHVsbDoge1xuICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjoge1xuICAgICAgICAkb3I6IFtcbiAgICAgICAgICB7IHdoZW46IHsgJGx0OiBvbGRlc3RWYWxpZERhdGUgfSB9LFxuICAgICAgICAgIHsgd2hlbjogeyAkbHQ6ICtvbGRlc3RWYWxpZERhdGUgfSB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sIHsgbXVsdGk6IHRydWUgfSk7XG4gIC8vIFRoZSBvYnNlcnZlIG9uIE1ldGVvci51c2VycyB3aWxsIHRha2UgY2FyZSBvZiBjbG9zaW5nIGNvbm5lY3Rpb25zIGZvclxuICAvLyBleHBpcmVkIHRva2Vucy5cbn07XG5cbi8vIERlbGV0ZXMgZXhwaXJlZCBwYXNzd29yZCByZXNldCB0b2tlbnMgZnJvbSB0aGUgZGF0YWJhc2UuXG4vL1xuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzLiBBbHNvLCB0aGUgYXJndW1lbnRzIGFyZSBvbmx5IHVzZWQgYnlcbi8vIHRlc3RzLiBvbGRlc3RWYWxpZERhdGUgaXMgc2ltdWxhdGUgZXhwaXJpbmcgdG9rZW5zIHdpdGhvdXQgd2FpdGluZ1xuLy8gZm9yIHRoZW0gdG8gYWN0dWFsbHkgZXhwaXJlLiB1c2VySWQgaXMgdXNlZCBieSB0ZXN0cyB0byBvbmx5IGV4cGlyZVxuLy8gdG9rZW5zIGZvciB0aGUgdGVzdCB1c2VyLlxuQXAuX2V4cGlyZVBhc3N3b3JkUmVzZXRUb2tlbnMgPSBmdW5jdGlvbiAob2xkZXN0VmFsaWREYXRlLCB1c2VySWQpIHtcbiAgdmFyIHRva2VuTGlmZXRpbWVNcyA9IHRoaXMuX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMoKTtcblxuICAvLyB3aGVuIGNhbGxpbmcgZnJvbSBhIHRlc3Qgd2l0aCBleHRyYSBhcmd1bWVudHMsIHlvdSBtdXN0IHNwZWNpZnkgYm90aCFcbiAgaWYgKChvbGRlc3RWYWxpZERhdGUgJiYgIXVzZXJJZCkgfHwgKCFvbGRlc3RWYWxpZERhdGUgJiYgdXNlcklkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkJhZCB0ZXN0LiBNdXN0IHNwZWNpZnkgYm90aCBvbGRlc3RWYWxpZERhdGUgYW5kIHVzZXJJZC5cIik7XG4gIH1cblxuICBvbGRlc3RWYWxpZERhdGUgPSBvbGRlc3RWYWxpZERhdGUgfHxcbiAgICAobmV3IERhdGUobmV3IERhdGUoKSAtIHRva2VuTGlmZXRpbWVNcykpO1xuXG4gIHZhciB0b2tlbkZpbHRlciA9IHtcbiAgICAkb3I6IFtcbiAgICAgIHsgXCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC5yZWFzb25cIjogXCJyZXNldFwifSxcbiAgICAgIHsgXCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC5yZWFzb25cIjogeyRleGlzdHM6IGZhbHNlfX1cbiAgICBdXG4gIH07XG5cbiAgZXhwaXJlUGFzc3dvcmRUb2tlbih0aGlzLCBvbGRlc3RWYWxpZERhdGUsIHRva2VuRmlsdGVyLCB1c2VySWQpO1xufVxuXG4vLyBEZWxldGVzIGV4cGlyZWQgcGFzc3dvcmQgZW5yb2xsIHRva2VucyBmcm9tIHRoZSBkYXRhYmFzZS5cbi8vXG4vLyBFeHBvcnRlZCBmb3IgdGVzdHMuIEFsc28sIHRoZSBhcmd1bWVudHMgYXJlIG9ubHkgdXNlZCBieVxuLy8gdGVzdHMuIG9sZGVzdFZhbGlkRGF0ZSBpcyBzaW11bGF0ZSBleHBpcmluZyB0b2tlbnMgd2l0aG91dCB3YWl0aW5nXG4vLyBmb3IgdGhlbSB0byBhY3R1YWxseSBleHBpcmUuIHVzZXJJZCBpcyB1c2VkIGJ5IHRlc3RzIHRvIG9ubHkgZXhwaXJlXG4vLyB0b2tlbnMgZm9yIHRoZSB0ZXN0IHVzZXIuXG5BcC5fZXhwaXJlUGFzc3dvcmRFbnJvbGxUb2tlbnMgPSBmdW5jdGlvbiAob2xkZXN0VmFsaWREYXRlLCB1c2VySWQpIHtcbiAgdmFyIHRva2VuTGlmZXRpbWVNcyA9IHRoaXMuX2dldFBhc3N3b3JkRW5yb2xsVG9rZW5MaWZldGltZU1zKCk7XG5cbiAgLy8gd2hlbiBjYWxsaW5nIGZyb20gYSB0ZXN0IHdpdGggZXh0cmEgYXJndW1lbnRzLCB5b3UgbXVzdCBzcGVjaWZ5IGJvdGghXG4gIGlmICgob2xkZXN0VmFsaWREYXRlICYmICF1c2VySWQpIHx8ICghb2xkZXN0VmFsaWREYXRlICYmIHVzZXJJZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgdGVzdC4gTXVzdCBzcGVjaWZ5IGJvdGggb2xkZXN0VmFsaWREYXRlIGFuZCB1c2VySWQuXCIpO1xuICB9XG5cbiAgb2xkZXN0VmFsaWREYXRlID0gb2xkZXN0VmFsaWREYXRlIHx8XG4gICAgKG5ldyBEYXRlKG5ldyBEYXRlKCkgLSB0b2tlbkxpZmV0aW1lTXMpKTtcblxuICB2YXIgdG9rZW5GaWx0ZXIgPSB7XG4gICAgXCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC5yZWFzb25cIjogXCJlbnJvbGxcIlxuICB9O1xuXG4gIGV4cGlyZVBhc3N3b3JkVG9rZW4odGhpcywgb2xkZXN0VmFsaWREYXRlLCB0b2tlbkZpbHRlciwgdXNlcklkKTtcbn1cblxuLy8gQG92ZXJyaWRlIGZyb20gYWNjb3VudHNfY29tbW9uLmpzXG5BcC5jb25maWcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBDYWxsIHRoZSBvdmVycmlkZGVuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBtZXRob2QuXG4gIHZhciBzdXBlclJlc3VsdCA9IEFjY291bnRzQ29tbW9uLnByb3RvdHlwZS5jb25maWcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBJZiB0aGUgdXNlciBzZXQgbG9naW5FeHBpcmF0aW9uSW5EYXlzIHRvIG51bGwsIHRoZW4gd2UgbmVlZCB0byBjbGVhciB0aGVcbiAgLy8gdGltZXIgdGhhdCBwZXJpb2RpY2FsbHkgZXhwaXJlcyB0b2tlbnMuXG4gIGlmIChfLmhhcyh0aGlzLl9vcHRpb25zLCBcImxvZ2luRXhwaXJhdGlvbkluRGF5c1wiKSAmJlxuICAgICAgdGhpcy5fb3B0aW9ucy5sb2dpbkV4cGlyYXRpb25JbkRheXMgPT09IG51bGwgJiZcbiAgICAgIHRoaXMuZXhwaXJlVG9rZW5JbnRlcnZhbCkge1xuICAgIE1ldGVvci5jbGVhckludGVydmFsKHRoaXMuZXhwaXJlVG9rZW5JbnRlcnZhbCk7XG4gICAgdGhpcy5leHBpcmVUb2tlbkludGVydmFsID0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBzdXBlclJlc3VsdDtcbn07XG5cbmZ1bmN0aW9uIHNldEV4cGlyZVRva2Vuc0ludGVydmFsKGFjY291bnRzKSB7XG4gIGFjY291bnRzLmV4cGlyZVRva2VuSW50ZXJ2YWwgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgIGFjY291bnRzLl9leHBpcmVUb2tlbnMoKTtcbiAgICBhY2NvdW50cy5fZXhwaXJlUGFzc3dvcmRSZXNldFRva2VucygpO1xuICAgIGFjY291bnRzLl9leHBpcmVQYXNzd29yZEVucm9sbFRva2VucygpO1xuICB9LCBFWFBJUkVfVE9LRU5TX0lOVEVSVkFMX01TKTtcbn1cblxuXG4vLy9cbi8vLyBPQXV0aCBFbmNyeXB0aW9uIFN1cHBvcnRcbi8vL1xuXG52YXIgT0F1dGhFbmNyeXB0aW9uID1cbiAgUGFja2FnZVtcIm9hdXRoLWVuY3J5cHRpb25cIl0gJiZcbiAgUGFja2FnZVtcIm9hdXRoLWVuY3J5cHRpb25cIl0uT0F1dGhFbmNyeXB0aW9uO1xuXG5mdW5jdGlvbiB1c2luZ09BdXRoRW5jcnlwdGlvbigpIHtcbiAgcmV0dXJuIE9BdXRoRW5jcnlwdGlvbiAmJiBPQXV0aEVuY3J5cHRpb24ua2V5SXNMb2FkZWQoKTtcbn1cblxuXG4vLyBPQXV0aCBzZXJ2aWNlIGRhdGEgaXMgdGVtcG9yYXJpbHkgc3RvcmVkIGluIHRoZSBwZW5kaW5nIGNyZWRlbnRpYWxzXG4vLyBjb2xsZWN0aW9uIGR1cmluZyB0aGUgb2F1dGggYXV0aGVudGljYXRpb24gcHJvY2Vzcy4gIFNlbnNpdGl2ZSBkYXRhXG4vLyBzdWNoIGFzIGFjY2VzcyB0b2tlbnMgYXJlIGVuY3J5cHRlZCB3aXRob3V0IHRoZSB1c2VyIGlkIGJlY2F1c2Vcbi8vIHdlIGRvbid0IGtub3cgdGhlIHVzZXIgaWQgeWV0LiAgV2UgcmUtZW5jcnlwdCB0aGVzZSBmaWVsZHMgd2l0aCB0aGVcbi8vIHVzZXIgaWQgaW5jbHVkZWQgd2hlbiBzdG9yaW5nIHRoZSBzZXJ2aWNlIGRhdGEgcGVybWFuZW50bHkgaW5cbi8vIHRoZSB1c2VycyBjb2xsZWN0aW9uLlxuLy9cbmZ1bmN0aW9uIHBpbkVuY3J5cHRlZEZpZWxkc1RvVXNlcihzZXJ2aWNlRGF0YSwgdXNlcklkKSB7XG4gIF8uZWFjaChfLmtleXMoc2VydmljZURhdGEpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gc2VydmljZURhdGFba2V5XTtcbiAgICBpZiAoT0F1dGhFbmNyeXB0aW9uICYmIE9BdXRoRW5jcnlwdGlvbi5pc1NlYWxlZCh2YWx1ZSkpXG4gICAgICB2YWx1ZSA9IE9BdXRoRW5jcnlwdGlvbi5zZWFsKE9BdXRoRW5jcnlwdGlvbi5vcGVuKHZhbHVlKSwgdXNlcklkKTtcbiAgICBzZXJ2aWNlRGF0YVtrZXldID0gdmFsdWU7XG4gIH0pO1xufVxuXG5cbi8vIEVuY3J5cHQgdW5lbmNyeXB0ZWQgbG9naW4gc2VydmljZSBzZWNyZXRzIHdoZW4gb2F1dGgtZW5jcnlwdGlvbiBpc1xuLy8gYWRkZWQuXG4vL1xuLy8gWFhYIEZvciB0aGUgb2F1dGhTZWNyZXRLZXkgdG8gYmUgYXZhaWxhYmxlIGhlcmUgYXQgc3RhcnR1cCwgdGhlXG4vLyBkZXZlbG9wZXIgbXVzdCBjYWxsIEFjY291bnRzLmNvbmZpZyh7b2F1dGhTZWNyZXRLZXk6IC4uLn0pIGF0IGxvYWRcbi8vIHRpbWUsIGluc3RlYWQgb2YgaW4gYSBNZXRlb3Iuc3RhcnR1cCBibG9jaywgYmVjYXVzZSB0aGUgc3RhcnR1cFxuLy8gYmxvY2sgaW4gdGhlIGFwcCBjb2RlIHdpbGwgcnVuIGFmdGVyIHRoaXMgYWNjb3VudHMtYmFzZSBzdGFydHVwXG4vLyBibG9jay4gIFBlcmhhcHMgd2UgbmVlZCBhIHBvc3Qtc3RhcnR1cCBjYWxsYmFjaz9cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICBpZiAoISB1c2luZ09BdXRoRW5jcnlwdGlvbigpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIFNlcnZpY2VDb25maWd1cmF0aW9uID1cbiAgICBQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXS5TZXJ2aWNlQ29uZmlndXJhdGlvbjtcblxuICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy5maW5kKHtcbiAgICAkYW5kOiBbe1xuICAgICAgc2VjcmV0OiB7ICRleGlzdHM6IHRydWUgfVxuICAgIH0sIHtcbiAgICAgIFwic2VjcmV0LmFsZ29yaXRobVwiOiB7ICRleGlzdHM6IGZhbHNlIH1cbiAgICB9XVxuICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cGRhdGUoY29uZmlnLl9pZCwge1xuICAgICAgJHNldDoge1xuICAgICAgICBzZWNyZXQ6IE9BdXRoRW5jcnlwdGlvbi5zZWFsKGNvbmZpZy5zZWNyZXQpXG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vIFhYWCBzZWUgY29tbWVudCBvbiBBY2NvdW50cy5jcmVhdGVVc2VyIGluIHBhc3N3b3Jkc19zZXJ2ZXIgYWJvdXQgYWRkaW5nIGFcbi8vIHNlY29uZCBcInNlcnZlciBvcHRpb25zXCIgYXJndW1lbnQuXG5mdW5jdGlvbiBkZWZhdWx0Q3JlYXRlVXNlckhvb2sob3B0aW9ucywgdXNlcikge1xuICBpZiAob3B0aW9ucy5wcm9maWxlKVxuICAgIHVzZXIucHJvZmlsZSA9IG9wdGlvbnMucHJvZmlsZTtcbiAgcmV0dXJuIHVzZXI7XG59XG5cbi8vIENhbGxlZCBieSBhY2NvdW50cy1wYXNzd29yZFxuQXAuaW5zZXJ0VXNlckRvYyA9IGZ1bmN0aW9uIChvcHRpb25zLCB1c2VyKSB7XG4gIC8vIC0gY2xvbmUgdXNlciBkb2N1bWVudCwgdG8gcHJvdGVjdCBmcm9tIG1vZGlmaWNhdGlvblxuICAvLyAtIGFkZCBjcmVhdGVkQXQgdGltZXN0YW1wXG4gIC8vIC0gcHJlcGFyZSBhbiBfaWQsIHNvIHRoYXQgeW91IGNhbiBtb2RpZnkgb3RoZXIgY29sbGVjdGlvbnMgKGVnXG4gIC8vIGNyZWF0ZSBhIGZpcnN0IHRhc2sgZm9yIGV2ZXJ5IG5ldyB1c2VyKVxuICAvL1xuICAvLyBYWFggSWYgdGhlIG9uQ3JlYXRlVXNlciBvciB2YWxpZGF0ZU5ld1VzZXIgaG9va3MgZmFpbCwgd2UgbWlnaHRcbiAgLy8gZW5kIHVwIGhhdmluZyBtb2RpZmllZCBzb21lIG90aGVyIGNvbGxlY3Rpb25cbiAgLy8gaW5hcHByb3ByaWF0ZWx5LiBUaGUgc29sdXRpb24gaXMgcHJvYmFibHkgdG8gaGF2ZSBvbkNyZWF0ZVVzZXJcbiAgLy8gYWNjZXB0IHR3byBjYWxsYmFja3MgLSBvbmUgdGhhdCBnZXRzIGNhbGxlZCBiZWZvcmUgaW5zZXJ0aW5nXG4gIC8vIHRoZSB1c2VyIGRvY3VtZW50IChpbiB3aGljaCB5b3UgY2FuIG1vZGlmeSBpdHMgY29udGVudHMpLCBhbmRcbiAgLy8gb25lIHRoYXQgZ2V0cyBjYWxsZWQgYWZ0ZXIgKGluIHdoaWNoIHlvdSBzaG91bGQgY2hhbmdlIG90aGVyXG4gIC8vIGNvbGxlY3Rpb25zKVxuICB1c2VyID0gXy5leHRlbmQoe1xuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICBfaWQ6IFJhbmRvbS5pZCgpXG4gIH0sIHVzZXIpO1xuXG4gIGlmICh1c2VyLnNlcnZpY2VzKSB7XG4gICAgXy5lYWNoKHVzZXIuc2VydmljZXMsIGZ1bmN0aW9uIChzZXJ2aWNlRGF0YSkge1xuICAgICAgcGluRW5jcnlwdGVkRmllbGRzVG9Vc2VyKHNlcnZpY2VEYXRhLCB1c2VyLl9pZCk7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgZnVsbFVzZXI7XG4gIGlmICh0aGlzLl9vbkNyZWF0ZVVzZXJIb29rKSB7XG4gICAgZnVsbFVzZXIgPSB0aGlzLl9vbkNyZWF0ZVVzZXJIb29rKG9wdGlvbnMsIHVzZXIpO1xuXG4gICAgLy8gVGhpcyBpcyAqbm90KiBwYXJ0IG9mIHRoZSBBUEkuIFdlIG5lZWQgdGhpcyBiZWNhdXNlIHdlIGNhbid0IGlzb2xhdGVcbiAgICAvLyB0aGUgZ2xvYmFsIHNlcnZlciBlbnZpcm9ubWVudCBiZXR3ZWVuIHRlc3RzLCBtZWFuaW5nIHdlIGNhbid0IHRlc3RcbiAgICAvLyBib3RoIGhhdmluZyBhIGNyZWF0ZSB1c2VyIGhvb2sgc2V0IGFuZCBub3QgaGF2aW5nIG9uZSBzZXQuXG4gICAgaWYgKGZ1bGxVc2VyID09PSAnVEVTVCBERUZBVUxUIEhPT0snKVxuICAgICAgZnVsbFVzZXIgPSBkZWZhdWx0Q3JlYXRlVXNlckhvb2sob3B0aW9ucywgdXNlcik7XG4gIH0gZWxzZSB7XG4gICAgZnVsbFVzZXIgPSBkZWZhdWx0Q3JlYXRlVXNlckhvb2sob3B0aW9ucywgdXNlcik7XG4gIH1cblxuICBfLmVhY2godGhpcy5fdmFsaWRhdGVOZXdVc2VySG9va3MsIGZ1bmN0aW9uIChob29rKSB7XG4gICAgaWYgKCEgaG9vayhmdWxsVXNlcikpXG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJVc2VyIHZhbGlkYXRpb24gZmFpbGVkXCIpO1xuICB9KTtcblxuICB2YXIgdXNlcklkO1xuICB0cnkge1xuICAgIHVzZXJJZCA9IHRoaXMudXNlcnMuaW5zZXJ0KGZ1bGxVc2VyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIFhYWCBzdHJpbmcgcGFyc2luZyBzdWNrcywgbWF5YmVcbiAgICAvLyBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0zMDY5IHdpbGwgZ2V0IGZpeGVkIG9uZSBkYXlcbiAgICBpZiAoZS5uYW1lICE9PSAnTW9uZ29FcnJvcicpIHRocm93IGU7XG4gICAgaWYgKGUuY29kZSAhPT0gMTEwMDApIHRocm93IGU7XG4gICAgaWYgKGUuZXJybXNnLmluZGV4T2YoJ2VtYWlscy5hZGRyZXNzJykgIT09IC0xKVxuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiRW1haWwgYWxyZWFkeSBleGlzdHMuXCIpO1xuICAgIGlmIChlLmVycm1zZy5pbmRleE9mKCd1c2VybmFtZScpICE9PSAtMSlcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlVzZXJuYW1lIGFscmVhZHkgZXhpc3RzLlwiKTtcbiAgICAvLyBYWFggYmV0dGVyIGVycm9yIHJlcG9ydGluZyBmb3Igc2VydmljZXMuZmFjZWJvb2suaWQgZHVwbGljYXRlLCBldGNcbiAgICB0aHJvdyBlO1xuICB9XG4gIHJldHVybiB1c2VySWQ7XG59O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb246IHJldHVybnMgZmFsc2UgaWYgZW1haWwgZG9lcyBub3QgbWF0Y2ggY29tcGFueSBkb21haW4gZnJvbVxuLy8gdGhlIGNvbmZpZ3VyYXRpb24uXG5BcC5fdGVzdEVtYWlsRG9tYWluID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gIHZhciBkb21haW4gPSB0aGlzLl9vcHRpb25zLnJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluO1xuICByZXR1cm4gIWRvbWFpbiB8fFxuICAgIChfLmlzRnVuY3Rpb24oZG9tYWluKSAmJiBkb21haW4oZW1haWwpKSB8fFxuICAgIChfLmlzU3RyaW5nKGRvbWFpbikgJiZcbiAgICAgIChuZXcgUmVnRXhwKCdAJyArIE1ldGVvci5fZXNjYXBlUmVnRXhwKGRvbWFpbikgKyAnJCcsICdpJykpLnRlc3QoZW1haWwpKTtcbn07XG5cbi8vIFZhbGlkYXRlIG5ldyB1c2VyJ3MgZW1haWwgb3IgR29vZ2xlL0ZhY2Vib29rL0dpdEh1YiBhY2NvdW50J3MgZW1haWxcbmZ1bmN0aW9uIGRlZmF1bHRWYWxpZGF0ZU5ld1VzZXJIb29rKHVzZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZG9tYWluID0gc2VsZi5fb3B0aW9ucy5yZXN0cmljdENyZWF0aW9uQnlFbWFpbERvbWFpbjtcbiAgaWYgKCFkb21haW4pXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgdmFyIGVtYWlsSXNHb29kID0gZmFsc2U7XG4gIGlmICghXy5pc0VtcHR5KHVzZXIuZW1haWxzKSkge1xuICAgIGVtYWlsSXNHb29kID0gXy5hbnkodXNlci5lbWFpbHMsIGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgcmV0dXJuIHNlbGYuX3Rlc3RFbWFpbERvbWFpbihlbWFpbC5hZGRyZXNzKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICghXy5pc0VtcHR5KHVzZXIuc2VydmljZXMpKSB7XG4gICAgLy8gRmluZCBhbnkgZW1haWwgb2YgYW55IHNlcnZpY2UgYW5kIGNoZWNrIGl0XG4gICAgZW1haWxJc0dvb2QgPSBfLmFueSh1c2VyLnNlcnZpY2VzLCBmdW5jdGlvbiAoc2VydmljZSkge1xuICAgICAgcmV0dXJuIHNlcnZpY2UuZW1haWwgJiYgc2VsZi5fdGVzdEVtYWlsRG9tYWluKHNlcnZpY2UuZW1haWwpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKGVtYWlsSXNHb29kKVxuICAgIHJldHVybiB0cnVlO1xuXG4gIGlmIChfLmlzU3RyaW5nKGRvbWFpbikpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQFwiICsgZG9tYWluICsgXCIgZW1haWwgcmVxdWlyZWRcIik7XG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJFbWFpbCBkb2Vzbid0IG1hdGNoIHRoZSBjcml0ZXJpYS5cIik7XG59XG5cbi8vL1xuLy8vIE1BTkFHSU5HIFVTRVIgT0JKRUNUU1xuLy8vXG5cbi8vIFVwZGF0ZXMgb3IgY3JlYXRlcyBhIHVzZXIgYWZ0ZXIgd2UgYXV0aGVudGljYXRlIHdpdGggYSAzcmQgcGFydHkuXG4vL1xuLy8gQHBhcmFtIHNlcnZpY2VOYW1lIHtTdHJpbmd9IFNlcnZpY2UgbmFtZSAoZWcsIHR3aXR0ZXIpLlxuLy8gQHBhcmFtIHNlcnZpY2VEYXRhIHtPYmplY3R9IERhdGEgdG8gc3RvcmUgaW4gdGhlIHVzZXIncyByZWNvcmRcbi8vICAgICAgICB1bmRlciBzZXJ2aWNlc1tzZXJ2aWNlTmFtZV0uIE11c3QgaW5jbHVkZSBhbiBcImlkXCIgZmllbGRcbi8vICAgICAgICB3aGljaCBpcyBhIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgdXNlciBpbiB0aGUgc2VydmljZS5cbi8vIEBwYXJhbSBvcHRpb25zIHtPYmplY3QsIG9wdGlvbmFsfSBPdGhlciBvcHRpb25zIHRvIHBhc3MgdG8gaW5zZXJ0VXNlckRvY1xuLy8gICAgICAgIChlZywgcHJvZmlsZSlcbi8vIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRva2VuIGFuZCBpZCBrZXlzLCBsaWtlIHRoZSByZXN1bHRcbi8vICAgICAgICBvZiB0aGUgXCJsb2dpblwiIG1ldGhvZC5cbi8vXG5BcC51cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlID0gZnVuY3Rpb24gKFxuICBzZXJ2aWNlTmFtZSxcbiAgc2VydmljZURhdGEsXG4gIG9wdGlvbnNcbikge1xuICBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zIHx8IHt9KTtcblxuICBpZiAoc2VydmljZU5hbWUgPT09IFwicGFzc3dvcmRcIiB8fCBzZXJ2aWNlTmFtZSA9PT0gXCJyZXN1bWVcIilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIkNhbid0IHVzZSB1cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlIHdpdGggaW50ZXJuYWwgc2VydmljZSBcIlxuICAgICAgICArIHNlcnZpY2VOYW1lKTtcbiAgaWYgKCFfLmhhcyhzZXJ2aWNlRGF0YSwgJ2lkJykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJTZXJ2aWNlIGRhdGEgZm9yIHNlcnZpY2UgXCIgKyBzZXJ2aWNlTmFtZSArIFwiIG11c3QgaW5jbHVkZSBpZFwiKTtcblxuICAvLyBMb29rIGZvciBhIHVzZXIgd2l0aCB0aGUgYXBwcm9wcmlhdGUgc2VydmljZSB1c2VyIGlkLlxuICB2YXIgc2VsZWN0b3IgPSB7fTtcbiAgdmFyIHNlcnZpY2VJZEtleSA9IFwic2VydmljZXMuXCIgKyBzZXJ2aWNlTmFtZSArIFwiLmlkXCI7XG5cbiAgLy8gWFhYIFRlbXBvcmFyeSBzcGVjaWFsIGNhc2UgZm9yIFR3aXR0ZXIuIChJc3N1ZSAjNjI5KVxuICAvLyAgIFRoZSBzZXJ2aWNlRGF0YS5pZCB3aWxsIGJlIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIGludGVnZXIuXG4gIC8vICAgV2Ugd2FudCBpdCB0byBtYXRjaCBlaXRoZXIgYSBzdG9yZWQgc3RyaW5nIG9yIGludCByZXByZXNlbnRhdGlvbi5cbiAgLy8gICBUaGlzIGlzIHRvIGNhdGVyIHRvIGVhcmxpZXIgdmVyc2lvbnMgb2YgTWV0ZW9yIHN0b3JpbmcgdHdpdHRlclxuICAvLyAgIHVzZXIgSURzIGluIG51bWJlciBmb3JtLCBhbmQgcmVjZW50IHZlcnNpb25zIHN0b3JpbmcgdGhlbSBhcyBzdHJpbmdzLlxuICAvLyAgIFRoaXMgY2FuIGJlIHJlbW92ZWQgb25jZSBtaWdyYXRpb24gdGVjaG5vbG9neSBpcyBpbiBwbGFjZSwgYW5kIHR3aXR0ZXJcbiAgLy8gICB1c2VycyBzdG9yZWQgd2l0aCBpbnRlZ2VyIElEcyBoYXZlIGJlZW4gbWlncmF0ZWQgdG8gc3RyaW5nIElEcy5cbiAgaWYgKHNlcnZpY2VOYW1lID09PSBcInR3aXR0ZXJcIiAmJiAhaXNOYU4oc2VydmljZURhdGEuaWQpKSB7XG4gICAgc2VsZWN0b3JbXCIkb3JcIl0gPSBbe30se31dO1xuICAgIHNlbGVjdG9yW1wiJG9yXCJdWzBdW3NlcnZpY2VJZEtleV0gPSBzZXJ2aWNlRGF0YS5pZDtcbiAgICBzZWxlY3RvcltcIiRvclwiXVsxXVtzZXJ2aWNlSWRLZXldID0gcGFyc2VJbnQoc2VydmljZURhdGEuaWQsIDEwKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxlY3RvcltzZXJ2aWNlSWRLZXldID0gc2VydmljZURhdGEuaWQ7XG4gIH1cblxuICB2YXIgdXNlciA9IHRoaXMudXNlcnMuZmluZE9uZShzZWxlY3Rvcik7XG5cbiAgaWYgKHVzZXIpIHtcbiAgICBwaW5FbmNyeXB0ZWRGaWVsZHNUb1VzZXIoc2VydmljZURhdGEsIHVzZXIuX2lkKTtcblxuICAgIC8vIFdlICpkb24ndCogcHJvY2VzcyBvcHRpb25zIChlZywgcHJvZmlsZSkgZm9yIHVwZGF0ZSwgYnV0IHdlIGRvIHJlcGxhY2VcbiAgICAvLyB0aGUgc2VydmljZURhdGEgKGVnLCBzbyB0aGF0IHdlIGtlZXAgYW4gdW5leHBpcmVkIGFjY2VzcyB0b2tlbiBhbmRcbiAgICAvLyBkb24ndCBjYWNoZSBvbGQgZW1haWwgYWRkcmVzc2VzIGluIHNlcnZpY2VEYXRhLmVtYWlsKS5cbiAgICAvLyBYWFggcHJvdmlkZSBhbiBvblVwZGF0ZVVzZXIgaG9vayB3aGljaCB3b3VsZCBsZXQgYXBwcyB1cGRhdGVcbiAgICAvLyAgICAgdGhlIHByb2ZpbGUgdG9vXG4gICAgdmFyIHNldEF0dHJzID0ge307XG4gICAgXy5lYWNoKHNlcnZpY2VEYXRhLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgc2V0QXR0cnNbXCJzZXJ2aWNlcy5cIiArIHNlcnZpY2VOYW1lICsgXCIuXCIgKyBrZXldID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvLyBYWFggTWF5YmUgd2Ugc2hvdWxkIHJlLXVzZSB0aGUgc2VsZWN0b3IgYWJvdmUgYW5kIG5vdGljZSBpZiB0aGUgdXBkYXRlXG4gICAgLy8gICAgIHRvdWNoZXMgbm90aGluZz9cbiAgICB0aGlzLnVzZXJzLnVwZGF0ZSh1c2VyLl9pZCwge1xuICAgICAgJHNldDogc2V0QXR0cnNcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBzZXJ2aWNlTmFtZSxcbiAgICAgIHVzZXJJZDogdXNlci5faWRcbiAgICB9O1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gQ3JlYXRlIGEgbmV3IHVzZXIgd2l0aCB0aGUgc2VydmljZSBkYXRhLiBQYXNzIG90aGVyIG9wdGlvbnMgdGhyb3VnaCB0b1xuICAgIC8vIGluc2VydFVzZXJEb2MuXG4gICAgdXNlciA9IHtzZXJ2aWNlczoge319O1xuICAgIHVzZXIuc2VydmljZXNbc2VydmljZU5hbWVdID0gc2VydmljZURhdGE7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6IHNlcnZpY2VOYW1lLFxuICAgICAgdXNlcklkOiB0aGlzLmluc2VydFVzZXJEb2Mob3B0aW9ucywgdXNlcilcbiAgICB9O1xuICB9XG59O1xuXG5mdW5jdGlvbiBzZXR1cFVzZXJzQ29sbGVjdGlvbih1c2Vycykge1xuICAvLy9cbiAgLy8vIFJFU1RSSUNUSU5HIFdSSVRFUyBUTyBVU0VSIE9CSkVDVFNcbiAgLy8vXG4gIHVzZXJzLmFsbG93KHtcbiAgICAvLyBjbGllbnRzIGNhbiBtb2RpZnkgdGhlIHByb2ZpbGUgZmllbGQgb2YgdGhlaXIgb3duIGRvY3VtZW50LCBhbmRcbiAgICAvLyBub3RoaW5nIGVsc2UuXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAodXNlcklkLCB1c2VyLCBmaWVsZHMsIG1vZGlmaWVyKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgaXQgaXMgb3VyIHJlY29yZFxuICAgICAgaWYgKHVzZXIuX2lkICE9PSB1c2VySWQpXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gdXNlciBjYW4gb25seSBtb2RpZnkgdGhlICdwcm9maWxlJyBmaWVsZC4gc2V0cyB0byBtdWx0aXBsZVxuICAgICAgLy8gc3ViLWtleXMgKGVnIHByb2ZpbGUuZm9vIGFuZCBwcm9maWxlLmJhcikgYXJlIG1lcmdlZCBpbnRvIGVudHJ5XG4gICAgICAvLyBpbiB0aGUgZmllbGRzIGxpc3QuXG4gICAgICBpZiAoZmllbGRzLmxlbmd0aCAhPT0gMSB8fCBmaWVsZHNbMF0gIT09ICdwcm9maWxlJylcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIGZldGNoOiBbJ19pZCddIC8vIHdlIG9ubHkgbG9vayBhdCBfaWQuXG4gIH0pO1xuXG4gIC8vLyBERUZBVUxUIElOREVYRVMgT04gVVNFUlNcbiAgdXNlcnMuX2Vuc3VyZUluZGV4KCd1c2VybmFtZScsIHt1bmlxdWU6IDEsIHNwYXJzZTogMX0pO1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ2VtYWlscy5hZGRyZXNzJywge3VuaXF1ZTogMSwgc3BhcnNlOiAxfSk7XG4gIHVzZXJzLl9lbnN1cmVJbmRleCgnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuJyxcbiAgICAgICAgICAgICAgICAgICAgIHt1bmlxdWU6IDEsIHNwYXJzZTogMX0pO1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy50b2tlbicsXG4gICAgICAgICAgICAgICAgICAgICB7dW5pcXVlOiAxLCBzcGFyc2U6IDF9KTtcbiAgLy8gRm9yIHRha2luZyBjYXJlIG9mIGxvZ291dE90aGVyQ2xpZW50cyBjYWxscyB0aGF0IGNyYXNoZWQgYmVmb3JlIHRoZVxuICAvLyB0b2tlbnMgd2VyZSBkZWxldGVkLlxuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLnJlc3VtZS5oYXZlTG9naW5Ub2tlbnNUb0RlbGV0ZScsXG4gICAgICAgICAgICAgICAgICAgICB7IHNwYXJzZTogMSB9KTtcbiAgLy8gRm9yIGV4cGlyaW5nIGxvZ2luIHRva2Vuc1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMud2hlblwiLCB7IHNwYXJzZTogMSB9KTtcbiAgLy8gRm9yIGV4cGlyaW5nIHBhc3N3b3JkIHRva2Vuc1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LndoZW4nLCB7IHNwYXJzZTogMSB9KTtcbn1cblxuLy8vXG4vLy8gQ0xFQU4gVVAgRk9SIGBsb2dvdXRPdGhlckNsaWVudHNgXG4vLy9cblxuQXAuX2RlbGV0ZVNhdmVkVG9rZW5zRm9yVXNlciA9IGZ1bmN0aW9uICh1c2VySWQsIHRva2Vuc1RvRGVsZXRlKSB7XG4gIGlmICh0b2tlbnNUb0RlbGV0ZSkge1xuICAgIHRoaXMudXNlcnMudXBkYXRlKHVzZXJJZCwge1xuICAgICAgJHVuc2V0OiB7XG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlXCI6IDEsXG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zVG9EZWxldGVcIjogMVxuICAgICAgfSxcbiAgICAgICRwdWxsQWxsOiB7XG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IHRva2Vuc1RvRGVsZXRlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkFwLl9kZWxldGVTYXZlZFRva2Vuc0ZvckFsbFVzZXJzT25TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gSWYgd2UgZmluZCB1c2VycyB3aG8gaGF2ZSBzYXZlZCB0b2tlbnMgdG8gZGVsZXRlIG9uIHN0YXJ0dXAsIGRlbGV0ZVxuICAvLyB0aGVtIG5vdy4gSXQncyBwb3NzaWJsZSB0aGF0IHRoZSBzZXJ2ZXIgY291bGQgaGF2ZSBjcmFzaGVkIGFuZCBjb21lXG4gIC8vIGJhY2sgdXAgYmVmb3JlIG5ldyB0b2tlbnMgYXJlIGZvdW5kIGluIGxvY2FsU3RvcmFnZSwgYnV0IHRoaXNcbiAgLy8gc2hvdWxkbid0IGhhcHBlbiB2ZXJ5IG9mdGVuLiBXZSBzaG91bGRuJ3QgcHV0IGEgZGVsYXkgaGVyZSBiZWNhdXNlXG4gIC8vIHRoYXQgd291bGQgZ2l2ZSBhIGxvdCBvZiBwb3dlciB0byBhbiBhdHRhY2tlciB3aXRoIGEgc3RvbGVuIGxvZ2luXG4gIC8vIHRva2VuIGFuZCB0aGUgYWJpbGl0eSB0byBjcmFzaCB0aGUgc2VydmVyLlxuICBNZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi51c2Vycy5maW5kKHtcbiAgICAgIFwic2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlXCI6IHRydWVcbiAgICB9LCB7XG4gICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1RvRGVsZXRlXCI6IDFcbiAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICBzZWxmLl9kZWxldGVTYXZlZFRva2Vuc0ZvclVzZXIoXG4gICAgICAgIHVzZXIuX2lkLFxuICAgICAgICB1c2VyLnNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1RvRGVsZXRlXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn07XG4iLCJpbXBvcnQge0FjY291bnRzU2VydmVyfSBmcm9tIFwiLi9hY2NvdW50c19zZXJ2ZXIuanNcIjtcblxuLy8gWFhYIFRoZXNlIHNob3VsZCBwcm9iYWJseSBub3QgYWN0dWFsbHkgYmUgcHVibGljP1xuXG5BY2NvdW50c1NlcnZlci5wcm90b3R5cGUudXJscyA9IHtcbiAgcmVzZXRQYXNzd29yZDogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgcmV0dXJuIE1ldGVvci5hYnNvbHV0ZVVybCgnIy9yZXNldC1wYXNzd29yZC8nICsgdG9rZW4pO1xuICB9LFxuXG4gIHZlcmlmeUVtYWlsOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICByZXR1cm4gTWV0ZW9yLmFic29sdXRlVXJsKCcjL3ZlcmlmeS1lbWFpbC8nICsgdG9rZW4pO1xuICB9LFxuXG4gIGVucm9sbEFjY291bnQ6IGZ1bmN0aW9uICh0b2tlbikge1xuICAgIHJldHVybiBNZXRlb3IuYWJzb2x1dGVVcmwoJyMvZW5yb2xsLWFjY291bnQvJyArIHRva2VuKTtcbiAgfVxufTtcbiJdfQ==
