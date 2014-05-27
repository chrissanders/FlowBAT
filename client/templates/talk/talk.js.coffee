Template.talk.helpers
  isEdited: ->
    share.TalkEditor.isEdited(@_id)
  isAddingReply: ->
    share.TalkEditor.isAddingReply(@_id)
  addReplySearchResults: ->
    addReplyQuery = Session.get("add-reply-query")
    if addReplyQuery
      regexp = new RegExp(addReplyQuery, "gi")
      existingUserIds = _.pluck(@replies().fetch(), "userId")
      Meteor.users.find({"profile.name": regexp}, {limit: 9, sort: {createdAt: 1}, transform: (user) ->
        user.isAlreadyAdded = user._id in existingUserIds
        user
      })
    else
      []

Template.talk.rendered = ->

Template.talk.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.TalkEditor.startEditing(template.data._id)
  "click .stop-editing": encapsulate (event, template) ->
    share.TalkEditor.stopEditing(template.data._id)
  "click .remove": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.TalkEditor.remove(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.TalkEditor.stopEditing(template.data._id)
  "click .add-reply": encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.TalkEditor.startAddingReply(template.data._id)
    _.defer ->
      $(".add-reply-wrapper input").first().focus()
  "click .add-reply-wrapper .cancel": grab encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.TalkEditor.stopAddingReply(template.data._id)
    Session.set("add-reply-query", "")
  "input .add-reply-query": encapsulate (event, template) ->
    Session.set("add-reply-query", $(event.currentTarget).val())
  "click .add-reply-wrapper .user": encapsulate (event, template) ->
    $user = $(event.currentTarget)
    if $user.hasClass("already-added")
      reply = share.Replies.findOne(
        talkId: template.data._id
        userId: $user.attr("data-id")
      )
      share.Replies.remove(reply._id)
    else
      _id = share.ReplyEditor.insert(
        talkId: template.data._id
        userId: $user.attr("data-id")
        isNew: false
      )
      share.ReplyEditor.stopEditing(_id)
