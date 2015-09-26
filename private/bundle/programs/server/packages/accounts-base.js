(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Hook = Package['callback-hook'].Hook;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var Accounts, AccountsTest, EXPIRE_TOKENS_INTERVAL_MS, CONNECTION_CLOSE_DELAY_MS, getTokenLifetimeMs, onLoginHook, onLoginFailureHook, maybeStopExpireTokensInterval;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/accounts_common.js                                                                     //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
/**                                                                                                              // 1
 * @namespace Accounts                                                                                           // 2
 * @summary The namespace for all accounts-related methods.                                                      // 3
 */                                                                                                              // 4
Accounts = {};                                                                                                   // 5
                                                                                                                 // 6
// Currently this is read directly by packages like accounts-password                                            // 7
// and accounts-ui-unstyled.                                                                                     // 8
Accounts._options = {};                                                                                          // 9
                                                                                                                 // 10
// how long (in days) until a login token expires                                                                // 11
var DEFAULT_LOGIN_EXPIRATION_DAYS = 90;                                                                          // 12
// Clients don't try to auto-login with a token that is going to expire within                                   // 13
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.                                    // 14
// Tries to avoid abrupt disconnects from expiring tokens.                                                       // 15
var MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour                                                              // 16
// how often (in milliseconds) we check for expired tokens                                                       // 17
EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000; // 10 minutes                                                            // 18
// how long we wait before logging out clients when Meteor.logoutOtherClients is                                 // 19
// called                                                                                                        // 20
CONNECTION_CLOSE_DELAY_MS = 10 * 1000;                                                                           // 21
                                                                                                                 // 22
// Set up config for the accounts system. Call this on both the client                                           // 23
// and the server.                                                                                               // 24
//                                                                                                               // 25
// XXX we should add some enforcement that this is called on both the                                            // 26
// client and the server. Otherwise, a user can                                                                  // 27
// 'forbidClientAccountCreation' only on the client and while it looks                                           // 28
// like their app is secure, the server will still accept createUser                                             // 29
// calls. https://github.com/meteor/meteor/issues/828                                                            // 30
//                                                                                                               // 31
// @param options {Object} an object with fields:                                                                // 32
// - sendVerificationEmail {Boolean}                                                                             // 33
//     Send email address verification emails to new users created from                                          // 34
//     client signups.                                                                                           // 35
// - forbidClientAccountCreation {Boolean}                                                                       // 36
//     Do not allow clients to create accounts directly.                                                         // 37
// - restrictCreationByEmailDomain {Function or String}                                                          // 38
//     Require created users to have an email matching the function or                                           // 39
//     having the string as domain.                                                                              // 40
// - loginExpirationInDays {Number}                                                                              // 41
//     Number of days since login until a user is logged out (login token                                        // 42
//     expires).                                                                                                 // 43
                                                                                                                 // 44
/**                                                                                                              // 45
 * @summary Set global accounts options.                                                                         // 46
 * @locus Anywhere                                                                                               // 47
 * @param {Object} options                                                                                       // 48
 * @param {Boolean} options.sendVerificationEmail New users with an email address will receive an address verification email.
 * @param {Boolean} options.forbidClientAccountCreation Calls to [`createUser`](#accounts_createuser) from the client will be rejected. In addition, if you are using [accounts-ui](#accountsui), the "Create account" link will not be available.
 * @param {String | Function} options.restrictCreationByEmailDomain If set to a string, only allows new users if the domain part of their email address matches the string. If set to a function, only allows new users if the function returns true.  The function is passed the full email address of the proposed new user.  Works with password-based sign-in and external services that expose email addresses (Google, Facebook, GitHub). All existing users still can log in after enabling this option. Example: `Accounts.config({ restrictCreationByEmailDomain: 'school.edu' })`.
 * @param {Number} options.loginExpirationInDays The number of days from when a user logs in until their token expires and they are logged out. Defaults to 90. Set to `null` to disable login expiration.
 * @param {String} options.oauthSecretKey When using the `oauth-encryption` package, the 16 byte key using to encrypt sensitive account credentials in the database, encoded in base64.  This option may only be specifed on the server.  See packages/oauth-encryption/README.md for details.
 */                                                                                                              // 54
Accounts.config = function(options) {                                                                            // 55
  // We don't want users to accidentally only call Accounts.config on the                                        // 56
  // client, where some of the options will have partial effects (eg removing                                    // 57
  // the "create account" button from accounts-ui if forbidClientAccountCreation                                 // 58
  // is set, or redirecting Google login to a specific-domain page) without                                      // 59
  // having their full effects.                                                                                  // 60
  if (Meteor.isServer) {                                                                                         // 61
    __meteor_runtime_config__.accountsConfigCalled = true;                                                       // 62
  } else if (!__meteor_runtime_config__.accountsConfigCalled) {                                                  // 63
    // XXX would be nice to "crash" the client and replace the UI with an error                                  // 64
    // message, but there's no trivial way to do this.                                                           // 65
    Meteor._debug("Accounts.config was called on the client but not on the " +                                   // 66
                  "server; some configuration options may not take effect.");                                    // 67
  }                                                                                                              // 68
                                                                                                                 // 69
  // We need to validate the oauthSecretKey option at the time                                                   // 70
  // Accounts.config is called. We also deliberately don't store the                                             // 71
  // oauthSecretKey in Accounts._options.                                                                        // 72
  if (_.has(options, "oauthSecretKey")) {                                                                        // 73
    if (Meteor.isClient)                                                                                         // 74
      throw new Error("The oauthSecretKey option may only be specified on the server");                          // 75
    if (! Package["oauth-encryption"])                                                                           // 76
      throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");                      // 77
    Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);                                 // 78
    options = _.omit(options, "oauthSecretKey");                                                                 // 79
  }                                                                                                              // 80
                                                                                                                 // 81
  // validate option keys                                                                                        // 82
  var VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation",                                      // 83
                    "restrictCreationByEmailDomain", "loginExpirationInDays"];                                   // 84
  _.each(_.keys(options), function (key) {                                                                       // 85
    if (!_.contains(VALID_KEYS, key)) {                                                                          // 86
      throw new Error("Accounts.config: Invalid key: " + key);                                                   // 87
    }                                                                                                            // 88
  });                                                                                                            // 89
                                                                                                                 // 90
  // set values in Accounts._options                                                                             // 91
  _.each(VALID_KEYS, function (key) {                                                                            // 92
    if (key in options) {                                                                                        // 93
      if (key in Accounts._options) {                                                                            // 94
        throw new Error("Can't set `" + key + "` more than once");                                               // 95
      } else {                                                                                                   // 96
        Accounts._options[key] = options[key];                                                                   // 97
      }                                                                                                          // 98
    }                                                                                                            // 99
  });                                                                                                            // 100
                                                                                                                 // 101
  // If the user set loginExpirationInDays to null, then we need to clear the                                    // 102
  // timer that periodically expires tokens.                                                                     // 103
  if (Meteor.isServer)                                                                                           // 104
    maybeStopExpireTokensInterval();                                                                             // 105
};                                                                                                               // 106
                                                                                                                 // 107
