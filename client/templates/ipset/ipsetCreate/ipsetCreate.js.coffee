Template.ipsetCreate.helpers
#  helper: ->

Template.ipsetCreate.rendered = ->

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

Template.ipsetCreate.events
  "submit form": grab encapsulate (event, template) ->
    editor = share.EditorCache.editors["ipset"]
    _id = editor.insertObject()
    Router.go("/ipset/" + _id)
    _.defer ->
      $saveNotice = $(".create-notice")
      $saveNotice.show().delay(2000).fadeOut()
