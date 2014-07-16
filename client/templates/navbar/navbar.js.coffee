Template.navbar.helpers
  queries: ->
    share.Queries.find({isQuick: false})
  ipsets: ->
    share.IPSets.find()

Template.navbar.rendered = ->

Template.navbar.events
  "click .logout": grab (event, template) ->
    Meteor.logout()

