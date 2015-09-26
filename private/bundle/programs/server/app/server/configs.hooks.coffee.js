(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Configs.after.update(function(userId, config) {
  share.IPSets.update({}, {
    $set: {
      isOutputStale: true
    }
  }, {
    multi: true
  });
  return share.Tuples.update({}, {
    $set: {
      isOutputStale: true
    }
  }, {
    multi: true
  });
});

})();

//# sourceMappingURL=configs.hooks.coffee.js.map
