(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var NpmModuleBcrypt = Package['npm-bcrypt'].NpmModuleBcrypt;
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var Email = Package.email.Email;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/accounts-password/email_templates.js                                                  //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
/**                                                                                               // 1
 * @summary Options to customize emails sent from the Accounts system.                            // 2
 * @locus Server                                                                                  // 3
 */                                                                                               // 4
Accounts.emailTemplates = {                                                                       // 5
  from: "Meteor Accounts <no-reply@meteor.com>",                                                  // 6
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),                  // 7
                                                                                                  // 8
  resetPassword: {                                                                                // 9
    subject: function(user) {                                                                     // 10
      return "How to reset your password on " + Accounts.emailTemplates.siteName;                 // 11
    },                                                                                            // 12
    text: function(user, url) {                                                                   // 13
      var greeting = (user.profile && user.profile.name) ?                                        // 14
            ("Hello " + user.profile.name + ",") : "Hello,";                                      // 15
      return greeting + "\n"                                                                      // 16
        + "\n"                                                                                    // 17
        + "To reset your password, simply click the link below.\n"                                // 18
        + "\n"                                                                                    // 19
        + url + "\n"                                                                              // 20
        + "\n"                                                                                    // 21
        + "Thanks.\n";                                                                            // 22
    }                                                                                             // 23
  },                                                                                              // 24
  verifyEmail: {                                                                                  // 25
    subject: function(user) {                                                                     // 26
      return "How to verify email address on " + Accounts.emailTemplates.siteName;                // 27
    },                                                                                            // 28
    text: function(user, url) {                                                                   // 29
      var greeting = (user.profile && user.profile.name) ?                                        // 30
            ("Hello " + user.profile.name + ",") : "Hello,";                                      // 31
      return greeting + "\n"                                                                      // 32
        + "\n"                                                                                    // 33
        + "To verify your account email, simply click the link below.\n"                          // 34
        + "\n"                                                                                    // 35
        + url + "\n"                                                                              // 36
        + "\n"                                                                                    // 37
        + "Thanks.\n";                                                                            // 38
    }                                                                                             // 39
  },                                                                                              // 40
  enrollAccount: {                                                                                // 41
    subject: function(user) {                                                                     // 42
      return "An account has been created for you on " + Accounts.emailTemplates.siteName;        // 43
    },                                                                                            // 44
    text: function(user, url) {                                                                   // 45
      var greeting = (user.profile && user.profile.name) ?                                        // 46
            ("Hello " + user.profile.name + ",") : "Hello,";                                      // 47
      return greeting + "\n"                                                                      // 48
        + "\n"                                                                                    // 49
        + "To start using the service, simply click the link below.\n"                            // 50
        + "\n"                                                                                    // 51
        + url + "\n"                                                                              // 52
        + "\n"                                                                                    // 53
        + "Thanks.\n";                                                                            // 54
    }                                                                                             // 55
  }                                                                                               // 56
};                                                                                                // 57
                                                                                                  // 58
////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/accounts-password/password_server.js                                                  //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
/// BCRYPT                                                                                        // 1
                                                                                                  // 2
var bcrypt = NpmModuleBcrypt;                                                                     // 3
var bcryptHash = Meteor.wrapAsync(bcrypt.hash);                                                   // 4
var bcryptCompare = Meteor.wrapAsync(bcrypt.compare);                                             // 5
                                                                                                  // 6
// User records have a 'services.password.bcrypt' field on them to hold                           // 7
// their hashed passwords (unless they have a 'services.password.srp'                             // 8
// field, in which case they will be upgraded to bcrypt the next time                             // 9
// they log in).                                                                                  // 10
//                                                                                                // 11
// When the client sends a password to the server, it can either be a                             // 12
// string (the plaintext password) or an object with keys 'digest' and                            // 13
// 'algorithm' (must be "sha-256" for now). The Meteor client always sends                        // 14
// password objects { digest: *, algorithm: "sha-256" }, but DDP clients                          // 15
// that don't have access to SHA can just send plaintext passwords as                             // 16
// strings.                                                                                       // 17
//                                                                                                // 18
// When the server receives a plaintext password as a string, it always                           // 19
// hashes it with SHA256 before passing it into bcrypt. When the server                           // 20
// receives a password as an object, it asserts that the algorithm is                             // 21
// "sha-256" and then passes the digest to bcrypt.                                                // 22
                                                                                                  // 23
                                                                                                  // 24
Accounts._bcryptRounds = 10;                                                                      // 25
                                                                                                  // 26
// Given a 'password' from the client, extract the string that we should                          // 27
// bcrypt. 'password' can be one of:                                                              // 28
//  - String (the plaintext password)                                                             // 29
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".                   // 30
//                                                                                                // 31
var getPasswordString = function (password) {                                                     // 32
  if (typeof password === "string") {                                                             // 33
    password = SHA256(password);                                                                  // 34
  } else { // 'password' is an object                                                             // 35
    if (password.algorithm !== "sha-256") {                                                       // 36
      throw new Error("Invalid password hash algorithm. " +                                       // 37
                      "Only 'sha-256' is allowed.");                                              // 38
    }                                                                                             // 39
    password = password.digest;                                                                   // 40
  }                                                                                               // 41
  return password;                                                                                // 42
};                                                                                                // 43
                                                                                                  // 44
