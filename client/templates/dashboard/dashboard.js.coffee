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
  share.queryAutocomplete(@$(".quick-query-form.panel input"))

Template.dashboard.events
  "submit .quick-query-form": grab encapsulate (event, template) ->
    $form = $(event.currentTarget)
    $quickQueryInput = $form.find(".quick-query")
    quickQueryValue = $quickQueryInput.val().trim()
    $quickQueryInput = $form.find(".input-group.exclusion input")
    exclusionsCmdValue = $quickQueryInput.val().trim()
    if quickQueryValue
      _id = share.Queries.insert({
        isQuick: true
      })
      share.Queries.update(_id, {$set: {interface: "cmd", cmd: quickQueryValue, exclusionsCmd: exclusionsCmdValue}})
      share.Queries.update(_id, {$set: {isOutputStale: true}})
      Router.go("/query/" + _id)
    else
      $quickQueryInput.focus()
  "click .add-query": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": @_id}})
  "click .insert-query": grab (event, template) ->
    _id = share.Queries.insert({})
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": _id}})
  "click .remove-from-dashboard": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$pull: {"profile.dashboardQueryIds": @_id}})



