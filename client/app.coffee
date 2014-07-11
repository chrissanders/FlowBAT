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
