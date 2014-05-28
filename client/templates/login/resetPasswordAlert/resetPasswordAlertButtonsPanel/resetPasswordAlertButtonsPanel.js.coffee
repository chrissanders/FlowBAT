Template.resetPasswordAlertButtonsPanel.helpers
#  helper: ->

Template.resetPasswordAlertButtonsPanel.rendered = ->

Template.resetPasswordAlertButtonsPanel.events
  "click .reset-button": (event, template) ->
    $form = $(".reset-password-form")
    password = $form.find(".password").val()
    Accounts.resetPassword template.data.token, password, (error) ->
      if error
        $(".alert-message .error-container").text(i18n.t("forms.login.passwordReset.alert.errors.tokenNotFound"))
      else
        $(event.target).closest(".alert-message").remove()
