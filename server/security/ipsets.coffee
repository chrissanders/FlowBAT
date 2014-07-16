share.IPSets.allow
  insert: share.securityRulesWrapper (userId, ipset) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, ipset, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, ipset) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
