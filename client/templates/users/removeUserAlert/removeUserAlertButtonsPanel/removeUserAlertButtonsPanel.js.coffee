Template.removeUserAlertButtonsPanel.helpers
#  helper: ->

Template.removeUserAlertButtonsPanel.rendered = ->

Template.removeUserAlertButtonsPanel.events
  "click .remove-button": (event, template) ->
    Meteor.users.remove(template.data.user._id)
    $(event.target).closest(".alert-message").remove()
