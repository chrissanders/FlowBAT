Template.newUser.helpers
  groups: ->
    for group in share.Security.groups()
      value: group
      name: i18n.t("groups." + group)

Template.newUser.rendered = ->
  $(".user-form").validate
    errorElement: "div"
    rules:
      email:
        required: true
        email: true
        uniqueEmail: true
      name:
        required: true
      password:
        required: true
      group:
        required: true
    messages: i18n.t("forms.profile.messages", {returnObjectTrees: true})

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
          $notice = $("<p>").addClass("bg-success").text(i18n.t("forms.profile.messages.inserted"))
          $notice.appendTo($(".user-form")).delay(2000).fadeOut ->
            $notice.remove()
