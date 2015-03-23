UI.registerHelper("fieldI18nString", ->
  "rwcut.fields." + @.trim()
)

UI.registerHelper("fieldIsSelected", (query, property) ->
  @.toString() in query[property]
)

UI.registerHelper("currentConfig", ->
  share.Configs.findOne()
)

UI.registerHelper("currentTemplateName", ->
  Router.current().lookupTemplate()
)
