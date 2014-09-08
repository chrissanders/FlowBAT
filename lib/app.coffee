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

share.parseResult = (result) ->
  rows = []
  for row in result.split("\n")
    rows.push(row.split("|"))
  rows

share.queryTypes = ["in", "out", "inweb", "outweb", "inicmp", "outicmp", "innull", "outnull"]
share.stringBuilderFields = [
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
  "additionalParametersQueryExclusionsEnabled"
  "additionalParametersQueryExclusions"
]
share.buildQueryString = (query) ->
  if query.interface is "builder"
    parameters = []
    if query.typesEnabled and query.types.length and _.difference(share.queryTypes, query.types).length
      value = query.types.join(",")
    else
      value = "all"
    parameters.push("--type=" + value)
    if query.startDateEnabled and query.startDate
      parameters.push("--start-date=" + query.startDate)
    if query.endDateEnabled and query.endDate
      parameters.push("--end-date=" + query.endDate)
    if query.sensorEnabled and query.sensor
      parameters.push("--sensor=" + query.sensor)
    if query.daddressEnabled and query.daddress
      parameters.push("--daddress=" + query.daddress)
    if query.saddressEnabled and query.saddress
      parameters.push("--saddress=" + query.saddress)
    if query.anyAddressEnabled and query.anyAddress
      parameters.push("--any-address=" + query.anyAddress)
    if query.dipSetEnabled and query.dipSet
      parameters.push("--dipset=/tmp/" + query.dipSet + ".rws")
    if query.sipSetEnabled and query.sipSet
      parameters.push("--sipset=/tmp/" + query.sipSet + ".rws")
    if query.anySetEnabled and query.anySet
      parameters.push("--anyset=/tmp/" + query.anySet + ".rws")
    if query.dportEnabled and query.dport
      parameters.push("--dport=" + query.dport)
    if query.sportEnabled and query.sport
      parameters.push("--sport=" + query.sport)
    if query.aportEnabled and query.aport
      parameters.push("--aport=" + query.aport)
    if query.dccEnabled and query.dcc.length
      parameters.push("--dcc=" + query.dcc.join(","))
    if query.sccEnabled and query.scc.length
      parameters.push("--scc=" + query.scc.join(","))
    if query.protocolEnabled and query.protocol
      parameters.push("--protocol=" + query.protocol)
    if query.flagsAllEnabled and query.flagsAll
      parameters.push("--flags-all=" + query.flagsAll)
    if query.activeTimeEnabled and query.activeTime
      parameters.push("--active-time=" + query.activeTime)
    if query.additionalParametersEnabled and query.additionalParameters
      parameters.push(query.additionalParameters)
    string = parameters.join(" ")
  else
    string = query.cmd
  string = share.filterCmd(string)
  string

share.buildQueryExclusions = (query) ->
  exclusionsCmd = ""
  if query.interface is "builder"
    if query.additionalParametersQueryExclusionsEnabled and query.additionalParametersQueryExclusions
      exclusionsCmd = query.additionalParametersQueryExclusions
  else
    exclusionsCmd = query.exclusionsCmd
  exclusions = []
  for singleExclusionCmd in exclusionsCmd.split(/\s+(?:OR|\|\|)\s+/i)
    singleExclusionCmd = share.filterCmd(singleExclusionCmd)
    if singleExclusionCmd
      exclusions.push(singleExclusionCmd)
  return exclusions

share.filterCmd = (string) ->
  for excludedParameter in ["--python-expr", "--python-file", "--pmap", "--dynamic-library", "--tuple-file", "--tuple-fields", "--tuple-direction", "--tuple-dilimter", "--all-destination", "--fail-destination", "--pass-destination", "--print-statistics", "--print-volume-statistics", "--xargs"]
    regexp = new RegExp(excludedParameter + "=?[^\\s]*", "gi")
    string = string.replace(regexp, "")
  string = string.replace(/[^\s\=\-\/\,\.\:0-9a-z]/gi, "")
  string

share.isDebug = Meteor.settings.public.isDebug

object = if typeof(window) != "undefined" then window else GLOBAL
object.isDebug = share.isDebug
if typeof(console) != "undefined" && console.log && _.isFunction(console.log)
  object.cl = _.bind(console.log, console)
else
  object.cl = ->

share.buildNativeQuery = (query) ->
  stringBuilder = []
  stringBuilder.push("rwfilter ")
  stringBuilder.push(query.string)
  stringBuilder.push("--pass=stdout")
  for exclusion in query.exclusions
    stringBuilder.push("|")
    stringBuilder.push("rwfilter ")
    stringBuilder.push("--input-pipe=stdin")
    stringBuilder.push(exclusion)
    stringBuilder.push("--fail=stdout")
  stringBuilder.join(" ")

