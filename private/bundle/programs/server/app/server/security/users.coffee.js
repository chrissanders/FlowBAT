(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.users.allow({
  insert: share.securityRulesWrapper(function(userId, user) {
    return false;
  }),
  update: share.securityRulesWrapper(function(userId, user, fieldNames, modifier) {
    if (!share.Security.hasRole(userId, "admin")) {
      throw new Match.Error("Operation not allowed for non admins");
    }
    return true;
  }),
  remove: share.securityRulesWrapper(function(userId, user) {
    if (!userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    if (userId === user._id) {
      throw new Match.Error("User can't remove himself");
    }
    if (!share.Security.hasRole(userId, "admin")) {
      throw new Match.Error("Operation not allowed for non admins");
    }
    return true;
  })
});

})();

//# sourceMappingURL=users.coffee.js.map
