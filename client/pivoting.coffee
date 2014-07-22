share.Pivoting =
  fields2properties:
    "sIP": "saddress"
    "dIP": "daddress"
    "aIP": "anyAddress" # proxy
    "sPort": "sport"
    "dPort": "dport"
    "aPort": "aport" # proxy
    "protocol": "protocol"
    "flags": "flagsAll"
    "sTime": "startDate"
    "eTime": "endDate"
    "aTime": "activeTime" # auxiliary
    "sensor": "sensor"
    "scc": "scc"
    "dcc": "dcc"
    "type": "type"
  fields2options:
    "sIP": "saddress"
    "dIP": "daddress"
    "aIP": "any-address" # proxy
    "sPort": "sport"
    "dPort": "dport"
    "aPort": "aport" # proxy
    "protocol": "protocol"
    "pro": "protocol"
    "packets": "packets"
    "bytes": "bytes"
    "flags": "flags-all"
    "duration": "duration"
    "dur": "duration"
    "sTime": "start-date"
    "eTime": "end-date"
    "aTime": "active-time" # auxiliary
    "sensor": "sensor"
    "sen": "sensor"
    "class": "class"
    "scc": "scc"
    "dcc": "dcc"
    "initialFlags": "flags-initial"
    "sessionFlags": "flags-session"
    "application": "application"
    "type": "type"
    "sTime+msec": "start-date"
    "eTime+msec": "end-date"
    "dur+msec": "duration"
    "iType": "icmp-type"
    "iCode": "icmp-code"
  execute: (query, _id, value) ->
    switch _id
      when "flags", "initialFlags", "sessionFlags"
        value = value + "/" + value
      when "sTime", "eTime"
        value = moment.utc(value, "YYYY/MM/DDTHH:mm:ss.SSS").format("YYYY/MM/DD:HH")
      when "type", "scc", "dcc"
        value = [value]
    $set = {}
    if query.interface is "builder"
      property = share.Pivoting.fields2properties[_id]
      if not property
        property = "additionalParameters"
        value = @replace(query.additionalParameters, share.Pivoting.fields2options[_id], value)
      $set[property + "Enabled"] = true
      $set[property] = value
    else
      $set["cmd"] = @replace(query.cmd, share.Pivoting.fields2options[_id], value)
    share.Queries.update(query._id, {$set: $set})
#    share.Queries.update(query._id, {$set: {isStale: true}})
#    don't execute before user clicks "Execute" (from RFP)
    if query.interface is "builder"
      switch _id
        when "type", "scc", "dcc"
          _.defer ->
            $(".query-" + _id + "-editor").trigger("chosen:updated")
  replace: (cmd, option, value) ->
    regexp = new RegExp("--" + option + "=[^\\s]+", "i")
    replacement = "--" + option + "=" + value
    if cmd.match(regexp)
      cmd.replace(regexp, replacement)
    else
      cmd + " " + replacement

