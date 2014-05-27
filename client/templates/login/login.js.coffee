Template.login.rendered = ->
  $signinForm = @$(".signin form")
  $signinForm.validate
    rules:
      email:
        required: true
        email: true
      password:
        required: true
        minlength: 4
    messages: i18n.t("forms.login.messages", {returnObjectTrees: true})
    submitHandler: (form) ->
      email = $(".email", form).val().toLowerCase()
      password = $(".password", form).val()
      Meteor.loginWithPassword email, password, (error) ->
        if error
          $signinForm.validate().showErrors
            password: i18n.t("serverErrors." + error.reason)
        else
          $(document.body).trigger("popup.hide")
          share.loginCallback()() # create and run

  $signupForm = @$(".signup form")
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
    messages: i18n.t("forms.login.messages", {returnObjectTrees: true})
    submitHandler: (form) ->
      email = $(".email", form).val().toLowerCase()
      password = $(".password", form).val()
      Accounts.createUser { email: email, password: password }, (error) ->
        if (error)
          $signupForm.validate().showErrors
            password: i18n.t("serverErrors." + error.reason)
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
