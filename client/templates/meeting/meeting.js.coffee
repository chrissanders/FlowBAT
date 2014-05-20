Template.meeting.helpers
  saker: ->
    share.Saker.find({meetingId: @_id})

Template.meeting.rendered = ->

Template.meeting.events
#  "click .selector": (event, template) ->
