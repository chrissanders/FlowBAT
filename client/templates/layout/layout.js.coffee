Template.layout.helpers

Template.layout.rendered = ->

Template.layout.events
  "click": (event, template) ->
    $object = $(event.target).closest(".object")
    share.EditorCache.stopEditing(share.EditorCache.editorId($object.attr("data-family"), $object.attr("data-id")))
