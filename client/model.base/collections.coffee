share.Meetings = window.Meetings = new Meteor.Collection("meetings",
  transform: share.Transformations.meeting
)
share.Saker = window.Saker = new Meteor.Collection("saker",
  transform: share.Transformations.sak
)
share.Talks = window.Talks = new Meteor.Collection("talks",
  transform: share.Transformations.talk
)
share.Replies = window.Replies = new Meteor.Collection("replies",
  transform: share.Transformations.reply
)
