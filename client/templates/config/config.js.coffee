Template.config.helpers
#  helper: ->

Template.config.rendered = ->
  @$("form").validate(
    rules:
      siteConfigFile:
        required: true
      dataRootdir:
        required: true
  )

Template.config.events
  "keyup input": (event, template) ->
    $input = $(event.currentTarget)
    $input.valid()
