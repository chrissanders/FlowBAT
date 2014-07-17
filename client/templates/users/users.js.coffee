Template.users.helpers
  groupI18n: ->
    i18n.t("groups." + @group)

Template.users.events
  "click .remove-button": (event, template) ->
    UI.insert(UI.renderWithData(Template.alert,
      name: i18n.t("users.removeAlert.name")
      description: i18n.t("users.removeAlert.description")
      buttonPanelTemplateName: "removeUserAlertButtonsPanel"
      buttonPanelTemplateData: {user: @}
    ), document.body)
