Template.chart.helpers
#  helper: ->

Template.chart.rendered = ->
  data = new google.visualization.DataTable()
  for spec in @data.header
    data.addColumn(spec.chartType, i18n.t("rwcut.fields." + spec.name))
  data.addRows(@data.rows)
  chart = new google.visualization[@data.chartType](@firstNode)
  chart.draw(data,
    curveType: "function"
    vAxis:
      logScale: true
  )

Template.chart.events
#  "click .selector": (event, template) ->
