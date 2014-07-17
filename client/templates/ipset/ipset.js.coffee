Template.ipset.helpers
  queries: ->
    share.Queries.find({isQuick: false, $or: [{sipSet: @_id}, {dipSet: @_id}, {anySet: @_id}]})

Template.ipset.rendered = ->

Template.ipset.events
#  "click .selector": (event, template) ->
