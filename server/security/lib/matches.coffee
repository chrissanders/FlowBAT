Match.App =
  Id: Match.Where (value) ->
    check(value, String)
    if value.length isnt 17 or _.difference(value.split(""), ["2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]).length
      throw new Match.Error("Value \"" + value + "\" is not a valid ID")
    true
  UserId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless Meteor.users.findOne(value)
      throw new Match.Error("User with ID \"" + value + "\" doesn't exist")
    true
  ExtensionId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Extensions.findOne(value)
      throw new Match.Error("Extension with ID \"" + value + "\" doesn't exist")
    true
  BoardId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Boards.findOne(value)
      throw new Match.Error("Board with ID \"" + value + "\" doesn't exist")
    true
  ListId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Lists.findOne(value)
      throw new Match.Error("List with ID \"" + value + "\" doesn't exist")
    true
  CardId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Cards.findOne(value)
      throw new Match.Error("Card with ID \"" + value + "\" doesn't exist")
    true
  FileId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Files.findOne(value)
      throw new Match.Error("File with ID \"" + value + "\" doesn't exist")
    true
  ListOriginalId: (listId) ->
    Match.Where (value) ->
      if value isnt listId
        check(value, Match.App.ListId)
      true
  CardOriginalId: (cardId) ->
    Match.Where (value) ->
      if value isnt cardId
        check(value, Match.App.CardId)
      true
  isNewUpdate: (oldValue) ->
    Match.Where (value) ->
      check(value, Boolean)
      if value and not oldValue
        throw new Match.Error("isNew update can't be true from false")
      true
  InArray: (possibleValues) ->
    Match.Where (value) ->
      if possibleValues.indexOf(value) == -1
        throw new Match.Error("Expected one of \""+possibleValues.join("\", \"")+"\"; got \"" + value + "\"")
      true
  UnsignedNumber: Match.Where (value) ->
    check(value, Number)
    if value < 0
      throw new Match.Error("Must be unsigned number")
    true
  Email: Match.Where (value) ->
    value.match(share.emailRegex)
  CreateBoardEmailMatch: (boardId) ->
    Match.Where (email) ->
      if not Match.test(email, Match.App.Email)
        throw new Match.Error(root.i18n.t("messages.matches.emailShouldBeValid", {email: email}))
      if not email.match(/board@mail.pintask\.me$/i)
        throw new Match.Error(root.i18n.t("messages.matches.boardEmailShouldHaveValidEnding", {email: email}))
      meaningfulPart = email.replace("board@mail.pintask.me", "").replace(/-$/, "")
      if not meaningfulPart or Match.test(meaningfulPart, Match.App.Id) and meaningfulPart isnt boardId
        throw new Match.Error(root.i18n.t("messages.matches.boardEmailAlreadyReserved", {email: email}))
      if share.Boards.findOne({_id: {$ne: boardId}, email: email})
        throw new Match.Error(root.i18n.t("messages.matches.boardEmailAlreadyReserved", {email: email}))
      true
  Url: Match.Where (value) ->
    value.length < 2083 && value.match(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i);
  Position: Match.Where (value) ->
    check(value, Number)
    true
  CardColor: Match.Where (value) ->
    check(value, Match.Integer)
    value >= 0 && value <= 4
  Color: Match.Where (value) ->
    check(value, String)
    /^\#[a-fA-F0-9]{6}$/.test(value)
  BoardMember: Match.Where (member) ->
    check(member,
      userId: Match.App.UserId
      role: Match.App.CreateBoardMemberRoleMatch()
      permissions: [String]
    )
    true
  CreatePermissionMatch: ->
    Match.App.InArray(_.keys(share.Security.permissions))
  CreateBoardMemberRoleMatch: ->
    Match.App.InArray(["admin", "user", "special"])
  BoardPermissions: (userId, board, context) ->
    Match.Where (modifier) ->
      for operator, operand of modifier
        for key of operand
          permission = "board" + _.str.camelize("-" + key.replace(/[\.\d]+/gi, "-")) + _.str.camelize("-" + operator.replace(/\$/gi, ""))
          if !share.Security.hasBoardPermission(userId, board, permission, context)
            contextAppendix = if context && context.length then "\"When" + context.join("And") + "\"" else "no context"
            throw new Match.Error("No such permissions for current user: \"" + permission + "\" (" + contextAppendix + ")")
      true
  ListPermissions: (userId, list) ->
    Match.Where (modifier) ->
      for operator, operand of modifier
        for key of operand
          permission = "list" + _.str.camelize("-" + key.replace(/[\.\d]+/gi, "-")) + _.str.camelize("-" + operator.replace(/\$/gi, ""))
          if !share.Security.hasListPermission(userId, list, permission)
            context = share.Security.getListPermissionsContext(userId, list)
            contextAppendix = if context.length then "\"When" + context.join("And") + "\"" else "no context"
            throw new Match.Error("No such permissions for user " + userId + ": \"" + permission + "\" (" + contextAppendix + ")")
      true
  CardPermissions: (userId, card, context) ->
    Match.Where (modifier) ->
      for operator, operand of modifier
        for key of operand
          permission = "card" + _.str.camelize("-" + key.replace(/[\.\d]+/gi, "-")) + _.str.camelize("-" + operator.replace(/\$/gi, ""))
          if !share.Security.hasCardPermission(userId, card, permission, context)
            context = share.Security.getListPermissionsContext(userId, card)
            contextAppendix = if context.length then "\"When" + context.join("And") + "\"" else "no context"
            throw new Match.Error("No such permissions for current user: \"" + permission + "\" (" + contextAppendix + ")")
      true
  CommentPermissions: (userId, comment) ->
    Match.Where (modifier) ->
      for operator, operand of modifier
        for key of operand
          permission = "comment" + _.str.camelize("-" + key.replace(/[\.\d]+/gi, "-")) + _.str.camelize("-" + operator.replace(/\$/gi, ""))
          if !share.Security.hasCommentPermission(userId, comment, permission)
            context = share.Security.getCommentPermissionsContext(userId, comment)
            contextAppendix = if context.length then "\"When" + context.join("And") + "\"" else "no context"
            throw new Match.Error("No such permissions for user " + userId + ": \"" + permission + "\" (" + contextAppendix + ")")
      true
  FilePermissions: (userId, file) ->
    Match.Where (modifier) ->
      for operator, operand of modifier
        for key of operand
          permission = "file" + _.str.camelize("-" + key.replace(/[\.\d]+/gi, "-")) + _.str.camelize("-" + operator.replace(/\$/gi, ""))
          if !share.Security.hasFilePermission(userId, file, permission)
            context = share.Security.getFilePermissionsContext(userId, file)
            contextAppendix = if context.length then "\"When" + context.join("And") + "\"" else "no context"
            throw new Match.Error("No such permissions for user " + userId + ": \"" + permission + "\" (" + contextAppendix + ")")
      true
_.extend(Match.App,
  ExternalSource: Match.App.InArray(["trello"])
)