if (Meteor.isClient) {                                                                                           // 108
  // The connection used by the Accounts system. This is the connection                                          // 109
  // that will get logged in by Meteor.login(), and this is the                                                  // 110
  // connection whose login state will be reflected by Meteor.userId().                                          // 111
  //                                                                                                             // 112
  // It would be much preferable for this to be in accounts_client.js,                                           // 113
  // but it has to be here because it's needed to create the                                                     // 114
  // Meteor.users collection.                                                                                    // 115
  Accounts.connection = Meteor.connection;                                                                       // 116
                                                                                                                 // 117
  if (typeof __meteor_runtime_config__ !== "undefined" &&                                                        // 118
      __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {                                                       // 119
    // Temporary, internal hook to allow the server to point the client                                          // 120
    // to a different authentication server. This is for a very                                                  // 121
    // particular use case that comes up when implementing a oauth                                               // 122
    // server. Unsupported and may go away at any point in time.                                                 // 123
    //                                                                                                           // 124
    // We will eventually provide a general way to use account-base                                              // 125
    // against any DDP connection, not just one special one.                                                     // 126
    Accounts.connection = DDP.connect(                                                                           // 127
      __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL)                                                         // 128
  }                                                                                                              // 129
}                                                                                                                // 130
                                                                                                                 // 131
// Users table. Don't use the normal autopublish, since we want to hide                                          // 132
// some fields. Code to autopublish this is in accounts_server.js.                                               // 133
// XXX Allow users to configure this collection name.                                                            // 134
                                                                                                                 // 135
/**                                                                                                              // 136
 * @summary A [Mongo.Collection](#collections) containing user documents.                                        // 137
 * @locus Anywhere                                                                                               // 138
 * @type {Mongo.Collection}                                                                                      // 139
 */                                                                                                              // 140
Meteor.users = new Mongo.Collection("users", {                                                                   // 141
  _preventAutopublish: true,                                                                                     // 142
  connection: Meteor.isClient ? Accounts.connection : Meteor.connection                                          // 143
});                                                                                                              // 144
// There is an allow call in accounts_server that restricts this                                                 // 145
// collection.                                                                                                   // 146
                                                                                                                 // 147
// loginServiceConfiguration and ConfigError are maintained for backwards compatibility                          // 148
Meteor.startup(function () {                                                                                     // 149
  var ServiceConfiguration =                                                                                     // 150
    Package['service-configuration'].ServiceConfiguration;                                                       // 151
  Accounts.loginServiceConfiguration = ServiceConfiguration.configurations;                                      // 152
  Accounts.ConfigError = ServiceConfiguration.ConfigError;                                                       // 153
});                                                                                                              // 154
                                                                                                                 // 155
// Thrown when the user cancels the login process (eg, closes an oauth                                           // 156
// popup, declines retina scan, etc)                                                                             // 157
Accounts.LoginCancelledError = function(description) {                                                           // 158
  this.message = description;                                                                                    // 159
};                                                                                                               // 160
                                                                                                                 // 161
// This is used to transmit specific subclass errors over the wire. We should                                    // 162
// come up with a more generic way to do this (eg, with some sort of symbolic                                    // 163
// error code rather than a number).                                                                             // 164
Accounts.LoginCancelledError.numericError = 0x8acdc2f;                                                           // 165
Accounts.LoginCancelledError.prototype = new Error();                                                            // 166
Accounts.LoginCancelledError.prototype.name = 'Accounts.LoginCancelledError';                                    // 167
                                                                                                                 // 168
getTokenLifetimeMs = function () {                                                                               // 169
  return (Accounts._options.loginExpirationInDays ||                                                             // 170
          DEFAULT_LOGIN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;                                                  // 171
};                                                                                                               // 172
                                                                                                                 // 173
Accounts._tokenExpiration = function (when) {                                                                    // 174
  // We pass when through the Date constructor for backwards compatibility;                                      // 175
  // `when` used to be a number.                                                                                 // 176
  return new Date((new Date(when)).getTime() + getTokenLifetimeMs());                                            // 177
};                                                                                                               // 178
                                                                                                                 // 179
Accounts._tokenExpiresSoon = function (when) {                                                                   // 180
  var minLifetimeMs = .1 * getTokenLifetimeMs();                                                                 // 181
  var minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;                                                     // 182
  if (minLifetimeMs > minLifetimeCapMs)                                                                          // 183
    minLifetimeMs = minLifetimeCapMs;                                                                            // 184
  return new Date() > (new Date(when) - minLifetimeMs);                                                          // 185
};                                                                                                               // 186
                                                                                                                 // 187
// Callback exceptions are printed with Meteor._debug and ignored.                                               // 188
onLoginHook = new Hook({                                                                                         // 189
  debugPrintExceptions: "onLogin callback"                                                                       // 190
});                                                                                                              // 191
onLoginFailureHook = new Hook({                                                                                  // 192
  debugPrintExceptions: "onLoginFailure callback"                                                                // 193
});                                                                                                              // 194
                                                                                                                 // 195
                                                                                                                 // 196
/**                                                                                                              // 197
 * @summary Register a callback to be called after a login attempt succeeds.                                     // 198
 * @locus Anywhere                                                                                               // 199
 * @param {Function} func The callback to be called when login is successful.                                    // 200
 */                                                                                                              // 201
Accounts.onLogin = function (func) {                                                                             // 202
  return onLoginHook.register(func);                                                                             // 203
};                                                                                                               // 204
                                                                                                                 // 205
/**                                                                                                              // 206
 * @summary Register a callback to be called after a login attempt fails.                                        // 207
 * @locus Anywhere                                                                                               // 208
 * @param {Function} func The callback to be called after the login has failed.                                  // 209
 */                                                                                                              // 210
Accounts.onLoginFailure = function (func) {                                                                      // 211
  return onLoginFailureHook.register(func);                                                                      // 212
};                                                                                                               // 213
                                                                                                                 // 214
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/accounts_server.js                                                                     //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
var crypto = Npm.require('crypto');                                                                              // 1
                                                                                                                 // 2
///                                                                                                              // 3
/// CURRENT USER                                                                                                 // 4
///                                                                                                              // 5
                                                                                                                 // 6
Meteor.userId = function () {                                                                                    // 7
  // This function only works if called inside a method. In theory, it                                           // 8
  // could also be called from publish statements, since they also                                               // 9
  // have a userId associated with them. However, given that publish                                             // 10
  // functions aren't reactive, using any of the infomation from                                                 // 11
  // Meteor.user() in a publish function will always use the value                                               // 12
  // from when the function first runs. This is likely not what the                                              // 13
  // user expects. The way to make this work in a publish is to do                                               // 14
  // Meteor.find(this.userId()).observe and recompute when the user                                              // 15
  // record changes.                                                                                             // 16
  var currentInvocation = DDP._CurrentInvocation.get();                                                          // 17
  if (!currentInvocation)                                                                                        // 18
    throw new Error("Meteor.userId can only be invoked in method calls. Use this.userId in publish functions."); // 19
  return currentInvocation.userId;                                                                               // 20
};                                                                                                               // 21
                                                                                                                 // 22
Meteor.user = function () {                                                                                      // 23
  var userId = Meteor.userId();                                                                                  // 24
  if (!userId)                                                                                                   // 25
    return null;                                                                                                 // 26
  return Meteor.users.findOne(userId);                                                                           // 27
};                                                                                                               // 28
                                                                                                                 // 29
                                                                                                                 // 30
///                                                                                                              // 31
/// LOGIN HOOKS                                                                                                  // 32
///                                                                                                              // 33
                                                                                                                 // 34
// Exceptions inside the hook callback are passed up to us.                                                      // 35
var validateLoginHook = new Hook();                                                                              // 36
                                                                                                                 // 37
/**                                                                                                              // 38
 * @summary Validate login attempts.                                                                             // 39
 * @locus Server                                                                                                 // 40
 * @param {Function} func Called whenever a login is attempted (either successful or unsuccessful).  A login can be aborted by returning a falsy value or throwing an exception.
 */                                                                                                              // 42
Accounts.validateLoginAttempt = function (func) {                                                                // 43
  return validateLoginHook.register(func);                                                                       // 44
};                                                                                                               // 45
                                                                                                                 // 46
                                                                                                                 // 47
                                                                                                                 // 48
// Give each login hook callback a fresh cloned copy of the attempt                                              // 49
// object, but don't clone the connection.                                                                       // 50
//                                                                                                               // 51
var cloneAttemptWithConnection = function (connection, attempt) {                                                // 52
  var clonedAttempt = EJSON.clone(attempt);                                                                      // 53
  clonedAttempt.connection = connection;                                                                         // 54
  return clonedAttempt;                                                                                          // 55
};                                                                                                               // 56
                                                                                                                 // 57
var validateLogin = function (connection, attempt) {                                                             // 58
  validateLoginHook.each(function (callback) {                                                                   // 59
    var ret;                                                                                                     // 60
    try {                                                                                                        // 61
      ret = callback(cloneAttemptWithConnection(connection, attempt));                                           // 62
    }                                                                                                            // 63
    catch (e) {                                                                                                  // 64
      attempt.allowed = false;                                                                                   // 65
      // XXX this means the last thrown error overrides previous error                                           // 66
      // messages. Maybe this is surprising to users and we should make                                          // 67
      // overriding errors more explicit. (see                                                                   // 68
      // https://github.com/meteor/meteor/issues/1960)                                                           // 69
      attempt.error = e;                                                                                         // 70
      return true;                                                                                               // 71
    }                                                                                                            // 72
    if (! ret) {                                                                                                 // 73
      attempt.allowed = false;                                                                                   // 74
      // don't override a specific error provided by a previous                                                  // 75
      // validator or the initial attempt (eg "incorrect password").                                             // 76
      if (!attempt.error)                                                                                        // 77
        attempt.error = new Meteor.Error(403, "Login forbidden");                                                // 78
    }                                                                                                            // 79
    return true;                                                                                                 // 80
  });                                                                                                            // 81
};                                                                                                               // 82
                                                                                                                 // 83
                                                                                                                 // 84
var successfulLogin = function (connection, attempt) {                                                           // 85
  onLoginHook.each(function (callback) {                                                                         // 86
    callback(cloneAttemptWithConnection(connection, attempt));                                                   // 87
    return true;                                                                                                 // 88
  });                                                                                                            // 89
};                                                                                                               // 90
                                                                                                                 // 91
var failedLogin = function (connection, attempt) {                                                               // 92
  onLoginFailureHook.each(function (callback) {                                                                  // 93
    callback(cloneAttemptWithConnection(connection, attempt));                                                   // 94
    return true;                                                                                                 // 95
  });                                                                                                            // 96
};                                                                                                               // 97
                                                                                                                 // 98
                                                                                                                 // 99
///                                                                                                              // 100
/// LOGIN METHODS                                                                                                // 101
///                                                                                                              // 102
                                                                                                                 // 103
// Login methods return to the client an object containing these                                                 // 104
// fields when the user was logged in successfully:                                                              // 105
//                                                                                                               // 106
//   id: userId                                                                                                  // 107
//   token: *                                                                                                    // 108
//   tokenExpires: *                                                                                             // 109
//                                                                                                               // 110
// tokenExpires is optional and intends to provide a hint to the                                                 // 111
// client as to when the token will expire. If not provided, the                                                 // 112
// client will call Accounts._tokenExpiration, passing it the date                                               // 113
// that it received the token.                                                                                   // 114
//                                                                                                               // 115
// The login method will throw an error back to the client if the user                                           // 116
// failed to log in.                                                                                             // 117
//                                                                                                               // 118
//                                                                                                               // 119
// Login handlers and service specific login methods such as                                                     // 120
// `createUser` internally return a `result` object containing these                                             // 121
// fields:                                                                                                       // 122
//                                                                                                               // 123
//   type:                                                                                                       // 124
//     optional string; the service name, overrides the handler                                                  // 125
//     default if present.                                                                                       // 126
//                                                                                                               // 127
//   error:                                                                                                      // 128
//     exception; if the user is not allowed to login, the reason why.                                           // 129
//                                                                                                               // 130
//   userId:                                                                                                     // 131
//     string; the user id of the user attempting to login (if                                                   // 132
//     known), required for an allowed login.                                                                    // 133
//                                                                                                               // 134
//   options:                                                                                                    // 135
//     optional object merged into the result returned by the login                                              // 136
//     method; used by HAMK from SRP.                                                                            // 137
//                                                                                                               // 138
//   stampedLoginToken:                                                                                          // 139
//     optional object with `token` and `when` indicating the login                                              // 140
//     token is already present in the database, returned by the                                                 // 141
//     "resume" login handler.                                                                                   // 142
//                                                                                                               // 143
// For convenience, login methods can also throw an exception, which                                             // 144
// is converted into an {error} result.  However, if the id of the                                               // 145
// user attempting the login is known, a {userId, error} result should                                           // 146
// be returned instead since the user id is not captured when an                                                 // 147
// exception is thrown.                                                                                          // 148
//                                                                                                               // 149
// This internal `result` object is automatically converted into the                                             // 150
// public {id, token, tokenExpires} object returned to the client.                                               // 151
                                                                                                                 // 152
                                                                                                                 // 153
// Try a login method, converting thrown exceptions into an {error}                                              // 154
// result.  The `type` argument is a default, inserted into the result                                           // 155
// object if not explicitly returned.                                                                            // 156
//                                                                                                               // 157
var tryLoginMethod = function (type, fn) {                                                                       // 158
  var result;                                                                                                    // 159
  try {                                                                                                          // 160
    result = fn();                                                                                               // 161
  }                                                                                                              // 162
  catch (e) {                                                                                                    // 163
    result = {error: e};                                                                                         // 164
  }                                                                                                              // 165
                                                                                                                 // 166
  if (result && !result.type && type)                                                                            // 167
    result.type = type;                                                                                          // 168
                                                                                                                 // 169
  return result;                                                                                                 // 170
};                                                                                                               // 171
                                                                                                                 // 172
                                                                                                                 // 173
// Log in a user on a connection.                                                                                // 174
//                                                                                                               // 175
// We use the method invocation to set the user id on the connection,                                            // 176
// not the connection object directly. setUserId is tied to methods to                                           // 177
// enforce clear ordering of method application (using wait methods on                                           // 178
// the client, and a no setUserId after unblock restriction on the                                               // 179
// server)                                                                                                       // 180
//                                                                                                               // 181
// The `stampedLoginToken` parameter is optional.  When present, it                                              // 182
// indicates that the login token has already been inserted into the                                             // 183
// database and doesn't need to be inserted again.  (It's used by the                                            // 184
// "resume" login handler).                                                                                      // 185
var loginUser = function (methodInvocation, userId, stampedLoginToken) {                                         // 186
  if (! stampedLoginToken) {                                                                                     // 187
    stampedLoginToken = Accounts._generateStampedLoginToken();                                                   // 188
    Accounts._insertLoginToken(userId, stampedLoginToken);                                                       // 189
  }                                                                                                              // 190
                                                                                                                 // 191
  // This order (and the avoidance of yields) is important to make                                               // 192
  // sure that when publish functions are rerun, they see a                                                      // 193
  // consistent view of the world: the userId is set and matches                                                 // 194
  // the login token on the connection (not that there is                                                        // 195
  // currently a public API for reading the login token on a                                                     // 196
  // connection).                                                                                                // 197
  Meteor._noYieldsAllowed(function () {                                                                          // 198
    Accounts._setLoginToken(                                                                                     // 199
      userId,                                                                                                    // 200
      methodInvocation.connection,                                                                               // 201
      Accounts._hashLoginToken(stampedLoginToken.token)                                                          // 202
    );                                                                                                           // 203
  });                                                                                                            // 204
                                                                                                                 // 205
  methodInvocation.setUserId(userId);                                                                            // 206
                                                                                                                 // 207
  return {                                                                                                       // 208
    id: userId,                                                                                                  // 209
    token: stampedLoginToken.token,                                                                              // 210
    tokenExpires: Accounts._tokenExpiration(stampedLoginToken.when)                                              // 211
  };                                                                                                             // 212
};                                                                                                               // 213
                                                                                                                 // 214
                                                                                                                 // 215
// After a login method has completed, call the login hooks.  Note                                               // 216
// that `attemptLogin` is called for *all* login attempts, even ones                                             // 217
// which aren't successful (such as an invalid password, etc).                                                   // 218
//                                                                                                               // 219
// If the login is allowed and isn't aborted by a validate login hook                                            // 220
// callback, log in the user.                                                                                    // 221
//                                                                                                               // 222
var attemptLogin = function (methodInvocation, methodName, methodArgs, result) {                                 // 223
  if (!result)                                                                                                   // 224
    throw new Error("result is required");                                                                       // 225
                                                                                                                 // 226
  // XXX A programming error in a login handler can lead to this occuring, and                                   // 227
  // then we don't call onLogin or onLoginFailure callbacks. Should                                              // 228
  // tryLoginMethod catch this case and turn it into an error?                                                   // 229
  if (!result.userId && !result.error)                                                                           // 230
    throw new Error("A login method must specify a userId or an error");                                         // 231
                                                                                                                 // 232
  var user;                                                                                                      // 233
  if (result.userId)                                                                                             // 234
    user = Meteor.users.findOne(result.userId);                                                                  // 235
                                                                                                                 // 236
  var attempt = {                                                                                                // 237
    type: result.type || "unknown",                                                                              // 238
    allowed: !! (result.userId && !result.error),                                                                // 239
    methodName: methodName,                                                                                      // 240
    methodArguments: _.toArray(methodArgs)                                                                       // 241
  };                                                                                                             // 242
  if (result.error)                                                                                              // 243
    attempt.error = result.error;                                                                                // 244
  if (user)                                                                                                      // 245
    attempt.user = user;                                                                                         // 246
                                                                                                                 // 247
  // validateLogin may mutate `attempt` by adding an error and changing allowed                                  // 248
  // to false, but that's the only change it can make (and the user's callbacks                                  // 249
  // only get a clone of `attempt`).                                                                             // 250
  validateLogin(methodInvocation.connection, attempt);                                                           // 251
                                                                                                                 // 252
  if (attempt.allowed) {                                                                                         // 253
    var ret = _.extend(                                                                                          // 254
      loginUser(methodInvocation, result.userId, result.stampedLoginToken),                                      // 255
      result.options || {}                                                                                       // 256
    );                                                                                                           // 257
    successfulLogin(methodInvocation.connection, attempt);                                                       // 258
    return ret;                                                                                                  // 259
  }                                                                                                              // 260
  else {                                                                                                         // 261
    failedLogin(methodInvocation.connection, attempt);                                                           // 262
    throw attempt.error;                                                                                         // 263
  }                                                                                                              // 264
};                                                                                                               // 265
                                                                                                                 // 266
                                                                                                                 // 267
// All service specific login methods should go through this function.                                           // 268
// Ensure that thrown exceptions are caught and that login hook                                                  // 269
// callbacks are still called.                                                                                   // 270
//                                                                                                               // 271
Accounts._loginMethod = function (methodInvocation, methodName, methodArgs, type, fn) {                          // 272
  return attemptLogin(                                                                                           // 273
    methodInvocation,                                                                                            // 274
    methodName,                                                                                                  // 275
    methodArgs,                                                                                                  // 276
    tryLoginMethod(type, fn)                                                                                     // 277
  );                                                                                                             // 278
};                                                                                                               // 279
                                                                                                                 // 280
                                                                                                                 // 281
// Report a login attempt failed outside the context of a normal login                                           // 282
// method. This is for use in the case where there is a multi-step login                                         // 283
// procedure (eg SRP based password login). If a method early in the                                             // 284
// chain fails, it should call this function to report a failure. There                                          // 285
// is no corresponding method for a successful login; methods that can                                           // 286
// succeed at logging a user in should always be actual login methods                                            // 287
// (using either Accounts._loginMethod or Accounts.registerLoginHandler).                                        // 288
Accounts._reportLoginFailure = function (methodInvocation, methodName, methodArgs, result) {                     // 289
  var attempt = {                                                                                                // 290
    type: result.type || "unknown",                                                                              // 291
    allowed: false,                                                                                              // 292
    error: result.error,                                                                                         // 293
    methodName: methodName,                                                                                      // 294
    methodArguments: _.toArray(methodArgs)                                                                       // 295
  };                                                                                                             // 296
  if (result.userId)                                                                                             // 297
    attempt.user = Meteor.users.findOne(result.userId);                                                          // 298
                                                                                                                 // 299
  validateLogin(methodInvocation.connection, attempt);                                                           // 300
  failedLogin(methodInvocation.connection, attempt);                                                             // 301
  // validateLogin may mutate attempt to set a new error message. Return                                         // 302
  // the modified version.                                                                                       // 303
  return attempt;                                                                                                // 304
};                                                                                                               // 305
                                                                                                                 // 306
                                                                                                                 // 307
///                                                                                                              // 308
/// LOGIN HANDLERS                                                                                               // 309
///                                                                                                              // 310
                                                                                                                 // 311
// list of all registered handlers.                                                                              // 312
var loginHandlers = [];                                                                                          // 313
                                                                                                                 // 314
// The main entry point for auth packages to hook in to login.                                                   // 315
//                                                                                                               // 316
// A login handler is a login method which can return `undefined` to                                             // 317
// indicate that the login request is not handled by this handler.                                               // 318
//                                                                                                               // 319
// @param name {String} Optional.  The service name, used by default                                             // 320
// if a specific service name isn't returned in the result.                                                      // 321
//                                                                                                               // 322
// @param handler {Function} A function that receives an options object                                          // 323
// (as passed as an argument to the `login` method) and returns one of:                                          // 324
// - `undefined`, meaning don't handle;                                                                          // 325
// - a login method result object                                                                                // 326
                                                                                                                 // 327
Accounts.registerLoginHandler = function(name, handler) {                                                        // 328
  if (! handler) {                                                                                               // 329
    handler = name;                                                                                              // 330
    name = null;                                                                                                 // 331
  }                                                                                                              // 332
  loginHandlers.push({name: name, handler: handler});                                                            // 333
};                                                                                                               // 334
                                                                                                                 // 335
                                                                                                                 // 336
// Checks a user's credentials against all the registered login                                                  // 337
// handlers, and returns a login token if the credentials are valid. It                                          // 338
// is like the login method, except that it doesn't set the logged-in                                            // 339
// user on the connection. Throws a Meteor.Error if logging in fails,                                            // 340
// including the case where none of the login handlers handled the login                                         // 341
// request. Otherwise, returns {id: userId, token: *, tokenExpires: *}.                                          // 342
//                                                                                                               // 343
// For example, if you want to login with a plaintext password, `options` could be                               // 344
//   { user: { username: <username> }, password: <password> }, or                                                // 345
//   { user: { email: <email> }, password: <password> }.                                                         // 346
                                                                                                                 // 347
// Try all of the registered login handlers until one of them doesn't                                            // 348
// return `undefined`, meaning it handled this call to `login`. Return                                           // 349
// that return value.                                                                                            // 350
var runLoginHandlers = function (methodInvocation, options) {                                                    // 351
  for (var i = 0; i < loginHandlers.length; ++i) {                                                               // 352
    var handler = loginHandlers[i];                                                                              // 353
                                                                                                                 // 354
    var result = tryLoginMethod(                                                                                 // 355
      handler.name,                                                                                              // 356
      function () {                                                                                              // 357
        return handler.handler.call(methodInvocation, options);                                                  // 358
      }                                                                                                          // 359
    );                                                                                                           // 360
                                                                                                                 // 361
    if (result)                                                                                                  // 362
      return result;                                                                                             // 363
    else if (result !== undefined)                                                                               // 364
      throw new Meteor.Error(400, "A login handler should return a result or undefined");                        // 365
  }                                                                                                              // 366
                                                                                                                 // 367
  return {                                                                                                       // 368
    type: null,                                                                                                  // 369
    error: new Meteor.Error(400, "Unrecognized options for login request")                                       // 370
  };                                                                                                             // 371
};                                                                                                               // 372
                                                                                                                 // 373
// Deletes the given loginToken from the database.                                                               // 374
//                                                                                                               // 375
// For new-style hashed token, this will cause all connections                                                   // 376
// associated with the token to be closed.                                                                       // 377
//                                                                                                               // 378
// Any connections associated with old-style unhashed tokens will be                                             // 379
// in the process of becoming associated with hashed tokens and then                                             // 380
// they'll get closed.                                                                                           // 381
Accounts.destroyToken = function (userId, loginToken) {                                                          // 382
  Meteor.users.update(userId, {                                                                                  // 383
    $pull: {                                                                                                     // 384
      "services.resume.loginTokens": {                                                                           // 385
        $or: [                                                                                                   // 386
          { hashedToken: loginToken },                                                                           // 387
          { token: loginToken }                                                                                  // 388
        ]                                                                                                        // 389
      }                                                                                                          // 390
    }                                                                                                            // 391
  });                                                                                                            // 392
};                                                                                                               // 393
                                                                                                                 // 394
// Actual methods for login and logout. This is the entry point for                                              // 395
// clients to actually log in.                                                                                   // 396
Meteor.methods({                                                                                                 // 397
  // @returns {Object|null}                                                                                      // 398
  //   If successful, returns {token: reconnectToken, id: userId}                                                // 399
  //   If unsuccessful (for example, if the user closed the oauth login popup),                                  // 400
  //     throws an error describing the reason                                                                   // 401
  login: function(options) {                                                                                     // 402
    var self = this;                                                                                             // 403
                                                                                                                 // 404
    // Login handlers should really also check whatever field they look at in                                    // 405
    // options, but we don't enforce it.                                                                         // 406
    check(options, Object);                                                                                      // 407
                                                                                                                 // 408
    var result = runLoginHandlers(self, options);                                                                // 409
                                                                                                                 // 410
    return attemptLogin(self, "login", arguments, result);                                                       // 411
  },                                                                                                             // 412
                                                                                                                 // 413
  logout: function() {                                                                                           // 414
    var token = Accounts._getLoginToken(this.connection.id);                                                     // 415
    Accounts._setLoginToken(this.userId, this.connection, null);                                                 // 416
    if (token && this.userId)                                                                                    // 417
      Accounts.destroyToken(this.userId, token);                                                                 // 418
    this.setUserId(null);                                                                                        // 419
  },                                                                                                             // 420
                                                                                                                 // 421
  // Delete all the current user's tokens and close all open connections logged                                  // 422
  // in as this user. Returns a fresh new login token that this client can                                       // 423
  // use. Tests set Accounts._noConnectionCloseDelayForTest to delete tokens                                     // 424
  // immediately instead of using a delay.                                                                       // 425
  //                                                                                                             // 426
  // XXX COMPAT WITH 0.7.2                                                                                       // 427
  // This single `logoutOtherClients` method has been replaced with two                                          // 428
  // methods, one that you call to get a new token, and another that you                                         // 429
  // call to remove all tokens except your own. The new design allows                                            // 430
  // clients to know when other clients have actually been logged                                                // 431
  // out. (The `logoutOtherClients` method guarantees the caller that                                            // 432
  // the other clients will be logged out at some point, but makes no                                            // 433
  // guarantees about when.) This method is left in for backwards                                                // 434
  // compatibility, especially since application code might be calling                                           // 435
  // this method directly.                                                                                       // 436
  //                                                                                                             // 437
  // @returns {Object} Object with token and tokenExpires keys.                                                  // 438
  logoutOtherClients: function () {                                                                              // 439
    var self = this;                                                                                             // 440
    var user = Meteor.users.findOne(self.userId, {                                                               // 441
      fields: {                                                                                                  // 442
        "services.resume.loginTokens": true                                                                      // 443
      }                                                                                                          // 444
    });                                                                                                          // 445
    if (user) {                                                                                                  // 446
      // Save the current tokens in the database to be deleted in                                                // 447
      // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the                                       // 448
      // caller's browser time to find the fresh token in localStorage. We save                                  // 449
      // the tokens in the database in case we crash before actually deleting                                    // 450
      // them.                                                                                                   // 451
      var tokens = user.services.resume.loginTokens;                                                             // 452
      var newToken = Accounts._generateStampedLoginToken();                                                      // 453
      var userId = self.userId;                                                                                  // 454
      Meteor.users.update(userId, {                                                                              // 455
        $set: {                                                                                                  // 456
          "services.resume.loginTokensToDelete": tokens,                                                         // 457
          "services.resume.haveLoginTokensToDelete": true                                                        // 458
        },                                                                                                       // 459
        $push: { "services.resume.loginTokens": Accounts._hashStampedToken(newToken) }                           // 460
      });                                                                                                        // 461
      Meteor.setTimeout(function () {                                                                            // 462
        // The observe on Meteor.users will take care of closing the connections                                 // 463
        // associated with `tokens`.                                                                             // 464
        deleteSavedTokens(userId, tokens);                                                                       // 465
      }, Accounts._noConnectionCloseDelayForTest ? 0 :                                                           // 466
                        CONNECTION_CLOSE_DELAY_MS);                                                              // 467
      // We do not set the login token on this connection, but instead the                                       // 468
      // observe closes the connection and the client will reconnect with the                                    // 469
      // new token.                                                                                              // 470
      return {                                                                                                   // 471
        token: newToken.token,                                                                                   // 472
        tokenExpires: Accounts._tokenExpiration(newToken.when)                                                   // 473
      };                                                                                                         // 474
    } else {                                                                                                     // 475
      throw new Meteor.Error("You are not logged in.");                                                          // 476
    }                                                                                                            // 477
  },                                                                                                             // 478
                                                                                                                 // 479
  // Generates a new login token with the same expiration as the                                                 // 480
  // connection's current token and saves it to the database. Associates                                         // 481
  // the connection with this new token and returns it. Throws an error                                          // 482
  // if called on a connection that isn't logged in.                                                             // 483
  //                                                                                                             // 484
  // @returns Object                                                                                             // 485
  //   If successful, returns { token: <new token>, id: <user id>,                                               // 486
  //   tokenExpires: <expiration date> }.                                                                        // 487
  getNewToken: function () {                                                                                     // 488
    var self = this;                                                                                             // 489
    var user = Meteor.users.findOne(self.userId, {                                                               // 490
      fields: { "services.resume.loginTokens": 1 }                                                               // 491
    });                                                                                                          // 492
    if (! self.userId || ! user) {                                                                               // 493
      throw new Meteor.Error("You are not logged in.");                                                          // 494
    }                                                                                                            // 495
    // Be careful not to generate a new token that has a later                                                   // 496
    // expiration than the curren token. Otherwise, a bad guy with a                                             // 497
    // stolen token could use this method to stop his stolen token from                                          // 498
    // ever expiring.                                                                                            // 499
    var currentHashedToken = Accounts._getLoginToken(self.connection.id);                                        // 500
    var currentStampedToken = _.find(                                                                            // 501
      user.services.resume.loginTokens,                                                                          // 502
      function (stampedToken) {                                                                                  // 503
        return stampedToken.hashedToken === currentHashedToken;                                                  // 504
      }                                                                                                          // 505
    );                                                                                                           // 506
    if (! currentStampedToken) { // safety belt: this should never happen                                        // 507
      throw new Meteor.Error("Invalid login token");                                                             // 508
    }                                                                                                            // 509
    var newStampedToken = Accounts._generateStampedLoginToken();                                                 // 510
    newStampedToken.when = currentStampedToken.when;                                                             // 511
    Accounts._insertLoginToken(self.userId, newStampedToken);                                                    // 512
    return loginUser(self, self.userId, newStampedToken);                                                        // 513
  },                                                                                                             // 514
                                                                                                                 // 515
  // Removes all tokens except the token associated with the current                                             // 516
  // connection. Throws an error if the connection is not logged                                                 // 517
  // in. Returns nothing on success.                                                                             // 518
  removeOtherTokens: function () {                                                                               // 519
    var self = this;                                                                                             // 520
    if (! self.userId) {                                                                                         // 521
      throw new Meteor.Error("You are not logged in.");                                                          // 522
    }                                                                                                            // 523
    var currentToken = Accounts._getLoginToken(self.connection.id);                                              // 524
    Meteor.users.update(self.userId, {                                                                           // 525
      $pull: {                                                                                                   // 526
        "services.resume.loginTokens": { hashedToken: { $ne: currentToken } }                                    // 527
      }                                                                                                          // 528
    });                                                                                                          // 529
  }                                                                                                              // 530
});                                                                                                              // 531
                                                                                                                 // 532
///                                                                                                              // 533
/// ACCOUNT DATA                                                                                                 // 534
///                                                                                                              // 535
                                                                                                                 // 536
// connectionId -> {connection, loginToken}                                                                      // 537
var accountData = {};                                                                                            // 538
                                                                                                                 // 539
// HACK: This is used by 'meteor-accounts' to get the loginToken for a                                           // 540
// connection. Maybe there should be a public way to do that.                                                    // 541
Accounts._getAccountData = function (connectionId, field) {                                                      // 542
  var data = accountData[connectionId];                                                                          // 543
  return data && data[field];                                                                                    // 544
};                                                                                                               // 545
                                                                                                                 // 546
Accounts._setAccountData = function (connectionId, field, value) {                                               // 547
  var data = accountData[connectionId];                                                                          // 548
                                                                                                                 // 549
  // safety belt. shouldn't happen. accountData is set in onConnection,                                          // 550
  // we don't have a connectionId until it is set.                                                               // 551
  if (!data)                                                                                                     // 552
    return;                                                                                                      // 553
                                                                                                                 // 554
  if (value === undefined)                                                                                       // 555
    delete data[field];                                                                                          // 556
  else                                                                                                           // 557
    data[field] = value;                                                                                         // 558
};                                                                                                               // 559
                                                                                                                 // 560
Meteor.server.onConnection(function (connection) {                                                               // 561
  accountData[connection.id] = {connection: connection};                                                         // 562
  connection.onClose(function () {                                                                               // 563
    removeTokenFromConnection(connection.id);                                                                    // 564
    delete accountData[connection.id];                                                                           // 565
  });                                                                                                            // 566
});                                                                                                              // 567
                                                                                                                 // 568
                                                                                                                 // 569
///                                                                                                              // 570
/// RECONNECT TOKENS                                                                                             // 571
///                                                                                                              // 572
/// support reconnecting using a meteor login token                                                              // 573
                                                                                                                 // 574
Accounts._hashLoginToken = function (loginToken) {                                                               // 575
  var hash = crypto.createHash('sha256');                                                                        // 576
  hash.update(loginToken);                                                                                       // 577
  return hash.digest('base64');                                                                                  // 578
};                                                                                                               // 579
                                                                                                                 // 580
                                                                                                                 // 581
// {token, when} => {hashedToken, when}                                                                          // 582
Accounts._hashStampedToken = function (stampedToken) {                                                           // 583
  return _.extend(                                                                                               // 584
    _.omit(stampedToken, 'token'),                                                                               // 585
    {hashedToken: Accounts._hashLoginToken(stampedToken.token)}                                                  // 586
  );                                                                                                             // 587
};                                                                                                               // 588
                                                                                                                 // 589
                                                                                                                 // 590
// Using $addToSet avoids getting an index error if another client                                               // 591
// logging in simultaneously has already inserted the new hashed                                                 // 592
// token.                                                                                                        // 593
Accounts._insertHashedLoginToken = function (userId, hashedToken, query) {                                       // 594
  query = query ? _.clone(query) : {};                                                                           // 595
  query._id = userId;                                                                                            // 596
  Meteor.users.update(                                                                                           // 597
    query,                                                                                                       // 598
    { $addToSet: {                                                                                               // 599
        "services.resume.loginTokens": hashedToken                                                               // 600
    } }                                                                                                          // 601
  );                                                                                                             // 602
};                                                                                                               // 603
                                                                                                                 // 604
                                                                                                                 // 605
// Exported for tests.                                                                                           // 606
Accounts._insertLoginToken = function (userId, stampedToken, query) {                                            // 607
  Accounts._insertHashedLoginToken(                                                                              // 608
    userId,                                                                                                      // 609
    Accounts._hashStampedToken(stampedToken),                                                                    // 610
    query                                                                                                        // 611
  );                                                                                                             // 612
};                                                                                                               // 613
                                                                                                                 // 614
                                                                                                                 // 615
Accounts._clearAllLoginTokens = function (userId) {                                                              // 616
  Meteor.users.update(                                                                                           // 617
    userId,                                                                                                      // 618
    {$set: {'services.resume.loginTokens': []}}                                                                  // 619
  );                                                                                                             // 620
};                                                                                                               // 621
                                                                                                                 // 622
// connection id -> observe handle for the login token that this                                                 // 623
// connection is currently associated with, or null. Null indicates that                                         // 624
// we are in the process of setting up the observe.                                                              // 625
var userObservesForConnections = {};                                                                             // 626
                                                                                                                 // 627
// test hook                                                                                                     // 628
Accounts._getUserObserve = function (connectionId) {                                                             // 629
  return userObservesForConnections[connectionId];                                                               // 630
};                                                                                                               // 631
                                                                                                                 // 632
// Clean up this connection's association with the token: that is, stop                                          // 633
// the observe that we started when we associated the connection with                                            // 634
// this token.                                                                                                   // 635
var removeTokenFromConnection = function (connectionId) {                                                        // 636
  if (_.has(userObservesForConnections, connectionId)) {                                                         // 637
    var observe = userObservesForConnections[connectionId];                                                      // 638
    if (observe === null) {                                                                                      // 639
      // We're in the process of setting up an observe for this                                                  // 640
      // connection. We can't clean up that observe yet, but if we                                               // 641
      // delete the null placeholder for this connection, then the                                               // 642
      // observe will get cleaned up as soon as it has been set up.                                              // 643
      delete userObservesForConnections[connectionId];                                                           // 644
    } else {                                                                                                     // 645
      delete userObservesForConnections[connectionId];                                                           // 646
      observe.stop();                                                                                            // 647
    }                                                                                                            // 648
  }                                                                                                              // 649
};                                                                                                               // 650
                                                                                                                 // 651
Accounts._getLoginToken = function (connectionId) {                                                              // 652
  return Accounts._getAccountData(connectionId, 'loginToken');                                                   // 653
};                                                                                                               // 654
                                                                                                                 // 655
// newToken is a hashed token.                                                                                   // 656
Accounts._setLoginToken = function (userId, connection, newToken) {                                              // 657
  removeTokenFromConnection(connection.id);                                                                      // 658
  Accounts._setAccountData(connection.id, 'loginToken', newToken);                                               // 659
                                                                                                                 // 660
  if (newToken) {                                                                                                // 661
    // Set up an observe for this token. If the token goes away, we need                                         // 662
    // to close the connection.  We defer the observe because there's                                            // 663
    // no need for it to be on the critical path for login; we just need                                         // 664
    // to ensure that the connection will get closed at some point if                                            // 665
    // the token gets deleted.                                                                                   // 666
    //                                                                                                           // 667
    // Initially, we set the observe for this connection to null; this                                           // 668
    // signifies to other code (which might run while we yield) that we                                          // 669
    // are in the process of setting up an observe for this                                                      // 670
    // connection. Once the observe is ready to go, we replace null with                                         // 671
    // the real observe handle (unless the placeholder has been deleted,                                         // 672
    // signifying that the connection was closed already -- in this case                                         // 673
    // we just clean up the observe that we started).                                                            // 674
    userObservesForConnections[connection.id] = null;                                                            // 675
    Meteor.defer(function () {                                                                                   // 676
      var foundMatchingUser;                                                                                     // 677
      // Because we upgrade unhashed login tokens to hashed tokens at                                            // 678
      // login time, sessions will only be logged in with a hashed                                               // 679
      // token. Thus we only need to observe hashed tokens here.                                                 // 680
      var observe = Meteor.users.find({                                                                          // 681
        _id: userId,                                                                                             // 682
        'services.resume.loginTokens.hashedToken': newToken                                                      // 683
      }, { fields: { _id: 1 } }).observeChanges({                                                                // 684
        added: function () {                                                                                     // 685
          foundMatchingUser = true;                                                                              // 686
        },                                                                                                       // 687
        removed: function () {                                                                                   // 688
          connection.close();                                                                                    // 689
          // The onClose callback for the connection takes care of                                               // 690
          // cleaning up the observe handle and any other state we have                                          // 691
          // lying around.                                                                                       // 692
        }                                                                                                        // 693
      });                                                                                                        // 694
                                                                                                                 // 695
      // If the user ran another login or logout command we were waiting for                                     // 696
      // the defer or added to fire, then we let the later one win (start an                                     // 697
      // observe, etc) and just stop our observe now.                                                            // 698
      //                                                                                                         // 699
      // Similarly, if the connection was already closed, then the onClose                                       // 700
      // callback would have called removeTokenFromConnection and there won't be                                 // 701
      // an entry in userObservesForConnections. We can stop the observe.                                        // 702
      if (Accounts._getAccountData(connection.id, 'loginToken') !== newToken ||                                  // 703
          !_.has(userObservesForConnections, connection.id)) {                                                   // 704
        observe.stop();                                                                                          // 705
        return;                                                                                                  // 706
      }                                                                                                          // 707
                                                                                                                 // 708
      if (userObservesForConnections[connection.id] !== null) {                                                  // 709
        throw new Error("Non-null user observe for connection " +                                                // 710
                        connection.id + " while observe was being set up?");                                     // 711
      }                                                                                                          // 712
                                                                                                                 // 713
      userObservesForConnections[connection.id] = observe;                                                       // 714
                                                                                                                 // 715
      if (! foundMatchingUser) {                                                                                 // 716
        // We've set up an observe on the user associated with `newToken`,                                       // 717
        // so if the new token is removed from the database, we'll close                                         // 718
        // the connection. But the token might have already been deleted                                         // 719
        // before we set up the observe, which wouldn't have closed the                                          // 720
        // connection because the observe wasn't running yet.                                                    // 721
        connection.close();                                                                                      // 722
      }                                                                                                          // 723
    });                                                                                                          // 724
  }                                                                                                              // 725
};                                                                                                               // 726
                                                                                                                 // 727
// Login handler for resume tokens.                                                                              // 728
Accounts.registerLoginHandler("resume", function(options) {                                                      // 729
  if (!options.resume)                                                                                           // 730
    return undefined;                                                                                            // 731
                                                                                                                 // 732
  check(options.resume, String);                                                                                 // 733
                                                                                                                 // 734
  var hashedToken = Accounts._hashLoginToken(options.resume);                                                    // 735
                                                                                                                 // 736
  // First look for just the new-style hashed login token, to avoid                                              // 737
  // sending the unhashed token to the database in a query if we don't                                           // 738
  // need to.                                                                                                    // 739
  var user = Meteor.users.findOne(                                                                               // 740
    {"services.resume.loginTokens.hashedToken": hashedToken});                                                   // 741
                                                                                                                 // 742
  if (! user) {                                                                                                  // 743
    // If we didn't find the hashed login token, try also looking for                                            // 744
    // the old-style unhashed token.  But we need to look for either                                             // 745
    // the old-style token OR the new-style token, because another                                               // 746
    // client connection logging in simultaneously might have already                                            // 747
    // converted the token.                                                                                      // 748
    user = Meteor.users.findOne({                                                                                // 749
      $or: [                                                                                                     // 750
        {"services.resume.loginTokens.hashedToken": hashedToken},                                                // 751
        {"services.resume.loginTokens.token": options.resume}                                                    // 752
      ]                                                                                                          // 753
    });                                                                                                          // 754
  }                                                                                                              // 755
                                                                                                                 // 756
  if (! user)                                                                                                    // 757
    return {                                                                                                     // 758
      error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")                 // 759
    };                                                                                                           // 760
                                                                                                                 // 761
  // Find the token, which will either be an object with fields                                                  // 762
  // {hashedToken, when} for a hashed token or {token, when} for an                                              // 763
  // unhashed token.                                                                                             // 764
  var oldUnhashedStyleToken;                                                                                     // 765
  var token = _.find(user.services.resume.loginTokens, function (token) {                                        // 766
    return token.hashedToken === hashedToken;                                                                    // 767
  });                                                                                                            // 768
  if (token) {                                                                                                   // 769
    oldUnhashedStyleToken = false;                                                                               // 770
  } else {                                                                                                       // 771
    token = _.find(user.services.resume.loginTokens, function (token) {                                          // 772
      return token.token === options.resume;                                                                     // 773
    });                                                                                                          // 774
    oldUnhashedStyleToken = true;                                                                                // 775
  }                                                                                                              // 776
                                                                                                                 // 777
  var tokenExpires = Accounts._tokenExpiration(token.when);                                                      // 778
  if (new Date() >= tokenExpires)                                                                                // 779
    return {                                                                                                     // 780
      userId: user._id,                                                                                          // 781
      error: new Meteor.Error(403, "Your session has expired. Please log in again.")                             // 782
    };                                                                                                           // 783
                                                                                                                 // 784
  // Update to a hashed token when an unhashed token is encountered.                                             // 785
  if (oldUnhashedStyleToken) {                                                                                   // 786
    // Only add the new hashed token if the old unhashed token still                                             // 787
    // exists (this avoids resurrecting the token if it was deleted                                              // 788
    // after we read it).  Using $addToSet avoids getting an index                                               // 789
    // error if another client logging in simultaneously has already                                             // 790
    // inserted the new hashed token.                                                                            // 791
    Meteor.users.update(                                                                                         // 792
      {                                                                                                          // 793
        _id: user._id,                                                                                           // 794
        "services.resume.loginTokens.token": options.resume                                                      // 795
      },                                                                                                         // 796
      {$addToSet: {                                                                                              // 797
        "services.resume.loginTokens": {                                                                         // 798
          "hashedToken": hashedToken,                                                                            // 799
          "when": token.when                                                                                     // 800
        }                                                                                                        // 801
      }}                                                                                                         // 802
    );                                                                                                           // 803
                                                                                                                 // 804
    // Remove the old token *after* adding the new, since otherwise                                              // 805
    // another client trying to login between our removing the old and                                           // 806
    // adding the new wouldn't find a token to login with.                                                       // 807
    Meteor.users.update(user._id, {                                                                              // 808
      $pull: {                                                                                                   // 809
        "services.resume.loginTokens": { "token": options.resume }                                               // 810
      }                                                                                                          // 811
    });                                                                                                          // 812
  }                                                                                                              // 813
                                                                                                                 // 814
  return {                                                                                                       // 815
    userId: user._id,                                                                                            // 816
    stampedLoginToken: {                                                                                         // 817
      token: options.resume,                                                                                     // 818
      when: token.when                                                                                           // 819
    }                                                                                                            // 820
  };                                                                                                             // 821
});                                                                                                              // 822
                                                                                                                 // 823
// (Also used by Meteor Accounts server and tests).                                                              // 824
//                                                                                                               // 825
Accounts._generateStampedLoginToken = function () {                                                              // 826
  return {token: Random.secret(), when: (new Date)};                                                             // 827
};                                                                                                               // 828
                                                                                                                 // 829
///                                                                                                              // 830
/// TOKEN EXPIRATION                                                                                             // 831
///                                                                                                              // 832
                                                                                                                 // 833
var expireTokenInterval;                                                                                         // 834
                                                                                                                 // 835
// Deletes expired tokens from the database and closes all open connections                                      // 836
// associated with these tokens.                                                                                 // 837
//                                                                                                               // 838
// Exported for tests. Also, the arguments are only used by                                                      // 839
// tests. oldestValidDate is simulate expiring tokens without waiting                                            // 840
// for them to actually expire. userId is used by tests to only expire                                           // 841
// tokens for the test user.                                                                                     // 842
var expireTokens = Accounts._expireTokens = function (oldestValidDate, userId) {                                 // 843
  var tokenLifetimeMs = getTokenLifetimeMs();                                                                    // 844
                                                                                                                 // 845
  // when calling from a test with extra arguments, you must specify both!                                       // 846
  if ((oldestValidDate && !userId) || (!oldestValidDate && userId)) {                                            // 847
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");                                  // 848
  }                                                                                                              // 849
                                                                                                                 // 850
  oldestValidDate = oldestValidDate ||                                                                           // 851
    (new Date(new Date() - tokenLifetimeMs));                                                                    // 852
  var userFilter = userId ? {_id: userId} : {};                                                                  // 853
                                                                                                                 // 854
                                                                                                                 // 855
  // Backwards compatible with older versions of meteor that stored login token                                  // 856
  // timestamps as numbers.                                                                                      // 857
  Meteor.users.update(_.extend(userFilter, {                                                                     // 858
    $or: [                                                                                                       // 859
      { "services.resume.loginTokens.when": { $lt: oldestValidDate } },                                          // 860
      { "services.resume.loginTokens.when": { $lt: +oldestValidDate } }                                          // 861
    ]                                                                                                            // 862
  }), {                                                                                                          // 863
    $pull: {                                                                                                     // 864
      "services.resume.loginTokens": {                                                                           // 865
        $or: [                                                                                                   // 866
          { when: { $lt: oldestValidDate } },                                                                    // 867
          { when: { $lt: +oldestValidDate } }                                                                    // 868
        ]                                                                                                        // 869
      }                                                                                                          // 870
    }                                                                                                            // 871
  }, { multi: true });                                                                                           // 872
  // The observe on Meteor.users will take care of closing connections for                                       // 873
  // expired tokens.                                                                                             // 874
};                                                                                                               // 875
                                                                                                                 // 876
maybeStopExpireTokensInterval = function () {                                                                    // 877
  if (_.has(Accounts._options, "loginExpirationInDays") &&                                                       // 878
      Accounts._options.loginExpirationInDays === null &&                                                        // 879
      expireTokenInterval) {                                                                                     // 880
    Meteor.clearInterval(expireTokenInterval);                                                                   // 881
    expireTokenInterval = null;                                                                                  // 882
  }                                                                                                              // 883
};                                                                                                               // 884
                                                                                                                 // 885
expireTokenInterval = Meteor.setInterval(expireTokens,                                                           // 886
                                         EXPIRE_TOKENS_INTERVAL_MS);                                             // 887
                                                                                                                 // 888
                                                                                                                 // 889
///                                                                                                              // 890
/// OAuth Encryption Support                                                                                     // 891
///                                                                                                              // 892
                                                                                                                 // 893
var OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;                // 894
                                                                                                                 // 895
                                                                                                                 // 896
var usingOAuthEncryption = function () {                                                                         // 897
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();                                                       // 898
};                                                                                                               // 899
                                                                                                                 // 900
                                                                                                                 // 901
// OAuth service data is temporarily stored in the pending credentials                                           // 902
// collection during the oauth authentication process.  Sensitive data                                           // 903
// such as access tokens are encrypted without the user id because                                               // 904
// we don't know the user id yet.  We re-encrypt these fields with the                                           // 905
// user id included when storing the service data permanently in                                                 // 906
// the users collection.                                                                                         // 907
//                                                                                                               // 908
var pinEncryptedFieldsToUser = function (serviceData, userId) {                                                  // 909
  _.each(_.keys(serviceData), function (key) {                                                                   // 910
    var value = serviceData[key];                                                                                // 911
    if (OAuthEncryption && OAuthEncryption.isSealed(value))                                                      // 912
      value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);                                         // 913
    serviceData[key] = value;                                                                                    // 914
  });                                                                                                            // 915
};                                                                                                               // 916
                                                                                                                 // 917
                                                                                                                 // 918
// Encrypt unencrypted login service secrets when oauth-encryption is                                            // 919
// added.                                                                                                        // 920
//                                                                                                               // 921
// XXX For the oauthSecretKey to be available here at startup, the                                               // 922
// developer must call Accounts.config({oauthSecretKey: ...}) at load                                            // 923
// time, instead of in a Meteor.startup block, because the startup                                               // 924
// block in the app code will run after this accounts-base startup                                               // 925
// block.  Perhaps we need a post-startup callback?                                                              // 926
                                                                                                                 // 927
Meteor.startup(function () {                                                                                     // 928
  if (!usingOAuthEncryption())                                                                                   // 929
    return;                                                                                                      // 930
                                                                                                                 // 931
  var ServiceConfiguration =                                                                                     // 932
    Package['service-configuration'].ServiceConfiguration;                                                       // 933
                                                                                                                 // 934
  ServiceConfiguration.configurations.find( {$and: [                                                             // 935
      { secret: {$exists: true} },                                                                               // 936
      { "secret.algorithm": {$exists: false} }                                                                   // 937
    ] } ).                                                                                                       // 938
    forEach(function (config) {                                                                                  // 939
      ServiceConfiguration.configurations.update(                                                                // 940
        config._id,                                                                                              // 941
        { $set: {                                                                                                // 942
          secret: OAuthEncryption.seal(config.secret)                                                            // 943
        } }                                                                                                      // 944
      );                                                                                                         // 945
    });                                                                                                          // 946
});                                                                                                              // 947
                                                                                                                 // 948
                                                                                                                 // 949
///                                                                                                              // 950
/// CREATE USER HOOKS                                                                                            // 951
///                                                                                                              // 952
                                                                                                                 // 953
var onCreateUserHook = null;                                                                                     // 954
                                                                                                                 // 955
/**                                                                                                              // 956
 * @summary Customize new user creation.                                                                         // 957
 * @locus Server                                                                                                 // 958
 * @param {Function} func Called whenever a new user is created. Return the new user object, or throw an `Error` to abort the creation.
 */                                                                                                              // 960
Accounts.onCreateUser = function (func) {                                                                        // 961
  if (onCreateUserHook)                                                                                          // 962
    throw new Error("Can only call onCreateUser once");                                                          // 963
  else                                                                                                           // 964
    onCreateUserHook = func;                                                                                     // 965
};                                                                                                               // 966
                                                                                                                 // 967
// XXX see comment on Accounts.createUser in passwords_server about adding a                                     // 968
// second "server options" argument.                                                                             // 969
var defaultCreateUserHook = function (options, user) {                                                           // 970
  if (options.profile)                                                                                           // 971
    user.profile = options.profile;                                                                              // 972
  return user;                                                                                                   // 973
};                                                                                                               // 974
                                                                                                                 // 975
// Called by accounts-password                                                                                   // 976
Accounts.insertUserDoc = function (options, user) {                                                              // 977
  // - clone user document, to protect from modification                                                         // 978
  // - add createdAt timestamp                                                                                   // 979
  // - prepare an _id, so that you can modify other collections (eg                                              // 980
  // create a first task for every new user)                                                                     // 981
  //                                                                                                             // 982
  // XXX If the onCreateUser or validateNewUser hooks fail, we might                                             // 983
  // end up having modified some other collection                                                                // 984
  // inappropriately. The solution is probably to have onCreateUser                                              // 985
  // accept two callbacks - one that gets called before inserting                                                // 986
  // the user document (in which you can modify its contents), and                                               // 987
  // one that gets called after (in which you should change other                                                // 988
  // collections)                                                                                                // 989
  user = _.extend({createdAt: new Date(), _id: Random.id()}, user);                                              // 990
                                                                                                                 // 991
  if (user.services)                                                                                             // 992
    _.each(user.services, function (serviceData) {                                                               // 993
      pinEncryptedFieldsToUser(serviceData, user._id);                                                           // 994
    });                                                                                                          // 995
                                                                                                                 // 996
  var fullUser;                                                                                                  // 997
  if (onCreateUserHook) {                                                                                        // 998
    fullUser = onCreateUserHook(options, user);                                                                  // 999
                                                                                                                 // 1000
    // This is *not* part of the API. We need this because we can't isolate                                      // 1001
    // the global server environment between tests, meaning we can't test                                        // 1002
    // both having a create user hook set and not having one set.                                                // 1003
    if (fullUser === 'TEST DEFAULT HOOK')                                                                        // 1004
      fullUser = defaultCreateUserHook(options, user);                                                           // 1005
  } else {                                                                                                       // 1006
    fullUser = defaultCreateUserHook(options, user);                                                             // 1007
  }                                                                                                              // 1008
                                                                                                                 // 1009
  _.each(validateNewUserHooks, function (hook) {                                                                 // 1010
    if (!hook(fullUser))                                                                                         // 1011
      throw new Meteor.Error(403, "User validation failed");                                                     // 1012
  });                                                                                                            // 1013
                                                                                                                 // 1014
  var userId;                                                                                                    // 1015
  try {                                                                                                          // 1016
    userId = Meteor.users.insert(fullUser);                                                                      // 1017
  } catch (e) {                                                                                                  // 1018
    // XXX string parsing sucks, maybe                                                                           // 1019
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day                                        // 1020
    if (e.name !== 'MongoError') throw e;                                                                        // 1021
    var match = e.err.match(/E11000 duplicate key error index: ([^ ]+)/);                                        // 1022
    if (!match) throw e;                                                                                         // 1023
    if (match[1].indexOf('$emails.address') !== -1)                                                              // 1024
      throw new Meteor.Error(403, "Email already exists.");                                                      // 1025
    if (match[1].indexOf('username') !== -1)                                                                     // 1026
      throw new Meteor.Error(403, "Username already exists.");                                                   // 1027
    // XXX better error reporting for services.facebook.id duplicate, etc                                        // 1028
    throw e;                                                                                                     // 1029
  }                                                                                                              // 1030
  return userId;                                                                                                 // 1031
};                                                                                                               // 1032
                                                                                                                 // 1033
var validateNewUserHooks = [];                                                                                   // 1034
                                                                                                                 // 1035
/**                                                                                                              // 1036
 * @summary Set restrictions on new user creation.                                                               // 1037
 * @locus Server                                                                                                 // 1038
 * @param {Function} func Called whenever a new user is created. Takes the new user object, and returns true to allow the creation or false to abort.
 */                                                                                                              // 1040
Accounts.validateNewUser = function (func) {                                                                     // 1041
  validateNewUserHooks.push(func);                                                                               // 1042
};                                                                                                               // 1043
                                                                                                                 // 1044
// XXX Find a better place for this utility function                                                             // 1045
// Like Perl's quotemeta: quotes all regexp metacharacters. See                                                  // 1046
//   https://github.com/substack/quotemeta/blob/master/index.js                                                  // 1047
var quotemeta = function (str) {                                                                                 // 1048
    return String(str).replace(/(\W)/g, '\\$1');                                                                 // 1049
};                                                                                                               // 1050
                                                                                                                 // 1051
// Helper function: returns false if email does not match company domain from                                    // 1052
// the configuration.                                                                                            // 1053
var testEmailDomain = function (email) {                                                                         // 1054
  var domain = Accounts._options.restrictCreationByEmailDomain;                                                  // 1055
  return !domain ||                                                                                              // 1056
    (_.isFunction(domain) && domain(email)) ||                                                                   // 1057
    (_.isString(domain) &&                                                                                       // 1058
      (new RegExp('@' + quotemeta(domain) + '$', 'i')).test(email));                                             // 1059
};                                                                                                               // 1060
                                                                                                                 // 1061
// Validate new user's email or Google/Facebook/GitHub account's email                                           // 1062
Accounts.validateNewUser(function (user) {                                                                       // 1063
  var domain = Accounts._options.restrictCreationByEmailDomain;                                                  // 1064
  if (!domain)                                                                                                   // 1065
    return true;                                                                                                 // 1066
                                                                                                                 // 1067
  var emailIsGood = false;                                                                                       // 1068
  if (!_.isEmpty(user.emails)) {                                                                                 // 1069
    emailIsGood = _.any(user.emails, function (email) {                                                          // 1070
      return testEmailDomain(email.address);                                                                     // 1071
    });                                                                                                          // 1072
  } else if (!_.isEmpty(user.services)) {                                                                        // 1073
    // Find any email of any service and check it                                                                // 1074
    emailIsGood = _.any(user.services, function (service) {                                                      // 1075
      return service.email && testEmailDomain(service.email);                                                    // 1076
    });                                                                                                          // 1077
  }                                                                                                              // 1078
                                                                                                                 // 1079
  if (emailIsGood)                                                                                               // 1080
    return true;                                                                                                 // 1081
                                                                                                                 // 1082
  if (_.isString(domain))                                                                                        // 1083
    throw new Meteor.Error(403, "@" + domain + " email required");                                               // 1084
  else                                                                                                           // 1085
    throw new Meteor.Error(403, "Email doesn't match the criteria.");                                            // 1086
});                                                                                                              // 1087
                                                                                                                 // 1088
///                                                                                                              // 1089
/// MANAGING USER OBJECTS                                                                                        // 1090
///                                                                                                              // 1091
                                                                                                                 // 1092
// Updates or creates a user after we authenticate with a 3rd party.                                             // 1093
//                                                                                                               // 1094
// @param serviceName {String} Service name (eg, twitter).                                                       // 1095
// @param serviceData {Object} Data to store in the user's record                                                // 1096
//        under services[serviceName]. Must include an "id" field                                                // 1097
//        which is a unique identifier for the user in the service.                                              // 1098
// @param options {Object, optional} Other options to pass to insertUserDoc                                      // 1099
//        (eg, profile)                                                                                          // 1100
// @returns {Object} Object with token and id keys, like the result                                              // 1101
//        of the "login" method.                                                                                 // 1102
//                                                                                                               // 1103
Accounts.updateOrCreateUserFromExternalService = function(                                                       // 1104
  serviceName, serviceData, options) {                                                                           // 1105
  options = _.clone(options || {});                                                                              // 1106
                                                                                                                 // 1107
  if (serviceName === "password" || serviceName === "resume")                                                    // 1108
    throw new Error(                                                                                             // 1109
      "Can't use updateOrCreateUserFromExternalService with internal service "                                   // 1110
        + serviceName);                                                                                          // 1111
  if (!_.has(serviceData, 'id'))                                                                                 // 1112
    throw new Error(                                                                                             // 1113
      "Service data for service " + serviceName + " must include id");                                           // 1114
                                                                                                                 // 1115
  // Look for a user with the appropriate service user id.                                                       // 1116
  var selector = {};                                                                                             // 1117
  var serviceIdKey = "services." + serviceName + ".id";                                                          // 1118
                                                                                                                 // 1119
  // XXX Temporary special case for Twitter. (Issue #629)                                                        // 1120
  //   The serviceData.id will be a string representation of an integer.                                         // 1121
  //   We want it to match either a stored string or int representation.                                         // 1122
  //   This is to cater to earlier versions of Meteor storing twitter                                            // 1123
  //   user IDs in number form, and recent versions storing them as strings.                                     // 1124
  //   This can be removed once migration technology is in place, and twitter                                    // 1125
  //   users stored with integer IDs have been migrated to string IDs.                                           // 1126
  if (serviceName === "twitter" && !isNaN(serviceData.id)) {                                                     // 1127
    selector["$or"] = [{},{}];                                                                                   // 1128
    selector["$or"][0][serviceIdKey] = serviceData.id;                                                           // 1129
    selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);                                             // 1130
  } else {                                                                                                       // 1131
    selector[serviceIdKey] = serviceData.id;                                                                     // 1132
  }                                                                                                              // 1133
                                                                                                                 // 1134
  var user = Meteor.users.findOne(selector);                                                                     // 1135
                                                                                                                 // 1136
  if (user) {                                                                                                    // 1137
    pinEncryptedFieldsToUser(serviceData, user._id);                                                             // 1138
                                                                                                                 // 1139
    // We *don't* process options (eg, profile) for update, but we do replace                                    // 1140
    // the serviceData (eg, so that we keep an unexpired access token and                                        // 1141
    // don't cache old email addresses in serviceData.email).                                                    // 1142
    // XXX provide an onUpdateUser hook which would let apps update                                              // 1143
    //     the profile too                                                                                       // 1144
    var setAttrs = {};                                                                                           // 1145
    _.each(serviceData, function(value, key) {                                                                   // 1146
      setAttrs["services." + serviceName + "." + key] = value;                                                   // 1147
    });                                                                                                          // 1148
                                                                                                                 // 1149
    // XXX Maybe we should re-use the selector above and notice if the update                                    // 1150
    //     touches nothing?                                                                                      // 1151
    Meteor.users.update(user._id, {$set: setAttrs});                                                             // 1152
    return {                                                                                                     // 1153
      type: serviceName,                                                                                         // 1154
      userId: user._id                                                                                           // 1155
    };                                                                                                           // 1156
  } else {                                                                                                       // 1157
    // Create a new user with the service data. Pass other options through to                                    // 1158
    // insertUserDoc.                                                                                            // 1159
    user = {services: {}};                                                                                       // 1160
    user.services[serviceName] = serviceData;                                                                    // 1161
    return {                                                                                                     // 1162
      type: serviceName,                                                                                         // 1163
      userId: Accounts.insertUserDoc(options, user)                                                              // 1164
    };                                                                                                           // 1165
  }                                                                                                              // 1166
};                                                                                                               // 1167
                                                                                                                 // 1168
                                                                                                                 // 1169
