share.TalkEditor = new share.Editor(
  collection: share.Talks
  family: "talk"
  isAddingReply: (_id) ->
    Session.equals(@editorKey(_id, "is-adding-reply"), true)
  startAddingReply: (_id) ->
    Session.set(@editorKey(_id, "is-adding-reply"), true)
    share.EditorCache.add(@editorId(_id), "is-adding-reply", {family: @family, _id: _id})
  stopAddingReply: (_id) ->
    @saveObject(_id)
    Session.set(@editorKey(_id, "is-adding-reply"), null)
    share.EditorCache.remove(@editorId(_id), "is-adding-reply")
)
