Template.chart.helpers
  nonNumberDataColumnSpec: ->
    for spec in @header.slice(1)
      if spec.chartType isnt "number"
        return spec
  reactivityHack: ->
    if not Session.get("chartsLoaded")
      return
    _.defer =>
      data = new google.visualization.DataTable()
      for spec in @header
        if @output is "rwstats" and (spec.isPercentage or spec.name is "cumul_%")
          continue
        data.addColumn(spec.chartType, i18n.t("rwcut.fields." + spec.name))
      for row in @rows
        values = []
        for value, index in row
          spec = @header[index]
          if @output is "rwstats" and (spec.isPercentage or spec.name is "cumul_%")
            continue
          values.push(value)
        data.addRow(values)
      chartWrapper = share.chartWrappers.get(@_id)
      chartWrapper.setDataTable(data)
      chartWrapper.setChartType(@chartType)
      chartWrapper.setOptions(
        height: @chartHeight
        curveType: "function"
        vAxis:
          logScale: true
        hAxis:
          logScale: true
      )
      chartWrapper.draw($(".chart[data-id='"+@_id+"'] .chart-container").get(0))
    null

Template.chart.rendered = ->

Template.chart.events
#  "click .selector": (event, template) ->
