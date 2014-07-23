Template.changePasswordAlertDescription.helpers
#  helper: ->

Template.changePasswordAlertDescription.rendered = ->
  @$(".new-password").focus()

Template.changePasswordAlertDescription.events
#  "click .selector": (event, template) ->
  "submit form": (event, template) ->
    event.preventDefault()
    password = String($(".change-password-form .new-password").val())
    if password
      Meteor.call "setPassword", template.data.user._id, password, (error) ->
        $(event.target).closest(".alert-message").remove()
