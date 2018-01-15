(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/fixtures.coffee                                              //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var insertData,                                                        // 1
    indexOf = [].indexOf;                                              // 1
share.fixtureIds = [];                                                 // 1
                                                                       //
insertData = function (data, collection) {                             // 3
  var _id, object;                                                     // 4
                                                                       //
  for (_id in data) {                                                  // 4
    if (indexOf.call(share.fixtureIds, _id) < 0) {                     // 9
      share.fixtureIds.push(_id);                                      // 5
    }                                                                  // 11
  }                                                                    // 4
                                                                       //
  if (collection.find().count() === 0) {                               // 6
    for (_id in data) {                                                // 7
      object = data[_id];                                              // 15
      object._id = _id;                                                // 8
      object.isNew = false;                                            // 9
      collection.insert(object);                                       // 10
    }                                                                  // 7
                                                                       //
    return true;                                                       // 11
  }                                                                    // 21
};                                                                     // 3
                                                                       //
share.loadFixtures = function () {                                     // 13
  if (Meteor.settings.isLoadingFixtures) {                             // 14
    return share.loadFixturesForCompleteSetup();                       // 26
  } else {                                                             // 14
    return share.loadFixturesForIncompleteSetup();                     // 28
  }                                                                    // 29
};                                                                     // 13
                                                                       //
share.loadFixturesForCompleteSetup = function () {                     // 19
  var _id, configs, executingInterval, ipsets, lastWeek, now, queries, query, user, users, usersInserted;
                                                                       //
  now = new Date();                                                    // 20
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000);           // 21
  configs = {                                                          // 23
    Default: {                                                         // 24
      isSetupComplete: true,                                           // 25
      isSSH: true,                                                     // 26
      host: "50.116.29.253",                                           // 27
      port: "22",                                                      // 28
      user: "denis",                                                   // 29
      identityFile: "",                                                // 30
      siteConfigFile: "/usr/local/etc/silk.conf",                      // 31
      dataRootdir: "/data",                                            // 32
      dataTempdir: "/tmp"                                              // 33
    }                                                                  // 25
  };                                                                   // 24
  insertData(configs, share.Configs);                                  // 34
  users = {                                                            // 36
    ChrisSanders: {                                                    // 37
      profile: {                                                       // 38
        name: "Chris Sanders"                                          // 39
      },                                                               // 39
      //        timezone: 240 # US, Charleston                         // 55
      group: "admin"                                                   // 41
    },                                                                 // 38
    DenisGorbachev: {                                                  // 42
      profile: {                                                       // 43
        name: "Denis Gorbachev"                                        // 44
      },                                                               // 44
      //        timezone: -240 # Russia, Moscow                        // 62
      group: "admin"                                                   // 46
    }                                                                  // 43
  };                                                                   // 37
                                                                       //
  for (_id in users) {                                                 // 47
    user = users[_id];                                                 // 67
                                                                       //
    _.defaults(user, {                                                 // 48
      emails: [{                                                       // 49
        address: _id.toLowerCase() + "@flowbat.com",                   // 51
        verified: true                                                 // 52
      }],                                                              // 50
      services: {                                                      // 55
        resume: {                                                      // 56
          loginTokens: [{                                              // 57
            "hashedToken": Accounts._hashLoginToken(_id),              // 59
            "when": now                                                // 60
          }]                                                           // 58
        }                                                              // 57
      },                                                               // 56
      createdAt: lastWeek                                              // 63
    });                                                                // 49
  }                                                                    // 47
                                                                       //
  usersInserted = insertData(users, Meteor.users);                     // 65
                                                                       //
  if (usersInserted) {                                                 // 66
    for (_id in users) {                                               // 67
      user = users[_id];                                               // 91
      Accounts.setPassword(_id, "123123");                             // 68
    }                                                                  // 66
  }                                                                    // 94
                                                                       //
  queries = {                                                          // 70
    Dashboard1: {                                                      // 71
      name: "Dashboard query",                                         // 72
      cmd: "--sensor=S0 --type=all --sport=80",                        // 73
      exclusionsCmd: "--daddress=192.168.0.1 OR --scc=au",             // 74
      sportEnabled: true,                                              // 75
      sport: "80",                                                     // 76
      ownerId: "ChrisSanders"                                          // 77
    },                                                                 // 72
    RwstatsTest: {                                                     // 78
      name: "Rwstats query",                                           // 79
      interface: "builder",                                            // 80
      cmd: "--sensor=S0 --type=all --sport=80",                        // 81
      sportEnabled: true,                                              // 82
      sport: "80",                                                     // 83
      output: "rwstats",                                               // 84
      rwstatsFields: ["sIP"],                                          // 85
      rwstatsValues: ["Records", "dIP", "dPort"],                      // 86
      ownerId: "ChrisSanders"                                          // 87
    },                                                                 // 79
    RwcountTest: {                                                     // 88
      name: "Rwcount query",                                           // 89
      interface: "builder",                                            // 90
      cmd: "--sensor=S0 --type=all --sport=80",                        // 91
      sportEnabled: true,                                              // 92
      sport: "80",                                                     // 93
      output: "rwcount",                                               // 94
      rwcountBinSizeEnabled: true,                                     // 95
      rwcountBinSize: "10",                                            // 96
      rwcountLoadSchemeEnabled: true,                                  // 97
      rwcountLoadScheme: "0",                                          // 98
      ownerId: "ChrisSanders"                                          // 99
    }                                                                  // 89
  };                                                                   // 71
                                                                       //
  for (_id in queries) {                                               // 100
    query = queries[_id];                                              // 130
                                                                       //
    _.extend(query, {                                                  // 101
      startDateEnabled: false,                                         // 102
      startDate: ""                                                    // 103
    });                                                                // 102
  }                                                                    // 100
                                                                       //
  for (_id in queries) {                                               // 105
    if (indexOf.call(share.fixtureIds, _id) < 0) {                     // 137
      share.fixtureIds.push(_id);                                      // 106
    }                                                                  // 139
  }                                                                    // 105
                                                                       //
  if (share.Queries.find().count() === 0) {                            // 107
    for (_id in queries) {                                             // 108
      query = queries[_id];                                            // 143
      query._id = _id;                                                 // 109
      query.isNew = false;                                             // 110
      _id = share.Queries.insert(query);                               // 111
      query = share.Queries.findOne(_id);                              // 112
      share.Queries.update(_id, {                                      // 113
        $set: {                                                        // 113
          isOutputStale: true                                          // 113
        }                                                              // 113
      });                                                              // 113
    }                                                                  // 108
                                                                       //
    executingInterval = 5 * share.minute; //    executingInterval /= 5 * 12 # debug
                                                                       //
    share.Queries.update("Dashboard1", {                               // 116
      $set: {                                                          // 116
        executingInterval: executingInterval                           // 116
      }                                                                // 116
    });                                                                // 116
    Meteor.users.update("ChrisSanders", {                              // 117
      $set: {                                                          // 117
        "profile.dashboardQueryIds": ["Dashboard1"]                    // 117
      }                                                                // 117
    });                                                                // 117
  }                                                                    // 166
                                                                       //
  ipsets = {                                                           // 119
    Local: {                                                           // 120
      name: "Local addresses",                                         // 121
      note: "John asked to create this",                               // 122
      contents: "192.168.0.1\n192.168.0.2\n192.168.0.3",               // 123
      ownerId: "ChrisSanders"                                          // 128
    },                                                                 // 121
    DNS: {                                                             // 129
      name: "DNS addresses",                                           // 130
      note: "For testing purposes",                                    // 131
      contents: "8.8.8.8\n8.8.4.4\n208.67.222.222\n208.67.220.220",    // 132
      ownerId: "ChrisSanders"                                          // 138
    }                                                                  // 130
  };                                                                   // 120
  return insertData(ipsets, share.IPSets);                             // 181
}; //  serviceConfigurations = {}                                      // 19
//  insertData(serviceConfigurations, ServiceConfiguration.configurations)
                                                                       //
                                                                       //
