share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if modifier.$set
    if _.has(modifier.$set, "executingInterval")
      if modifier.$set.executingInterval
        modifier.$set.executingAt = new Date(new Date().getTime() + modifier.$set.executingInterval)
      else
        modifier.$set.executingAt = null

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if options.skipResetTimeout
    return
  if "executingAt" in fieldNames and query.executingAt
    share.periodicExecution.resetTimeout()