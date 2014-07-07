Template.results.helpers

Template.results.rendered = ->
#  cl "results.rendered"

Template.results.events
  "click .increment-start-rec-num": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    startRecNum = template.data.startRecNum + share.intval($target.attr("data-increment"))
    startRecNum = Math.max(1, startRecNum)
    share.Queries.update(template.data._id, {$set: {startRecNum: startRecNum}})

