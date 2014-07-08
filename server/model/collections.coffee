# Don't use transforms, they break validation ("Expected plain object", but transforms give an extended object)

share.Emails = new Meteor.Collection("emails")
share.Queries = new Meteor.Collection("queries")
share.Configs = new Meteor.Collection("configs")
