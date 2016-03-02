(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.publish("currentUser", function() {
  if (!this.userId) {
    return [];
  }
  return Meteor.users.find({
    _id: this.userId
  }, {
    fields: {
      "group": 1,
      "emails": 1,
      "profile": 1,
      "status": 1,
      "createdAt": 1
    }
  });
});

Meteor.publish("users", function() {
  if (!this.userId) {
    return [];
  }
  if (share.Security.hasRole(this.userId, "admin")) {
    return Meteor.users.find({}, {
      fields: {
        "group": 1,
        "emails": 1,
        "profile": 1,
        "status": 1,
        "createdAt": 1
      }
    });
  } else {
    return [];
  }
});

Meteor.publish("configs", function() {
  var config;
  if (!this.userId) {
    config = share.Configs.findOne();
    if (config && !config.isSetupComplete) {
      return share.Configs.find();
    }
    return [];
  }
  if (share.Security.hasRole(this.userId, "admin")) {
    return share.Configs.find();
  } else {
    return [];
  }
});

Meteor.publish("queries", function() {
  if (!this.userId) {
    return [];
  }
  return share.Queries.find({
    ownerId: this.userId
  });
});

Meteor.publish("ipsets", function() {
  if (!this.userId) {
    return [];
  }
  return share.IPSets.find({
    ownerId: this.userId
  });
});

Meteor.publish("tuples", function() {
  if (!this.userId) {
    return [];
  }
  return share.Tuples.find({
    ownerId: this.userId
  });
});

})();

//# sourceMappingURL=publications.coffee.js.map
