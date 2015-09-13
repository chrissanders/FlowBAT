(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var queryPreSave;

queryPreSave = function(userId, changes) {};

share.Queries.before.insert(function(userId, query) {
  var count, now, prefix, startDate;
  query._id = query._id || Random.id();
  now = new Date();
  startDate = moment.utc().format("YYYY/MM/DD:HH");
  _.defaults(query, {
    name: "",
    cmd: "",
    exclusionsCmd: "",
    startDateType: "interval",
    startDateOffsetEnabled: false,
    startDateOffset: "60",
    startDateEnabled: true,
    startDate: startDate,
    endDateEnabled: false,
    endDate: "",
    sensorEnabled: false,
    sensor: "",
    typesEnabled: false,
    types: [],
    daddressEnabled: false,
    daddress: "",
    saddressEnabled: false,
    saddress: "",
    anyAddressEnabled: false,
    anyAddress: "",
    dipSetEnabled: false,
    dipSet: null,
    sipSetEnabled: false,
    sipSet: null,
    anySetEnabled: false,
    anySet: null,
    tupleFileEnabled: false,
    tupleFile: null,
    tupleDirectionEnabled: false,
    tupleDirection: "",
    tupleDelimiterEnabled: false,
    tupleDelimiter: "",
    tupleFieldsEnabled: false,
    tupleFields: "",
    dportEnabled: false,
    dport: "",
    sportEnabled: false,
    sport: "",
    aportEnabled: false,
    aport: "",
    dccEnabled: false,
    dcc: [],
    sccEnabled: false,
    scc: [],
    protocolEnabled: true,
    protocol: "0-255",
    flagsAllEnabled: false,
    flagsAll: "",
    activeTimeEnabled: false,
    activeTime: "",
    additionalParametersEnabled: false,
    additionalParameters: "",
    additionalExclusionsCmdEnabled: false,
    additionalExclusionsCmd: "",
    fields: ["sIP", "dIP", "sPort", "dPort", "protocol", "packets", "bytes", "flags", "sTime", "duration", "eTime", "sensor"],
    fieldsOrder: _.clone(share.rwcutFields),
    rwstatsDirection: "top",
    rwstatsMode: "count",
    rwstatsCountModeValue: "10",
    rwstatsThresholdModeValue: "",
    rwstatsPercentageModeValue: "",
    rwstatsBinTimeEnabled: false,
    rwstatsBinTime: "60",
    rwstatsFields: [],
    rwstatsFieldsOrder: _.clone(share.rwcutFields),
    rwstatsValues: [],
    rwstatsValuesOrder: share.rwstatsValues.concat(share.rwcutFields),
    rwstatsPrimaryValue: "",
    rwstatsCmd: "",
    rwcountBinSizeEnabled: false,
    rwcountBinSize: "",
    rwcountLoadSchemeEnabled: false,
    rwcountLoadScheme: "",
    rwcountSkipZeroes: true,
    rwcountFields: _.clone(share.rwcountFields),
    rwcountCmd: "",
    "interface": "cmd",
    output: "rwcut",
    presentation: "table",
    chartType: "LineChart",
    chartHeight: 400,
    expandedFieldsets: ["time"],
    executingInterval: 0,
    executingAt: null,
    isInputStale: false,
    isOutputStale: false,
    isUTC: true,
    isQuick: false,
    isNew: true,
    ownerId: userId,
    updatedAt: now,
    createdAt: now
  }, share.queryBlankValues, share.queryResetValues);
  if (!query.name) {
    prefix = "New query";
    count = share.Queries.find({
      name: {
        $regex: "^" + prefix,
        $options: "i"
      }
    }).count();
    query.name = prefix;
    if (count) {
      query.name += " (" + count + ")";
    }
  }
  return queryPreSave.call(this, userId, query);
});

share.Queries.before.update(function(userId, query, fieldNames, modifier, options) {
  var now;
  now = new Date();
  modifier.$set = modifier.$set || {};
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;
  return queryPreSave.call(this, userId, modifier.$set);
});

share.queryBlankValues = {
  result: "",
  error: ""
};

share.queryResetValues = {
  startRecNum: 1,
  sortField: "",
  sortReverse: true,
  chartHiddenFields: []
};

})();

//# sourceMappingURL=queries.defaults.coffee.js.map
