(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/execution.coffee                                             //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Future, Process, executeQuery, fs, loadQueryResult, writeFile;     // 1
fs = Npm.require("fs");                                                // 1
Process = Npm.require("child_process");                                // 2
Future = Npm.require('fibers/future');                                 // 3
writeFile = Future.wrap(fs.writeFile);                                 // 4
share.Queries.after.update(function (userId, query, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, share.inputFields).length) {          // 7
    return share.Queries.update(query._id, {                           // 13
      $set: {                                                          // 8
        isInputStale: true                                             // 8
      }                                                                // 8
    });                                                                // 8
  }                                                                    // 18
});                                                                    // 6
share.Queries.after.update(function (userId, query, fieldNames, modifier, options) {
  var callback, config, profile;                                       // 11
                                                                       //
  if (!query.isOutputStale) {                                          // 11
    return;                                                            // 12
  }                                                                    // 25
                                                                       //
  config = share.Configs.findOne({}, {                                 // 13
    transform: share.Transformations.config                            // 13
  });                                                                  // 13
  query = share.Transformations.query(query);                          // 14
                                                                       //
  if (!query.inputOptions(config)) {                                   // 15
    share.Queries.update(query._id, {                                  // 16
      $set: {                                                          // 16
        isInputStale: false,                                           // 16
        isOutputStale: false                                           // 16
      }                                                                // 16
    });                                                                // 16
    return;                                                            // 17
  }                                                                    // 38
                                                                       //
  profile = Meteor.users.findOne(query.ownerId).profile;               // 18
                                                                       //
  callback = function (result, error, code) {                          // 19
    return share.Queries.update(query._id, {                           // 41
      $set: {                                                          // 20
        result: result,                                                // 20
        error: error,                                                  // 20
        code: code,                                                    // 20
        isInputStale: false,                                           // 20
        isOutputStale: false                                           // 20
      }                                                                // 20
    });                                                                // 20
  };                                                                   // 19
                                                                       //
  return loadQueryResult(query, config, profile, callback);            // 51
});                                                                    // 10
Meteor.methods({                                                       // 23
  checkConnection: function () {                                       // 24
    var callback, config, fut, profile, query, queryId;                // 25
                                                                       //
    if (!this.userId) {                                                // 25
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 59
                                                                       //
    queryId = share.Queries.insert({                                   // 27
      interface: "cmd",                                                // 28
      cmd: "--protocol=0-255",                                         // 29
      isQuick: true                                                    // 30
    });                                                                // 27
    config = share.Configs.findOne({}, {                               // 32
      transform: share.Transformations.config                          // 32
    });                                                                // 32
    profile = Meteor.users.findOne(this.userId).profile;               // 33
    query = share.Queries.findOne(queryId, {                           // 34
      transform: share.Transformations.query                           // 34
    });                                                                // 34
    this.unblock();                                                    // 35
    fut = new Future();                                                // 36
                                                                       //
    callback = function (result, error, code) {                        // 37
      if (error) {                                                     // 38
        return fut.throw(new Meteor.Error(500, error));                // 76
      } else {                                                         // 38
        return fut.return(result);                                     // 78
      }                                                                // 79
    };                                                                 // 37
                                                                       //
    executeQuery(query, config, profile, callback);                    // 42
    return fut.wait();                                                 // 82
  },                                                                   // 24
  // quick queries are cleaned up automatically                        // 84
  loadDataForCSV: function (queryId) {                                 // 45
    var callback, config, fut, query;                                  // 46
    check(queryId, Match.App.QueryId);                                 // 46
                                                                       //
    if (!this.userId) {                                                // 47
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 90
                                                                       //
    config = share.Configs.findOne({}, {                               // 49
      transform: share.Transformations.config                          // 49
    });                                                                // 49
    query = share.Queries.findOne(queryId, {                           // 50
      transform: share.Transformations.query                           // 50
    });                                                                // 50
                                                                       //
    if (this.userId !== query.ownerId) {                               // 51
      throw new Match.Error("Operation not allowed for non-owners");   // 52
    }                                                                  // 99
                                                                       //
    this.unblock();                                                    // 53
    fut = new Future();                                                // 54
                                                                       //
    callback = function (result, error, code) {                        // 55
      if (error) {                                                     // 56
        return fut.throw(new Error(error));                            // 104
      } else {                                                         // 56
        return fut.return(result);                                     // 106
      }                                                                // 107
    };                                                                 // 55
                                                                       //
    query.startRecNum = 1;                                             // 60
    loadQueryResult(query, config, {                                   // 61
      numRecs: 0                                                       // 61
    }, callback);                                                      // 61
    return fut.wait();                                                 // 113
  },                                                                   // 24
  getRwfToken: function (queryId) {                                    // 63
    var callback, config, fut, profile, query, token;                  // 64
    check(queryId, Match.App.QueryId);                                 // 64
                                                                       //
    if (!this.userId) {                                                // 65
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 120
                                                                       //
    config = share.Configs.findOne({}, {                               // 67
      transform: share.Transformations.config                          // 67
    });                                                                // 67
    profile = Meteor.users.findOne(this.userId).profile;               // 68
    query = share.Queries.findOne(queryId, {                           // 69
      transform: share.Transformations.query                           // 69
    });                                                                // 69
                                                                       //
    if (this.userId !== query.ownerId) {                               // 70
      throw new Match.Error("Operation not allowed for non-owners");   // 71
    }                                                                  // 130
                                                                       //
    this.unblock();                                                    // 72
    token = Random.id();                                               // 73
    fut = new Future();                                                // 74
                                                                       //
    callback = function (result, error, code) {                        // 75
      var copyCommand;                                                 // 76
                                                                       //
      if (error) {                                                     // 76
        return fut.throw(new Error(error));                            // 137
      } else {                                                         // 76
        if (config.isSSH) {                                            // 79
          copyCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + config.user + "@" + config.host + ":" + config.dataTempdir + "/" + query._id + ".rwf " + "/tmp" + "/" + token + ".rwf";
        } else {                                                       // 79
          copyCommand = "cp " + config.dataTempdir + "/" + query._id + ".rwf " + "/tmp" + "/" + token + ".rwf";
        }                                                              // 143
                                                                       //
        return Process.exec(copyCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
          result = stdout.trim();                                      // 84
          error = stderr.trim();                                       // 85
          code = err ? err.code : 0;                                   // 86
                                                                       //
          if (error) {                                                 // 87
            return fut.throw(new Error(error));                        // 149
          } else {                                                     // 87
            return fut.return(token);                                  // 151
          }                                                            // 152
        }));                                                           // 83
      }                                                                // 154
    };                                                                 // 75
                                                                       //
    executeQuery(query, config, profile, callback);                    // 92
    return fut.wait();                                                 // 157
  }                                                                    // 63
});                                                                    // 24
                                                                       //
executeQuery = function (query, config, profile, callback) {           // 95
  var command, isIpsetStale, isTupleStale, rwsetbuildErrors, rwsetbuildFutures, tuplebuildErrors, tuplebuildFutures;
  rwsetbuildErrors = [];                                               // 96
  rwsetbuildFutures = [];                                              // 97
  isIpsetStale = false;                                                // 98
                                                                       //
  _.each(["dipSet", "sipSet", "anySet"], function (field) {            // 99
    var rmCommand, rmFuture, rwsFilename, rwsetbuildFuture, scpCommand, scpFuture, set, txtFilename, writeFileFuture;
                                                                       //
    if (query[field + "Enabled"] && query[field]) {                    // 100
      set = share.IPSets.findOne(query[field]);                        // 101
                                                                       //
      if (set.isOutputStale) {                                         // 102
        isIpsetStale = true;                                           // 103
        rwsetbuildFuture = new Future();                               // 104
        txtFilename = "/tmp" + "/" + set._id + ".txt";                 // 105
        rwsFilename = config.dataTempdir + "/" + set._id + ".rws";     // 106
        writeFileFuture = writeFile(txtFilename, set.contents);        // 107
                                                                       //
        if (config.isSSH) {                                            // 108
          scpCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + txtFilename + " " + config.user + "@" + config.host + ":" + txtFilename;
          scpFuture = new Future();                                    // 110
          Process.exec(scpCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
            var code, error, result;                                   // 112
            result = stdout.trim();                                    // 112
            error = stderr.trim();                                     // 113
            code = err ? err.code : 0;                                 // 114
                                                                       //
            if (error) {                                               // 115
              rwsetbuildErrors.push(error);                            // 116
            }                                                          // 186
                                                                       //
            if (code === 0) {} else {                                  // 117
              if (!error) {                                            // 119
                throw "scp: code is \"" + code + "\" while stderr is \"" + error + "\"";
              }                                                        // 117
            }                                                          // 193
                                                                       //
            return scpFuture.return(result);                           // 194
          }));                                                         // 111
          scpFuture.wait();                                            // 123
        }                                                              // 197
                                                                       //
        rmCommand = "rm -f " + rwsFilename;                            // 124
                                                                       //
        if (config.isSSH) {                                            // 125
          rmCommand = config.wrapCommand(rmCommand);                   // 126
        }                                                              // 201
                                                                       //
        rmFuture = new Future();                                       // 127
        Process.exec(rmCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
          var code, error, result;                                     // 129
          result = stdout.trim();                                      // 129
          error = stderr.trim();                                       // 130
          code = err ? err.code : 0;                                   // 131
                                                                       //
          if (error) {                                                 // 132
            rwsetbuildErrors.push(error);                              // 133
          }                                                            // 210
                                                                       //
          if (code === 0) {} else {                                    // 134
            if (!error) {                                              // 136
              throw "rm: code is \"" + code + "\" while stderr is \"" + error + "\"";
            }                                                          // 134
          }                                                            // 217
                                                                       //
          return rmFuture.return(result);                              // 218
        }));                                                           // 128
        rmFuture.wait();                                               // 140
        writeFileFuture.resolve(Meteor.bindEnvironment(function (err, result) {
          var rwsetbuildCommand;                                       // 142
                                                                       //
          if (err) {                                                   // 142
            rwsetbuildErrors.push(err);                                // 143
            return rwsetbuildFuture.return(result);                    // 225
          } else {                                                     // 142
            rwsetbuildCommand = "rwsetbuild " + txtFilename + " " + rwsFilename;
                                                                       //
            if (config.isSSH) {                                        // 147
              rwsetbuildCommand = config.wrapCommand(rwsetbuildCommand);
            }                                                          // 230
                                                                       //
            return Process.exec(rwsetbuildCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
              var code, error;                                         // 150
              result = stdout.trim();                                  // 150
              error = stderr.trim();                                   // 151
              code = err ? err.code : 0;                               // 152
                                                                       //
              if (error) {                                             // 153
                rwsetbuildErrors.push(error);                          // 154
              }                                                        // 238
                                                                       //
              if (code === 0) {                                        // 155
                share.IPSets.update(set._id, {                         // 156
                  $set: {                                              // 156
                    isOutputStale: false                               // 156
                  }                                                    // 156
                });                                                    // 156
              } else {                                                 // 155
                if (!error) {                                          // 158
                  throw "rwsetbuild: code is \"" + code + "\" while stderr is \"" + error + "\"";
                }                                                      // 155
              }                                                        // 249
                                                                       //
              return rwsetbuildFuture.return(result);                  // 250
            }));                                                       // 149
          }                                                            // 252
        }));                                                           // 141
        return rwsetbuildFutures.push(rwsetbuildFuture);               // 254
      }                                                                // 100
    }                                                                  // 256
  });                                                                  // 99
                                                                       //
  Future.wait(rwsetbuildFutures);                                      // 165
                                                                       //
  if (rwsetbuildErrors.length) {                                       // 167
    callback("", rwsetbuildErrors.join("\n"), 255);                    // 168
    return;                                                            // 169
  }                                                                    // 262
                                                                       //
  if (!query.isInputStale && !isIpsetStale) {                          // 171
    callback("", "", 0);                                               // 172
    return;                                                            // 173
  }                                                                    // 266
                                                                       //
  tuplebuildErrors = [];                                               // 175
  tuplebuildFutures = [];                                              // 176
  isTupleStale = false;                                                // 177
                                                                       //
  _.each(["tupleFile"], function (field) {                             // 178
    var rmCommand, rmFuture, scpCommand, scpFuture, set, tupleFilename, tuplebuildFuture, txtFilename, writeFileFuture;
                                                                       //
    if (query[field + "Enabled"] && query[field]) {                    // 179
      set = share.Tuples.findOne(query[field]);                        // 180
                                                                       //
      if (set.isOutputStale) {                                         // 181
        isTupleStale = true;                                           // 182
        tuplebuildFuture = new Future();                               // 183
        txtFilename = "/tmp" + "/" + set._id + ".txt";                 // 184
        tupleFilename = config.dataTempdir + "/" + set._id + ".tuple";
        writeFileFuture = writeFile(txtFilename, set.contents);        // 186
                                                                       //
        if (config.isSSH) {                                            // 187
          scpCommand = "scp " + config.getSSHOptions() + " -P " + config.port + " " + txtFilename + " " + config.user + "@" + config.host + ":" + txtFilename;
          scpFuture = new Future();                                    // 189
          Process.exec(scpCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
            var code, error, result;                                   // 191
            result = stdout.trim();                                    // 191
            error = stderr.trim();                                     // 192
            code = err ? err.code : 0;                                 // 193
                                                                       //
            if (error) {                                               // 194
              tuplebuildErrors.push(error);                            // 195
            }                                                          // 290
                                                                       //
            if (code === 0) {} else {                                  // 196
              if (!error) {                                            // 198
                throw "scp: code is \"" + code + "\" while stderr is \"" + error + "\"";
              }                                                        // 196
            }                                                          // 297
                                                                       //
            return scpFuture.return(result);                           // 298
          }));                                                         // 190
          scpFuture.wait();                                            // 202
        }                                                              // 301
                                                                       //
        rmCommand = "rm -f " + tupleFilename;                          // 203
                                                                       //
        if (config.isSSH) {                                            // 204
          rmCommand = config.wrapCommand(rmCommand);                   // 205
        }                                                              // 305
                                                                       //
        rmFuture = new Future();                                       // 206
        Process.exec(rmCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
          var code, error, result;                                     // 208
          result = stdout.trim();                                      // 208
          error = stderr.trim();                                       // 209
          code = err ? err.code : 0;                                   // 210
                                                                       //
          if (error) {                                                 // 211
            tuplebuildErrors.push(error);                              // 212
          }                                                            // 314
                                                                       //
          if (code === 0) {} else {                                    // 213
            if (!error) {                                              // 215
              throw "rm: code is \"" + code + "\" while stderr is \"" + error + "\"";
            }                                                          // 213
          }                                                            // 321
                                                                       //
          return rmFuture.return(result);                              // 322
        }));                                                           // 207
        rmFuture.wait();                                               // 219
        writeFileFuture.resolve(Meteor.bindEnvironment(function (err, result) {
          var tuplebuildCommand;                                       // 221
                                                                       //
          if (err) {                                                   // 221
            tuplebuildErrors.push(err);                                // 222
            return tuplebuildFuture.return(result);                    // 329
          } else {                                                     // 221
            tuplebuildCommand = "cat " + txtFilename + " > " + tupleFilename;
                                                                       //
            if (config.isSSH) {                                        // 226
              tuplebuildCommand = config.wrapCommand(tuplebuildCommand);
            }                                                          // 334
                                                                       //
            return Process.exec(tuplebuildCommand, Meteor.bindEnvironment(function (err, stdout, stderr) {
              var code, error;                                         // 229
              result = stdout.trim();                                  // 229
              error = stderr.trim();                                   // 230
              code = err ? err.code : 0;                               // 231
                                                                       //
              if (error) {                                             // 232
                tuplebuildErrors.push(error);                          // 233
              }                                                        // 342
                                                                       //
              if (code === 0) {                                        // 234
                share.Tuples.update(set._id, {                         // 235
                  $set: {                                              // 235
                    isOutputStale: false                               // 235
                  }                                                    // 235
                });                                                    // 235
              } else {                                                 // 234
                if (!error) {                                          // 237
                  throw "tuplebuild: code is \"" + code + "\" while stderr is \"" + error + "\"";
                }                                                      // 234
              }                                                        // 353
                                                                       //
              return tuplebuildFuture.return(result);                  // 354
            }));                                                       // 228
          }                                                            // 356
        }));                                                           // 220
        return tuplebuildFutures.push(tuplebuildFuture);               // 358
      }                                                                // 179
    }                                                                  // 360
  });                                                                  // 178
                                                                       //
  Future.wait(tuplebuildFutures);                                      // 244
                                                                       //
  if (tuplebuildErrors.length) {                                       // 246
    callback("", tuplebuildErrors.join("\n"), 255);                    // 247
    return;                                                            // 248
  }                                                                    // 366
                                                                       //
  if (!query.isInputStale && !isTupleStale) {                          // 250
    callback("", "", 0);                                               // 251
    return;                                                            // 252
  }                                                                    // 370
                                                                       //
  command = query.inputCommand(config, profile);                       // 254
  return Process.exec(command, Meteor.bindEnvironment(function (err, stdout, stderr) {
    var code, error, result;                                           // 256
    result = stdout.trim();                                            // 256
    error = stderr.trim();                                             // 257
    code = err ? err.code : 0;                                         // 258
                                                                       //
    if (error.indexOf("Rejected") !== -1) {                            // 259
      error = null;                                                    // 260
    }                                                                  // 379
                                                                       //
    return callback(result, error, code);                              // 380
  }));                                                                 // 255
};                                                                     // 95
                                                                       //
