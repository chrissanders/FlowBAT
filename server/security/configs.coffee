share.Configs.allow
  insert: share.securityRulesWrapper (userId, config) ->
    false # There can be only one!
  update: share.securityRulesWrapper (userId, config, fieldNames, modifier, options) ->
    unless share.Security.hasRole(userId, "admin")
      throw new Match.Error("Operation not allowed for non admins")
    $set =
      isSSH: Match.Optional(Boolean)
      host: Match.Optional(String)
      port: Match.Optional(String)
      user: Match.Optional(String)
      identityFile: Match.Optional(String)
      siteConfigFile: Match.Optional(String)
      dataRootdir: Match.Optional(String)
      dataTempdir: Match.Optional(String)
      isNew: Match.Optional(Match.App.isNewUpdate(config.isNew))
      updatedAt: Date
    if not config.isSetupComplete
      _.extend($set,
        isSetupComplete: Match.Optional(Boolean)
      )
    check(modifier,
      $set: $set
    )
    if modifier.$set and _.has(modifier.$set, "siteConfigFile") and not modifier.$set.siteConfigFile
      throw new Match.Error("siteConfigFile required")
    if modifier.$set and _.has(modifier.$set, "dataRootdir") and not modifier.$set.dataRootdir
      throw new Match.Error("dataRootdir required")
    if modifier.$set and _.has(modifier.$set, "dataTempdir") and not modifier.$set.dataTempdir
      throw new Match.Error("dataTempdir required")
    true
  remove: share.securityRulesWrapper (userId, config) ->
    false # Who wants to live forever?
