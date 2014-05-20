share.Meetings = window.Meetings = new Meteor.Collection(null,
  transform: share.Transformations.meeting
)

share.Issues = window.Issues = new Meteor.Collection(null,
  transform: share.Transformations.issue
)

share.Talks = window.Talks = new Meteor.Collection(null,
  transform: share.Transformations.talk
)

share.Replies = window.Replies = new Meteor.Collection(null,
  transform: share.Transformations.reply
)
