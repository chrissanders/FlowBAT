Template.ipsetCreate.helpers
#  helper: ->

Template.ipsetCreate.rendered = ->

Template.ipsetCreate.events
  "submit form": grab encapsulate (event, template) ->
    editor = share.EditorCache.editors["ipset"]
    _id = editor.insertObject()
    Router.go("/ipset/" + _id)
    _.defer ->
      $saveNotice = $(".create-notice")
      $saveNotice.show().delay(2000).fadeOut()
