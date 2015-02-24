Template.results.helpers
  query: ->
    share.Queries.findOne(@_id)
  isDynamic: ->
    false # @_id in ["sTime", "eTime"]
  numRecsOptions: ->
    [5, 10, 25, 50, 100]
  now: ->
    m = moment(Session.get("now"))
    if @isUTC
      m.zone(0)
    m.format("YYYY/MM/DD HH:mm")

Template.results.rendered = ->
#  cl "results.rendered"
  @$(".results.panel").popover(
    selector: "*[data-toggle='popover']"
    trigger: "hover"
    delay: {show: 300, hide: 100}
  )

Template.results.events
  "submit .options-form": grab encapsulate (event, template) ->
    template.$(".execute").blur()
    $set = _.extend({isInputStale: true, isOutputStale: true}, share.queryBlankValues, share.queryResetValues)
    share.Queries.update(template.data._id, {$set: $set})
  "click .set-executing-interval": grab (event, template) ->
    $target = $(event.currentTarget)
    executingInterval = share.intval($target.attr("data-interval"))
    share.Queries.update(template.data._id, {$set: {executingInterval: executingInterval}})
  "click .input-executing-interval": grab (event, template) ->
    UI.insert(UI.renderWithData(Template.inputExecutingIntervalModal, {_id: template.data._id}), document.body)
  "click .set-property": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    editor = share.EditorCache.editors["query"]
    editor.saveProperty(template.data._id, $target.attr("data-property"), $target.attr("data-value"))
  "click .toggle-is-utc": grab encapsulate (event, template) ->
    event.currentTarget.blur()
    share.Queries.update(template.data._id, {$set: {isUTC: not @isUTC}})
  "click .increment-start-rec-num": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    query = share.Queries.findOne(template.data._id)
    startRecNum = query.startRecNum + share.intval($target.attr("data-increment"))
    startRecNum = Math.max(1, startRecNum)
    share.Queries.update(template.data._id, {$set: {startRecNum: startRecNum}})
  "change .field-checkbox": encapsulate (event, template) ->
    checkbox = event.currentTarget
    property = $(checkbox).attr("data-property")
    modifier = {}
    if checkbox.checked
      modifier.$addToSet = {}
      modifier.$addToSet[property] = checkbox.value
    else
      modifier.$pull = {}
      modifier.$pull[property] = checkbox.value
    share.Queries.update(template.data._id, modifier)
  "click .fieldset-toggle": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    fieldset = $target.attr("data-fieldset")
    query = share.Queries.findOne(template.data._id)
    modifier = {}
    if fieldset in query.expandedFieldsets
      modifier.$pull = {}
      modifier.$pull["expandedFieldsets"] = fieldset
    else
      modifier.$addToSet = {}
      modifier.$addToSet["expandedFieldsets"] = fieldset
    share.Queries.update(template.data._id, modifier)
  "change .num-recs": encapsulate (event, template) ->
    $numRecs = $(event.currentTarget)
    numRecs = share.intval($numRecs.val())
    Meteor.users.update(Meteor.userId(), {$set: {"profile.numRecs": numRecs}})
    share.Queries.update(template.data._id, {$set: {isOutputStale: true}})
  "click .download-csv": grab encapsulate (event, template) ->
    _id = template.data._id
    query = share.Queries.findOne(template.data._id)
    output = query.output
    $target = $(event.currentTarget)
    $target.find(".normal").hide()
    $target.find(".loading").show()
    Meteor.call("loadDataForCSV", _id, (error, result) ->
      if error
        share.Queries.update(_id, {$set: {error: error.toString()}})
      else
        if result
          tmpquery = new share.Query({output: output, result: result})
          csvRows = []
          headerCsvRow = []
          for spec in tmpquery.header
            headerString = ""
            if spec.isPercentage
              headerString += "% "
            headerString += i18n.t("rwcut.fields." + spec.name)
            if spec.isDistinct
              headerString += " (distinct)"
            headerCsvRow.push(headerString)
          csvRows.push(headerCsvRow)
          for row in tmpquery.rows
            csvRows.push(toCSV(_.pluck(row, "value")))
          csv = csvRows.join("\n")
          filename = "export.csv"
          blob = new Blob([csv],
            type: "text/csv;charset=utf-8;"
          )
          if jQuery.browser.msie
            navigator.msSaveBlob(blob, filename)
          else
            link = document.createElement("a")
            link.setAttribute "href", URL.createObjectURL(blob)
            link.setAttribute "download", filename
            document.body.appendChild(link)
            link.click()
      $target.find(".normal").show()
      $target.find(".loading").hide()
    )
  "click .download-rwf": grab encapsulate (event, template) ->
    _id = template.data._id
    $target = $(event.currentTarget)
    $target.find(".normal").hide()
    $target.find(".loading").show()
    Meteor.call("getRwfToken", _id, (error, token) ->
      if error
        share.Queries.update(_id, {$set: {error: error.toString()}})
      else
        link = document.createElement("a")
        basename = token + ".rwf"
        link.setAttribute "href", "/dump/" + token
        link.setAttribute "download", basename
        document.body.appendChild(link)
        link.click()
      $target.find(".normal").show()
      $target.find(".loading").hide()
    )
  "click .add-to-query": grab (event, template) ->
    $target = $(event.currentTarget)
    _id = $target.attr("data-id")
    value = $target.attr("data-value")
    query = share.Queries.findOne(template.data._id)
    share.Pivoting.execute(query, _id, value)
  "click .add-to-query-as-before-after-time": grab (event, template) ->
    $target = $(event.currentTarget)
    spread = $target.attr("data-spread")
    value = $target.attr("data-value")
    valueAsMoment = moment.utc(value, "YYYY/MM/DDTHH:mm:ss.SSS")
    sTimeValueAsMoment = valueAsMoment.clone().subtract(spread, 'milliseconds')
    eTimeValueAsMoment = valueAsMoment.clone().add(spread, 'milliseconds')
    sTimeValueAsString = sTimeValueAsMoment.format("YYYY/MM/DDTHH:mm:ss.SSS")
    eTimeValueAsString = eTimeValueAsMoment.format("YYYY/MM/DDTHH:mm:ss.SSS")
    query = share.Queries.findOne(template.data._id)
    share.Pivoting.execute(query, "sTime", sTimeValueAsString)
    share.Pivoting.execute(query, "eTime", eTimeValueAsString)
    share.Pivoting.execute(query, "aTime", sTimeValueAsString + "-" + eTimeValueAsString)
  "click .new-query": grab (event, template) ->
    $target = $(event.currentTarget)
    _id = $target.attr("data-id")
    value = $target.attr("data-value")
    queryId = share.Queries.insert({
      isQuick: true
    })
    query = share.Queries.findOne(queryId)
    share.Pivoting.execute(query, _id, value)
#    query = share.Queries.findOne(queryId) # get updated version
    Router.go("/query/" + queryId)
  "click .results-table tr": (event, template) ->
    $tr = $(event.currentTarget)
    $tr.toggleClass("highlighted")
