(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
FastRender.onAllRoutes(function(params) {
  this.subscribe("currentUser");
  this.subscribe("users");
  this.subscribe("configs");
  this.subscribe("queries");
  this.subscribe("ipsets");
  return this.subscribe("tuples");
});

})();

//# sourceMappingURL=fastrender.coffee.js.map
