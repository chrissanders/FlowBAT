share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["startRecNum", "sortField", "sortReverse", "fields"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.stale = true

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, share.stringBuilderFields).length
    share.Queries.update(query._id, {$set: {string: share.buildQueryString(query)}})
