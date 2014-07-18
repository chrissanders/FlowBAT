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
  "submit .quick-query-form": grab encapsulate (event, template) ->
    $form = $(event.currentTarget)
    $quickQueryInput = $form.find(".quick-query")
    quickQueryValue = $quickQueryInput.val().trim()
    if quickQueryValue
      quickQuery = share.Queries.findOne({isQuick: true})
      $set = _.extend({interface: "cmd", cmd: quickQueryValue, result: "", error: "", isStale: true}, share.queryResetValues)
      share.Queries.update(quickQuery._id, {$set: $set})
      Router.go(quickQuery.path())
    else
      $quickQueryInput.focus()
  "click .add-query": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": @_id}})
  "click .insert-query": grab (event, template) ->
    _id = share.Queries.insert({})
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": _id}})
  "click .remove-from-dashboard": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$pull: {"profile.dashboardQueryIds": @_id}})
