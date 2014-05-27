Template.reply.helpers
  isEdited: ->
    share.ReplyEditor.isEdited(@_id)

Template.reply.rendered = ->

Template.reply.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.ReplyEditor.startEditing(template.data._id)
  "click .stop-editing": encapsulate (event, template) ->
    share.ReplyEditor.stopEditing(template.data._id)
  "click .remove": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.ReplyEditor.remove(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.ReplyEditor.stopEditing(template.data._id)
