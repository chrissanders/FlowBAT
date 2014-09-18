Session.setDefault("chartsLoaded", false)

Meteor.startup ->
  google.setOnLoadCallback ->
    Session.set("chartsLoaded", true)
