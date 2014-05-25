Template.durationInput.helpers
  formattedValue: ->
    if @value then share.milliseconds2hourminutes(@value) else ""