// Use bcrypt to hash the password for storage in the database.                                   // 45
// `password` can be a string (in which case it will be run through                               // 46
// SHA256 before bcrypt) or an object with properties `digest` and                                // 47
// `algorithm` (in which case we bcrypt `password.digest`).                                       // 48
//                                                                                                // 49
var hashPassword = function (password) {                                                          // 50
  password = getPasswordString(password);                                                         // 51
  return bcryptHash(password, Accounts._bcryptRounds);                                            // 52
};                                                                                                // 53
                                                                                                  // 54
// Check whether the provided password matches the bcrypt'ed password in                          // 55
// the database user record. `password` can be a string (in which case                            // 56
// it will be run through SHA256 before bcrypt) or an object with                                 // 57
// properties `digest` and `algorithm` (in which case we bcrypt                                   // 58
// `password.digest`).                                                                            // 59
//                                                                                                // 60
Accounts._checkPassword = function (user, password) {                                             // 61
  var result = {                                                                                  // 62
    userId: user._id                                                                              // 63
  };                                                                                              // 64
                                                                                                  // 65
  password = getPasswordString(password);                                                         // 66
                                                                                                  // 67
  if (! bcryptCompare(password, user.services.password.bcrypt)) {                                 // 68
    result.error = new Meteor.Error(403, "Incorrect password");                                   // 69
  }                                                                                               // 70
                                                                                                  // 71
  return result;                                                                                  // 72
};                                                                                                // 73
var checkPassword = Accounts._checkPassword;                                                      // 74
                                                                                                  // 75
///                                                                                               // 76
/// LOGIN                                                                                         // 77
///                                                                                               // 78
                                                                                                  // 79
// Users can specify various keys to identify themselves with.                                    // 80
// @param user {Object} with one of `id`, `username`, or `email`.                                 // 81
// @returns A selector to pass to mongo to get the user record.                                   // 82
                                                                                                  // 83
var selectorFromUserQuery = function (user) {                                                     // 84
  if (user.id)                                                                                    // 85
    return {_id: user.id};                                                                        // 86
  else if (user.username)                                                                         // 87
    return {username: user.username};                                                             // 88
  else if (user.email)                                                                            // 89
    return {"emails.address": user.email};                                                        // 90
  throw new Error("shouldn't happen (validation missed something)");                              // 91
};                                                                                                // 92
                                                                                                  // 93
var findUserFromUserQuery = function (user) {                                                     // 94
  var selector = selectorFromUserQuery(user);                                                     // 95
                                                                                                  // 96
  var user = Meteor.users.findOne(selector);                                                      // 97
  if (!user)                                                                                      // 98
    throw new Meteor.Error(403, "User not found");                                                // 99
                                                                                                  // 100
  return user;                                                                                    // 101
};                                                                                                // 102
                                                                                                  // 103
// XXX maybe this belongs in the check package                                                    // 104
var NonEmptyString = Match.Where(function (x) {                                                   // 105
  check(x, String);                                                                               // 106
  return x.length > 0;                                                                            // 107
});                                                                                               // 108
                                                                                                  // 109
var userQueryValidator = Match.Where(function (user) {                                            // 110
  check(user, {                                                                                   // 111
    id: Match.Optional(NonEmptyString),                                                           // 112
    username: Match.Optional(NonEmptyString),                                                     // 113
    email: Match.Optional(NonEmptyString)                                                         // 114
  });                                                                                             // 115
  if (_.keys(user).length !== 1)                                                                  // 116
    throw new Match.Error("User property must have exactly one field");                           // 117
  return true;                                                                                    // 118
});                                                                                               // 119
                                                                                                  // 120
var passwordValidator = Match.OneOf(                                                              // 121
  String,                                                                                         // 122
  { digest: String, algorithm: String }                                                           // 123
);                                                                                                // 124
                                                                                                  // 125
