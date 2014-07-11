Meteor.users.after.insert (userId, user) ->
  share.Queries.insert(
    ownerId: user._id
  )
