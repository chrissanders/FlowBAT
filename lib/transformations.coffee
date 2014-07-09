# not used by default
class share.User
  constructor: (doc) ->
    _.extend(@, doc)
    @email = @emails?[0]?.address
    @name = @profile.name
    @firstName = @name.split(' ').slice(0, 1).join(' ')
    @lastName = @name.split(' ').slice(1).join(' ')

class share.Query
  constructor: (doc) ->
    _.extend(@, doc)
    @header = []
    @rows = []
    if @result
      @rows = share.parseResult(@result)
      @header = @rows.shift()
  path: ->
    "/query/" + @_id

share.Transformations =
  query: (query) ->
    if query instanceof share.Query or not query then query else new share.Query(query)
