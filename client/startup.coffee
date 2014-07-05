Meteor.startup ->
  userId = Meteor.userId()
  if Meteor.settings.public.isDebug
    if not userId and (location.host == "localhost:3000" or location.host.indexOf("192.168") != -1)
      if jQuery.browser.webkit
        Meteor.loginWithPassword("jensjohanhjort@meetings.me", "123123", share.loginCallback)
      if jQuery.browser.mozilla
        Meteor.loginWithPassword("anniskogman@meetings.me", "123123", share.loginCallback)
