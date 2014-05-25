share.loginCallback = ->

share.milliseconds2hourminutes = (milliseconds) ->
  hours = share.intval(milliseconds / 1000 / 3600)
  minutes = share.intval(milliseconds / 1000 % 3600 / 60)
  _.str.pad(hours, 2, "0") + ":" + _.str.pad(minutes, 2, "0")

share.hourminutes2milliseconds = (duration) ->
  splinters = duration.split(":")
  (share.intval(splinters[0]) * 60 + share.intval(splinters[1])) * 60 * 1000
