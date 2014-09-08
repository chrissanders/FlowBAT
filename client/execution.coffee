Deps.autorun (computation) ->
  if share.queriesHandle.ready()
    share.Queries.find({isResultStale: true}).forEach (query) ->
      share.Queries.update(query._id, {$set: {isResultStale: true}}) # re-run query, mainly used for fixtures
    computation.stop()
