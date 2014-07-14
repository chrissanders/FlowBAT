Template.fieldsets.helpers
  types: ->
    share.queryTypes

Template.fieldsets.rendered = ->

Template.fieldsets.events
  "change .field-checkbox": encapsulate (event, template) ->
    # recollecting all checkboxes to maintain field order
    fields = []
    $(".field-checkbox").each (index, checkbox) ->
      if checkbox.checked
        fields.push(checkbox.value)
    share.Queries.update(template.data._id, {$set: {fields: fields}})
  "change .type-checkbox": encapsulate (event, template) ->
    checkbox = event.currentTarget
    modifier = {}
    if checkbox.checked
      modifier.$addToSet = {"types": checkbox.value}
    else
      modifier.$pull = {"types": checkbox.value}
    share.Queries.update(template.data._id, modifier)
  "click .for-all-types": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    operator = $target.attr("data-operator")
    for checkbox in $(".type-checkbox")
      modifier = {}
      modifier[operator] = {"types": checkbox.value}
      share.Queries.update(template.data._id, modifier)
