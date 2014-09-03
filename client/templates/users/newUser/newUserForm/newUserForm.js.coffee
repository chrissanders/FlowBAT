Template.newUserForm.helpers
  groups: ->
    for group in share.Security.groups()
      value: group
      name: i18n.t("groups." + group)

Template.newUserForm.rendered = ->
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

Template.newUserForm.events
#  "click .selector": (event, template) ->
