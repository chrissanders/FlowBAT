(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Future, Process, executeQuery, fs, loadQueryResult, writeFile;

fs = Npm.require("fs");

Process = Npm.require("child_process");

Future = Npm.require('fibers/future');

writeFile = Future.wrap(fs.writeFile);

share.Queries.after.update(function(userId, query, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, share.inputFields).length) {
    return share.Queries.update(query._id, {
      $set: {
        isInputStale: true
      }
    });
  }
});

share.Queries.after.update(function(userId, query, fieldNames, modifier, options) {
  var callback, config, profile;
  if (!query.isOutputStale) {
    return;
  }
  config = share.Configs.findOne({}, {
    transform: share.Transformations.config
  });
  query = share.Transformations.query(query);
  if (!query.inputOptions(config)) {
    share.Queries.update(query._id, {
      $set: {
        isInputStale: false,
        isOutputStale: false
      }
    });
    return;
  }
  profile = Meteor.users.findOne(query.ownerId).profile;
  callback = function(result, error, code) {
    return share.Queries.update(query._id, {
      $set: {
        result: result,
        error: error,
        code: code,
        isInputStale: false,
        isOutputStale: false
      }
    });
  };
  return loadQueryResult(query, config, profile, callback);
});

Meteor.methods({
  checkConnection: function() {
    var callback, config, fut, profile, query, queryId;
    if (!this.userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    queryId = share.Queries.insert({
      "interface": "cmd",
      cmd: "--protocol=0-255",
      isQuick: true
    });
    config = share.Configs.findOne({}, {
      transform: share.Transformations.config
    });
    profile = Meteor.users.findOne(this.userId).profile;
    query = share.Queries.findOne(queryId, {
      transform: share.Transformations.query
    });
    this.unblock();
    fut = new Future();
    callback = function(result, error, code) {
      if (error) {
        return fut["throw"](new Meteor.Error(500, error));
      } else {
        return fut["return"](result);
      }
    };
    executeQuery(query, config, profile, callback);
    return fut.wait();
  },
  loadDataForCSV: function(queryId) {
    var callback, config, fut, query;
    check(queryId, Match.App.QueryId);
    if (!this.userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    config = share.Configs.findOne({}, {
      transform: share.Transformations.config
    });
    query = share.Queries.findOne(queryId, {
      transform: share.Transformations.query
    });
    if (this.userId !== query.ownerId) {
      throw new Match.Error("Operation not allowed for non-owners");
    }
    this.unblock();
    fut = new Future();
    callback = function(result, error, code) {
      if (error) {
        return fut["throw"](new Error(error));
      } else {
        return fut["return"](result);
      }
    };
    query.startRecNum = 1;
    loadQueryResult(query, config, {
      numRecs: 0
    }, callback);
    return fut.wait();
  },
  getRwfToken: function(queryId) {
    var callback, config, fut, profile, query, token;
    check(queryId, Match.App.QueryId);
    if (!this.userId) {
      throw new Match.Error("Operation not allowed for unauthorized users");
    }
    config = share.Configs.findOne({}, {
      transform: share.Transformations.config
    });
    profile = Meteor.users.findOne(this.userId).profile;
    query = share.Queries.findOne(queryId, {
      transform: share.Transformations.query
    });
    if (this.userId !== query.ownerId) {
      throw new Match.Error("Operation not allowed for non-owners");
    }
    this.unblock();
    token = Random.id();
    fut = new Future();
    callback = function(result, error, code) {
      var copyCommand;
      if (error) {
        return fut["throw"](new Error(error));
      } else {
        if (config.isSSH) {
          copyCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + config.user + "@" + config.host + ":" + config.dataTempdir + "/" + query._id + ".rwf " + "/tmp" + "/" + token + ".rwf";
        } else {
          copyCommand = "cp " + config.dataTempdir + "/" + query._id + ".rwf " + "/tmp" + "/" + token + ".rwf";
        }
        return Process.exec(copyCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
          result = stdout.trim();
          error = stderr.trim();
          code = err ? err.code : 0;
          if (error) {
            return fut["throw"](new Error(error));
          } else {
            return fut["return"](token);
          }
        }));
      }
    };
    executeQuery(query, config, profile, callback);
    return fut.wait();
  }
});

