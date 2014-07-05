Router.configure
  layoutTemplate: "layout"
  notFoundTemplate: "notFound"
  loadingTemplate: "loading"
  yieldTemplates:
    navbar: {to: "header"}

Router.map ->
  @route "index",
    path: "/"
    data: -> {}
  @route "meeting",
    path: "/meeting/:_id"
    template: "meetingView"
    data: ->
      meeting = share.Meetings.findOne(@params._id)
      if not meeting
        return null
      _.defaults({}, @params,
        meeting: meeting
      )
  @route "user",
    path: "/user/:_id"
    data: ->
      user = Meteor.users.findOne(@params._id)
      unless user
        return null
      _.defaults({}, @params,
        user: user
      )

Router.onBeforeAction (pause) ->
  if Accounts._resetPasswordToken
    UI.insert(UI.renderWithData(Template.alert,
      name: i18n.t("forms.login.passwordReset.alert.name")
      descriptionTemplateName: "resetPasswordAlertDescription"
      descriptionTemplateData: {}
      buttonPanelTemplateName: "resetPasswordAlertButtonsPanel"
      buttonPanelTemplateData: {token: Accounts._resetPasswordToken}
    ), document.body)
    delete Accounts._resetPasswordToken

Router.onBeforeAction("dataNotFound")

share.setPageTitle = (title, appendSiteName = true) ->
  if appendSiteName
    title += " - FlowBAT"
  if Meteor.settings.public.isDebug
    title = "(D) " + title
  document.title = title
