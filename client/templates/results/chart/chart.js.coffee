Template.chart.helpers
  nonNumberDataColumnSpec: ->
    for spec2 in @header.slice(0,1)
      console.log spec2
      spec2.chartType = "string"
    for spec in @header.slice(1)
      console.log spec
      if spec.chartType isnt "number"
        return spec
  reactivityHack: ->
    if not Session.get("chartsLoaded")
      return
    _.defer =>
      data = new google.visualization.DataTable()
      series = []
      for spec in @header
        if @output is "rwstats" and (spec.isPercentage or spec.name is "cumul_%")
          continue
        data.addColumn(spec.chartType, i18n.t("rwcut.fields." + spec.name))
        series.push({queryId: @_id, chartField: spec.name})
      series.shift() # 0-th column is hAxis, so it can't have a series
      for row in @rows
        values = []
        for value, index in row
          spec = @header[index]
          if @output is "rwstats" and (spec.isPercentage or spec.name is "cumul_%")
            continue
          if index == 0
            value = value.toString() # guarantees that field value is a string
            #test = typeof value
          values.push(value)
        data.addRow(values)
        console.log values
      chartWrapper = share.chartWrappers.get(@_id)
      chartWrapper.setDataTable(data)
      chartWrapper.setChartType(@chartType)
      chartWrapper.setView(
        columns: _.range(data.getNumberOfColumns())
      )
      chartWrapper.setOptions(
        height: @chartHeight
        curveType: "function"
        series: series
        legend:
          position: "right"
        vAxis:
          logScale: true
        hAxis:
          logScale: @chartType not in ["LineChart"]
      )
      container = $(".chart[data-id='" + @_id + "'] .chart-container").get(0)
      chartWrapper.container = container
      for entry, columnIndex in series
        if entry.chartField in @chartHiddenFields
          share.chartWrappers.hideColumn(chartWrapper, columnIndex + 1, true)
      chartWrapper.draw(container)
    null

Template.chart.rendered = ->

Template.chart.events
#  "click .selector": (event, template) ->