///                                                                                                              // 1170
/// PUBLISHING DATA                                                                                              // 1171
///                                                                                                              // 1172
                                                                                                                 // 1173
// Publish the current user's record to the client.                                                              // 1174
Meteor.publish(null, function() {                                                                                // 1175
  if (this.userId) {                                                                                             // 1176
    return Meteor.users.find(                                                                                    // 1177
      {_id: this.userId},                                                                                        // 1178
      {fields: {profile: 1, username: 1, emails: 1}});                                                           // 1179
  } else {                                                                                                       // 1180
    return null;                                                                                                 // 1181
  }                                                                                                              // 1182
}, /*suppress autopublish warning*/{is_auto: true});                                                             // 1183
                                                                                                                 // 1184
// If autopublish is on, publish these user fields. Login service                                                // 1185
// packages (eg accounts-google) add to these by calling                                                         // 1186
// Accounts.addAutopublishFields Notably, this isn't implemented with                                            // 1187
// multiple publishes since DDP only merges only across top-level                                                // 1188
// fields, not subfields (such as 'services.facebook.accessToken')                                               // 1189
var autopublishFields = {                                                                                        // 1190
  loggedInUser: ['profile', 'username', 'emails'],                                                               // 1191
  otherUsers: ['profile', 'username']                                                                            // 1192
};                                                                                                               // 1193
                                                                                                                 // 1194
