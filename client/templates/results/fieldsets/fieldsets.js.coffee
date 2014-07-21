Template.fieldsets.helpers
  ipsets: ->
    share.IPSets.find({}, {sort: {createdAt: 1}})
  typesOptions: ->
    for type in share.queryTypes
      {
        name: type
        value: type
      }
  countriesOptions: ->
    window.countryCodesMap

Template.fieldsets.rendered = ->

Template.fieldsets.events
  "click .create-ipset": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    field = $target.attr("data-field")
    _id = share.IPSets.insert({})
    $set = {}
    $set[field] = _id
    $set[field + "Enabled"] = true
    share.Queries.update(template.data._id, {$set: $set})
    Router.go("/ipset/" + _id)
