Template.tuple.helpers
  queries: ->
    share.Queries.find({isQuick: false, $or: [{tupleFile: @_id}]})

Template.tuple.rendered = ->
  @$("form").validate(
    rules:
      name:
        required: true
      contents:
        required: true
  )

Template.tuple.events
  "submit form": grab encapsulate (event, template) ->
    editor = share.EditorCache.editors["tuple"]
    editor.saveObject(template.data._id)
    $saveNotice = $(".save-notice")
    $saveNotice.show().delay(2000).fadeOut()
