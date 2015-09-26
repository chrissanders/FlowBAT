Template.date.helpers

Template.date.onRendered ->
  template = @
  $editor = template.$("input")
  $editor.datepicker(
    changeMonth: true
    changeYear: true
    dateFormat: "yy/mm/dd"
    constrainInput: false
    onSelect: (date) ->
      $set = {}
      $set[template.data.property] = date
      editor = share.EditorCache.editors[template.data.family]
      editor.collection.update(template.data._id, {$set: $set})
  )
  date = @data.value.replace(/\:.+$/i, "") # actually, the format is yy/mm/dd:hh, but ":hh" part should be stripped for datepicker
  $editor.datepicker("setDate", date)
  $editor.val(@data.value)

Template.date.events
