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
  "type"
  "iType"
  "iCode"
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
  "additionalParametersEnabled"
  "additionalParameters"
]
share.buildQueryString = (query) ->
  if query.interface is "cmd"
    return query.cmd
  parameters = []
  if query.startDateEnabled and query.startDate
    parameters.push("--start-date=" + query.startDate)
  if query.endDateEnabled and query.endDate
    parameters.push("--end-date=" + query.endDate)
  if query.sensorEnabled and query.sensor
    parameters.push("--sensor=" + query.sensor)
  if query.typesEnabled and query.types
    if query.types.length and _.difference(share.queryTypes, query.types).length
      value = query.types.join(",")
    else
      value = "all"
    parameters.push("--type=" + value)
  if query.daddressEnabled and query.daddress
    parameters.push("--daddress=" + query.daddress)
  if query.saddressEnabled and query.saddress
    parameters.push("--saddress=" + query.saddress)
  if query.anyAddressEnabled and query.anyAddress
    parameters.push("--any-address=" + query.anyAddress)
  if query.dportEnabled and query.dport
    parameters.push("--dport=" + query.dport)
  if query.sportEnabled and query.sport
    parameters.push("--sport=" + query.sport)
  if query.aportEnabled and query.aport
    parameters.push("--aport=" + query.aport)
  if query.dccEnabled and query.dcc
    parameters.push("--dcc=" + query.dcc)
  if query.sccEnabled and query.scc
    parameters.push("--scc=" + query.scc)
  if query.protocolEnabled and query.protocol
    parameters.push("--protocol=" + query.protocol)
  if query.flagsAllEnabled and query.flagsAll
    parameters.push("--flags-all=" + query.flagsAll)
  if query.additionalParametersEnabled and query.additionalParameters
    parameters.push(query.additionalParameters)
  parameters.join(" ")

share.isDebug = Meteor.settings.public.isDebug

object = if typeof(window) != "undefined" then window else GLOBAL
object.isDebug = share.isDebug
if typeof(console) != "undefined" && console.log && _.isFunction(console.log)
  object.cl = _.bind(console.log, console)
else
  object.cl = ->
