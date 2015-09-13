(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Queries.after.remove(function(userId, query) {
  return Meteor.users.update({
    "profile.dashboardQueryIds": query._id
  }, {
    $pull: {
      "profile.dashboardQueryIds": query._id
    }
  }, {
    multi: true
  });
});

})();

//# sourceMappingURL=queries.hooks.coffee.js.map
