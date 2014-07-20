Template.ipsetList.helpers
  ipsets: ->
    share.IPSets.find({}, {sort: {createdAt: 1}})

Template.ipsetList.rendered = ->

Template.ipsetList.events
#  "click .selector": (event, template) ->
