Template.controlsForTheHeartOfTheSun.helpers
  executingIntervalString: ->
    if @executingInterval
      minutes = Math.ceil(@executingInterval / share.minute)
      if minutes is 1
        "each minute"
      else
        "each " + minutes + " minutes"

Template.controlsForTheHeartOfTheSun.rendered = ->

Template.controlsForTheHeartOfTheSun.events
#  "click .selector": (event, template) ->
