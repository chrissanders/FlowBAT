Template.changePasswordAlertButtonsPanel.helpers
#  helper: ->

Template.changePasswordAlertButtonsPanel.rendered = ->

Template.changePasswordAlertButtonsPanel.events
  "click .change-button": (event, template) ->
    password = $(".change-password-form .new-password").val()
    Meteor.call "setPassword", template.data.user._id, String(password), (error) ->
      $(event.target).closest(".alert-message").remove()
