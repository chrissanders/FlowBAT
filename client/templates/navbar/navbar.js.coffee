Template.navbar.helpers
  meetings: ->
    share.Meetings.find({}, {sort: {createdAt: 1}})

Template.navbar.rendered = ->

Template.navbar.events
  "click .insert-meeting": grab (event, template) ->
    _.defer -> # let other editors be stopped
      share.EditorCache.editors["meeting"].insertAndShow()
  "click .logout": grab (event, template) ->
    Meteor.logout()