// Handler to login with a password.                                                              // 126
//                                                                                                // 127
// The Meteor client sets options.password to an object with keys                                 // 128
// 'digest' (set to SHA256(password)) and 'algorithm' ("sha-256").                                // 129
//                                                                                                // 130
// For other DDP clients which don't have access to SHA, the handler                              // 131
// also accepts the plaintext password in options.password as a string.                           // 132
//                                                                                                // 133
// (It might be nice if servers could turn the plaintext password                                 // 134
// option off. Or maybe it should be opt-in, not opt-out?                                         // 135
// Accounts.config option?)                                                                       // 136
//                                                                                                // 137
// Note that neither password option is secure without SSL.                                       // 138
//                                                                                                // 139
Accounts.registerLoginHandler("password", function (options) {                                    // 140
  if (! options.password || options.srp)                                                          // 141
    return undefined; // don't handle                                                             // 142
                                                                                                  // 143
  check(options, {                                                                                // 144
    user: userQueryValidator,                                                                     // 145
    password: passwordValidator                                                                   // 146
  });                                                                                             // 147
                                                                                                  // 148
                                                                                                  // 149
  var user = findUserFromUserQuery(options.user);                                                 // 150
                                                                                                  // 151
  if (!user.services || !user.services.password ||                                                // 152
      !(user.services.password.bcrypt || user.services.password.srp))                             // 153
    throw new Meteor.Error(403, "User has no password set");                                      // 154
                                                                                                  // 155
  if (!user.services.password.bcrypt) {                                                           // 156
    if (typeof options.password === "string") {                                                   // 157
      // The client has presented a plaintext password, and the user is                           // 158
      // not upgraded to bcrypt yet. We don't attempt to tell the client                          // 159
      // to upgrade to bcrypt, because it might be a standalone DDP                               // 160
      // client doesn't know how to do such a thing.                                              // 161
      var verifier = user.services.password.srp;                                                  // 162
      var newVerifier = SRP.generateVerifier(options.password, {                                  // 163
        identity: verifier.identity, salt: verifier.salt});                                       // 164
                                                                                                  // 165
      if (verifier.verifier !== newVerifier.verifier) {                                           // 166
        return {                                                                                  // 167
          userId: user._id,                                                                       // 168
          error: new Meteor.Error(403, "Incorrect password")                                      // 169
        };                                                                                        // 170
      }                                                                                           // 171
                                                                                                  // 172
      return {userId: user._id};                                                                  // 173
    } else {                                                                                      // 174
      // Tell the client to use the SRP upgrade process.                                          // 175
      throw new Meteor.Error(400, "old password format", EJSON.stringify({                        // 176
        format: 'srp',                                                                            // 177
        identity: user.services.password.srp.identity                                             // 178
      }));                                                                                        // 179
    }                                                                                             // 180
  }                                                                                               // 181
                                                                                                  // 182
  return checkPassword(                                                                           // 183
    user,                                                                                         // 184
    options.password                                                                              // 185
  );                                                                                              // 186
});                                                                                               // 187
                                                                                                  // 188
// Handler to login using the SRP upgrade path. To use this login                                 // 189
// handler, the client must provide:                                                              // 190
//   - srp: H(identity + ":" + password)                                                          // 191
//   - password: a string or an object with properties 'digest' and 'algorithm'                   // 192
//                                                                                                // 193
// We use `options.srp` to verify that the client knows the correct                               // 194
// password without doing a full SRP flow. Once we've checked that, we                            // 195
// upgrade the user to bcrypt and remove the SRP information from the                             // 196
// user document.                                                                                 // 197
//                                                                                                // 198
// The client ends up using this login handler after trying the normal                            // 199
// login handler (above), which throws an error telling the client to                             // 200
// try the SRP upgrade path.                                                                      // 201
//                                                                                                // 202
// XXX COMPAT WITH 0.8.1.3                                                                        // 203
Accounts.registerLoginHandler("password", function (options) {                                    // 204
  if (!options.srp || !options.password)                                                          // 205
    return undefined; // don't handle                                                             // 206
                                                                                                  // 207
  check(options, {                                                                                // 208
    user: userQueryValidator,                                                                     // 209
    srp: String,                                                                                  // 210
    password: passwordValidator                                                                   // 211
  });                                                                                             // 212
                                                                                                  // 213
  var user = findUserFromUserQuery(options.user);                                                 // 214
                                                                                                  // 215
  // Check to see if another simultaneous login has already upgraded                              // 216
  // the user record to bcrypt.                                                                   // 217
  if (user.services && user.services.password && user.services.password.bcrypt)                   // 218
    return checkPassword(user, options.password);                                                 // 219
                                                                                                  // 220
  if (!(user.services && user.services.password && user.services.password.srp))                   // 221
    throw new Meteor.Error(403, "User has no password set");                                      // 222
                                                                                                  // 223
  var v1 = user.services.password.srp.verifier;                                                   // 224
  var v2 = SRP.generateVerifier(                                                                  // 225
    null,                                                                                         // 226
    {                                                                                             // 227
      hashedIdentityAndPassword: options.srp,                                                     // 228
      salt: user.services.password.srp.salt                                                       // 229
    }                                                                                             // 230
  ).verifier;                                                                                     // 231
  if (v1 !== v2)                                                                                  // 232
    return {                                                                                      // 233
      userId: user._id,                                                                           // 234
      error: new Meteor.Error(403, "Incorrect password")                                          // 235
    };                                                                                            // 236
                                                                                                  // 237
  // Upgrade to bcrypt on successful login.                                                       // 238
  var salted = hashPassword(options.password);                                                    // 239
  Meteor.users.update(                                                                            // 240
    user._id,                                                                                     // 241
    {                                                                                             // 242
      $unset: { 'services.password.srp': 1 },                                                     // 243
      $set: { 'services.password.bcrypt': salted }                                                // 244
    }                                                                                             // 245
  );                                                                                              // 246
                                                                                                  // 247
  return {userId: user._id};                                                                      // 248
});                                                                                               // 249
                                                                                                  // 250
                                                                                                  // 251
///                                                                                               // 252
/// CHANGING                                                                                      // 253
///                                                                                               // 254
                                                                                                  // 255
