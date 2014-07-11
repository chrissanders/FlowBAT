Meteor.users.after.insert (userId, user) ->
  share.Queries.insert(
    type: "quick"
    ownerId: user._id
  )
