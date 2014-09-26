share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["interface", "output", "presentation", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.isOutputStale = true
  if _.intersection(fieldNames, ["interface", "output", "presentation"]).length
    modifier.$set = modifier.$set or {}
    _.extend(modifier.$set, share.queryResetValues)

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if "output" in fieldNames
    transformedQuery = share.Transformations.query(query)
    availableChartTypes = transformedQuery.availableChartTypes()
    if query.chartType not in availableChartTypes
      share.Queries.update(query._id, {$set: {chartType: availableChartTypes[0] or ""}})
