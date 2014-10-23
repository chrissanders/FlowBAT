Process = Npm.require("child_process")

share.cleanupQuickQueries = ->
  borderline = new Date(new Date().getTime() - 7 * share.day)
#  borderline = new Date(new Date().getTime() - 1000)
  share.Queries.find({isQuick: true, executingInterval: {$lte: 0}, updatedAt: {$lt: borderline}}).forEach (query) ->
    share.Queries.remove(query._id)

share.cleanupCachedQueryResults = ->
  borderline = new Date(new Date().getTime() - 2 * share.day)
#  borderline = new Date(new Date().getTime() - 1000)
  config = share.Configs.findOne({}, {transform: share.Transformations.config})
  share.Queries.find({executingInterval: {$lte: 0}, updatedAt: {$lt: borderline}}).forEach (query) ->
    rmCommand = "rm -f /tmp/" + query._id + ".rwf"
    if config.isSSH
      rmCommand = config.wrapCommand(rmCommand)
    Process.exec(rmCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
      result = stdout.trim()
      error = stderr.trim()
      code = if err then err.code else 0
      if error
        throw new Error(error)
    ))

share.Queries.after.remove (userId, query) ->
  config = share.Configs.findOne({}, {transform: share.Transformations.config})
  rmCommand = "rm -f /tmp/" + query._id + ".rwf"
  if config.isSSH
    rmCommand = config.wrapCommand(rmCommand)
  Process.exec(rmCommand, Meteor.bindEnvironment((err, stdout, stderr) ->
    result = stdout.trim()
    error = stderr.trim()
    code = if err then err.code else 0
    if error
      throw new Error(error)
  ))
