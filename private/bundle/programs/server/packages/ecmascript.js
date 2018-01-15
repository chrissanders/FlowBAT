(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;

/* Package-scope variables */
var ECMAScript;

(function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ecmascript/ecmascript.js                                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
ECMAScript = {
  compileForShell(command) {
    const babelOptions = Babel.getDefaultOptions();
    babelOptions.sourceMap = false;
    babelOptions.ast = false;
    return Babel.compile(command, babelOptions).code;
  }

};
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.ecmascript = {}, {
  ECMAScript: ECMAScript
});

})();

//# sourceURL=meteor://💻app/packages/ecmascript.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWNtYXNjcmlwdC9lY21hc2NyaXB0LmpzIl0sIm5hbWVzIjpbIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJjb21tYW5kIiwiYmFiZWxPcHRpb25zIiwiQmFiZWwiLCJnZXREZWZhdWx0T3B0aW9ucyIsInNvdXJjZU1hcCIsImFzdCIsImNvbXBpbGUiLCJjb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxhQUFhO0FBQ1hDLGtCQUFnQkMsT0FBaEIsRUFBeUI7QUFDdkIsVUFBTUMsZUFBZUMsTUFBTUMsaUJBQU4sRUFBckI7QUFDQUYsaUJBQWFHLFNBQWIsR0FBeUIsS0FBekI7QUFDQUgsaUJBQWFJLEdBQWIsR0FBbUIsS0FBbkI7QUFDQSxXQUFPSCxNQUFNSSxPQUFOLENBQWNOLE9BQWQsRUFBdUJDLFlBQXZCLEVBQXFDTSxJQUE1QztBQUNEOztBQU5VLENBQWIsQyIsImZpbGUiOiIvcGFja2FnZXMvZWNtYXNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkVDTUFTY3JpcHQgPSB7XG4gIGNvbXBpbGVGb3JTaGVsbChjb21tYW5kKSB7XG4gICAgY29uc3QgYmFiZWxPcHRpb25zID0gQmFiZWwuZ2V0RGVmYXVsdE9wdGlvbnMoKTtcbiAgICBiYWJlbE9wdGlvbnMuc291cmNlTWFwID0gZmFsc2U7XG4gICAgYmFiZWxPcHRpb25zLmFzdCA9IGZhbHNlO1xuICAgIHJldHVybiBCYWJlbC5jb21waWxlKGNvbW1hbmQsIGJhYmVsT3B0aW9ucykuY29kZTtcbiAgfVxufTtcbiJdfQ==
