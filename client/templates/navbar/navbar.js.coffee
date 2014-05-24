Template.navbar.helpers
  meetings: ->
    share.Meetings.find()

Template.navbar.rendered = ->

Template.navbar.events
  "click .add-meeting": (event, template) ->

