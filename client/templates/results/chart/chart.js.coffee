Template.chart.helpers
#  helper: ->

Template.chart.rendered = ->
  cl @data.header
  cl @data.rows
  data = new google.visualization.DataTable()
  for spec in @data.header
    data.addColumn(spec.chartType, i18n.t("rwcut.fields." + spec.name))
  data.addRows(@data.rows)
  chart = new google.visualization.LineChart(@firstNode)
  chart.draw(data,
    curveType: "function"
    vAxis:
      logScale: true
  )

Template.chart.events
#  "click .selector": (event, template) ->
