Template.tupleList.helpers
  tuples: ->
    share.Tuples.find({}, {sort: {createdAt: 1}})

Template.tupleList.rendered = ->

Template.tupleList.events
#  "click .selector": (event, template) ->