loadQueryResult = function (query, config, profile, callback) {        // 264
  return executeQuery(query, config, profile, Meteor.bindEnvironment(function (result, error, code) {
    var command;                                                       // 266
                                                                       //
    if (error) {                                                       // 266
      return callback(result, error, code);                            // 267
    }                                                                  // 389
                                                                       //
    command = query.outputCommand(config, profile);                    // 268
    return Process.exec(command, Meteor.bindEnvironment(function (err, stdout, stderr) {
      result = stdout.trim();                                          // 270
      error = stderr.trim();                                           // 271
      code = err ? err.code : 0;                                       // 272
                                                                       //
      if (error.indexOf("Error opening file") !== -1) {                // 273
        query.isInputStale = true;                                     // 274
        return loadQueryResult(query, config, profile, callback);      // 397
      } else {                                                         // 273
        return callback(result, error, code);                          // 399
      }                                                                // 400
    }));                                                               // 269
  }));                                                                 // 265
};                                                                     // 264
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/execution.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2V4ZWN1dGlvbi5jb2ZmZWUiXSwibmFtZXMiOlsiRnV0dXJlIiwiUHJvY2VzcyIsImV4ZWN1dGVRdWVyeSIsImZzIiwibG9hZFF1ZXJ5UmVzdWx0Iiwid3JpdGVGaWxlIiwiTnBtIiwicmVxdWlyZSIsIndyYXAiLCJzaGFyZSIsIlF1ZXJpZXMiLCJhZnRlciIsInVwZGF0ZSIsInVzZXJJZCIsInF1ZXJ5IiwiZmllbGROYW1lcyIsIm1vZGlmaWVyIiwib3B0aW9ucyIsIl8iLCJpbnRlcnNlY3Rpb24iLCJpbnB1dEZpZWxkcyIsImxlbmd0aCIsIl9pZCIsIiRzZXQiLCJpc0lucHV0U3RhbGUiLCJjYWxsYmFjayIsImNvbmZpZyIsInByb2ZpbGUiLCJpc091dHB1dFN0YWxlIiwiQ29uZmlncyIsImZpbmRPbmUiLCJ0cmFuc2Zvcm0iLCJUcmFuc2Zvcm1hdGlvbnMiLCJpbnB1dE9wdGlvbnMiLCJNZXRlb3IiLCJ1c2VycyIsIm93bmVySWQiLCJyZXN1bHQiLCJlcnJvciIsImNvZGUiLCJtZXRob2RzIiwiY2hlY2tDb25uZWN0aW9uIiwiZnV0IiwicXVlcnlJZCIsIk1hdGNoIiwiRXJyb3IiLCJpbnNlcnQiLCJpbnRlcmZhY2UiLCJjbWQiLCJpc1F1aWNrIiwidW5ibG9jayIsInRocm93IiwicmV0dXJuIiwid2FpdCIsImxvYWREYXRhRm9yQ1NWIiwiY2hlY2siLCJBcHAiLCJRdWVyeUlkIiwic3RhcnRSZWNOdW0iLCJudW1SZWNzIiwiZ2V0UndmVG9rZW4iLCJ0b2tlbiIsIlJhbmRvbSIsImlkIiwiY29weUNvbW1hbmQiLCJpc1NTSCIsImdldFNTSE9wdGlvbnMiLCJwb3J0IiwidXNlciIsImhvc3QiLCJkYXRhVGVtcGRpciIsImV4ZWMiLCJiaW5kRW52aXJvbm1lbnQiLCJlcnIiLCJzdGRvdXQiLCJzdGRlcnIiLCJ0cmltIiwiY29tbWFuZCIsImlzSXBzZXRTdGFsZSIsImlzVHVwbGVTdGFsZSIsInJ3c2V0YnVpbGRFcnJvcnMiLCJyd3NldGJ1aWxkRnV0dXJlcyIsInR1cGxlYnVpbGRFcnJvcnMiLCJ0dXBsZWJ1aWxkRnV0dXJlcyIsImVhY2giLCJmaWVsZCIsInJtQ29tbWFuZCIsInJtRnV0dXJlIiwicndzRmlsZW5hbWUiLCJyd3NldGJ1aWxkRnV0dXJlIiwic2NwQ29tbWFuZCIsInNjcEZ1dHVyZSIsInNldCIsInR4dEZpbGVuYW1lIiwid3JpdGVGaWxlRnV0dXJlIiwiSVBTZXRzIiwiY29udGVudHMiLCJwdXNoIiwid3JhcENvbW1hbmQiLCJyZXNvbHZlIiwicndzZXRidWlsZENvbW1hbmQiLCJqb2luIiwidHVwbGVGaWxlbmFtZSIsInR1cGxlYnVpbGRGdXR1cmUiLCJUdXBsZXMiLCJ0dXBsZWJ1aWxkQ29tbWFuZCIsImlucHV0Q29tbWFuZCIsImluZGV4T2YiLCJvdXRwdXRDb21tYW5kIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxNQUFBLEVBQUFDLE9BQUEsRUFBQUMsWUFBQSxFQUFBQyxFQUFBLEVBQUFDLGVBQUEsRUFBQUMsU0FBQTtBQUFBRixLQUFLRyxJQUFJQyxPQUFKLENBQVksSUFBWixDQUFMO0FBQ0FOLFVBQVVLLElBQUlDLE9BQUosQ0FBWSxlQUFaLENBQVY7QUFDQVAsU0FBU00sSUFBSUMsT0FBSixDQUFZLGVBQVosQ0FBVDtBQUNBRixZQUFZTCxPQUFPUSxJQUFQLENBQVlMLEdBQUdFLFNBQWYsQ0FBWjtBQUVBSSxNQUFNQyxPQUFOLENBQWNDLEtBQWQsQ0FBb0JDLE1BQXBCLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFnQkMsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUN6QixNQUFHQyxFQUFFQyxZQUFGLENBQWVKLFVBQWYsRUFBMkJOLE1BQU1XLFdBQWpDLEVBQThDQyxNQUFqRDtBQU1FLFdBTEFaLE1BQU1DLE9BQU4sQ0FBY0UsTUFBZCxDQUFxQkUsTUFBTVEsR0FBM0IsRUFBZ0M7QUFBQ0MsWUFBTTtBQUFDQyxzQkFBYztBQUFmO0FBQVAs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QUd2QyxLQUFIO0FBQ0UsYUFBT2IsU0FBU1ksTUFBVCxFQUFpQkMsS0FBakIsRUFBd0JDLElBQXhCLENBQVA7QUEwSEQ7O0FBekhEc0MsY0FBVS9ELE1BQU04RixhQUFOLENBQW9CbEYsTUFBcEIsRUFBNEJDLE9BQTVCLENBQVY7QUEySEEsV0ExSEExQixRQUFRc0UsSUFBUixDQUFhTSxPQUFiLEVBQXNCM0MsT0FBT3NDLGVBQVAsQ0FBdUIsVUFBQ0MsR0FBRCxFQUFNQyxNQUFOLEVBQWNDLE1BQWQ7QUFDM0N0QyxlQUFTcUMsT0FBT0UsSUFBUCxFQUFUO0FBQ0F0QyxjQUFRcUMsT0FBT0MsSUFBUCxFQUFSO0FBQ0FyQyxhQUFVa0MsTUFBU0EsSUFBSWxDLElBQWIsR0FBdUIsQ0FBakM7O0FBQ0EsVUFBR0QsTUFBTXFFLE9BQU4sQ0FBYyxvQkFBZCxNQUF5QyxDQUFDLENBQTdDO0FBQ0U3RixjQUFNVSxZQUFOLEdBQXFCLElBQXJCO0FBMkhBLGVBMUhBcEIsZ0JBQWdCVSxLQUFoQixFQUF1QlksTUFBdkIsRUFBK0JDLE9BQS9CLEVBQXdDRixRQUF4QyxDQTBIQTtBQTVIRjtBQThIRSxlQTFIQUEsU0FBU1ksTUFBVCxFQUFpQkMsS0FBakIsRUFBd0JDLElBQXhCLENBMEhBO0FBQ0Q7QUFuSW1CLE1BQXRCLENBMEhBO0FBOUhtQyxJQUFyQyxDQXdIQTtBQXpIZ0IsQ0FBbEIsNEUiLCJmaWxlIjoiL3NlcnZlci9leGVjdXRpb24uY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsiZnMgPSBOcG0ucmVxdWlyZShcImZzXCIpXG5Qcm9jZXNzID0gTnBtLnJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpXG5GdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpXG53cml0ZUZpbGUgPSBGdXR1cmUud3JhcChmcy53cml0ZUZpbGUpXG5cbnNoYXJlLlF1ZXJpZXMuYWZ0ZXIudXBkYXRlICh1c2VySWQsIHF1ZXJ5LCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgaWYgXy5pbnRlcnNlY3Rpb24oZmllbGROYW1lcywgc2hhcmUuaW5wdXRGaWVsZHMpLmxlbmd0aFxuICAgIHNoYXJlLlF1ZXJpZXMudXBkYXRlKHF1ZXJ5Ll9pZCwgeyRzZXQ6IHtpc0lucHV0U3RhbGU6IHRydWV9fSlcblxuc2hhcmUuUXVlcmllcy5hZnRlci51cGRhdGUgKHVzZXJJZCwgcXVlcnksIGZpZWxkTmFtZXMsIG1vZGlmaWVyLCBvcHRpb25zKSAtPlxuICBpZiBub3QgcXVlcnkuaXNPdXRwdXRTdGFsZVxuICAgIHJldHVyblxuICBjb25maWcgPSBzaGFyZS5Db25maWdzLmZpbmRPbmUoe30sIHt0cmFuc2Zvcm06IHNoYXJlLlRyYW5zZm9ybWF0aW9ucy5jb25maWd9KVxuICBxdWVyeSA9IHNoYXJlLlRyYW5zZm9ybWF0aW9ucy5xdWVyeShxdWVyeSlcbiAgaWYgbm90IHF1ZXJ5LmlucHV0T3B0aW9ucyhjb25maWcpXG4gICAgc2hhcmUuUXVlcmllcy51cGRhdGUocXVlcnkuX2lkLCB7JHNldDoge2lzSW5wdXRTdGFsZTogZmFsc2UsIGlzT3V0cHV0U3RhbGU6IGZhbHNlfX0pXG4gICAgcmV0dXJuXG4gIHByb2ZpbGUgPSBNZXRlb3IudXNlcnMuZmluZE9uZShxdWVyeS5vd25lcklkKS5wcm9maWxlXG4gIGNhbGxiYWNrID0gKHJlc3VsdCwgZXJyb3IsIGNvZGUpIC0+XG4gICAgc2hhcmUuUXVlcmllcy51cGRhdGUocXVlcnkuX2lkLCB7JHNldDoge3Jlc3VsdDogcmVzdWx0LCBlcnJvcjogZXJyb3IsIGNvZGU6IGNvZGUsIGlzSW5wdXRTdGFsZTogZmFsc2UsIGlzT3V0cHV0U3RhbGU6IGZhbHNlfX0pXG4gIGxvYWRRdWVyeVJlc3VsdChxdWVyeSwgY29uZmlnLCBwcm9maWxlLCBjYWxsYmFjaylcblxuTWV0ZW9yLm1ldGhvZHNcbiAgY2hlY2tDb25uZWN0aW9uOiAtPlxuICAgIHVubGVzcyBAdXNlcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIHVuYXV0aG9yaXplZCB1c2Vyc1wiKVxuICAgIHF1ZXJ5SWQgPSBzaGFyZS5RdWVyaWVzLmluc2VydCh7XG4gICAgICBpbnRlcmZhY2U6IFwiY21kXCJcbiAgICAgIGNtZDogXCItLXByb3RvY29sPTAtMjU1XCJcbiAgICAgIGlzUXVpY2s6IHRydWVcbiAgICB9KVxuICAgIGNvbmZpZyA9IHNoYXJlLkNvbmZpZ3MuZmluZE9uZSh7fSwge3RyYW5zZm9ybTogc2hhcmUuVHJhbnNmb3JtYXRpb25zLmNvbmZpZ30pXG4gICAgcHJvZmlsZSA9IE1ldGVvci51c2Vycy5maW5kT25lKEB1c2VySWQpLnByb2ZpbGVcbiAgICBxdWVyeSA9IHNoYXJlLlF1ZXJpZXMuZmluZE9uZShxdWVyeUlkLCB7dHJhbnNmb3JtOiBzaGFyZS5UcmFuc2Zvcm1hdGlvbnMucXVlcnl9KVxuICAgIEB1bmJsb2NrKClcbiAgICBmdXQgPSBuZXcgRnV0dXJlKClcbiAgICBjYWxsYmFjayA9IChyZXN1bHQsIGVycm9yLCBjb2RlKSAtPlxuICAgICAgaWYgZXJyb3JcbiAgICAgICAgZnV0LnRocm93KG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBlcnJvcikpXG4gICAgICBlbHNlXG4gICAgICAgIGZ1dC5yZXR1cm4ocmVzdWx0KVxuICAgIGV4ZWN1dGVRdWVyeShxdWVyeSwgY29uZmlnLCBwcm9maWxlLCBjYWxsYmFjaylcbiAgICBmdXQud2FpdCgpXG4gICAgIyBxdWljayBxdWVyaWVzIGFyZSBjbGVhbmVkIHVwIGF1dG9tYXRpY2FsbHlcbiAgbG9hZERhdGFGb3JDU1Y6IChxdWVyeUlkKSAtPlxuICAgIGNoZWNrKHF1ZXJ5SWQsIE1hdGNoLkFwcC5RdWVyeUlkKVxuICAgIHVubGVzcyBAdXNlcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIHVuYXV0aG9yaXplZCB1c2Vyc1wiKVxuICAgIGNvbmZpZyA9IHNoYXJlLkNvbmZpZ3MuZmluZE9uZSh7fSwge3RyYW5zZm9ybTogc2hhcmUuVHJhbnNmb3JtYXRpb25zLmNvbmZpZ30pXG4gICAgcXVlcnkgPSBzaGFyZS5RdWVyaWVzLmZpbmRPbmUocXVlcnlJZCwge3RyYW5zZm9ybTogc2hhcmUuVHJhbnNmb3JtYXRpb25zLnF1ZXJ5fSlcbiAgICB1bmxlc3MgQHVzZXJJZCBpcyBxdWVyeS5vd25lcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIG5vbi1vd25lcnNcIilcbiAgICBAdW5ibG9jaygpXG4gICAgZnV0ID0gbmV3IEZ1dHVyZSgpXG4gICAgY2FsbGJhY2sgPSAocmVzdWx0LCBlcnJvciwgY29kZSkgLT5cbiAgICAgIGlmIGVycm9yXG4gICAgICAgIGZ1dC50aHJvdyhuZXcgRXJyb3IoZXJyb3IpKVxuICAgICAgZWxzZVxuICAgICAgICBmdXQucmV0dXJuKHJlc3VsdClcbiAgICBxdWVyeS5zdGFydFJlY051bSA9IDFcbiAgICBsb2FkUXVlcnlSZXN1bHQocXVlcnksIGNvbmZpZywge251bVJlY3M6IDB9LCBjYWxsYmFjaylcbiAgICBmdXQud2FpdCgpXG4gIGdldFJ3ZlRva2VuOiAocXVlcnlJZCkgLT5cbiAgICBjaGVjayhxdWVyeUlkLCBNYXRjaC5BcHAuUXVlcnlJZClcbiAgICB1bmxlc3MgQHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICBjb25maWcgPSBzaGFyZS5Db25maWdzLmZpbmRPbmUoe30sIHt0cmFuc2Zvcm06IHNoYXJlLlRyYW5zZm9ybWF0aW9ucy5jb25maWd9KVxuICAgIHByb2ZpbGUgPSBNZXRlb3IudXNlcnMuZmluZE9uZShAdXNlcklkKS5wcm9maWxlXG4gICAgcXVlcnkgPSBzaGFyZS5RdWVyaWVzLmZpbmRPbmUocXVlcnlJZCwge3RyYW5zZm9ybTogc2hhcmUuVHJhbnNmb3JtYXRpb25zLnF1ZXJ5fSlcbiAgICB1bmxlc3MgQHVzZXJJZCBpcyBxdWVyeS5vd25lcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIG5vbi1vd25lcnNcIilcbiAgICBAdW5ibG9jaygpXG4gICAgdG9rZW4gPSBSYW5kb20uaWQoKVxuICAgIGZ1dCA9IG5ldyBGdXR1cmUoKVxuICAgIGNhbGxiYWNrID0gKHJlc3VsdCwgZXJyb3IsIGNvZGUpIC0+XG4gICAgICBpZiBlcnJvclxuICAgICAgICBmdXQudGhyb3cobmV3IEVycm9yKGVycm9yKSlcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgY29uZmlnLmlzU1NIXG4gICAgICAgICAgY29weUNvbW1hbmQgPSBcInNjcCBcIiArIGNvbmZpZy5nZXRTU0hPcHRpb25zKCkgKyBcIiAtUCBcIiArIGNvbmZpZy5wb3J0ICsgXCIgXCIgKyBjb25maWcudXNlciArIFwiQFwiICsgY29uZmlnLmhvc3QgKyBcIjpcIiArIGNvbmZpZy5kYXRhVGVtcGRpciArIFwiL1wiICsgcXVlcnkuX2lkICsgXCIucndmIFwiICsgXCIvdG1wXCIgKyBcIi9cIiArIHRva2VuICsgXCIucndmXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvcHlDb21tYW5kID0gXCJjcCBcIiArIGNvbmZpZy5kYXRhVGVtcGRpciArIFwiL1wiICsgcXVlcnkuX2lkICsgXCIucndmIFwiICsgXCIvdG1wXCIgKyBcIi9cIiArIHRva2VuICsgXCIucndmXCJcbiAgICAgICAgUHJvY2Vzcy5leGVjKGNvcHlDb21tYW5kLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChlcnIsIHN0ZG91dCwgc3RkZXJyKSAtPlxuICAgICAgICAgIHJlc3VsdCA9IHN0ZG91dC50cmltKClcbiAgICAgICAgICBlcnJvciA9IHN0ZGVyci50cmltKClcbiAgICAgICAgICBjb2RlID0gaWYgZXJyIHRoZW4gZXJyLmNvZGUgZWxzZSAwXG4gICAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICAgIGZ1dC50aHJvdyhuZXcgRXJyb3IoZXJyb3IpKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGZ1dC5yZXR1cm4odG9rZW4pXG4gICAgICAgICkpXG4gICAgZXhlY3V0ZVF1ZXJ5KHF1ZXJ5LCBjb25maWcsIHByb2ZpbGUsIGNhbGxiYWNrKVxuICAgIGZ1dC53YWl0KClcblxuZXhlY3V0ZVF1ZXJ5ID0gKHF1ZXJ5LCBjb25maWcsIHByb2ZpbGUsIGNhbGxiYWNrKSAtPlxuICByd3NldGJ1aWxkRXJyb3JzID0gW11cbiAgcndzZXRidWlsZEZ1dHVyZXMgPSBbXVxuICBpc0lwc2V0U3RhbGUgPSBmYWxzZVxuICBfLmVhY2goW1wiZGlwU2V0XCIsIFwic2lwU2V0XCIsIFwiYW55U2V0XCJdLCAoZmllbGQpIC0+XG4gICAgaWYgcXVlcnlbZmllbGQgKyBcIkVuYWJsZWRcIl0gYW5kIHF1ZXJ5W2ZpZWxkXVxuICAgICAgc2V0ID0gc2hhcmUuSVBTZXRzLmZpbmRPbmUocXVlcnlbZmllbGRdKVxuICAgICAgaWYgc2V0LmlzT3V0cHV0U3RhbGVcbiAgICAgICAgaXNJcHNldFN0YWxlID0gdHJ1ZVxuICAgICAgICByd3NldGJ1aWxkRnV0dXJlID0gbmV3IEZ1dHVyZSgpXG4gICAgICAgIHR4dEZpbGVuYW1lID0gXCIvdG1wXCIgKyBcIi9cIiArIHNldC5faWQgKyBcIi50eHRcIlxuICAgICAgICByd3NGaWxlbmFtZSA9IGNvbmZpZy5kYXRhVGVtcGRpciArIFwiL1wiICsgc2V0Ll9pZCArIFwiLnJ3c1wiXG4gICAgICAgIHdyaXRlRmlsZUZ1dHVyZSA9IHdyaXRlRmlsZSh0eHRGaWxlbmFtZSwgc2V0LmNvbnRlbnRzKVxuICAgICAgICBpZiBjb25maWcuaXNTU0hcbiAgICAgICAgICBzY3BDb21tYW5kID0gXCJzY3AgXCIgKyBjb25maWcuZ2V0U1NIT3B0aW9ucygpICsgXCIgLVAgXCIgKyBjb25maWcucG9ydCArIFwiIFwiICsgdHh0RmlsZW5hbWUgKyBcIiBcIiArIGNvbmZpZy51c2VyICsgXCJAXCIgKyBjb25maWcuaG9zdCArIFwiOlwiICsgdHh0RmlsZW5hbWVcbiAgICAgICAgICBzY3BGdXR1cmUgPSBuZXcgRnV0dXJlKClcbiAgICAgICAgICBQcm9jZXNzLmV4ZWMoc2NwQ29tbWFuZCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCBzdGRvdXQsIHN0ZGVycikgLT5cbiAgICAgICAgICAgIHJlc3VsdCA9IHN0ZG91dC50cmltKClcbiAgICAgICAgICAgIGVycm9yID0gc3RkZXJyLnRyaW0oKVxuICAgICAgICAgICAgY29kZSA9IGlmIGVyciB0aGVuIGVyci5jb2RlIGVsc2UgMFxuICAgICAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICAgICAgcndzZXRidWlsZEVycm9ycy5wdXNoKGVycm9yKVxuICAgICAgICAgICAgaWYgY29kZSBpcyAwXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGlmIG5vdCBlcnJvclxuICAgICAgICAgICAgICAgIHRocm93IFwic2NwOiBjb2RlIGlzIFxcXCJcIiArIGNvZGUgKyBcIlxcXCIgd2hpbGUgc3RkZXJyIGlzIFxcXCJcIiArIGVycm9yICsgXCJcXFwiXCJcbiAgICAgICAgICAgIHNjcEZ1dHVyZS5yZXR1cm4ocmVzdWx0KVxuICAgICAgICAgICkpXG4gICAgICAgICAgc2NwRnV0dXJlLndhaXQoKVxuICAgICAgICBybUNvbW1hbmQgPSBcInJtIC1mIFwiICsgcndzRmlsZW5hbWVcbiAgICAgICAgaWYgY29uZmlnLmlzU1NIXG4gICAgICAgICAgcm1Db21tYW5kID0gY29uZmlnLndyYXBDb21tYW5kKHJtQ29tbWFuZClcbiAgICAgICAgcm1GdXR1cmUgPSBuZXcgRnV0dXJlKClcbiAgICAgICAgUHJvY2Vzcy5leGVjKHJtQ29tbWFuZCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCBzdGRvdXQsIHN0ZGVycikgLT5cbiAgICAgICAgICByZXN1bHQgPSBzdGRvdXQudHJpbSgpXG4gICAgICAgICAgZXJyb3IgPSBzdGRlcnIudHJpbSgpXG4gICAgICAgICAgY29kZSA9IGlmIGVyciB0aGVuIGVyci5jb2RlIGVsc2UgMFxuICAgICAgICAgIGlmIGVycm9yXG4gICAgICAgICAgICByd3NldGJ1aWxkRXJyb3JzLnB1c2goZXJyb3IpXG4gICAgICAgICAgaWYgY29kZSBpcyAwXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgaWYgbm90IGVycm9yXG4gICAgICAgICAgICAgIHRocm93IFwicm06IGNvZGUgaXMgXFxcIlwiICsgY29kZSArIFwiXFxcIiB3aGlsZSBzdGRlcnIgaXMgXFxcIlwiICsgZXJyb3IgKyBcIlxcXCJcIlxuICAgICAgICAgIHJtRnV0dXJlLnJldHVybihyZXN1bHQpXG4gICAgICAgICkpXG4gICAgICAgIHJtRnV0dXJlLndhaXQoKVxuICAgICAgICB3cml0ZUZpbGVGdXR1cmUucmVzb2x2ZSBNZXRlb3IuYmluZEVudmlyb25tZW50KChlcnIsIHJlc3VsdCkgLT5cbiAgICAgICAgICBpZiBlcnJcbiAgICAgICAgICAgIHJ3c2V0YnVpbGRFcnJvcnMucHVzaChlcnIpXG4gICAgICAgICAgICByd3NldGJ1aWxkRnV0dXJlLnJldHVybihyZXN1bHQpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcndzZXRidWlsZENvbW1hbmQgPSBcInJ3c2V0YnVpbGQgXCIgKyB0eHRGaWxlbmFtZSArIFwiIFwiICsgcndzRmlsZW5hbWVcbiAgICAgICAgICAgIGlmIGNvbmZpZy5pc1NTSFxuICAgICAgICAgICAgICByd3NldGJ1aWxkQ29tbWFuZCA9IGNvbmZpZy53cmFwQ29tbWFuZChyd3NldGJ1aWxkQ29tbWFuZClcbiAgICAgICAgICAgIFByb2Nlc3MuZXhlYyhyd3NldGJ1aWxkQ29tbWFuZCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCBzdGRvdXQsIHN0ZGVycikgLT5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gc3Rkb3V0LnRyaW0oKVxuICAgICAgICAgICAgICBlcnJvciA9IHN0ZGVyci50cmltKClcbiAgICAgICAgICAgICAgY29kZSA9IGlmIGVyciB0aGVuIGVyci5jb2RlIGVsc2UgMFxuICAgICAgICAgICAgICBpZiBlcnJvclxuICAgICAgICAgICAgICAgIHJ3c2V0YnVpbGRFcnJvcnMucHVzaChlcnJvcilcbiAgICAgICAgICAgICAgaWYgY29kZSBpcyAwXG4gICAgICAgICAgICAgICAgc2hhcmUuSVBTZXRzLnVwZGF0ZShzZXQuX2lkLCB7JHNldDoge2lzT3V0cHV0U3RhbGU6IGZhbHNlfX0pXG4gICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBpZiBub3QgZXJyb3JcbiAgICAgICAgICAgICAgICAgIHRocm93IFwicndzZXRidWlsZDogY29kZSBpcyBcXFwiXCIgKyBjb2RlICsgXCJcXFwiIHdoaWxlIHN0ZGVyciBpcyBcXFwiXCIgKyBlcnJvciArIFwiXFxcIlwiXG4gICAgICAgICAgICAgIHJ3c2V0YnVpbGRGdXR1cmUucmV0dXJuKHJlc3VsdClcbiAgICAgICAgICAgICkpXG4gICAgICAgIClcbiAgICAgICAgcndzZXRidWlsZEZ1dHVyZXMucHVzaChyd3NldGJ1aWxkRnV0dXJlKVxuICApXG4gIEZ1dHVyZS53YWl0KHJ3c2V0YnVpbGRGdXR1cmVzKVxuXG4gIGlmIHJ3c2V0YnVpbGRFcnJvcnMubGVuZ3RoXG4gICAgY2FsbGJhY2soXCJcIiwgcndzZXRidWlsZEVycm9ycy5qb2luKFwiXFxuXCIpLCAyNTUpXG4gICAgcmV0dXJuXG5cbiAgaWYgbm90IHF1ZXJ5LmlzSW5wdXRTdGFsZSBhbmQgbm90IGlzSXBzZXRTdGFsZVxuICAgIGNhbGxiYWNrKFwiXCIsIFwiXCIsIDApXG4gICAgcmV0dXJuXG5cbiAgdHVwbGVidWlsZEVycm9ycyA9IFtdXG4gIHR1cGxlYnVpbGRGdXR1cmVzID0gW11cbiAgaXNUdXBsZVN0YWxlID0gZmFsc2VcbiAgXy5lYWNoKFtcInR1cGxlRmlsZVwiXSwgKGZpZWxkKSAtPlxuICAgIGlmIHF1ZXJ5W2ZpZWxkICsgXCJFbmFibGVkXCJdIGFuZCBxdWVyeVtmaWVsZF1cbiAgICAgIHNldCA9IHNoYXJlLlR1cGxlcy5maW5kT25lKHF1ZXJ5W2ZpZWxkXSlcbiAgICAgIGlmIHNldC5pc091dHB1dFN0YWxlXG4gICAgICAgIGlzVHVwbGVTdGFsZSA9IHRydWVcbiAgICAgICAgdHVwbGVidWlsZEZ1dHVyZSA9IG5ldyBGdXR1cmUoKVxuICAgICAgICB0eHRGaWxlbmFtZSA9IFwiL3RtcFwiICsgXCIvXCIgKyBzZXQuX2lkICsgXCIudHh0XCJcbiAgICAgICAgdHVwbGVGaWxlbmFtZSA9IGNvbmZpZy5kYXRhVGVtcGRpciArIFwiL1wiICsgc2V0Ll9pZCArIFwiLnR1cGxlXCJcbiAgICAgICAgd3JpdGVGaWxlRnV0dXJlID0gd3JpdGVGaWxlKHR4dEZpbGVuYW1lLCBzZXQuY29udGVudHMpXG4gICAgICAgIGlmIGNvbmZpZy5pc1NTSFxuICAgICAgICAgIHNjcENvbW1hbmQgPSBcInNjcCBcIiArIGNvbmZpZy5nZXRTU0hPcHRpb25zKCkgKyBcIiAtUCBcIiArIGNvbmZpZy5wb3J0ICsgXCIgXCIgKyB0eHRGaWxlbmFtZSArIFwiIFwiICsgY29uZmlnLnVzZXIgKyBcIkBcIiArIGNvbmZpZy5ob3N0ICsgXCI6XCIgKyB0eHRGaWxlbmFtZVxuICAgICAgICAgIHNjcEZ1dHVyZSA9IG5ldyBGdXR1cmUoKVxuICAgICAgICAgIFByb2Nlc3MuZXhlYyhzY3BDb21tYW5kLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChlcnIsIHN0ZG91dCwgc3RkZXJyKSAtPlxuICAgICAgICAgICAgcmVzdWx0ID0gc3Rkb3V0LnRyaW0oKVxuICAgICAgICAgICAgZXJyb3IgPSBzdGRlcnIudHJpbSgpXG4gICAgICAgICAgICBjb2RlID0gaWYgZXJyIHRoZW4gZXJyLmNvZGUgZWxzZSAwXG4gICAgICAgICAgICBpZiBlcnJvclxuICAgICAgICAgICAgICB0dXBsZWJ1aWxkRXJyb3JzLnB1c2goZXJyb3IpXG4gICAgICAgICAgICBpZiBjb2RlIGlzIDBcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgaWYgbm90IGVycm9yXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJzY3A6IGNvZGUgaXMgXFxcIlwiICsgY29kZSArIFwiXFxcIiB3aGlsZSBzdGRlcnIgaXMgXFxcIlwiICsgZXJyb3IgKyBcIlxcXCJcIlxuICAgICAgICAgICAgc2NwRnV0dXJlLnJldHVybihyZXN1bHQpXG4gICAgICAgICAgKSlcbiAgICAgICAgICBzY3BGdXR1cmUud2FpdCgpXG4gICAgICAgIHJtQ29tbWFuZCA9IFwicm0gLWYgXCIgKyB0dXBsZUZpbGVuYW1lXG4gICAgICAgIGlmIGNvbmZpZy5pc1NTSFxuICAgICAgICAgIHJtQ29tbWFuZCA9IGNvbmZpZy53cmFwQ29tbWFuZChybUNvbW1hbmQpXG4gICAgICAgIHJtRnV0dXJlID0gbmV3IEZ1dHVyZSgpXG4gICAgICAgIFByb2Nlc3MuZXhlYyhybUNvbW1hbmQsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgc3Rkb3V0LCBzdGRlcnIpIC0+XG4gICAgICAgICAgcmVzdWx0ID0gc3Rkb3V0LnRyaW0oKVxuICAgICAgICAgIGVycm9yID0gc3RkZXJyLnRyaW0oKVxuICAgICAgICAgIGNvZGUgPSBpZiBlcnIgdGhlbiBlcnIuY29kZSBlbHNlIDBcbiAgICAgICAgICBpZiBlcnJvclxuICAgICAgICAgICAgdHVwbGVidWlsZEVycm9ycy5wdXNoKGVycm9yKVxuICAgICAgICAgIGlmIGNvZGUgaXMgMFxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGlmIG5vdCBlcnJvclxuICAgICAgICAgICAgICB0aHJvdyBcInJtOiBjb2RlIGlzIFxcXCJcIiArIGNvZGUgKyBcIlxcXCIgd2hpbGUgc3RkZXJyIGlzIFxcXCJcIiArIGVycm9yICsgXCJcXFwiXCJcbiAgICAgICAgICBybUZ1dHVyZS5yZXR1cm4ocmVzdWx0KVxuICAgICAgICApKVxuICAgICAgICBybUZ1dHVyZS53YWl0KClcbiAgICAgICAgd3JpdGVGaWxlRnV0dXJlLnJlc29sdmUgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCByZXN1bHQpIC0+XG4gICAgICAgICAgaWYgZXJyXG4gICAgICAgICAgICB0dXBsZWJ1aWxkRXJyb3JzLnB1c2goZXJyKVxuICAgICAgICAgICAgdHVwbGVidWlsZEZ1dHVyZS5yZXR1cm4ocmVzdWx0KVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHR1cGxlYnVpbGRDb21tYW5kID0gXCJjYXQgXCIgKyB0eHRGaWxlbmFtZSArIFwiID4gXCIgKyB0dXBsZUZpbGVuYW1lXG4gICAgICAgICAgICBpZiBjb25maWcuaXNTU0hcbiAgICAgICAgICAgICAgdHVwbGVidWlsZENvbW1hbmQgPSBjb25maWcud3JhcENvbW1hbmQodHVwbGVidWlsZENvbW1hbmQpXG4gICAgICAgICAgICBQcm9jZXNzLmV4ZWModHVwbGVidWlsZENvbW1hbmQsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgc3Rkb3V0LCBzdGRlcnIpIC0+XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHN0ZG91dC50cmltKClcbiAgICAgICAgICAgICAgZXJyb3IgPSBzdGRlcnIudHJpbSgpXG4gICAgICAgICAgICAgIGNvZGUgPSBpZiBlcnIgdGhlbiBlcnIuY29kZSBlbHNlIDBcbiAgICAgICAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICAgICAgICB0dXBsZWJ1aWxkRXJyb3JzLnB1c2goZXJyb3IpXG4gICAgICAgICAgICAgIGlmIGNvZGUgaXMgMFxuICAgICAgICAgICAgICAgIHNoYXJlLlR1cGxlcy51cGRhdGUoc2V0Ll9pZCwgeyRzZXQ6IHtpc091dHB1dFN0YWxlOiBmYWxzZX19KVxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgaWYgbm90IGVycm9yXG4gICAgICAgICAgICAgICAgICB0aHJvdyBcInR1cGxlYnVpbGQ6IGNvZGUgaXMgXFxcIlwiICsgY29kZSArIFwiXFxcIiB3aGlsZSBzdGRlcnIgaXMgXFxcIlwiICsgZXJyb3IgKyBcIlxcXCJcIlxuICAgICAgICAgICAgICB0dXBsZWJ1aWxkRnV0dXJlLnJldHVybihyZXN1bHQpXG4gICAgICAgICAgICApKVxuICAgICAgICApXG4gICAgICAgIHR1cGxlYnVpbGRGdXR1cmVzLnB1c2godHVwbGVidWlsZEZ1dHVyZSlcbiAgKVxuICBGdXR1cmUud2FpdCh0dXBsZWJ1aWxkRnV0dXJlcylcblxuICBpZiB0dXBsZWJ1aWxkRXJyb3JzLmxlbmd0aFxuICAgIGNhbGxiYWNrKFwiXCIsIHR1cGxlYnVpbGRFcnJvcnMuam9pbihcIlxcblwiKSwgMjU1KVxuICAgIHJldHVyblxuXG4gIGlmIG5vdCBxdWVyeS5pc0lucHV0U3RhbGUgYW5kIG5vdCBpc1R1cGxlU3RhbGVcbiAgICBjYWxsYmFjayhcIlwiLCBcIlwiLCAwKVxuICAgIHJldHVyblxuXG4gIGNvbW1hbmQgPSBxdWVyeS5pbnB1dENvbW1hbmQoY29uZmlnLCBwcm9maWxlKVxuICBQcm9jZXNzLmV4ZWMoY29tbWFuZCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyLCBzdGRvdXQsIHN0ZGVycikgLT5cbiAgICByZXN1bHQgPSBzdGRvdXQudHJpbSgpXG4gICAgZXJyb3IgPSBzdGRlcnIudHJpbSgpXG4gICAgY29kZSA9IGlmIGVyciB0aGVuIGVyci5jb2RlIGVsc2UgMFxuICAgIGlmIGVycm9yLmluZGV4T2YoXCJSZWplY3RlZFwiKSBpc250IC0xXG4gICAgICBlcnJvciA9IG51bGxcbiAgICBjYWxsYmFjayhyZXN1bHQsIGVycm9yLCBjb2RlKVxuICApKVxuXG5sb2FkUXVlcnlSZXN1bHQgPSAocXVlcnksIGNvbmZpZywgcHJvZmlsZSwgY2FsbGJhY2spIC0+XG4gIGV4ZWN1dGVRdWVyeShxdWVyeSwgY29uZmlnLCBwcm9maWxlLCBNZXRlb3IuYmluZEVudmlyb25tZW50KChyZXN1bHQsIGVycm9yLCBjb2RlKSAtPlxuICAgIGlmIGVycm9yXG4gICAgICByZXR1cm4gY2FsbGJhY2socmVzdWx0LCBlcnJvciwgY29kZSlcbiAgICBjb21tYW5kID0gcXVlcnkub3V0cHV0Q29tbWFuZChjb25maWcsIHByb2ZpbGUpXG4gICAgUHJvY2Vzcy5leGVjKGNvbW1hbmQsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgc3Rkb3V0LCBzdGRlcnIpIC0+XG4gICAgICByZXN1bHQgPSBzdGRvdXQudHJpbSgpXG4gICAgICBlcnJvciA9IHN0ZGVyci50cmltKClcbiAgICAgIGNvZGUgPSBpZiBlcnIgdGhlbiBlcnIuY29kZSBlbHNlIDBcbiAgICAgIGlmIGVycm9yLmluZGV4T2YoXCJFcnJvciBvcGVuaW5nIGZpbGVcIikgaXNudCAtMVxuICAgICAgICBxdWVyeS5pc0lucHV0U3RhbGUgPSB0cnVlXG4gICAgICAgIGxvYWRRdWVyeVJlc3VsdChxdWVyeSwgY29uZmlnLCBwcm9maWxlLCBjYWxsYmFjaylcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2socmVzdWx0LCBlcnJvciwgY29kZSlcbiAgICApKVxuICApKVxuIl19
