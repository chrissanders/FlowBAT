share.Queries.after.remove (userId, query) ->
  Meteor.users.update({"profile.dashboardQueryIds": query._id}, {$pull: {"profile.dashboardQueryIds": query._id}}, {multi: true})
