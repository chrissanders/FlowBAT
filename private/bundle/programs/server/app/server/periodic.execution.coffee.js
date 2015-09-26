(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.periodicExecution = {
  timeout: null,
  nearestExecutingAt: null,
  execute: function() {
    share.Queries.find({
      executingAt: {
        $lte: new Date()
      }
    }).forEach(function(query) {
      var executingAt;
      executingAt = new Date(new Date().getTime() + query.executingInterval);
      return share.Queries.update(query._id, {
        $set: {
          isInputStale: true,
          isOutputStale: true,
          executingAt: executingAt
        }
      }, {
        skipResetTimeout: true
      });
    });
    return this.resetTimeout();
  },
  resetTimeout: function() {
    var nearestQuery, timeout;
    nearestQuery = share.Queries.findOne({
      executingAt: {
        $ne: null
      }
    }, {
      sort: {
        executingAt: 1
      }
    });
    timeout = 30 * 1000;
    if (nearestQuery) {
      timeout = nearestQuery.executingAt.getTime() - new Date().getTime();
    }
    if (this.timeout) {
      Meteor.clearTimeout(this.timeout);
    }
    timeout = Math.max(1000, timeout);
    return this.timeout = Meteor.setTimeout(this.execute, timeout);
  }
};

_.bindAll(share.periodicExecution, "execute", "resetTimeout");

})();

//# sourceMappingURL=periodic.execution.coffee.js.map
