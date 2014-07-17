share.Security =
  effectiveRoles:
    admin: ["admin", "analyst", "user"]
    analyst: ["analyst", "user"]
    user: ["user"]
  groups: ->
    Object.keys(@effectiveRoles)
  currentUserHasRole: (role) ->
    share.Security.hasRole(Meteor.userId(), role)
  userIdCanChangeUserGroupOrRemove: (userId, user) ->
    userId isnt user._id and @hasRole(userId, "admin")
  hasRole: (userId, role) ->
    user = Meteor.users.findOne(userId)
    if user
      if role in share.Security.effectiveRoles[user.group]
        return true
    return false
