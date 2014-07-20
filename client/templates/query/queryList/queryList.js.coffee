Template.queryList.helpers
  queries: ->
    share.Queries.find({isQuick: false}, {sort: {createdAt: 1}})

Template.queryList.rendered = ->

Template.queryList.events
#  "click .selector": (event, template) ->
