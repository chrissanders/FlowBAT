Template.controlsForTheHeartOfTheSun.helpers
  executingIntervalString: ->
    if @executingInterval
      minutes = Math.ceil(@executingInterval / share.minute)
      if minutes is 1
        "each minute"
      else
        "each " + minutes + " minutes"
  query: ->
    share.Queries.findOne(@_id)

Template.controlsForTheHeartOfTheSun.rendered = ->

Template.controlsForTheHeartOfTheSun.events
  "click .set-output.btn.btn-default.rwstats": (event, template) ->
#    query =