// Add to the list of fields or subfields to be automatically                                                    // 1195
// published if autopublish is on. Must be called from top-level                                                 // 1196
// code (ie, before Meteor.startup hooks run).                                                                   // 1197
//                                                                                                               // 1198
// @param opts {Object} with:                                                                                    // 1199
//   - forLoggedInUser {Array} Array of fields published to the logged-in user                                   // 1200
//   - forOtherUsers {Array} Array of fields published to users that aren't logged in                            // 1201
Accounts.addAutopublishFields = function(opts) {                                                                 // 1202
  autopublishFields.loggedInUser.push.apply(                                                                     // 1203
    autopublishFields.loggedInUser, opts.forLoggedInUser);                                                       // 1204
  autopublishFields.otherUsers.push.apply(                                                                       // 1205
    autopublishFields.otherUsers, opts.forOtherUsers);                                                           // 1206
};                                                                                                               // 1207
                                                                                                                 // 1208
if (Package.autopublish) {                                                                                       // 1209
  // Use Meteor.startup to give other packages a chance to call                                                  // 1210
  // addAutopublishFields.                                                                                       // 1211
  Meteor.startup(function () {                                                                                   // 1212
    // ['profile', 'username'] -> {profile: 1, username: 1}                                                      // 1213
    var toFieldSelector = function(fields) {                                                                     // 1214
      return _.object(_.map(fields, function(field) {                                                            // 1215
        return [field, 1];                                                                                       // 1216
      }));                                                                                                       // 1217
    };                                                                                                           // 1218
                                                                                                                 // 1219
    Meteor.server.publish(null, function () {                                                                    // 1220
      if (this.userId) {                                                                                         // 1221
        return Meteor.users.find(                                                                                // 1222
          {_id: this.userId},                                                                                    // 1223
          {fields: toFieldSelector(autopublishFields.loggedInUser)});                                            // 1224
      } else {                                                                                                   // 1225
        return null;                                                                                             // 1226
      }                                                                                                          // 1227
    }, /*suppress autopublish warning*/{is_auto: true});                                                         // 1228
                                                                                                                 // 1229
    // XXX this publish is neither dedup-able nor is it optimized by our special                                 // 1230
    // treatment of queries on a specific _id. Therefore this will have O(n^2)                                   // 1231
    // run-time performance every time a user document is changed (eg someone                                    // 1232
    // logging in). If this is a problem, we can instead write a manual publish                                  // 1233
    // function which filters out fields based on 'this.userId'.                                                 // 1234
    Meteor.server.publish(null, function () {                                                                    // 1235
      var selector;                                                                                              // 1236
      if (this.userId)                                                                                           // 1237
        selector = {_id: {$ne: this.userId}};                                                                    // 1238
      else                                                                                                       // 1239
        selector = {};                                                                                           // 1240
                                                                                                                 // 1241
      return Meteor.users.find(                                                                                  // 1242
        selector,                                                                                                // 1243
        {fields: toFieldSelector(autopublishFields.otherUsers)});                                                // 1244
    }, /*suppress autopublish warning*/{is_auto: true});                                                         // 1245
  });                                                                                                            // 1246
}                                                                                                                // 1247
                                                                                                                 // 1248
