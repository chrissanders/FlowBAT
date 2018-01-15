(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/helpers.coffee                                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
OriginalHandlebars.registerHelper("t", function (key, hash) {          // 1
  var params, result;                                                  // 2
  params = {}; //default                                               // 2
                                                                       //
  if (hash) {                                                          // 3
    params = hash.hash;                                                // 3
  }                                                                    // 6
                                                                       //
  result = root.i18n.t(key, params);                                   // 4
  return new OriginalHandlebars.SafeString(result);                    // 8
});                                                                    // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/helpers.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2hlbHBlcnMuY29mZmVlIl0sIm5hbWVzIjpbIk9yaWdpbmFsSGFuZGxlYmFycyIsInJlZ2lzdGVySGVscGVyIiwia2V5IiwiaGFzaCIsInBhcmFtcyIsInJlc3VsdCIsInJvb3QiLCJpMThuIiwidCIsIlNhZmVTdHJpbmciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxtQkFBbUJDLGNBQW5CLENBQWtDLEdBQWxDLEVBQXVDLFVBQUNDLEdBQUQsRUFBTUMsSUFBTjtBQUNyQyxNQUFBQyxNQUFBLEVBQUFDLE1BQUE7QUFBQUQsV0FBUyxFQUFULENBRHFDLENBQ3JDOztBQUNBLE1BQXVCRCxJQUF2QjtBQUFBQyxhQUFTRCxLQUFLQSxJQUFkO0FBR0M7O0FBRkRFLFdBQVNDLEtBQUtDLElBQUwsQ0FBVUMsQ0FBVixDQUFZTixHQUFaLEVBQWlCRSxNQUFqQixDQUFUO0FBSUEsU0FIQSxJQUFJSixtQkFBbUJTLFVBQXZCLENBQWtDSixNQUFsQyxDQUdBO0FBUEYsMkUiLCJmaWxlIjoiL3NlcnZlci9oZWxwZXJzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbIk9yaWdpbmFsSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciBcInRcIiwgKGtleSwgaGFzaCkgLT5cbiAgcGFyYW1zID0ge30gI2RlZmF1bHRcbiAgcGFyYW1zID0gaGFzaC5oYXNoICBpZiBoYXNoXG4gIHJlc3VsdCA9IHJvb3QuaTE4bi50KGtleSwgcGFyYW1zKVxuICBuZXcgT3JpZ2luYWxIYW5kbGViYXJzLlNhZmVTdHJpbmcocmVzdWx0KVxuIl19
