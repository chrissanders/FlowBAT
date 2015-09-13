/* Imports for global scope */

Router = Package['iron:router'].Router;
RouteController = Package['iron:router'].RouteController;
CollectionHooks = Package['matb33:collection-hooks'].CollectionHooks;
FastRender = Package['meteorhacks:fast-render'].FastRender;
Handlebars = Package.ui.Handlebars;
OriginalHandlebars = Package['cmather:handlebars-server'].OriginalHandlebars;
Email = Package.email.Email;
Iron = Package['iron:core'].Iron;
Accounts = Package['accounts-base'].Accounts;
Meteor = Package.meteor.Meteor;
WebApp = Package.webapp.WebApp;
main = Package.webapp.main;
WebAppInternals = Package.webapp.WebAppInternals;
Log = Package.logging.Log;
Tracker = Package.deps.Tracker;
Deps = Package.deps.Deps;
DDP = Package.livedata.DDP;
DDPServer = Package.livedata.DDPServer;
MongoInternals = Package.mongo.MongoInternals;
Mongo = Package.mongo.Mongo;
Blaze = Package.ui.Blaze;
UI = Package.ui.UI;
Spacebars = Package.spacebars.Spacebars;
check = Package.check.check;
Match = Package.check.Match;
_ = Package.underscore._;
Random = Package.random.Random;
EJSON = Package.ejson.EJSON;
HTML = Package.htmljs.HTML;

