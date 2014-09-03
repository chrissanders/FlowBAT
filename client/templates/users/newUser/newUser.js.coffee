Template.newUser.helpers
  newUserFormContext: ->
    title: "New user"
    submitText: i18n.t("interface.insert")

Template.newUser.rendered = ->

Template.newUser.events
  "submit .user-form": (event, template) ->
    form = event.currentTarget
    event.preventDefault()
    newUser = {}
    for input in $(".user-input", form)
      $input = $(input)
      newUser[$input.attr("name")] = $input.val()
    Meteor.call "addNewUser", newUser, (error, userId) ->
      unless error
        Router.go("user", {_id: userId})
        _.defer ->
          $newNotice = $(".create-notice")
          $newNotice.show().delay(2000).fadeOut()
