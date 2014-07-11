share.QueryEditor = new share.Editor(
  collection: share.Queries
  family: "query"
  isSingleLine: (property) ->
    property not in [] # all properties
)
