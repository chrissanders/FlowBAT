Template.tupleCreate.helpers
#  helper: ->

Template.tupleCreate.rendered = ->

  @$(".panel").popover(
    selector: "*[data-toggle='popover']"
    trigger: "hover"
    delay: {show: 300, hide: 100}
  )
  
  @$("form").validate(
    rules:
      name:
        required: true
      contents:
        required: true
  )

Template.tupleCreate.events
  "submit form": grab encapsulate (event, template) ->
    editor = share.EditorCache.editors["tuple"]
    _id = editor.insertObject()
    Router.go("/tuple/" + _id)
    _.defer ->
      $saveNotice = $(".create-notice")
      $saveNotice.show().delay(2000).fadeOut()
