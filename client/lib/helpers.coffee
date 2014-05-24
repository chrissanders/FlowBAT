UI.registerHelper("share", ->
  share
)

UI.registerHelper("Router", ->
  Router
)

UI.registerHelper("condition", (v1, operator, v2, options) ->
  switch operator
    when "==", "eq", "is"
      v1 is v2
    when "!=", "neq", "isnt"
      v1 isnt v2
    when "===", "ideq"
      v1 is v2
    when "!==", "nideq"
      v1 isnt v2
    when "&&", "and"
      v1 and v2
    when "||", "or"
      v1 or v2
    when "<", "lt"
      v1 < v2
    when "<=", "lte"
      v1 <= v2
    when ">", "gt"
      v1 > v2
    when ">=", "gte"
      v1 >= v2
    else
      throw "Undefined operator \"" + operator + "\""
)

UI.registerHelper "not", (value, options) ->
  not value

UI.registerHelper("formatDuration", (duration, options) ->
  hours = share.intval(duration / 1000 / 3600)
  minutes = share.intval(duration / 1000 % 3600 / 60)
  _.str.pad(hours, 2, "0") + ":" + _.str.pad(minutes, 2, "0")
)
