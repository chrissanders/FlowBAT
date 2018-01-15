(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/cleanup.coffee                                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Process;                                                           // 1
Process = Npm.require("child_process");                                // 1
                                                                       //
share.cleanupQuickQueries = function () {                              // 3
  var borderline;                                                      // 4
  borderline = new Date(new Date().getTime() - 7 * share.day); //  borderline = new Date(new Date().getTime() - 1000)
                                                                       //
  return share.Queries.find({                                          // 9
    isQuick: true,                                                     // 6
    executingInterval: {                                               // 6
      $lte: 0                                                          // 6
    },                                                                 // 6
    updatedAt: {                                                       // 6
      $lt: borderline                                                  // 6
    }                                                                  // 6
  }).forEach(function (query) {                                        // 6
    return share.Queries.remove(query._id);                            // 18
  });                                                                  // 6
};                                                                     // 3
                                                                       //
share.cleanupCachedQueryResults = function () {                        // 9
  var borderline, config;                                              // 10
  borderline = new Date(new Date().getTime() - 2 * share.day); //  borderline = new Date(new Date().getTime() - 1000)
                                                                       //
  config = share.Configs.findOne({}, {                                 // 12
    transform: share.Transformations.config                            // 12
  });                                                                  // 12
  return share.Queries.find({                                          // 29
    executingInterval: {                                               // 13
      $lte: 0                                                          // 13
    },                                                                 // 13
    updatedAt: {                                                       // 13
      $lt: borderline                                                  // 13
    }                                                                  // 13
  }).forEach(function (query) {                                        // 13
    var rmCommand;                                                     // 14
    rmCommand = "rm -f " + config.dataTempdir + "/" + query._id + ".rwf";
                                                                       //
    if (config.isSSH) {                                                // 15
      rmCommand = config.wrapCommand(rmCommand);                       // 16
    }                                                                  // 41
                                                                       //
    return Process.exec(rmCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
      var code, error, result;                                         // 18
      result = stdout.trim();                                          // 18
      error = stderr.trim();                                           // 19
      code = err ? err.code : 0;                                       // 20
                                                                       //
      if (error) {                                                     // 21
        throw new Error(error);                                        // 22
      }                                                                // 49
    }));                                                               // 17
  });                                                                  // 13
};                                                                     // 9
                                                                       //
