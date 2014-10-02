share.periodicExecution =
  timeout: null
  nearestExecutingAt: null
  execute: ->
    share.Queries.find({executingAt: {$lte: new Date()}}).forEach (query) ->
#      cl "executing" + query.name + " at " + new Date() + " requested at " + query.executingAt
      executingAt = new Date(new Date().getTime() + query.executingInterval)
      share.Queries.update(query._id, {$set: {isInputStale: true, isOutputStale: true, executingAt: executingAt}}, {skipResetTimeout: true})
    @resetTimeout()
  resetTimeout: ->
    nearestQuery = share.Queries.findOne({executingAt: {$ne: null}}, {sort: {executingAt: 1}})
    timeout = 30 * 1000
    if nearestQuery
      timeout = nearestQuery.executingAt.getTime() - new Date().getTime()
    if @timeout
      Meteor.clearTimeout(@timeout)
    timeout = Math.max(1000, timeout) # at least a second in future; protection from state with executingAt in the past
#    cl "resetTimeout to " + timeout
    @timeout = Meteor.setTimeout(@execute, timeout)

_.bindAll(share.periodicExecution, "execute", "resetTimeout")