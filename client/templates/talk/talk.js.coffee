Template.talk.helpers
  isEdited: ->
    share.TalkEditor.isEdited(@_id)

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
