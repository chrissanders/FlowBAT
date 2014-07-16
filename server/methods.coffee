Meteor.methods
  setPassword: (userId, password) ->
    check(userId, String)
    check(password, String)
    unless share.Security.hasRole(@userId, "admin")
      throw "Setting password is not allowed for non admins"
    Accounts.setPassword(userId, password)
