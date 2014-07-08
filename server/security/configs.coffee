share.Configs.allow
  insert: share.securityRulesWrapper (userId, config) ->
    false # There can be only one!
  update: share.securityRulesWrapper (userId, config, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    false # check that only admin can modify
  remove: share.securityRulesWrapper (userId, config) ->
    false # Who wants to live forever?
