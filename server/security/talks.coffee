share.Talks.allow
  insert: share.securityRulesWrapper (userId, talk) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, talk, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, talk) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
