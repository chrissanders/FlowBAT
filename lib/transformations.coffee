# not used by default
class share.User
  constructor: (doc) ->
    _.extend(@, doc)
    @email = @emails?[0]?.address
    @name = @profile.name
    @firstName = @name.split(' ').slice(0, 1).join(' ')
    @lastName = @name.split(' ').slice(1).join(' ')

class share.Config
  constructor: (doc) ->
    _.extend(@, doc)
  wrapCommand: (command) ->
    "ssh " + @getSSHOptions() + " " + @user + "@" + @host + " \"" + command + "\""
  getSSHOptions: ->
    "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -i " + @getIdentityFilename()
  getIdentityFilename: ->
    process.env.PWD + "/settings/identity"

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
          row.push({_id: @header[index], value: parsedValue, queryId: @_id})
        @rows.push(row)
  displayName: ->
    if @isQuick then "Quick query #" + @_id else @name or "#" + @_id
  path: ->
    "/query/" + @_id

class share.IPSet
  constructor: (doc) ->
    _.extend(@, doc)
  displayName: ->
    @name or "#" + @_id
  objectSelectName: ->
    @displayName()
  objectSelectValue: ->
    @_id
  path: ->
    "/ipset/" + @_id

share.Transformations =
  config: (config) ->
    if config instanceof share.Config or not config then config else new share.Config(config)
  query: (query) ->
    if query instanceof share.Query or not query then query else new share.Query(query)
  ipset: (ipset) ->
    if ipset instanceof share.IPSet or not ipset then ipset else new share.IPSet(ipset)
