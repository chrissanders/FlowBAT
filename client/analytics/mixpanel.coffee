#Meteor.startup ->
#  mixpanel.init(Meteor.settings.public.mixpanel.token)
#  if Meteor.settings.public.mixpanel.disabled
#    mixpanel.disable()
##  mixpanel.set_config({debug: Meteor.settings.public.isDebug})
##  unless Meteor.userId()
##    mixpanel.track("Visit")
