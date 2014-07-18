share.Configs.after.update (userId, config) ->
  share.IPSets.update({}, {$set: {isStale: true}}, {multi: true})
