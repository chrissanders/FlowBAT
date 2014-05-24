share.Meetings.allow
  insert: share.securityRulesWrapper (userId, meeting) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  update: share.securityRulesWrapper (userId, meeting, fieldNames, modifier) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
  remove: share.securityRulesWrapper (userId, meeting) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    true
