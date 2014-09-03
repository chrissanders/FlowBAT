configPreSave = (userId, changes) ->

share.Configs.before.update (userId, config, fieldNames, modifier, options) ->
  now = new Date()
  modifier.$set = modifier.$set or {}
  modifier.$set.updatedAt = modifier.$set.updatedAt or now
  configPreSave.call(@, userId, modifier.$set)
