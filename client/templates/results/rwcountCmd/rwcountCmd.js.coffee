Template.rwcountCmd.helpers
#  helper: ->

Template.rwcountCmd.rendered = ->
  share.initAutocomplete(@$("input"), share.rwcountAutocompleteOptions, share.rwcountAutocompleteValues, share.rwcountOptionsWithoutValues)

Template.rwcountCmd.events
#  "click .selector": (event, template) ->
