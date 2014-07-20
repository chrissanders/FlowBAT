Template.ipset.helpers
  queries: ->
    share.Queries.find({isQuick: false, $or: [{sipSet: @_id}, {dipSet: @_id}, {anySet: @_id}]})

Template.ipset.rendered = ->
  @$("form").validate(
    rules:
      name:
        required: true
      contents:
        required: true
#    submitHandler: ->
  )

Template.ipset.events
  "submit form": grab encapsulate (event, template) ->
    editor = share.EditorCache.editors["ipset"]
    editor.saveObject(template.data._id)
    $saveNotice = $(".save-notice")
    $saveNotice.show().delay(2000).fadeOut()
