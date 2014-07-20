share.cleanupQuickQueries = ->
  borderline = new Date(new Date().getTime() - 14 * share.day)
#  borderline = new Date(new Date().getTime() - 1000)
  share.Queries.find({isQuick: true, updatedAt: {$lt: borderline}}).forEach (query) ->
    share.Queries.remove(query._id)
