share.getMailDomail = ->
  matches = Meteor.settings.mailUrl.match(/\/\/(.+)%40(.+):(.+)@(.+):(\d+)/)
  matches[2]

Meteor.methods
  setPassword: (userId, password) ->
    check(userId, String)
    check(password, String)
    unless userId is @userId or share.Security.hasRole(@userId, "admin")
      Meteor._debug("Setting password is not allowed for non admins")
      return
    Accounts.setPassword(userId, password)
  addNewUser: (newUser) ->
    check newUser,
      email: Match.App.Email
      name: String
      password: String
      group: Match.App.InArray(share.Security.groups())
    newUser.email = newUser.email.toLowerCase()
    if @userId
      if not share.Security.hasRole(@userId, "admin")
        Meteor._debug("Creating users is not allowed for non admins")
        return
    else
      config = share.Configs.findOne()
      if config.isSetupComplete
        Meteor._debug("Creating users is not allowed for non admins")
        return
      else
        newUser.group = "admin"
    userId = Accounts.createUser
      email: newUser.email
      password: newUser.password
      profile:
        name: newUser.name
    Meteor.users.update(userId, {$set: {group: newUser.group}})
    user = Meteor.users.findOne(userId)
    Email.send
      from: '"' + root.i18n.t("messages.postman") + ' (FlowBAT)" <herald@' + share.getMailDomail() + '>'
      to: newUser.email
      subject: Handlebars.templates["newUserSubject"](user: user, settings: Meteor.settings).trim()
      html: Handlebars.templates["newUserHtml"](user: user, email: newUser.email, password: newUser.password, settings: Meteor.settings).trim()
    userId
