Template.welcome.helpers {}

Template.welcome.rendered = ->

Template.welcome.events
  "submit form": grab encapsulate (event, template) ->
    email = template.$(".email").val()
    password = template.$(".password").val()
    email = email.toLowerCase()
    Meteor.loginWithPassword(email, password, (error) ->
      if error
        $(".error-container").html(error.reason).show()
    )
