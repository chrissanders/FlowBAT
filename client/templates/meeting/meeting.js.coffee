Template.meeting.helpers
  isEdited: ->
    share.MeetingEditor.isEdited(@_id)
  durationOverflowClass: ->
    if @calculatedDurationSum() > @maximumDuration then "text-danger" else "text-success"

Template.meeting.rendered = ->

Template.meeting.events
  "click .start-editing": encapsulate (event, template) ->
    share.MeetingEditor.startEditing(template.data._id)
  "click .remove": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.MeetingEditor.remove(template.data._id)
      Router.go("/")
