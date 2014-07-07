share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, ["string", "startRecNum", "sortField", "sortReverse"]).length
    modifier.$set = modifier.$set or {}
    modifier.$set.stale = true
    if "string" in fieldNames
      _.extend(modifier.$set, share.queryResetValues)

Deps.autorun (computation) ->
  if share.queriesHandle.ready()
    share.Queries.find({stale: true}).forEach (query) ->
      share.Queries.update(query._id, {$set: {stale: true}}) # re-run query, mainly used for fixtures
    computation.stop()
