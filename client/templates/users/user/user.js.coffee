Template.user.helpers
  groups: ->
    for group in share.Security.groups()
      value: group
      name: i18n.t("groups." + group)
      isCurrent: group is @user.group
  isCurrentUser: ->
    @user._id is Meteor.userId()

Template.user.rendered = ->
  $(".user-form").validate
    errorElement: "div"
    rules:
      email:
        required: true
        email: true
        uniqueEmail: true
      name:
        required: true
      group:
        required: true
    messages: i18n.t("forms.profile.messages", {returnObjectTrees: true})

Template.user.events
  "submit .user-form": (event, template) ->
    form = event.currentTarget
    event.preventDefault()
    $set = {}
    for input in $(".user-input:enabled", form)
      $input = $(input)
      $set[$input.data("field")] = $input.val()
    Meteor.users.update template.data.user._id, {$set: $set}, (error) ->
      unless error
        $saveNotice = template.$(".save-notice")
        $saveNotice.show().delay(2000).fadeOut()