// Publish all login service configuration fields other than secret.                                             // 1249
Meteor.publish("meteor.loginServiceConfiguration", function () {                                                 // 1250
  var ServiceConfiguration =                                                                                     // 1251
    Package['service-configuration'].ServiceConfiguration;                                                       // 1252
  return ServiceConfiguration.configurations.find({}, {fields: {secret: 0}});                                    // 1253
}, {is_auto: true}); // not techincally autopublish, but stops the warning.                                      // 1254
                                                                                                                 // 1255
// Allow a one-time configuration for a login service. Modifications                                             // 1256
// to this collection are also allowed in insecure mode.                                                         // 1257
Meteor.methods({                                                                                                 // 1258
  "configureLoginService": function (options) {                                                                  // 1259
    check(options, Match.ObjectIncluding({service: String}));                                                    // 1260
    // Don't let random users configure a service we haven't added yet (so                                       // 1261
    // that when we do later add it, it's set up with their configuration                                        // 1262
    // instead of ours).                                                                                         // 1263
    // XXX if service configuration is oauth-specific then this code should                                      // 1264
    //     be in accounts-oauth; if it's not then the registry should be                                         // 1265
    //     in this package                                                                                       // 1266
    if (!(Accounts.oauth                                                                                         // 1267
          && _.contains(Accounts.oauth.serviceNames(), options.service))) {                                      // 1268
      throw new Meteor.Error(403, "Service unknown");                                                            // 1269
    }                                                                                                            // 1270
                                                                                                                 // 1271
    var ServiceConfiguration =                                                                                   // 1272
      Package['service-configuration'].ServiceConfiguration;                                                     // 1273
    if (ServiceConfiguration.configurations.findOne({service: options.service}))                                 // 1274
      throw new Meteor.Error(403, "Service " + options.service + " already configured");                         // 1275
                                                                                                                 // 1276
    if (_.has(options, "secret") && usingOAuthEncryption())                                                      // 1277
      options.secret = OAuthEncryption.seal(options.secret);                                                     // 1278
                                                                                                                 // 1279
    ServiceConfiguration.configurations.insert(options);                                                         // 1280
  }                                                                                                              // 1281
});                                                                                                              // 1282
                                                                                                                 // 1283
                                                                                                                 // 1284
