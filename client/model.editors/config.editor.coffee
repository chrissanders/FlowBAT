share.ConfigEditor = new share.Editor(
  collection: share.Configs
  family: "config"
  isSingleLine: (property) ->
    property not in [] # all properties
)
