share.Configs.allow
  insert: share.securityRulesWrapper (userId, config) ->
    false # There can be only one!
  update: share.securityRulesWrapper (userId, config, fieldNames, modifier) ->
    unless share.Security.hasRole(userId, "admin")
      throw new Match.Error("Operation not allowed for non admins")
    true
  remove: share.securityRulesWrapper (userId, config) ->
    false # Who wants to live forever?
