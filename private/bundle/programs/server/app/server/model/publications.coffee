(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/model/publications.coffee                                    //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
//Meteor.publish "loginServiceConfigurationData", () ->                // 1
//  Accounts.loginServiceConfiguration.find({})                        // 2
Meteor.publish("currentUser", function () {                            // 4
  if (!this.userId) {                                                  // 5
    return [];                                                         // 5
  }                                                                    // 6
                                                                       //
  return Meteor.users.find({                                           // 7
    _id: this.userId                                                   // 6
  }, {                                                                 // 6
    fields: {                                                          // 7
      "group": 1,                                                      // 8
      "emails": 1,                                                     // 9
      "profile": 1,                                                    // 10
      "status": 1,                                                     // 11
      "createdAt": 1                                                   // 12
    }                                                                  // 8
  });                                                                  // 7
});                                                                    // 4
Meteor.publish("users", function () {                                  // 15
  if (!this.userId) {                                                  // 16
    return [];                                                         // 16
  }                                                                    // 23
                                                                       //
  if (share.Security.hasRole(this.userId, "admin")) {                  // 17
    return Meteor.users.find({}, {                                     // 25
      fields: {                                                        // 19
        "group": 1,                                                    // 20
        "emails": 1,                                                   // 21
        "profile": 1,                                                  // 22
        "status": 1,                                                   // 23
        "createdAt": 1                                                 // 24
      }                                                                // 20
    });                                                                // 19
  } else {                                                             // 17
    return [];                                                         // 35
  }                                                                    // 36
});                                                                    // 15
Meteor.publish("configs", function () {                                // 29
  var config;                                                          // 30
                                                                       //
  if (!this.userId) {                                                  // 30
    config = share.Configs.findOne();                                  // 31
                                                                       //
    if (config && !config.isSetupComplete) {                           // 32
      return share.Configs.find();                                     // 33
    }                                                                  // 45
                                                                       //
    return [];                                                         // 34
  }                                                                    // 47
                                                                       //
  if (share.Security.hasRole(this.userId, "admin")) {                  // 35
    return share.Configs.find();                                       // 36
  } else {                                                             // 35
    return [];                                                         // 38
  }                                                                    // 52
});                                                                    // 29
Meteor.publish("queries", function () {                                // 40
  if (!this.userId) {                                                  // 41
    return [];                                                         // 41
  }                                                                    // 58
                                                                       //
  return share.Queries.find({                                          // 59
    ownerId: this.userId                                               // 42
  });                                                                  // 42
});                                                                    // 40
Meteor.publish("ipsets", function () {                                 // 44
  if (!this.userId) {                                                  // 45
    return [];                                                         // 45
  }                                                                    // 67
                                                                       //
  return share.IPSets.find({                                           // 68
    ownerId: this.userId                                               // 46
  });                                                                  // 46
});                                                                    // 44
Meteor.publish("tuples", function () {                                 // 48
  if (!this.userId) {                                                  // 49
    return [];                                                         // 49
  }                                                                    // 76
                                                                       //
  return share.Tuples.find({                                           // 77
    ownerId: this.userId                                               // 50
  });                                                                  // 50
});                                                                    // 48
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/model/publications.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21vZGVsL3B1YmxpY2F0aW9ucy5jb2ZmZWUiXSwibmFtZXMiOlsiTWV0ZW9yIiwicHVibGlzaCIsInVzZXJJZCIsInVzZXJzIiwiZmluZCIsIl9pZCIsImZpZWxkcyIsInNoYXJlIiwiU2VjdXJpdHkiLCJoYXNSb2xlIiwiY29uZmlnIiwiQ29uZmlncyIsImZpbmRPbmUiLCJpc1NldHVwQ29tcGxldGUiLCJRdWVyaWVzIiwib3duZXJJZCIsIklQU2V0cyIsIlR1cGxlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUVBQSxPQUFPQyxPQUFQLENBQWUsYUFBZixFQUE4QjtBQUM1QixNQUFHLENBQUksS0FBQ0MsTUFBUjtBQUFvQixXQUFPLEVBQVA7QUFDbkI7O0FBQ0QsU0FEQUYsT0FBT0csS0FBUCxDQUFhQyxJQUFiLENBQWtCO0FBQUNDLFNBQUssS0FBQ0g7QUFBUCxHQUFsQixFQUNFO0FBQUFJLFlBQ0U7QUFBQSxlQUFTLENBQVQ7QUFDQSxnQkFBVSxDQURWO0FBRUEsaUJBQVcsQ0FGWDtBQUdBLGdCQUFVLENBSFY7QUFJQSxtQkFBYTtBQUpiO0FBREYsR0FERixDQUNBO0FBSEY7QUFXQU4sT0FBT0MsT0FBUCxDQUFlLE9BQWYsRUFBd0I7QUFDdEIsTUFBRyxDQUFJLEtBQUNDLE1BQVI7QUFBb0IsV0FBTyxFQUFQO0FBT25COztBQU5ELE1BQUdLLE1BQU1DLFFBQU4sQ0FBZUMsT0FBZixDQUF1QixLQUFDUCxNQUF4QixFQUFnQyxPQUFoQyxDQUFIO0FBUUUsV0FQQUYsT0FBT0csS0FBUCxDQUFhQyxJQUFiLENBQWtCLEVBQWxCLEVBQ0U7QUFBQUUsY0FDRTtBQUFBLGlCQUFTLENBQVQ7QUFDQSxrQkFBVSxDQURWO0FBRUEsbUJBQVcsQ0FGWDtBQUdBLGtCQUFVLENBSFY7QUFJQSxxQkFBYTtBQUpiO0FBREYsS0FERixDQU9BO0FBUkY7QUFrQkUsV0FSQSxFQVFBO0FBQ0Q7QUFyQkg7QUFjQU4sT0FBT0MsT0FBUCxDQUFlLFNBQWYsRUFBMEI7QUFDeEIsTUFBQVMsTUFBQTs7QUFBQSxNQUFHLENBQUksS0FBQ1IsTUFBUjtBQUNFUSxhQUFTSCxNQUFNSSxPQUFOLENBQWNDLE9BQWQsRUFBVDs7QUFDQSxRQUFHRixVQUFXLENBQUlBLE9BQU9HLGVBQXpCO0FBQ0UsYUFBT04sTUFBTUksT0FBTixDQUFjUCxJQUFkLEVBQVA7QUFZRDs7QUFYRCxXQUFPLEVBQVA7QUFhRDs7QUFaRCxNQUFHRyxNQUFNQyxRQUFOLENBQWVDLE9BQWYsQ0FBdUIsS0FBQ1AsTUFBeEIsRUFBZ0MsT0FBaEMsQ0FBSDtBQUNFLFdBQU9LLE1BQU1JLE9BQU4sQ0FBY1AsSUFBZCxFQUFQO0FBREY7QUFHRSxXQUFPLEVBQVA7QUFjRDtBQXZCSDtBQVdBSixPQUFPQyxPQUFQLENBQWUsU0FBZixFQUEwQjtBQUN4QixNQUFHLENBQUksS0FBQ0MsTUFBUjtBQUFvQixXQUFPLEVBQVA7QUFpQm5COztBQUNELFNBakJBSyxNQUFNTyxPQUFOLENBQWNWLElBQWQsQ0FBbUI7QUFBQ1csYUFBUyxLQUFDYjtBQUFYLEdBQW5CLENBaUJBO0FBbkJGO0FBSUFGLE9BQU9DLE9BQVAsQ0FBZSxRQUFmLEVBQXlCO0FBQ3ZCLE1BQUcsQ0FBSSxLQUFDQyxNQUFSO0FBQW9CLFdBQU8sRUFBUDtBQXNCbkI7O0FBQ0QsU0F0QkFLLE1BQU1TLE1BQU4sQ0FBYVosSUFBYixDQUFrQjtBQUFDVyxhQUFTLEtBQUNiO0FBQVgsR0FBbEIsQ0FzQkE7QUF4QkY7QUFJQUYsT0FBT0MsT0FBUCxDQUFlLFFBQWYsRUFBeUI7QUFDdkIsTUFBRyxDQUFJLEtBQUNDLE1BQVI7QUFBb0IsV0FBTyxFQUFQO0FBMkJuQjs7QUFDRCxTQTNCQUssTUFBTVUsTUFBTixDQUFhYixJQUFiLENBQWtCO0FBQUNXLGFBQVMsS0FBQ2I7QUFBWCxHQUFsQixDQTJCQTtBQTdCRiw0RSIsImZpbGUiOiIvc2VydmVyL21vZGVsL3B1YmxpY2F0aW9ucy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyIjTWV0ZW9yLnB1Ymxpc2ggXCJsb2dpblNlcnZpY2VDb25maWd1cmF0aW9uRGF0YVwiLCAoKSAtPlxuIyAgQWNjb3VudHMubG9naW5TZXJ2aWNlQ29uZmlndXJhdGlvbi5maW5kKHt9KVxuXG5NZXRlb3IucHVibGlzaCBcImN1cnJlbnRVc2VyXCIsICgpIC0+XG4gIGlmIG5vdCBAdXNlcklkIHRoZW4gcmV0dXJuIFtdXG4gIE1ldGVvci51c2Vycy5maW5kKHtfaWQ6IEB1c2VySWR9LFxuICAgIGZpZWxkczpcbiAgICAgIFwiZ3JvdXBcIjogMVxuICAgICAgXCJlbWFpbHNcIjogMVxuICAgICAgXCJwcm9maWxlXCI6IDFcbiAgICAgIFwic3RhdHVzXCI6IDFcbiAgICAgIFwiY3JlYXRlZEF0XCI6IDFcbiAgKVxuXG5NZXRlb3IucHVibGlzaCBcInVzZXJzXCIsIC0+XG4gIGlmIG5vdCBAdXNlcklkIHRoZW4gcmV0dXJuIFtdXG4gIGlmIHNoYXJlLlNlY3VyaXR5Lmhhc1JvbGUoQHVzZXJJZCwgXCJhZG1pblwiKVxuICAgIE1ldGVvci51c2Vycy5maW5kKHt9LFxuICAgICAgZmllbGRzOlxuICAgICAgICBcImdyb3VwXCI6IDFcbiAgICAgICAgXCJlbWFpbHNcIjogMVxuICAgICAgICBcInByb2ZpbGVcIjogMVxuICAgICAgICBcInN0YXR1c1wiOiAxXG4gICAgICAgIFwiY3JlYXRlZEF0XCI6IDFcbiAgICApXG4gIGVsc2VcbiAgICBbXVxuXG5NZXRlb3IucHVibGlzaCBcImNvbmZpZ3NcIiwgLT5cbiAgaWYgbm90IEB1c2VySWRcbiAgICBjb25maWcgPSBzaGFyZS5Db25maWdzLmZpbmRPbmUoKVxuICAgIGlmIGNvbmZpZyBhbmQgbm90IGNvbmZpZy5pc1NldHVwQ29tcGxldGVcbiAgICAgIHJldHVybiBzaGFyZS5Db25maWdzLmZpbmQoKVxuICAgIHJldHVybiBbXVxuICBpZiBzaGFyZS5TZWN1cml0eS5oYXNSb2xlKEB1c2VySWQsIFwiYWRtaW5cIilcbiAgICByZXR1cm4gc2hhcmUuQ29uZmlncy5maW5kKClcbiAgZWxzZVxuICAgIHJldHVybiBbXVxuXG5NZXRlb3IucHVibGlzaCBcInF1ZXJpZXNcIiwgLT5cbiAgaWYgbm90IEB1c2VySWQgdGhlbiByZXR1cm4gW11cbiAgc2hhcmUuUXVlcmllcy5maW5kKHtvd25lcklkOiBAdXNlcklkfSlcblxuTWV0ZW9yLnB1Ymxpc2ggXCJpcHNldHNcIiwgLT5cbiAgaWYgbm90IEB1c2VySWQgdGhlbiByZXR1cm4gW11cbiAgc2hhcmUuSVBTZXRzLmZpbmQoe293bmVySWQ6IEB1c2VySWR9KVxuXG5NZXRlb3IucHVibGlzaCBcInR1cGxlc1wiLCAtPlxuICBpZiBub3QgQHVzZXJJZCB0aGVuIHJldHVybiBbXVxuICBzaGFyZS5UdXBsZXMuZmluZCh7b3duZXJJZDogQHVzZXJJZH0pXG4iXX0=
