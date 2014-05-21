share.Meetings.before.insert (userId, category) ->
  _.defaults(category,
    maximumDuration: 0
  )

share.Saker.before.insert (userId, sak) ->
  _.defaults(sak,
    maximumDuration: 0
    talkDuration: 5 * share.minute
    replyDuration: 3 * share.minute
  )

