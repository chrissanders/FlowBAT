#Meteor.publish "loginServiceConfigurationData", () ->
#  Accounts.loginServiceConfiguration.find({})

Meteor.publish "currentUser", () ->
  if not @userId then return []
  Meteor.users.find({_id: @userId},
    fields:
      "emails": 1
      "profile": 1
      "createdAt": 1
  )

#Meteor.publish "friends", ->
#  if not @userId then return []
#  Meteor.users.find({friendUserIds: @userId}, {
#    fields:
#      handle: 1
#      profile: 1
#      invitationFailed: 1
#  })

Meteor.publish "allUsersInsecure", ->
  if not @userId then return []
  Meteor.users.find({_id: {$ne: @userId}}, {
    fields:
      handle: 1
      profile: 1
      invitationFailed: 1
  })

Meteor.publish "meetings", ->
  if not @userId then return []
  share.Meetings.find({})

Meteor.publish "saker", ->
  if not @userId then return []
  share.Saker.find({})

Meteor.publish "talks", ->
  if not @userId then return []
  share.Talks.find({})

Meteor.publish "replies", ->
  if not @userId then return []
  share.Replies.find({})
