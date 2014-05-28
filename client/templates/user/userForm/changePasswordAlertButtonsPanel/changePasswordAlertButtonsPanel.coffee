Template.changePasswordAlertButtonsPanel.helpers
#  helper: ->

Template.changePasswordAlertButtonsPanel.rendered = ->

Template.changePasswordAlertButtonsPanel.events
  "click .change-button": (event, template) ->
    $form = $(".change-password-form")
    oldPassword = $form.find(".old-password").val()
    newPassword = $form.find(".new-password").val()
    Accounts.changePassword(oldPassword, newPassword, (error) ->
      if error
        $(".alert-message .error-container").text(i18n.t("forms.profile.passwordChange.alert.errors.incorrectPassword"))
      else
        $(event.target).closest(".alert-message").remove()
    )
