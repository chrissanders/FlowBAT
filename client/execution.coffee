Deps.autorun (computation) ->
  if share.queriesHandle.ready()
    share.Queries.find({isStale: true}).forEach (query) ->
      share.Queries.update(query._id, {$set: {isStale: true}}) # re-run query, mainly used for fixtures
    computation.stop()
