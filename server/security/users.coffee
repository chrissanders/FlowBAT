Meteor.users.allow
  insert: share.securityRulesWrapper (userId, user) ->
    true
  update: share.securityRulesWrapper (userId, user, fieldNames, modifier) ->
    unless share.Security.hasRole(userId, "admin")
      throw new Match.Error("Operation not allowed for non admins")
    true
  remove: share.securityRulesWrapper (userId, user) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    if userId is user._id
      throw new Match.Error("User can't remove himself")
    unless share.Security.hasRole(userId, "admin")
      throw new Match.Error("Operation not allowed for non admins")
    true
