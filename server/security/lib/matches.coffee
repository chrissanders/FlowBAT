Match.App =
  Id: Match.Where (value) ->
    check(value, String)
    if share.isDebug
      return true # verbose IDs
    if value.length isnt 17 or _.difference(value.split(""), ["2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]).length
      throw new Match.Error("Value \"" + value + "\" is not a valid ID")
    true
  UserId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless Meteor.users.findOne(value)
      throw new Match.Error("User with ID \"" + value + "\" doesn't exist")
    true
  QueryId: Match.Where (value) ->
    check(value, Match.App.Id)
    unless share.Queries.findOne(value)
      throw new Match.Error("Query with ID \"" + value + "\" doesn't exist")
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
_.extend(Match.App,
  ExternalSource: Match.App.InArray(["trello"])
)
