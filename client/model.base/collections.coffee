share.Queries = window.Queries = new Meteor.Collection("queries",
  transform: share.Transformations.query
)
