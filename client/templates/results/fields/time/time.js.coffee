Template.time.helpers
  value: ->
    query = Router.current().data().query
    m = moment.utc(@value, "YYYY/MM/DDTHH:mm:ss.SSS")
    if query.isUTC
      m.format(share.datetimeFormat)
    else
      m.zone(moment().zone())
      m.format(share.datetimeFormat + " ZZ")

Template.time.rendered = ->

Template.time.events
#  "click .selector": (event, template) ->
