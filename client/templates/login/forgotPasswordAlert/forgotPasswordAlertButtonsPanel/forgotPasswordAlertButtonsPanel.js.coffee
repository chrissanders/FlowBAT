Template.forgotPasswordAlertButtonsPanel.helpers
#  helper: ->

Template.forgotPasswordAlertButtonsPanel.rendered = ->

Template.forgotPasswordAlertButtonsPanel.events
  "click .reset-button": (event, template) ->
    $form = $(".forgot-password-form")
    email = $form.find(".email").val()
    Accounts.forgotPassword email: email, (error) ->
      if error
        $(".alert-message .error-container").text(i18n.t("forms.login.passwordForgot.alert.errors.userNotFound"))
      else
        $(event.target).closest(".alert-message").remove()
