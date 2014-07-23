Template.passwordChangeField.events
  "click .change-password": (event, template) ->
    UI.insert(UI.renderWithData(Template.alert,
      name: i18n.t("forms.profile.passwordChange.alert.name")
      descriptionTemplateName: "changePasswordAlertDescription"
      descriptionTemplateData: {}
      buttonPanelTemplateName: "changePasswordAlertButtonsPanel"
      buttonPanelTemplateData: {user: template.data.user}
    ), document.body)
