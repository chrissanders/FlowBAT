Template.setupAdminAccount.helpers
  newUserFormConfig: ->
    title: "Welcome to FlowBAT!"
    description: "Please create administrator account:"
    submitText: i18n.t("interface.create")

Template.setupAdminAccount.rendered = ->

Template.setupAdminAccount.events
  "submit .user-form": (event, template) ->
    form = event.currentTarget
    event.preventDefault()
    newUser = {}
    for input in $(".user-input", form)
      $input = $(input)
      newUser[$input.attr("name")] = $input.val()
    Meteor.call("addNewUser", newUser, (error, userId) ->
      if error then throw error
      Meteor.loginWithPassword(newUser.email, newUser.password)
    )

