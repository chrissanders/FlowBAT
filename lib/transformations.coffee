# not used by default
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
  path: ->
    "/meeting/" + @_id
  saker: ->
    share.Saker.find({meetingId: @_id}, {sort: {position: 1}})
  lastSakPosition: ->
    lastSak = share.Saker.findOne({meetingId: @_id}, {sort: {position: -1}})
    if lastSak then lastSak.position else 0
  calculatedDurationSum: ->
    calculatedDurationSum = 0
    @saker().forEach (saker) ->
      calculatedDurationSum += saker.calculatedDurationSum()
    calculatedDurationSum
  maximumDurationSum: ->
    maximumDurationSum = 0
    @saker().forEach (saker) ->
      maximumDurationSum += saker.maximumDuration
    maximumDurationSum

class share.Sak
  constructor: (doc) ->
    _.extend(@, doc)
  meeting: ->
    share.Meetings.findOne({_id: @meetingId})
  talks: ->
    share.Talks.find({sakId: @_id})
  calculatedDurationSum: ->
    calculatedDurationSum = 0
    @talks().forEach (talk) =>
      repliesCount = talk.replies().count()
      calculatedDurationSum += @talkDuration + @replyDuration * repliesCount + (if repliesCount then @answerDuration else 0)
    calculatedDurationSum

class share.Talk
  constructor: (doc) ->
    _.extend(@, doc)
  sak: ->
    share.Saker.findOne({_id: @sakId})
  user: ->
    Meteor.users.findOne({_id: @userId})
  replies: ->
    share.Replies.find({talkId: @_id})

class share.Reply
  constructor: (doc) ->
    _.extend(@, doc)
  user: ->
    Meteor.users.findOne({_id: @userId})
  meeting: ->
    share.Meetings.findOne({_id: @meetingId})


share.Transformations =
  meeting: (meeting) ->
    if meeting instanceof share.Meeting or not meeting then meeting else new share.Meeting(meeting)
  sak: (sak) ->
    if sak instanceof share.Sak or not sak then sak else new share.Sak(sak)
  talk: (talk) ->
    if talk instanceof share.Talk or not talk then talk else new share.Talk(talk)
  reply: (reply) ->
    if reply instanceof share.Reply or not reply then reply else new share.Reply(reply)
