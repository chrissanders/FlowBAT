fs = Npm.require("fs")
Process = Npm.require("child_process")
Future = Npm.require('fibers/future')
writeFile = Future.wrap(fs.writeFile)

share.Queries.before.insert (userId, query) ->
  query.string = share.buildQueryString(query)
  query.exclusions = share.buildQueryExclusions(query)

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, share.stringBuilderFields).length
    share.Queries.update(query._id, {$set: {isStringStale: true, string: share.buildQueryString(query), exclusions: share.buildQueryExclusions(query)}})

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not query.isResultStale
    return
  if not query.string
    share.Queries.update(query._id, {$set: {isStringStale: false, isResultStale: false}})
    return
  config = share.Configs.findOne({}, {transform: share.Transformations.config})
  user = Meteor.users.findOne(query.ownerId)
  numRecs = user.profile.numRecs
  callback = (result, error, code) ->
    share.Queries.update(query._id, {$set: {result: result, error: error, code: code, isStringStale: false, isResultStale: false}})
  loadQueryResult(query, config, numRecs, callback)

Meteor.methods
  checkConnection: ->
    unless @userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    queryId = share.Queries.insert({
      interface: "cmd"
      cmd: "--protocol=0-255"
      isQuick: true
    })
    config = share.Configs.findOne({}, {transform: share.Transformations.config})
    query = share.Queries.findOne(queryId)
    query.string = share.buildQueryString(query) # after defaults are applied
    query.exclusions = share.buildQueryExclusions(query)
    @unblock()
    fut = new Future()
    callback = (result, error, code) ->
      if error
        fut.throw(new Meteor.Error(500, error))
      else
        fut.return(result)
    executeQuery(query, config, callback)
    fut.wait()
    # quick queries are cleaned up automatically
  loadDataForCSV: (queryId) ->
    check(queryId, Match.App.QueryId)
    unless @userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    config = share.Configs.findOne({}, {transform: share.Transformations.config})
    query = share.Queries.findOne(queryId)
    unless @userId is query.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    @unblock()
    fut = new Future()
    callback = (result, error, code) ->
      if error
        fut.throw(new Error(error))
      else
        fut.return(result)
    query.startRecNum = 1
    loadQueryResult(query, config, 0, callback)
    fut.wait()
  getRwfToken: (queryId) ->
    check(queryId, Match.App.QueryId)
    unless @userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    config = share.Configs.findOne({}, {transform: share.Transformations.config})
    query = share.Queries.findOne(queryId)
    unless @userId is query.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    @unblock()
    token = Random.id()
    fut = new Future()
    callback = (result, error, code) ->
      if error
        fut.throw(new Error(error))
      else
        if config.isSSH
          copyCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + config.user + "@" + config.host + ":/tmp/" + query._id + ".rwf /tmp/" + token + ".rwf"
        else
          copyCommand = "cp /tmp/" + query._id + ".rwf /tmp/" + token + ".rwf"
        Process.exec(copyCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
          result = stdout.trim()
          error = stderr.trim()
          code = if err then err.code else 0
          if error
            fut.throw(new Error(error))
          else
            fut.return(token)
        ))
    executeQuery(query, config, callback)
    fut.wait()

executeQuery = (query, config, callback) ->
  rwsetbuildErrors = []
  rwsetbuildFutures = []
  isIpsetStale = false
  _.each(["dipSet", "sipSet", "anySet"], (field) ->
    if query[field + "Enabled"] and query[field]
      set = share.IPSets.findOne(query[field])
      if set.isResultStale
        isIpsetStale = true
        rwsetbuildFuture = new Future()
        txtFilename = "/tmp/" + set._id + ".txt"
        rwsFilename = "/tmp/" + set._id + ".rws"
        writeFileFuture = writeFile(txtFilename, set.contents)
        if config.isSSH
          scpCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + txtFilename + " " + config.user + "@" + config.host + ":" + txtFilename
          scpFuture = new Future()
          Process.exec(scpCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
            result = stdout.trim()
            error = stderr.trim()
            code = if err then err.code else 0
            if error
              rwsetbuildErrors.push(error)
            if code is 0
            else
              if not error
                throw "scp: code is \"" + code + "\" while stderr is \"" + error + "\""
            scpFuture.return(result)
          ))
          scpFuture.wait()
        rmCommand = "rm -f " + rwsFilename
        if config.isSSH
          rmCommand = config.wrapCommand(rmCommand)
        rmFuture = new Future()
        Process.exec(rmCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
          result = stdout.trim()
          error = stderr.trim()
          code = if err then err.code else 0
          if error
            rwsetbuildErrors.push(error)
          if code is 0
          else
            if not error
              throw "rm: code is \"" + code + "\" while stderr is \"" + error + "\""
          rmFuture.return(result)
        ))
        rmFuture.wait()
        writeFileFuture.resolve Meteor.bindEnvironment((err, result) ->
          if err
            rwsetbuildErrors.push(err)
            rwsetbuildFuture.return(result)
          else
            rwsetbuildCommand = "rwsetbuild " + txtFilename + " " + rwsFilename
            if config.isSSH
              rwsetbuildCommand = config.wrapCommand(rwsetbuildCommand)
            Process.exec(rwsetbuildCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
              result = stdout.trim()
              error = stderr.trim()
              code = if err then err.code else 0
              if error
                rwsetbuildErrors.push(error)
              if code is 0
                share.IPSets.update(set._id, {$set: {isResultStale: false}})
              else
                if not error
                  throw "rwsetbuild: code is \"" + code + "\" while stderr is \"" + error + "\""
              rwsetbuildFuture.return(result)
            ))
        )
        rwsetbuildFutures.push(rwsetbuildFuture)
  )
  Future.wait(rwsetbuildFutures)

  if rwsetbuildErrors.length
    callback("", rwsetbuildErrors.join("\n"), 255)
    return

  if not query.isStringStale and not isIpsetStale
    callback("", "", 0)
    return

  rwfilterOptions = query.string.split(" ")
  if config.siteConfigFile
    rwfilterOptions.push("--site-config-file=" + config.siteConfigFile)
  if config.dataRootdir
    rwfilterOptions.push("--data-rootdir=" + config.dataRootdir)
  rwfilterOptions.push("--pass=stdout")

  for exclusion in query.exclusions
    rwfilterOptions.push("| rwfilter --input-pipe=stdin")
    rwfilterOptions.push(exclusion)
    if config.siteConfigFile
      rwfilterOptions.push("--site-config-file=" + config.siteConfigFile)
    # config.dataRootdir shouldn't be used with exclusions
    rwfilterOptions.push("--fail=stdout")

  rwfilterOptions.push("> /tmp/" + query._id + ".rwf")

  command = "rwfilter " + rwfilterOptions.join(" ")

  if config.isSSH
    command = config.wrapCommand(command)
  Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    callback(result, error, code)
  ))

