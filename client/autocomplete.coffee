share.initAutocomplete = ($element, availableTerms) ->
  $element.autocomplete
    minLength: 0
    delay: 0
    source: (request, response) ->
     response $.ui.autocomplete.filter(availableTerms, extractLast(request.term))
    focus: ->
      false
    select: (event, ui) ->
      terms = split(@value)
      terms.pop()
      terms.push ui.item.value+"="
      @value = terms.join(" ")
      false
    autoFocus: ->
      true

split = (val) ->
  val.split /\s/
extractLast = (term) ->
  split(term).pop()

share.rwfilterAutocompleteTerms = [
  "--class"
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

share.rwstatsAutocompleteTerms = [
  "--fields"
  "--values"
  "--count"
  "--threshold"
  "--percentage"
  "--top"
  "--bottom"
  "--bin-time"
]
