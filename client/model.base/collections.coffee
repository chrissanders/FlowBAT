share.Queries = window.Queries = new Meteor.Collection("queries",
  transform: share.Transformations.query
)
share.IPSets = window.IPSets = new Meteor.Collection("ipsets",
  transform: share.Transformations.ipset
)
share.Configs = window.Configs = new Meteor.Collection("configs",
  transform: share.Transformations.config
)
