share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if "string" in fieldNames
    modifier.$set = modifier.$set or {}
    modifier.$set.result = ""