loadQueryResult = (query, config, numRecs, callback) ->
  executeQuery(query, config, Meteor.bindEnvironment((result, error, code) ->
    if error
      return callback(result, error, code)
    switch query.output
      when "rwcut"
        outputRwcut(query, config, numRecs, callback)
      when "rwstats"
        outputRwstats(query, config, numRecs, callback)
      when "rwcount"
        outputRwcount(query, config, numRecs, callback)
      else
        callback("", "Undefined output: \"" + query.output + "\"", 255)
  ))

outputRwcut = (query, config, numRecs, callback) ->
  commands = []
  if query.sortField
    rwsortOptions = ["--fields=" + query.sortField]
    if query.sortReverse
      rwsortOptions.push("--reverse")
    if config.siteConfigFile
      rwsortOptions.push("--site-config-file=" + config.siteConfigFile)
    commands.push("rwsort " + rwsortOptions.join(" "))
  rwcutOptions = ["--num-recs=" + numRecs, "--start-rec-num=" + query.startRecNum, "--delimited"]
  if query.fields.length
    rwcutOptions.push("--fields=" + _.intersection(query.fieldsOrder, query.fields).join(","))
  if config.siteConfigFile
    rwcutOptions.push("--site-config-file=" + config.siteConfigFile)
  commands.push("rwcut " + rwcutOptions.join(" "))
  commands[0] += " /tmp/" + query._id + ".rwf"
  command = commands.join(" | ")
  if config.isSSH
    command = config.wrapCommand(command)
  Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    if error.indexOf("Error opening file") isnt -1
      query.isStringStale = true
      loadQueryResult(query, config, numRecs, callback)
    else
      callback(result, error, code)
  ))

outputRwstats = (query, config, numRecs, callback) ->
  rwstatsOptions = []
  if query.rwstatsFields.length
    rwstatsOptions.push("--fields=" + _.intersection(query.rwstatsFieldsOrder, query.rwstatsFields).join(","))
  if query.rwstatsValues.length
    rwstatsValues = query.rwstatsValues
    rwstatsValuesOrder = query.rwstatsValuesOrder
    if query.rwstatsPrimaryValue
      rwstatsValues.unshift(query.rwstatsPrimaryValue)
      rwstatsValuesOrder.unshift(query.rwstatsPrimaryValue)
    values = _.intersection(rwstatsValuesOrder, rwstatsValues)
    for value, index in values
      if value not in share.rwstatsValues
        values[index] = "distinct:" + value
    rwstatsOptions.push("--values=" + values.join(","))
    if values[0] not in share.rwstatsValues
      rwstatsOptions.push("--no-percents")
  rwstatsOptions.push("--" + query.rwstatsDirection)
  switch query.rwstatsMode
    when "count"
      rwstatsOptions.push("--count=" + query.rwstatsCountModeValue)
    when "threshold"
      rwstatsOptions.push("--threshold=" + query.rwstatsThresholdModeValue)
    when "percentage"
      rwstatsOptions.push("--percentage=" + query.rwstatsPercentageModeValue)
  if query.rwstatsBinTimeEnabled
    if query.rwstatsBinTime
      rwstatsOptions.push("--bin-time=" + query.rwstatsBinTime)
    else
      rwstatsOptions.push("--bin-time")
  if config.siteConfigFile
    rwstatsOptions.push("--site-config-file=" + config.siteConfigFile)
  rwstatsOptionsString = rwstatsOptions.join(" ")
  rwstatsOptionsString = share.filterOptions(rwstatsOptionsString)
  command = "rwstats " + rwstatsOptionsString + " /tmp/" + query._id + ".rwf"
  if config.isSSH
    command = config.wrapCommand(command)
  Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    if error.indexOf("Error opening file") isnt -1
      query.isStringStale = true
      loadQueryResult(query, config, numRecs, callback)
    else
      callback(result, error, code)
  ))