// Let the user change their own password if they know the old                                    // 256
// password. `oldPassword` and `newPassword` should be objects with keys                          // 257
// `digest` and `algorithm` (representing the SHA256 of the password).                            // 258
//                                                                                                // 259
// XXX COMPAT WITH 0.8.1.3                                                                        // 260
// Like the login method, if the user hasn't been upgraded from SRP to                            // 261
// bcrypt yet, then this method will throw an 'old password format'                               // 262
// error. The client should call the SRP upgrade login handler and then                           // 263
// retry this method again.                                                                       // 264
//                                                                                                // 265
// UNLIKE the login method, there is no way to avoid getting SRP upgrade                          // 266
// errors thrown. The reasoning for this is that clients using this                               // 267
// method directly will need to be updated anyway because we no longer                            // 268
// support the SRP flow that they would have been doing to use this                               // 269
// method previously.                                                                             // 270
Meteor.methods({changePassword: function (oldPassword, newPassword) {                             // 271
  check(oldPassword, passwordValidator);                                                          // 272
  check(newPassword, passwordValidator);                                                          // 273
                                                                                                  // 274
  if (!this.userId)                                                                               // 275
    throw new Meteor.Error(401, "Must be logged in");                                             // 276
                                                                                                  // 277
  var user = Meteor.users.findOne(this.userId);                                                   // 278
  if (!user)                                                                                      // 279
    throw new Meteor.Error(403, "User not found");                                                // 280
                                                                                                  // 281
  if (!user.services || !user.services.password ||                                                // 282
      (!user.services.password.bcrypt && !user.services.password.srp))                            // 283
    throw new Meteor.Error(403, "User has no password set");                                      // 284
                                                                                                  // 285
  if (! user.services.password.bcrypt) {                                                          // 286
    throw new Meteor.Error(400, "old password format", EJSON.stringify({                          // 287
      format: 'srp',                                                                              // 288
      identity: user.services.password.srp.identity                                               // 289
    }));                                                                                          // 290
  }                                                                                               // 291
                                                                                                  // 292
  var result = checkPassword(user, oldPassword);                                                  // 293
  if (result.error)                                                                               // 294
    throw result.error;                                                                           // 295
                                                                                                  // 296
  var hashed = hashPassword(newPassword);                                                         // 297
                                                                                                  // 298
  // It would be better if this removed ALL existing tokens and replaced                          // 299
  // the token for the current connection with a new one, but that would                          // 300
  // be tricky, so we'll settle for just replacing all tokens other than                          // 301
  // the one for the current connection.                                                          // 302
  var currentToken = Accounts._getLoginToken(this.connection.id);                                 // 303
  Meteor.users.update(                                                                            // 304
    { _id: this.userId },                                                                         // 305
    {                                                                                             // 306
      $set: { 'services.password.bcrypt': hashed },                                               // 307
      $pull: {                                                                                    // 308
        'services.resume.loginTokens': { hashedToken: { $ne: currentToken } }                     // 309
      },                                                                                          // 310
      $unset: { 'services.password.reset': 1 }                                                    // 311
    }                                                                                             // 312
  );                                                                                              // 313
                                                                                                  // 314
  return {passwordChanged: true};                                                                 // 315
}});                                                                                              // 316
                                                                                                  // 317
                                                                                                  // 318
// Force change the users password.                                                               // 319
                                                                                                  // 320
/**                                                                                               // 321
 * @summary Forcibly change the password for a user.                                              // 322
 * @locus Server                                                                                  // 323
 * @param {String} userId The id of the user to update.                                           // 324
 * @param {String} newPassword A new password for the user.                                       // 325
 * @param {Object} [options]                                                                      // 326
 * @param {Object} options.logout Logout all current connections with this userId (default: true) // 327
 */                                                                                               // 328
Accounts.setPassword = function (userId, newPlaintextPassword, options) {                         // 329
  options = _.extend({logout: true}, options);                                                    // 330
                                                                                                  // 331
  var user = Meteor.users.findOne(userId);                                                        // 332
  if (!user)                                                                                      // 333
    throw new Meteor.Error(403, "User not found");                                                // 334
                                                                                                  // 335
  var update = {                                                                                  // 336
    $unset: {                                                                                     // 337
      'services.password.srp': 1, // XXX COMPAT WITH 0.8.1.3                                      // 338
      'services.password.reset': 1                                                                // 339
    },                                                                                            // 340
    $set: {'services.password.bcrypt': hashPassword(newPlaintextPassword)}                        // 341
  };                                                                                              // 342
                                                                                                  // 343
  if (options.logout) {                                                                           // 344
    update.$unset['services.resume.loginTokens'] = 1;                                             // 345
  }                                                                                               // 346
                                                                                                  // 347
  Meteor.users.update({_id: user._id}, update);                                                   // 348
};                                                                                                // 349
                                                                                                  // 350
                                                                                                  // 351
///                                                                                               // 352
/// RESETTING VIA EMAIL                                                                           // 353
///                                                                                               // 354
                                                                                                  // 355
