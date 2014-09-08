share.userStartupOnce = _.once ->
  user = share.user({"profile": 1})
  i18n.setLng(user.profile.locale)
  moment.lang(user.profile.locale)
  $.datepicker.setDefaults($.datepicker.regional[i18n.lng()] or $.datepicker.regional[""])

share.currentUserHandle = Meteor.subscribe("currentUser", ->
  Deps.autorun ->
    if Meteor.user()
      share.userStartupOnce()
)
share.usersHandle = null
share.configsHandle = null
Deps.autorun ->
  # if group changes, resubscribe
  user = share.user({group: 1})
  group = if user then user.group else ""
  # group argument needed to bust subscription cache
  share.usersHandle = Meteor.subscribe("users", group)
  share.configsHandle = Meteor.subscribe("configs", group)
share.queriesHandle = Meteor.subscribe("queries")
share.ipsetsHandle = Meteor.subscribe("ipsets")
