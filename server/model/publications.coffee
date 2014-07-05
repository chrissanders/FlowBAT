#Meteor.publish "loginServiceConfigurationData", () ->
#  Accounts.loginServiceConfiguration.find({})

Meteor.publish "currentUser", () ->
  if not @userId then return []
  Meteor.users.find({_id: @userId},
    fields:
      "emails": 1
      "profile": 1
      "status": 1
      "createdAt": 1
  )

Meteor.publish "queries", ->
  if not @userId then return []
  share.Queries.find({userId: @userId})