// Method called by a user to request a password reset email. This is                             // 356
// the start of the reset process.                                                                // 357
Meteor.methods({forgotPassword: function (options) {                                              // 358
  check(options, {email: String});                                                                // 359
                                                                                                  // 360
  var user = Meteor.users.findOne({"emails.address": options.email});                             // 361
  if (!user)                                                                                      // 362
    throw new Meteor.Error(403, "User not found");                                                // 363
                                                                                                  // 364
  Accounts.sendResetPasswordEmail(user._id, options.email);                                       // 365
}});                                                                                              // 366
                                                                                                  // 367
// send the user an email with a link that when opened allows the user                            // 368
// to set a new password, without the old password.                                               // 369
                                                                                                  // 370
/**                                                                                               // 371
 * @summary Send an email with a link the user can use to reset their password.                   // 372
 * @locus Server                                                                                  // 373
 * @param {String} userId The id of the user to send email to.                                    // 374
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 */                                                                                               // 376
Accounts.sendResetPasswordEmail = function (userId, email) {                                      // 377
  // Make sure the user exists, and email is one of their addresses.                              // 378
  var user = Meteor.users.findOne(userId);                                                        // 379
  if (!user)                                                                                      // 380
    throw new Error("Can't find user");                                                           // 381
  // pick the first email if we weren't passed an email.                                          // 382
  if (!email && user.emails && user.emails[0])                                                    // 383
    email = user.emails[0].address;                                                               // 384
  // make sure we have a valid email                                                              // 385
  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email))                        // 386
    throw new Error("No such email for user.");                                                   // 387
                                                                                                  // 388
  var token = Random.secret();                                                                    // 389
  var when = new Date();                                                                          // 390
  var tokenRecord = {                                                                             // 391
    token: token,                                                                                 // 392
    email: email,                                                                                 // 393
    when: when                                                                                    // 394
  };                                                                                              // 395
  Meteor.users.update(userId, {$set: {                                                            // 396
    "services.password.reset": tokenRecord                                                        // 397
  }});                                                                                            // 398
  // before passing to template, update user object with new token                                // 399
  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;                               // 400
                                                                                                  // 401
  var resetPasswordUrl = Accounts.urls.resetPassword(token);                                      // 402
                                                                                                  // 403
  var options = {                                                                                 // 404
    to: email,                                                                                    // 405
    from: Accounts.emailTemplates.resetPassword.from                                              // 406
      ? Accounts.emailTemplates.resetPassword.from(user)                                          // 407
      : Accounts.emailTemplates.from,                                                             // 408
    subject: Accounts.emailTemplates.resetPassword.subject(user),                                 // 409
    text: Accounts.emailTemplates.resetPassword.text(user, resetPasswordUrl)                      // 410
  };                                                                                              // 411
                                                                                                  // 412
  if (typeof Accounts.emailTemplates.resetPassword.html === 'function')                           // 413
    options.html =                                                                                // 414
      Accounts.emailTemplates.resetPassword.html(user, resetPasswordUrl);                         // 415
                                                                                                  // 416
  if (typeof Accounts.emailTemplates.headers === 'object') {                                      // 417
    options.headers = Accounts.emailTemplates.headers;                                            // 418
  }                                                                                               // 419
                                                                                                  // 420
  Email.send(options);                                                                            // 421
};                                                                                                // 422
                                                                                                  // 423
// send the user an email informing them that their account was created, with                     // 424
// a link that when opened both marks their email as verified and forces them                     // 425
// to choose their password. The email must be one of the addresses in the                        // 426
// user's emails field, or undefined to pick the first email automatically.                       // 427
//                                                                                                // 428
// This is not called automatically. It must be called manually if you                            // 429
// want to use enrollment emails.                                                                 // 430
                                                                                                  // 431
/**                                                                                               // 432
 * @summary Send an email with a link the user can use to set their initial password.             // 433
 * @locus Server                                                                                  // 434
 * @param {String} userId The id of the user to send email to.                                    // 435
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 */                                                                                               // 437
Accounts.sendEnrollmentEmail = function (userId, email) {                                         // 438
  // XXX refactor! This is basically identical to sendResetPasswordEmail.                         // 439
                                                                                                  // 440
  // Make sure the user exists, and email is in their addresses.                                  // 441
  var user = Meteor.users.findOne(userId);                                                        // 442
  if (!user)                                                                                      // 443
    throw new Error("Can't find user");                                                           // 444
  // pick the first email if we weren't passed an email.                                          // 445
  if (!email && user.emails && user.emails[0])                                                    // 446
    email = user.emails[0].address;                                                               // 447
  // make sure we have a valid email                                                              // 448
  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email))                        // 449
    throw new Error("No such email for user.");                                                   // 450
                                                                                                  // 451
  var token = Random.secret();                                                                    // 452
  var when = new Date();                                                                          // 453
  var tokenRecord = {                                                                             // 454
    token: token,                                                                                 // 455
    email: email,                                                                                 // 456
    when: when                                                                                    // 457
  };                                                                                              // 458
  Meteor.users.update(userId, {$set: {                                                            // 459
    "services.password.reset": tokenRecord                                                        // 460
  }});                                                                                            // 461
                                                                                                  // 462
  // before passing to template, update user object with new token                                // 463
  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;                               // 464
                                                                                                  // 465
  var enrollAccountUrl = Accounts.urls.enrollAccount(token);                                      // 466
                                                                                                  // 467
  var options = {                                                                                 // 468
    to: email,                                                                                    // 469
    from: Accounts.emailTemplates.enrollAccount.from                                              // 470
      ? Accounts.emailTemplates.enrollAccount.from(user)                                          // 471
      : Accounts.emailTemplates.from,                                                             // 472
    subject: Accounts.emailTemplates.enrollAccount.subject(user),                                 // 473
    text: Accounts.emailTemplates.enrollAccount.text(user, enrollAccountUrl)                      // 474
  };                                                                                              // 475
                                                                                                  // 476
  if (typeof Accounts.emailTemplates.enrollAccount.html === 'function')                           // 477
    options.html =                                                                                // 478
      Accounts.emailTemplates.enrollAccount.html(user, enrollAccountUrl);                         // 479
                                                                                                  // 480
  if (typeof Accounts.emailTemplates.headers === 'object') {                                      // 481
    options.headers = Accounts.emailTemplates.headers;                                            // 482
  }                                                                                               // 483
                                                                                                  // 484
  Email.send(options);                                                                            // 485
};                                                                                                // 486
                                                                                                  // 487
                                                                                                  // 488
