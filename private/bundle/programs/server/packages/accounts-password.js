(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleBcrypt = Package['npm-bcrypt'].NpmModuleBcrypt;
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Email = Package.email.Email;
var EmailInternals = Package.email.EmailInternals;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-password":{"email_templates.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/accounts-password/email_templates.js                                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
function greet(welcomeMsg) {
  return function (user, url) {
    var greeting = user.profile && user.profile.name ? "Hello " + user.profile.name + "," : "Hello,";
    return `${greeting}

${welcomeMsg}, simply click the link below.

${url}

Thanks.
`;
  };
} /**
   * @summary Options to customize emails sent from the Accounts system.
   * @locus Server
   * @importFromPackage accounts-base
   */

Accounts.emailTemplates = {
  from: "Accounts Example <no-reply@example.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),
  resetPassword: {
    subject: function (user) {
      return "How to reset your password on " + Accounts.emailTemplates.siteName;
    },
    text: greet("To reset your password")
  },
  verifyEmail: {
    subject: function (user) {
      return "How to verify email address on " + Accounts.emailTemplates.siteName;
    },
    text: greet("To verify your account email")
  },
  enrollAccount: {
    subject: function (user) {
      return "An account has been created for you on " + Accounts.emailTemplates.siteName;
    },
    text: greet("To start using the service")
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"password_server.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/accounts-password/password_server.js                                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/// BCRYPT
var bcrypt = NpmModuleBcrypt;
var bcryptHash = Meteor.wrapAsync(bcrypt.hash);
var bcryptCompare = Meteor.wrapAsync(bcrypt.compare); // User records have a 'services.password.bcrypt' field on them to hold
// their hashed passwords (unless they have a 'services.password.srp'
// field, in which case they will be upgraded to bcrypt the next time
// they log in).
//
// When the client sends a password to the server, it can either be a
// string (the plaintext password) or an object with keys 'digest' and
// 'algorithm' (must be "sha-256" for now). The Meteor client always sends
// password objects { digest: *, algorithm: "sha-256" }, but DDP clients
// that don't have access to SHA can just send plaintext passwords as
// strings.
//
// When the server receives a plaintext password as a string, it always
// hashes it with SHA256 before passing it into bcrypt. When the server
// receives a password as an object, it asserts that the algorithm is
// "sha-256" and then passes the digest to bcrypt.

Accounts._bcryptRounds = 10; // Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//

var getPasswordString = function (password) {
  if (typeof password === "string") {
    password = SHA256(password);
  } else {
    // 'password' is an object
    if (password.algorithm !== "sha-256") {
      throw new Error("Invalid password hash algorithm. " + "Only 'sha-256' is allowed.");
    }

    password = password.digest;
  }

  return password;
}; // Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//


var hashPassword = function (password) {
  password = getPasswordString(password);
  return bcryptHash(password, Accounts._bcryptRounds);
}; // Check whether the provided password matches the bcrypt'ed password in
// the database user record. `password` can be a string (in which case
// it will be run through SHA256 before bcrypt) or an object with
// properties `digest` and `algorithm` (in which case we bcrypt
// `password.digest`).
//


Accounts._checkPassword = function (user, password) {
  var result = {
    userId: user._id
  };
  password = getPasswordString(password);

  if (!bcryptCompare(password, user.services.password.bcrypt)) {
    result.error = handleError("Incorrect password", false);
  }

  return result;
};

var checkPassword = Accounts._checkPassword; ///
/// ERROR HANDLER
///

const handleError = (msg, throwError = true) => {
  const error = new Meteor.Error(403, Accounts._options.ambiguousErrorMessages ? "Something went wrong. Please check your credentials." : msg);

  if (throwError) {
    throw error;
  }

  return error;
}; ///
/// LOGIN
///


Accounts._findUserByQuery = function (query) {
  var user = null;

  if (query.id) {
    user = Meteor.users.findOne({
      _id: query.id
    });
  } else {
    var fieldName;
    var fieldValue;

    if (query.username) {
      fieldName = 'username';
      fieldValue = query.username;
    } else if (query.email) {
      fieldName = 'emails.address';
      fieldValue = query.email;
    } else {
      throw new Error("shouldn't happen (validation missed something)");
    }

    var selector = {};
    selector[fieldName] = fieldValue;
    user = Meteor.users.findOne(selector); // If user is not found, try a case insensitive lookup

    if (!user) {
      selector = selectorForFastCaseInsensitiveLookup(fieldName, fieldValue);
      var candidateUsers = Meteor.users.find(selector).fetch(); // No match if multiple candidates are found

      if (candidateUsers.length === 1) {
        user = candidateUsers[0];
      }
    }
  }

  return user;
}; /**
    * @summary Finds the user with the specified username.
    * First tries to match username case sensitively; if that fails, it
    * tries case insensitively; but if more than one user matches the case
    * insensitive search, it returns null.
    * @locus Server
    * @param {String} username The username to look for
    * @returns {Object} A user if found, else null
    * @importFromPackage accounts-base
    */

Accounts.findUserByUsername = function (username) {
  return Accounts._findUserByQuery({
    username: username
  });
}; /**
    * @summary Finds the user with the specified email.
    * First tries to match email case sensitively; if that fails, it
    * tries case insensitively; but if more than one user matches the case
    * insensitive search, it returns null.
    * @locus Server
    * @param {String} email The email address to look for
    * @returns {Object} A user if found, else null
    * @importFromPackage accounts-base
    */

Accounts.findUserByEmail = function (email) {
  return Accounts._findUserByQuery({
    email: email
  });
}; // Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).


var selectorForFastCaseInsensitiveLookup = function (fieldName, string) {
  // Performance seems to improve up to 4 prefix characters
  var prefix = string.substring(0, Math.min(string.length, 4));

  var orClause = _.map(generateCasePermutationsForString(prefix), function (prefixPermutation) {
    var selector = {};
    selector[fieldName] = new RegExp('^' + Meteor._escapeRegExp(prefixPermutation));
    return selector;
  });

  var caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] = new RegExp('^' + Meteor._escapeRegExp(string) + '$', 'i');
  return {
    $and: [{
      $or: orClause
    }, caseInsensitiveClause]
  };
}; // Generates permutations of all case variations of a given string.


var generateCasePermutationsForString = function (string) {
  var permutations = [''];

  for (var i = 0; i < string.length; i++) {
    var ch = string.charAt(i);
    permutations = _.flatten(_.map(permutations, function (prefix) {
      var lowerCaseChar = ch.toLowerCase();
      var upperCaseChar = ch.toUpperCase(); // Don't add unneccesary permutations when ch is not a letter

      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }

  return permutations;
};

var checkForCaseInsensitiveDuplicates = function (fieldName, displayName, fieldValue, ownUserId) {
  // Some tests need the ability to add users with the same case insensitive
  // value, hence the _skipCaseInsensitiveChecksForTest check
  var skipCheck = _.has(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

  if (fieldValue && !skipCheck) {
    var matchedUsers = Meteor.users.find(selectorForFastCaseInsensitiveLookup(fieldName, fieldValue)).fetch();

    if (matchedUsers.length > 0 && ( // If we don't have a userId yet, any match we find is a duplicate
    !ownUserId || // Otherwise, check to see if there are multiple matches or a match
    // that is not us
    matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId)) {
      handleError(displayName + " already exists.");
    }
  }
}; // XXX maybe this belongs in the check package


var NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});
var userQueryValidator = Match.Where(function (user) {
  check(user, {
    id: Match.Optional(NonEmptyString),
    username: Match.Optional(NonEmptyString),
    email: Match.Optional(NonEmptyString)
  });
  if (_.keys(user).length !== 1) throw new Match.Error("User property must have exactly one field");
  return true;
});
var passwordValidator = Match.OneOf(String, {
  digest: String,
  algorithm: String
}); // Handler to login with a password.
//
// The Meteor client sets options.password to an object with keys
// 'digest' (set to SHA256(password)) and 'algorithm' ("sha-256").
//
// For other DDP clients which don't have access to SHA, the handler
// also accepts the plaintext password in options.password as a string.
//
// (It might be nice if servers could turn the plaintext password
// option off. Or maybe it should be opt-in, not opt-out?
// Accounts.config option?)
//
// Note that neither password option is secure without SSL.
//

Accounts.registerLoginHandler("password", function (options) {
  if (!options.password || options.srp) return undefined; // don't handle

  check(options, {
    user: userQueryValidator,
    password: passwordValidator
  });

  var user = Accounts._findUserByQuery(options.user);

  if (!user) {
    handleError("User not found");
  }

  if (!user.services || !user.services.password || !(user.services.password.bcrypt || user.services.password.srp)) {
    handleError("User has no password set");
  }

  if (!user.services.password.bcrypt) {
    if (typeof options.password === "string") {
      // The client has presented a plaintext password, and the user is
      // not upgraded to bcrypt yet. We don't attempt to tell the client
      // to upgrade to bcrypt, because it might be a standalone DDP
      // client doesn't know how to do such a thing.
      var verifier = user.services.password.srp;
      var newVerifier = SRP.generateVerifier(options.password, {
        identity: verifier.identity,
        salt: verifier.salt
      });

      if (verifier.verifier !== newVerifier.verifier) {
        return {
          userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
          error: handleError("Incorrect password", false)
        };
      }

      return {
        userId: user._id
      };
    } else {
      // Tell the client to use the SRP upgrade process.
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }
  }

  return checkPassword(user, options.password);
}); // Handler to login using the SRP upgrade path. To use this login
// handler, the client must provide:
//   - srp: H(identity + ":" + password)
//   - password: a string or an object with properties 'digest' and 'algorithm'
//
// We use `options.srp` to verify that the client knows the correct
// password without doing a full SRP flow. Once we've checked that, we
// upgrade the user to bcrypt and remove the SRP information from the
// user document.
//
// The client ends up using this login handler after trying the normal
// login handler (above), which throws an error telling the client to
// try the SRP upgrade path.
//
// XXX COMPAT WITH 0.8.1.3

Accounts.registerLoginHandler("password", function (options) {
  if (!options.srp || !options.password) {
    return undefined; // don't handle
  }

  check(options, {
    user: userQueryValidator,
    srp: String,
    password: passwordValidator
  });

  var user = Accounts._findUserByQuery(options.user);

  if (!user) {
    handleError("User not found");
  } // Check to see if another simultaneous login has already upgraded
  // the user record to bcrypt.


  if (user.services && user.services.password && user.services.password.bcrypt) {
    return checkPassword(user, options.password);
  }

  if (!(user.services && user.services.password && user.services.password.srp)) {
    handleError("User has no password set");
  }

  var v1 = user.services.password.srp.verifier;
  var v2 = SRP.generateVerifier(null, {
    hashedIdentityAndPassword: options.srp,
    salt: user.services.password.srp.salt
  }).verifier;

  if (v1 !== v2) {
    return {
      userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
      error: handleError("Incorrect password", false)
    };
  } // Upgrade to bcrypt on successful login.


  var salted = hashPassword(options.password);
  Meteor.users.update(user._id, {
    $unset: {
      'services.password.srp': 1
    },
    $set: {
      'services.password.bcrypt': salted
    }
  });
  return {
    userId: user._id
  };
}); ///
/// CHANGING
///
/**
 * @summary Change a user's username. Use this instead of updating the
 * database directly. The operation will fail if there is an existing user
 * with a username only differing in case.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newUsername A new username for the user.
 * @importFromPackage accounts-base
 */

Accounts.setUsername = function (userId, newUsername) {
  check(userId, NonEmptyString);
  check(newUsername, NonEmptyString);
  var user = Meteor.users.findOne(userId);

  if (!user) {
    handleError("User not found");
  }

  var oldUsername = user.username; // Perform a case insensitive check for duplicates before update

  checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      username: newUsername
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        username: oldUsername
      }
    });
    throw ex;
  }
}; // Let the user change their own password if they know the old
// password. `oldPassword` and `newPassword` should be objects with keys
// `digest` and `algorithm` (representing the SHA256 of the password).
//
// XXX COMPAT WITH 0.8.1.3
// Like the login method, if the user hasn't been upgraded from SRP to
// bcrypt yet, then this method will throw an 'old password format'
// error. The client should call the SRP upgrade login handler and then
// retry this method again.
//
// UNLIKE the login method, there is no way to avoid getting SRP upgrade
// errors thrown. The reasoning for this is that clients using this
// method directly will need to be updated anyway because we no longer
// support the SRP flow that they would have been doing to use this
// method previously.


Meteor.methods({
  changePassword: function (oldPassword, newPassword) {
    check(oldPassword, passwordValidator);
    check(newPassword, passwordValidator);

    if (!this.userId) {
      throw new Meteor.Error(401, "Must be logged in");
    }

    var user = Meteor.users.findOne(this.userId);

    if (!user) {
      handleError("User not found");
    }

    if (!user.services || !user.services.password || !user.services.password.bcrypt && !user.services.password.srp) {
      handleError("User has no password set");
    }

    if (!user.services.password.bcrypt) {
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }

    var result = checkPassword(user, oldPassword);

    if (result.error) {
      throw result.error;
    }

    var hashed = hashPassword(newPassword); // It would be better if this removed ALL existing tokens and replaced
    // the token for the current connection with a new one, but that would
    // be tricky, so we'll settle for just replacing all tokens other than
    // the one for the current connection.

    var currentToken = Accounts._getLoginToken(this.connection.id);

    Meteor.users.update({
      _id: this.userId
    }, {
      $set: {
        'services.password.bcrypt': hashed
      },
      $pull: {
        'services.resume.loginTokens': {
          hashedToken: {
            $ne: currentToken
          }
        }
      },
      $unset: {
        'services.password.reset': 1
      }
    });
    return {
      passwordChanged: true
    };
  }
}); // Force change the users password.
/**
 * @summary Forcibly change the password for a user.
 * @locus Server
 * @param {String} userId The id of the user to update.
 * @param {String} newPassword A new password for the user.
 * @param {Object} [options]
 * @param {Object} options.logout Logout all current connections with this userId (default: true)
 * @importFromPackage accounts-base
 */

Accounts.setPassword = function (userId, newPlaintextPassword, options) {
  options = _.extend({
    logout: true
  }, options);
  var user = Meteor.users.findOne(userId);

  if (!user) {
    throw new Meteor.Error(403, "User not found");
  }

  var update = {
    $unset: {
      'services.password.srp': 1,
      // XXX COMPAT WITH 0.8.1.3
      'services.password.reset': 1
    },
    $set: {
      'services.password.bcrypt': hashPassword(newPlaintextPassword)
    }
  };

  if (options.logout) {
    update.$unset['services.resume.loginTokens'] = 1;
  }

  Meteor.users.update({
    _id: user._id
  }, update);
}; ///
/// RESETTING VIA EMAIL
///
// Method called by a user to request a password reset email. This is
// the start of the reset process.


Meteor.methods({
  forgotPassword: function (options) {
    check(options, {
      email: String
    });
    var user = Accounts.findUserByEmail(options.email);

    if (!user) {
      handleError("User not found");
    }

    const emails = _.pluck(user.emails || [], 'address');

    const caseSensitiveEmail = _.find(emails, email => {
      return email.toLowerCase() === options.email.toLowerCase();
    });

    Accounts.sendResetPasswordEmail(user._id, caseSensitiveEmail);
  }
}); /**
     * @summary Generates a reset token and saves it into the database.
     * @locus Server
     * @param {String} userId The id of the user to generate the reset token for.
     * @param {String} email Which address of the user to generate the reset token for. This address must be in the user's `emails` list. If `null`, defaults to the first email in the list.
     * @param {String} reason `resetPassword` or `enrollAccount`.
     * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
     * @returns {Object} Object with {email, user, token} values.
     * @importFromPackage accounts-base
     */

