Template.dashboard.helpers
  queries: ->
    user = share.user({"profile.dashboardQueryIds": 1})
    queries = []
    share.Queries.find({_id: {$in: user.profile.dashboardQueryIds}, isQuick: false}).forEach (query) ->
      index = user.profile.dashboardQueryIds.indexOf(query._id)
      queries[index] = query
    queries
  queriesNotOnDashboard: ->
    user = share.user({"profile.dashboardQueryIds": 1})
    share.Queries.find({_id: {$nin: user.profile.dashboardQueryIds}, isQuick: false})

Template.dashboard.rendered = ->
  $("#tags").autocomplete
    minLength: 0
    source: (request, response) ->
      # delegate back to autocomplete, but extract the last term
      response $.ui.autocomplete.filter(availableTags, extractLast(request.term))
      return

    focus: ->
      # prevent value inserted on focus
      false

    select: (event, ui) ->
      terms = split(@value)

      # remove the current input
      terms.pop()

      # add the selected item
      terms.push ui.item.value+"="

      # add placeholder to get the comma-and-space at the end
      @value = terms.join(" ")
      false

    autoFocus: ->
      #auto select first item
      true




split = (val) ->
  val.split /\s/
extractLast = (term) ->
  split(term).pop()
availableTags = [
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

Template.dashboard.events
  "submit .quick-query-form": grab encapsulate (event, template) ->
    $form = $(event.currentTarget)
    $quickQueryInput = $form.find(".quick-query")
    quickQueryValue = $quickQueryInput.val().trim()
    if quickQueryValue
      _id = share.Queries.insert({
        isQuick: true
      })
      share.Queries.update(_id, {$set: {interface: "cmd", cmd: quickQueryValue}})
      share.Queries.update(_id, {$set: {isStale: true}})
      Router.go("/query/" + _id)
    else
      $quickQueryInput.focus()
  "click .add-query": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": @_id}})
  "click .insert-query": grab (event, template) ->
    _id = share.Queries.insert({})
    Meteor.users.update(Meteor.userId(), {$addToSet: {"profile.dashboardQueryIds": _id}})
  "click .remove-from-dashboard": grab (event, template) ->
    Meteor.users.update(Meteor.userId(), {$pull: {"profile.dashboardQueryIds": @_id}})
  "keydown .quick-query-form.panel input": (event) ->
    if event.keyCode is $.ui.keyCode.TAB and $(this).autocomplete("instance").menu.active
      event.preventDefault()
      return


