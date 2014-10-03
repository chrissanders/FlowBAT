Session.setDefault("chartsLoaded", false)

Meteor.startup ->
  google.setOnLoadCallback ->
    Session.set("chartsLoaded", true)

share.chartWrappers =
  bag: {}
  get: (_id) ->
    if not @bag[_id]
      @bag[_id] = new google.visualization.ChartWrapper()
      google.visualization.events.addListener(@bag[_id], 'select', _.partial(@showHideSeries, @bag[_id]));
    @bag[_id]
  showHideSeries: (chartWrapper) ->
    chart = chartWrapper.getChart()
    data = chartWrapper.getDataTable()
    view = chartWrapper.getView()
    sel = chart.getSelection()
    columns = view.columns
    series = chartWrapper.getOption("series")

    # if selection length is 0, we deselected an element
    if sel.length > 0
      # if row is undefined, we clicked on the legend
      if not sel[0].row
        columnIndex = sel[0].column
        if typeof columns[columnIndex] is "number"
          src = columns[columnIndex]

          # hide the data series
          columns[columnIndex] =
            label: data.getColumnLabel(src)
            type: data.getColumnType(src)
            sourceColumn: src
            calc: ->
              null


          # grey out the legend entry
          series[src - 1].color = "#CCCCCC"
        else
          src = columns[columnIndex].sourceColumn

          # show the data series
          columns[columnIndex] = src
          series[src - 1].color = null
        view.columns = columns
        chartWrapper.draw(chartWrapper.container)