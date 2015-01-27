Template.configForm.helpers
#  helper: ->

Template.configForm.rendered = ->
  @$("form").validate(
    rules:
      siteConfigFile:
        required: true
      dataRootdir:
        required: true
      dataTempdir:
        required: true
  )

Template.configForm.events
  "keyup input": (event, template) ->
    $input = $(event.currentTarget)
    $input.valid()
