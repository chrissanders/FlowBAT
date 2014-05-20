Template.table.helpers
  allResults: ->
    share.allResults(@meeting)
  filteredResults: ->
    share.filteredResults(@meeting)

Template.table.rendered = ->

Template.table.events
#  "click .selector": (event, template) ->
