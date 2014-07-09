Template.index.helpers
  query: ->
    share.Queries.findOne({type: "quick"})

Template.index.rendered = ->

Template.index.events
  "submit .query-form": grab encapsulate (event, template) ->
    $query = $(event.target).find(".query")
    query = $query.val()
    share.saveQuery(query, true)
