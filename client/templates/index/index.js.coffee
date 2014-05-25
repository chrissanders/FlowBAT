Template.index.helpers
  meetings: ->
    share.Meetings.find({}, {sort: {createdAt: 1}})

Template.index.rendered = ->

Template.index.events
#  "click .selector": (event, template) ->
