Template.chart.helpers
  nonNumberDataColumnSpec: ->
    for spec in @header.slice(1)
      if spec.chartType isnt "number"
        return spec
  reactivityHack: ->
    _.defer =>
      $chart = $(".chart[data-id='" + @_id + "']")
      $chart.empty()
      $chartContainer = $("<div class='chart-container'></div>")
      $chart.append($chartContainer)
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
      chart = new google.visualization[@chartType]($chartContainer.get(0))
      chart.draw(data,
        height: @chartHeight
        curveType: "function"
        vAxis:
          logScale: true
      )

Template.chart.rendered = ->


Template.chart.events
#  "click .selector": (event, template) ->