///                                                                                                              // 1285
/// RESTRICTING WRITES TO USER OBJECTS                                                                           // 1286
///                                                                                                              // 1287
                                                                                                                 // 1288
Meteor.users.allow({                                                                                             // 1289
  // clients can modify the profile field of their own document, and                                             // 1290
  // nothing else.                                                                                               // 1291
  update: function (userId, user, fields, modifier) {                                                            // 1292
    // make sure it is our record                                                                                // 1293
    if (user._id !== userId)                                                                                     // 1294
      return false;                                                                                              // 1295
                                                                                                                 // 1296
    // user can only modify the 'profile' field. sets to multiple                                                // 1297
    // sub-keys (eg profile.foo and profile.bar) are merged into entry                                           // 1298
    // in the fields list.                                                                                       // 1299
    if (fields.length !== 1 || fields[0] !== 'profile')                                                          // 1300
      return false;                                                                                              // 1301
                                                                                                                 // 1302
    return true;                                                                                                 // 1303
  },                                                                                                             // 1304
  fetch: ['_id'] // we only look at _id.                                                                         // 1305
});                                                                                                              // 1306
                                                                                                                 // 1307
/// DEFAULT INDEXES ON USERS                                                                                     // 1308
Meteor.users._ensureIndex('username', {unique: 1, sparse: 1});                                                   // 1309
Meteor.users._ensureIndex('emails.address', {unique: 1, sparse: 1});                                             // 1310
Meteor.users._ensureIndex('services.resume.loginTokens.hashedToken',                                             // 1311
                          {unique: 1, sparse: 1});                                                               // 1312
