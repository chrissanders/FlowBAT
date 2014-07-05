insertData = (data, collection) ->
  if collection.find().count() is 0
    for _id, object of data
      object._id = _id
      object.isNew = false
      collection.insert(object)
    return true

share.loadFixtures = ->
  now = new Date()
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  users =
    ChrisSanders:
      profile:
        name: "Chris Sanders"
    DenisGorbachev:
      profile:
        name: "Denis Gorbachev"
  for _id, user of users
    _.defaults(user,
      username: _id
      emails: [
        {
          address: _id.toLowerCase() + "@flowbat.com"
          verified: true
        }
      ]
      services:
        resume:
          loginTokens: [
            {
              "hashedToken": Accounts._hashLoginToken(_id),
              "when": now
            }
          ]
      createdAt: lastWeek
    )
  insertData(users, Meteor.users)

#  serviceConfigurations = {}
#  insertData(serviceConfigurations, ServiceConfiguration.configurations)
