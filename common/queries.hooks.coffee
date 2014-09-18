share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["interface", "output", "presentation", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.isOutputStale = true
  if _.intersection(fieldNames, ["interface", "output", "presentation"]).length
    modifier.$set = modifier.$set or {}
    _.extend(modifier.$set, share.queryResetValues)
