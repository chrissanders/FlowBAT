root = exports ? this

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

meetingPreSave = (meetingId, changes) ->
  if changes.name
    changes.name = root.xssClean(changes.name)

sakPreSave = (sakId, changes) ->
  if changes.name
    changes.name = root.xssClean(changes.name)

talkPreSave = (talkId, changes) ->

replyPreSave = (replyId, changes) ->

Meteor.users.before.insert (userId, user) ->
  _.defaults(user,
    isNew: true
    isInvitation: false
    invitations: []
  )
  _.defaults(user.profile,
    settings: {}
    isRealName: false
  )
  userPreSave.call(@, userId, user)

Meteor.users.before.update (userId, user, fieldNames, modifier, options) ->
  userPreSave.call(@, userId, modifier.$set || {})

share.Meetings.before.insert (userId, meeting) ->
  meeting._id = meeting._id || Random.id()
  now = new Date()
  _.defaults(meeting,
    name: ""
    ownerId: userId
    isNew: true
    isArchived: false
    updatedAt: now
    createdAt: now
  )
  meetingPreSave.call(@, userId, meeting)

share.Meetings.before.update (userId, meeting, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  meetingPreSave.call(@, userId, modifier.$set)

share.Saker.before.insert (userId, sak) ->
  sak._id = sak._id || Random.id()
  now = new Date()
  _.defaults(sak,
    name: ""
    position: 0
    maximumDuration: 0
    talkDuration: 5 * share.minute
    replyDuration: 3 * share.minute
    answerDuration: 4 * share.minute
    ownerId: userId
    isNew: true
    updatedAt: now
    createdAt: now
  )
  sakPreSave.call(@, userId, sak)

share.Saker.before.update (userId, sak, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  sakPreSave.call(@, userId, modifier.$set)

share.Talks.before.insert (userId, talk) ->
  talk._id = talk._id || Random.id()
  now = new Date()
  _.defaults(talk,
    position: 0
    ownerId: userId
    isNew: true
    updatedAt: now
    createdAt: now
  )
  talkPreSave.call(@, userId, talk)

share.Talks.before.update (userId, talk, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  talkPreSave.call(@, userId, modifier.$set)

share.Replies.before.insert (userId, reply) ->
  reply._id = reply._id || Random.id()
  now = new Date()
  _.defaults(reply,
    position: 0
    ownerId: userId
    isNew: true
    updatedAt: now
    createdAt: now
  )
  replyPreSave.call(@, userId, reply)

share.Replies.before.update (userId, reply, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  replyPreSave.call(@, userId, modifier.$set)
