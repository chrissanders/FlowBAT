(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.IPSets.before.update(function(userId, ipset, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, ["contents"]).length) {
    modifier.$set = modifier.$set || {};
    return modifier.$set.isOutputStale = true;
  }
});

})();

//# sourceMappingURL=ipsets.hooks.coffee.js.map
