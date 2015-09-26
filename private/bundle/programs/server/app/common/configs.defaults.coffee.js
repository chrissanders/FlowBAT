(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var configPreSave;

configPreSave = function(userId, changes) {};

share.Configs.before.update(function(userId, config, fieldNames, modifier, options) {
  var now;
  now = new Date();
  modifier.$set = modifier.$set || {};
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;
  return configPreSave.call(this, userId, modifier.$set);
});

})();

//# sourceMappingURL=configs.defaults.coffee.js.map
