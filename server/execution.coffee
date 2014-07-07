Process = Npm.require("child_process")

share.Queries.after.update (userId, query, fieldNames, modifier, options) ->
  if not userId # fixtures
    return
  if not query.stale or not query.string
    return
  user = Meteor.users.findOne(userId)
  result = ""
  error = ""
  rwfilterArguments = query.string.split(" ")
  rwfilterArguments.push("--pass=stdout")
  rwcut = Process.spawn("rwcut", ["--num-recs=" + user.profile.numRecs, "--start-rec-num=" + query.startRecNum])
  rwcut.stdout.setEncoding("utf8")
  rwcut.stderr.setEncoding("utf8")
  rwfilter = Process.spawn("rwfilter", rwfilterArguments)
  rwfilter.stdout.on("data", Meteor.bindEnvironment((data) ->
#    cl "rwfilter.stdout.data"
    rwcut.stdin.write(data)
  ))
  rwfilter.stderr.on("data", Meteor.bindEnvironment((data) ->
#    cl "rwfilter.stderr.data"
    error += data
  ))
  rwfilter.on("close", Meteor.bindEnvironment((code) ->
#    cl "rwfilter.close"
    rwcut.stdin.end()
  ))
  rwcut.stdin.on("error", Meteor.bindEnvironment((error) ->
#    cl "rwcut.stdin.error"
    rwfilter.kill()
  ))
  rwcut.stdout.on("data", Meteor.bindEnvironment((data) ->
#    cl "rwcut.stdout.data"
    result += data
  ))
  rwcut.stderr.on("data", Meteor.bindEnvironment((data) ->
#    cl "rwcut.stderr.data"
    error += data
  ))
  rwcut.on("close", Meteor.bindEnvironment((code) ->
#    cl "rwcut.close"
    share.Queries.update(query._id, {$set: {result: result.trim(), error: error.trim(), code: code, stale: false}})
  ))
