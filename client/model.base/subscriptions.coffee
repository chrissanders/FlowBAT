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
#share.friendsHandle = Meteor.subscribe("friends")
share.queriesHandle = Meteor.subscribe("queries")
share.ipsetsHandle = Meteor.subscribe("ipsets")
