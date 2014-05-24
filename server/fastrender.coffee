#FastRender.route "/", (params) ->
#  currentUser = Meteor.user()
#  if currentUser
#    profile = currentUser.profile
#    if profile.boardPositions?.length
#      for boardId in profile.boardPositions
#        if share.Boards.findOne({_id: boardId, accessibleBy: currentUser._id})
#          firstBoardId = boardId
#          break
#    unless firstBoardId
#      firstBoard = share.Boards.findOne({accessibleBy: currentUser._id})
#      if firstBoard
#        firstBoardId = firstBoard._id
#    if firstBoardId
#      @subscribe("lists", firstBoardId)
#      @subscribe("cards", firstBoardId)
#
#FastRender.route(/^\/board\/([^\/]+)(.*)/, (params) ->
#  rest = params[1]
#  cardIdPart = rest.match(/\/card\/([^\/]+)/)
#  params.boardId = params[0]
#  params.isArchive = rest.indexOf("/archive") isnt -1
#  params.cardId = cardIdPart?[1]
#
#  unless @_subscriptions.invitation
#    user = Meteor.user()
#    board = share.Boards.findOne(params.boardId)
#    if board
#      if board.isPublic
#        if not user or board._id not in user.profile.boardPositions
#          @subscribe("publicBoards", [], params.boardId)
##          @subscribe("publicInstallations", [], params.boardId)
#        @subscribe("publicLists", [], params.boardId)
#        @subscribe("publicCards", [], params.boardId, params.isArchive)
#        if params.cardId
#          @subscribe("publicComments", [], params.boardId, params.cardId)
#          @subscribe("publicFiles", [], params.boardId, params.cardId)
#      else
#        @subscribe("lists", params.boardId)
#        @subscribe("cards", params.boardId, params.isArchive)
#        if params.cardId
#          @subscribe("comments", params.cardId)
#          @subscribe("files", params.cardId)
#          @subscribe("cardIntervals", params.cardId)
#)

FastRender.onAllRoutes (params) ->
  @subscribe("currentUser")
  @subscribe("friends")
  @subscribe("meetings")
  @subscribe("saker")
  @subscribe("talks")
  @subscribe("replies")
  @subscribe("allUsersInsecure") # TEMP
