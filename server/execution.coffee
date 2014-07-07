Process = Npm.require("child_process")

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not userId # fixtures
    return
  if not query.stale or not query.string
    return
  user = Meteor.users.findOne(userId)
  rwfilterArguments = query.string.split(" ")
  rwfilterArguments.push("--pass=stdout")
  rwcutArguments = ["--num-recs=" + user.profile.numRecs, "--start-rec-num=" + query.startRecNum]
  Process.exec("rwfilter " + rwfilterArguments.join(" ") + " | " + "rwcut " + rwcutArguments.join(" "), Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    share.Queries.update(query._id, {$set: {result: result, error: error, code: code, stale: false}})
  ))
