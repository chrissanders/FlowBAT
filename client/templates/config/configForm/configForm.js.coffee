Template.configForm.helpers
#  helper: ->

Template.configForm.rendered = ->
  @$("form").validate(
    rules:
      siteConfigFile:
        required: true
      dataRootdir:
        required: true
  )

Template.configForm.events
  "click .check-connection": encapsulate (event, template) ->
    Session.set("checkingConnection", true)
    template.$(".notice").fadeOut()
    Meteor.call("checkConnection", (error) ->
      Session.set("checkingConnection", false)
      if error
        $notice = template.$(".connection-failure-notice")
        $notice.find("pre").text(error.reason)
      else
        $notice = template.$(".connection-success-notice")
      $notice.fadeIn()
    )
  "keyup input": (event, template) ->
    $input = $(event.currentTarget)
    $input.valid()
