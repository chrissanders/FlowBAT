Template.config.helpers
  configFormContext: ->
    options:
      title: "SiLK server configuration"
      checkConnectionText: "Check connection"
    config: @config

Template.config.rendered = ->

Template.config.events
  "click .check-connection": (event, template) ->
    share.checkConnection(event, template)
