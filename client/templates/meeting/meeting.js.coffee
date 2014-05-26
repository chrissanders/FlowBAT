Template.meeting.helpers
  isEdited: ->
    share.MeetingEditor.isEdited(@_id)
  durationOverflowClass: ->
    if not @maximumDurationSum()
      return ""
    if @calculatedDurationSum() > @maximumDurationSum()
      return "text-danger"
    else
      return "text-success"

Template.meeting.rendered = ->

Template.meeting.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.MeetingEditor.startEditing(template.data._id)
  "click .stop-editing": encapsulate (event, template) ->
    share.MeetingEditor.stopEditing(template.data._id)
  "click .remove": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.MeetingEditor.remove(template.data._id)
      Router.go("/")
  "click .add-sak": encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.MeetingEditor.insertSak(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.MeetingEditor.stopEditing(template.data._id)
