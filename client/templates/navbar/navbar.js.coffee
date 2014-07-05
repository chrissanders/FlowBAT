Template.navbar.helpers

Template.navbar.rendered = ->

Template.navbar.events
  "click .logout": grab (event, template) ->
    Meteor.logout()

