share.fixtureIds = []

insertData = (data, collection) ->
  for _id of data when _id not in share.fixtureIds
    share.fixtureIds.push(_id)
  if collection.find().count() is 0
    for _id, object of data
      object._id = _id
      object.isNew = false
      collection.insert(object)
    return true

share.loadFixtures = ->
  if Meteor.settings.isLoadingFixtures
    share.loadFixturesForCompleteSetup()
  else
    share.loadFixturesForIncompleteSetup()

share.loadFixturesForCompleteSetup = ->
  now = new Date()
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

  configs =
    Default:
      isSetupComplete: true
      isSSH: true
      host: "50.116.29.253"
      port: "22"
      user: "denis"
      identityFile: ""
      siteConfigFile: "/usr/local/etc/silk.conf"
      dataRootdir: "/data"
  insertData(configs, share.Configs)

  users =
    ChrisSanders:
      profile:
        name: "Chris Sanders"
#        timezone: 240 # US, Charleston
      group: "admin"
    DenisGorbachev:
      profile:
        name: "Denis Gorbachev"
#        timezone: -240 # Russia, Moscow
      group: "admin"
  for _id, user of users
    _.defaults(user,
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
  usersInserted = insertData(users, Meteor.users)
  if usersInserted
    for _id, user of users
      Accounts.setPassword(_id, "123123")

  queries =
    Dashboard1:
      name: "Dashboard query"
      cmd: "--sensor=S0 --type=all --sport=80"
      ownerId: "ChrisSanders"
  if share.Queries.find().count() is 0
    for _id, query of queries
      query._id = _id
      query.isNew = false
      _id = share.Queries.insert(query)
      query = share.Queries.findOne(_id)
      share.Queries.update(_id, {$set: {string: share.buildQueryString(query)}}) # after defaults are applied
      share.Queries.update(_id, {$set: {isStale: true}})
    executingInterval = 5 * share.minute
#    executingInterval /= 5 * 12 # debug
    share.Queries.update("Dashboard1", {$set: {executingInterval: executingInterval}})
    Meteor.users.update("ChrisSanders", {$set: {"profile.dashboardQueryIds": ["Dashboard1"]}})

  ipsets =
    Local:
      name: "Local addresses"
      note: "John asked to create this"
      contents: """
        192.168.0.1
        192.168.0.2
        192.168.0.3
      """
      ownerId: "ChrisSanders"
    DNS:
      name: "DNS addresses"
      note: "For testing purposes"
      contents: """
        8.8.8.8
        8.8.4.4
        208.67.222.222
        208.67.220.220
      """
      ownerId: "ChrisSanders"
  insertData(ipsets, share.IPSets)

#  serviceConfigurations = {}
#  insertData(serviceConfigurations, ServiceConfiguration.configurations)

share.loadFixturesForIncompleteSetup = ->
  configs =
    Default:
      isSetupComplete: false
  insertData(configs, share.Configs)
