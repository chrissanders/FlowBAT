Template.fieldsets.helpers
  ipsets: ->
    share.IPSets.find({}, {sort: {createdAt: 1}})

Template.fieldsets.rendered = ->

Template.fieldsets.events
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
  "click .create-ipset": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    field = $target.attr("data-field")
    _id = share.IPSets.insert({})
    $set = {}
    $set[field] = _id
    $set[field + "Enabled"] = true
    share.Queries.update(template.data._id, {$set: $set})
    Router.go("/ipset/" + _id)
