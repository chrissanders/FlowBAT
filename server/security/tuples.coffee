share.Tuples.allow
  insert: share.securityRulesWrapper (userId, tuple) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    tuple._id = tuple._id or Random.id()
    tuple.ownerId = userId
    check(tuple,
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
    if not tuple.name
      throw new Match.Error("Name required")
    if not tuple.contents
      throw new Match.Error("Contents required")
    true
  update: share.securityRulesWrapper (userId, tuple, fieldNames, modifier, options) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is tuple.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    $set =
      name: Match.Optional(String)
      note: Match.Optional(String)
      contents: Match.Optional(String)
      isOutputStale: Match.Optional(Boolean)
      isNew: Match.Optional(Match.App.isNewUpdate(tuple.isNew))
      updatedAt: Date
    check(modifier,
      $set: $set
    )
    if modifier.$set and _.has(modifier.$set, "name") and not modifier.$set.name
      throw new Match.Error("Name required")
    if modifier.$set and _.has(modifier.$set, "contents") and not modifier.$set.contents
      throw new Match.Error("Contents required")
    true
  remove: share.securityRulesWrapper (userId, tuple) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is tuple.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    true
