share.Configs.after.update (userId, config) ->
  share.IPSets.update({}, {$set: {isOutputStale: true}}, {multi: true})