Accounts.generateResetToken = function (userId, email, reason, extraTokenData) {
  // Make sure the user exists, and email is one of their addresses.
  var user = Meteor.users.findOne(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first email if we weren't passed an email.


  if (!email && user.emails && user.emails[0]) {
    email = user.emails[0].address;
  } // make sure we have a valid email


  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email)) {
    handleError("No such email for user.");
  }

  var token = Random.secret();
  var tokenRecord = {
    token: token,
    email: email,
    when: new Date()
  };

  if (reason === 'resetPassword') {
    tokenRecord.reason = 'reset';
  } else if (reason === 'enrollAccount') {
    tokenRecord.reason = 'enroll';
  } else if (reason) {
    // fallback so that this function can be used for unknown reasons as well
    tokenRecord.reason = reason;
  }

  if (extraTokenData) {
    _.extend(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      'services.password.reset': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;
  return {
    email,
    user,
    token
  };
}; /**
    * @summary Generates an e-mail verification token and saves it into the database.
    * @locus Server
    * @param {String} userId The id of the user to generate the  e-mail verification token for.
    * @param {String} email Which address of the user to generate the e-mail verification token for. This address must be in the user's `emails` list. If `null`, defaults to the first unverified email in the list.
    * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
    * @returns {Object} Object with {email, user, token} values.
    * @importFromPackage accounts-base
    */

Accounts.generateVerificationToken = function (userId, email, extraTokenData) {
  // Make sure the user exists, and email is one of their addresses.
  var user = Meteor.users.findOne(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first unverified email if we weren't passed an email.


  if (!email) {
    var emailRecord = _.find(user.emails || [], function (e) {
      return !e.verified;
    });

    email = (emailRecord || {}).address;

    if (!email) {
      handleError("That user has no unverified email addresses.");
    }
  } // make sure we have a valid email


  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email)) {
    handleError("No such email for user.");
  }

  var token = Random.secret();
  var tokenRecord = {
    token: token,
    // TODO: This should probably be renamed to "email" to match reset token record.
    address: email,
    when: new Date()
  };

  if (extraTokenData) {
    _.extend(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $push: {
      'services.email.verificationTokens': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'email');

  if (!user.services.email.verificationTokens) {
    user.services.email.verificationTokens = [];
  }

  user.services.email.verificationTokens.push(tokenRecord);
  return {
    email,
    user,
    token
  };
}; /**
    * @summary Creates options for email sending for reset password and enroll account emails.
    * You can use this function when customizing a reset password or enroll account email sending.
    * @locus Server
    * @param {Object} email Which address of the user's to send the email to.
    * @param {Object} user The user object to generate options for.
    * @param {String} url URL to which user is directed to confirm the email.
    * @param {String} reason `resetPassword` or `enrollAccount`.
    * @returns {Object} Options which can be passed to `Email.send`.
    * @importFromPackage accounts-base
    */

Accounts.generateOptionsForEmail = function (email, user, url, reason) {
  var options = {
    to: email,
    from: Accounts.emailTemplates[reason].from ? Accounts.emailTemplates[reason].from(user) : Accounts.emailTemplates.from,
    subject: Accounts.emailTemplates[reason].subject(user)
  };

  if (typeof Accounts.emailTemplates[reason].text === 'function') {
    options.text = Accounts.emailTemplates[reason].text(user, url);
  }

  if (typeof Accounts.emailTemplates[reason].html === 'function') {
    options.html = Accounts.emailTemplates[reason].html(user, url);
  }

  if (typeof Accounts.emailTemplates.headers === 'object') {
    options.headers = Accounts.emailTemplates.headers;
  }

  return options;
}; // send the user an email with a link that when opened allows the user
// to set a new password, without the old password.
/**
 * @summary Send an email with a link the user can use to reset their password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */

Accounts.sendResetPasswordEmail = function (userId, email, extraTokenData) {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'resetPassword', extraTokenData);
  const url = Accounts.urls.resetPassword(token);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'resetPassword');
  Email.send(options);
  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // send the user an email informing them that their account was created, with
// a link that when opened both marks their email as verified and forces them
// to choose their password. The email must be one of the addresses in the
// user's emails field, or undefined to pick the first email automatically.
//
// This is not called automatically. It must be called manually if you
// want to use enrollment emails.
/**
 * @summary Send an email with a link the user can use to set their initial password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */

Accounts.sendEnrollmentEmail = function (userId, email, extraTokenData) {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'enrollAccount', extraTokenData);
  const url = Accounts.urls.enrollAccount(token);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'enrollAccount');
  Email.send(options);
  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendResetPasswordEmail or sendEnrollmentEmail, change
// the users password, and log them in.


Meteor.methods({
  resetPassword: function (token, newPassword) {
    var self = this;
    return Accounts._loginMethod(self, "resetPassword", arguments, "password", function () {
      check(token, String);
      check(newPassword, passwordValidator);
      var user = Meteor.users.findOne({
        "services.password.reset.token": token
      });

      if (!user) {
        throw new Meteor.Error(403, "Token expired");
      }

      var when = user.services.password.reset.when;
      var reason = user.services.password.reset.reason;

      var tokenLifetimeMs = Accounts._getPasswordResetTokenLifetimeMs();

      if (reason === "enroll") {
        tokenLifetimeMs = Accounts._getPasswordEnrollTokenLifetimeMs();
      }

      var currentTimeMs = Date.now();
      if (currentTimeMs - when > tokenLifetimeMs) throw new Meteor.Error(403, "Token expired");
      var email = user.services.password.reset.email;
      if (!_.include(_.pluck(user.emails || [], 'address'), email)) return {
        userId: user._id,
        error: new Meteor.Error(403, "Token has invalid email address")
      };
      var hashed = hashPassword(newPassword); // NOTE: We're about to invalidate tokens on the user, who we might be
      // logged in as. Make sure to avoid logging ourselves out if this
      // happens. But also make sure not to leave the connection in a state
      // of having a bad token set if things fail.

      var oldToken = Accounts._getLoginToken(self.connection.id);

      Accounts._setLoginToken(user._id, self.connection, null);

      var resetToOldToken = function () {
        Accounts._setLoginToken(user._id, self.connection, oldToken);
      };

      try {
        // Update the user record by:
        // - Changing the password to the new one
        // - Forgetting about the reset token that was just used
        // - Verifying their email, since they got the password reset via email.
        var affectedRecords = Meteor.users.update({
          _id: user._id,
          'emails.address': email,
          'services.password.reset.token': token
        }, {
          $set: {
            'services.password.bcrypt': hashed,
            'emails.$.verified': true
          },
          $unset: {
            'services.password.reset': 1,
            'services.password.srp': 1
          }
        });
        if (affectedRecords !== 1) return {
          userId: user._id,
          error: new Meteor.Error(403, "Invalid email")
        };
      } catch (err) {
        resetToOldToken();
        throw err;
      } // Replace all valid login tokens with new ones (changing
      // password should invalidate existing sessions).


      Accounts._clearAllLoginTokens(user._id);

      return {
        userId: user._id
      };
    });
  }
}); ///
/// EMAIL VERIFICATION
///
// send the user an email with a link that when opened marks that
// address as verified
/**
 * @summary Send an email with a link the user can use verify their email address.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */

Accounts.sendVerificationEmail = function (userId, email, extraTokenData) {
  // XXX Also generate a link using which someone can delete this
  // account if they own said address but weren't those who created
  // this account.
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateVerificationToken(userId, email, extraTokenData);
  const url = Accounts.urls.verifyEmail(token);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'verifyEmail');
  Email.send(options);
  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendVerificationEmail, mark the email as verified,
// and log them in.


Meteor.methods({
  verifyEmail: function (token) {
    var self = this;
    return Accounts._loginMethod(self, "verifyEmail", arguments, "password", function () {
      check(token, String);
      var user = Meteor.users.findOne({
        'services.email.verificationTokens.token': token
      });
      if (!user) throw new Meteor.Error(403, "Verify email link expired");

      var tokenRecord = _.find(user.services.email.verificationTokens, function (t) {
        return t.token == token;
      });

      if (!tokenRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link expired")
      };

      var emailsRecord = _.find(user.emails, function (e) {
        return e.address == tokenRecord.address;
      });

      if (!emailsRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link is for unknown address")
      }; // By including the address in the query, we can use 'emails.$' in the
      // modifier to get a reference to the specific object in the emails
      // array. See
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull

      Meteor.users.update({
        _id: user._id,
        'emails.address': tokenRecord.address
      }, {
        $set: {
          'emails.$.verified': true
        },
        $pull: {
          'services.email.verificationTokens': {
            address: tokenRecord.address
          }
        }
      });
      return {
        userId: user._id
      };
    });
  }
}); /**
     * @summary Add an email address for a user. Use this instead of directly
     * updating the database. The operation will fail if there is a different user
     * with an email only differing in case. If the specified user has an existing
     * email only differing in case however, we replace it.
     * @locus Server
     * @param {String} userId The ID of the user to update.
     * @param {String} newEmail A new email address for the user.
     * @param {Boolean} [verified] Optional - whether the new email address should
     * be marked as verified. Defaults to false.
     * @importFromPackage accounts-base
     */

Accounts.addEmail = function (userId, newEmail, verified) {
  check(userId, NonEmptyString);
  check(newEmail, NonEmptyString);
  check(verified, Match.Optional(Boolean));

  if (_.isUndefined(verified)) {
    verified = false;
  }

  var user = Meteor.users.findOne(userId);
  if (!user) throw new Meteor.Error(403, "User not found"); // Allow users to change their own email to a version with a different case
  // We don't have to call checkForCaseInsensitiveDuplicates to do a case
  // insensitive check across all emails in the database here because: (1) if
  // there is no case-insensitive duplicate between this user and other users,
  // then we are OK and (2) if this would create a conflict with other users
  // then there would already be a case-insensitive duplicate and we can't fix
  // that in this code anyway.

  var caseInsensitiveRegExp = new RegExp('^' + Meteor._escapeRegExp(newEmail) + '$', 'i');

  var didUpdateOwnEmail = _.any(user.emails, function (email, index) {
    if (caseInsensitiveRegExp.test(email.address)) {
      Meteor.users.update({
        _id: user._id,
        'emails.address': email.address
      }, {
        $set: {
          'emails.$.address': newEmail,
          'emails.$.verified': verified
        }
      });
      return true;
    }

    return false;
  }); // In the other updates below, we have to do another call to
  // checkForCaseInsensitiveDuplicates to make sure that no conflicting values
  // were added to the database in the meantime. We don't have to do this for
  // the case where the user is updating their email address to one that is the
  // same as before, but only different because of capitalization. Read the
  // big comment above to understand why.


  if (didUpdateOwnEmail) {
    return;
  } // Perform a case insensitive check for duplicates before update


  checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $addToSet: {
      emails: {
        address: newEmail,
        verified: verified
      }
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $pull: {
        emails: {
          address: newEmail
        }
      }
    });
    throw ex;
  }
}; /**
    * @summary Remove an email address for a user. Use this instead of updating
    * the database directly.
    * @locus Server
    * @param {String} userId The ID of the user to update.
    * @param {String} email The email address to remove.
    * @importFromPackage accounts-base
    */

Accounts.removeEmail = function (userId, email) {
  check(userId, NonEmptyString);
  check(email, NonEmptyString);
  var user = Meteor.users.findOne(userId);
  if (!user) throw new Meteor.Error(403, "User not found");
  Meteor.users.update({
    _id: user._id
  }, {
    $pull: {
      emails: {
        address: email
      }
    }
  });
}; ///
/// CREATING USERS
///
// Shared createUser function called from the createUser method, both
// if originates in client or server code. Calls user provided hooks,
// does the actual user insertion.
//
// returns the user id


var createUser = function (options) {
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary
  // options.
  check(options, Match.ObjectIncluding({
    username: Match.Optional(String),
    email: Match.Optional(String),
    password: Match.Optional(passwordValidator)
  }));
  var username = options.username;
  var email = options.email;
  if (!username && !email) throw new Meteor.Error(400, "Need to set a username or email");
  var user = {
    services: {}
  };

  if (options.password) {
    var hashed = hashPassword(options.password);
    user.services.password = {
      bcrypt: hashed
    };
  }

  if (username) user.username = username;
  if (email) user.emails = [{
    address: email,
    verified: false
  }]; // Perform a case insensitive check before insert

  checkForCaseInsensitiveDuplicates('username', 'Username', username);
  checkForCaseInsensitiveDuplicates('emails.address', 'Email', email);
  var userId = Accounts.insertUserDoc(options, user); // Perform another check after insert, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', username, userId);
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', email, userId);
  } catch (ex) {
    // Remove inserted user if the check fails
    Meteor.users.remove(userId);
    throw ex;
  }

  return userId;
}; // method for create user. Requests come from the client.


Meteor.methods({
  createUser: function (options) {
    var self = this;
    return Accounts._loginMethod(self, "createUser", arguments, "password", function () {
      // createUser() above does more checking.
      check(options, Object);
      if (Accounts._options.forbidClientAccountCreation) return {
        error: new Meteor.Error(403, "Signups forbidden")
      }; // Create user. result contains id and token.

      var userId = createUser(options); // safety belt. createUser is supposed to throw on error. send 500 error
      // instead of sending a verification email with empty userid.

      if (!userId) throw new Error("createUser failed to insert new user"); // If `Accounts._options.sendVerificationEmail` is set, register
      // a token to verify the user's primary email, and send it to
      // that address.

      if (options.email && Accounts._options.sendVerificationEmail) Accounts.sendVerificationEmail(userId, options.email); // client gets logged in as the new user afterwards.

      return {
        userId: userId
      };
    });
  }
}); // Create user directly on the server.
//
// Unlike the client version, this does not log you in as this user
// after creation.
//
// returns userId or throws an error if it can't create
//
// XXX add another argument ("server options") that gets sent to onCreateUser,
// which is always empty when called from the createUser method? eg, "admin:
// true", which we want to prevent the client from setting, but which a custom
// method calling Accounts.createUser could set?
//

Accounts.createUser = function (options, callback) {
  options = _.clone(options); // XXX allow an optional callback?

  if (callback) {
    throw new Error("Accounts.createUser with callback not supported on the server yet.");
  }

  return createUser(options);
}; ///
/// PASSWORD-SPECIFIC INDEXES ON USERS
///


Meteor.users._ensureIndex('services.email.verificationTokens.token', {
  unique: 1,
  sparse: 1
});

