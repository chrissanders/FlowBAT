Template.navbar.helpers
  queries: ->
    share.Queries.find({isQuick: false})

Template.navbar.rendered = ->

Template.navbar.events
  "click .logout": grab (event, template) ->
    Meteor.logout()

