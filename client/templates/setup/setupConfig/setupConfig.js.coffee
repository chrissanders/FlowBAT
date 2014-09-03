Template.setupConfig.helpers
  configFormContext: ->
    options:
      title: "Nice to meet you, " + share.Transformations.user(Meteor.user()).firstName + "!"
      description: "Please configure your FlowBAT installation:"
      checkConnectionText: "Finish setup"
    config: share.Configs.findOne()

Template.setupConfig.rendered = ->

Template.setupConfig.events
  "click .check-connection": (event, template) ->
    $target = $(event.currentTarget)
    if $target.closest("form").valid()
      share.checkConnection(event, template, ->
        config = share.Configs.findOne()
        share.Configs.update(config._id, {$set: {isSetupComplete: true}})
        Router.go("/")
      )
