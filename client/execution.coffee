share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["string", "startRecNum"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.stale = true
