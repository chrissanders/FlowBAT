share.IPSets.allow
  insert: share.securityRulesWrapper (userId, ipset) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    ipset._id = ipset._id or Random.id()
    ipset.ownerId = userId
    check(ipset,
      _id: Match.App.Id
      name: String
      note: String
      contents: String
      isOutputStale: Boolean
      isNew: Boolean
      ownerId: Match.App.UserId
      updatedAt: Date
      createdAt: Date
    )
    if not ipset.name
      throw new Match.Error("Name required")
    if not ipset.contents
      throw new Match.Error("Contents required")
    true
  update: share.securityRulesWrapper (userId, ipset, fieldNames, modifier, options) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is ipset.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    $set =
      name: Match.Optional(String)
      note: Match.Optional(String)
      contents: Match.Optional(String)
      isOutputStale: Match.Optional(Boolean)
      isNew: Match.Optional(Match.App.isNewUpdate(ipset.isNew))
      updatedAt: Date
    check(modifier,
      $set: $set
    )
    if modifier.$set and _.has(modifier.$set, "name") and not modifier.$set.name
      throw new Match.Error("Name required")
    if modifier.$set and _.has(modifier.$set, "contents") and not modifier.$set.contents
      throw new Match.Error("Contents required")
    true
  remove: share.securityRulesWrapper (userId, ipset) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is ipset.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    true
