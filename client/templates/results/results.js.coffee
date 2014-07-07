Template.results.helpers
  fieldI18nString: ->
    "rwcut.fields." + @.trim()

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

