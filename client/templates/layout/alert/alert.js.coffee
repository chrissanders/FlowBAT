Template.alert.helpers

Template.alert.rendered = ->
  currentAlert = @firstNode
  $(".alert-message").each (index, alert) ->
    if alert isnt currentAlert
      $(alert).remove()

Template.alert.events
  "click .close-button": (event, template) ->
    $(event.target).closest(".alert-message").remove()

