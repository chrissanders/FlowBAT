share.SakEditor = new share.Editor(
  collection: share.Saker
  family: "sak"
  isSingleLine: (property) ->
    property not in [] # all properties
  cleanProperty: (property, value) ->
    if property in ["maximumDuration", "talkDuration", "replyDuration"]
      return share.minutes2milliseconds(value)
    return value
  insertAfter: (_id, sak = {}, callback = ->) ->
    sibling = share.Saker.findOne(_id)
    _.defaults(sak,
      meetingId: sibling.meetingId
      position: sibling.position + 1
    )
    share.SakEditor.insert(sak, callback)
)
