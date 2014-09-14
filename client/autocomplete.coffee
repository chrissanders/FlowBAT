share.initAutocomplete = ($element, options, values = {}) ->
  $element.autocomplete
    minLength: 0
    delay: 0
    source: (request, response) ->
      optvalues = request.term.split(/\s/)
      optvalue = optvalues.pop().split("=")
      if optvalue.length is 2
        valueSplinters = optvalue[1].split(",")
        valueSplinter = valueSplinters.pop()
        response($.ui.autocomplete.filter(values[optvalue[0]] or [], valueSplinter))
      else
        response($.ui.autocomplete.filter(options, optvalue[0]))
    focus: ->
      false
    select: (event, ui) ->
      terms = @value.split(/\s/)
      optvalue = terms.pop().split("=")
      if optvalue.length is 2
        valueSplinters = optvalue[1].split(",")
        valueSplinters.pop() # remove last incomplete one
        valueSplinters.push(ui.item.value) # add new one
        terms.push(optvalue[0] + "=" + valueSplinters.join(","))
      else
        terms.push(ui.item.value + "=")
      @value = terms.join(" ")
      false
    autoFocus: ->
      true

share.rwfilterAutocompleteOptions = [
  "--class": []
  "--type"
  "--flowtype"
  "--sensors"
  "--start-date"
  "--end-date"
  "--ack-flag"
  "--active-time"
  "--any-address"
  "--any-cc"
  "--any-cidr"
  "--any-index"
  "--anyset"
  "--aport"
  "--application"
  "--attributes"
  "--bytes"
  "--bytes-per-packet"
  "--cwr-flag"
  "--daddress"
  "--dcc"
  "--dcidr"
  "--dipset"
  "--dport"
  "--dtype"
  "--duration"
  "--ece-flag"
  "--etime"
  "--fin-flag"
  "--flags-all"
  "--flags-initial"
  "--flags-session"
  "--icmp-code"
  "--icmp-type"
  "--input-index"
  "--ip-version"
  "--next-hop-id"
  "--nhcidr"
  "--nhipset"
  "--not-any-address"
  "--not-any-cidr"
  "--not-anyset"
  "--not-daddress"
  "--not-dcidr"
  "--not-dipset"
  "--not-next-hop-id"
  "--not-nhcidr"
  "--not-nhipset"
  "--not-saddress"
  "--not-scidr"
  "--not-sipset"
  "--output-index"
  "--packets"
  "--protocol"
  "--psh-flag"
  "--rst-flag"
  "--saddress"
  "--scc"
  "--scidr"
  "--sipset"
  "--sport"
  "--stime"
  "--stype"
  "--syn-flag"
  "--tcp-flags"
  "--urg-flag"
]

share.rwstatsAutocompleteOptions = [
  "--fields"
  "--values"
  "--count"
  "--threshold"
  "--percentage"
  "--top"
  "--bottom"
  "--bin-time"
]

share.rwstatsAutocompleteValues =
  "--fields": _.clone(share.rwcutFields)
  "--values": _.clone(share.rwstatsValues) # more coming below

for field in share.rwcutFields
  share.rwstatsAutocompleteValues["--values"].push("distinct:" + field)
