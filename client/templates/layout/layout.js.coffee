Template.layout.helpers
  meetings: ->
    share.Meetings.find()

Template.layout.rendered = ->

Template.layout.events
#  "submit .subscribe": encapsulate (event, template) ->
