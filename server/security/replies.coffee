share.Replies.allow
  insert: share.securityRulesWrapper (userId, reply) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, reply, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, reply) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
