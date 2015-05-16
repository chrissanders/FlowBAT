Template.objectSelect.helpers
  placeholder: ->
    @placeholder or i18n.t(@placeholderI18n)
  disabled: ->
    not (if _.isBoolean(@enabled) then @enabled else true)
  optionSelected: (context) ->
    if context.multiple
      @objectSelectValue() in context.value
    else
      @objectSelectValue() is context.value

Template.objectSelect.onRendered ->

Template.objectSelect.events
  "change .property-editor": encapsulate (event, template) ->
    $set = {}
    value = $(event.currentTarget).val()
    if not value
      if template.data.multiple
        value = []
      else
        value = null
    $set[template.data.property] = value
    editor = share.EditorCache.editors[template.data.family]
    editor.collection.update(template.data._id, {$set: $set})