// Take token from sendResetPasswordEmail or sendEnrollmentEmail, change                          // 489
// the users password, and log them in.                                                           // 490
Meteor.methods({resetPassword: function (token, newPassword) {                                    // 491
  var self = this;                                                                                // 492
  return Accounts._loginMethod(                                                                   // 493
    self,                                                                                         // 494
    "resetPassword",                                                                              // 495
    arguments,                                                                                    // 496
    "password",                                                                                   // 497
    function () {                                                                                 // 498
      check(token, String);                                                                       // 499
      check(newPassword, passwordValidator);                                                      // 500
                                                                                                  // 501
      var user = Meteor.users.findOne({                                                           // 502
        "services.password.reset.token": token});                                                 // 503
      if (!user)                                                                                  // 504
        throw new Meteor.Error(403, "Token expired");                                             // 505
      var email = user.services.password.reset.email;                                             // 506
      if (!_.include(_.pluck(user.emails || [], 'address'), email))                               // 507
        return {                                                                                  // 508
          userId: user._id,                                                                       // 509
          error: new Meteor.Error(403, "Token has invalid email address")                         // 510
        };                                                                                        // 511
                                                                                                  // 512
      var hashed = hashPassword(newPassword);                                                     // 513
                                                                                                  // 514
      // NOTE: We're about to invalidate tokens on the user, who we might be                      // 515
      // logged in as. Make sure to avoid logging ourselves out if this                           // 516
      // happens. But also make sure not to leave the connection in a state                       // 517
      // of having a bad token set if things fail.                                                // 518
      var oldToken = Accounts._getLoginToken(self.connection.id);                                 // 519
      Accounts._setLoginToken(user._id, self.connection, null);                                   // 520
      var resetToOldToken = function () {                                                         // 521
        Accounts._setLoginToken(user._id, self.connection, oldToken);                             // 522
      };                                                                                          // 523
                                                                                                  // 524
      try {                                                                                       // 525
        // Update the user record by:                                                             // 526
        // - Changing the password to the new one                                                 // 527
        // - Forgetting about the reset token that was just used                                  // 528
        // - Verifying their email, since they got the password reset via email.                  // 529
        var affectedRecords = Meteor.users.update(                                                // 530
          {                                                                                       // 531
            _id: user._id,                                                                        // 532
            'emails.address': email,                                                              // 533
            'services.password.reset.token': token                                                // 534
          },                                                                                      // 535
          {$set: {'services.password.bcrypt': hashed,                                             // 536
                  'emails.$.verified': true},                                                     // 537
           $unset: {'services.password.reset': 1,                                                 // 538
                    'services.password.srp': 1}});                                                // 539
        if (affectedRecords !== 1)                                                                // 540
          return {                                                                                // 541
            userId: user._id,                                                                     // 542
            error: new Meteor.Error(403, "Invalid email")                                         // 543
          };                                                                                      // 544
      } catch (err) {                                                                             // 545
        resetToOldToken();                                                                        // 546
        throw err;                                                                                // 547
      }                                                                                           // 548
                                                                                                  // 549
      // Replace all valid login tokens with new ones (changing                                   // 550
      // password should invalidate existing sessions).                                           // 551
      Accounts._clearAllLoginTokens(user._id);                                                    // 552
                                                                                                  // 553
      return {userId: user._id};                                                                  // 554
    }                                                                                             // 555
  );                                                                                              // 556
}});                                                                                              // 557
                                                                                                  // 558
///                                                                                               // 559
/// EMAIL VERIFICATION                                                                            // 560
///                                                                                               // 561
                                                                                                  // 562
                                                                                                  // 563
// send the user an email with a link that when opened marks that                                 // 564
// address as verified                                                                            // 565
                                                                                                  // 566
