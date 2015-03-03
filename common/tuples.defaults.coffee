tuplePreSave = (userId, changes) ->

share.Tuples.before.insert (userId, tuple) ->
  tuple._id = tuple._id || Random.id()
  now = new Date()
  _.defaults(tuple,
    name: ""
    note: ""
    contents: ""
    isOutputStale: true
    isNew: true
    ownerId: userId
    updatedAt: now
    createdAt: now
  )
  if not tuple.name
    prefix = "New Tuple File"
    count = share.Tuples.find({ name: { $regex: "^" + prefix, $options: "i" } }).count()
    tuple.name = prefix
    if count
      tuple.name += " (" + count + ")"
  tuplePreSave.call(@, userId, tuple)

share.Tuples.before.update (userId, tuple, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  tuplePreSave.call(@, userId, modifier.$set)
