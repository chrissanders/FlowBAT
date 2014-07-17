share.Queries.allow
  insert: share.securityRulesWrapper (userId, query) ->
    # TODO: don't allow to insert string (always make it "")
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, query, fieldNames, modifier) ->
    # TODO: don't allow to update string (should always be built)
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, query) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
