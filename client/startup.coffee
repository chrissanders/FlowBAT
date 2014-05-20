Meteor.startup ->
  if share.isDebug
    amplify.store("processedPropertyIds", [])
    amplify.store("requiredPropertyIds", [])
  else
    amplify.store("processedPropertyIds", amplify.store("processedPropertyIds") or [])
    amplify.store("requiredPropertyIds", amplify.store("requiredPropertyIds") or [])

#window.fbAsyncInit = ->
#  FB.init(
#    appId: Meteor.settings.public.facebook.appId
#    xfbml: true
#  )
