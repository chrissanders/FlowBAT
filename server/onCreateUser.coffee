# Use Meteor.users.before.insert hook to set defaults

Accounts.onCreateUser (options, user) ->
  # should we merge?
  google = user.services?.google
  if google
    if google.email
      user.emails = user.emails || []
      user.emails.push { address: google.email.toLowerCase(), verified: !!google.verified_email }
      existingUser = Meteor.users.findOne({"emails.address": google.email, isInvitation: false})
      if existingUser
        userEmails = _.pluck(user.emails, "address")
        _.each existingUser.emails, (existingUserEmail) ->
          if existingUserEmail.address not in userEmails
            user.emails.push(existingUserEmail)
        existingUser.emails = user.emails
        unless existingUser.services
          existingUser.services = {}
        unless existingUser.services.resume
          existingUser.services.resume = {loginTokens: []}
        existingUser.services.resume.loginTokens.push(user.services.resume.loginTokens[0])
        existingUser.services.google = google
        Meteor.users.remove(existingUser._id)
        return existingUser # merge complete
    else
      throw new Error("gmail user must provide an email")

  # not merging, regular registration
  user.profile = options.profile || {}
  if user.profile.name
    user.profile.isRealName = true # if auth service returned profile with name, assume it's a real name
  else
    user.profile.isRealName = false
    email = user.emails?[0]?.address
    if email
      user.profile.name = email.split("@")[0]
  return user
