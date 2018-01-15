(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;

/* Package-scope variables */
var OriginalHandlebars, Handlebars;

(function(){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/cmather_handlebars-server/packages/cmather_handlebars-server. //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/cmather:handlebars-server/handlebars-server.js           //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
OriginalHandlebars = Npm.require('handlebars');                      // 1
Handlebars = Handlebars || {};                                       // 2
                                                                     // 3
_.extend(Handlebars, {                                               // 4
  templates: {},                                                     // 5
});                                                                  // 6
                                                                     // 7
///////////////////////////////////////////////////////////////////////

}).call(this);

////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['cmather:handlebars-server'] = {}, {
  Handlebars: Handlebars,
  OriginalHandlebars: OriginalHandlebars
});

})();
