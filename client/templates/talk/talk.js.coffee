Template.talk.helpers
  isEdited: ->
    share.TalkEditor.isEdited(@_id)
  isAddingReply: ->
    share.TalkEditor.isAddingReply(@_id)
  addReplySearchResults: ->
    addReplyQuery = Session.get("add-reply-query")
    if addReplyQuery
      regexp = new RegExp(addReplyQuery, "gi")
      repliesGroupedByUserId = _.groupBy(@replies().fetch(), "userId")
      Meteor.users.find({_id: {$ne: @userId}, "profile.name": regexp}, {limit: 9, sort: {createdAt: 1}, transform: (user) ->
        userReplies = repliesGroupedByUserId[user._id]
        user.replyCount = if userReplies then userReplies.length else 0
        user
      })
    else
      []

Template.talk.rendered = ->
  @$(".replies").sortable(
    axis: "y"
    delay: 75
    distance: 4
    handle: ".sortable-handle"
    cursor: "move"
    tolerance: "pointer"
    forceHelperSize: true
    forcePlaceholderSize: true
    placeholder: "object reply placeholder"
#    start: (event, ui) ->
#      ui.item.addClass("prevent-click")
#    stop: (event, ui) ->
#      _.defer ->
#        ui.item.removeClass("prevent-click") # prevent click after drag in Firefox
    update: (event, ui) ->
      if ui.sender # duplicate "update" event
        return
      $reply = ui.item
      replyId = $reply.attr("data-id")
      prevReplyId = $reply.prev().attr("data-id")
      nextReplyId = $reply.next().attr("data-id")
      if !prevReplyId && !nextReplyId
        position = 1
      else if !prevReplyId
        position = share.Replies.findOne(nextReplyId).position - 1
      else if !nextReplyId
        position = share.Replies.findOne(prevReplyId).position + 1
      else
        position = (share.Replies.findOne(nextReplyId).position + share.Replies.findOne(prevReplyId).position) / 2
      reply = share.Replies.findOne(replyId)
      $set = {position: position}
      share.Replies.update(replyId, {$set: $set})
  )

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
    replyCount = $user.attr("data-reply-count")
    if replyCount < 1
      _id = share.TalkEditor.insertReply(template.data._id,
        userId: $user.attr("data-id")
        isNew: false
      )
      share.ReplyEditor.stopEditing(_id)
#      Session.set("add-reply-query", "")
#      template.$(".add-reply-wrapper input").first().val("").focus()
