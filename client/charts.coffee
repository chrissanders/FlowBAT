Session.setDefault("chartsLoaded", false)

Meteor.startup ->
  google.setOnLoadCallback ->
    Session.set("chartsLoaded", true)

share.chartWrappers =
  bag: {}
  get: (_id) ->
    if not @bag[_id]
      @bag[_id] = new google.visualization.ChartWrapper()
    @bag[_id]