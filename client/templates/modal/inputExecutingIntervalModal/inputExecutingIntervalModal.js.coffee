Template.inputExecutingIntervalModal.helpers
  query: ->
    share.Queries.findOne(@_id)
  executingIntervalInMinutes: ->
    Math.ceil(@executingInterval / share.minute)

Template.inputExecutingIntervalModal.rendered = ->
  @$(".modal").modal().on("hidden.bs.modal", (event) ->
    $(@).remove()
  )

Template.inputExecutingIntervalModal.events
  "submit .executing-interval-form": grab encapsulate (event, template) ->
    $form = $(event.currentTarget)
    $input = $form.find(".executing-interval-in-minutes")
    executingInterval = share.intval($input.val()) * share.minute
    share.Queries.update(template.data._id, {$set: {executingInterval: executingInterval}})
    template.$(".modal").modal("hide")

