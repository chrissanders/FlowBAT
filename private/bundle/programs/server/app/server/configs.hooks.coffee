(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/configs.hooks.coffee                                         //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Configs.after.update(function (userId, config) {                 // 1
  share.IPSets.update({}, {                                            // 2
    $set: {                                                            // 2
      isOutputStale: true                                              // 2
    }                                                                  // 2
  }, {                                                                 // 2
    multi: true                                                        // 2
  });                                                                  // 2
  return share.Tuples.update({}, {                                     // 9
    $set: {                                                            // 3
      isOutputStale: true                                              // 3
    }                                                                  // 3
  }, {                                                                 // 3
    multi: true                                                        // 3
  });                                                                  // 3
});                                                                    // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/configs.hooks.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2NvbmZpZ3MuaG9va3MuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwiQ29uZmlncyIsImFmdGVyIiwidXBkYXRlIiwidXNlcklkIiwiY29uZmlnIiwiSVBTZXRzIiwiJHNldCIsImlzT3V0cHV0U3RhbGUiLCJtdWx0aSIsIlR1cGxlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUFBLE1BQU1DLE9BQU4sQ0FBY0MsS0FBZCxDQUFvQkMsTUFBcEIsQ0FBMkIsVUFBQ0MsTUFBRCxFQUFTQyxNQUFUO0FBQ3pCTCxRQUFNTSxNQUFOLENBQWFILE1BQWIsQ0FBb0IsRUFBcEIsRUFBd0I7QUFBQ0ksVUFBTTtBQUFDQyxxQkFBZTtBQUFoQjtBQUFQLEdBQXhCLEVBQXVEO0FBQUNDLFdBQU87QUFBUixHQUF2RDtBQU9BLFNBTkFULE1BQU1VLE1BQU4sQ0FBYVAsTUFBYixDQUFvQixFQUFwQixFQUF3QjtBQUFDSSxVQUFNO0FBQUNDLHFCQUFlO0FBQWhCO0FBQVAsR0FBeEIsRUFBdUQ7QUFBQ0MsV0FBTztBQUFSLEdBQXZELENBTUE7QUFSRiwyRSIsImZpbGUiOiIvc2VydmVyL2NvbmZpZ3MuaG9va3MuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsic2hhcmUuQ29uZmlncy5hZnRlci51cGRhdGUgKHVzZXJJZCwgY29uZmlnKSAtPlxuICBzaGFyZS5JUFNldHMudXBkYXRlKHt9LCB7JHNldDoge2lzT3V0cHV0U3RhbGU6IHRydWV9fSwge211bHRpOiB0cnVlfSlcbiAgc2hhcmUuVHVwbGVzLnVwZGF0ZSh7fSwgeyRzZXQ6IHtpc091dHB1dFN0YWxlOiB0cnVlfX0sIHttdWx0aTogdHJ1ZX0pXG4iXX0=
