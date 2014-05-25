Template.textarea.helpers

Template.textarea.rendered = ->
  editor = @firstNode
  $editor = $(editor)
  $editor.autosize(
    append: ""
  )
  editor = share.EditorCache.editors[@data.family]
  if editor.isEdited(@data._id) # and Session.equals("edited" + cls + "Property", @data.property)
    $activeElement = $(document.activeElement)
    if $editor.get(0) isnt document.activeElement and (not $activeElement.closest("textarea, input").length or $activeElement.attr("data-family") and $activeElement.attr("data-family") is $editor.attr("data-family"))
      if @data.isNew
        $editor.select()
      else
        $editor.focusToEnd()

Template.textarea.events
  "keydown .property-editor": encapsulate (event, template) ->
    $editor = $(event.target)
    editor = share.EditorCache.editors[template.data.family]
    data = template.data
    switch event.keyCode
      when 9 # Tab
        if not event.shiftKey
          _.defer -> # maybe replace with keyup
            $activeElement = $(document.activeElement)
            activeElementFamily = $activeElement.attr("data-family")
            if not activeElementFamily or activeElementFamily isnt editor.family
              editor.saveProperty(data._id, data.property, $editor.val())
              editor.stopEditing(data._id)
              editor.insertAfter(data._id)
      when 13 # Enter
        if editor.isSingleLine(data.property) or event.ctrlKey
          event.preventDefault()
          editor.saveProperty(data._id, data.property, $editor.val())
          editor.stopEditing(data._id)
          if not event.altKey
            editor.insertAfter(data._id)
      when 27 # Escape
        event.preventDefault()
        editor.saveProperty(data._id, data.property, $editor.val())
        editor.stopEditing(data._id)
      else
      # noop
  "keyup, paste .property-editor": encapsulate (event, template) ->
    $editor = $(event.target)
    editor = share.EditorCache.editors[template.data.family]
    editor.debouncedSaveProperty(template.data._id, template.data.property, $editor.val())
