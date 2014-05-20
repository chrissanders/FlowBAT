UI.registerHelper("pathForUser", ->
#  Router.routes.meeting.path({_id: @_id})
  "#"
)

UI.registerHelper("pathForMeeting", ->
  Router.routes.meeting.path({_id: @_id})
)
