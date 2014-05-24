Template.meeting.helpers
  durationOverflowClass: ->
    if @calculatedDurationSum() > @maximumDuration then "text-danger" else "text-success"

Template.meeting.rendered = ->

Template.meeting.events
#  "click .selector": (event, template) ->
