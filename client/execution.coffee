share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["string", "startRecNum"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.stale = true
    if "string" in fieldNames
      modifier.$set.startRecNum = 1
