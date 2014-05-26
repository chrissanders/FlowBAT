Template.durationInput.helpers
  formattedValue: ->
    if @value then share.milliseconds2minutes(@value) else ""