share.loadFixturesForIncompleteSetup = function () {                   // 145
  var configs;                                                         // 146
  configs = {                                                          // 146
    Default: {                                                         // 147
      isSetupComplete: false                                           // 148
    }                                                                  // 148
  };                                                                   // 147
  return insertData(configs, share.Configs);                           // 193
};                                                                     // 145
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/fixtures.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2ZpeHR1cmVzLmNvZmZlZSJdLCJuYW1lcyI6WyJpbnNlcnREYXRhIiwiaW5kZXhPZiIsInNoYXJlIiwiZml4dHVyZUlkcyIsImRhdGEiLCJjb2xsZWN0aW9uIiwiX2lkIiwib2JqZWN0IiwiY2FsbCIsInB1c2giLCJmaW5kIiwiY291bnQiLCJpc05ldyIsImluc2VydCIsImxvYWRGaXh0dXJlcyIsIk1ldGVvciIsInNldHRpbmdzIiwiaXNMb2FkaW5nRml4dHVyZXMiLCJsb2FkRml4dHVyZXNGb3JDb21wbGV0ZVNldHVwIiwibG9hZEZpeHR1cmVzRm9ySW5jb21wbGV0ZVNldHVwIiwiY29uZmlncyIsImV4ZWN1dGluZ0ludGVydmFsIiwiaXBzZXRzIiwibGFzdFdlZWsiLCJub3ciLCJxdWVyaWVzIiwicXVlcnkiLCJ1c2VyIiwidXNlcnMiLCJ1c2Vyc0luc2VydGVkIiwiRGF0ZSIsImdldFRpbWUiLCJEZWZhdWx0IiwiaXNTZXR1cENvbXBsZXRlIiwiaXNTU0giLCJob3N0IiwicG9ydCIsImlkZW50aXR5RmlsZSIsInNpdGVDb25maWdGaWxlIiwiZGF0YVJvb3RkaXIiLCJkYXRhVGVtcGRpciIsIkNvbmZpZ3MiLCJDaHJpc1NhbmRlcnMiLCJwcm9maWxlIiwibmFtZSIsImdyb3VwIiwiRGVuaXNHb3JiYWNoZXYiLCJfIiwiZGVmYXVsdHMiLCJlbWFpbHMiLCJhZGRyZXNzIiwidG9Mb3dlckNhc2UiLCJ2ZXJpZmllZCIsInNlcnZpY2VzIiwicmVzdW1lIiwibG9naW5Ub2tlbnMiLCJBY2NvdW50cyIsIl9oYXNoTG9naW5Ub2tlbiIsImNyZWF0ZWRBdCIsInNldFBhc3N3b3JkIiwiRGFzaGJvYXJkMSIsImNtZCIsImV4Y2x1c2lvbnNDbWQiLCJzcG9ydEVuYWJsZWQiLCJzcG9ydCIsIm93bmVySWQiLCJSd3N0YXRzVGVzdCIsImludGVyZmFjZSIsIm91dHB1dCIsInJ3c3RhdHNGaWVsZHMiLCJyd3N0YXRzVmFsdWVzIiwiUndjb3VudFRlc3QiLCJyd2NvdW50QmluU2l6ZUVuYWJsZWQiLCJyd2NvdW50QmluU2l6ZSIsInJ3Y291bnRMb2FkU2NoZW1lRW5hYmxlZCIsInJ3Y291bnRMb2FkU2NoZW1lIiwiZXh0ZW5kIiwic3RhcnREYXRlRW5hYmxlZCIsInN0YXJ0RGF0ZSIsIlF1ZXJpZXMiLCJmaW5kT25lIiwidXBkYXRlIiwiJHNldCIsImlzT3V0cHV0U3RhbGUiLCJtaW51dGUiLCJMb2NhbCIsIm5vdGUiLCJjb250ZW50cyIsIkROUyIsIklQU2V0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsSUFBQUEsVUFBQTtBQUFBLElBQUFDLFVBQUEsR0FBQUEsT0FBQTtBQUFBQyxNQUFNQyxVQUFOLEdBQW1CLEVBQW5COztBQUVBSCxhQUFhLFVBQUNJLElBQUQsRUFBT0MsVUFBUDtBQUNYLE1BQUFDLEdBQUEsRUFBQUMsTUFBQTs7QUFBQSxPQUFBRCxHQUFBLElBQUFGLElBQUE7QUFLRSxRQUxtQkgsUUFBQU8sSUFBQSxDQUFXTixNQUFNQyxVQUFqQixFQUFBRyxHQUFBLEtBS25CLEVBTG1CO0FBQ25CSixZQUFNQyxVQUFOLENBQWlCTSxJQUFqQixDQUFzQkgsR0FBdEI7QUFNQztBQVBIOztBQUVBLE1BQUdELFdBQVdLLElBQVgsR0FBa0JDLEtBQWxCLE9BQTZCLENBQWhDO0FBQ0UsU0FBQUwsR0FBQSxJQUFBRixJQUFBO0FBUUVHLGVBQVNILEtBQUtFLEdBQUwsQ0FBVDtBQVBBQyxhQUFPRCxHQUFQLEdBQWFBLEdBQWI7QUFDQUMsYUFBT0ssS0FBUCxHQUFlLEtBQWY7QUFDQVAsaUJBQVdRLE1BQVgsQ0FBa0JOLE1BQWxCO0FBSEY7O0FBSUEsV0FBTyxJQUFQO0FBVUQ7QUFsQlUsQ0FBYjs7QUFVQUwsTUFBTVksWUFBTixHQUFxQjtBQUNuQixNQUFHQyxPQUFPQyxRQUFQLENBQWdCQyxpQkFBbkI7QUFZRSxXQVhBZixNQUFNZ0IsNEJBQU4sRUFXQTtBQVpGO0FBY0UsV0FYQWhCLE1BQU1pQiw4QkFBTixFQVdBO0FB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ekMsWUFBTSxpQkFBTjtBQUNBMEMsWUFBTSwyQkFETjtBQUVBQyxnQkFBVSx1Q0FGVjtBQU9BdEIsZUFBUztBQVBULEtBREY7QUFTQXVCLFNBQ0U7QUFBQTVDLFlBQU0sZUFBTjtBQUNBMEMsWUFBTSxzQkFETjtBQUVBQyxnQkFBVSxrREFGVjtBQVFBdEIsZUFBUztBQVJUO0FBVkYsR0FERjtBQThEQSxTQTFDQWpFLFdBQVdzQixNQUFYLEVBQW1CcEIsTUFBTXVGLE1BQXpCLENBMENBO0FBbEttQyxDQUFyQyxDLENBcUtBO0FBQ0E7OztBQXhDQXZGLE1BQU1pQiw4QkFBTixHQUF1QztBQUNyQyxNQUFBQyxPQUFBO0FBQUFBLFlBQ0U7QUFBQVksYUFDRTtBQUFBQyx1QkFBaUI7QUFBakI7QUFERixHQURGO0FBK0NBLFNBNUNBakMsV0FBV29CLE9BQVgsRUFBb0JsQixNQUFNdUMsT0FBMUIsQ0E0Q0E7QUFoRHFDLENBQXZDLDRFIiwiZmlsZSI6Ii9zZXJ2ZXIvZml4dHVyZXMuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsic2hhcmUuZml4dHVyZUlkcyA9IFtdXG5cbmluc2VydERhdGEgPSAoZGF0YSwgY29sbGVjdGlvbikgLT5cbiAgZm9yIF9pZCBvZiBkYXRhIHdoZW4gX2lkIG5vdCBpbiBzaGFyZS5maXh0dXJlSWRzXG4gICAgc2hhcmUuZml4dHVyZUlkcy5wdXNoKF9pZClcbiAgaWYgY29sbGVjdGlvbi5maW5kKCkuY291bnQoKSBpcyAwXG4gICAgZm9yIF9pZCwgb2JqZWN0IG9mIGRhdGFcbiAgICAgIG9iamVjdC5faWQgPSBfaWRcbiAgICAgIG9iamVjdC5pc05ldyA9IGZhbHNlXG4gICAgICBjb2xsZWN0aW9uLmluc2VydChvYmplY3QpXG4gICAgcmV0dXJuIHRydWVcblxuc2hhcmUubG9hZEZpeHR1cmVzID0gLT5cbiAgaWYgTWV0ZW9yLnNldHRpbmdzLmlzTG9hZGluZ0ZpeHR1cmVzXG4gICAgc2hhcmUubG9hZEZpeHR1cmVzRm9yQ29tcGxldGVTZXR1cCgpXG4gIGVsc2VcbiAgICBzaGFyZS5sb2FkRml4dHVyZXNGb3JJbmNvbXBsZXRlU2V0dXAoKVxuXG5zaGFyZS5sb2FkRml4dHVyZXNGb3JDb21wbGV0ZVNldHVwID0gLT5cbiAgbm93ID0gbmV3IERhdGUoKVxuICBsYXN0V2VlayA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSA3ICogMjQgKiAzNjAwICogMTAwMClcblxuICBjb25maWdzID1cbiAgICBEZWZhdWx0OlxuICAgICAgaXNTZXR1cENvbXBsZXRlOiB0cnVlXG4gICAgICBpc1NTSDogdHJ1ZVxuICAgICAgaG9zdDogXCI1MC4xMTYuMjkuMjUzXCJcbiAgICAgIHBvcnQ6IFwiMjJcIlxuICAgICAgdXNlcjogXCJkZW5pc1wiXG4gICAgICBpZGVudGl0eUZpbGU6IFwiXCJcbiAgICAgIHNpdGVDb25maWdGaWxlOiBcIi91c3IvbG9jYWwvZXRjL3NpbGsuY29uZlwiXG4gICAgICBkYXRhUm9vdGRpcjogXCIvZGF0YVwiXG4gICAgICBkYXRhVGVtcGRpcjogXCIvdG1wXCJcbiAgaW5zZXJ0RGF0YShjb25maWdzLCBzaGFyZS5Db25maWdzKVxuXG4gIHVzZXJzID1cbiAgICBDaHJpc1NhbmRlcnM6XG4gICAgICBwcm9maWxlOlxuICAgICAgICBuYW1lOiBcIkNocmlzIFNhbmRlcnNcIlxuIyAgICAgICAgdGltZXpvbmU6IDI0MCAjIFVTLCBDaGFybGVzdG9uXG4gICAgICBncm91cDogXCJhZG1pblwiXG4gICAgRGVuaXNHb3JiYWNoZXY6XG4gICAgICBwcm9maWxlOlxuICAgICAgICBuYW1lOiBcIkRlbmlzIEdvcmJhY2hldlwiXG4jICAgICAgICB0aW1lem9uZTogLTI0MCAjIFJ1c3NpYSwgTW9zY293XG4gICAgICBncm91cDogXCJhZG1pblwiXG4gIGZvciBfaWQsIHVzZXIgb2YgdXNlcnNcbiAgICBfLmRlZmF1bHRzKHVzZXIsXG4gICAgICBlbWFpbHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFkZHJlc3M6IF9pZC50b0xvd2VyQ2FzZSgpICsgXCJAZmxvd2JhdC5jb21cIlxuICAgICAgICAgIHZlcmlmaWVkOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICAgIHNlcnZpY2VzOlxuICAgICAgICByZXN1bWU6XG4gICAgICAgICAgbG9naW5Ub2tlbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJoYXNoZWRUb2tlblwiOiBBY2NvdW50cy5faGFzaExvZ2luVG9rZW4oX2lkKSxcbiAgICAgICAgICAgICAgXCJ3aGVuXCI6IG5vd1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIGNyZWF0ZWRBdDogbGFzdFdlZWtcbiAgICApXG4gIHVzZXJzSW5zZXJ0ZWQgPSBpbnNlcnREYXRhKHVzZXJzLCBNZXRlb3IudXNlcnMpXG4gIGlmIHVzZXJzSW5zZXJ0ZWRcbiAgICBmb3IgX2lkLCB1c2VyIG9mIHVzZXJzXG4gICAgICBBY2NvdW50cy5zZXRQYXNzd29yZChfaWQsIFwiMTIzMTIzXCIpXG5cbiAgcXVlcmllcyA9XG4gICAgRGFzaGJvYXJkMTpcbiAgICAgIG5hbWU6IFwiRGFzaGJvYXJkIHF1ZXJ5XCJcbiAgICAgIGNtZDogXCItLXNlbnNvcj1TMCAtLXR5cGU9YWxsIC0tc3BvcnQ9ODBcIlxuICAgICAgZXhjbHVzaW9uc0NtZDogXCItLWRhZGRyZXNzPTE5Mi4xNjguMC4xIE9SIC0tc2NjPWF1XCJcbiAgICAgIHNwb3J0RW5hYmxlZDogdHJ1ZVxuICAgICAgc3BvcnQ6IFwiODBcIlxuICAgICAgb3duZXJJZDogXCJDaHJpc1NhbmRlcnNcIlxuICAgIFJ3c3RhdHNUZXN0OlxuICAgICAgbmFtZTogXCJSd3N0YXRzIHF1ZXJ5XCJcbiAgICAgIGludGVyZmFjZTogXCJidWlsZGVyXCJcbiAgICAgIGNtZDogXCItLXNlbnNvcj1TMCAtLXR5cGU9YWxsIC0tc3BvcnQ9ODBcIlxuICAgICAgc3BvcnRFbmFibGVkOiB0cnVlXG4gICAgICBzcG9ydDogXCI4MFwiXG4gICAgICBvdXRwdXQ6IFwicndzdGF0c1wiXG4gICAgICByd3N0YXRzRmllbGRzOiBbXCJzSVBcIl1cbiAgICAgIHJ3c3RhdHNWYWx1ZXM6IFtcIlJlY29yZHNcIiwgXCJkSVBcIiwgXCJkUG9ydFwiXVxuICAgICAgb3duZXJJZDogXCJDaHJpc1NhbmRlcnNcIlxuICAgIFJ3Y291bnRUZXN0OlxuICAgICAgbmFtZTogXCJSd2NvdW50IHF1ZXJ5XCJcbiAgICAgIGludGVyZmFjZTogXCJidWlsZGVyXCJcbiAgICAgIGNtZDogXCItLXNlbnNvcj1TMCAtLXR5cGU9YWxsIC0tc3BvcnQ9ODBcIlxuICAgICAgc3BvcnRFbmFibGVkOiB0cnVlXG4gICAgICBzcG9ydDogXCI4MFwiXG4gICAgICBvdXRwdXQ6IFwicndjb3VudFwiXG4gICAgICByd2NvdW50QmluU2l6ZUVuYWJsZWQ6IHRydWVcbiAgICAgIHJ3Y291bnRCaW5TaXplOiBcIjEwXCJcbiAgICAgIHJ3Y291bnRMb2FkU2NoZW1lRW5hYmxlZDogdHJ1ZVxuICAgICAgcndjb3VudExvYWRTY2hlbWU6IFwiMFwiXG4gICAgICBvd25lcklkOiBcIkNocmlzU2FuZGVyc1wiXG4gIGZvciBfaWQsIHF1ZXJ5IG9mIHF1ZXJpZXNcbiAgICBfLmV4dGVuZChxdWVyeSxcbiAgICAgIHN0YXJ0RGF0ZUVuYWJsZWQ6IGZhbHNlXG4gICAgICBzdGFydERhdGU6IFwiXCJcbiAgICApXG4gIGZvciBfaWQgb2YgcXVlcmllcyB3aGVuIF9pZCBub3QgaW4gc2hhcmUuZml4dHVyZUlkc1xuICAgIHNoYXJlLmZpeHR1cmVJZHMucHVzaChfaWQpXG4gIGlmIHNoYXJlLlF1ZXJpZXMuZmluZCgpLmNvdW50KCkgaXMgMFxuICAgIGZvciBfaWQsIHF1ZXJ5IG9mIHF1ZXJpZXNcbiAgICAgIHF1ZXJ5Ll9pZCA9IF9pZFxuICAgICAgcXVlcnkuaXNOZXcgPSBmYWxzZVxuICAgICAgX2lkID0gc2hhcmUuUXVlcmllcy5pbnNlcnQocXVlcnkpXG4gICAgICBxdWVyeSA9IHNoYXJlLlF1ZXJpZXMuZmluZE9uZShfaWQpXG4gICAgICBzaGFyZS5RdWVyaWVzLnVwZGF0ZShfaWQsIHskc2V0OiB7aXNPdXRwdXRTdGFsZTogdHJ1ZX19KVxuICAgIGV4ZWN1dGluZ0ludGVydmFsID0gNSAqIHNoYXJlLm1pbnV0ZVxuIyAgICBleGVjdXRpbmdJbnRlcnZhbCAvPSA1ICogMTIgIyBkZWJ1Z1xuICAgIHNoYXJlLlF1ZXJpZXMudXBkYXRlKFwiRGFzaGJvYXJkMVwiLCB7JHNldDoge2V4ZWN1dGluZ0ludGVydmFsOiBleGVjdXRpbmdJbnRlcnZhbH19KVxuICAgIE1ldGVvci51c2Vycy51cGRhdGUoXCJDaHJpc1NhbmRlcnNcIiwgeyRzZXQ6IHtcInByb2ZpbGUuZGFzaGJvYXJkUXVlcnlJZHNcIjogW1wiRGFzaGJvYXJkMVwiXX19KVxuXG4gIGlwc2V0cyA9XG4gICAgTG9jYWw6XG4gICAgICBuYW1lOiBcIkxvY2FsIGFkZHJlc3Nlc1wiXG4gICAgICBub3RlOiBcIkpvaG4gYXNrZWQgdG8gY3JlYXRlIHRoaXNcIlxuICAgICAgY29udGVudHM6IFwiXCJcIlxuICAgICAgICAxOTIuMTY4LjAuMVxuICAgICAgICAxOTIuMTY4LjAuMlxuICAgICAgICAxOTIuMTY4LjAuM1xuICAgICAgXCJcIlwiXG4gICAgICBvd25lcklkOiBcIkNocmlzU2FuZGVyc1wiXG4gICAgRE5TOlxuICAgICAgbmFtZTogXCJETlMgYWRkcmVzc2VzXCJcbiAgICAgIG5vdGU6IFwiRm9yIHRlc3RpbmcgcHVycG9zZXNcIlxuICAgICAgY29udGVudHM6IFwiXCJcIlxuICAgICAgICA4LjguOC44XG4gICAgICAgIDguOC40LjRcbiAgICAgICAgMjA4LjY3LjIyMi4yMjJcbiAgICAgICAgMjA4LjY3LjIyMC4yMjBcbiAgICAgIFwiXCJcIlxuICAgICAgb3duZXJJZDogXCJDaHJpc1NhbmRlcnNcIlxuICBpbnNlcnREYXRhKGlwc2V0cywgc2hhcmUuSVBTZXRzKVxuXG5cbiMgIHNlcnZpY2VDb25maWd1cmF0aW9ucyA9IHt9XG4jICBpbnNlcnREYXRhKHNlcnZpY2VDb25maWd1cmF0aW9ucywgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMpXG5cbnNoYXJlLmxvYWRGaXh0dXJlc0ZvckluY29tcGxldGVTZXR1cCA9IC0+XG4gIGNvbmZpZ3MgPVxuICAgIERlZmF1bHQ6XG4gICAgICBpc1NldHVwQ29tcGxldGU6IGZhbHNlXG4gIGluc2VydERhdGEoY29uZmlncywgc2hhcmUuQ29uZmlncylcbiJdfQ==
