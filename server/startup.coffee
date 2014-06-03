process.env.MAIL_URL = Meteor.settings.mailUrl
#share.twilio = if Meteor.settings.twilio.sid then Twilio(Meteor.settings.twilio.sid, Meteor.settings.twilio.token) else null

Email.sendImmediate = Email.send
Email.send = (options) ->
  share.Emails.insert(options)
  if Meteor.settings.public.isDebug
    Meteor.setTimeout(->
      share.sendEmails()
    , 1000)

Accounts.emailTemplates.from = "Postman (Meetings) <herald@mail.meetings.me>"
Accounts.emailTemplates.resetPassword.subject = (user) ->
  Handlebars.templates["resetPasswordSubject"](user: user, settings: Meteor.settings).trim()
Accounts.emailTemplates.resetPassword.text = (user, url) ->
Accounts.emailTemplates.resetPassword.html = (user, url) ->
  Handlebars.templates["resetPasswordHtml"](user: user, url: url, settings: Meteor.settings).trim()

Meteor.startup ->
  Meteor.users._ensureIndex({friendUserIds: 1}, {background: true})
  share.loadFixtures()
  if Meteor.settings.public.isDebug
    Meteor.setInterval(share.loadFixtures, 300)
  else
#    Apm.connect(Meteor.settings.apm.appId, Meteor.settings.apm.secret)
