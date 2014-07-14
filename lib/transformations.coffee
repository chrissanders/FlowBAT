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
      parsedResult = share.parseResult(@result)
      @header = parsedResult.shift()
      for parsedRow in parsedResult
        row = []
        for parsedValue, index in parsedRow
          row.push({type: @header[index], value: parsedValue})
        @rows.push(row)
  path: ->
    "/query/" + @_id

share.Transformations =
  query: (query) ->
    if query instanceof share.Query or not query then query else new share.Query(query)
