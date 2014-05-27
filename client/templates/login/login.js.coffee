Template.login.rendered = ->
  messages =
    email:
      required: "Please specify your email"
      email: "Doesn't seem to be valid email"
    password:
      required: "Please specify your password"
      minlength: "Password should have at least 4&nbsp;characters"
    passwordAgain:
      required: "Please repeat your password"
      equalTo: "The passwords should match"
  serverErrors =
    "User not found": "User not found"
    "Email already exists": "Email already exists"
    "Incorrect password": "Incorrect password"
    "User has no password set": "Please, follow the link from the invitation email and set a new password"
    "Token expired": "Invitation link has expired"

  $signinForm = $(@find(".signin form"))
  $signinForm.validate
    rules:
      email:
        required: true
        email: true
      password:
        required: true
        minlength: 4
    messages: messages
    submitHandler: (form) ->
      email = $(".email", form).val().toLowerCase()
      password = $(".password", form).val()
      Meteor.loginWithPassword email, password, (error) ->
        if error
          $signinForm.validate().showErrors
            password: serverErrors[error.reason]
        else
          $(document.body).trigger("popup.hide")
          share.loginCallback()() # create and run

  $signupForm = $(@find(".signup form"))
  $signupForm.validate
    rules:
      email:
        required: true
        email: true
      password:
        required: true
        minlength: 4
      passwordAgain:
        required: true
        equalTo: ".signup .password"
    messages: messages
    submitHandler: (form) ->
      email = $(".email", form).val().toLowerCase()
      password = $(".password", form).val()
      Accounts.createUser { email: email, password: password }, (error) ->
        if (error)
          $signupForm.validate().showErrors
            password: serverErrors[error.reason]
        else
          $(document.body).trigger("popup.hide")
          share.loginCallback()() # create and run
  if share.isDebug
    $signupForm.find(".email").val(Random.id() + "@meetings.me")
    $signupForm.find(".password").val("asdfasdf")
    $signupForm.find(".passwordAgain").val("asdfasdf")

Template.login.events
  "click .sign-in-with-google": grab (event, template) ->
    Meteor.loginWithGoogle({}, share.loginCallback())