/**                                                                                               // 567
 * @summary Send an email with a link the user can use verify their email address.                // 568
 * @locus Server                                                                                  // 569
 * @param {String} userId The id of the user to send email to.                                    // 570
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 */                                                                                               // 572
Accounts.sendVerificationEmail = function (userId, address) {                                     // 573
  // XXX Also generate a link using which someone can delete this                                 // 574
  // account if they own said address but weren't those who created                               // 575
  // this account.                                                                                // 576
                                                                                                  // 577
  // Make sure the user exists, and address is one of their addresses.                            // 578
  var user = Meteor.users.findOne(userId);                                                        // 579
  if (!user)                                                                                      // 580
    throw new Error("Can't find user");                                                           // 581
  // pick the first unverified address if we weren't passed an address.                           // 582
  if (!address) {                                                                                 // 583
    var email = _.find(user.emails || [],                                                         // 584
                       function (e) { return !e.verified; });                                     // 585
    address = (email || {}).address;                                                              // 586
  }                                                                                               // 587
  // make sure we have a valid address                                                            // 588
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))                    // 589
    throw new Error("No such email address for user.");                                           // 590
                                                                                                  // 591
                                                                                                  // 592
  var tokenRecord = {                                                                             // 593
    token: Random.secret(),                                                                       // 594
    address: address,                                                                             // 595
    when: new Date()};                                                                            // 596
  Meteor.users.update(                                                                            // 597
    {_id: userId},                                                                                // 598
    {$push: {'services.email.verificationTokens': tokenRecord}});                                 // 599
                                                                                                  // 600
  // before passing to template, update user object with new token                                // 601
  Meteor._ensure(user, 'services', 'email');                                                      // 602
  if (!user.services.email.verificationTokens) {                                                  // 603
    user.services.email.verificationTokens = [];                                                  // 604
  }                                                                                               // 605
  user.services.email.verificationTokens.push(tokenRecord);                                       // 606
                                                                                                  // 607
  var verifyEmailUrl = Accounts.urls.verifyEmail(tokenRecord.token);                              // 608
                                                                                                  // 609
  var options = {                                                                                 // 610
    to: address,                                                                                  // 611
    from: Accounts.emailTemplates.verifyEmail.from                                                // 612
      ? Accounts.emailTemplates.verifyEmail.from(user)                                            // 613
      : Accounts.emailTemplates.from,                                                             // 614
    subject: Accounts.emailTemplates.verifyEmail.subject(user),                                   // 615
    text: Accounts.emailTemplates.verifyEmail.text(user, verifyEmailUrl)                          // 616
  };                                                                                              // 617
                                                                                                  // 618
  if (typeof Accounts.emailTemplates.verifyEmail.html === 'function')                             // 619
    options.html =                                                                                // 620
      Accounts.emailTemplates.verifyEmail.html(user, verifyEmailUrl);                             // 621
                                                                                                  // 622
  if (typeof Accounts.emailTemplates.headers === 'object') {                                      // 623
    options.headers = Accounts.emailTemplates.headers;                                            // 624
  }                                                                                               // 625
                                                                                                  // 626
  Email.send(options);                                                                            // 627
};                                                                                                // 628
                                                                                                  // 629
// Take token from sendVerificationEmail, mark the email as verified,                             // 630
// and log them in.                                                                               // 631
Meteor.methods({verifyEmail: function (token) {                                                   // 632
  var self = this;                                                                                // 633
  return Accounts._loginMethod(                                                                   // 634
    self,                                                                                         // 635
    "verifyEmail",                                                                                // 636
    arguments,                                                                                    // 637
    "password",                                                                                   // 638
    function () {                                                                                 // 639
      check(token, String);                                                                       // 640
                                                                                                  // 641
      var user = Meteor.users.findOne(                                                            // 642
        {'services.email.verificationTokens.token': token});                                      // 643
      if (!user)                                                                                  // 644
        throw new Meteor.Error(403, "Verify email link expired");                                 // 645
                                                                                                  // 646
      var tokenRecord = _.find(user.services.email.verificationTokens,                            // 647
                               function (t) {                                                     // 648
                                 return t.token == token;                                         // 649
                               });                                                                // 650
      if (!tokenRecord)                                                                           // 651
        return {                                                                                  // 652
          userId: user._id,                                                                       // 653
          error: new Meteor.Error(403, "Verify email link expired")                               // 654
        };                                                                                        // 655
                                                                                                  // 656
      var emailsRecord = _.find(user.emails, function (e) {                                       // 657
        return e.address == tokenRecord.address;                                                  // 658
      });                                                                                         // 659
      if (!emailsRecord)                                                                          // 660
        return {                                                                                  // 661
          userId: user._id,                                                                       // 662
          error: new Meteor.Error(403, "Verify email link is for unknown address")                // 663
        };                                                                                        // 664
                                                                                                  // 665
      // By including the address in the query, we can use 'emails.$' in the                      // 666
      // modifier to get a reference to the specific object in the emails                         // 667
      // array. See                                                                               // 668
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)         // 669
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull                            // 670
      Meteor.users.update(                                                                        // 671
        {_id: user._id,                                                                           // 672
         'emails.address': tokenRecord.address},                                                  // 673
        {$set: {'emails.$.verified': true},                                                       // 674
         $pull: {'services.email.verificationTokens': {token: token}}});                          // 675
                                                                                                  // 676
      return {userId: user._id};                                                                  // 677
    }                                                                                             // 678
  );                                                                                              // 679
}});                                                                                              // 680
                                                                                                  // 681
                                                                                                  // 682
                                                                                                  // 683
