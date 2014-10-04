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
    selection = chart.getSelection()
    columns = view.columns
    series = chartWrapper.getOption("series")

    # if selection length is 0, we deselected an element
    if selection.length > 0
      # if row is undefined, we clicked on the legend
      if not selection[0].row
        columnIndex = selection[0].column
        if typeof columns[columnIndex] is "number"
          entry = series[columnIndex - 1]
          share.Queries.update(entry.queryId, {$addToSet: {chartHiddenFields: entry.chartField}})
        else
          entry = series[columnIndex - 1]
          share.Queries.update(entry.queryId, {$pull: {chartHiddenFields: entry.chartField}})
        view.columns = columns
        chartWrapper.draw(chartWrapper.container)
  hideColumn: (chartWrapper, columnIndex) ->
    chart = chartWrapper.getChart()
    data = chartWrapper.getDataTable()
    view = chartWrapper.getView()
    columns = view.columns
    series = chartWrapper.getOption("series")
    sourceColumnIndex = columns[columnIndex]
    columns[columnIndex] =
      label: data.getColumnLabel(sourceColumnIndex)
      type: data.getColumnType(sourceColumnIndex)
      sourceColumn: sourceColumnIndex
      calc: ->
        null
    entry = series[columnIndex - 1]
    entry.color = "#CCCCCC"
