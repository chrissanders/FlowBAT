Meteor.users.after.insert (userId, user) ->
  share.Queries.insert(
    type: "quick"
    userId: user._id
  )
