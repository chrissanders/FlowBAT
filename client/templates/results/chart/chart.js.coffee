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
#        if @output is "rwstats" and spec.isPercentage
#          continue
        data.addColumn(spec.chartType, i18n.t("rwcut.fields." + spec.name))
      data.addRows(@rows)
      chart = new google.visualization[@chartType]($chartContainer.get(0))
      chart.draw(data,
        curveType: "function"
        vAxis:
          logScale: true
      )

Template.chart.rendered = ->


Template.chart.events
#  "click .selector": (event, template) ->
