Template.rwstatsCmd.helpers
#  helper: ->

Template.rwstatsCmd.rendered = ->
  share.initAutocomplete(@$("input"), share.rwstatsAutocompleteTerms)

Template.rwstatsCmd.events
#  "click .selector": (event, template) ->
