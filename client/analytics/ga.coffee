Meteor.startup ->
  if Meteor.settings.public.googleAnalytics.disabled
    window["ga-disable-" + Meteor.settings.public.googleAnalytics.property] = true
  ga("create", Meteor.settings.public.googleAnalytics.property, if Meteor.settings.public.isDebug then "none" else "auto");

share.debouncedSendPageview = _.debounce(->
  ga("send", "pageview", Router.current({reactive: false}).path)
, 300)
