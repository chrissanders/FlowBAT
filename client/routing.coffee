Router.configure
  layoutTemplate: "layout"
  notFoundTemplate: "notFound"
  loadingTemplate: "loading"
  yieldTemplates:
    navbar: {to: "header"}

Router.onBeforeAction((pause) ->
  if not Meteor.user()
    @render("welcome")
    pause()
, {except: []})

Router.onBeforeAction("dataNotFound")

Router.map ->
  @route "index",
    path: "/"
    data: -> {}
    action: ->
      query = share.Queries.findOne()
      Router.go("/query/" + query._id)
  @route "createQuery",
    path: "/query/create"
    data: -> {}
    action: ->
      _id = share.Queries.insert({})
      Router.go("/query/" + _id)
  @route "query",
    path: "/query/:_id"
    data: ->
      query = share.Queries.findOne(@params._id)
      if not query
        return null
      _.defaults({}, @params,
        query: query
      )
  @route "removeQuery",
    path: "/query/:_id/remove"
    data: -> {}
    action: ->
      share.Queries.remove(@params._id)
      Router.go("/")
  @route "createIPSet",
    path: "/ipset/create"
    data: -> {}
    action: ->
      _id = share.IPSets.insert({})
      Router.go("/ipset/" + _id)
  @route "ipset",
    path: "/ipset/:_id"
    data: ->
      ipset = share.IPSets.findOne(@params._id)
      if not ipset
        return null
      _.defaults({}, @params,
        ipset: ipset
      )
  @route "removeIPSet",
    path: "/ipset/:_id/remove"
    data: -> {}
    action: ->
      share.IPSets.remove(@params._id)
      Router.go("/")
  @route "user",
    path: "/user/:_id"
    data: ->
      user = Meteor.users.findOne(@params._id)
      unless user and share.Security.currentUserHasRole("admin")
        return null
      _.defaults({}, @params,
        user: user
      )
  @route "users",
    data: ->
      unless share.Security.currentUserHasRole("admin")
        return null
      _.defaults({}, @params,
        users: Meteor.users.find()
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

share.setPageTitle = (title, appendSiteName = true) ->
  if appendSiteName
    title += " - FlowBAT"
  if Meteor.settings.public.isDebug
    title = "(D) " + title
  document.title = title
