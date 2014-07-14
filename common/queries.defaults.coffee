queryPreSave = (userId, changes) ->

share.Queries.before.insert (userId, query) ->
  query._id = query._id || Random.id()
  now = new Date()
  _.defaults(query,
    string: ""
    startDateEnabled: false
    startDate: ""
    endDateEnabled: false
    endDate: ""
    sensorEnabled: false
    sensor: ""
    typesEnabled: true
    types: []
    daddressEnabled: false
    daddress: ""
    saddressEnabled: false
    saddress: ""
    anyAddressEnabled: false
    anyAddress: ""
    dportEnabled: false
    dport: ""
    sportEnabled: false
    sport: ""
    aportEnabled: false
    aport: ""
    dccEnabled: false
    dcc: ""
    sccEnabled: false
    scc: ""
    protocolEnabled: false
    protocol: ""
    flagsAllEnabled: false
    flagsAll: ""
    additionalParametersEnabled: false
    additionalParameters: ""
    fields: ["sIP", "dIP", "sPort", "dPort", "protocol", "packets", "bytes", "flags", "sTime", "dur", "eTime", "sensor"]
    result: ""
    stale: false
    isBuilderVisible: true
    isNew: true
    ownerId: userId
    updatedAt: now
    createdAt: now
  , share.queryResetValues)
  queryPreSave.call(@, userId, query)

share.Queries.before.update (userId, query, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  queryPreSave.call(@, userId, modifier.$set)

share.queryResetValues =
  startRecNum: 1
  sortField: ""
  sortReverse: true
