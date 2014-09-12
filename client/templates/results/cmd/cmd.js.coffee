Template.cmd.helpers
#  helper: ->

Template.cmd.rendered = ->
  share.initAutocomplete(@$(".input-group input"), share.rwfilterAutocompleteOptions)

Template.cmd.events
#  "click .selector": (event, template) ->
