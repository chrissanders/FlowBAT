UI.registerHelper("pathForMeeting", ->
  Router.routes.meeting.path({_id: @_id})
)

