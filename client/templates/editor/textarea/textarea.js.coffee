Template.textarea.helpers

Template.textarea.rendered = ->
  editor = @firstNode
  $editor = $(editor)
  $editor.autosize()
  editor = share.EditorCache.editors[@data.family]
  if editor.isEdited(@data._id) # and Session.equals("edited" + cls + "Property", @data.property)
    $activeElement = $(document.activeElement)
    if $editor.get(0) isnt document.activeElement and (not $activeElement.closest("textarea, input").length or $activeElement.attr("data-family") and $activeElement.attr("data-family") is $editor.attr("data-family"))
      if @data.isNew
        $editor.select()
      else
        $editor.focusToEnd()

Template.textarea.events
#  "click .selector": (event, template) ->
