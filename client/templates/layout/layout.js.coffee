Template.layout.helpers

Template.layout.rendered = ->

Template.layout.events
  "click .confirm": (event, template) ->
    if not confirm($(event.currentTarget).attr("data-confirmation"))
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

# using navite body events, because sometimes click occurs on body itself
Meteor.startup ->
  $(document.body).on("click", (event) ->
    $object = $(event.target).closest(".object")
    share.EditorCache.stopEditing(share.EditorCache.editorId($object.attr("data-family"), $object.attr("data-id")))
  )
