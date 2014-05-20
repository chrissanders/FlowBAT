share.Meetings.before.insert (userId, category) ->
  _.defaults(category,
    slug: _.str.slugify(category.name)
  )

