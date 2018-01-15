(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/periodic.execution.coffee                                    //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.periodicExecution = {                                            // 1
  timeout: null,                                                       // 2
  nearestExecutingAt: null,                                            // 3
  execute: function () {                                               // 4
    share.Queries.find({                                               // 5
      executingAt: {                                                   // 5
        $lte: new Date()                                               // 5
      }                                                                // 5
    }).forEach(function (query) {                                      // 5
      var executingAt; //      cl "executing" + query.name + " at " + new Date() + " requested at " + query.executingAt
                                                                       //
      executingAt = new Date(new Date().getTime() + query.executingInterval);
      return share.Queries.update(query._id, {                         // 13
        $set: {                                                        // 8
          isInputStale: true,                                          // 8
          isOutputStale: true,                                         // 8
          executingAt: executingAt                                     // 8
        }                                                              // 8
      }, {                                                             // 8
        skipResetTimeout: true                                         // 8
      });                                                              // 8
    });                                                                // 5
    return this.resetTimeout();                                        // 23
  },                                                                   // 2
  resetTimeout: function () {                                          // 10
    var nearestQuery, timeout;                                         // 11
    nearestQuery = share.Queries.findOne({                             // 11
      executingAt: {                                                   // 11
        $ne: null                                                      // 11
      }                                                                // 11
    }, {                                                               // 11
      sort: {                                                          // 11
        executingAt: 1                                                 // 11
      }                                                                // 11
    });                                                                // 11
    timeout = 30 * 1000;                                               // 12
                                                                       //
    if (nearestQuery) {                                                // 13
      timeout = nearestQuery.executingAt.getTime() - new Date().getTime();
    }                                                                  // 39
                                                                       //
    if (this.timeout) {                                                // 15
      Meteor.clearTimeout(this.timeout);                               // 16
    }                                                                  // 42
                                                                       //
    timeout = Math.max(1000, timeout); // at least a second in future; protection from state with executingAt in the past
    //    cl "resetTimeout to " + timeout                              // 44
                                                                       //
    return this.timeout = Meteor.setTimeout(this.execute, timeout);    // 45
  }                                                                    // 10
};                                                                     // 2
                                                                       //
