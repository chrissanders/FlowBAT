Template.navbar.helpers

Template.navbar.rendered = ->
Blaze._allowJavascriptUrls()
Template.navbar.events
  "click .create-quick-query": grab (event, template) ->
    _id = share.Queries.insert(
      isQuick: true
    )
    Router.go("/query/" + _id)
  "click .logout": grab (event, template) ->
    Meteor.logout()
