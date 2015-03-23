share.TupleEditor = new share.Editor(
  collection: share.Tuples
  family: "tuple"
  isSingleLine: (property) ->
    property not in [] # all properties
  saveProperty: ->
    # noop
  debouncedSaveProperty: ->
    # noop
)