_.bindAll(share.periodicExecution, "execute", "resetTimeout");         // 21
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/periodic.execution.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3BlcmlvZGljLmV4ZWN1dGlvbi5jb2ZmZWUiXSwibmFtZXMiOlsic2hhcmUiLCJwZXJpb2RpY0V4ZWN1dGlvbiIsInRpbWVvdXQiLCJuZWFyZXN0RXhlY3V0aW5nQXQiLCJleGVjdXRlIiwiUXVlcmllcyIsImZpbmQiLCJleGVjdXRpbmdBdCIsIiRsdGUiLCJEYXRlIiwiZm9yRWFjaCIsInF1ZXJ5IiwiZ2V0VGltZSIsImV4ZWN1dGluZ0ludGVydmFsIiwidXBkYXRlIiwiX2lkIiwiJHNldCIsImlzSW5wdXRTdGFsZSIsImlzT3V0cHV0U3RhbGUiLCJza2lwUmVzZXRUaW1lb3V0IiwicmVzZXRUaW1lb3V0IiwibmVhcmVzdFF1ZXJ5IiwiZmluZE9uZSIsIiRuZSIsInNvcnQiLCJNZXRlb3IiLCJjbGVhclRpbWVvdXQiLCJNYXRoIiwibWF4Iiwic2V0VGltZW91dCIsIl8iLCJiaW5kQWxsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQUEsTUFBTUMsaUJBQU4sR0FDRTtBQUFBQyxXQUFTLElBQVQ7QUFDQUMsc0JBQW9CLElBRHBCO0FBRUFDLFdBQVM7QUFDUEosVUFBTUssT0FBTixDQUFjQyxJQUFkLENBQW1CO0FBQUNDLG1CQUFhO0FBQUNDLGNBQU0sSUFBSUMsSUFBSjtBQUFQO0FBQWQsS0FBbkIsRUFBc0RDLE9BQXRELENBQThELFVBQUNDLEtBQUQ7QUFFNUQsVUFBQUosV0FBQSxDQUY0RCxDQU01RDs7QUFKQUEsb0JBQWMsSUFBSUUsSUFBSixDQUFTLElBQUlBLElBQUosR0FBV0csT0FBWCxLQUF1QkQsTUFBTUUsaUJBQXRDLENBQWQ7QUFNQSxhQUxBYixNQUFNSyxPQUFOLENBQWNTLE1BQWQsQ0FBcUJILE1BQU1JLEdBQTNCLEVBQWdDO0FBQUNDLGNBQU07QUFBQ0Msd0JBQWMsSUFBZjtBQUFxQkMseUJBQWUsSUFBcEM7QUFBMENYLHVCQUFhQTtBQUF2RDtBQUFQLE9BQWhDLEVBQTZHO0FBQUNZLDBCQUFrQjtBQUFuQixPQUE3RyxDQUtBO0FBUkY7QUFrQkEsV0FkQSxLQUFDQyxZQUFELEVBY0E7QUFyQkY7QUFRQUEsZ0JBQWM7QUFDWixRQUFBQyxZQUFBLEVBQUFuQixPQUFBO0FBQUFtQixtQkFBZXJCLE1BQU1LLE9BQU4sQ0FBY2lCLE9BQWQsQ0FBc0I7QUFBQ2YsbUJBQWE7QUFBQ2dCLGFBQUs7QUFBTjtBQUFkLEtBQXRCLEVBQWtEO0FBQUNDLFlBQU07QUFBQ2pCLHFCQUFhO0FBQWQ7QUFBUCxLQUFsRCxDQUFmO0FBQ0FMLGNBQVUsS0FBSyxJQUFmOztBQUNBLFFBQUdtQixZQUFIO0FBQ0VuQixnQkFBVW1CLGFBQWFkLFdBQWIsQ0FBeUJLLE9BQXpCLEtBQXFDLElBQUlILElBQUosR0FBV0csT0FBWCxFQUEvQztBQXlCRDs7QUF4QkQsUUFBRyxLQUFDVixPQUFKO0FBQ0V1QixhQUFPQyxZQUFQLENBQW9CLEtBQUN4QixPQUFyQjtBQTBCRDs7QUF6QkRBLGNBQVV5QixLQUFLQyxHQUFMLENBQVMsSUFBVCxFQUFlMUIsT0FBZixDQUFWLENBUFksQ0FDWjtBQWlDQTs7QUFDQSxXQTFCQSxLQUFDQSxPQUFELEdBQVd1QixPQUFPSSxVQUFQLENBQWtCLEtBQUN6QixPQUFuQixFQUE0QkYsT0FBNUIsQ0EwQlg7QUFuQ1k7QUFSZCxDQURGOztBQW9CQTRCLEVBQUVDLE9BQUYsQ0FBVS9CLE1BQU1DLGlCQUFoQixFQUFtQyxTQUFuQyxFQUE4QyxjQUE5QyxnQiIsImZpbGUiOiIvc2VydmVyL3BlcmlvZGljLmV4ZWN1dGlvbi5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5wZXJpb2RpY0V4ZWN1dGlvbiA9XG4gIHRpbWVvdXQ6IG51bGxcbiAgbmVhcmVzdEV4ZWN1dGluZ0F0OiBudWxsXG4gIGV4ZWN1dGU6IC0+XG4gICAgc2hhcmUuUXVlcmllcy5maW5kKHtleGVjdXRpbmdBdDogeyRsdGU6IG5ldyBEYXRlKCl9fSkuZm9yRWFjaCAocXVlcnkpIC0+XG4jICAgICAgY2wgXCJleGVjdXRpbmdcIiArIHF1ZXJ5Lm5hbWUgKyBcIiBhdCBcIiArIG5ldyBEYXRlKCkgKyBcIiByZXF1ZXN0ZWQgYXQgXCIgKyBxdWVyeS5leGVjdXRpbmdBdFxuICAgICAgZXhlY3V0aW5nQXQgPSBuZXcgRGF0ZShuZXcgRGF0ZSgpLmdldFRpbWUoKSArIHF1ZXJ5LmV4ZWN1dGluZ0ludGVydmFsKVxuICAgICAgc2hhcmUuUXVlcmllcy51cGRhdGUocXVlcnkuX2lkLCB7JHNldDoge2lzSW5wdXRTdGFsZTogdHJ1ZSwgaXNPdXRwdXRTdGFsZTogdHJ1ZSwgZXhlY3V0aW5nQXQ6IGV4ZWN1dGluZ0F0fX0sIHtza2lwUmVzZXRUaW1lb3V0OiB0cnVlfSlcbiAgICBAcmVzZXRUaW1lb3V0KClcbiAgcmVzZXRUaW1lb3V0OiAtPlxuICAgIG5lYXJlc3RRdWVyeSA9IHNoYXJlLlF1ZXJpZXMuZmluZE9uZSh7ZXhlY3V0aW5nQXQ6IHskbmU6IG51bGx9fSwge3NvcnQ6IHtleGVjdXRpbmdBdDogMX19KVxuICAgIHRpbWVvdXQgPSAzMCAqIDEwMDBcbiAgICBpZiBuZWFyZXN0UXVlcnlcbiAgICAgIHRpbWVvdXQgPSBuZWFyZXN0UXVlcnkuZXhlY3V0aW5nQXQuZ2V0VGltZSgpIC0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICBpZiBAdGltZW91dFxuICAgICAgTWV0ZW9yLmNsZWFyVGltZW91dChAdGltZW91dClcbiAgICB0aW1lb3V0ID0gTWF0aC5tYXgoMTAwMCwgdGltZW91dCkgIyBhdCBsZWFzdCBhIHNlY29uZCBpbiBmdXR1cmU7IHByb3RlY3Rpb24gZnJvbSBzdGF0ZSB3aXRoIGV4ZWN1dGluZ0F0IGluIHRoZSBwYXN0XG4jICAgIGNsIFwicmVzZXRUaW1lb3V0IHRvIFwiICsgdGltZW91dFxuICAgIEB0aW1lb3V0ID0gTWV0ZW9yLnNldFRpbWVvdXQoQGV4ZWN1dGUsIHRpbWVvdXQpXG5cbl8uYmluZEFsbChzaGFyZS5wZXJpb2RpY0V4ZWN1dGlvbiwgXCJleGVjdXRlXCIsIFwicmVzZXRUaW1lb3V0XCIpXG4iXX0=
