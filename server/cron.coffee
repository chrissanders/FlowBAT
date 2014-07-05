share.sendEmails = ->
  if share.sendEmailsRunning
    Meteor._debug("Send email already running; skipping")
    return
  share.sendEmailsRunning = true
  try
    share.Emails.find().forEach (email) ->
      if !email.to.match(/@meetings.me$/)
#        if Meteor.settings.public.isDebug then Meteor._debug('Sending "'+email.subject+'" to "'+email.to+'"')
        Email.sendImmediate(email)
      share.Emails.remove(email._id)
  finally
    share.sendEmailsRunning = false

emailIntervalId = null
setIntervals = ->
  seconds = if Meteor.settings.public.isDebug then 5 else 60
  emailIntervalId = Meteor.setInterval(share.sendEmails, seconds * 1000)

Meteor.startup ->
  if Meteor.settings.public.isDebug
#    setIntervals()
  else
    setIntervals()

