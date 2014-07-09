Template.results.helpers
  fieldI18nString: ->
    "rwcut.fields." + @.trim()
  fields: ->
    share.rwcutFields
  fieldIsSelected: (query) ->
    @.toString() in query.fields

Template.results.rendered = ->
#  cl "results.rendered"

Template.results.events
  "click .increment-start-rec-num": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    startRecNum = template.data.startRecNum + share.intval($target.attr("data-increment"))
    startRecNum = Math.max(1, startRecNum)
    share.Queries.update(template.data._id, {$set: {startRecNum: startRecNum}})
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
  "change .field-checkbox": encapsulate (event, template) ->
    # recollecting all checkboxes to maintain field order
    fields = []
    $(".field-checkbox").each (index, checkbox) ->
      if checkbox.checked
        fields.push(checkbox.value)
    share.Queries.update(template.data._id, {$set: {fields: fields}})
  "change .num-recs": encapsulate (event, template) ->
    $numRecs = $(event.currentTarget)
    numRecs = $numRecs.val()
    Meteor.users.update(Meteor.userId(), {$set: {"profile.numRecs": numRecs}})
    share.Queries.update(template.data._id, {$set: {stale: true}})
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
