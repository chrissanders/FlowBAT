Template.chart.helpers
  prettyRwstatsFields: ->
    fields = _.intersection(@rwstatsFieldsOrder, @rwstatsFields)
    if @interface is "builder"
      for field, index in fields
        fields[index] = i18n.t("rwcut.fields." + field)
      fields.join(", ")
    else
      fields.join(",")
  reactivityHack: ->
    _.defer =>
      $chart = $(".chart[data-id='" + @_id + "']")
      $chart.empty()
      $chartContainer = $("<div class='chart-container'></div>")
      $chart.append($chartContainer)
      data = new google.visualization.DataTable()
      for spec in @header
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
