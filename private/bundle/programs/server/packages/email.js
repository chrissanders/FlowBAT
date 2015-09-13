(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;

/* Package-scope variables */
var Email, EmailTest;

(function () {

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/email/email.js                                                     //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var Future = Npm.require('fibers/future');                                     // 1
var urlModule = Npm.require('url');                                            // 2
var MailComposer = Npm.require('mailcomposer').MailComposer;                   // 3
                                                                               // 4
Email = {};                                                                    // 5
EmailTest = {};                                                                // 6
                                                                               // 7
var makePool = function (mailUrlString) {                                      // 8
  var mailUrl = urlModule.parse(mailUrlString);                                // 9
  if (mailUrl.protocol !== 'smtp:')                                            // 10
    throw new Error("Email protocol in $MAIL_URL (" +                          // 11
                    mailUrlString + ") must be 'smtp'");                       // 12
                                                                               // 13
  var port = +(mailUrl.port);                                                  // 14
  var auth = false;                                                            // 15
  if (mailUrl.auth) {                                                          // 16
    var parts = mailUrl.auth.split(':', 2);                                    // 17
    auth = {user: parts[0] && decodeURIComponent(parts[0]),                    // 18
            pass: parts[1] && decodeURIComponent(parts[1])};                   // 19
  }                                                                            // 20
                                                                               // 21
  var simplesmtp = Npm.require('simplesmtp');                                  // 22
  var pool = simplesmtp.createClientPool(                                      // 23
    port,  // Defaults to 25                                                   // 24
    mailUrl.hostname,  // Defaults to "localhost"                              // 25
    { secureConnection: (port === 465),                                        // 26
      // XXX allow maxConnections to be configured?                            // 27
      auth: auth });                                                           // 28
                                                                               // 29
  pool._future_wrapped_sendMail = _.bind(Future.wrap(pool.sendMail), pool);    // 30
  return pool;                                                                 // 31
};                                                                             // 32
                                                                               // 33
var getPool = _.once(function () {                                             // 34
  // We delay this check until the first call to Email.send, in case someone   // 35
  // set process.env.MAIL_URL in startup code.                                 // 36
  var url = process.env.MAIL_URL;                                              // 37
  if (! url)                                                                   // 38
    return null;                                                               // 39
  return makePool(url);                                                        // 40
});                                                                            // 41
                                                                               // 42
var next_devmode_mail_id = 0;                                                  // 43
var output_stream = process.stdout;                                            // 44
                                                                               // 45
// Testing hooks                                                               // 46
EmailTest.overrideOutputStream = function (stream) {                           // 47
  next_devmode_mail_id = 0;                                                    // 48
  output_stream = stream;                                                      // 49
};                                                                             // 50
                                                                               // 51
EmailTest.restoreOutputStream = function () {                                  // 52
  output_stream = process.stdout;                                              // 53
};                                                                             // 54
                                                                               // 55
var devModeSend = function (mc) {                                              // 56
  var devmode_mail_id = next_devmode_mail_id++;                                // 57
                                                                               // 58
  var stream = output_stream;                                                  // 59
                                                                               // 60
  // This approach does not prevent other writers to stdout from interleaving. // 61
  stream.write("====== BEGIN MAIL #" + devmode_mail_id + " ======\n");         // 62
  stream.write("(Mail not sent; to enable sending, set the MAIL_URL " +        // 63
               "environment variable.)\n");                                    // 64
  mc.streamMessage();                                                          // 65
  mc.pipe(stream, {end: false});                                               // 66
  var future = new Future;                                                     // 67
  mc.on('end', function () {                                                   // 68
    stream.write("====== END MAIL #" + devmode_mail_id + " ======\n");         // 69
    future['return']();                                                        // 70
  });                                                                          // 71
  future.wait();                                                               // 72
};                                                                             // 73
                                                                               // 74
var smtpSend = function (pool, mc) {                                           // 75
  pool._future_wrapped_sendMail(mc).wait();                                    // 76
};                                                                             // 77
                                                                               // 78
/**                                                                            // 79
 * Mock out email sending (eg, during a test.) This is private for now.        // 80
 *                                                                             // 81
 * f receives the arguments to Email.send and should return true to go         // 82
 * ahead and send the email (or at least, try subsequent hooks), or            // 83
 * false to skip sending.                                                      // 84
 */                                                                            // 85
var sendHooks = [];                                                            // 86
EmailTest.hookSend = function (f) {                                            // 87
  sendHooks.push(f);                                                           // 88
};                                                                             // 89
                                                                               // 90
// Old comment below                                                           // 91
/**                                                                            // 92
 * Send an email.                                                              // 93
 *                                                                             // 94
 * Connects to the mail server configured via the MAIL_URL environment         // 95
 * variable. If unset, prints formatted message to stdout. The "from" option   // 96
 * is required, and at least one of "to", "cc", and "bcc" must be provided;    // 97
 * all other options are optional.                                             // 98
 *                                                                             // 99
 * @param options                                                              // 100
 * @param options.from {String} RFC5322 "From:" address                        // 101
 * @param options.to {String|String[]} RFC5322 "To:" address[es]               // 102
 * @param options.cc {String|String[]} RFC5322 "Cc:" address[es]               // 103
 * @param options.bcc {String|String[]} RFC5322 "Bcc:" address[es]             // 104
 * @param options.replyTo {String|String[]} RFC5322 "Reply-To:" address[es]    // 105
 * @param options.subject {String} RFC5322 "Subject:" line                     // 106
 * @param options.text {String} RFC5322 mail body (plain text)                 // 107
 * @param options.html {String} RFC5322 mail body (HTML)                       // 108
 * @param options.headers {Object} custom RFC5322 headers (dictionary)         // 109
 */                                                                            // 110
                                                                               // 111
// New API doc comment below                                                   // 112
/**                                                                            // 113
 * @summary Send an email. Throws an `Error` on failure to contact mail server // 114
 * or if mail server returns an error. All fields should match                 // 115
 * [RFC5322](http://tools.ietf.org/html/rfc5322) specification.                // 116
 * @locus Server                                                               // 117
 * @param {Object} options                                                     // 118
 * @param {String} options.from "From:" address (required)                     // 119
 * @param {String|String[]} options.to,cc,bcc,replyTo                          // 120
 *   "To:", "Cc:", "Bcc:", and "Reply-To:" addresses                           // 121
 * @param {String} [options.subject]  "Subject:" line                          // 122
 * @param {String} [options.text|html] Mail body (in plain text and/or HTML)   // 123
 * @param {Object} [options.headers] Dictionary of custom headers              // 124
 */                                                                            // 125
Email.send = function (options) {                                              // 126
  for (var i = 0; i < sendHooks.length; i++)                                   // 127
    if (! sendHooks[i](options))                                               // 128
      return;                                                                  // 129
                                                                               // 130
  var mc = new MailComposer();                                                 // 131
                                                                               // 132
  // setup message data                                                        // 133
  // XXX support attachments (once we have a client/server-compatible binary   // 134
  //     Buffer class)                                                         // 135
  mc.setMessageOption({                                                        // 136
    from: options.from,                                                        // 137
    to: options.to,                                                            // 138
    cc: options.cc,                                                            // 139
    bcc: options.bcc,                                                          // 140
    replyTo: options.replyTo,                                                  // 141
    subject: options.subject,                                                  // 142
    text: options.text,                                                        // 143
    html: options.html                                                         // 144
  });                                                                          // 145
                                                                               // 146
  _.each(options.headers, function (value, name) {                             // 147
    mc.addHeader(name, value);                                                 // 148
  });                                                                          // 149
                                                                               // 150
  var pool = getPool();                                                        // 151
  if (pool) {                                                                  // 152
    smtpSend(pool, mc);                                                        // 153
  } else {                                                                     // 154
    devModeSend(mc);                                                           // 155
  }                                                                            // 156
};                                                                             // 157
                                                                               // 158
/////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.email = {
  Email: Email,
  EmailTest: EmailTest
};

})();

//# sourceMappingURL=email.js.map
