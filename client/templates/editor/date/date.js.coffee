Template.date.helpers

Template.date.rendered = ->
  template = @
  $editor = template.$("input")
  $editor.datepicker(
    changeMonth: true
    changeYear: true
    dateFormat: "yy/mm/dd"
    onSelect: (date) ->
      $set = {}
      $set[template.data.property] = date
      editor = share.EditorCache.editors[template.data.family]
      editor.collection.update(template.data._id, {$set: $set})
  )
  $editor.datepicker("setDate", @data.value)

Template.date.events
