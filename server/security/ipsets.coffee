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
      isStale: Boolean
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
      isStale: Match.Optional(Boolean)
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

#    ipsets.allow
#  insert: SecurityRulesWrapper (userId, ipset) ->
#    unless userId
#      throw new Match.Error("Operation not allowed for unauthorized users")
#    if ipset._id isnt ipset.originalId
#      unless Pintask.getMirroringInstallation(userId)?.credit > 0
#        throw new Match.Error("No credits on mirroring extension subscription")
#    delete ipset.updatedAt
#    delete ipset.createdAt
#    ipset._id = ipset._id or Random.id()
#    check(ipset,
#      _id: Match.App.Id
#      name: String
#      text: String
#      listId: Match.App.ListId
#      boardId: Match.App.BoardId
#      originalBoardId: Match.App.BoardId
#      position: Match.App.Position
#      color: Match.App.ipsetColor
#      remindAt: Match.Optional(Date)
#      remindAtDispatchedBy: Match.Optional([String])
#      deadlineAt: Match.Optional(Date)
#      deadlineAtDispatchedBy: Match.Optional([String])
#      coverId: Match.Optional(Match.App.FileId)
#      memberIds: [Match.App.UserId]
#      voterIds: [Match.App.UserId]
#      ownerId: Match.App.UserId
#      originalId: Match.App.ipsetOriginalId(ipset._id)
#      totalMirrorsCount: Match.Integer
#      isNew: Boolean
#      isArchived: Boolean
#      plugins: Match.Optional(Object)
#      data: Match.Optional(Object)
#    )
#    board = Boards.findOne(ipset.boardId)
#    if !Security.hasBoardPermission(userId, board, "ipsetInsert")
#      throw new Match.Error("No such permission for current user: \"ipsetInsert\"")
#    now = new Date()
#    ipset.ownerId = (if board.isSealed and ipset._id is ipset.originalId then userId else ipset.ownerId) || userId
#    ipset.updatedAt = now
#    ipset.createdAt = now
#    true
#  update: SecurityRulesWrapper (userId, ipset, fieldNames, modifier) ->
#    unless userId
#      throw new Match.Error("Operation not allowed for unauthorized users")
#    $set =
#      name: Match.Optional(String)
#      text: Match.Optional(String)
#      listId: Match.Optional(Match.App.ListId)
#      boardId: Match.Optional(Match.App.BoardId)
#      position: Match.Optional(Match.App.Position)
#      color: Match.Optional(Match.App.ipsetColor)
#      remindAt: Match.Optional(Date)
#      remindAtDispatchedBy: Match.Optional([String])
#      deadlineAt: Match.Optional(Date)
#      deadlineAtDispatchedBy: Match.Optional([String])
#      coverId: Match.Optional(Match.App.FileId)
#      isNew: Match.Optional(Match.App.isNewUpdate(ipset.isNew))
#      isArchived: Match.Optional(Boolean)
#    $unset =
#      remindAt: Match.Optional(Boolean)
#      remindAtDispatchedBy: Match.Optional(Boolean)
#      deadlineAt: Match.Optional(Boolean)
#      deadlineAtDispatchedBy: Match.Optional(Boolean)
#      coverId: Match.Optional(Boolean)
#    $pull =
#      memberIds: Match.Optional(Match.App.UserId)
#      voterIds: Match.Optional(Match.App.UserId)
#    $addToSet =
#      memberIds: Match.Optional(Match.App.UserId)
#      voterIds: Match.Optional(Match.App.UserId)
#    check(modifier,
#      $set: Match.Optional($set)
#      $unset: Match.Optional($unset)
#      $pull: Match.Optional($pull)
#      $addToSet: Match.Optional($addToSet)
#    )
#    check(modifier, Match.App.ipsetPermissions(userId, Transformations.ipset(ipset)))
#    if modifier.$set?.listId
#      oldList = Lists.findOne(ipset.listId)
#      newList = Lists.findOne(modifier.$set.listId)
#      if oldList.boardId != newList.boardId
#        if !Security.hasListPermission(userId, Transformations.list(oldList), "ipsetListIdWithDifferentBoardIdSet")
#          throw new Match.Error("Can't move ipset to another board, as the current user doesn't have ipsetListIdWithDifferentBoardIdSet permission for old board")
#        if !Security.hasListPermission(userId, Transformations.list(newList), "ipsetListIdWithDifferentBoardIdSet")
#          throw new Match.Error("Can't move ipset to another board, as the current user doesn't have ipsetListIdWithDifferentBoardIdSet permission for new board")
#    modifier.$set = modifier.$set || {}
#    modifier.$set.updatedAt = new Date()
#    true
#  remove: SecurityRulesWrapper (userId, ipset) ->
#    unless userId
#      throw new Match.Error("Operation not allowed for unauthorized users")
#    unless Security.hasipsetPermission(userId, Transformations.ipset(ipset), "ipsetRemove")
#      throw new Match.Error("Can't remove ipset " + ipset._id + ", as the user " + userId + " doesn't have ipsetRemove permission")
#    true
