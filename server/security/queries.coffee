share.Queries.allow
  insert: share.securityRulesWrapper (userId, query) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    query._id = query._id or Random.id()
    query.ownerId = userId
    query.string = ""
    check(query,
      _id: Match.App.Id
      name: String
      string: String
      cmd: String
      exclusionsCmd: String
      exclusions: [String]
      startDateEnabled: Boolean
      startDate: String
      endDateEnabled: Boolean
      endDate: String
      sensorEnabled: Boolean
      sensor: String
      typesEnabled: Boolean
      types: [String]
      daddressEnabled: Boolean
      daddress: String
      saddressEnabled: Boolean
      saddress: String
      anyAddressEnabled: Boolean
      anyAddress: String
      dipSetEnabled: Boolean
      dipSet: Match.OneOf(null, Match.App.IPSetId)
      sipSetEnabled: Boolean
      sipSet: Match.OneOf(null, Match.App.IPSetId)
      anySetEnabled: Boolean
      anySet: Match.OneOf(null, Match.App.IPSetId)
      dportEnabled: Boolean
      dport: String
      sportEnabled: Boolean
      sport: String
      aportEnabled: Boolean
      aport: String
      dccEnabled: Boolean
      dcc: [String]
      sccEnabled: Boolean
      scc: [String]
      protocolEnabled: Boolean
      protocol: String
      flagsAllEnabled: Boolean
      flagsAll: String
      activeTimeEnabled: Boolean
      activeTime: String
      additionalParametersEnabled: Boolean
      additionalParameters: String
      additionalExclusionsCmdEnabled: Boolean
      additionalExclusionsCmd: String
      fields: [String]
      fieldsOrder: [String]
      rwstatsDirection: String
      rwstatsMode: String
      rwstatsCountModeValue: String
      rwstatsThresholdModeValue: String
      rwstatsPercentageModeValue: String
      rwstatsBinTime: String
      rwstatsFields: [String]
      rwstatsFieldsOrder: [String]
      rwstatsValues: [String]
      rwstatsValuesOrder: [String]
      result: String
      error: String
      interface: String
      output: String
      executingInterval: Match.Integer
      executingAt: Match.OneOf(null, Date)
      startRecNum: Match.Integer
      sortField: String
      sortReverse: Boolean
      isStringStale: Boolean
      isResultStale: Boolean
      isUTC: Boolean
      isQuick: Boolean
      isNew: Boolean
      ownerId: Match.App.UserId
      updatedAt: Date
      createdAt: Date
    )
    true
  update: share.securityRulesWrapper (userId, query, fieldNames, modifier, options) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is query.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    $set =
      name: Match.Optional(String)
      cmd: Match.Optional(String)
      exclusionsCmd: Match.Optional(String)
      exclusions: Match.Optional([String])
      startDateEnabled: Match.Optional(Boolean)
      startDate: Match.Optional(String)
      endDateEnabled: Match.Optional(Boolean)
      endDate: Match.Optional(String)
      sensorEnabled: Match.Optional(Boolean)
      sensor: Match.Optional(String)
      typesEnabled: Match.Optional(Boolean)
      types: Match.Optional([String])
      daddressEnabled: Match.Optional(Boolean)
      daddress: Match.Optional(String)
      saddressEnabled: Match.Optional(Boolean)
      saddress: Match.Optional(String)
      anyAddressEnabled: Match.Optional(Boolean)
      anyAddress: Match.Optional(String)
      dipSetEnabled: Match.Optional(Boolean)
      dipSet: Match.Optional(Match.OneOf(null, Match.App.IPSetId))
      sipSetEnabled: Match.Optional(Boolean)
      sipSet: Match.Optional(Match.OneOf(null, Match.App.IPSetId))
      anySetEnabled: Match.Optional(Boolean)
      anySet: Match.Optional(Match.OneOf(null, Match.App.IPSetId))
      dportEnabled: Match.Optional(Boolean)
      dport: Match.Optional(String)
      sportEnabled: Match.Optional(Boolean)
      sport: Match.Optional(String)
      aportEnabled: Match.Optional(Boolean)
      aport: Match.Optional(String)
      dccEnabled: Match.Optional(Boolean)
      dcc: Match.Optional([String])
      sccEnabled: Match.Optional(Boolean)
      scc: Match.Optional([String])
      protocolEnabled: Match.Optional(Boolean)
      protocol: Match.Optional(String)
      flagsAllEnabled: Match.Optional(Boolean)
      flagsAll: Match.Optional(String)
      activeTimeEnabled: Match.Optional(Boolean)
      activeTime: Match.Optional(String)
      additionalParametersEnabled: Match.Optional(Boolean)
      additionalParameters: Match.Optional(String)
      additionalExclusionsCmdEnabled: Match.Optional(Boolean)
      additionalExclusionsCmd: Match.Optional(String)
      fields: Match.Optional([String])
      fieldsOrder: Match.Optional([String])
      rwstatsDirection: Match.Optional(String)
      rwstatsMode: Match.Optional(String)
      rwstatsCountModeValue: Match.Optional(String)
      rwstatsThresholdModeValue: Match.Optional(String)
      rwstatsPercentageModeValue: Match.Optional(String)
      rwstatsBinTime: Match.Optional(String)
      rwstatsFields: Match.Optional([String])
      rwstatsFieldsOrder: Match.Optional([String])
      rwstatsValues: Match.Optional([String])
      rwstatsValuesOrder: Match.Optional([String])
      result: Match.Optional(String)
      error: Match.Optional(String)
      interface: Match.Optional(String)
      output: Match.Optional(String)
      executingInterval: Match.Optional(Match.Integer)
      executingAt: Match.Optional(Match.OneOf(null, Date))
      startRecNum: Match.Optional(Match.Integer)
      sortField: Match.Optional(String)
      sortReverse: Match.Optional(Boolean)
      isStringStale: Match.Optional(Boolean)
      isResultStale: Match.Optional(Boolean)
      isUTC: Match.Optional(Boolean)
      isQuick: Match.Optional(Boolean)
      isNew: Match.Optional(Match.App.isNewUpdate(query.isNew))
      updatedAt: Date
    $addToSet =
      fields: Match.Optional(String)
      rwstatsFields: Match.Optional(String)
      rwstatsValues: Match.Optional(String)
    $pull =
      fields: Match.Optional(String)
      rwstatsFields: Match.Optional(String)
      rwstatsValues: Match.Optional(String)
    check(modifier,
      $set: Match.Optional($set)
      $addToSet: Match.Optional($addToSet)
      $pull: Match.Optional($pull)
    )
    true
  remove: share.securityRulesWrapper (userId, query) ->
    unless userId
      throw new Match.Error("Operation not allowed for unauthorized users")
    unless userId is query.ownerId
      throw new Match.Error("Operation not allowed for non-owners")
    true
