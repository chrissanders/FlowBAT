Template.sak.helpers
  isEdited: ->
    share.SakEditor.isEdited(@_id)
  durationOverflowClass: ->
    if not @maximumDuration
      return ""
    if @calculatedDurationSum() > @maximumDuration
      return "text-danger"
    else
      return "text-success"

Template.sak.rendered = ->

Template.sak.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.SakEditor.startEditing(template.data._id, $(event.currentTarget).attr("data-edited-property"))
  "click .stop-editing": encapsulate (event, template) ->
    share.SakEditor.stopEditing(template.data._id)
  "click .remove": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.SakEditor.remove(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.SakEditor.stopEditing(template.data._id)
