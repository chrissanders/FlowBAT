#Meteor.publish "loginServiceConfigurationData", () ->
#  Accounts.loginServiceConfiguration.find({})

Meteor.publish "currentUser", () ->
  if !@userId then return []
  Meteor.users.find({_id: @userId},
    fields:
      "emails": 1
      "profile": 1
      "createdAt": 1
  )

Meteor.publish "friends", ->
  if !@userId then return []
  Meteor.users.find({friendUserIds: @userId}, {
    fields:
      handle: 1
      profile: 1
      invitationFailed: 1
  })

Meteor.publish "allUsersInsecure", ->
  Meteor.users.find({}, {
    fields:
      handle: 1
      profile: 1
      invitationFailed: 1
  })

Meteor.publish "meetings", ->
  share.Meetings.find({})

Meteor.publish "saker", ->
  share.Saker.find({})

Meteor.publish "talks", ->
  share.Talks.find({})

Meteor.publish "replies", ->
  share.Replies.find({})
