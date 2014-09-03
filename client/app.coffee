share.loginCallback = (error) ->
  unless error
    user = Meteor.user()
    modifier = {}
    $set = {}
    # locale needs to be set here, so that we have access to browser default locale
    if not user.profile.locale
      $set["profile.locale"] = user.services?.google?.locale || i18n.lng()
    if not _.isEmpty($set)
      modifier.$set = $set
    if not _.isEmpty(modifier)
      Meteor.users.update(user._id, modifier)
    if user.isNew
      Meteor.setTimeout( ->
        Meteor.users.update(user._id, {$set: {isNew: false}})
      , 1000)
    $(document.body).trigger("popup.hide")
    share.userStartupOnce()

share.checkConnection = (event, template, successCallback = ->) ->
  # Explicit saving mitigates random errors: values might not be saved if pasted (not sure what triggers the errors)
  Session.set("checkingConnection", true)
  template.$(".notice").fadeOut()
  $form = template.$("form")
  $set = {}
  for field in $form.serializeArray()
    $set[field.name] = field.value
  if _.has($set, "isSSH")
    $set.isSSH = !!$set.isSSH
  share.Configs.update($form.attr("data-id"), {$set: $set}, (error) ->
    if error
      Session.set("checkingConnection", false)
      return
    Meteor.call("checkConnection", (error) ->
      Session.set("checkingConnection", false)
      if error
        $notice = template.$(".connection-failure-notice")
        $notice.find("pre").text(error.reason)
        $notice.fadeIn()
        return
      $notice = template.$(".connection-success-notice")
      $notice.fadeIn()
      successCallback()
    )
  )