executeQuery = function(query, config, profile, callback) {
  var command, isIpsetStale, isTupleStale, rwsetbuildErrors, rwsetbuildFutures, tuplebuildErrors, tuplebuildFutures;
  rwsetbuildErrors = [];
  rwsetbuildFutures = [];
  isIpsetStale = false;
  _.each(["dipSet", "sipSet", "anySet"], function(field) {
    var rmCommand, rmFuture, rwsFilename, rwsetbuildFuture, scpCommand, scpFuture, set, txtFilename, writeFileFuture;
    if (query[field + "Enabled"] && query[field]) {
      set = share.IPSets.findOne(query[field]);
      if (set.isOutputStale) {
        isIpsetStale = true;
        rwsetbuildFuture = new Future();
        txtFilename = "/tmp" + "/" + set._id + ".txt";
        rwsFilename = config.dataTempdir + "/" + set._id + ".rws";
        writeFileFuture = writeFile(txtFilename, set.contents);
        if (config.isSSH) {
          scpCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + txtFilename + " " + config.user + "@" + config.host + ":" + txtFilename;
          scpFuture = new Future();
          Process.exec(scpCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
            var code, error, result;
            result = stdout.trim();
            error = stderr.trim();
            code = err ? err.code : 0;
            if (error) {
              rwsetbuildErrors.push(error);
            }
            if (code === 0) {

            } else {
              if (!error) {
                throw "scp: code is \"" + code + "\" while stderr is \"" + error + "\"";
              }
            }
            return scpFuture["return"](result);
          }));
          scpFuture.wait();
        }
        rmCommand = "rm -f " + rwsFilename;
        if (config.isSSH) {
          rmCommand = config.wrapCommand(rmCommand);
        }
        rmFuture = new Future();
        Process.exec(rmCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
          var code, error, result;
          result = stdout.trim();
          error = stderr.trim();
          code = err ? err.code : 0;
          if (error) {
            rwsetbuildErrors.push(error);
          }
          if (code === 0) {

          } else {
            if (!error) {
              throw "rm: code is \"" + code + "\" while stderr is \"" + error + "\"";
            }
          }
          return rmFuture["return"](result);
        }));
        rmFuture.wait();
        writeFileFuture.resolve(Meteor.bindEnvironment(function(err, result) {
          var rwsetbuildCommand;
          if (err) {
            rwsetbuildErrors.push(err);
            return rwsetbuildFuture["return"](result);
          } else {
            rwsetbuildCommand = "rwsetbuild " + txtFilename + " " + rwsFilename;
            if (config.isSSH) {
              rwsetbuildCommand = config.wrapCommand(rwsetbuildCommand);
            }
            return Process.exec(rwsetbuildCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
              var code, error;
              result = stdout.trim();
              error = stderr.trim();
              code = err ? err.code : 0;
              if (error) {
                rwsetbuildErrors.push(error);
              }
              if (code === 0) {
                share.IPSets.update(set._id, {
                  $set: {
                    isOutputStale: false
                  }
                });
              } else {
                if (!error) {
                  throw "rwsetbuild: code is \"" + code + "\" while stderr is \"" + error + "\"";
                }
              }
              return rwsetbuildFuture["return"](result);
            }));
          }
        }));
        return rwsetbuildFutures.push(rwsetbuildFuture);
      }
    }
  });
  Future.wait(rwsetbuildFutures);
  if (rwsetbuildErrors.length) {
    callback("", rwsetbuildErrors.join("\n"), 255);
    return;
  }
  if (!query.isInputStale && !isIpsetStale) {
    callback("", "", 0);
    return;
  }
  tuplebuildErrors = [];
  tuplebuildFutures = [];
  isTupleStale = false;
  _.each(["tupleFile"], function(field) {
    var rmCommand, rmFuture, scpCommand, scpFuture, set, tupleFilename, tuplebuildFuture, txtFilename, writeFileFuture;
    if (query[field + "Enabled"] && query[field]) {
      set = share.Tuples.findOne(query[field]);
      if (set.isOutputStale) {
        isTupleStale = true;
        tuplebuildFuture = new Future();
        txtFilename = "/tmp" + "/" + set._id + ".txt";
        tupleFilename = config.dataTempdir + "/" + set._id + ".tuple";
        writeFileFuture = writeFile(txtFilename, set.contents);
        if (config.isSSH) {
          scpCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + txtFilename + " " + config.user + "@" + config.host + ":" + txtFilename;
          scpFuture = new Future();
          Process.exec(scpCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
            var code, error, result;
            result = stdout.trim();
            error = stderr.trim();
            code = err ? err.code : 0;
            if (error) {
              tuplebuildErrors.push(error);
            }
            if (code === 0) {

            } else {
              if (!error) {
                throw "scp: code is \"" + code + "\" while stderr is \"" + error + "\"";
              }
            }
            return scpFuture["return"](result);
          }));
          scpFuture.wait();
        }
        rmCommand = "rm -f " + tupleFilename;
        if (config.isSSH) {
          rmCommand = config.wrapCommand(rmCommand);
        }
        rmFuture = new Future();
        Process.exec(rmCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
          var code, error, result;
          result = stdout.trim();
          error = stderr.trim();
          code = err ? err.code : 0;
          if (error) {
            tuplebuildErrors.push(error);
          }
          if (code === 0) {

          } else {
            if (!error) {
              throw "rm: code is \"" + code + "\" while stderr is \"" + error + "\"";
            }
          }
          return rmFuture["return"](result);
        }));
        rmFuture.wait();
        writeFileFuture.resolve(Meteor.bindEnvironment(function(err, result) {
          var tuplebuildCommand;
          if (err) {
            tuplebuildErrors.push(err);
            return tuplebuildFuture["return"](result);
          } else {
            tuplebuildCommand = "cat " + txtFilename + " > " + tupleFilename;
            if (config.isSSH) {
              tuplebuildCommand = config.wrapCommand(tuplebuildCommand);
            }
            return Process.exec(tuplebuildCommand, Meteor.bindEnvironment(function(err, stdout, stderr) {
              var code, error;
              result = stdout.trim();
              error = stderr.trim();
              code = err ? err.code : 0;
              if (error) {
                tuplebuildErrors.push(error);
              }
              if (code === 0) {
                share.Tuples.update(set._id, {
                  $set: {
                    isOutputStale: false
                  }
                });
              } else {
                if (!error) {
                  throw "tuplebuild: code is \"" + code + "\" while stderr is \"" + error + "\"";
                }
              }
              return tuplebuildFuture["return"](result);
            }));
          }
        }));
        return tuplebuildFutures.push(tuplebuildFuture);
      }
    }
  });
  Future.wait(tuplebuildFutures);
  if (tuplebuildErrors.length) {
    callback("", tuplebuildErrors.join("\n"), 255);
    return;
  }
  if (!query.isInputStale && !isTupleStale) {
    callback("", "", 0);
    return;
  }
  command = query.inputCommand(config, profile);
  return Process.exec(command, Meteor.bindEnvironment(function(err, stdout, stderr) {
    var code, error, result;
    result = stdout.trim();
    error = stderr.trim();
    code = err ? err.code : 0;
    if (error.indexOf("Rejected") !== -1) {
      error = null;
    }
    return callback(result, error, code);
  }));
};

loadQueryResult = function(query, config, profile, callback) {
  return executeQuery(query, config, profile, Meteor.bindEnvironment(function(result, error, code) {
    var command;
    if (error) {
      return callback(result, error, code);
    }
    command = query.outputCommand(config, profile);
    return Process.exec(command, Meteor.bindEnvironment(function(err, stdout, stderr) {
      result = stdout.trim();
      error = stderr.trim();
      code = err ? err.code : 0;
      if (error.indexOf("Error opening file") !== -1) {
        query.isInputStale = true;
        return loadQueryResult(query, config, profile, callback);
      } else {
        return callback(result, error, code);
      }
    }));
  }));
};

})();

//# sourceMappingURL=execution.coffee.js.map
