share.MeetingEditor = new share.Editor(
  collection: share.Queries
  family: "query"
  isSingleLine: (property) ->
    property not in [] # all properties
  insertAfter: (_id, sak = {}, callback = ->) ->
    @insertSak(arguments...)
  insertSak: (_id, sak = {}, callback = ->) ->
    meeting = @collection.findOne(_id)
    _.defaults(sak,
      meetingId: meeting._id
      position: meeting.lastSakPosition() + 1
    )
    share.SakEditor.insert(sak, callback)
)
