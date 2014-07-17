getInitials = (name) ->
  firstWords = _.first(name.replace(/\s+/g, " ").trim().split(" "), 2)
  if firstWords.length < 2
    firstLetters = firstWords[0].substring(0, 2)
  else
    firstLetters = _.map(firstWords || [], (word) ->
      word.charAt(0)).join("")
  firstLetters.toUpperCase()

userPreSave = (userId, changes) ->
  if changes.profile?.name
    changes.profile.initials = getInitials(changes.profile.name)
  if changes["profile.name"]
    changes["profile.initials"] = getInitials(changes["profile.name"])

Meteor.users.before.insert (userId, user) ->
  _.defaults(user,
    isNew: true
    isInvitation: false
    invitations: []
  )
  _.defaults(user.profile,
    numRecs: 10
    dashboardQueryIds: []
    isRealName: false
  )
  userPreSave.call(@, userId, user)

Meteor.users.before.update (userId, user, fieldNames, modifier, options) ->
  userPreSave.call(@, userId, modifier.$set || {})
