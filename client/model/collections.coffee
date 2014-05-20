share.Meetings = window.Meetings = new Meteor.Collection(null,
  transform: share.Transformations.meeting
)

share.Saker = window.Saker = new Meteor.Collection(null,
  transform: share.Transformations.sak
)

share.Talks = window.Talks = new Meteor.Collection(null,
  transform: share.Transformations.talk
)

share.Replies = window.Replies = new Meteor.Collection(null,
  transform: share.Transformations.reply
)
