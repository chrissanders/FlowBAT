share.Tuples.before.update (userId, tuple, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["contents"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.isOutputStale = true
