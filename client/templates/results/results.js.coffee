Template.results.helpers
  allResults: ->
    share.allResults(@meeting)
  filteredResults: ->
    share.filteredResults(@meeting)

Template.results.rendered = ->

Template.results.events
#  "click .selector": (event, template) ->
