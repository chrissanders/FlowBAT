share.Configs.after.update (userId, config) ->
  share.IPSets.update({}, {$set: {isResultStale: true}}, {multi: true})
