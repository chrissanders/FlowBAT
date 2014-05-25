share.MeetingEditor = new share.Editor(
  collection: share.Meetings
  family: "meeting"
  isSingleLine: (property) ->
    property not in [] # all properties
  insertAfter: (_id, sak = {}, callback = ->) ->
    _.defaults(sak,
      meetingId: _id
    )
    share.SakEditor.insert(sak, callback)
)
share.SakEditor = new share.Editor(
  collection: share.Saker
  family: "sak"
  isSingleLine: (property) ->
    property not in [] # all properties
  insertAfter: (_id, sak = {}, callback = ->) ->
    sibling = share.Saker.findOne(_id)
    _.defaults(sak,
      meetingId: sibling.meetingId
    )
    share.SakEditor.insert(sak, callback)
)
share.TalkEditor = new share.Editor(
  collection: share.Talks
  family: "talk"
)
share.ReplyEditor = new share.Editor(
  collection: share.Replies
  family: "reply"
)
