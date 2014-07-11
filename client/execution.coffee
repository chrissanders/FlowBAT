Deps.autorun (computation) ->
  if share.queriesHandle.ready()
    share.Queries.find({stale: true}).forEach (query) ->
      share.Queries.update(query._id, {$set: {stale: true}}) # re-run query, mainly used for fixtures
    computation.stop()
