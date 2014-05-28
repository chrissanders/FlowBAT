# Don't use transforms, they break validation ("Expected plain object", but transforms give an extended object)

share.Emails = new Meteor.Collection("emails")
share.Meetings = new Meteor.Collection("meetings")
share.Saker = new Meteor.Collection("saker")
share.Talks = new Meteor.Collection("talks")
share.Replies = new Meteor.Collection("replies")
