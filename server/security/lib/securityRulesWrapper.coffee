share.securityRulesWrapper = (func) ->
  return ->
    user = Meteor.user()
    if user
      root.i18n.setLng(user.profile.locale)
      moment.lang(user.profile.locale)
    try
      return func.apply(@, arguments)
    catch exception
      Meteor._debug(exception)
      Meteor._debug(arguments)
      throw exception
