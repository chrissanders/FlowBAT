Template.input.helpers
  placeholder: ->
    @placeholder or i18n.t(@placeholderI18n)
  disabled: ->
    not (if _.isBoolean(@enabled) then @enabled else true)
  value: ->
    $element = $("[data-family='" + @family + "'][data-object-id='" + @_id + "'][name='" + @property + "']")
    element = $element.get(0)
    if not element or element isnt document.activeElement
      editor = share.EditorCache.editors[@family]
      object = editor.collection.findOne(@_id)
      if not object # happens when logging in for the first time, or logging out anytime
        return
      object[@property]
    else
      $element.val()

Template.input.onRendered ->
  _id = @data._id
  property = @data.property
  element = @firstNode
  $element = $(element)
  editor = share.EditorCache.editors[@data.family]
  if editor.isEditedProperty(@data._id, @data.property)
    $activeElement = $(document.activeElement)
    if $element.get(0) isnt document.activeElement and (not $activeElement.closest("textarea, input").length or $activeElement.attr("data-family") and $activeElement.attr("data-family") is $element.attr("data-family"))
      if @data.isNew
        $element.select()
      else
        $element.focusToEnd()

Template.input.events
  "focus .property-editor": encapsulate (event, template) ->
    editor = share.EditorCache.editors[template.data.family]
    editor.setEditingProperty(template.data._id, template.data.property)
  "blur .property-editor": encapsulate (event, template) ->
    $editor = $(event.target)
    editor = share.EditorCache.editors[template.data.family]
    editor.saveProperty(template.data._id, template.data.property, $editor.val())
  "keydown .property-editor": encapsulate (event, template) ->
    $editor = $(event.target)
    editor = share.EditorCache.editors[template.data.family]
    data = template.data
    switch event.keyCode
      when 13 # Enter
        editor.saveProperty(template.data._id, template.data.property, $editor.val())
      when 27 # Escape
        event.preventDefault()
        editor.stopEditing(data._id)
      else
      # noop
  "keyup .property-editor, paste .property-editor": (event, template) ->
    $editor = $(event.target)
    editor = share.EditorCache.editors[template.data.family]
    switch event.keyCode
      when 13 # Enter
      # handled in keydown
      else
        editor.debouncedSaveProperty(template.data._id, template.data.property, $editor.val())
