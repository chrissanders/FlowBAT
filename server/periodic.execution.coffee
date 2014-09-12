share.executePeriodicQueries = ->
  share.Queries.find({executingAt: {$lt: new Date()}}).forEach (query) ->
#    cl "Executing " + query.name
    share.Queries.update(query._id, {$set: {isOutputStale: true, executingAt: new Date(new Date().getTime() + query.executingInterval)}})
