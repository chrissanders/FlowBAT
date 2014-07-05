Template.index.helpers
  query: ->
    share.Queries.findOne({type: "quick"})

Template.index.rendered = ->

Template.index.events
  "keyup, paste .query": encapsulate (event, template) ->
    $query = $(event.target)
    query = $query.val()
    share.debouncedSaveQuery(query)
  "submit .query-form": grab encapsulate (event, template) ->
    $query = $(event.target).find(".query")
    query = $query.val()
    share.saveQuery(query, true)
