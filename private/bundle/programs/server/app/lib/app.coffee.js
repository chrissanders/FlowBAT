(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var object, share;

share = share || {};

share.user = function(fields, userId) {
  if (userId == null) {
    userId = Meteor.userId();
  }
  return Meteor.users.findOne(userId, {
    fields: fields
  });
};

share.intval = function(value) {
  return parseInt(value, 10) || 0;
};

share.minute = 60 * 1000;

share.hour = 60 * share.minute;

share.datetimeFormat = "YYYY/MM/DD HH:mm:ss.SSS";

share.rwcutFields = ["sIP", "dIP", "sPort", "dPort", "protocol", "packets", "bytes", "flags", "sTime", "duration", "eTime", "sensor", "class", "scc", "dcc", "initialFlags", "sessionFlags", "application", "type", "icmpTypeCode"];

share.rwstatsValues = ["Records", "Packets", "Bytes"];

share.rwcountFields = ["Date", "Records", "Bytes", "Packets"];

share.rwcountLoadSchemes = ["", "bin-uniform", "start-spike", "end-spike", "middle-spike", "time-proportional", "maximum-volume", "minimum-volume"];

share.tupleDirections = ["", "both", "forward", "reverse"];

share.availableChartTypes = {
  "rwcut": [],
  "rwstats": ["BarChart", "ColumnChart", "PieChart"],
  "rwcount": ["LineChart"]
};

share.chartFieldTypes = {
  "sPort": "number",
  "dPort": "number",
  "protocol": "number",
  "pro": "number",
  "packets": "number",
  "bytes": "number",
  "sTime": "datetime",
  "duration": "number",
  "dur": "number",
  "eTime": "datetime",
  "Records": "number",
  "Packets": "number",
  "Bytes": "number",
  "Date": "datetime",
  "cumul_%": "number"
};

share.startDateOffsets = {
  "Hour": 60..toString(),
  "Day": (24 * 60).toString(),
  "Week": (7 * 24 * 60).toString(),
  "Month": (30 * 24 * 60).toString()
};

share.parseResult = function(result) {
  var row, rows, _i, _len, _ref;
  rows = [];
  _ref = result.split("\n");
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    row = _ref[_i];
    rows.push(row.split("|"));
  }
  return rows;
};

share.queryTypes = ["in", "out", "inweb", "outweb", "inicmp", "outicmp", "innull", "outnull", "int2int", "ext2ext", "other"];

share.inputFields = ["interface", "cmd", "exclusionsCmd", "startDateEnabled", "startDate", "endDateEnabled", "endDate", "sensorEnabled", "sensor", "typesEnabled", "types", "daddressEnabled", "daddress", "saddressEnabled", "saddress", "anyAddressEnabled", "anyAddress", "dipSetEnabled", "dipSet", "sipSetEnabled", "sipSet", "anySetEnabled", "anySet", "tupleFileEnabled", "tupleFile", "tupleDirectionEnabled", "tupleDirection", "tupleDelimiterEnabled", "tupleDelimiter", "tupleFieldsEnabled", "tupleFields", "dportEnabled", "dport", "sportEnabled", "sport", "aportEnabled", "aport", "dccEnabled", "dcc", "sccEnabled", "scc", "protocolEnabled", "protocol", "flagsAllEnabled", "flagsAll", "activeTimeEnabled", "activeTime", "additionalParametersEnabled", "additionalParameters", "additionalExclusionsCmdEnabled", "additionalExclusionsCmd"];

share.filterOptions = function(options, additionalPermittedCharacters) {
  var excludedOption, filter, regexp, _i, _len, _ref;
  if (additionalPermittedCharacters == null) {
    additionalPermittedCharacters = "";
  }
  _ref = ["--python-expr", "--python-file", "--pmap", "--dynamic-library", "--all-destination", "--fail-destination", "--pass-destination", "--print-statistics", "--print-volume-statistics", "--xargs"];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    excludedOption = _ref[_i];
    regexp = new RegExp(excludedOption + "=?[^\\s]*", "gi");
    options = options.replace(regexp, "");
  }
  filter = new RegExp("[^\\s\\=\\-\\/\\,\\.\\:0-9a-z_" + additionalPermittedCharacters + "]", "gi");
  options = options.replace(filter, "");
  return options;
};

share.isDebug = Meteor.settings["public"].isDebug;

object = typeof window !== "undefined" ? window : GLOBAL;

object.isDebug = share.isDebug;

if (typeof console !== "undefined" && console.log && _.isFunction(console.log)) {
  object.cl = _.bind(console.log, console);
} else {
  object.cl = function() {};
}

})();

//# sourceMappingURL=app.coffee.js.map
