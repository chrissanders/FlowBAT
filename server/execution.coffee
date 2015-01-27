fs = Npm.require("fs")
Process = Npm.require("child_process")
Future = Npm.require('fibers/future')
writeFile = Future.wrap(fs.writeFile)

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if _.intersection(fieldNames, share.inputFields).length
    share.Queries.update(query._id, {$set: {isInputStale: true}})

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not query.isOutputStale
    return
  query = share.Transformations.query(query)
  if not query.inputOptions()
    share.Queries.update(query._id, {$set: {isInputStale: false, isOutputStale: false}})
    return
  config = share.Configs.findOne({}, {transform: share.Transformations.config})
  profile = Meteor.users.findOne(query.ownerId).profile
  callback = (result, error, code) ->
    share.Queries.update(query._id, {$set: {result: result, error: error, code: code, isInputStale: false, isOutputStale: false}})
  loadQueryResult(query, config, profile, callback)

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
    query = share.Queries.findOne(queryId, {transform: share.Transformations.query})
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
    query = share.Queries.findOne(queryId, {transform: share.Transformations.query})
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
    loadQueryResult(query, config, {numRecs: 0}, callback)
    fut.wait()
  getRwfToken: (queryId) ->
    check(queryId, Match.App.QueryId)
    unless @userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    config = share.Configs.findOne({}, {transform: share.Transformations.config})
    query = share.Queries.findOne(queryId, {transform: share.Transformations.query})
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
          copyCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + config.user + "@" + config.host + ":" + config.dataTempdir + "/" + query._id + ".rwf " + config.dataTempdir + "/" + token + ".rwf"
        else
          copyCommand = "cp " + config.dataTempdir + "/" + query._id + ".rwf " + config.dataTempdir + "/" + token + ".rwf"
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
      if set.isOutputStale
        isIpsetStale = true
        rwsetbuildFuture = new Future()
        txtFilename = config.dataTempdir + "/" + set._id + ".txt"
        rwsFilename = config.dataTempdir + "/" + set._id + ".rws"
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
                share.IPSets.update(set._id, {$set: {isOutputStale: false}})
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

  if not query.isInputStale and not isIpsetStale
    callback("", "", 0)
    return

  command = query.inputCommand(config)
  Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    callback(result, error, code)
  ))

loadQueryResult = (query, config, profile, callback) ->
  executeQuery(query, config, Meteor.bindEnvironment((result, error, code) ->
    if error
      return callback(result, error, code)
    command = query.outputCommand(config, profile)
    Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
      result = stdout.trim()
      error = stderr.trim()
      code = if err then err.code else 0
      if error.indexOf("Error opening file") isnt -1
        query.isInputStale = true
        loadQueryResult(query, config, profile, callback)
      else
        callback(result, error, code)
    ))
  ))
