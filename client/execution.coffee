Deps.autorun (computation) ->
  if share.queriesHandle.ready()
    share.Queries.find({isOutputStale: true}).forEach (query) ->
      share.Queries.update(query._id, {$set: {isOutputStale: true}}) # re-run query, mainly used for fixtures
    computation.stop()
