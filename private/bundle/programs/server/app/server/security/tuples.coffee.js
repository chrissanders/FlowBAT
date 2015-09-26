(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Tuples.allow({
  insert: share.securityRulesWrapper(function(userId, tuple) {
    if (!userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    tuple._id = tuple._id || Random.id();
    tuple.ownerId = userId;
    check(tuple, {
      _id: Match.App.Id,
      name: String,
      note: String,
      contents: String,
      isOutputStale: Boolean,
      isNew: Boolean,
      ownerId: Match.App.UserId,
      updatedAt: Date,
      createdAt: Date
    });
    if (!tuple.name) {
      throw new Match.Error("Name required");
    }
    if (!tuple.contents) {
      throw new Match.Error("Contents required");
    }
    return true;
  }),
  update: share.securityRulesWrapper(function(userId, tuple, fieldNames, modifier, options) {
    var $set;
    if (!userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    if (userId !== tuple.ownerId) {
      throw new Match.Error("Operation not allowed for non-owners");
    }
    $set = {
      name: Match.Optional(String),
      note: Match.Optional(String),
      contents: Match.Optional(String),
      isOutputStale: Match.Optional(Boolean),
      isNew: Match.Optional(Match.App.isNewUpdate(tuple.isNew)),
      updatedAt: Date
    };
    check(modifier, {
      $set: $set
    });
    if (modifier.$set && _.has(modifier.$set, "name") && !modifier.$set.name) {
      throw new Match.Error("Name required");
    }
    if (modifier.$set && _.has(modifier.$set, "contents") && !modifier.$set.contents) {
      throw new Match.Error("Contents required");
    }
    return true;
  }),
  remove: share.securityRulesWrapper(function(userId, tuple) {
    if (!userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    if (userId !== tuple.ownerId) {
      throw new Match.Error("Operation not allowed for non-owners");
    }
    return true;
  })
});

})();

//# sourceMappingURL=tuples.coffee.js.map
