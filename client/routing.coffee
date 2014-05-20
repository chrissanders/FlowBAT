Router.configure
  layoutTemplate: "layout"
  notFoundTemplate: "notFound"
  loadingTemplate: "loading"

Router.onBeforeAction("dataNotFound")

Router.map ->
  @route "index",
    path: "/"
    data: -> {}
  @route "meeting",
    path: "/meetings/:_id"
    data: ->
      meeting = share.Meetings.findOne(@params._id)
      if not meeting
        return null
      _.defaults({}, @params,
        meeting: meeting
      )

share.setPageTitle = (title, appendSiteName = true) ->
  if appendSiteName
    title += " - Meetings"
  if Meteor.settings.public.isDebug
    title = "(D) " + title
  document.title = title

Router.onAfterAction ->
  share.debouncedSendPageview()
