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