Meteor.users._ensureIndex('services.resume.loginTokens.token',                                                   // 1313
                          {unique: 1, sparse: 1});                                                               // 1314
// For taking care of logoutOtherClients calls that crashed before the tokens                                    // 1315
// were deleted.                                                                                                 // 1316
Meteor.users._ensureIndex('services.resume.haveLoginTokensToDelete',                                             // 1317
                          { sparse: 1 });                                                                        // 1318
// For expiring login tokens                                                                                     // 1319
Meteor.users._ensureIndex("services.resume.loginTokens.when", { sparse: 1 });                                    // 1320
                                                                                                                 // 1321
///                                                                                                              // 1322
/// CLEAN UP FOR `logoutOtherClients`                                                                            // 1323
///                                                                                                              // 1324
                                                                                                                 // 1325
var deleteSavedTokens = function (userId, tokensToDelete) {                                                      // 1326
  if (tokensToDelete) {                                                                                          // 1327
    Meteor.users.update(userId, {                                                                                // 1328
      $unset: {                                                                                                  // 1329
        "services.resume.haveLoginTokensToDelete": 1,                                                            // 1330
        "services.resume.loginTokensToDelete": 1                                                                 // 1331
      },                                                                                                         // 1332
      $pullAll: {                                                                                                // 1333
        "services.resume.loginTokens": tokensToDelete                                                            // 1334
      }                                                                                                          // 1335
    });                                                                                                          // 1336
  }                                                                                                              // 1337
};                                                                                                               // 1338
                                                                                                                 // 1339
