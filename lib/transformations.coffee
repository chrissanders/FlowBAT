class share.User
  constructor: (doc) ->
    _.extend(@, doc)
    @email = @emails?[0]?.address
    @name = @profile.name
    @firstName = @name.split(' ').slice(0, 1).join(' ')
    @lastName = @name.split(' ').slice(1).join(' ')

class share.Meeting
  constructor: (doc) ->
    _.extend(@, doc)

class share.Sak
  constructor: (doc) ->
    _.extend(@, doc)
  meeting: ->
    share.Meetings.findOne({_id: @meetingId})

class share.Talk
  constructor: (doc) ->
    _.extend(@, doc)
  meeting: ->
    share.Meetings.findOne({_id: @meetingId})

class share.Reply
  constructor: (doc) ->
    _.extend(@, doc)
  meeting: ->
    share.Meetings.findOne({_id: @meetingId})

share.Transformations =
  user: (user) ->
    if user instanceof share.User or not user then user else new share.User(user)
  meeting: (meeting) ->
    if meeting instanceof share.Meeting or not meeting then meeting else new share.Meeting(meeting)
  sak: (sak) ->
    if sak instanceof share.Sak or not sak then sak else new share.Sak(sak)
  talk: (talk) ->
    if talk instanceof share.Talk or not talk then talk else new share.Talk(talk)
  reply: (reply) ->
    if reply instanceof share.Reply or not reply then reply else new share.Reply(reply)
