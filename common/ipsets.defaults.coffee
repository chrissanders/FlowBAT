ipsetPreSave = (userId, changes) ->

share.IPSets.before.insert (userId, ipset) ->
  ipset._id = ipset._id || Random.id()
  now = new Date()
  _.defaults(ipset,
    name: ""
    description: ""
    contents: ""
    isNew: true
    ownerId: userId
    updatedAt: now
    createdAt: now
  )
  if not ipset.name
    prefix = "New IP Set"
    count = share.IPSets.find({ name: { $regex: "^" + prefix, $options: "i" } }).count()
    ipset.name = prefix
    if count
      ipset.name += " (" + count + ")"
  ipsetPreSave.call(@, userId, ipset)

share.IPSets.before.update (userId, ipset, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  ipsetPreSave.call(@, userId, modifier.$set)
