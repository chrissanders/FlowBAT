Template.meeting.helpers
  durationOverflowClass: ->
    if @calculatedDuration() > @maximumDuration then "text-danger" else "text-success"

Template.meeting.rendered = ->

Template.meeting.events
#  "click .selector": (event, template) ->
