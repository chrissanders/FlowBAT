(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
OriginalHandlebars.registerHelper("t", function(key, hash) {
  var params, result;
  params = {};
  if (hash) {
    params = hash.hash;
  }
  result = root.i18n.t(key, params);
  return new OriginalHandlebars.SafeString(result);
});

})();

//# sourceMappingURL=helpers.coffee.js.map
