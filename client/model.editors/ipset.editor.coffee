share.IPSetEditor = new share.Editor(
  collection: share.IPSets
  family: "ipset"
  isSingleLine: (property) ->
    property not in [] # all properties
  saveProperty: ->
    # noop
  debouncedSaveProperty: ->
    # noop
)
