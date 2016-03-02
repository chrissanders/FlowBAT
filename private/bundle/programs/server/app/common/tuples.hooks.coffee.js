(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Tuples.before.update(function(userId, tuple, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, ["contents"]).length) {
    modifier.$set = modifier.$set || {};
    return modifier.$set.isOutputStale = true;
  }
});

})();

//# sourceMappingURL=tuples.hooks.coffee.js.map
