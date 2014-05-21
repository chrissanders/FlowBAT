share.Meetings.before.insert (userId, category) ->
  _.defaults(category,
    maximumDuration: 0
    slug: _.str.slugify(category.name)
  )

