fs = Npm.require("fs")
Process = Npm.require("child_process")
Future = Npm.require('fibers/future')
writeFile = Future.wrap(fs.writeFile)

share.Queries.before.insert (userId, query) ->
  query.string = share.buildQueryString(query)

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, share.stringBuilderFields).length
    share.Queries.update(query._id, {$set: {string: share.buildQueryString(query)}})

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not query.isStale
    return
  if not query.string
    share.Queries.update(query._id, {$set: {isStale: false}})
    return
  config = share.Configs.findOne({}, {transform: share.Transformations.config})
  user = Meteor.users.findOne(query.ownerId)
  numRecs = user.profile.numRecs
  callback = (result, error, code) ->
    share.Queries.update(query._id, {$set: {result: result, error: error, code: code, isStale: false}})
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
  _.each(["dipSet", "sipSet", "anySet"], (field) ->
    if query[field + "Enabled"] and query[field]
      set = share.IPSets.findOne(query[field])
      if set.isStale
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
                share.IPSets.update(set._id, {$set: {isStale: false}})
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
  rwfilterArguments = query.string.split(" ")
  if config.siteConfigFile
    rwfilterArguments.push("--site-config-file=" + config.siteConfigFile)
  if config.dataRootdir
    rwfilterArguments.push("--data-rootdir=" + config.dataRootdir)
  rwfilterArguments.push("--pass=stdout > /tmp/" + query._id + ".rwf")
  command = "rwfilter " + rwfilterArguments.join(" ")
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
    commands = []
    if query.sortField
      rwsortArguments = ["--fields=" + query.sortField]
      if query.sortReverse
        rwsortArguments.push("--reverse")
      if config.siteConfigFile
        rwsortArguments.push("--site-config-file=" + config.siteConfigFile)
      commands.push("rwsort " + rwsortArguments.join(" "))
    rwcutArguments = ["--num-recs=" + numRecs, "--start-rec-num=" + query.startRecNum, "--delimited"]
    if query.fields.length
      rwcutArguments.push("--fields=" + _.intersection(query.fieldsOrder, query.fields).join(","))
    if config.siteConfigFile
      rwcutArguments.push("--site-config-file=" + config.siteConfigFile)
    commands.push("rwcut " + rwcutArguments.join(" "))
    commands[0] += " /tmp/" + query._id + ".rwf"
    command = commands.join(" | ")
    if config.isSSH
      command = config.wrapCommand(command)
    Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
      result = stdout.trim()
      error = stderr.trim()
      code = if err then err.code else 0
      callback(result, error, code)
    ))
  ))
