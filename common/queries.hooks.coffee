share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["interface", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.isStale = true

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, share.stringBuilderFields).length
    share.Queries.update(query._id, {$set: {string: share.buildQueryString(query)}})

