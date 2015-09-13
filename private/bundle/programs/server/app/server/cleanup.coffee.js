(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Process;

Process = Npm.require("child_process");

share.cleanupQuickQueries = function() {
  var borderline;
  borderline = new Date(new Date().getTime() - 7 * share.day);
  return share.Queries.find({
    isQuick: true,
    executingInterval: {
      $lte: 0
    },
    updatedAt: {
      $lt: borderline
    }
  }).forEach(function(query) {
    return share.Queries.remove(query._id);
  });
};

share.cleanupCachedQueryResults = function() {
  var borderline, config;
  borderline = new Date(new Date().getTime() - 2 * share.day);
  config = share.Configs.findOne({}, {
    transform: share.Transformations.config
  });
  return share.Queries.find({
    executingInterval: {
      $lte: 0
    },
    updatedAt: {
      $lt: borderline
    }
  }).forEach(function(query) {
    var rmCommand;
    rmCommand = "rm -f " + config.dataTempdir + "/" + query._id + ".rwf";
    if (config.isSSH) {
      rmCommand = config.wrapCommand(rmCommand);
    }
    return Process.exec(rmCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
      var code, error, result;
      result = stdout.trim();
      error = stderr.trim();
      code = err ? err.code : 0;
      if (error) {
        throw new Error(error);
      }
    }));
  });
};

share.Queries.after.remove(function(userId, query) {
  var config, rmCommand;
  config = share.Configs.findOne({}, {
    transform: share.Transformations.config
  });
  rmCommand = "rm -f " + config.dataTempdir + "/" + query._id + ".rwf";
  if (config.isSSH) {
    rmCommand = config.wrapCommand(rmCommand);
  }
  return Process.exec(rmCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
    var code, error, result;
    result = stdout.trim();
    error = stderr.trim();
    code = err ? err.code : 0;
    if (error) {
      throw new Error(error);
    }
  }));
});

})();

//# sourceMappingURL=cleanup.coffee.js.map
