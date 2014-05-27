share.SakEditor = new share.Editor(
  collection: share.Saker
  family: "sak"
  isSingleLine: (property) ->
    property not in [] # all properties
  cleanProperty: (property, value) ->
    if property in ["maximumDuration", "talkDuration", "replyDuration", "answerDuration"]
      return share.minutes2milliseconds(value)
    return value
  insertAfter: (_id, sak = {}, callback = ->) ->
    sibling = share.Saker.findOne(_id)
    _.defaults(sak,
      meetingId: sibling.meetingId
      position: sibling.position + 1
    )
    share.SakEditor.insert(sak, callback)
  isAddingTalk: (_id) ->
    Session.equals(@editorKey(_id, "is-adding-talk"), true)
  startAddingTalk: (_id) ->
    Session.set(@editorKey(_id, "is-adding-talk"), true)
    share.EditorCache.add(@editorId(_id), "is-adding-talk", {family: @family, _id: _id})
  stopAddingTalk: (_id) ->
    @saveObject(_id)
    Session.set(@editorKey(_id, "is-adding-talk"), null)
    share.EditorCache.remove(@editorId(_id), "is-adding-talk")
)
