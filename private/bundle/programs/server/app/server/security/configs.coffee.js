(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Configs.allow({
  insert: share.securityRulesWrapper(function(userId, config) {
    return false;
  }),
  update: share.securityRulesWrapper(function(userId, config, fieldNames, modifier, options) {
    var $set;
    if (!share.Security.hasRole(userId, "admin")) {
      throw new Match.Error("Operation not allowed for non admins");
    }
    $set = {
      isSSH: Match.Optional(Boolean),
      host: Match.Optional(String),
      port: Match.Optional(String),
      user: Match.Optional(String),
      identityFile: Match.Optional(String),
      siteConfigFile: Match.Optional(String),
      dataRootdir: Match.Optional(String),
      dataTempdir: Match.Optional(String),
      isNew: Match.Optional(Match.App.isNewUpdate(config.isNew)),
      updatedAt: Date
    };
    if (!config.isSetupComplete) {
      _.extend($set, {
        isSetupComplete: Match.Optional(Boolean)
      });
    }
    check(modifier, {
      $set: $set
    });
    if (modifier.$set && _.has(modifier.$set, "siteConfigFile") && !modifier.$set.siteConfigFile) {
      throw new Match.Error("siteConfigFile required");
    }
    if (modifier.$set && _.has(modifier.$set, "dataRootdir") && !modifier.$set.dataRootdir) {
      throw new Match.Error("dataRootdir required");
    }
    if (modifier.$set && _.has(modifier.$set, "dataTempdir") && !modifier.$set.dataTempdir) {
      throw new Match.Error("dataTempdir required");
    }
    return true;
  }),
  remove: share.securityRulesWrapper(function(userId, config) {
    return false;
  })
});

})();

//# sourceMappingURL=configs.coffee.js.map