share.Queries.after.remove(function (userId, query) {                  // 25
  var config, rmCommand;                                               // 26
  config = share.Configs.findOne({}, {                                 // 26
    transform: share.Transformations.config                            // 26
  });                                                                  // 26
  rmCommand = "rm -f " + config.dataTempdir + "/" + query._id + ".rwf";
                                                                       //
  if (config.isSSH) {                                                  // 28
    rmCommand = config.wrapCommand(rmCommand);                         // 29
  }                                                                    // 62
                                                                       //
  return Process.exec(rmCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
    var code, error, result;                                           // 31
    result = stdout.trim();                                            // 31
    error = stderr.trim();                                             // 32
    code = err ? err.code : 0;                                         // 33
                                                                       //
    if (error) {                                                       // 34
      throw new Error(error);                                          // 35
    }                                                                  // 70
  }));                                                                 // 30
});                                                                    // 25
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/cleanup.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2NsZWFudXAuY29mZmVlIl0sIm5hbWVzIjpbIlByb2Nlc3MiLCJOcG0iLCJyZXF1aXJlIiwic2hhcmUiLCJjbGVhbnVwUXVpY2tRdWVyaWVzIiwiYm9yZGVybGluZSIsIkRhdGUiLCJnZXRUaW1lIiwiZGF5IiwiUXVlcmllcyIsImZpbmQiLCJpc1F1aWNrIiwiZXhlY3V0aW5nSW50ZXJ2YWwiLCIkbHRlIiwidXBkYXRlZEF0IiwiJGx0IiwiZm9yRWFjaCIsInF1ZXJ5IiwicmVtb3ZlIiwiX2lkIiwiY2xlYW51cENhY2hlZFF1ZXJ5UmVzdWx0cyIsImNvbmZpZyIsIkNvbmZpZ3MiLCJmaW5kT25lIiwidHJhbnNmb3JtIiwiVHJhbnNmb3JtYXRpb25zIiwicm1Db21tYW5kIiwiZGF0YVRlbXBkaXIiLCJpc1NTSCIsIndyYXBDb21tYW5kIiwiZXhlYyIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImVyciIsInN0ZG91dCIsInN0ZGVyciIsImNvZGUiLCJlcnJvciIsInJlc3VsdCIsInRyaW0iLCJFcnJvciIsImFmdGVyIiwidXNlcklkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxPQUFBO0FBQUFBLFVBQVVDLElBQUlDLE9BQUosQ0FBWSxlQUFaLENBQVY7O0FBRUFDLE1BQU1DLG1CQUFOLEdBQTRCO0FBQzFCLE1BQUFDLFVBQUE7QUFBQUEsZUFBYSxJQUFJQyxJQUFKLENBQVMsSUFBSUEsSUFBSixHQUFXQyxPQUFYLEtBQXVCLElBQUlKLE1BQU1LLEdBQTFDLENBQWIsQ0FEMEIsQ0FLMUI7O0FBQ0EsU0FIQUwsTUFBTU0sT0FBTixDQUFjQyxJQUFkLENBQW1CO0FBQUNDLGFBQVMsSUFBVjtBQUFnQkMsdUJBQW1CO0FBQUNDLFlBQU07QUFBUCxLQUFuQztBQUE4Q0MsZUFBVztBQUFDQyxXQUFLVjtBQUFOO0FBQXpELEdBQW5CLEVBQWdHVyxPQUFoRyxDQUF3RyxVQUFDQyxLQUFEO0FBWXRHLFdBWEFkLE1BQU1NLE9BQU4sQ0FBY1MsTUFBZCxDQUFxQkQsTUFBTUUsR0FBM0IsQ0FXQTtBQVpGLElBR0E7QUFOMEIsQ0FBNUI7O0FBTUFoQixNQUFNaUIseUJBQU4sR0FBa0M7QUFDaEMsTUFBQWYsVUFBQSxFQUFBZ0IsTUFBQTtBQUFBaEIsZUFBYSxJQUFJQyxJQUFKLENBQVMsSUFBSUEsSUFBSixHQUFXQyxPQUFYLEtBQXVCLElBQUlKLE1BQU1LLEdBQTFDLENBQWIsQ0FEZ0MsQ0FnQmhDOztBQWJBYSxXQUFTbEIsTUFBTW1CLE9BQU4sQ0FBY0MsT0FBZCxDQUFzQixFQUF0QixFQUEwQjtBQUFDQyxlQUFXckIsTUFBTXNCLGVBQU4sQ0FBc0JKO0FBQWxDLEdBQTFCLENBQVQ7QUFpQkEsU0FoQkFsQixNQUFNTSxPQUFOLENBQWNDLElBQWQsQ0FBbUI7QUFBQ0UsdUJBQW1CO0FBQUNDLFlBQU07QUFBUCxLQUFwQjtBQUErQkMsZUFBVztBQUFDQyxXQUFLVjtBQUFOO0FBQTFDLEdBQW5CLEVBQWlGVyxPQUFqRixDQUF5RixVQUFDQyxLQUFEO0FBQ3ZGLFFBQUFTLFNBQUE7QUFBQUEsZ0JBQVksV0FBV0wsT0FBT00sV0FBbEIsR0FBZ0MsR0FBaEMsR0FBc0NWLE1BQU1FLEdBQTVDLEdBQWtELE1BQTlEOztBQUNBLFFBQUdFLE9BQU9PLEtBQVY7QUFDRUYsa0JBQVlMLE9BQU9RLFdBQVAsQ0FBbUJILFNBQW5CLENBQVo7QUF5QkQ7O0FBQ0QsV0F6QkExQixRQUFROEIsSUFBUixDQUFhSixTQUFiLEVBQXdCSyxPQUFPQyxlQUFQLENBQXVCLFVBQUNDLEdBQUQsRUFBTUMsTUFBTixFQUFjQyxNQUFkO0FBQzdDLFVBQUFDLElBQUEsRUFBQUMsS0FBQSxFQUFBQyxNQUFBO0FBQUFBLGVBQVNKLE9BQU9LLElBQVAsRUFBVDtBQUNBRixjQUFRRixPQUFPSSxJQUFQLEVBQVI7QUFDQUgsYUFBVUgsTUFBU0EsSUFBSUcsSUFBYixHQUF1QixDQUFqQzs7QUFDQSxVQUFHQyxLQUFIO0FBQ0UsY0FBTSxJQUFJRyxLQUFKLENBQVVILEtBQVYsQ0FBTjtBQTJCRDtBQWhDcUIsTUFBeEIsQ0F5QkE7QUE3QkYsSUFnQkE7QUFwQmdDLENBQWxDOztBQWdCQWxDLE1BQU1NLE9BQU4sQ0FBY2dDLEtBQWQsQ0FBb0J2QixNQUFwQixDQUEyQixVQUFDd0IsTUFBRCxFQUFTekIsS0FBVDtBQUN6QixNQUFBSSxNQUFBLEVBQUFLLFNBQUE7QUFBQUwsV0FBU2xCLE1BQU1tQixPQUFOLENBQWNDLE9BQWQsQ0FBc0IsRUFBdEIsRUFBMEI7QUFBQ0MsZUFBV3JCLE1BQU1zQixlQUFOLENBQXNCSjtBQUFsQyxHQUExQixDQUFUO0FBQ0FLLGNBQVksV0FBV0wsT0FBT00sV0FBbEIsR0FBZ0MsR0FBaEMsR0FBc0NWLE1BQU1FLEdBQTVDLEdBQWtELE1BQTlEOztBQUNBLE1BQUdFLE9BQU9PLEtBQVY7QUFDRUYsZ0JBQVlMLE9BQU9RLFdBQVAsQ0FBbUJILFNBQW5CLENBQVo7QUFpQ0Q7O0FBQ0QsU0FqQ0ExQixRQUFROEIsSUFBUixDQUFhSixTQUFiLEVBQXdCSyxPQUFPQyxlQUFQLENBQXVCLFVBQUNDLEdBQUQsRUFBTUMsTUFBTixFQUFjQyxNQUFkO0FBQzdDLFFBQUFDLElBQUEsRUFBQUMsS0FBQSxFQUFBQyxNQUFBO0FBQUFBLGFBQVNKLE9BQU9LLElBQVAsRUFBVDtBQUNBRixZQUFRRixPQUFPSSxJQUFQLEVBQVI7QUFDQUgsV0FBVUgsTUFBU0EsSUFBSUcsSUFBYixHQUF1QixDQUFqQzs7QUFDQSxRQUFHQyxLQUFIO0FBQ0UsWUFBTSxJQUFJRyxLQUFKLENBQVVILEtBQVYsQ0FBTjtBQW1DRDtBQXhDcUIsSUFBeEIsQ0FpQ0E7QUF0Q0YsNEUiLCJmaWxlIjoiL3NlcnZlci9jbGVhbnVwLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbIlByb2Nlc3MgPSBOcG0ucmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIilcblxuc2hhcmUuY2xlYW51cFF1aWNrUXVlcmllcyA9IC0+XG4gIGJvcmRlcmxpbmUgPSBuZXcgRGF0ZShuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIDcgKiBzaGFyZS5kYXkpXG4jICBib3JkZXJsaW5lID0gbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgLSAxMDAwKVxuICBzaGFyZS5RdWVyaWVzLmZpbmQoe2lzUXVpY2s6IHRydWUsIGV4ZWN1dGluZ0ludGVydmFsOiB7JGx0ZTogMH0sIHVwZGF0ZWRBdDogeyRsdDogYm9yZGVybGluZX19KS5mb3JFYWNoIChxdWVyeSkgLT5cbiAgICBzaGFyZS5RdWVyaWVzLnJlbW92ZShxdWVyeS5faWQpXG5cbnNoYXJlLmNsZWFudXBDYWNoZWRRdWVyeVJlc3VsdHMgPSAtPlxuICBib3JkZXJsaW5lID0gbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgLSAyICogc2hhcmUuZGF5KVxuIyAgYm9yZGVybGluZSA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gMTAwMClcbiAgY29uZmlnID0gc2hhcmUuQ29uZmlncy5maW5kT25lKHt9LCB7dHJhbnNmb3JtOiBzaGFyZS5UcmFuc2Zvcm1hdGlvbnMuY29uZmlnfSlcbiAgc2hhcmUuUXVlcmllcy5maW5kKHtleGVjdXRpbmdJbnRlcnZhbDogeyRsdGU6IDB9LCB1cGRhdGVkQXQ6IHskbHQ6IGJvcmRlcmxpbmV9fSkuZm9yRWFjaCAocXVlcnkpIC0+XG4gICAgcm1Db21tYW5kID0gXCJybSAtZiBcIiArIGNvbmZpZy5kYXRhVGVtcGRpciArIFwiL1wiICsgcXVlcnkuX2lkICsgXCIucndmXCJcbiAgICBpZiBjb25maWcuaXNTU0hcbiAgICAgIHJtQ29tbWFuZCA9IGNvbmZpZy53cmFwQ29tbWFuZChybUNvbW1hbmQpXG4gICAgUHJvY2Vzcy5leGVjKHJtQ29tbWFuZCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCBzdGRvdXQsIHN0ZGVycikgLT5cbiAgICAgIHJlc3VsdCA9IHN0ZG91dC50cmltKClcbiAgICAgIGVycm9yID0gc3RkZXJyLnRyaW0oKVxuICAgICAgY29kZSA9IGlmIGVyciB0aGVuIGVyci5jb2RlIGVsc2UgMFxuICAgICAgaWYgZXJyb3JcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKVxuICAgICkpXG5cbnNoYXJlLlF1ZXJpZXMuYWZ0ZXIucmVtb3ZlICh1c2VySWQsIHF1ZXJ5KSAtPlxuICBjb25maWcgPSBzaGFyZS5Db25maWdzLmZpbmRPbmUoe30sIHt0cmFuc2Zvcm06IHNoYXJlLlRyYW5zZm9ybWF0aW9ucy5jb25maWd9KVxuICBybUNvbW1hbmQgPSBcInJtIC1mIFwiICsgY29uZmlnLmRhdGFUZW1wZGlyICsgXCIvXCIgKyBxdWVyeS5faWQgKyBcIi5yd2ZcIlxuICBpZiBjb25maWcuaXNTU0hcbiAgICBybUNvbW1hbmQgPSBjb25maWcud3JhcENvbW1hbmQocm1Db21tYW5kKVxuICBQcm9jZXNzLmV4ZWMocm1Db21tYW5kLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChlcnIsIHN0ZG91dCwgc3RkZXJyKSAtPlxuICAgIHJlc3VsdCA9IHN0ZG91dC50cmltKClcbiAgICBlcnJvciA9IHN0ZGVyci50cmltKClcbiAgICBjb2RlID0gaWYgZXJyIHRoZW4gZXJyLmNvZGUgZWxzZSAwXG4gICAgaWYgZXJyb3JcbiAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvcilcbiAgKSlcbiJdfQ==
