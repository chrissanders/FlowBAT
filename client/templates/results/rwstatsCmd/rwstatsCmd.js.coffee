Template.rwstatsCmd.helpers
#  helper: ->

Template.rwstatsCmd.rendered = ->
  share.initAutocomplete(@$("input"), share.rwstatsAutocompleteOptions, share.rwstatsAutocompleteValues)

Template.rwstatsCmd.events
#  "click .selector": (event, template) ->
