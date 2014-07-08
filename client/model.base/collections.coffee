share.Queries = window.Queries = new Meteor.Collection("queries",
  transform: share.Transformations.query
)
share.Configs = window.Configs = new Meteor.Collection("configs",
  transform: share.Transformations.config
)
