#process.env.MAIL_URL = Meteor.settings.mailUrl
#share.twilio = if Meteor.settings.twilio.sid then Twilio(Meteor.settings.twilio.sid, Meteor.settings.twilio.token) else null

Meteor.startup ->
  Meteor.users._ensureIndex({friendUserIds: 1}, {background: true})
  share.loadFixtures()
  if Meteor.settings.public.isDebug
    Meteor.setInterval(share.loadFixtures, 300)
  else
#    Apm.connect(Meteor.settings.apm.appId, Meteor.settings.apm.secret)

#root.i18n.init(
#  resStore: share.i18nData
#  fallbackLng: "en"
#  interpolationPrefix: "{{"
#  interpolationSuffix: "}}"
#)
