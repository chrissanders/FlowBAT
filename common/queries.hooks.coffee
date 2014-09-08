share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["interface", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.isResultStale = true
