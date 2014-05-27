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

share.milliseconds2hourminutes = (milliseconds) ->
  hours = share.intval(milliseconds / 1000 / 3600)
  minutes = share.intval(milliseconds / 1000 % 3600 / 60)
  _.str.pad(hours, 2, "0") + ":" + _.str.pad(minutes, 2, "0")

share.hourminutes2milliseconds = (duration) ->
  splinters = duration.split(":")
  (share.intval(splinters[0]) * 60 + share.intval(splinters[1])) * 60 * 1000

share.milliseconds2minutes = (milliseconds) ->
  share.intval(milliseconds / 1000 / 60)

share.minutes2milliseconds = (duration) ->
  share.intval(duration) * 60 * 1000
