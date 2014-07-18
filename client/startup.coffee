Session.set("now", new Date())
setInterval(->
  Session.set("now", new Date())
, 1000)

Meteor.startup ->
  userId = Meteor.userId()
  if Meteor.settings.public.isDebug
    if not userId and (location.host == "localhost:3000" or location.host.indexOf("192.168") != -1)
      if jQuery.browser.webkit
        Meteor.loginWithToken("ChrisSanders")
      if jQuery.browser.mozilla
        Meteor.loginWithToken("DenisGorbachev")

Meteor.startup ->
  $.validator.addMethod "uniqueEmail", (value, element) ->
    value is $(element).data("value") or not Meteor.users.findOne({"emails.0.address": share.createTextSearchRegexp(value, true)})

#usedCodes = []
#map = []
#map.push({value: "--", name: "N/A (private and reserved)"})
#map.push({value: "o1", name: "Other"})
#map.push({value: "a1", name: "Anonymous proxy"})
#map.push({value: "a2", name: "Satellite provider"})
#for tr in $("tr")
#  $tr = $(tr)
#  $tds = $tr.find("td")
#  codeTd = $tds.get(4)
#  countryTd = $tds.get(5)
#  code = codeTd.innerText.trim()
#  lccode = code.toLowerCase()
#  country = countryTd.innerText.trim()
#  if usedCodes.indexOf(lccode) is -1
#    usedCodes.push(lccode)
#    map.push({value: lccode, name: country + " (" + code + ")"})
#console.log JSON.stringify(map)
