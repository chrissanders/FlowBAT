share = share or {}

#share.combine = (funcs...) ->
#  (args...) =>
#    for func in funcs
#      func.apply(@, args)

share.user = (fields, userId = Meteor.userId()) ->
  Meteor.users.findOne(userId, {fields: fields})

share.intval = (value) ->
  parseInt(value, 10) || 0

share.minute = 60 * 1000
share.hour = 60 * share.minute

share.datetimeFormat = "YYYY/MM/DD HH:mm:ss.SSS"
share.rwcutFields = [
  "sIP"
  "dIP"
  "sPort"
  "dPort"
  "protocol"
  "packets"
  "bytes"
  "flags"
  "sTime"
  "duration"
  "eTime"
  "sensor"
  "class"
  "scc"
  "dcc"
  "initialFlags"
  "sessionFlags"
  "application"
  "type"
  "icmpTypeCode"
]
share.rwstatsValues = [
  "Records"
  "Packets"
  "Bytes"
]
share.rwcountFields = [
  "Date"
  "Records"
  "Bytes"
  "Packets"
]
share.rwcountLoadSchemes = [
  "bin-uniform"
  "start-spike"
  "end-spike"
  "middle-spike"
  "time-proportional"
  "maximum-volume"
  "minimum-volume"
]
share.availableChartTypes =
  "rwcut": []
  "rwstats": ["BarChart", "ColumnChart",  "PieChart"]
  "rwcount": ["LineChart"]
share.chartFieldTypes =
  "sPort": "number"
  "dPort": "number"
  "protocol": "number"
  "pro": "number"
  "packets": "number"
  "bytes": "number"
  "sTime": "datetime"
  "duration": "number"
  "dur": "number"
  "eTime": "datetime"
  "Records": "number"
  "Packets": "number"
  "Bytes": "number"
  "Date": "datetime"
  "cumul_%": "number"
share.startDateOffsets =
  "Hour": (60).toString()
  "Day": (24 * 60).toString()
  "Week": (7 * 24 * 60).toString()
  "Month": (30 * 24 * 60).toString()

share.parseResult = (result) ->
  rows = []
  for row in result.split("\n")
    rows.push(row.split("|"))
  rows

share.queryTypes = ["in", "out", "inweb", "outweb", "inicmp", "outicmp", "innull", "outnull", "int2int", "ext2ext", "other"]
share.inputFields = [
  "interface"
  "cmd"
  "exclusionsCmd"
  "startDateEnabled"
  "startDate"
  "endDateEnabled"
  "endDate"
  "sensorEnabled"
  "sensor"
  "typesEnabled"
  "types"
  "daddressEnabled"
  "daddress"
  "saddressEnabled"
  "saddress"
  "anyAddressEnabled"
  "anyAddress"
  "dipSetEnabled"
  "dipSet"
  "sipSetEnabled"
  "sipSet"
  "anySetEnabled"
  "anySet"
  "dportEnabled"
  "dport"
  "sportEnabled"
  "sport"
  "aportEnabled"
  "aport"
  "dccEnabled"
  "dcc"
  "sccEnabled"
  "scc"
  "protocolEnabled"
  "protocol"
  "flagsAllEnabled"
  "flagsAll"
  "activeTimeEnabled"
  "activeTime"
  "additionalParametersEnabled"
  "additionalParameters"
  "additionalExclusionsCmdEnabled"
  "additionalExclusionsCmd"
]

share.filterOptions = (options, additionalPermittedCharacters = "") ->
  for excludedOption in ["--python-expr", "--python-file", "--pmap", "--dynamic-library", "--tuple-file", "--tuple-fields", "--tuple-direction", "--tuple-dilimter", "--all-destination", "--fail-destination", "--pass-destination", "--print-statistics", "--print-volume-statistics", "--xargs"]
    regexp = new RegExp(excludedOption + "=?[^\\s]*", "gi")
    options = options.replace(regexp, "")
  filter = new RegExp("[^\\s\\=\\-\\/\\,\\.\\:0-9a-z" + additionalPermittedCharacters + "]", "gi")
  options = options.replace(filter, "")
  options

share.isDebug = Meteor.settings.public.isDebug

object = if typeof(window) != "undefined" then window else GLOBAL
object.isDebug = share.isDebug
if typeof(console) != "undefined" && console.log && _.isFunction(console.log)
  object.cl = _.bind(console.log, console)
else
  object.cl = ->
