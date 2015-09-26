(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

share.Queries.before.update(function(userId, query, fieldNames, modifier, options) {
  if (modifier.$set) {
    if (_.has(modifier.$set, "executingInterval")) {
      if (modifier.$set.executingInterval) {
        return modifier.$set.executingAt = new Date(new Date().getTime() + modifier.$set.executingInterval);
      } else {
        return modifier.$set.executingAt = null;
      }
    }
  }
});

share.Queries.after.update(function(userId, query, fieldNames, modifier, options) {
  if (options.skipResetTimeout) {
    return;
  }
  if (__indexOf.call(fieldNames, "executingAt") >= 0 && query.executingAt) {
    return share.periodicExecution.resetTimeout();
  }
});

})();

//# sourceMappingURL=executingAt.query.hooks.coffee.js.map
