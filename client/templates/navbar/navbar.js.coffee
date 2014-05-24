Template.navbar.helpers
  meetings: ->
    share.Meetings.find()

Template.navbar.rendered = ->

Template.navbar.events
  "click .insert-meeting": grab encapsulate (event, template) ->
    _id = share.EditorCache.editors["meeting"].insert()
    Router.go("/meeting/" + _id)

