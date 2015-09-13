(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var insertData,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

share.fixtureIds = [];

insertData = function(data, collection) {
  var object, _id;
  for (_id in data) {
    if (__indexOf.call(share.fixtureIds, _id) < 0) {
      share.fixtureIds.push(_id);
    }
  }
  if (collection.find().count() === 0) {
    for (_id in data) {
      object = data[_id];
      object._id = _id;
      object.isNew = false;
      collection.insert(object);
    }
    return true;
  }
};

share.loadFixtures = function() {
  if (Meteor.settings.isLoadingFixtures) {
    return share.loadFixturesForCompleteSetup();
  } else {
    return share.loadFixturesForIncompleteSetup();
  }
};

share.loadFixturesForCompleteSetup = function() {
  var configs, executingInterval, ipsets, lastWeek, now, queries, query, user, users, usersInserted, _id;
  now = new Date();
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  configs = {
    Default: {
      isSetupComplete: true,
      isSSH: true,
      host: "50.116.29.253",
      port: "22",
      user: "denis",
      identityFile: "",
      siteConfigFile: "/usr/local/etc/silk.conf",
      dataRootdir: "/data",
      dataTempdir: "/tmp"
    }
  };
  insertData(configs, share.Configs);
  users = {
    ChrisSanders: {
      profile: {
        name: "Chris Sanders"
      },
      group: "admin"
    },
    DenisGorbachev: {
      profile: {
        name: "Denis Gorbachev"
      },
      group: "admin"
    }
  };
  for (_id in users) {
    user = users[_id];
    _.defaults(user, {
      emails: [
        {
          address: _id.toLowerCase() + "@flowbat.com",
          verified: true
        }
      ],
      services: {
        resume: {
          loginTokens: [
            {
              "hashedToken": Accounts._hashLoginToken(_id),
              "when": now
            }
          ]
        }
      },
      createdAt: lastWeek
    });
  }
  usersInserted = insertData(users, Meteor.users);
  if (usersInserted) {
    for (_id in users) {
      user = users[_id];
      Accounts.setPassword(_id, "123123");
    }
  }
  queries = {
    Dashboard1: {
      name: "Dashboard query",
      cmd: "--sensor=S0 --type=all --sport=80",
      exclusionsCmd: "--daddress=192.168.0.1 OR --scc=au",
      sportEnabled: true,
      sport: "80",
      ownerId: "ChrisSanders"
    },
    RwstatsTest: {
      name: "Rwstats query",
      "interface": "builder",
      cmd: "--sensor=S0 --type=all --sport=80",
      sportEnabled: true,
      sport: "80",
      output: "rwstats",
      rwstatsFields: ["sIP"],
      rwstatsValues: ["Records", "dIP", "dPort"],
      ownerId: "ChrisSanders"
    },
    RwcountTest: {
      name: "Rwcount query",
      "interface": "builder",
      cmd: "--sensor=S0 --type=all --sport=80",
      sportEnabled: true,
      sport: "80",
      output: "rwcount",
      rwcountBinSizeEnabled: true,
      rwcountBinSize: "10",
      rwcountLoadSchemeEnabled: true,
      rwcountLoadScheme: "0",
      ownerId: "ChrisSanders"
    }
  };
  for (_id in queries) {
    query = queries[_id];
    _.extend(query, {
      startDateEnabled: false,
      startDate: ""
    });
  }
  for (_id in queries) {
    if (__indexOf.call(share.fixtureIds, _id) < 0) {
      share.fixtureIds.push(_id);
    }
  }
  if (share.Queries.find().count() === 0) {
    for (_id in queries) {
      query = queries[_id];
      query._id = _id;
      query.isNew = false;
      _id = share.Queries.insert(query);
      query = share.Queries.findOne(_id);
      share.Queries.update(_id, {
        $set: {
          isOutputStale: true
        }
      });
    }
    executingInterval = 5 * share.minute;
    share.Queries.update("Dashboard1", {
      $set: {
        executingInterval: executingInterval
      }
    });
    Meteor.users.update("ChrisSanders", {
      $set: {
        "profile.dashboardQueryIds": ["Dashboard1"]
      }
    });
  }
  ipsets = {
    Local: {
      name: "Local addresses",
      note: "John asked to create this",
      contents: "192.168.0.1\n192.168.0.2\n192.168.0.3",
      ownerId: "ChrisSanders"
    },
    DNS: {
      name: "DNS addresses",
      note: "For testing purposes",
      contents: "8.8.8.8\n8.8.4.4\n208.67.222.222\n208.67.220.220",
      ownerId: "ChrisSanders"
    }
  };
  return insertData(ipsets, share.IPSets);
};

share.loadFixturesForIncompleteSetup = function() {
  var configs;
  configs = {
    Default: {
      isSetupComplete: false
    }
  };
  return insertData(configs, share.Configs);
};

})();

//# sourceMappingURL=fixtures.coffee.js.map
