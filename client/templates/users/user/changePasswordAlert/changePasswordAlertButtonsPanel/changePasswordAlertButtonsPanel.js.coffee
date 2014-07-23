Template.changePasswordAlertButtonsPanel.helpers
#  helper: ->

Template.changePasswordAlertButtonsPanel.rendered = ->

Template.changePasswordAlertButtonsPanel.events
  "click .change-button": (event, template) ->
    $(event.currentTarget).closest(".alert-message").find("form").submit()
