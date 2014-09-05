#Meteor.publish "loginServiceConfigurationData", () ->
#  Accounts.loginServiceConfiguration.find({})

Meteor.publish "currentUser", () ->
  if not @userId then return []
  Meteor.users.find({_id: @userId},
    fields:
      "group": 1
      "emails": 1
      "profile": 1
      "status": 1
      "createdAt": 1
  )

Meteor.publish "users", ->
  if not @userId then return []
  if share.Security.hasRole(@userId, "admin")
    Meteor.users.find({},
      fields:
        "group": 1
        "emails": 1
        "profile": 1
        "status": 1
        "createdAt": 1
    )
  else
    []

Meteor.publish "configs", ->
  if not @userId
    config = share.Configs.findOne()
    if not config.isSetupComplete
      return share.Configs.find()
    return []
  if share.Security.hasRole(@userId, "admin")
    return share.Configs.find()
  else
    return []

Meteor.publish "queries", ->
  if not @userId then return []
  share.Queries.find({ownerId: @userId})

Meteor.publish "ipsets", ->
  if not @userId then return []
  share.IPSets.find({ownerId: @userId})

Meteor.publish "exclusions", ->
  if not @userId then return []
  share.Exclusions.find({ownerId: @userId})