Template.exclusions.helpers
  exclusions: ->
    cl @_id
    share.Exclusions.find(queryId: @_id)

Template.results.rendered = ->
#  cl "results.rendered"

Template.exclusions.events
  "click .input-group-btn.add-exclusion a": grab (event, template) ->
    cl "Add exclusion button has been pressed"
    exclusionId = share.Exclusions.insert({})
    exclusion = share.Exclusions.findOne(exclusionId)
    exclusion.queryId = @_id
    exclusion.userId = Meteor.userId()