Meteor.users._ensureIndex('services.password.reset.token', {
  unique: 1,
  sparse: 1
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/accounts-password/email_templates.js");
require("./node_modules/meteor/accounts-password/password_server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-password'] = {};

})();

//# sourceURL=meteor://💻app/packages/accounts-password.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtcGFzc3dvcmQvZW1haWxfdGVtcGxhdGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9hY2NvdW50cy1wYXNzd29yZC9wYXNzd29yZF9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiZ3JlZXQiLCJ3ZWxjb21lTXNnIiwidXNlciIsInVybCIsImdyZWV0aW5nIiwicHJvZmlsZSIsIm5hbWUiLCJBY2NvdW50cyIsImVtYWlsVGVtcGxhdGVzIiwiZnJvbSIsInNpdGVOYW1lIiwiTWV0ZW9yIiwiYWJzb2x1dGVVcmwiLCJyZXBsYWNlIiwicmVzZXRQYXNzd29yZCIsInN1YmplY3QiLCJ0ZXh0IiwidmVyaWZ5RW1haWwiLCJlbnJvbGxBY2NvdW50IiwiYmNyeXB0IiwiTnBtTW9kdWxlQmNyeXB0IiwiYmNyeXB0SGFzaCIsIndyYXBBc3luYyIsImhhc2giLCJiY3J5cHRDb21wYXJlIiwiY29tcGFyZSIsIl9iY3J5cHRSb3VuZHMiLCJnZXRQYXNzd29yZFN0cmluZyIsInBhc3N3b3JkIiwiU0hBMjU2IiwiYWxnb3JpdGhtIiwiRXJyb3IiLCJkaWdlc3QiLCJoYXNoUGFzc3dvcmQiLCJfY2hlY2tQYXNzd29yZCIsInJlc3VsdCIsInVzZXJJZCIsIl9pZCIsInNlcnZpY2VzIiwiZXJyb3IiLCJoYW5kbGVFcnJvciIsImNoZWNrUGFzc3dvcmQiLCJtc2ciLCJ0aHJvd0Vycm9yIiwiX29wdGlvbnMiLCJhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIiwiX2ZpbmRVc2VyQnlRdWVyeSIsInF1ZXJ5IiwiaWQiLCJ1c2VycyIsImZpbmRPbmUiLCJmaWVsZE5hbWUiLCJmaWVsZFZhbHVlIiwidXNlcm5hbWUiLCJlbWFpbCIsInNlbGVjdG9yIiwic2VsZWN0b3JGb3JGYXN0Q2FzZUluc2Vuc2l0aXZlTG9va3VwIiwiY2FuZGlkYXRlVXNlcnMiLCJmaW5kIiwiZmV0Y2giLCJsZW5ndGgiLCJmaW5kVXNlckJ5VXNlcm5hbWUiLCJmaW5kVXNlckJ5RW1haWwiLCJzdHJpbmciLCJwcmVmaXgiLCJzdWJzdHJpbmciLCJNYXRoIiwibWluIiwib3JDbGF1c2UiLCJfIiwibWFwIiwiZ2VuZXJhdGVDYXNlUGVybXV0YXRpb25zRm9yU3RyaW5nIiwicHJlZml4UGVybXV0YXRpb24iLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwiY2FzZUluc2Vuc2l0aXZlQ2xhdXNlIiwiJGFuZCIsIiRvciIsInBlcm11dGF0aW9ucyIsImkiLCJjaCIsImNoYXJBdCIsImZsYXR0ZW4iLCJsb3dlckNhc2VDaGFyIiwidG9Mb3dlckNhc2UiLCJ1cHBlckNhc2VDaGFyIiwidG9VcHBlckNhc2UiLCJjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMiLCJkaXNwbGF5TmFtZSIsIm93blVzZXJJZCIsInNraXBDaGVjayIsImhhcyIsIl9za2lwQ2FzZUluc2Vuc2l0aXZlQ2hlY2tzRm9yVGVzdCIsIm1hdGNoZWRVc2VycyIsIk5vbkVtcHR5U3RyaW5nIiwiTWF0Y2giLCJXaGVyZSIsIngiLCJjaGVjayIsIlN0cmluZyIsInVzZXJRdWVyeVZhbGlkYXRvciIsIk9wdGlvbmFsIiwia2V5cyIsInBhc3N3b3JkVmFsaWRhdG9yIiwiT25lT2YiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsIm9wdGlvbnMiLCJzcnAiLCJ1bmRlZmluZWQiLCJ2ZXJpZmllciIsIm5ld1ZlcmlmaWVyIiwiU1JQIiwiZ2VuZXJhdGVWZXJpZmllciIsImlkZW50aXR5Iiwic2FsdCIsIkVKU09OIiwic3RyaW5naWZ5IiwiZm9ybWF0IiwidjEiLCJ2MiIsImhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQiLCJzYWx0ZWQiLCJ1cGRhdGUiLCIkdW5zZXQiLCIkc2V0Iiwic2V0VXNlcm5hbWUiLCJuZXdVc2VybmFtZSIsIm9sZFVzZXJuYW1lIiwiZXgiLCJtZXRob2RzIiwiY2hhbmdlUGFzc3dvcmQiLCJvbGRQYXNzd29yZCIsIm5ld1Bhc3N3b3JkIiwiaGFzaGVkIiwiY3VycmVudFRva2VuIiwiX2dldExvZ2luVG9rZW4iLCJjb25uZWN0aW9uIiwiJHB1bGwiLCJoYXNoZWRUb2tlbiIsIiRuZSIsInBhc3N3b3JkQ2hhbmdlZCIsInNldFBhc3N3b3JkIiwibmV3UGxhaW50ZXh0UGFzc3dvcmQiLCJleHRlbmQiLCJsb2dvdXQiLCJmb3Jnb3RQYXNzd29yZCIsImVtYWlscyIsInBsdWNrIiwiY2FzZVNlbnNpdGl2ZUVtYWlsIiwic2VuZFJlc2V0UGFzc3dvcmRFbWFpbCIsImdlbmVyYXRlUmVzZXRUb2tlbiIsInJlYXNvbiIsImV4dHJhVG9rZW5EYXRhIiwiYWRkcmVzcyIsImNvbnRhaW5zIiwidG9rZW4iLCJSYW5kb20iLCJzZWNyZXQiLCJ0b2tlblJlY29yZCIsIndoZW4iLCJEYXRlIiwiX2Vuc3VyZSIsInJlc2V0IiwiZ2VuZXJhdGVWZXJpZmljYXRpb25Ub2tlbiIsImVtYWlsUmVjb3JkIiwiZSIsInZlcmlmaWVkIiwiJHB1c2giLCJ2ZXJpZmljYXRpb25Ub2tlbnMiLCJwdXNoIiwiZ2VuZXJhdGVPcHRpb25zRm9yRW1haWwiLCJ0byIsImh0bWwiLCJoZWFkZXJzIiwicmVhbEVtYWlsIiwidXJscyIsIkVtYWlsIiwic2VuZCIsInNlbmRFbnJvbGxtZW50RW1haWwiLCJzZWxmIiwiX2xvZ2luTWV0aG9kIiwiYXJndW1lbnRzIiwidG9rZW5MaWZldGltZU1zIiwiX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMiLCJfZ2V0UGFzc3dvcmRFbnJvbGxUb2tlbkxpZmV0aW1lTXMiLCJjdXJyZW50VGltZU1zIiwibm93IiwiaW5jbHVkZSIsIm9sZFRva2VuIiwiX3NldExvZ2luVG9rZW4iLCJyZXNldFRvT2xkVG9rZW4iLCJhZmZlY3RlZFJlY29yZHMiLCJlcnIiLCJfY2xlYXJBbGxMb2dpblRva2VucyIsInNlbmRWZXJpZmljYXRpb25FbWFpbCIsInQiLCJlbWFpbHNSZWNvcmQiLCJhZGRFbWFpbCIsIm5ld0VtYWlsIiwiQm9vbGVhbiIsImlzVW5kZWZpbmVkIiwiY2FzZUluc2Vuc2l0aXZlUmVnRXhwIiwiZGlkVXBkYXRlT3duRW1haWwiLCJhbnkiLCJpbmRleCIsInRlc3QiLCIkYWRkVG9TZXQiLCJyZW1vdmVFbWFpbCIsImNyZWF0ZVVzZXIiLCJPYmplY3RJbmNsdWRpbmciLCJpbnNlcnRVc2VyRG9jIiwicmVtb3ZlIiwiT2JqZWN0IiwiZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uIiwiY2FsbGJhY2siLCJjbG9uZSIsIl9lbnN1cmVJbmRleCIsInVuaXF1ZSIsInNwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTQSxLQUFULENBQWVDLFVBQWYsRUFBMkI7QUFDekIsU0FBTyxVQUFTQyxJQUFULEVBQWVDLEdBQWYsRUFBb0I7QUFDdkIsUUFBSUMsV0FBWUYsS0FBS0csT0FBTCxJQUFnQkgsS0FBS0csT0FBTCxDQUFhQyxJQUE5QixHQUNSLFdBQVdKLEtBQUtHLE9BQUwsQ0FBYUMsSUFBeEIsR0FBK0IsR0FEdkIsR0FDOEIsUUFEN0M7QUFFQSxXQUFRLEdBQUVGLFFBQVM7O0VBRXZCSCxVQUFXOztFQUVYRSxHQUFJOzs7Q0FKQTtBQVFILEdBWEQ7QUFZRCxDLENBRUQ7Ozs7OztBQUtBSSxTQUFTQyxjQUFULEdBQTBCO0FBQ3hCQyxRQUFNLHlDQURrQjtBQUV4QkMsWUFBVUMsT0FBT0MsV0FBUCxHQUFxQkMsT0FBckIsQ0FBNkIsY0FBN0IsRUFBNkMsRUFBN0MsRUFBaURBLE9BQWpELENBQXlELEtBQXpELEVBQWdFLEVBQWhFLENBRmM7QUFJeEJDLGlCQUFlO0FBQ2JDLGFBQVMsVUFBU2IsSUFBVCxFQUFlO0FBQ3RCLGFBQU8sbUNBQW1DSyxTQUFTQyxjQUFULENBQXdCRSxRQUFsRTtBQUNELEtBSFk7QUFJYk0sVUFBTWhCLE1BQU0sd0JBQU47QUFKTyxHQUpTO0FBVXhCaUIsZUFBYTtBQUNYRixhQUFTLFVBQVNiLElBQVQsRUFBZTtBQUN0QixhQUFPLG9DQUFvQ0ssU0FBU0MsY0FBVCxDQUF3QkUsUUFBbkU7QUFD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LEUiLCJmaWxlIjoiL3BhY2thZ2VzL2FjY291bnRzLXBhc3N3b3JkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gZ3JlZXQod2VsY29tZU1zZykge1xuICByZXR1cm4gZnVuY3Rpb24odXNlciwgdXJsKSB7XG4gICAgICB2YXIgZ3JlZXRpbmcgPSAodXNlci5wcm9maWxlICYmIHVzZXIucHJvZmlsZS5uYW1lKSA/XG4gICAgICAgICAgICAoXCJIZWxsbyBcIiArIHVzZXIucHJvZmlsZS5uYW1lICsgXCIsXCIpIDogXCJIZWxsbyxcIjtcbiAgICAgIHJldHVybiBgJHtncmVldGluZ31cblxuJHt3ZWxjb21lTXNnfSwgc2ltcGx5IGNsaWNrIHRoZSBsaW5rIGJlbG93LlxuXG4ke3VybH1cblxuVGhhbmtzLlxuYDtcbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25zIHRvIGN1c3RvbWl6ZSBlbWFpbHMgc2VudCBmcm9tIHRoZSBBY2NvdW50cyBzeXN0ZW0uXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5lbWFpbFRlbXBsYXRlcyA9IHtcbiAgZnJvbTogXCJBY2NvdW50cyBFeGFtcGxlIDxuby1yZXBseUBleGFtcGxlLmNvbT5cIixcbiAgc2l0ZU5hbWU6IE1ldGVvci5hYnNvbHV0ZVVybCgpLnJlcGxhY2UoL15odHRwcz86XFwvXFwvLywgJycpLnJlcGxhY2UoL1xcLyQvLCAnJyksXG5cbiAgcmVzZXRQYXNzd29yZDoge1xuICAgIHN1YmplY3Q6IGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgIHJldHVybiBcIkhvdyB0byByZXNldCB5b3VyIHBhc3N3b3JkIG9uIFwiICsgQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuc2l0ZU5hbWU7XG4gICAgfSxcbiAgICB0ZXh0OiBncmVldChcIlRvIHJlc2V0IHlvdXIgcGFzc3dvcmRcIilcbiAgfSxcbiAgdmVyaWZ5RW1haWw6IHtcbiAgICBzdWJqZWN0OiBmdW5jdGlvbih1c2VyKSB7XG4gICAgICByZXR1cm4gXCJIb3cgdG8gdmVyaWZ5IGVtYWlsIGFkZHJlc3Mgb24gXCIgKyBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5zaXRlTmFtZTtcbiAgICB9LFxuICAgIHRleHQ6IGdyZWV0KFwiVG8gdmVyaWZ5IHlvdXIgYWNjb3VudCBlbWFpbFwiKVxuICB9LFxuICBlbnJvbGxBY2NvdW50OiB7XG4gICAgc3ViamVjdDogZnVuY3Rpb24odXNlcikge1xuICAgICAgcmV0dXJuIFwiQW4gYWNjb3VudCBoYXMgYmVlbiBjcmVhdGVkIGZvciB5b3Ugb24gXCIgKyBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5zaXRlTmFtZTtcbiAgICB9LFxuICAgIHRleHQ6IGdyZWV0KFwiVG8gc3RhcnQgdXNpbmcgdGhlIHNlcnZpY2VcIilcbiAgfVxufTtcbiIsIi8vLyBCQ1JZUFRcblxudmFyIGJjcnlwdCA9IE5wbU1vZHVsZUJjcnlwdDtcbnZhciBiY3J5cHRIYXNoID0gTWV0ZW9yLndyYXBBc3luYyhiY3J5cHQuaGFzaCk7XG52YXIgYmNyeXB0Q29tcGFyZSA9IE1ldGVvci53cmFwQXN5bmMoYmNyeXB0LmNvbXBhcmUpO1xuXG4vLyBVc2VyIHJlY29yZHMgaGF2ZSBhICdzZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQnIGZpZWxkIG9uIHRoZW0gdG8gaG9sZFxuLy8gdGhlaXIgaGFzaGVkIHBhc3N3b3JkcyAodW5sZXNzIHRoZXkgaGF2ZSBhICdzZXJ2aWNlcy5wYXNzd29yZC5zcnAnXG4vLyBmaWVsZCwgaW4gd2hpY2ggY2FzZSB0aGV5IHdpbGwgYmUgdXBncmFkZWQgdG8gYmNyeXB0IHRoZSBuZXh0IHRpbWVcbi8vIHRoZXkgbG9nIGluKS5cbi8vXG4vLyBXaGVuIHRoZSBjbGllbnQgc2VuZHMgYSBwYXNzd29yZCB0byB0aGUgc2VydmVyLCBpdCBjYW4gZWl0aGVyIGJlIGFcbi8vIHN0cmluZyAodGhlIHBsYWludGV4dCBwYXNzd29yZCkgb3IgYW4gb2JqZWN0IHdpdGgga2V5cyAnZGlnZXN0JyBhbmRcbi8vICdhbGdvcml0aG0nIChtdXN0IGJlIFwic2hhLTI1NlwiIGZvciBub3cpLiBUaGUgTWV0ZW9yIGNsaWVudCBhbHdheXMgc2VuZHNcbi8vIHBhc3N3b3JkIG9iamVjdHMgeyBkaWdlc3Q6ICosIGFsZ29yaXRobTogXCJzaGEtMjU2XCIgfSwgYnV0IEREUCBjbGllbnRzXG4vLyB0aGF0IGRvbid0IGhhdmUgYWNjZXNzIHRvIFNIQSBjYW4ganVzdCBzZW5kIHBsYWludGV4dCBwYXNzd29yZHMgYXNcbi8vIHN0cmluZ3MuXG4vL1xuLy8gV2hlbiB0aGUgc2VydmVyIHJlY2VpdmVzIGEgcGxhaW50ZXh0IHBhc3N3b3JkIGFzIGEgc3RyaW5nLCBpdCBhbHdheXNcbi8vIGhhc2hlcyBpdCB3aXRoIFNIQTI1NiBiZWZvcmUgcGFzc2luZyBpdCBpbnRvIGJjcnlwdC4gV2hlbiB0aGUgc2VydmVyXG4vLyByZWNlaXZlcyBhIHBhc3N3b3JkIGFzIGFuIG9iamVjdCwgaXQgYXNzZXJ0cyB0aGF0IHRoZSBhbGdvcml0aG0gaXNcbi8vIFwic2hhLTI1NlwiIGFuZCB0aGVuIHBhc3NlcyB0aGUgZGlnZXN0IHRvIGJjcnlwdC5cblxuXG5BY2NvdW50cy5fYmNyeXB0Um91bmRzID0gMTA7XG5cbi8vIEdpdmVuIGEgJ3Bhc3N3b3JkJyBmcm9tIHRoZSBjbGllbnQsIGV4dHJhY3QgdGhlIHN0cmluZyB0aGF0IHdlIHNob3VsZFxuLy8gYmNyeXB0LiAncGFzc3dvcmQnIGNhbiBiZSBvbmUgb2Y6XG4vLyAgLSBTdHJpbmcgKHRoZSBwbGFpbnRleHQgcGFzc3dvcmQpXG4vLyAgLSBPYmplY3Qgd2l0aCAnZGlnZXN0JyBhbmQgJ2FsZ29yaXRobScga2V5cy4gJ2FsZ29yaXRobScgbXVzdCBiZSBcInNoYS0yNTZcIi5cbi8vXG52YXIgZ2V0UGFzc3dvcmRTdHJpbmcgPSBmdW5jdGlvbiAocGFzc3dvcmQpIHtcbiAgaWYgKHR5cGVvZiBwYXNzd29yZCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHBhc3N3b3JkID0gU0hBMjU2KHBhc3N3b3JkKTtcbiAgfSBlbHNlIHsgLy8gJ3Bhc3N3b3JkJyBpcyBhbiBvYmplY3RcbiAgICBpZiAocGFzc3dvcmQuYWxnb3JpdGhtICE9PSBcInNoYS0yNTZcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwYXNzd29yZCBoYXNoIGFsZ29yaXRobS4gXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiT25seSAnc2hhLTI1NicgaXMgYWxsb3dlZC5cIik7XG4gICAgfVxuICAgIHBhc3N3b3JkID0gcGFzc3dvcmQuZGlnZXN0O1xuICB9XG4gIHJldHVybiBwYXNzd29yZDtcbn07XG5cbi8vIFVzZSBiY3J5cHQgdG8gaGFzaCB0aGUgcGFzc3dvcmQgZm9yIHN0b3JhZ2UgaW4gdGhlIGRhdGFiYXNlLlxuLy8gYHBhc3N3b3JkYCBjYW4gYmUgYSBzdHJpbmcgKGluIHdoaWNoIGNhc2UgaXQgd2lsbCBiZSBydW4gdGhyb3VnaFxuLy8gU0hBMjU2IGJlZm9yZSBiY3J5cHQpIG9yIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgYGRpZ2VzdGAgYW5kXG4vLyBgYWxnb3JpdGhtYCAoaW4gd2hpY2ggY2FzZSB3ZSBiY3J5cHQgYHBhc3N3b3JkLmRpZ2VzdGApLlxuLy9cbnZhciBoYXNoUGFzc3dvcmQgPSBmdW5jdGlvbiAocGFzc3dvcmQpIHtcbiAgcGFzc3dvcmQgPSBnZXRQYXNzd29yZFN0cmluZyhwYXNzd29yZCk7XG4gIHJldHVybiBiY3J5cHRIYXNoKHBhc3N3b3JkLCBBY2NvdW50cy5fYmNyeXB0Um91bmRzKTtcbn07XG5cbi8vIENoZWNrIHdoZXRoZXIgdGhlIHByb3ZpZGVkIHBhc3N3b3JkIG1hdGNoZXMgdGhlIGJjcnlwdCdlZCBwYXNzd29yZCBpblxuLy8gdGhlIGRhdGFiYXNlIHVzZXIgcmVjb3JkLiBgcGFzc3dvcmRgIGNhbiBiZSBhIHN0cmluZyAoaW4gd2hpY2ggY2FzZVxuLy8gaXQgd2lsbCBiZSBydW4gdGhyb3VnaCBTSEEyNTYgYmVmb3JlIGJjcnlwdCkgb3IgYW4gb2JqZWN0IHdpdGhcbi8vIHByb3BlcnRpZXMgYGRpZ2VzdGAgYW5kIGBhbGdvcml0aG1gIChpbiB3aGljaCBjYXNlIHdlIGJjcnlwdFxuLy8gYHBhc3N3b3JkLmRpZ2VzdGApLlxuLy9cbkFjY291bnRzLl9jaGVja1Bhc3N3b3JkID0gZnVuY3Rpb24gKHVzZXIsIHBhc3N3b3JkKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgdXNlcklkOiB1c2VyLl9pZFxuICB9O1xuXG4gIHBhc3N3b3JkID0gZ2V0UGFzc3dvcmRTdHJpbmcocGFzc3dvcmQpO1xuXG4gIGlmICghIGJjcnlwdENvbXBhcmUocGFzc3dvcmQsIHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0KSkge1xuICAgIHJlc3VsdC5lcnJvciA9IGhhbmRsZUVycm9yKFwiSW5jb3JyZWN0IHBhc3N3b3JkXCIsIGZhbHNlKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xudmFyIGNoZWNrUGFzc3dvcmQgPSBBY2NvdW50cy5fY2hlY2tQYXNzd29yZDtcblxuLy8vXG4vLy8gRVJST1IgSEFORExFUlxuLy8vXG5jb25zdCBoYW5kbGVFcnJvciA9IChtc2csIHRocm93RXJyb3IgPSB0cnVlKSA9PiB7XG4gIGNvbnN0IGVycm9yID0gbmV3IE1ldGVvci5FcnJvcihcbiAgICA0MDMsIFxuICAgIEFjY291bnRzLl9vcHRpb25zLmFtYmlndW91c0Vycm9yTWVzc2FnZXNcbiAgICAgID8gXCJTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIGNoZWNrIHlvdXIgY3JlZGVudGlhbHMuXCJcbiAgICAgIDogbXNnXG4gICk7XG4gIGlmICh0aHJvd0Vycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufTtcblxuLy8vXG4vLy8gTE9HSU5cbi8vL1xuXG5BY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5ID0gZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gIHZhciB1c2VyID0gbnVsbDtcblxuICBpZiAocXVlcnkuaWQpIHtcbiAgICB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyBfaWQ6IHF1ZXJ5LmlkIH0pO1xuICB9IGVsc2Uge1xuICAgIHZhciBmaWVsZE5hbWU7XG4gICAgdmFyIGZpZWxkVmFsdWU7XG4gICAgaWYgKHF1ZXJ5LnVzZXJuYW1lKSB7XG4gICAgICBmaWVsZE5hbWUgPSAndXNlcm5hbWUnO1xuICAgICAgZmllbGRWYWx1ZSA9IHF1ZXJ5LnVzZXJuYW1lO1xuICAgIH0gZWxzZSBpZiAocXVlcnkuZW1haWwpIHtcbiAgICAgIGZpZWxkTmFtZSA9ICdlbWFpbHMuYWRkcmVzcyc7XG4gICAgICBmaWVsZFZhbHVlID0gcXVlcnkuZW1haWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInNob3VsZG4ndCBoYXBwZW4gKHZhbGlkYXRpb24gbWlzc2VkIHNvbWV0aGluZylcIik7XG4gICAgfVxuICAgIHZhciBzZWxlY3RvciA9IHt9O1xuICAgIHNlbGVjdG9yW2ZpZWxkTmFtZV0gPSBmaWVsZFZhbHVlO1xuICAgIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZShzZWxlY3Rvcik7XG4gICAgLy8gSWYgdXNlciBpcyBub3QgZm91bmQsIHRyeSBhIGNhc2UgaW5zZW5zaXRpdmUgbG9va3VwXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBzZWxlY3RvciA9IHNlbGVjdG9yRm9yRmFzdENhc2VJbnNlbnNpdGl2ZUxvb2t1cChmaWVsZE5hbWUsIGZpZWxkVmFsdWUpO1xuICAgICAgdmFyIGNhbmRpZGF0ZVVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoc2VsZWN0b3IpLmZldGNoKCk7XG4gICAgICAvLyBObyBtYXRjaCBpZiBtdWx0aXBsZSBjYW5kaWRhdGVzIGFyZSBmb3VuZFxuICAgICAgaWYgKGNhbmRpZGF0ZVVzZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB1c2VyID0gY2FuZGlkYXRlVXNlcnNbMF07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVzZXI7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IEZpbmRzIHRoZSB1c2VyIHdpdGggdGhlIHNwZWNpZmllZCB1c2VybmFtZS5cbiAqIEZpcnN0IHRyaWVzIHRvIG1hdGNoIHVzZXJuYW1lIGNhc2Ugc2Vuc2l0aXZlbHk7IGlmIHRoYXQgZmFpbHMsIGl0XG4gKiB0cmllcyBjYXNlIGluc2Vuc2l0aXZlbHk7IGJ1dCBpZiBtb3JlIHRoYW4gb25lIHVzZXIgbWF0Y2hlcyB0aGUgY2FzZVxuICogaW5zZW5zaXRpdmUgc2VhcmNoLCBpdCByZXR1cm5zIG51bGwuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcm5hbWUgVGhlIHVzZXJuYW1lIHRvIGxvb2sgZm9yXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBIHVzZXIgaWYgZm91bmQsIGVsc2UgbnVsbFxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuZmluZFVzZXJCeVVzZXJuYW1lID0gZnVuY3Rpb24gKHVzZXJuYW1lKSB7XG4gIHJldHVybiBBY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5KHtcbiAgICB1c2VybmFtZTogdXNlcm5hbWVcbiAgfSk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IEZpbmRzIHRoZSB1c2VyIHdpdGggdGhlIHNwZWNpZmllZCBlbWFpbC5cbiAqIEZpcnN0IHRyaWVzIHRvIG1hdGNoIGVtYWlsIGNhc2Ugc2Vuc2l0aXZlbHk7IGlmIHRoYXQgZmFpbHMsIGl0XG4gKiB0cmllcyBjYXNlIGluc2Vuc2l0aXZlbHk7IGJ1dCBpZiBtb3JlIHRoYW4gb25lIHVzZXIgbWF0Y2hlcyB0aGUgY2FzZVxuICogaW5zZW5zaXRpdmUgc2VhcmNoLCBpdCByZXR1cm5zIG51bGwuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gZW1haWwgVGhlIGVtYWlsIGFkZHJlc3MgdG8gbG9vayBmb3JcbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgdXNlciBpZiBmb3VuZCwgZWxzZSBudWxsXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5maW5kVXNlckJ5RW1haWwgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgcmV0dXJuIEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkoe1xuICAgIGVtYWlsOiBlbWFpbFxuICB9KTtcbn07XG5cbi8vIEdlbmVyYXRlcyBhIE1vbmdvREIgc2VsZWN0b3IgdGhhdCBjYW4gYmUgdXNlZCB0byBwZXJmb3JtIGEgZmFzdCBjYXNlXG4vLyBpbnNlbnNpdGl2ZSBsb29rdXAgZm9yIHRoZSBnaXZlbiBmaWVsZE5hbWUgYW5kIHN0cmluZy4gU2luY2UgTW9uZ29EQiBkb2VzXG4vLyBub3Qgc3VwcG9ydCBjYXNlIGluc2Vuc2l0aXZlIGluZGV4ZXMsIGFuZCBjYXNlIGluc2Vuc2l0aXZlIHJlZ2V4IHF1ZXJpZXNcbi8vIGFyZSBzbG93LCB3ZSBjb25zdHJ1Y3QgYSBzZXQgb2YgcHJlZml4IHNlbGVjdG9ycyBmb3IgYWxsIHBlcm11dGF0aW9ucyBvZlxuLy8gdGhlIGZpcnN0IDQgY2hhcmFjdGVycyBvdXJzZWx2ZXMuIFdlIGZpcnN0IGF0dGVtcHQgdG8gbWF0Y2hpbmcgYWdhaW5zdFxuLy8gdGhlc2UsIGFuZCBiZWNhdXNlICdwcmVmaXggZXhwcmVzc2lvbicgcmVnZXggcXVlcmllcyBkbyB1c2UgaW5kZXhlcyAoc2VlXG4vLyBodHRwOi8vZG9jcy5tb25nb2RiLm9yZy92Mi42L3JlZmVyZW5jZS9vcGVyYXRvci9xdWVyeS9yZWdleC8jaW5kZXgtdXNlKSxcbi8vIHRoaXMgaGFzIGJlZW4gZm91bmQgdG8gZ3JlYXRseSBpbXByb3ZlIHBlcmZvcm1hbmNlIChmcm9tIDEyMDBtcyB0byA1bXMgaW4gYVxuLy8gdGVzdCB3aXRoIDEuMDAwLjAwMCB1c2VycykuXG52YXIgc2VsZWN0b3JGb3JGYXN0Q2FzZUluc2Vuc2l0aXZlTG9va3VwID0gZnVuY3Rpb24gKGZpZWxkTmFtZSwgc3RyaW5nKSB7XG4gIC8vIFBlcmZvcm1hbmNlIHNlZW1zIHRvIGltcHJvdmUgdXAgdG8gNCBwcmVmaXggY2hhcmFjdGVyc1xuICB2YXIgcHJlZml4ID0gc3RyaW5nLnN1YnN0cmluZygwLCBNYXRoLm1pbihzdHJpbmcubGVuZ3RoLCA0KSk7XG4gIHZhciBvckNsYXVzZSA9IF8ubWFwKGdlbmVyYXRlQ2FzZVBlcm11dGF0aW9uc0ZvclN0cmluZyhwcmVmaXgpLFxuICAgIGZ1bmN0aW9uIChwcmVmaXhQZXJtdXRhdGlvbikge1xuICAgICAgdmFyIHNlbGVjdG9yID0ge307XG4gICAgICBzZWxlY3RvcltmaWVsZE5hbWVdID1cbiAgICAgICAgbmV3IFJlZ0V4cCgnXicgKyBNZXRlb3IuX2VzY2FwZVJlZ0V4cChwcmVmaXhQZXJtdXRhdGlvbikpO1xuICAgICAgcmV0dXJuIHNlbGVjdG9yO1xuICAgIH0pO1xuICB2YXIgY2FzZUluc2Vuc2l0aXZlQ2xhdXNlID0ge307XG4gIGNhc2VJbnNlbnNpdGl2ZUNsYXVzZVtmaWVsZE5hbWVdID1cbiAgICBuZXcgUmVnRXhwKCdeJyArIE1ldGVvci5fZXNjYXBlUmVnRXhwKHN0cmluZykgKyAnJCcsICdpJylcbiAgcmV0dXJuIHskYW5kOiBbeyRvcjogb3JDbGF1c2V9LCBjYXNlSW5zZW5zaXRpdmVDbGF1c2VdfTtcbn1cblxuLy8gR2VuZXJhdGVzIHBlcm11dGF0aW9ucyBvZiBhbGwgY2FzZSB2YXJpYXRpb25zIG9mIGEgZ2l2ZW4gc3RyaW5nLlxudmFyIGdlbmVyYXRlQ2FzZVBlcm11dGF0aW9uc0ZvclN0cmluZyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgdmFyIHBlcm11dGF0aW9ucyA9IFsnJ107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoID0gc3RyaW5nLmNoYXJBdChpKTtcbiAgICBwZXJtdXRhdGlvbnMgPSBfLmZsYXR0ZW4oXy5tYXAocGVybXV0YXRpb25zLCBmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgICB2YXIgbG93ZXJDYXNlQ2hhciA9IGNoLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgdXBwZXJDYXNlQ2hhciA9IGNoLnRvVXBwZXJDYXNlKCk7XG4gICAgICAvLyBEb24ndCBhZGQgdW5uZWNjZXNhcnkgcGVybXV0YXRpb25zIHdoZW4gY2ggaXMgbm90IGEgbGV0dGVyXG4gICAgICBpZiAobG93ZXJDYXNlQ2hhciA9PT0gdXBwZXJDYXNlQ2hhcikge1xuICAgICAgICByZXR1cm4gW3ByZWZpeCArIGNoXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbcHJlZml4ICsgbG93ZXJDYXNlQ2hhciwgcHJlZml4ICsgdXBwZXJDYXNlQ2hhcl07XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiBwZXJtdXRhdGlvbnM7XG59XG5cbnZhciBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMgPSBmdW5jdGlvbiAoZmllbGROYW1lLCBkaXNwbGF5TmFtZSwgZmllbGRWYWx1ZSwgb3duVXNlcklkKSB7XG4gIC8vIFNvbWUgdGVzdHMgbmVlZCB0aGUgYWJpbGl0eSB0byBhZGQgdXNlcnMgd2l0aCB0aGUgc2FtZSBjYXNlIGluc2Vuc2l0aXZlXG4gIC8vIHZhbHVlLCBoZW5jZSB0aGUgX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0IGNoZWNrXG4gIHZhciBza2lwQ2hlY2sgPSBfLmhhcyhBY2NvdW50cy5fc2tpcENhc2VJbnNlbnNpdGl2ZUNoZWNrc0ZvclRlc3QsIGZpZWxkVmFsdWUpO1xuXG4gIGlmIChmaWVsZFZhbHVlICYmICFza2lwQ2hlY2spIHtcbiAgICB2YXIgbWF0Y2hlZFVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoXG4gICAgICBzZWxlY3RvckZvckZhc3RDYXNlSW5zZW5zaXRpdmVMb29rdXAoZmllbGROYW1lLCBmaWVsZFZhbHVlKSkuZmV0Y2goKTtcblxuICAgIGlmIChtYXRjaGVkVXNlcnMubGVuZ3RoID4gMCAmJlxuICAgICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIGEgdXNlcklkIHlldCwgYW55IG1hdGNoIHdlIGZpbmQgaXMgYSBkdXBsaWNhdGVcbiAgICAgICAgKCFvd25Vc2VySWQgfHxcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBjaGVjayB0byBzZWUgaWYgdGhlcmUgYXJlIG11bHRpcGxlIG1hdGNoZXMgb3IgYSBtYXRjaFxuICAgICAgICAvLyB0aGF0IGlzIG5vdCB1c1xuICAgICAgICAobWF0Y2hlZFVzZXJzLmxlbmd0aCA+IDEgfHwgbWF0Y2hlZFVzZXJzWzBdLl9pZCAhPT0gb3duVXNlcklkKSkpIHtcbiAgICAgIGhhbmRsZUVycm9yKGRpc3BsYXlOYW1lICsgXCIgYWxyZWFkeSBleGlzdHMuXCIpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gWFhYIG1heWJlIHRoaXMgYmVsb25ncyBpbiB0aGUgY2hlY2sgcGFja2FnZVxudmFyIE5vbkVtcHR5U3RyaW5nID0gTWF0Y2guV2hlcmUoZnVuY3Rpb24gKHgpIHtcbiAgY2hlY2soeCwgU3RyaW5nKTtcbiAgcmV0dXJuIHgubGVuZ3RoID4gMDtcbn0pO1xuXG52YXIgdXNlclF1ZXJ5VmFsaWRhdG9yID0gTWF0Y2guV2hlcmUoZnVuY3Rpb24gKHVzZXIpIHtcbiAgY2hlY2sodXNlciwge1xuICAgIGlkOiBNYXRjaC5PcHRpb25hbChOb25FbXB0eVN0cmluZyksXG4gICAgdXNlcm5hbWU6IE1hdGNoLk9wdGlvbmFsKE5vbkVtcHR5U3RyaW5nKSxcbiAgICBlbWFpbDogTWF0Y2guT3B0aW9uYWwoTm9uRW1wdHlTdHJpbmcpXG4gIH0pO1xuICBpZiAoXy5rZXlzKHVzZXIpLmxlbmd0aCAhPT0gMSlcbiAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJVc2VyIHByb3BlcnR5IG11c3QgaGF2ZSBleGFjdGx5IG9uZSBmaWVsZFwiKTtcbiAgcmV0dXJuIHRydWU7XG59KTtcblxudmFyIHBhc3N3b3JkVmFsaWRhdG9yID0gTWF0Y2guT25lT2YoXG4gIFN0cmluZyxcbiAgeyBkaWdlc3Q6IFN0cmluZywgYWxnb3JpdGhtOiBTdHJpbmcgfVxuKTtcblxuLy8gSGFuZGxlciB0byBsb2dpbiB3aXRoIGEgcGFzc3dvcmQuXG4vL1xuLy8gVGhlIE1ldGVvciBjbGllbnQgc2V0cyBvcHRpb25zLnBhc3N3b3JkIHRvIGFuIG9iamVjdCB3aXRoIGtleXNcbi8vICdkaWdlc3QnIChzZXQgdG8gU0hBMjU2KHBhc3N3b3JkKSkgYW5kICdhbGdvcml0aG0nIChcInNoYS0yNTZcIikuXG4vL1xuLy8gRm9yIG90aGVyIEREUCBjbGllbnRzIHdoaWNoIGRvbid0IGhhdmUgYWNjZXNzIHRvIFNIQSwgdGhlIGhhbmRsZXJcbi8vIGFsc28gYWNjZXB0cyB0aGUgcGxhaW50ZXh0IHBhc3N3b3JkIGluIG9wdGlvbnMucGFzc3dvcmQgYXMgYSBzdHJpbmcuXG4vL1xuLy8gKEl0IG1pZ2h0IGJlIG5pY2UgaWYgc2VydmVycyBjb3VsZCB0dXJuIHRoZSBwbGFpbnRleHQgcGFzc3dvcmRcbi8vIG9wdGlvbiBvZmYuIE9yIG1heWJlIGl0IHNob3VsZCBiZSBvcHQtaW4sIG5vdCBvcHQtb3V0P1xuLy8gQWNjb3VudHMuY29uZmlnIG9wdGlvbj8pXG4vL1xuLy8gTm90ZSB0aGF0IG5laXRoZXIgcGFzc3dvcmQgb3B0aW9uIGlzIHNlY3VyZSB3aXRob3V0IFNTTC5cbi8vXG5BY2NvdW50cy5yZWdpc3RlckxvZ2luSGFuZGxlcihcInBhc3N3b3JkXCIsIGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmICghIG9wdGlvbnMucGFzc3dvcmQgfHwgb3B0aW9ucy5zcnApXG4gICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gZG9uJ3QgaGFuZGxlXG5cbiAgY2hlY2sob3B0aW9ucywge1xuICAgIHVzZXI6IHVzZXJRdWVyeVZhbGlkYXRvcixcbiAgICBwYXNzd29yZDogcGFzc3dvcmRWYWxpZGF0b3JcbiAgfSk7XG5cblxuICB2YXIgdXNlciA9IEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkob3B0aW9ucy51c2VyKTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIGlmICghdXNlci5zZXJ2aWNlcyB8fCAhdXNlci5zZXJ2aWNlcy5wYXNzd29yZCB8fFxuICAgICAgISh1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCB8fCB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgaGFzIG5vIHBhc3N3b3JkIHNldFwiKTtcbiAgfVxuXG4gIGlmICghdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIC8vIFRoZSBjbGllbnQgaGFzIHByZXNlbnRlZCBhIHBsYWludGV4dCBwYXNzd29yZCwgYW5kIHRoZSB1c2VyIGlzXG4gICAgICAvLyBub3QgdXBncmFkZWQgdG8gYmNyeXB0IHlldC4gV2UgZG9uJ3QgYXR0ZW1wdCB0byB0ZWxsIHRoZSBjbGllbnRcbiAgICAgIC8vIHRvIHVwZ3JhZGUgdG8gYmNyeXB0LCBiZWNhdXNlIGl0IG1pZ2h0IGJlIGEgc3RhbmRhbG9uZSBERFBcbiAgICAgIC8vIGNsaWVudCBkb2Vzbid0IGtub3cgaG93IHRvIGRvIHN1Y2ggYSB0aGluZy5cbiAgICAgIHZhciB2ZXJpZmllciA9IHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwO1xuICAgICAgdmFyIG5ld1ZlcmlmaWVyID0gU1JQLmdlbmVyYXRlVmVyaWZpZXIob3B0aW9ucy5wYXNzd29yZCwge1xuICAgICAgICBpZGVudGl0eTogdmVyaWZpZXIuaWRlbnRpdHksIHNhbHQ6IHZlcmlmaWVyLnNhbHR9KTtcblxuICAgICAgaWYgKHZlcmlmaWVyLnZlcmlmaWVyICE9PSBuZXdWZXJpZmllci52ZXJpZmllcikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogQWNjb3VudHMuX29wdGlvbnMuYW1iaWd1b3VzRXJyb3JNZXNzYWdlcyA/IG51bGwgOiB1c2VyLl9pZCxcbiAgICAgICAgICBlcnJvcjogaGFuZGxlRXJyb3IoXCJJbmNvcnJlY3QgcGFzc3dvcmRcIiwgZmFsc2UpXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRlbGwgdGhlIGNsaWVudCB0byB1c2UgdGhlIFNSUCB1cGdyYWRlIHByb2Nlc3MuXG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJvbGQgcGFzc3dvcmQgZm9ybWF0XCIsIEVKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGZvcm1hdDogJ3NycCcsXG4gICAgICAgIGlkZW50aXR5OiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC5pZGVudGl0eVxuICAgICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjaGVja1Bhc3N3b3JkKFxuICAgIHVzZXIsXG4gICAgb3B0aW9ucy5wYXNzd29yZFxuICApO1xufSk7XG5cbi8vIEhhbmRsZXIgdG8gbG9naW4gdXNpbmcgdGhlIFNSUCB1cGdyYWRlIHBhdGguIFRvIHVzZSB0aGlzIGxvZ2luXG4vLyBoYW5kbGVyLCB0aGUgY2xpZW50IG11c3QgcHJvdmlkZTpcbi8vICAgLSBzcnA6IEgoaWRlbnRpdHkgKyBcIjpcIiArIHBhc3N3b3JkKVxuLy8gICAtIHBhc3N3b3JkOiBhIHN0cmluZyBvciBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzICdkaWdlc3QnIGFuZCAnYWxnb3JpdGhtJ1xuLy9cbi8vIFdlIHVzZSBgb3B0aW9ucy5zcnBgIHRvIHZlcmlmeSB0aGF0IHRoZSBjbGllbnQga25vd3MgdGhlIGNvcnJlY3Rcbi8vIHBhc3N3b3JkIHdpdGhvdXQgZG9pbmcgYSBmdWxsIFNSUCBmbG93LiBPbmNlIHdlJ3ZlIGNoZWNrZWQgdGhhdCwgd2Vcbi8vIHVwZ3JhZGUgdGhlIHVzZXIgdG8gYmNyeXB0IGFuZCByZW1vdmUgdGhlIFNSUCBpbmZvcm1hdGlvbiBmcm9tIHRoZVxuLy8gdXNlciBkb2N1bWVudC5cbi8vXG4vLyBUaGUgY2xpZW50IGVuZHMgdXAgdXNpbmcgdGhpcyBsb2dpbiBoYW5kbGVyIGFmdGVyIHRyeWluZyB0aGUgbm9ybWFsXG4vLyBsb2dpbiBoYW5kbGVyIChhYm92ZSksIHdoaWNoIHRocm93cyBhbiBlcnJvciB0ZWxsaW5nIHRoZSBjbGllbnQgdG9cbi8vIHRyeSB0aGUgU1JQIHVwZ3JhZGUgcGF0aC5cbi8vXG4vLyBYWFggQ09NUEFUIFdJVEggMC44LjEuM1xuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoXCJwYXNzd29yZFwiLCBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMuc3JwIHx8ICFvcHRpb25zLnBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gZG9uJ3QgaGFuZGxlXG4gIH1cblxuICBjaGVjayhvcHRpb25zLCB7XG4gICAgdXNlcjogdXNlclF1ZXJ5VmFsaWRhdG9yLFxuICAgIHNycDogU3RyaW5nLFxuICAgIHBhc3N3b3JkOiBwYXNzd29yZFZhbGlkYXRvclxuICB9KTtcblxuICB2YXIgdXNlciA9IEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkob3B0aW9ucy51c2VyKTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIC8vIENoZWNrIHRvIHNlZSBpZiBhbm90aGVyIHNpbXVsdGFuZW91cyBsb2dpbiBoYXMgYWxyZWFkeSB1cGdyYWRlZFxuICAvLyB0aGUgdXNlciByZWNvcmQgdG8gYmNyeXB0LlxuICBpZiAodXNlci5zZXJ2aWNlcyAmJiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkICYmIHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0KSB7XG4gICAgcmV0dXJuIGNoZWNrUGFzc3dvcmQodXNlciwgb3B0aW9ucy5wYXNzd29yZCk7XG4gIH1cblxuICBpZiAoISh1c2VyLnNlcnZpY2VzICYmIHVzZXIuc2VydmljZXMucGFzc3dvcmQgJiYgdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5zcnApKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIGhhcyBubyBwYXNzd29yZCBzZXRcIik7XG4gIH1cblxuICB2YXIgdjEgPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC52ZXJpZmllcjtcbiAgdmFyIHYyID0gU1JQLmdlbmVyYXRlVmVyaWZpZXIoXG4gICAgbnVsbCxcbiAgICB7XG4gICAgICBoYXNoZWRJZGVudGl0eUFuZFBhc3N3b3JkOiBvcHRpb25zLnNycCxcbiAgICAgIHNhbHQ6IHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwLnNhbHRcbiAgICB9XG4gICkudmVyaWZpZXI7XG4gIGlmICh2MSAhPT0gdjIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXNlcklkOiBBY2NvdW50cy5fb3B0aW9ucy5hbWJpZ3VvdXNFcnJvck1lc3NhZ2VzID8gbnVsbCA6IHVzZXIuX2lkLFxuICAgICAgZXJyb3I6IGhhbmRsZUVycm9yKFwiSW5jb3JyZWN0IHBhc3N3b3JkXCIsIGZhbHNlKVxuICAgIH07XG4gIH1cblxuICAvLyBVcGdyYWRlIHRvIGJjcnlwdCBvbiBzdWNjZXNzZnVsIGxvZ2luLlxuICB2YXIgc2FsdGVkID0gaGFzaFBhc3N3b3JkKG9wdGlvbnMucGFzc3dvcmQpO1xuICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgIHVzZXIuX2lkLFxuICAgIHtcbiAgICAgICR1bnNldDogeyAnc2VydmljZXMucGFzc3dvcmQuc3JwJzogMSB9LFxuICAgICAgJHNldDogeyAnc2VydmljZXMucGFzc3dvcmQuYmNyeXB0Jzogc2FsdGVkIH1cbiAgICB9XG4gICk7XG5cbiAgcmV0dXJuIHt1c2VySWQ6IHVzZXIuX2lkfTtcbn0pO1xuXG5cbi8vL1xuLy8vIENIQU5HSU5HXG4vLy9cblxuLyoqXG4gKiBAc3VtbWFyeSBDaGFuZ2UgYSB1c2VyJ3MgdXNlcm5hbWUuIFVzZSB0aGlzIGluc3RlYWQgb2YgdXBkYXRpbmcgdGhlXG4gKiBkYXRhYmFzZSBkaXJlY3RseS4gVGhlIG9wZXJhdGlvbiB3aWxsIGZhaWwgaWYgdGhlcmUgaXMgYW4gZXhpc3RpbmcgdXNlclxuICogd2l0aCBhIHVzZXJuYW1lIG9ubHkgZGlmZmVyaW5nIGluIGNhc2UuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBJRCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3VXNlcm5hbWUgQSBuZXcgdXNlcm5hbWUgZm9yIHRoZSB1c2VyLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2V0VXNlcm5hbWUgPSBmdW5jdGlvbiAodXNlcklkLCBuZXdVc2VybmFtZSkge1xuICBjaGVjayh1c2VySWQsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2sobmV3VXNlcm5hbWUsIE5vbkVtcHR5U3RyaW5nKTtcblxuICB2YXIgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICB2YXIgb2xkVXNlcm5hbWUgPSB1c2VyLnVzZXJuYW1lO1xuXG4gIC8vIFBlcmZvcm0gYSBjYXNlIGluc2Vuc2l0aXZlIGNoZWNrIGZvciBkdXBsaWNhdGVzIGJlZm9yZSB1cGRhdGVcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIG5ld1VzZXJuYW1lLCB1c2VyLl9pZCk7XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHskc2V0OiB7dXNlcm5hbWU6IG5ld1VzZXJuYW1lfX0pO1xuXG4gIC8vIFBlcmZvcm0gYW5vdGhlciBjaGVjayBhZnRlciB1cGRhdGUsIGluIGNhc2UgYSBtYXRjaGluZyB1c2VyIGhhcyBiZWVuXG4gIC8vIGluc2VydGVkIGluIHRoZSBtZWFudGltZVxuICB0cnkge1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygndXNlcm5hbWUnLCAnVXNlcm5hbWUnLCBuZXdVc2VybmFtZSwgdXNlci5faWQpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIFVuZG8gdXBkYXRlIGlmIHRoZSBjaGVjayBmYWlsc1xuICAgIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LCB7JHNldDoge3VzZXJuYW1lOiBvbGRVc2VybmFtZX19KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufTtcblxuLy8gTGV0IHRoZSB1c2VyIGNoYW5nZSB0aGVpciBvd24gcGFzc3dvcmQgaWYgdGhleSBrbm93IHRoZSBvbGRcbi8vIHBhc3N3b3JkLiBgb2xkUGFzc3dvcmRgIGFuZCBgbmV3UGFzc3dvcmRgIHNob3VsZCBiZSBvYmplY3RzIHdpdGgga2V5c1xuLy8gYGRpZ2VzdGAgYW5kIGBhbGdvcml0aG1gIChyZXByZXNlbnRpbmcgdGhlIFNIQTI1NiBvZiB0aGUgcGFzc3dvcmQpLlxuLy9cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjguMS4zXG4vLyBMaWtlIHRoZSBsb2dpbiBtZXRob2QsIGlmIHRoZSB1c2VyIGhhc24ndCBiZWVuIHVwZ3JhZGVkIGZyb20gU1JQIHRvXG4vLyBiY3J5cHQgeWV0LCB0aGVuIHRoaXMgbWV0aG9kIHdpbGwgdGhyb3cgYW4gJ29sZCBwYXNzd29yZCBmb3JtYXQnXG4vLyBlcnJvci4gVGhlIGNsaWVudCBzaG91bGQgY2FsbCB0aGUgU1JQIHVwZ3JhZGUgbG9naW4gaGFuZGxlciBhbmQgdGhlblxuLy8gcmV0cnkgdGhpcyBtZXRob2QgYWdhaW4uXG4vL1xuLy8gVU5MSUtFIHRoZSBsb2dpbiBtZXRob2QsIHRoZXJlIGlzIG5vIHdheSB0byBhdm9pZCBnZXR0aW5nIFNSUCB1cGdyYWRlXG4vLyBlcnJvcnMgdGhyb3duLiBUaGUgcmVhc29uaW5nIGZvciB0aGlzIGlzIHRoYXQgY2xpZW50cyB1c2luZyB0aGlzXG4vLyBtZXRob2QgZGlyZWN0bHkgd2lsbCBuZWVkIHRvIGJlIHVwZGF0ZWQgYW55d2F5IGJlY2F1c2Ugd2Ugbm8gbG9uZ2VyXG4vLyBzdXBwb3J0IHRoZSBTUlAgZmxvdyB0aGF0IHRoZXkgd291bGQgaGF2ZSBiZWVuIGRvaW5nIHRvIHVzZSB0aGlzXG4vLyBtZXRob2QgcHJldmlvdXNseS5cbk1ldGVvci5tZXRob2RzKHtjaGFuZ2VQYXNzd29yZDogZnVuY3Rpb24gKG9sZFBhc3N3b3JkLCBuZXdQYXNzd29yZCkge1xuICBjaGVjayhvbGRQYXNzd29yZCwgcGFzc3dvcmRWYWxpZGF0b3IpO1xuICBjaGVjayhuZXdQYXNzd29yZCwgcGFzc3dvcmRWYWxpZGF0b3IpO1xuXG4gIGlmICghdGhpcy51c2VySWQpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgXCJNdXN0IGJlIGxvZ2dlZCBpblwiKTtcbiAgfVxuXG4gIHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodGhpcy51c2VySWQpO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgbm90IGZvdW5kXCIpO1xuICB9XG5cbiAgaWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkIHx8XG4gICAgICAoIXVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0ICYmICF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgaGFzIG5vIHBhc3N3b3JkIHNldFwiKTtcbiAgfVxuXG4gIGlmICghIHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0KSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwib2xkIHBhc3N3b3JkIGZvcm1hdFwiLCBFSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZm9ybWF0OiAnc3JwJyxcbiAgICAgIGlkZW50aXR5OiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC5pZGVudGl0eVxuICAgIH0pKTtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBjaGVja1Bhc3N3b3JkKHVzZXIsIG9sZFBhc3N3b3JkKTtcbiAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgIHRocm93IHJlc3VsdC5lcnJvcjtcbiAgfVxuXG4gIHZhciBoYXNoZWQgPSBoYXNoUGFzc3dvcmQobmV3UGFzc3dvcmQpO1xuXG4gIC8vIEl0IHdvdWxkIGJlIGJldHRlciBpZiB0aGlzIHJlbW92ZWQgQUxMIGV4aXN0aW5nIHRva2VucyBhbmQgcmVwbGFjZWRcbiAgLy8gdGhlIHRva2VuIGZvciB0aGUgY3VycmVudCBjb25uZWN0aW9uIHdpdGggYSBuZXcgb25lLCBidXQgdGhhdCB3b3VsZFxuICAvLyBiZSB0cmlja3ksIHNvIHdlJ2xsIHNldHRsZSBmb3IganVzdCByZXBsYWNpbmcgYWxsIHRva2VucyBvdGhlciB0aGFuXG4gIC8vIHRoZSBvbmUgZm9yIHRoZSBjdXJyZW50IGNvbm5lY3Rpb24uXG4gIHZhciBjdXJyZW50VG9rZW4gPSBBY2NvdW50cy5fZ2V0TG9naW5Ub2tlbih0aGlzLmNvbm5lY3Rpb24uaWQpO1xuICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgIHsgX2lkOiB0aGlzLnVzZXJJZCB9LFxuICAgIHtcbiAgICAgICRzZXQ6IHsgJ3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6IGhhc2hlZCB9LFxuICAgICAgJHB1bGw6IHtcbiAgICAgICAgJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucyc6IHsgaGFzaGVkVG9rZW46IHsgJG5lOiBjdXJyZW50VG9rZW4gfSB9XG4gICAgICB9LFxuICAgICAgJHVuc2V0OiB7ICdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldCc6IDEgfVxuICAgIH1cbiAgKTtcblxuICByZXR1cm4ge3Bhc3N3b3JkQ2hhbmdlZDogdHJ1ZX07XG59fSk7XG5cblxuLy8gRm9yY2UgY2hhbmdlIHRoZSB1c2VycyBwYXNzd29yZC5cblxuLyoqXG4gKiBAc3VtbWFyeSBGb3JjaWJseSBjaGFuZ2UgdGhlIHBhc3N3b3JkIGZvciBhIHVzZXIuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3UGFzc3dvcmQgQSBuZXcgcGFzc3dvcmQgZm9yIHRoZSB1c2VyLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMubG9nb3V0IExvZ291dCBhbGwgY3VycmVudCBjb25uZWN0aW9ucyB3aXRoIHRoaXMgdXNlcklkIChkZWZhdWx0OiB0cnVlKVxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodXNlcklkLCBuZXdQbGFpbnRleHRQYXNzd29yZCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gXy5leHRlbmQoe2xvZ291dDogdHJ1ZX0sIG9wdGlvbnMpO1xuXG4gIHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICB2YXIgdXBkYXRlID0ge1xuICAgICR1bnNldDoge1xuICAgICAgJ3NlcnZpY2VzLnBhc3N3b3JkLnNycCc6IDEsIC8vIFhYWCBDT01QQVQgV0lUSCAwLjguMS4zXG4gICAgICAnc2VydmljZXMucGFzc3dvcmQucmVzZXQnOiAxXG4gICAgfSxcbiAgICAkc2V0OiB7J3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6IGhhc2hQYXNzd29yZChuZXdQbGFpbnRleHRQYXNzd29yZCl9XG4gIH07XG5cbiAgaWYgKG9wdGlvbnMubG9nb3V0KSB7XG4gICAgdXBkYXRlLiR1bnNldFsnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJ10gPSAxO1xuICB9XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHVwZGF0ZSk7XG59O1xuXG5cbi8vL1xuLy8vIFJFU0VUVElORyBWSUEgRU1BSUxcbi8vL1xuXG4vLyBNZXRob2QgY2FsbGVkIGJ5IGEgdXNlciB0byByZXF1ZXN0IGEgcGFzc3dvcmQgcmVzZXQgZW1haWwuIFRoaXMgaXNcbi8vIHRoZSBzdGFydCBvZiB0aGUgcmVzZXQgcHJvY2Vzcy5cbk1ldGVvci5tZXRob2RzKHtmb3Jnb3RQYXNzd29yZDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgY2hlY2sob3B0aW9ucywge2VtYWlsOiBTdHJpbmd9KTtcblxuICB2YXIgdXNlciA9IEFjY291bnRzLmZpbmRVc2VyQnlFbWFpbChvcHRpb25zLmVtYWlsKTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIGNvbnN0IGVtYWlscyA9IF8ucGx1Y2sodXNlci5lbWFpbHMgfHwgW10sICdhZGRyZXNzJyk7XG4gIGNvbnN0IGNhc2VTZW5zaXRpdmVFbWFpbCA9IF8uZmluZChlbWFpbHMsIGVtYWlsID0+IHtcbiAgICByZXR1cm4gZW1haWwudG9Mb3dlckNhc2UoKSA9PT0gb3B0aW9ucy5lbWFpbC50b0xvd2VyQ2FzZSgpO1xuICB9KTtcblxuICBBY2NvdW50cy5zZW5kUmVzZXRQYXNzd29yZEVtYWlsKHVzZXIuX2lkLCBjYXNlU2Vuc2l0aXZlRW1haWwpO1xufX0pO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEdlbmVyYXRlcyBhIHJlc2V0IHRva2VuIGFuZCBzYXZlcyBpdCBpbnRvIHRoZSBkYXRhYmFzZS5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIGdlbmVyYXRlIHRoZSByZXNldCB0b2tlbiBmb3IuXG4gKiBAcGFyYW0ge1N0cmluZ30gZW1haWwgV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlciB0byBnZW5lcmF0ZSB0aGUgcmVzZXQgdG9rZW4gZm9yLiBUaGlzIGFkZHJlc3MgbXVzdCBiZSBpbiB0aGUgdXNlcidzIGBlbWFpbHNgIGxpc3QuIElmIGBudWxsYCwgZGVmYXVsdHMgdG8gdGhlIGZpcnN0IGVtYWlsIGluIHRoZSBsaXN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHJlYXNvbiBgcmVzZXRQYXNzd29yZGAgb3IgYGVucm9sbEFjY291bnRgLlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVRva2VuRGF0YV0gT3B0aW9uYWwgYWRkaXRpb25hbCBkYXRhIHRvIGJlIGFkZGVkIGludG8gdGhlIHRva2VuIHJlY29yZC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHtlbWFpbCwgdXNlciwgdG9rZW59IHZhbHVlcy5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLmdlbmVyYXRlUmVzZXRUb2tlbiA9IGZ1bmN0aW9uICh1c2VySWQsIGVtYWlsLCByZWFzb24sIGV4dHJhVG9rZW5EYXRhKSB7XG4gIC8vIE1ha2Ugc3VyZSB0aGUgdXNlciBleGlzdHMsIGFuZCBlbWFpbCBpcyBvbmUgb2YgdGhlaXIgYWRkcmVzc2VzLlxuICB2YXIgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiQ2FuJ3QgZmluZCB1c2VyXCIpO1xuICB9XG5cbiAgLy8gcGljayB0aGUgZmlyc3QgZW1haWwgaWYgd2Ugd2VyZW4ndCBwYXNzZWQgYW4gZW1haWwuXG4gIGlmICghZW1haWwgJiYgdXNlci5lbWFpbHMgJiYgdXNlci5lbWFpbHNbMF0pIHtcbiAgICBlbWFpbCA9IHVzZXIuZW1haWxzWzBdLmFkZHJlc3M7XG4gIH1cblxuICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhIHZhbGlkIGVtYWlsXG4gIGlmICghZW1haWwgfHwgIV8uY29udGFpbnMoXy5wbHVjayh1c2VyLmVtYWlscyB8fCBbXSwgJ2FkZHJlc3MnKSwgZW1haWwpKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJObyBzdWNoIGVtYWlsIGZvciB1c2VyLlwiKTtcbiAgfVxuXG4gIHZhciB0b2tlbiA9IFJhbmRvbS5zZWNyZXQoKTtcbiAgdmFyIHRva2VuUmVjb3JkID0ge1xuICAgIHRva2VuOiB0b2tlbixcbiAgICBlbWFpbDogZW1haWwsXG4gICAgd2hlbjogbmV3IERhdGUoKVxuICB9O1xuXG4gIGlmIChyZWFzb24gPT09ICdyZXNldFBhc3N3b3JkJykge1xuICAgIHRva2VuUmVjb3JkLnJlYXNvbiA9ICdyZXNldCc7XG4gIH0gZWxzZSBpZiAocmVhc29uID09PSAnZW5yb2xsQWNjb3VudCcpIHtcbiAgICB0b2tlblJlY29yZC5yZWFzb24gPSAnZW5yb2xsJztcbiAgfSBlbHNlIGlmIChyZWFzb24pIHtcbiAgICAvLyBmYWxsYmFjayBzbyB0aGF0IHRoaXMgZnVuY3Rpb24gY2FuIGJlIHVzZWQgZm9yIHVua25vd24gcmVhc29ucyBhcyB3ZWxsXG4gICAgdG9rZW5SZWNvcmQucmVhc29uID0gcmVhc29uO1xuICB9XG5cbiAgaWYgKGV4dHJhVG9rZW5EYXRhKSB7XG4gICAgXy5leHRlbmQodG9rZW5SZWNvcmQsIGV4dHJhVG9rZW5EYXRhKTtcbiAgfVxuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LCB7JHNldDoge1xuICAgICdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldCc6IHRva2VuUmVjb3JkXG4gIH19KTtcblxuICAvLyBiZWZvcmUgcGFzc2luZyB0byB0ZW1wbGF0ZSwgdXBkYXRlIHVzZXIgb2JqZWN0IHdpdGggbmV3IHRva2VuXG4gIE1ldGVvci5fZW5zdXJlKHVzZXIsICdzZXJ2aWNlcycsICdwYXNzd29yZCcpLnJlc2V0ID0gdG9rZW5SZWNvcmQ7XG5cbiAgcmV0dXJuIHtlbWFpbCwgdXNlciwgdG9rZW59O1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBHZW5lcmF0ZXMgYW4gZS1tYWlsIHZlcmlmaWNhdGlvbiB0b2tlbiBhbmQgc2F2ZXMgaXQgaW50byB0aGUgZGF0YWJhc2UuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBnZW5lcmF0ZSB0aGUgIGUtbWFpbCB2ZXJpZmljYXRpb24gdG9rZW4gZm9yLlxuICogQHBhcmFtIHtTdHJpbmd9IGVtYWlsIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIgdG8gZ2VuZXJhdGUgdGhlIGUtbWFpbCB2ZXJpZmljYXRpb24gdG9rZW4gZm9yLiBUaGlzIGFkZHJlc3MgbXVzdCBiZSBpbiB0aGUgdXNlcidzIGBlbWFpbHNgIGxpc3QuIElmIGBudWxsYCwgZGVmYXVsdHMgdG8gdGhlIGZpcnN0IHVudmVyaWZpZWQgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbn0gdmFsdWVzLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuZ2VuZXJhdGVWZXJpZmljYXRpb25Ub2tlbiA9IGZ1bmN0aW9uICh1c2VySWQsIGVtYWlsLCBleHRyYVRva2VuRGF0YSkge1xuICAvLyBNYWtlIHN1cmUgdGhlIHVzZXIgZXhpc3RzLCBhbmQgZW1haWwgaXMgb25lIG9mIHRoZWlyIGFkZHJlc3Nlcy5cbiAgdmFyIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIkNhbid0IGZpbmQgdXNlclwiKTtcbiAgfVxuXG4gIC8vIHBpY2sgdGhlIGZpcnN0IHVudmVyaWZpZWQgZW1haWwgaWYgd2Ugd2VyZW4ndCBwYXNzZWQgYW4gZW1haWwuXG4gIGlmICghZW1haWwpIHtcbiAgICB2YXIgZW1haWxSZWNvcmQgPSBfLmZpbmQodXNlci5lbWFpbHMgfHwgW10sIGZ1bmN0aW9uIChlKSB7IHJldHVybiAhZS52ZXJpZmllZDsgfSk7XG4gICAgZW1haWwgPSAoZW1haWxSZWNvcmQgfHwge30pLmFkZHJlc3M7XG5cbiAgICBpZiAoIWVtYWlsKSB7XG4gICAgICBoYW5kbGVFcnJvcihcIlRoYXQgdXNlciBoYXMgbm8gdW52ZXJpZmllZCBlbWFpbCBhZGRyZXNzZXMuXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGEgdmFsaWQgZW1haWxcbiAgaWYgKCFlbWFpbCB8fCAhXy5jb250YWlucyhfLnBsdWNrKHVzZXIuZW1haWxzIHx8IFtdLCAnYWRkcmVzcycpLCBlbWFpbCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIk5vIHN1Y2ggZW1haWwgZm9yIHVzZXIuXCIpO1xuICB9XG5cbiAgdmFyIHRva2VuID0gUmFuZG9tLnNlY3JldCgpO1xuICB2YXIgdG9rZW5SZWNvcmQgPSB7XG4gICAgdG9rZW46IHRva2VuLFxuICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIHByb2JhYmx5IGJlIHJlbmFtZWQgdG8gXCJlbWFpbFwiIHRvIG1hdGNoIHJlc2V0IHRva2VuIHJlY29yZC5cbiAgICBhZGRyZXNzOiBlbWFpbCxcbiAgICB3aGVuOiBuZXcgRGF0ZSgpXG4gIH07XG5cbiAgaWYgKGV4dHJhVG9rZW5EYXRhKSB7XG4gICAgXy5leHRlbmQodG9rZW5SZWNvcmQsIGV4dHJhVG9rZW5EYXRhKTtcbiAgfVxuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LCB7JHB1c2g6IHtcbiAgICAnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zJzogdG9rZW5SZWNvcmRcbiAgfX0pO1xuXG4gIC8vIGJlZm9yZSBwYXNzaW5nIHRvIHRlbXBsYXRlLCB1cGRhdGUgdXNlciBvYmplY3Qgd2l0aCBuZXcgdG9rZW5cbiAgTWV0ZW9yLl9lbnN1cmUodXNlciwgJ3NlcnZpY2VzJywgJ2VtYWlsJyk7XG4gIGlmICghdXNlci5zZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMpIHtcbiAgICB1c2VyLnNlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2VucyA9IFtdO1xuICB9XG4gIHVzZXIuc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLnB1c2godG9rZW5SZWNvcmQpO1xuXG4gIHJldHVybiB7ZW1haWwsIHVzZXIsIHRva2VufTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgQ3JlYXRlcyBvcHRpb25zIGZvciBlbWFpbCBzZW5kaW5nIGZvciByZXNldCBwYXNzd29yZCBhbmQgZW5yb2xsIGFjY291bnQgZW1haWxzLlxuICogWW91IGNhbiB1c2UgdGhpcyBmdW5jdGlvbiB3aGVuIGN1c3RvbWl6aW5nIGEgcmVzZXQgcGFzc3dvcmQgb3IgZW5yb2xsIGFjY291bnQgZW1haWwgc2VuZGluZy5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbWFpbCBXaGljaCBhZGRyZXNzIG9mIHRoZSB1c2VyJ3MgdG8gc2VuZCB0aGUgZW1haWwgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gdXNlciBUaGUgdXNlciBvYmplY3QgdG8gZ2VuZXJhdGUgb3B0aW9ucyBmb3IuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFVSTCB0byB3aGljaCB1c2VyIGlzIGRpcmVjdGVkIHRvIGNvbmZpcm0gdGhlIGVtYWlsLlxuICogQHBhcmFtIHtTdHJpbmd9IHJlYXNvbiBgcmVzZXRQYXNzd29yZGAgb3IgYGVucm9sbEFjY291bnRgLlxuICogQHJldHVybnMge09iamVjdH0gT3B0aW9ucyB3aGljaCBjYW4gYmUgcGFzc2VkIHRvIGBFbWFpbC5zZW5kYC5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsID0gZnVuY3Rpb24gKGVtYWlsLCB1c2VyLCB1cmwsIHJlYXNvbikge1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICB0bzogZW1haWwsXG4gICAgZnJvbTogQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS5mcm9tXG4gICAgICA/IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uZnJvbSh1c2VyKVxuICAgICAgOiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5mcm9tLFxuICAgIHN1YmplY3Q6IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uc3ViamVjdCh1c2VyKVxuICB9O1xuXG4gIGlmICh0eXBlb2YgQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS50ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb3B0aW9ucy50ZXh0ID0gQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS50ZXh0KHVzZXIsIHVybCk7XG4gIH1cblxuICBpZiAodHlwZW9mIEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uaHRtbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG9wdGlvbnMuaHRtbCA9IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uaHRtbCh1c2VyLCB1cmwpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5oZWFkZXJzID09PSAnb2JqZWN0Jykge1xuICAgIG9wdGlvbnMuaGVhZGVycyA9IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzLmhlYWRlcnM7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8vIHNlbmQgdGhlIHVzZXIgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhhdCB3aGVuIG9wZW5lZCBhbGxvd3MgdGhlIHVzZXJcbi8vIHRvIHNldCBhIG5ldyBwYXNzd29yZCwgd2l0aG91dCB0aGUgb2xkIHBhc3N3b3JkLlxuXG4vKipcbiAqIEBzdW1tYXJ5IFNlbmQgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhlIHVzZXIgY2FuIHVzZSB0byByZXNldCB0aGVpciBwYXNzd29yZC5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIHNlbmQgZW1haWwgdG8uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2VtYWlsXSBPcHRpb25hbC4gV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlcidzIHRvIHNlbmQgdGhlIGVtYWlsIHRvLiBUaGlzIGFkZHJlc3MgbXVzdCBiZSBpbiB0aGUgdXNlcidzIGBlbWFpbHNgIGxpc3QuIERlZmF1bHRzIHRvIHRoZSBmaXJzdCBlbWFpbCBpbiB0aGUgbGlzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFUb2tlbkRhdGFdIE9wdGlvbmFsIGFkZGl0aW9uYWwgZGF0YSB0byBiZSBhZGRlZCBpbnRvIHRoZSB0b2tlbiByZWNvcmQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB7ZW1haWwsIHVzZXIsIHRva2VuLCB1cmwsIG9wdGlvbnN9IHZhbHVlcy5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLnNlbmRSZXNldFBhc3N3b3JkRW1haWwgPSBmdW5jdGlvbiAodXNlcklkLCBlbWFpbCwgZXh0cmFUb2tlbkRhdGEpIHtcbiAgY29uc3Qge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VufSA9XG4gICAgQWNjb3VudHMuZ2VuZXJhdGVSZXNldFRva2VuKHVzZXJJZCwgZW1haWwsICdyZXNldFBhc3N3b3JkJywgZXh0cmFUb2tlbkRhdGEpO1xuICBjb25zdCB1cmwgPSBBY2NvdW50cy51cmxzLnJlc2V0UGFzc3dvcmQodG9rZW4pO1xuICBjb25zdCBvcHRpb25zID0gQWNjb3VudHMuZ2VuZXJhdGVPcHRpb25zRm9yRW1haWwocmVhbEVtYWlsLCB1c2VyLCB1cmwsICdyZXNldFBhc3N3b3JkJyk7XG4gIEVtYWlsLnNlbmQob3B0aW9ucyk7XG4gIHJldHVybiB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc307XG59O1xuXG4vLyBzZW5kIHRoZSB1c2VyIGFuIGVtYWlsIGluZm9ybWluZyB0aGVtIHRoYXQgdGhlaXIgYWNjb3VudCB3YXMgY3JlYXRlZCwgd2l0aFxuLy8gYSBsaW5rIHRoYXQgd2hlbiBvcGVuZWQgYm90aCBtYXJrcyB0aGVpciBlbWFpbCBhcyB2ZXJpZmllZCBhbmQgZm9yY2VzIHRoZW1cbi8vIHRvIGNob29zZSB0aGVpciBwYXNzd29yZC4gVGhlIGVtYWlsIG11c3QgYmUgb25lIG9mIHRoZSBhZGRyZXNzZXMgaW4gdGhlXG4vLyB1c2VyJ3MgZW1haWxzIGZpZWxkLCBvciB1bmRlZmluZWQgdG8gcGljayB0aGUgZmlyc3QgZW1haWwgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUaGlzIGlzIG5vdCBjYWxsZWQgYXV0b21hdGljYWxseS4gSXQgbXVzdCBiZSBjYWxsZWQgbWFudWFsbHkgaWYgeW91XG4vLyB3YW50IHRvIHVzZSBlbnJvbGxtZW50IGVtYWlscy5cblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoZSB1c2VyIGNhbiB1c2UgdG8gc2V0IHRoZWlyIGluaXRpYWwgcGFzc3dvcmQuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBzZW5kIGVtYWlsIHRvLlxuICogQHBhcmFtIHtTdHJpbmd9IFtlbWFpbF0gT3B0aW9uYWwuIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIncyB0byBzZW5kIHRoZSBlbWFpbCB0by4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBEZWZhdWx0cyB0byB0aGUgZmlyc3QgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZW5kRW5yb2xsbWVudEVtYWlsID0gZnVuY3Rpb24gKHVzZXJJZCwgZW1haWwsIGV4dHJhVG9rZW5EYXRhKSB7XG4gIGNvbnN0IHtlbWFpbDogcmVhbEVtYWlsLCB1c2VyLCB0b2tlbn0gPVxuICAgIEFjY291bnRzLmdlbmVyYXRlUmVzZXRUb2tlbih1c2VySWQsIGVtYWlsLCAnZW5yb2xsQWNjb3VudCcsIGV4dHJhVG9rZW5EYXRhKTtcbiAgY29uc3QgdXJsID0gQWNjb3VudHMudXJscy5lbnJvbGxBY2NvdW50KHRva2VuKTtcbiAgY29uc3Qgb3B0aW9ucyA9IEFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsKHJlYWxFbWFpbCwgdXNlciwgdXJsLCAnZW5yb2xsQWNjb3VudCcpO1xuICBFbWFpbC5zZW5kKG9wdGlvbnMpO1xuICByZXR1cm4ge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VuLCB1cmwsIG9wdGlvbnN9O1xufTtcblxuXG4vLyBUYWtlIHRva2VuIGZyb20gc2VuZFJlc2V0UGFzc3dvcmRFbWFpbCBvciBzZW5kRW5yb2xsbWVudEVtYWlsLCBjaGFuZ2Vcbi8vIHRoZSB1c2VycyBwYXNzd29yZCwgYW5kIGxvZyB0aGVtIGluLlxuTWV0ZW9yLm1ldGhvZHMoe3Jlc2V0UGFzc3dvcmQ6IGZ1bmN0aW9uICh0b2tlbiwgbmV3UGFzc3dvcmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gQWNjb3VudHMuX2xvZ2luTWV0aG9kKFxuICAgIHNlbGYsXG4gICAgXCJyZXNldFBhc3N3b3JkXCIsXG4gICAgYXJndW1lbnRzLFxuICAgIFwicGFzc3dvcmRcIixcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBjaGVjayh0b2tlbiwgU3RyaW5nKTtcbiAgICAgIGNoZWNrKG5ld1Bhc3N3b3JkLCBwYXNzd29yZFZhbGlkYXRvcik7XG5cbiAgICAgIHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoe1xuICAgICAgICBcInNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LnRva2VuXCI6IHRva2VufSk7XG4gICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVG9rZW4gZXhwaXJlZFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciB3aGVuID0gdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5yZXNldC53aGVuO1xuICAgICAgdmFyIHJlYXNvbiA9IHVzZXIuc2VydmljZXMucGFzc3dvcmQucmVzZXQucmVhc29uO1xuICAgICAgdmFyIHRva2VuTGlmZXRpbWVNcyA9IEFjY291bnRzLl9nZXRQYXNzd29yZFJlc2V0VG9rZW5MaWZldGltZU1zKCk7XG4gICAgICBpZiAocmVhc29uID09PSBcImVucm9sbFwiKSB7XG4gICAgICAgIHRva2VuTGlmZXRpbWVNcyA9IEFjY291bnRzLl9nZXRQYXNzd29yZEVucm9sbFRva2VuTGlmZXRpbWVNcygpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRUaW1lTXMgPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKChjdXJyZW50VGltZU1zIC0gd2hlbikgPiB0b2tlbkxpZmV0aW1lTXMpXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlRva2VuIGV4cGlyZWRcIik7XG4gICAgICB2YXIgZW1haWwgPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LmVtYWlsO1xuICAgICAgaWYgKCFfLmluY2x1ZGUoXy5wbHVjayh1c2VyLmVtYWlscyB8fCBbXSwgJ2FkZHJlc3MnKSwgZW1haWwpKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlRva2VuIGhhcyBpbnZhbGlkIGVtYWlsIGFkZHJlc3NcIilcbiAgICAgICAgfTtcblxuICAgICAgdmFyIGhhc2hlZCA9IGhhc2hQYXNzd29yZChuZXdQYXNzd29yZCk7XG5cbiAgICAgIC8vIE5PVEU6IFdlJ3JlIGFib3V0IHRvIGludmFsaWRhdGUgdG9rZW5zIG9uIHRoZSB1c2VyLCB3aG8gd2UgbWlnaHQgYmVcbiAgICAgIC8vIGxvZ2dlZCBpbiBhcy4gTWFrZSBzdXJlIHRvIGF2b2lkIGxvZ2dpbmcgb3Vyc2VsdmVzIG91dCBpZiB0aGlzXG4gICAgICAvLyBoYXBwZW5zLiBCdXQgYWxzbyBtYWtlIHN1cmUgbm90IHRvIGxlYXZlIHRoZSBjb25uZWN0aW9uIGluIGEgc3RhdGVcbiAgICAgIC8vIG9mIGhhdmluZyBhIGJhZCB0b2tlbiBzZXQgaWYgdGhpbmdzIGZhaWwuXG4gICAgICB2YXIgb2xkVG9rZW4gPSBBY2NvdW50cy5fZ2V0TG9naW5Ub2tlbihzZWxmLmNvbm5lY3Rpb24uaWQpO1xuICAgICAgQWNjb3VudHMuX3NldExvZ2luVG9rZW4odXNlci5faWQsIHNlbGYuY29ubmVjdGlvbiwgbnVsbCk7XG4gICAgICB2YXIgcmVzZXRUb09sZFRva2VuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBBY2NvdW50cy5fc2V0TG9naW5Ub2tlbih1c2VyLl9pZCwgc2VsZi5jb25uZWN0aW9uLCBvbGRUb2tlbik7XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHVzZXIgcmVjb3JkIGJ5OlxuICAgICAgICAvLyAtIENoYW5naW5nIHRoZSBwYXNzd29yZCB0byB0aGUgbmV3IG9uZVxuICAgICAgICAvLyAtIEZvcmdldHRpbmcgYWJvdXQgdGhlIHJlc2V0IHRva2VuIHRoYXQgd2FzIGp1c3QgdXNlZFxuICAgICAgICAvLyAtIFZlcmlmeWluZyB0aGVpciBlbWFpbCwgc2luY2UgdGhleSBnb3QgdGhlIHBhc3N3b3JkIHJlc2V0IHZpYSBlbWFpbC5cbiAgICAgICAgdmFyIGFmZmVjdGVkUmVjb3JkcyA9IE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgICAge1xuICAgICAgICAgICAgX2lkOiB1c2VyLl9pZCxcbiAgICAgICAgICAgICdlbWFpbHMuYWRkcmVzcyc6IGVtYWlsLFxuICAgICAgICAgICAgJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LnRva2VuJzogdG9rZW5cbiAgICAgICAgICB9LFxuICAgICAgICAgIHskc2V0OiB7J3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6IGhhc2hlZCxcbiAgICAgICAgICAgICAgICAgICdlbWFpbHMuJC52ZXJpZmllZCc6IHRydWV9LFxuICAgICAgICAgICAkdW5zZXQ6IHsnc2VydmljZXMucGFzc3dvcmQucmVzZXQnOiAxLFxuICAgICAgICAgICAgICAgICAgICAnc2VydmljZXMucGFzc3dvcmQuc3JwJzogMX19KTtcbiAgICAgICAgaWYgKGFmZmVjdGVkUmVjb3JkcyAhPT0gMSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJJbnZhbGlkIGVtYWlsXCIpXG4gICAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXNldFRvT2xkVG9rZW4oKTtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXBsYWNlIGFsbCB2YWxpZCBsb2dpbiB0b2tlbnMgd2l0aCBuZXcgb25lcyAoY2hhbmdpbmdcbiAgICAgIC8vIHBhc3N3b3JkIHNob3VsZCBpbnZhbGlkYXRlIGV4aXN0aW5nIHNlc3Npb25zKS5cbiAgICAgIEFjY291bnRzLl9jbGVhckFsbExvZ2luVG9rZW5zKHVzZXIuX2lkKTtcblxuICAgICAgcmV0dXJuIHt1c2VySWQ6IHVzZXIuX2lkfTtcbiAgICB9XG4gICk7XG59fSk7XG5cbi8vL1xuLy8vIEVNQUlMIFZFUklGSUNBVElPTlxuLy8vXG5cblxuLy8gc2VuZCB0aGUgdXNlciBhbiBlbWFpbCB3aXRoIGEgbGluayB0aGF0IHdoZW4gb3BlbmVkIG1hcmtzIHRoYXRcbi8vIGFkZHJlc3MgYXMgdmVyaWZpZWRcblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoZSB1c2VyIGNhbiB1c2UgdmVyaWZ5IHRoZWlyIGVtYWlsIGFkZHJlc3MuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBzZW5kIGVtYWlsIHRvLlxuICogQHBhcmFtIHtTdHJpbmd9IFtlbWFpbF0gT3B0aW9uYWwuIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIncyB0byBzZW5kIHRoZSBlbWFpbCB0by4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBEZWZhdWx0cyB0byB0aGUgZmlyc3QgdW52ZXJpZmllZCBlbWFpbCBpbiB0aGUgbGlzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFUb2tlbkRhdGFdIE9wdGlvbmFsIGFkZGl0aW9uYWwgZGF0YSB0byBiZSBhZGRlZCBpbnRvIHRoZSB0b2tlbiByZWNvcmQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB7ZW1haWwsIHVzZXIsIHRva2VuLCB1cmwsIG9wdGlvbnN9IHZhbHVlcy5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLnNlbmRWZXJpZmljYXRpb25FbWFpbCA9IGZ1bmN0aW9uICh1c2VySWQsIGVtYWlsLCBleHRyYVRva2VuRGF0YSkge1xuICAvLyBYWFggQWxzbyBnZW5lcmF0ZSBhIGxpbmsgdXNpbmcgd2hpY2ggc29tZW9uZSBjYW4gZGVsZXRlIHRoaXNcbiAgLy8gYWNjb3VudCBpZiB0aGV5IG93biBzYWlkIGFkZHJlc3MgYnV0IHdlcmVuJ3QgdGhvc2Ugd2hvIGNyZWF0ZWRcbiAgLy8gdGhpcyBhY2NvdW50LlxuXG4gIGNvbnN0IHtlbWFpbDogcmVhbEVtYWlsLCB1c2VyLCB0b2tlbn0gPVxuICAgIEFjY291bnRzLmdlbmVyYXRlVmVyaWZpY2F0aW9uVG9rZW4odXNlcklkLCBlbWFpbCwgZXh0cmFUb2tlbkRhdGEpO1xuICBjb25zdCB1cmwgPSBBY2NvdW50cy51cmxzLnZlcmlmeUVtYWlsKHRva2VuKTtcbiAgY29uc3Qgb3B0aW9ucyA9IEFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsKHJlYWxFbWFpbCwgdXNlciwgdXJsLCAndmVyaWZ5RW1haWwnKTtcbiAgRW1haWwuc2VuZChvcHRpb25zKTtcbiAgcmV0dXJuIHtlbWFpbDogcmVhbEVtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfTtcbn07XG5cbi8vIFRha2UgdG9rZW4gZnJvbSBzZW5kVmVyaWZpY2F0aW9uRW1haWwsIG1hcmsgdGhlIGVtYWlsIGFzIHZlcmlmaWVkLFxuLy8gYW5kIGxvZyB0aGVtIGluLlxuTWV0ZW9yLm1ldGhvZHMoe3ZlcmlmeUVtYWlsOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gQWNjb3VudHMuX2xvZ2luTWV0aG9kKFxuICAgIHNlbGYsXG4gICAgXCJ2ZXJpZnlFbWFpbFwiLFxuICAgIGFyZ3VtZW50cyxcbiAgICBcInBhc3N3b3JkXCIsXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgY2hlY2sodG9rZW4sIFN0cmluZyk7XG5cbiAgICAgIHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoXG4gICAgICAgIHsnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLnRva2VuJzogdG9rZW59KTtcbiAgICAgIGlmICghdXNlcilcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVmVyaWZ5IGVtYWlsIGxpbmsgZXhwaXJlZFwiKTtcblxuICAgICAgdmFyIHRva2VuUmVjb3JkID0gXy5maW5kKHVzZXIuc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdC50b2tlbiA9PSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgIGlmICghdG9rZW5SZWNvcmQpXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVmVyaWZ5IGVtYWlsIGxpbmsgZXhwaXJlZFwiKVxuICAgICAgICB9O1xuXG4gICAgICB2YXIgZW1haWxzUmVjb3JkID0gXy5maW5kKHVzZXIuZW1haWxzLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICByZXR1cm4gZS5hZGRyZXNzID09IHRva2VuUmVjb3JkLmFkZHJlc3M7XG4gICAgICB9KTtcbiAgICAgIGlmICghZW1haWxzUmVjb3JkKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlZlcmlmeSBlbWFpbCBsaW5rIGlzIGZvciB1bmtub3duIGFkZHJlc3NcIilcbiAgICAgICAgfTtcblxuICAgICAgLy8gQnkgaW5jbHVkaW5nIHRoZSBhZGRyZXNzIGluIHRoZSBxdWVyeSwgd2UgY2FuIHVzZSAnZW1haWxzLiQnIGluIHRoZVxuICAgICAgLy8gbW9kaWZpZXIgdG8gZ2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBzcGVjaWZpYyBvYmplY3QgaW4gdGhlIGVtYWlsc1xuICAgICAgLy8gYXJyYXkuIFNlZVxuICAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLVRoZSUyNHBvc2l0aW9uYWxvcGVyYXRvcilcbiAgICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nI1VwZGF0aW5nLSUyNHB1bGxcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgIHtfaWQ6IHVzZXIuX2lkLFxuICAgICAgICAgJ2VtYWlscy5hZGRyZXNzJzogdG9rZW5SZWNvcmQuYWRkcmVzc30sXG4gICAgICAgIHskc2V0OiB7J2VtYWlscy4kLnZlcmlmaWVkJzogdHJ1ZX0sXG4gICAgICAgICAkcHVsbDogeydzZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMnOiB7YWRkcmVzczogdG9rZW5SZWNvcmQuYWRkcmVzc319fSk7XG5cbiAgICAgIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG4gICAgfVxuICApO1xufX0pO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEFkZCBhbiBlbWFpbCBhZGRyZXNzIGZvciBhIHVzZXIuIFVzZSB0aGlzIGluc3RlYWQgb2YgZGlyZWN0bHlcbiAqIHVwZGF0aW5nIHRoZSBkYXRhYmFzZS4gVGhlIG9wZXJhdGlvbiB3aWxsIGZhaWwgaWYgdGhlcmUgaXMgYSBkaWZmZXJlbnQgdXNlclxuICogd2l0aCBhbiBlbWFpbCBvbmx5IGRpZmZlcmluZyBpbiBjYXNlLiBJZiB0aGUgc3BlY2lmaWVkIHVzZXIgaGFzIGFuIGV4aXN0aW5nXG4gKiBlbWFpbCBvbmx5IGRpZmZlcmluZyBpbiBjYXNlIGhvd2V2ZXIsIHdlIHJlcGxhY2UgaXQuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBJRCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3RW1haWwgQSBuZXcgZW1haWwgYWRkcmVzcyBmb3IgdGhlIHVzZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFt2ZXJpZmllZF0gT3B0aW9uYWwgLSB3aGV0aGVyIHRoZSBuZXcgZW1haWwgYWRkcmVzcyBzaG91bGRcbiAqIGJlIG1hcmtlZCBhcyB2ZXJpZmllZC4gRGVmYXVsdHMgdG8gZmFsc2UuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5hZGRFbWFpbCA9IGZ1bmN0aW9uICh1c2VySWQsIG5ld0VtYWlsLCB2ZXJpZmllZCkge1xuICBjaGVjayh1c2VySWQsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2sobmV3RW1haWwsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2sodmVyaWZpZWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICBpZiAoXy5pc1VuZGVmaW5lZCh2ZXJpZmllZCkpIHtcbiAgICB2ZXJpZmllZCA9IGZhbHNlO1xuICB9XG5cbiAgdmFyIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICBpZiAoIXVzZXIpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG5cbiAgLy8gQWxsb3cgdXNlcnMgdG8gY2hhbmdlIHRoZWlyIG93biBlbWFpbCB0byBhIHZlcnNpb24gd2l0aCBhIGRpZmZlcmVudCBjYXNlXG5cbiAgLy8gV2UgZG9uJ3QgaGF2ZSB0byBjYWxsIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcyB0byBkbyBhIGNhc2VcbiAgLy8gaW5zZW5zaXRpdmUgY2hlY2sgYWNyb3NzIGFsbCBlbWFpbHMgaW4gdGhlIGRhdGFiYXNlIGhlcmUgYmVjYXVzZTogKDEpIGlmXG4gIC8vIHRoZXJlIGlzIG5vIGNhc2UtaW5zZW5zaXRpdmUgZHVwbGljYXRlIGJldHdlZW4gdGhpcyB1c2VyIGFuZCBvdGhlciB1c2VycyxcbiAgLy8gdGhlbiB3ZSBhcmUgT0sgYW5kICgyKSBpZiB0aGlzIHdvdWxkIGNyZWF0ZSBhIGNvbmZsaWN0IHdpdGggb3RoZXIgdXNlcnNcbiAgLy8gdGhlbiB0aGVyZSB3b3VsZCBhbHJlYWR5IGJlIGEgY2FzZS1pbnNlbnNpdGl2ZSBkdXBsaWNhdGUgYW5kIHdlIGNhbid0IGZpeFxuICAvLyB0aGF0IGluIHRoaXMgY29kZSBhbnl3YXkuXG4gIHZhciBjYXNlSW5zZW5zaXRpdmVSZWdFeHAgPVxuICAgIG5ldyBSZWdFeHAoJ14nICsgTWV0ZW9yLl9lc2NhcGVSZWdFeHAobmV3RW1haWwpICsgJyQnLCAnaScpO1xuXG4gIHZhciBkaWRVcGRhdGVPd25FbWFpbCA9IF8uYW55KHVzZXIuZW1haWxzLCBmdW5jdGlvbihlbWFpbCwgaW5kZXgpIHtcbiAgICBpZiAoY2FzZUluc2Vuc2l0aXZlUmVnRXhwLnRlc3QoZW1haWwuYWRkcmVzcykpIHtcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoe1xuICAgICAgICBfaWQ6IHVzZXIuX2lkLFxuICAgICAgICAnZW1haWxzLmFkZHJlc3MnOiBlbWFpbC5hZGRyZXNzXG4gICAgICB9LCB7JHNldDoge1xuICAgICAgICAnZW1haWxzLiQuYWRkcmVzcyc6IG5ld0VtYWlsLFxuICAgICAgICAnZW1haWxzLiQudmVyaWZpZWQnOiB2ZXJpZmllZFxuICAgICAgfX0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICAvLyBJbiB0aGUgb3RoZXIgdXBkYXRlcyBiZWxvdywgd2UgaGF2ZSB0byBkbyBhbm90aGVyIGNhbGwgdG9cbiAgLy8gY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzIHRvIG1ha2Ugc3VyZSB0aGF0IG5vIGNvbmZsaWN0aW5nIHZhbHVlc1xuICAvLyB3ZXJlIGFkZGVkIHRvIHRoZSBkYXRhYmFzZSBpbiB0aGUgbWVhbnRpbWUuIFdlIGRvbid0IGhhdmUgdG8gZG8gdGhpcyBmb3JcbiAgLy8gdGhlIGNhc2Ugd2hlcmUgdGhlIHVzZXIgaXMgdXBkYXRpbmcgdGhlaXIgZW1haWwgYWRkcmVzcyB0byBvbmUgdGhhdCBpcyB0aGVcbiAgLy8gc2FtZSBhcyBiZWZvcmUsIGJ1dCBvbmx5IGRpZmZlcmVudCBiZWNhdXNlIG9mIGNhcGl0YWxpemF0aW9uLiBSZWFkIHRoZVxuICAvLyBiaWcgY29tbWVudCBhYm92ZSB0byB1bmRlcnN0YW5kIHdoeS5cblxuICBpZiAoZGlkVXBkYXRlT3duRW1haWwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBQZXJmb3JtIGEgY2FzZSBpbnNlbnNpdGl2ZSBjaGVjayBmb3IgZHVwbGljYXRlcyBiZWZvcmUgdXBkYXRlXG4gIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygnZW1haWxzLmFkZHJlc3MnLCAnRW1haWwnLCBuZXdFbWFpbCwgdXNlci5faWQpO1xuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe1xuICAgIF9pZDogdXNlci5faWRcbiAgfSwge1xuICAgICRhZGRUb1NldDoge1xuICAgICAgZW1haWxzOiB7XG4gICAgICAgIGFkZHJlc3M6IG5ld0VtYWlsLFxuICAgICAgICB2ZXJpZmllZDogdmVyaWZpZWRcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vIFBlcmZvcm0gYW5vdGhlciBjaGVjayBhZnRlciB1cGRhdGUsIGluIGNhc2UgYSBtYXRjaGluZyB1c2VyIGhhcyBiZWVuXG4gIC8vIGluc2VydGVkIGluIHRoZSBtZWFudGltZVxuICB0cnkge1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygnZW1haWxzLmFkZHJlc3MnLCAnRW1haWwnLCBuZXdFbWFpbCwgdXNlci5faWQpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIFVuZG8gdXBkYXRlIGlmIHRoZSBjaGVjayBmYWlsc1xuICAgIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LFxuICAgICAgeyRwdWxsOiB7ZW1haWxzOiB7YWRkcmVzczogbmV3RW1haWx9fX0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbi8qKlxuICogQHN1bW1hcnkgUmVtb3ZlIGFuIGVtYWlsIGFkZHJlc3MgZm9yIGEgdXNlci4gVXNlIHRoaXMgaW5zdGVhZCBvZiB1cGRhdGluZ1xuICogdGhlIGRhdGFiYXNlIGRpcmVjdGx5LlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgSUQgb2YgdGhlIHVzZXIgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGVtYWlsIFRoZSBlbWFpbCBhZGRyZXNzIHRvIHJlbW92ZS5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLnJlbW92ZUVtYWlsID0gZnVuY3Rpb24gKHVzZXJJZCwgZW1haWwpIHtcbiAgY2hlY2sodXNlcklkLCBOb25FbXB0eVN0cmluZyk7XG4gIGNoZWNrKGVtYWlsLCBOb25FbXB0eVN0cmluZyk7XG5cbiAgdmFyIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICBpZiAoIXVzZXIpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sXG4gICAgeyRwdWxsOiB7ZW1haWxzOiB7YWRkcmVzczogZW1haWx9fX0pO1xufVxuXG4vLy9cbi8vLyBDUkVBVElORyBVU0VSU1xuLy8vXG5cbi8vIFNoYXJlZCBjcmVhdGVVc2VyIGZ1bmN0aW9uIGNhbGxlZCBmcm9tIHRoZSBjcmVhdGVVc2VyIG1ldGhvZCwgYm90aFxuLy8gaWYgb3JpZ2luYXRlcyBpbiBjbGllbnQgb3Igc2VydmVyIGNvZGUuIENhbGxzIHVzZXIgcHJvdmlkZWQgaG9va3MsXG4vLyBkb2VzIHRoZSBhY3R1YWwgdXNlciBpbnNlcnRpb24uXG4vL1xuLy8gcmV0dXJucyB0aGUgdXNlciBpZFxudmFyIGNyZWF0ZVVzZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBVbmtub3duIGtleXMgYWxsb3dlZCwgYmVjYXVzZSBhIG9uQ3JlYXRlVXNlckhvb2sgY2FuIHRha2UgYXJiaXRyYXJ5XG4gIC8vIG9wdGlvbnMuXG4gIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgdXNlcm5hbWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgZW1haWw6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgcGFzc3dvcmQ6IE1hdGNoLk9wdGlvbmFsKHBhc3N3b3JkVmFsaWRhdG9yKVxuICB9KSk7XG5cbiAgdmFyIHVzZXJuYW1lID0gb3B0aW9ucy51c2VybmFtZTtcbiAgdmFyIGVtYWlsID0gb3B0aW9ucy5lbWFpbDtcbiAgaWYgKCF1c2VybmFtZSAmJiAhZW1haWwpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTmVlZCB0byBzZXQgYSB1c2VybmFtZSBvciBlbWFpbFwiKTtcblxuICB2YXIgdXNlciA9IHtzZXJ2aWNlczoge319O1xuICBpZiAob3B0aW9ucy5wYXNzd29yZCkge1xuICAgIHZhciBoYXNoZWQgPSBoYXNoUGFzc3dvcmQob3B0aW9ucy5wYXNzd29yZCk7XG4gICAgdXNlci5zZXJ2aWNlcy5wYXNzd29yZCA9IHsgYmNyeXB0OiBoYXNoZWQgfTtcbiAgfVxuXG4gIGlmICh1c2VybmFtZSlcbiAgICB1c2VyLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gIGlmIChlbWFpbClcbiAgICB1c2VyLmVtYWlscyA9IFt7YWRkcmVzczogZW1haWwsIHZlcmlmaWVkOiBmYWxzZX1dO1xuXG4gIC8vIFBlcmZvcm0gYSBjYXNlIGluc2Vuc2l0aXZlIGNoZWNrIGJlZm9yZSBpbnNlcnRcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIHVzZXJuYW1lKTtcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCdlbWFpbHMuYWRkcmVzcycsICdFbWFpbCcsIGVtYWlsKTtcblxuICB2YXIgdXNlcklkID0gQWNjb3VudHMuaW5zZXJ0VXNlckRvYyhvcHRpb25zLCB1c2VyKTtcbiAgLy8gUGVyZm9ybSBhbm90aGVyIGNoZWNrIGFmdGVyIGluc2VydCwgaW4gY2FzZSBhIG1hdGNoaW5nIHVzZXIgaGFzIGJlZW5cbiAgLy8gaW5zZXJ0ZWQgaW4gdGhlIG1lYW50aW1lXG4gIHRyeSB7XG4gICAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIHVzZXJuYW1lLCB1c2VySWQpO1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygnZW1haWxzLmFkZHJlc3MnLCAnRW1haWwnLCBlbWFpbCwgdXNlcklkKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyBSZW1vdmUgaW5zZXJ0ZWQgdXNlciBpZiB0aGUgY2hlY2sgZmFpbHNcbiAgICBNZXRlb3IudXNlcnMucmVtb3ZlKHVzZXJJZCk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbiAgcmV0dXJuIHVzZXJJZDtcbn07XG5cbi8vIG1ldGhvZCBmb3IgY3JlYXRlIHVzZXIuIFJlcXVlc3RzIGNvbWUgZnJvbSB0aGUgY2xpZW50LlxuTWV0ZW9yLm1ldGhvZHMoe2NyZWF0ZVVzZXI6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIEFjY291bnRzLl9sb2dpbk1ldGhvZChcbiAgICBzZWxmLFxuICAgIFwiY3JlYXRlVXNlclwiLFxuICAgIGFyZ3VtZW50cyxcbiAgICBcInBhc3N3b3JkXCIsXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gY3JlYXRlVXNlcigpIGFib3ZlIGRvZXMgbW9yZSBjaGVja2luZy5cbiAgICAgIGNoZWNrKG9wdGlvbnMsIE9iamVjdCk7XG4gICAgICBpZiAoQWNjb3VudHMuX29wdGlvbnMuZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJTaWdudXBzIGZvcmJpZGRlblwiKVxuICAgICAgICB9O1xuXG4gICAgICAvLyBDcmVhdGUgdXNlci4gcmVzdWx0IGNvbnRhaW5zIGlkIGFuZCB0b2tlbi5cbiAgICAgIHZhciB1c2VySWQgPSBjcmVhdGVVc2VyKG9wdGlvbnMpO1xuICAgICAgLy8gc2FmZXR5IGJlbHQuIGNyZWF0ZVVzZXIgaXMgc3VwcG9zZWQgdG8gdGhyb3cgb24gZXJyb3IuIHNlbmQgNTAwIGVycm9yXG4gICAgICAvLyBpbnN0ZWFkIG9mIHNlbmRpbmcgYSB2ZXJpZmljYXRpb24gZW1haWwgd2l0aCBlbXB0eSB1c2VyaWQuXG4gICAgICBpZiAoISB1c2VySWQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImNyZWF0ZVVzZXIgZmFpbGVkIHRvIGluc2VydCBuZXcgdXNlclwiKTtcblxuICAgICAgLy8gSWYgYEFjY291bnRzLl9vcHRpb25zLnNlbmRWZXJpZmljYXRpb25FbWFpbGAgaXMgc2V0LCByZWdpc3RlclxuICAgICAgLy8gYSB0b2tlbiB0byB2ZXJpZnkgdGhlIHVzZXIncyBwcmltYXJ5IGVtYWlsLCBhbmQgc2VuZCBpdCB0b1xuICAgICAgLy8gdGhhdCBhZGRyZXNzLlxuICAgICAgaWYgKG9wdGlvbnMuZW1haWwgJiYgQWNjb3VudHMuX29wdGlvbnMuc2VuZFZlcmlmaWNhdGlvbkVtYWlsKVxuICAgICAgICBBY2NvdW50cy5zZW5kVmVyaWZpY2F0aW9uRW1haWwodXNlcklkLCBvcHRpb25zLmVtYWlsKTtcblxuICAgICAgLy8gY2xpZW50IGdldHMgbG9nZ2VkIGluIGFzIHRoZSBuZXcgdXNlciBhZnRlcndhcmRzLlxuICAgICAgcmV0dXJuIHt1c2VySWQ6IHVzZXJJZH07XG4gICAgfVxuICApO1xufX0pO1xuXG4vLyBDcmVhdGUgdXNlciBkaXJlY3RseSBvbiB0aGUgc2VydmVyLlxuLy9cbi8vIFVubGlrZSB0aGUgY2xpZW50IHZlcnNpb24sIHRoaXMgZG9lcyBub3QgbG9nIHlvdSBpbiBhcyB0aGlzIHVzZXJcbi8vIGFmdGVyIGNyZWF0aW9uLlxuLy9cbi8vIHJldHVybnMgdXNlcklkIG9yIHRocm93cyBhbiBlcnJvciBpZiBpdCBjYW4ndCBjcmVhdGVcbi8vXG4vLyBYWFggYWRkIGFub3RoZXIgYXJndW1lbnQgKFwic2VydmVyIG9wdGlvbnNcIikgdGhhdCBnZXRzIHNlbnQgdG8gb25DcmVhdGVVc2VyLFxuLy8gd2hpY2ggaXMgYWx3YXlzIGVtcHR5IHdoZW4gY2FsbGVkIGZyb20gdGhlIGNyZWF0ZVVzZXIgbWV0aG9kPyBlZywgXCJhZG1pbjpcbi8vIHRydWVcIiwgd2hpY2ggd2Ugd2FudCB0byBwcmV2ZW50IHRoZSBjbGllbnQgZnJvbSBzZXR0aW5nLCBidXQgd2hpY2ggYSBjdXN0b21cbi8vIG1ldGhvZCBjYWxsaW5nIEFjY291bnRzLmNyZWF0ZVVzZXIgY291bGQgc2V0P1xuLy9cbkFjY291bnRzLmNyZWF0ZVVzZXIgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgb3B0aW9ucyA9IF8uY2xvbmUob3B0aW9ucyk7XG5cbiAgLy8gWFhYIGFsbG93IGFuIG9wdGlvbmFsIGNhbGxiYWNrP1xuICBpZiAoY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBY2NvdW50cy5jcmVhdGVVc2VyIHdpdGggY2FsbGJhY2sgbm90IHN1cHBvcnRlZCBvbiB0aGUgc2VydmVyIHlldC5cIik7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlVXNlcihvcHRpb25zKTtcbn07XG5cbi8vL1xuLy8vIFBBU1NXT1JELVNQRUNJRklDIElOREVYRVMgT04gVVNFUlNcbi8vL1xuTWV0ZW9yLnVzZXJzLl9lbnN1cmVJbmRleCgnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLnRva2VuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge3VuaXF1ZTogMSwgc3BhcnNlOiAxfSk7XG5NZXRlb3IudXNlcnMuX2Vuc3VyZUluZGV4KCdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC50b2tlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHt1bmlxdWU6IDEsIHNwYXJzZTogMX0pO1xuIl19
