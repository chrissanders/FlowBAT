share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if modifier.$set
    if _.has(modifier.$set, "executingInterval")
      if modifier.$set.executingInterval
        modifier.$set.executingAt = new Date(new Date().getTime() + modifier.$set.executingInterval)
      else
        modifier.$set.executingAt = null
