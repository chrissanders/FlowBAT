Template.changePasswordAlertButtonsPanel.helpers
#  helper: ->

Template.changePasswordAlertButtonsPanel.rendered = ->

Template.changePasswordAlertButtonsPanel.events
  "click .change-button": (event, template) ->
    password = String($(".change-password-form .new-password").val())
    if password
      Meteor.call "setPassword", template.data.user._id, password, (error) ->
        $(event.target).closest(".alert-message").remove()
