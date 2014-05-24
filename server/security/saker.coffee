share.Saker.allow
  insert: share.securityRulesWrapper (userId, sak) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, sak, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, sak) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
