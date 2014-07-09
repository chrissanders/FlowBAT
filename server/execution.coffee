Process = Npm.require("child_process")
Future = Npm.require('fibers/future')

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not userId # fixtures
    return
  if not query.stale
    return
  if not query.string
    share.Queries.update(query._id, {$set: {stale: false}})
  user = Meteor.users.findOne(userId)
  numRecs = user.profile.numRecs
  callback = (result, error, code) ->
    share.Queries.update(query._id, {$set: {result: result, error: error, code: code, stale: false}})
  run(query, numRecs, false, callback)

Meteor.methods
  loadDataForCSV: (queryId) ->
    check(queryId, Match.App.QueryId)
    @unblock()
    query = share.Queries.findOne(queryId)
    fut = new Future()
    callback = (result, error, code) ->
      if error
        fut.throw(new Error(error))
      else
        fut.return(result)
    query.startRecNum = 1
    run(query, 0, false, callback)
    fut.wait()
  getRwfToken: (queryId) ->
    check(queryId, Match.App.QueryId)
    @unblock()
    query = share.Queries.findOne(queryId)
    fut = new Future()
    callback = (result, error, code, token) ->
      if error
        fut.throw(new Error(error))
      else
        fut.return(token)
    query.startRecNum = 1
    run(query, 0, true, callback)
    fut.wait()

run = (query, numRecs, binary, callback) ->
  config = share.Configs.findOne()
  token = Random.id()
  rwfilterArguments = query.string.split(" ")
  if config.siteConfigFile
    rwfilterArguments.push("--site-config-file=" + config.siteConfigFile)
  if binary
    rwfilterArguments.push("--pass=/tmp/" + token + ".rwf")
  else
    rwfilterArguments.push("--pass=stdout")
  command = "rwfilter " + rwfilterArguments.join(" ")
  if not binary
    if query.sortField
      rwsortArguments = ["--fields=" + query.sortField]
      if query.sortReverse
        rwsortArguments.push("--reverse")
      command += " | " + "rwsort " + rwsortArguments.join(" ")
    rwcutArguments = ["--fields=" + query.fields.join(","), "--num-recs=" + numRecs, "--start-rec-num=" + query.startRecNum, "--delimited"]
    command += " | " + "rwcut " + rwcutArguments.join(" ")
  if config.isSSH
    identityDir = process.env.PWD + "/settings"
    identityFile = identityDir + "/identity"
    sshOptions = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -i " + identityFile
    command = "ssh " + sshOptions + " "+ config.user + "@" + config.host + " \"" + command + "\""
  Process.exec(command, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    if error is "rwfilter: Error writing to stream 'stdout': Broken pipe"
      # rwcut closes stdin after reading first --num-recs records
      error = ""
      code = 0
    if binary
      if config.isSSH
        scp = "scp " + sshOptions + " "+ config.user + "@" + config.host + ":/tmp/" + token + ".rwf /tmp/" + token + ".rwf"
        Process.exec(scp, Meteor.bindEnvironment((err, stdout, stderr) ->
          result = stdout.trim()
          error = stderr.trim()
          code = if err then err.code else 0
          callback(result, error, code, token)
        ))
      else
        callback(result, error, code, token)
    else
      callback(result, error, code)
  ))
