Session.setDefault("chartsLoaded", false)

Meteor.startup ->
  google.setOnLoadCallback ->
    share.chartWrapper = new google.visualization.ChartWrapper()
    Session.set("chartsLoaded", true)
