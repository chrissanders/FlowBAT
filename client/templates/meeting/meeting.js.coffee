Template.meeting.helpers
  isEdited: ->
    share.MeetingEditor.isEdited(@_id)
  durationOverflowClass: ->
    if @calculatedDurationSum() > @maximumDuration then "text-danger" else "text-success"

Template.meeting.rendered = ->

Template.meeting.events
  "click .start-editing": encapsulate (event, template) ->
    share.MeetingEditor.startEditing(@_id)
