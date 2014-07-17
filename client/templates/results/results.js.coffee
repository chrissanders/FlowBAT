Template.results.helpers
  isDynamic: ->
    false # @_id in ["sTime", "eTime"]
  numRecsOptions: ->
    [5, 10, 25, 50, 100]
  fieldI18nString: ->
    "rwcut.fields." + @.trim()
  fieldIsSelected: (query) ->
    @.toString() in query.fields
  now: ->
    m = moment(Session.get("now"))
    if @isUTC
      m.zone(0)
    m.format("YYYY/MM/DD HH:mm")

Template.results.rendered = ->
#  cl "results.rendered"
  _id = @data._id
  @$('.results-table').dragtable(
    dataHeader: "data-field"
    stop: (event, draginfo) ->
      query = share.Queries.findOne(_id)
      field = draginfo.order[draginfo.endIndex]
      fieldsOrder = _.without(query.fieldsOrder, field)
      if draginfo.endIndex
        pivotField = draginfo.order[draginfo.endIndex - 1]
        pivotFieldIndex = fieldsOrder.indexOf(pivotField)
        fieldsOrder.splice(pivotFieldIndex + 1, 0, field)
      else
        fieldsOrder.splice(0, 0, field)
      share.Queries.update(query._id, {$set: {fieldsOrder: fieldsOrder}})
  )

Template.results.events
  "submit .options-form": grab encapsulate (event, template) ->
    template.$(".execute").blur()
    $set = _.extend({isStale: true}, share.queryResetValues)
    share.Queries.update(template.data._id, {$set: $set})
  "click .set-executing-interval": grab (event, template) ->
    $target = $(event.currentTarget)
    executingInterval = share.intval($target.attr("data-interval"))
    share.Queries.update(template.data._id, {$set: {executingInterval: executingInterval}})
  "click .input-executing-interval": grab (event, template) ->
    UI.insert(UI.renderWithData(Template.inputExecutingIntervalModal, {_id: template.data._id}), document.body)
  "click .set-interface": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    query = template.data
    query.interface = $target.attr("data-interface")
    share.Queries.update(template.data._id, {$set: {interface: $target.attr("data-interface"), string: share.buildQueryString(query), result: "", error: ""}})
  "click .toggle-is-utc": grab encapsulate (event, template) ->
    event.currentTarget.blur()
    share.Queries.update(template.data._id, {$set: {isUTC: not template.data.isUTC}})
  "click .increment-start-rec-num": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    startRecNum = template.data.startRecNum + share.intval($target.attr("data-increment"))
    startRecNum = Math.max(1, startRecNum)
    share.Queries.update(template.data._id, {$set: {startRecNum: startRecNum}})
  "change .field-checkbox": encapsulate (event, template) ->
    checkbox = event.currentTarget
    modifier = {}
    if checkbox.checked
      modifier.$addToSet = {"fields": checkbox.value}
    else
      modifier.$pull = {"fields": checkbox.value}
    share.Queries.update(template.data._id, modifier)
  "click .sort": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    sortField = $target.attr("data-field")
    if sortField is template.data.sortField
      if template.data.sortReverse
        sortReverse = false
      else
        sortField = ""
        sortReverse = true
    share.Queries.update(template.data._id, {$set: {sortField: sortField, sortReverse: sortReverse}})
  "change .num-recs": encapsulate (event, template) ->
    $numRecs = $(event.currentTarget)
    numRecs = share.intval($numRecs.val())
    Meteor.users.update(Meteor.userId(), {$set: {"profile.numRecs": numRecs}})
    share.Queries.update(template.data._id, {$set: {isStale: true}})
  "click .download-csv": grab encapsulate (event, template) ->
    _id = template.data._id
    $target = $(event.currentTarget)
    $target.find(".normal").hide()
    $target.find(".loading").show()
    Meteor.call("loadDataForCSV", _id, (error, data) ->
      if error
        share.Queries.update(_id, {$set: {error: error.toString()}})
      else
        if data
          rows = []
          for row, count in data.split("\n")
            splinters = row.split("|")
            if count is 0
              for field, i in splinters
                splinters[i] = i18n.t("rwcut.fields." + field)
            rows.push(toCSV(splinters))
          csv = rows.join("\n")
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
  "click .results-table tr": (event, template) ->
    $tr = $(event.currentTarget)
    $tr.toggleClass("highlighted")
