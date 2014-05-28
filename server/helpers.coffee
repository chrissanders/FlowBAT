OriginalHandlebars.registerHelper "t", (key, hash) ->
  params = {} #default
  params = hash.hash  if hash
  result = root.i18n.t(key, params)
  new OriginalHandlebars.SafeString(result)
