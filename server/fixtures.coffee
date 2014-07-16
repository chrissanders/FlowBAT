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

  configs =
    Default:
      isSSH: true
      host: "50.116.29.253"
      port: "22"
      user: "denis"
      key: ""
      siteConfigFile: "/usr/local/etc/silk.conf"
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
      query = share.Queries.findOne({ownerId: _id})
      share.Queries.update(query._id, {$set: {sensorEnabled: true, sensor: "S0", typesEnabled: true, types: share.queryTypes, additionalParametersEnabled: true, additionalParameters: "--proto=0-255", cmd: "--sensor=S0 --dport=22"}})
      share.Queries.update(query._id, {$set: {isStale: true}})

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