Meteor.startup(function () {                                                                                     // 1340
  // If we find users who have saved tokens to delete on startup, delete them                                    // 1341
  // now. It's possible that the server could have crashed and come back up                                      // 1342
  // before new tokens are found in localStorage, but this shouldn't happen very                                 // 1343
  // often. We shouldn't put a delay here because that would give a lot of power                                 // 1344
  // to an attacker with a stolen login token and the ability to crash the                                       // 1345
  // server.                                                                                                     // 1346
  var users = Meteor.users.find({                                                                                // 1347
    "services.resume.haveLoginTokensToDelete": true                                                              // 1348
  }, {                                                                                                           // 1349
    "services.resume.loginTokensToDelete": 1                                                                     // 1350
  });                                                                                                            // 1351
  users.forEach(function (user) {                                                                                // 1352
    deleteSavedTokens(user._id, user.services.resume.loginTokensToDelete);                                       // 1353
  });                                                                                                            // 1354
});                                                                                                              // 1355
                                                                                                                 // 1356
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/url_server.js                                                                          //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
// XXX These should probably not actually be public?                                                             // 1
                                                                                                                 // 2
Accounts.urls = {};                                                                                              // 3
                                                                                                                 // 4
Accounts.urls.resetPassword = function (token) {                                                                 // 5
  return Meteor.absoluteUrl('#/reset-password/' + token);                                                        // 6
};                                                                                                               // 7
                                                                                                                 // 8
Accounts.urls.verifyEmail = function (token) {                                                                   // 9
  return Meteor.absoluteUrl('#/verify-email/' + token);                                                          // 10
};                                                                                                               // 11
                                                                                                                 // 12
Accounts.urls.enrollAccount = function (token) {                                                                 // 13
  return Meteor.absoluteUrl('#/enroll-account/' + token);                                                        // 14
};                                                                                                               // 15
                                                                                                                 // 16
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-base'] = {
  Accounts: Accounts,
  AccountsTest: AccountsTest
};

})();

//# sourceMappingURL=accounts-base.js.map
