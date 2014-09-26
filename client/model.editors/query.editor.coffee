share.QueryEditor = new share.Editor(
  collection: share.Queries
  family: "query"
  isSingleLine: (property) ->
    property not in [] # all properties
  cleanProperty: (property, value) ->
    if property in ["startDateOffset", "chartHeight"]
      return share.intval(value)
    return value
  stopEditing: ->
    # override, fix for "Escape triggering type=null"
)
