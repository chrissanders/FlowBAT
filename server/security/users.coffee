Meteor.users.allow({
  insert: (userId, user) ->
    true
  update: (userId, user, fieldNames, modifier) ->
    if user._id != userId
      return false
    return true
  remove: () ->
    false
  fetch: ['_id']
})