///                                                                                               // 684
/// CREATING USERS                                                                                // 685
///                                                                                               // 686
                                                                                                  // 687
// Shared createUser function called from the createUser method, both                             // 688
// if originates in client or server code. Calls user provided hooks,                             // 689
// does the actual user insertion.                                                                // 690
//                                                                                                // 691
// returns the user id                                                                            // 692
var createUser = function (options) {                                                             // 693
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary                          // 694
  // options.                                                                                     // 695
  check(options, Match.ObjectIncluding({                                                          // 696
    username: Match.Optional(String),                                                             // 697
    email: Match.Optional(String),                                                                // 698
    password: Match.Optional(passwordValidator)                                                   // 699
  }));                                                                                            // 700
                                                                                                  // 701
  var username = options.username;                                                                // 702
  var email = options.email;                                                                      // 703
  if (!username && !email)                                                                        // 704
    throw new Meteor.Error(400, "Need to set a username or email");                               // 705
                                                                                                  // 706
  var user = {services: {}};                                                                      // 707
  if (options.password) {                                                                         // 708
    var hashed = hashPassword(options.password);                                                  // 709
    user.services.password = { bcrypt: hashed };                                                  // 710
  }                                                                                               // 711
                                                                                                  // 712
  if (username)                                                                                   // 713
    user.username = username;                                                                     // 714
  if (email)                                                                                      // 715
    user.emails = [{address: email, verified: false}];                                            // 716
                                                                                                  // 717
  return Accounts.insertUserDoc(options, user);                                                   // 718
};                                                                                                // 719
                                                                                                  // 720
// method for create user. Requests come from the client.                                         // 721
Meteor.methods({createUser: function (options) {                                                  // 722
  var self = this;                                                                                // 723
  return Accounts._loginMethod(                                                                   // 724
    self,                                                                                         // 725
    "createUser",                                                                                 // 726
    arguments,                                                                                    // 727
    "password",                                                                                   // 728
    function () {                                                                                 // 729
      // createUser() above does more checking.                                                   // 730
      check(options, Object);                                                                     // 731
      if (Accounts._options.forbidClientAccountCreation)                                          // 732
        return {                                                                                  // 733
          error: new Meteor.Error(403, "Signups forbidden")                                       // 734
        };                                                                                        // 735
                                                                                                  // 736
      // Create user. result contains id and token.                                               // 737
      var userId = createUser(options);                                                           // 738
      // safety belt. createUser is supposed to throw on error. send 500 error                    // 739
      // instead of sending a verification email with empty userid.                               // 740
      if (! userId)                                                                               // 741
        throw new Error("createUser failed to insert new user");                                  // 742
                                                                                                  // 743
      // If `Accounts._options.sendVerificationEmail` is set, register                            // 744
      // a token to verify the user's primary email, and send it to                               // 745
      // that address.                                                                            // 746
      if (options.email && Accounts._options.sendVerificationEmail)                               // 747
        Accounts.sendVerificationEmail(userId, options.email);                                    // 748
                                                                                                  // 749
      // client gets logged in as the new user afterwards.                                        // 750
      return {userId: userId};                                                                    // 751
    }                                                                                             // 752
  );                                                                                              // 753
}});                                                                                              // 754
                                                                                                  // 755
// Create user directly on the server.                                                            // 756
//                                                                                                // 757
// Unlike the client version, this does not log you in as this user                               // 758
// after creation.                                                                                // 759
//                                                                                                // 760
// returns userId or throws an error if it can't create                                           // 761
//                                                                                                // 762
// XXX add another argument ("server options") that gets sent to onCreateUser,                    // 763
// which is always empty when called from the createUser method? eg, "admin:                      // 764
// true", which we want to prevent the client from setting, but which a custom                    // 765
// method calling Accounts.createUser could set?                                                  // 766
//                                                                                                // 767
Accounts.createUser = function (options, callback) {                                              // 768
  options = _.clone(options);                                                                     // 769
                                                                                                  // 770
  // XXX allow an optional callback?                                                              // 771
  if (callback) {                                                                                 // 772
    throw new Error("Accounts.createUser with callback not supported on the server yet.");        // 773
  }                                                                                               // 774
                                                                                                  // 775
  return createUser(options);                                                                     // 776
};                                                                                                // 777
                                                                                                  // 778
///                                                                                               // 779
/// PASSWORD-SPECIFIC INDEXES ON USERS                                                            // 780
///                                                                                               // 781
Meteor.users._ensureIndex('emails.validationTokens.token',                                        // 782
                          {unique: 1, sparse: 1});                                                // 783
Meteor.users._ensureIndex('services.password.reset.token',                                        // 784
                          {unique: 1, sparse: 1});                                                // 785
                                                                                                  // 786
////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-password'] = {};

})();

//# sourceMappingURL=accounts-password.js.map
