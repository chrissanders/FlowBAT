Template.dashboard.helpers
  queries: ->
    user = share.user({"profile.dashboardQueryIds": 1})
    queries = []
    share.Queries.find({_id: {$in: user.profile.dashboardQueryIds}, isQuick: false}).forEach (query) ->
      index = user.profile.dashboardQueryIds.indexOf(query._id)
      queries[index] = query
    queries
  queriesNotOnDashboard: ->
    user = share.user({"profile.dashboardQueryIds": 1})
    share.Queries.find({_id: {$nin: user.profile.dashboardQueryIds}, isQuick: false})

Template.dashboard.rendered = ->

Template.dashboard.events
  "click .add-query": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": @_id}})
  "click .insert-query": grab (event, template) ->
    _id = share.Queries.insert({})
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": _id}})
  "click .remove-from-dashboard": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$pull: {"profile.dashboardQueryIds": @_id}})
