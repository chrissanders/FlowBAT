(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var socket;

var require = meteorInstall({"node_modules":{"meteor":{"shell-server":{"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/shell-server/main.js                                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.watch(require("./shell-server.js"), {
  "*": module.makeNsSetter()
}, 0);
let listen;
module.watch(require("./shell-server.js"), {
  listen(v) {
    listen = v;
  }

}, 1);
const shellDir = process.env.METEOR_SHELL_DIR;

if (shellDir) {
  listen(shellDir);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"shell-server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/shell-server/shell-server.js                                                                           //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
const module1 = module;
module1.export({
  listen: () => listen,
  disable: () => disable
});

var assert = require("assert");

var path = require("path");

var stream = require("stream");

var fs = require("fs");

var net = require("net");

var vm = require("vm");

var _ = require("underscore");

var INFO_FILE_MODE = parseInt("600", 8); // Only the owner can read or write.

var EXITING_MESSAGE = "Shell exiting..."; // Invoked by the server process to listen for incoming connections from
// shell clients. Each connection gets its own REPL instance.

function listen(shellDir) {
  function callback() {
    new Server(shellDir).listen();
  } // If the server is still in the very early stages of starting up,
  // Meteor.startup may not available yet.


  if (typeof Meteor === "object") {
    Meteor.startup(callback);
  } else if (typeof __meteor_bootstrap__ === "object") {
    var hooks = __meteor_bootstrap__.startupHooks;

    if (hooks) {
      hooks.push(callback);
    } else {
      // As a fallback, just call the callback asynchronously.
      setImmediate(callback);
    }
  }
}

function disable(shellDir) {
  try {
    // Replace info.json with a file that says the shell server is
    // disabled, so that any connected shell clients will fail to
    // reconnect after the server process closes their sockets.
    fs.writeFileSync(getInfoFile(shellDir), JSON.stringify({
      status: "disabled",
      reason: "Shell server has shut down."
    }) + "\n", {
      mode: INFO_FILE_MODE
    });
  } catch (ignored) {}
}

class Server {
  constructor(shellDir) {
    var self = this;
    assert.ok(self instanceof Server);
    self.shellDir = shellDir;
    self.key = Math.random().toString(36).slice(2);
    self.server = net.createServer(function (socket) {
      self.onConnection(socket);
    }).on("error", function (err) {
      console.error(err.stack);
    });
  }

  listen() {
    var self = this;
    var infoFile = getInfoFile(self.shellDir);
    fs.unlink(infoFile, function () {
      self.server.listen(0, "127.0.0.1", function () {
        fs.writeFileSync(infoFile, JSON.stringify({
          status: "enabled",
          port: self.server.address().port,
          key: self.key
        }) + "\n", {
          mode: INFO_FILE_MODE
        });
      });
    });
  }

  onConnection(socket) {
    var self = this; // Make sure this function doesn't try to write anything to the socket
    // after it has been closed.

    socket.on("close", function () {
      socket = null;
    }); // If communication is not established within 1000ms of the first
    // connection, forcibly close the socket.

    var timeout = setTimeout(function () {
      if (socket) {
        socket.removeAllListeners("data");
        socket.end(EXITING_MESSAGE + "\n");
      }
    }, 1000); // Let connecting clients configure certain REPL options by sending a
    // JSON object over the socket. For example, only the client knows
    // whether it's running a TTY or an Emacs subshell or some other kind of
    // terminal, so the client must decide the value of options.terminal.

    readJSONFromStream(socket, function (error, options, replInputSocket) {
      clearTimeout(timeout);

      if (error) {
        socket = null;
        console.error(error.stack);
        return;
      }

      if (options.key !== self.key) {
        if (socket) {
          socket.end(EXITING_MESSAGE + "\n");
        }

        return;
      }

      delete options.key; // Set the columns to what is being requested by the client.

      if (options.columns && socket) {
        socket.columns = options.columns;
      }

      delete options.columns;

      if (options.evaluateAndExit) {
        evalCommand.call(Object.create(null), // Dummy repl object without ._RecoverableError.
        options.evaluateAndExit.command, null, // evalCommand ignores the context parameter, anyway
        options.evaluateAndExit.filename || "<meteor shell>", function (error, result) {
          if (socket) {
            var message = error ? {
              error: error + "",
              code: 1
            } : {
              result: result
            }; // Sending back a JSON payload allows the client to
            // distinguish between errors and successful results.

            socket.end(JSON.stringify(message) + "\n");
          }
        });
        return;
      }

      delete options.evaluateAndExit; // Immutable options.

      _.extend(options, {
        input: replInputSocket,
        output: socket
      }); // Overridable options.


      _.defaults(options, {
        prompt: "> ",
        terminal: true,
        useColors: true,
        useGlobal: true,
        ignoreUndefined: true
      });

      self.startREPL(options);
    });
  }

  startREPL(options) {
    var self = this; // Make sure this function doesn't try to write anything to the output
    // stream after it has been closed.

    options.output.on("close", function () {
      options.output = null;
    });

    var repl = self.repl = require("repl").start(options); // History persists across shell sessions!


    self.initializeHistory(); // Save the global `_` object in the server.  This is probably defined by the
    // underscore package.  It is unlikely to be the same object as the `var _ =
    // require('underscore')` in this file!

    var originalUnderscore = repl.context._;
    Object.defineProperty(repl.context, "_", {
      // Force the global _ variable to remain bound to underscore.
      get: function () {
        return originalUnderscore;
      },
      // Expose the last REPL result as __ instead of _.
      set: function (lastResult) {
        repl.context.__ = lastResult;
      },
      enumerable: true,
      // Allow this property to be (re)defined more than once (e.g. each
      // time the server restarts).
      configurable: true
    });
    setRequireAndModule(repl.context);
    repl.context.repl = repl; // Some improvements to the existing help messages.

    function addHelp(cmd, helpText) {
      var info = repl.commands[cmd] || repl.commands["." + cmd];

      if (info) {
        info.help = helpText;
      }
    }

    addHelp("break", "Terminate current command input and display new prompt");
    addHelp("exit", "Disconnect from server and leave shell");
    addHelp("help", "Show this help information"); // When the REPL exits, signal the attached client to exit by sending it
    // the special EXITING_MESSAGE.

    repl.on("exit", function () {
      if (options.output) {
        options.output.write(EXITING_MESSAGE + "\n");
        options.output.end();
      }
    }); // When the server process exits, end the output stream but do not
    // signal the attached client to exit.

    process.on("exit", function () {
      if (options.output) {
        options.output.end();
      }
    }); // This Meteor-specific shell command rebuilds the application as if a
    // change was made to server code.

    repl.defineCommand("reload", {
      help: "Restart the server and the shell",
      action: function () {
        process.exit(0);
      }
    }); // TODO: Node 6: Revisit this as repl._RecoverableError is now exported.
    //       as `Recoverable` from `repl`.  Maybe revisit this entirely
    //       as the docs have been updated too:
    //       https://nodejs.org/api/repl.html#repl_custom_evaluation_functions
    //       https://github.com/nodejs/node/blob/v6.x/lib/repl.js#L1398
    // Trigger one recoverable error using the default eval function, just
    // to capture the Recoverable error constructor, so that our custom
    // evalCommand function can wrap recoverable errors properly.

    repl.eval("{", null, "<meteor shell>", function (error) {
      // Capture the Recoverable error constructor.
      repl._RecoverableError = error && error.constructor; // Now set repl.eval to the actual evalCommand function that we want
      // to use, bound to repl._domain if necessary.

      repl.eval = repl._domain ? repl._domain.bind(evalCommand) : evalCommand; // Terminate the partial evaluation of the { command.

      repl.commands["break"].action.call(repl);
    });
  } // This function allows a persistent history of shell commands to be saved
  // to and loaded from .meteor/local/shell-history.


  initializeHistory() {
    var self = this;
    var rli = self.repl.rli;
    var historyFile = getHistoryFile(self.shellDir);
    var historyFd = fs.openSync(historyFile, "a+");
    var historyLines = fs.readFileSync(historyFile, "utf8").split("\n");
    var seenLines = Object.create(null);

    if (!rli.history) {
      rli.history = [];
      rli.historyIndex = -1;
    }

    while (rli.history && historyLines.length > 0) {
      var line = historyLines.pop();

      if (line && /\S/.test(line) && !seenLines[line]) {
        rli.history.push(line);
        seenLines[line] = true;
      }
    }

    rli.addListener("line", function (line) {
      if (historyFd >= 0 && /\S/.test(line)) {
        fs.writeSync(historyFd, line + "\n");
      }
    });
    self.repl.on("exit", function () {
      fs.closeSync(historyFd);
      historyFd = -1;
    });
  }

}

function readJSONFromStream(inputStream, callback) {
  var outputStream = new stream.PassThrough();
  var dataSoFar = "";

  function onData(buffer) {
    var lines = buffer.toString("utf8").split("\n");

    while (lines.length > 0) {
      dataSoFar += lines.shift();

      try {
        var json = JSON.parse(dataSoFar);
      } catch (error) {
        if (error instanceof SyntaxError) {
          continue;
        }

        return finish(error);
      }

      if (lines.length > 0) {
        outputStream.write(lines.join("\n"));
      }

      inputStream.pipe(outputStream);
      return finish(null, json);
    }
  }

  function onClose() {
    finish(new Error("stream unexpectedly closed"));
  }

  var finished = false;

  function finish(error, json) {
    if (!finished) {
      finished = true;
      inputStream.removeListener("data", onData);
      inputStream.removeListener("error", finish);
      inputStream.removeListener("close", onClose);
      callback(error, json, outputStream);
    }
  }

  inputStream.on("data", onData);
  inputStream.on("error", finish);
  inputStream.on("close", onClose);
}

function getInfoFile(shellDir) {
  return path.join(shellDir, "info.json");
}

function getHistoryFile(shellDir) {
  return path.join(shellDir, "history");
} // Shell commands need to be executed in a Fiber in case they call into
// code that yields. Using a Promise is an even better idea, since it runs
// its callbacks in Fibers drawn from a pool, so the Fibers are recycled.


var evalCommandPromise = Promise.resolve();

function evalCommand(command, context, filename, callback) {
  var repl = this;

  function wrapErrorIfRecoverable(error) {
    if (repl._RecoverableError && isRecoverableError(error, repl)) {
      return new repl._RecoverableError(error);
    } else {
      return error;
    }
  }

  if (Package.ecmascript) {
    var noParens = stripParens(command);

    if (noParens !== command) {
      var classMatch = /^\s*class\s+(\w+)/.exec(noParens);

      if (classMatch && classMatch[1] !== "extends") {
        // If the command looks like a named ES2015 class, we remove the
        // extra layer of parentheses added by the REPL so that the
        // command will be evaluated as a class declaration rather than as
        // a named class expression. Note that you can still type (class A
        // {}) explicitly to evaluate a named class expression. The REPL
        // code that calls evalCommand handles named function expressions
        // similarly (first with and then without parentheses), but that
        // code doesn't know about ES2015 classes, which is why we have to
        // handle them here.
        command = noParens;
      }
    }

    try {
      command = Package.ecmascript.ECMAScript.compileForShell(command);
    } catch (error) {
      callback(wrapErrorIfRecoverable(error));
      return;
    }
  }

  try {
    var script = new vm.Script(command, {
      filename: filename,
      displayErrors: false
    });
  } catch (parseError) {
    callback(wrapErrorIfRecoverable(parseError));
    return;
  }

  evalCommandPromise.then(function () {
    if (repl.input) {
      callback(null, script.runInThisContext());
    } else {
      // If repl didn't start, `require` and `module` are not visible
      // in the vm context.
      setRequireAndModule(global);
      callback(null, script.runInThisContext());
    }
  }).catch(callback);
}

function stripParens(command) {
  if (command.charAt(0) === "(" && command.charAt(command.length - 1) === ")") {
    return command.slice(1, command.length - 1);
  }

  return command;
} // The bailOnIllegalToken and isRecoverableError functions are taken from
// https://github.com/nodejs/node/blob/c9e670ea2a/lib/repl.js#L1227-L1253


function bailOnIllegalToken(parser) {
  return parser._literal === null && !parser.blockComment && !parser.regExpLiteral;
} // If the error is that we've unexpectedly ended the input,
// then let the user try to recover by adding more input.


function isRecoverableError(e, repl) {
  if (e && e.name === 'SyntaxError') {
    var message = e.message;

    if (message === 'Unterminated template literal' || message === 'Missing } in template expression') {
      repl._inTemplateLiteral = true;
      return true;
    }

    if (message.startsWith('Unexpected end of input') || message.startsWith('missing ) after argument list') || message.startsWith('Unexpected token')) {
      return true;
    }

    if (message === 'Invalid or unexpected token') {
      return !bailOnIllegalToken(repl.lineParser);
    }
  }

  return false;
}

function setRequireAndModule(context) {
  if (Package.modules) {
    // Use the same `require` function and `module` object visible to the
    // application.
    var toBeInstalled = {};
    var shellModuleName = "meteor-shell-" + Math.random().toString(36).slice(2) + ".js";

    toBeInstalled[shellModuleName] = function (require, exports, module) {
      context.module = module;
      context.require = require; // Tab completion sometimes uses require.extensions, but only for
      // the keys.

      require.extensions = {
        ".js": true,
        ".json": true,
        ".node": true
      };
    }; // This populates repl.context.{module,require} by evaluating the
    // module defined above.


    Package.modules.meteorInstall(toBeInstalled)("./" + shellModuleName);
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/shell-server/main.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['shell-server'] = exports;

})();

//# sourceURL=meteor://💻app/packages/shell-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc2hlbGwtc2VydmVyL21haW4uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NoZWxsLXNlcnZlci9zaGVsbC1zZXJ2ZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwibWFrZU5zU2V0dGVyIiwibGlzdGVuIiwidiIsInNoZWxsRGlyIiwicHJvY2VzcyIsImVudiIsIk1FVEVPUl9TSEVMTF9ESVIiLCJtb2R1bGUxIiwiZXhwb3J0IiwiZGlzYWJsZSIsImFzc2VydCIsInBhdGgiLCJzdHJlYW0iLCJmcyIsIm5ldCIsInZtIiwiXyIsIklORk9fRklMRV9NT0RFIiwicGFyc2VJbnQiLCJFWElUSU5HX01FU1NBR0UiLCJjYWxsYmFjayIsIlNlcnZlciIsIk1ldGVvciIsInN0YXJ0dXAiLCJfX21ldGVvcl9ib290c3RyYXBfXyIsImhvb2tzIiwic3RhcnR1cEhvb2tzIiwicHVzaCIsInNldEltbWVkaWF0ZSIsIndyaXRlRmlsZVN5bmMiLCJnZXRJbmZvRmlsZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJzdGF0dXMiLCJyZWFzb24iLCJtb2RlIiwiaWdub3JlZCIsImNvbnN0cnVjdG9yIiwic2VsZiIsIm9rIiwia2V5IiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJzZXJ2ZXIiLCJjcmVhdGVTZXJ2ZXIiLCJzb2NrZXQiLCJvbkNvbm5lY3Rpb24iLCJvbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInN0YWNrIiwiaW5mb0ZpbGUiLCJ1bmxpbmsiLCJwb3J0IiwiYWRkcmVzcyIsInRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwiZW5kIiwicmVhZEpTT05Gcm9tU3RyZWFtIiwib3B0aW9ucyIsInJlcGxJbnB1dFNvY2tldCIsImNsZWFyVGltZW91dCIsImNvbHVtbnMiLCJldmFsdWF0ZUFuZEV4aXQiLCJldmFsQ29tbWFuZCIsImNhbGwiLCJPYmplY3QiLCJjcmVhdGUiLCJjb21tYW5kIiwiZmlsZW5hbWUiLCJyZXN1bHQiLCJtZXNzYWdlIiwiY29kZSIsImV4dGVuZCIsImlucHV0Iiwib3V0cHV0IiwiZGVmYXVsdHMiLCJwcm9tcHQiLCJ0ZXJtaW5hbCIsInVzZUNvbG9ycyIsInVzZUdsb2JhbCIsImlnbm9yZVVuZGVmaW5lZCIsInN0YXJ0UkVQTCIsInJlcGwiLCJzdGFydCIsImluaXRpYWxpemVIaXN0b3J5Iiwib3JpZ2luYWxVbmRlcnNjb3JlIiwiY29udGV4dCIsImRlZmluZVByb3BlcnR5IiwiZ2V0Iiwic2V0IiwibGFzdFJlc3VsdCIsIl9fIiwiZW51bWVyYWJsZSIsImNvbmZpZ3VyYWJsZSIsInNldFJlcXVpcmVBbmRNb2R1bGUiLCJhZGRIZWxwIiwiY21kIiwiaGVscFRleHQiLCJpbmZvIiwiY29tbWFuZHMiLCJoZWxwIiwid3JpdGUiLCJkZWZpbmVDb21tYW5kIiwiYWN0aW9uIiwiZXhpdCIsImV2YWwiLCJfUmVjb3ZlcmFibGVFcnJvciIsIl9kb21haW4iLCJiaW5kIiwicmxpIiwiaGlzdG9yeUZpbGUiLCJnZXRIaXN0b3J5RmlsZSIsImhpc3RvcnlGZCIsIm9wZW5TeW5jIiwiaGlzdG9yeUxpbmVzIiwicmVhZEZpbGVTeW5jIiwic3BsaXQiLCJzZWVuTGluZXMiLCJoaXN0b3J5IiwiaGlzdG9yeUluZGV4IiwibGVuZ3RoIiwibGluZSIsInBvcCIsInRlc3QiLCJhZGRMaXN0ZW5lciIsIndyaXRlU3luYyIsImNsb3NlU3luYyIsImlucHV0U3RyZWFtIiwib3V0cHV0U3RyZWFtIiwiUGFzc1Rocm91Z2giLCJkYXRhU29GYXIiLCJvbkRhdGEiLCJidWZmZXIiLCJsaW5lcyIsInNoaWZ0IiwianNvbiIsInBhcnNlIiwiU3ludGF4RXJyb3IiLCJmaW5pc2giLCJqb2luIiwicGlwZSIsIm9uQ2xvc2UiLCJFcnJvciIsImZpbmlzaGVkIiwicmVtb3ZlTGlzdGVuZXIiLCJldmFsQ29tbWFuZFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsIndyYXBFcnJvcklmUmVjb3ZlcmFibGUiLCJpc1JlY292ZXJhYmxlRXJyb3IiLCJQYWNrYWdlIiwiZWNtYXNjcmlwdCIsIm5vUGFyZW5zIiwic3RyaXBQYXJlbnMiLCJjbGFzc01hdGNoIiwiZXhlYyIsIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJzY3JpcHQiLCJTY3JpcHQiLCJkaXNwbGF5RXJyb3JzIiwicGFyc2VFcnJvciIsInRoZW4iLCJydW5JblRoaXNDb250ZXh0IiwiZ2xvYmFsIiwiY2F0Y2giLCJjaGFyQXQiLCJiYWlsT25JbGxlZ2FsVG9rZW4iLCJwYXJzZXIiLCJfbGl0ZXJhbCIsImJsb2NrQ29tbWVudCIsInJlZ0V4cExpdGVyYWwiLCJlIiwibmFtZSIsIl9pblRlbXBsYXRlTGl0ZXJhbCIsInN0YXJ0c1dpdGgiLCJsaW5lUGFyc2VyIiwibW9kdWxlcyIsInRvQmVJbnN0YWxsZWQiLCJzaGVsbE1vZHVsZU5hbWUiLCJleHBvcnRzIiwiZXh0ZW5zaW9ucyIsIm1ldGVvckluc3RhbGwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQyxPQUFJRixPQUFPRyxZQUFQO0FBQUwsQ0FBMUMsRUFBc0UsQ0FBdEU7QUFBeUUsSUFBSUMsTUFBSjtBQUFXSixPQUFPQyxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDRSxTQUFPQyxDQUFQLEVBQVM7QUFBQ0QsYUFBT0MsQ0FBUDtBQUFTOztBQUFwQixDQUExQyxFQUFnRSxDQUFoRTtBQUdwRixNQUFNQyxXQUFXQyxRQUFRQyxHQUFSLENBQVlDLGdCQUE3Qjs7QUFDQSxJQUFJSCxRQUFKLEVBQWM7QUFDWkYsU0FBT0UsUUFBUDtBQUNELEM7Ozs7Ozs7Ozs7O0FDTkQsTUFBTUksVUFBUVYsTUFBZDtBQUFxQlUsUUFBUUMsTUFBUixDQUFlO0FBQUNQLFVBQU8sTUFBSUEsTUFBWjtBQUFtQlEsV0FBUSxN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OEYsY0FBUTVGLE9BQVIsR0FBa0JBLE9BQWxCLENBRm1FLENBSW5FO0FBQ0E7O0FBQ0FBLGNBQVEyTCxVQUFSLEdBQXFCO0FBQ25CLGVBQU8sSUFEWTtBQUVuQixpQkFBUyxJQUZVO0FBR25CLGlCQUFTO0FBSFUsT0FBckI7QUFLRCxLQVhELENBUG1CLENBb0JuQjtBQUNBOzs7QUFDQS9CLFlBQVEyQixPQUFSLENBQWdCSyxhQUFoQixDQUE4QkosYUFBOUIsRUFBNkMsT0FBT0MsZUFBcEQ7QUFDRDtBQUNGLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3NoZWxsLXNlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCAqIGZyb20gXCIuL3NoZWxsLXNlcnZlci5qc1wiO1xuaW1wb3J0IHsgbGlzdGVuIH0gZnJvbSBcIi4vc2hlbGwtc2VydmVyLmpzXCI7XG5cbmNvbnN0IHNoZWxsRGlyID0gcHJvY2Vzcy5lbnYuTUVURU9SX1NIRUxMX0RJUjtcbmlmIChzaGVsbERpcikge1xuICBsaXN0ZW4oc2hlbGxEaXIpO1xufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xudmFyIHN0cmVhbSA9IHJlcXVpcmUoXCJzdHJlYW1cIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgbmV0ID0gcmVxdWlyZShcIm5ldFwiKTtcbnZhciB2bSA9IHJlcXVpcmUoXCJ2bVwiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgSU5GT19GSUxFX01PREUgPSBwYXJzZUludChcIjYwMFwiLCA4KTsgLy8gT25seSB0aGUgb3duZXIgY2FuIHJlYWQgb3Igd3JpdGUuXG52YXIgRVhJVElOR19NRVNTQUdFID0gXCJTaGVsbCBleGl0aW5nLi4uXCI7XG5cbi8vIEludm9rZWQgYnkgdGhlIHNlcnZlciBwcm9jZXNzIHRvIGxpc3RlbiBmb3IgaW5jb21pbmcgY29ubmVjdGlvbnMgZnJvbVxuLy8gc2hlbGwgY2xpZW50cy4gRWFjaCBjb25uZWN0aW9uIGdldHMgaXRzIG93biBSRVBMIGluc3RhbmNlLlxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RlbihzaGVsbERpcikge1xuICBmdW5jdGlvbiBjYWxsYmFjaygpIHtcbiAgICBuZXcgU2VydmVyKHNoZWxsRGlyKS5saXN0ZW4oKTtcbiAgfVxuXG4gIC8vIElmIHRoZSBzZXJ2ZXIgaXMgc3RpbGwgaW4gdGhlIHZlcnkgZWFybHkgc3RhZ2VzIG9mIHN0YXJ0aW5nIHVwLFxuICAvLyBNZXRlb3Iuc3RhcnR1cCBtYXkgbm90IGF2YWlsYWJsZSB5ZXQuXG4gIGlmICh0eXBlb2YgTWV0ZW9yID09PSBcIm9iamVjdFwiKSB7XG4gICAgTWV0ZW9yLnN0YXJ0dXAoY2FsbGJhY2spO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBfX21ldGVvcl9ib290c3RyYXBfXyA9PT0gXCJvYmplY3RcIikge1xuICAgIHZhciBob29rcyA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLnN0YXJ0dXBIb29rcztcbiAgICBpZiAoaG9va3MpIHtcbiAgICAgIGhvb2tzLnB1c2goY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBcyBhIGZhbGxiYWNrLCBqdXN0IGNhbGwgdGhlIGNhbGxiYWNrIGFzeW5jaHJvbm91c2x5LlxuICAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gRGlzYWJsaW5nIHRoZSBzaGVsbCBjYXVzZXMgYWxsIGF0dGFjaGVkIGNsaWVudHMgdG8gZGlzY29ubmVjdCBhbmQgZXhpdC5cbmV4cG9ydCBmdW5jdGlvbiBkaXNhYmxlKHNoZWxsRGlyKSB7XG4gIHRyeSB7XG4gICAgLy8gUmVwbGFjZSBpbmZvLmpzb24gd2l0aCBhIGZpbGUgdGhhdCBzYXlzIHRoZSBzaGVsbCBzZXJ2ZXIgaXNcbiAgICAvLyBkaXNhYmxlZCwgc28gdGhhdCBhbnkgY29ubmVjdGVkIHNoZWxsIGNsaWVudHMgd2lsbCBmYWlsIHRvXG4gICAgLy8gcmVjb25uZWN0IGFmdGVyIHRoZSBzZXJ2ZXIgcHJvY2VzcyBjbG9zZXMgdGhlaXIgc29ja2V0cy5cbiAgICBmcy53cml0ZUZpbGVTeW5jKFxuICAgICAgZ2V0SW5mb0ZpbGUoc2hlbGxEaXIpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdGF0dXM6IFwiZGlzYWJsZWRcIixcbiAgICAgICAgcmVhc29uOiBcIlNoZWxsIHNlcnZlciBoYXMgc2h1dCBkb3duLlwiXG4gICAgICB9KSArIFwiXFxuXCIsXG4gICAgICB7IG1vZGU6IElORk9fRklMRV9NT0RFIH1cbiAgICApO1xuICB9IGNhdGNoIChpZ25vcmVkKSB7fVxufVxuXG5jbGFzcyBTZXJ2ZXIge1xuICBjb25zdHJ1Y3RvcihzaGVsbERpcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhc3NlcnQub2soc2VsZiBpbnN0YW5jZW9mIFNlcnZlcik7XG5cbiAgICBzZWxmLnNoZWxsRGlyID0gc2hlbGxEaXI7XG4gICAgc2VsZi5rZXkgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTtcblxuICAgIHNlbGYuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcihmdW5jdGlvbihzb2NrZXQpIHtcbiAgICAgIHNlbGYub25Db25uZWN0aW9uKHNvY2tldCk7XG4gICAgfSkub24oXCJlcnJvclwiLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrKTtcbiAgICB9KTtcbiAgfVxuXG4gIGxpc3RlbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGluZm9GaWxlID0gZ2V0SW5mb0ZpbGUoc2VsZi5zaGVsbERpcik7XG5cbiAgICBmcy51bmxpbmsoaW5mb0ZpbGUsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5zZXJ2ZXIubGlzdGVuKDAsIFwiMTI3LjAuMC4xXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGluZm9GaWxlLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3RhdHVzOiBcImVuYWJsZWRcIixcbiAgICAgICAgICBwb3J0OiBzZWxmLnNlcnZlci5hZGRyZXNzKCkucG9ydCxcbiAgICAgICAgICBrZXk6IHNlbGYua2V5XG4gICAgICAgIH0pICsgXCJcXG5cIiwge1xuICAgICAgICAgIG1vZGU6IElORk9fRklMRV9NT0RFXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNvbm5lY3Rpb24oc29ja2V0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoaXMgZnVuY3Rpb24gZG9lc24ndCB0cnkgdG8gd3JpdGUgYW55dGhpbmcgdG8gdGhlIHNvY2tldFxuICAgIC8vIGFmdGVyIGl0IGhhcyBiZWVuIGNsb3NlZC5cbiAgICBzb2NrZXQub24oXCJjbG9zZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHNvY2tldCA9IG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBjb21tdW5pY2F0aW9uIGlzIG5vdCBlc3RhYmxpc2hlZCB3aXRoaW4gMTAwMG1zIG9mIHRoZSBmaXJzdFxuICAgIC8vIGNvbm5lY3Rpb24sIGZvcmNpYmx5IGNsb3NlIHRoZSBzb2NrZXQuXG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNvY2tldCkge1xuICAgICAgICBzb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKFwiZGF0YVwiKTtcbiAgICAgICAgc29ja2V0LmVuZChFWElUSU5HX01FU1NBR0UgKyBcIlxcblwiKTtcbiAgICAgIH1cbiAgICB9LCAxMDAwKTtcblxuICAgIC8vIExldCBjb25uZWN0aW5nIGNsaWVudHMgY29uZmlndXJlIGNlcnRhaW4gUkVQTCBvcHRpb25zIGJ5IHNlbmRpbmcgYVxuICAgIC8vIEpTT04gb2JqZWN0IG92ZXIgdGhlIHNvY2tldC4gRm9yIGV4YW1wbGUsIG9ubHkgdGhlIGNsaWVudCBrbm93c1xuICAgIC8vIHdoZXRoZXIgaXQncyBydW5uaW5nIGEgVFRZIG9yIGFuIEVtYWNzIHN1YnNoZWxsIG9yIHNvbWUgb3RoZXIga2luZCBvZlxuICAgIC8vIHRlcm1pbmFsLCBzbyB0aGUgY2xpZW50IG11c3QgZGVjaWRlIHRoZSB2YWx1ZSBvZiBvcHRpb25zLnRlcm1pbmFsLlxuICAgIHJlYWRKU09ORnJvbVN0cmVhbShzb2NrZXQsIGZ1bmN0aW9uIChlcnJvciwgb3B0aW9ucywgcmVwbElucHV0U29ja2V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBzb2NrZXQgPSBudWxsO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLnN0YWNrKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5rZXkgIT09IHNlbGYua2V5KSB7XG4gICAgICAgIGlmIChzb2NrZXQpIHtcbiAgICAgICAgICBzb2NrZXQuZW5kKEVYSVRJTkdfTUVTU0FHRSArIFwiXFxuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBvcHRpb25zLmtleTtcblxuICAgICAgLy8gU2V0IHRoZSBjb2x1bW5zIHRvIHdoYXQgaXMgYmVpbmcgcmVxdWVzdGVkIGJ5IHRoZSBjbGllbnQuXG4gICAgICBpZiAob3B0aW9ucy5jb2x1bW5zICYmIHNvY2tldCkge1xuICAgICAgICBzb2NrZXQuY29sdW1ucyA9IG9wdGlvbnMuY29sdW1ucztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBvcHRpb25zLmNvbHVtbnM7XG5cbiAgICAgIGlmIChvcHRpb25zLmV2YWx1YXRlQW5kRXhpdCkge1xuICAgICAgICBldmFsQ29tbWFuZC5jYWxsKFxuICAgICAgICAgIE9iamVjdC5jcmVhdGUobnVsbCksIC8vIER1bW15IHJlcGwgb2JqZWN0IHdpdGhvdXQgLl9SZWNvdmVyYWJsZUVycm9yLlxuICAgICAgICAgIG9wdGlvbnMuZXZhbHVhdGVBbmRFeGl0LmNvbW1hbmQsXG4gICAgICAgICAgbnVsbCwgLy8gZXZhbENvbW1hbmQgaWdub3JlcyB0aGUgY29udGV4dCBwYXJhbWV0ZXIsIGFueXdheVxuICAgICAgICAgIG9wdGlvbnMuZXZhbHVhdGVBbmRFeGl0LmZpbGVuYW1lIHx8IFwiPG1ldGVvciBzaGVsbD5cIixcbiAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHNvY2tldCkge1xuICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IGVycm9yID8ge1xuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvciArIFwiXCIsXG4gICAgICAgICAgICAgICAgY29kZTogMVxuICAgICAgICAgICAgICB9IDoge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgLy8gU2VuZGluZyBiYWNrIGEgSlNPTiBwYXlsb2FkIGFsbG93cyB0aGUgY2xpZW50IHRvXG4gICAgICAgICAgICAgIC8vIGRpc3Rpbmd1aXNoIGJldHdlZW4gZXJyb3JzIGFuZCBzdWNjZXNzZnVsIHJlc3VsdHMuXG4gICAgICAgICAgICAgIHNvY2tldC5lbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkgKyBcIlxcblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBvcHRpb25zLmV2YWx1YXRlQW5kRXhpdDtcblxuICAgICAgLy8gSW1tdXRhYmxlIG9wdGlvbnMuXG4gICAgICBfLmV4dGVuZChvcHRpb25zLCB7XG4gICAgICAgIGlucHV0OiByZXBsSW5wdXRTb2NrZXQsXG4gICAgICAgIG91dHB1dDogc29ja2V0XG4gICAgICB9KTtcblxuICAgICAgLy8gT3ZlcnJpZGFibGUgb3B0aW9ucy5cbiAgICAgIF8uZGVmYXVsdHMob3B0aW9ucywge1xuICAgICAgICBwcm9tcHQ6IFwiPiBcIixcbiAgICAgICAgdGVybWluYWw6IHRydWUsXG4gICAgICAgIHVzZUNvbG9yczogdHJ1ZSxcbiAgICAgICAgdXNlR2xvYmFsOiB0cnVlLFxuICAgICAgICBpZ25vcmVVbmRlZmluZWQ6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgc2VsZi5zdGFydFJFUEwob3B0aW9ucyk7XG4gICAgfSk7XG4gIH1cblxuICBzdGFydFJFUEwob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGlzIGZ1bmN0aW9uIGRvZXNuJ3QgdHJ5IHRvIHdyaXRlIGFueXRoaW5nIHRvIHRoZSBvdXRwdXRcbiAgICAvLyBzdHJlYW0gYWZ0ZXIgaXQgaGFzIGJlZW4gY2xvc2VkLlxuICAgIG9wdGlvbnMub3V0cHV0Lm9uKFwiY2xvc2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBvcHRpb25zLm91dHB1dCA9IG51bGw7XG4gICAgfSk7XG5cbiAgICB2YXIgcmVwbCA9IHNlbGYucmVwbCA9IHJlcXVpcmUoXCJyZXBsXCIpLnN0YXJ0KG9wdGlvbnMpO1xuXG4gICAgLy8gSGlzdG9yeSBwZXJzaXN0cyBhY3Jvc3Mgc2hlbGwgc2Vzc2lvbnMhXG4gICAgc2VsZi5pbml0aWFsaXplSGlzdG9yeSgpO1xuXG4gICAgLy8gU2F2ZSB0aGUgZ2xvYmFsIGBfYCBvYmplY3QgaW4gdGhlIHNlcnZlci4gIFRoaXMgaXMgcHJvYmFibHkgZGVmaW5lZCBieSB0aGVcbiAgICAvLyB1bmRlcnNjb3JlIHBhY2thZ2UuICBJdCBpcyB1bmxpa2VseSB0byBiZSB0aGUgc2FtZSBvYmplY3QgYXMgdGhlIGB2YXIgXyA9XG4gICAgLy8gcmVxdWlyZSgndW5kZXJzY29yZScpYCBpbiB0aGlzIGZpbGUhXG4gICAgdmFyIG9yaWdpbmFsVW5kZXJzY29yZSA9IHJlcGwuY29udGV4dC5fO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlcGwuY29udGV4dCwgXCJfXCIsIHtcbiAgICAgIC8vIEZvcmNlIHRoZSBnbG9iYWwgXyB2YXJpYWJsZSB0byByZW1haW4gYm91bmQgdG8gdW5kZXJzY29yZS5cbiAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gb3JpZ2luYWxVbmRlcnNjb3JlOyB9LFxuXG4gICAgICAvLyBFeHBvc2UgdGhlIGxhc3QgUkVQTCByZXN1bHQgYXMgX18gaW5zdGVhZCBvZiBfLlxuICAgICAgc2V0OiBmdW5jdGlvbihsYXN0UmVzdWx0KSB7XG4gICAgICAgIHJlcGwuY29udGV4dC5fXyA9IGxhc3RSZXN1bHQ7XG4gICAgICB9LFxuXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgICAvLyBBbGxvdyB0aGlzIHByb3BlcnR5IHRvIGJlIChyZSlkZWZpbmVkIG1vcmUgdGhhbiBvbmNlIChlLmcuIGVhY2hcbiAgICAgIC8vIHRpbWUgdGhlIHNlcnZlciByZXN0YXJ0cykuXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHNldFJlcXVpcmVBbmRNb2R1bGUocmVwbC5jb250ZXh0KTtcblxuICAgIHJlcGwuY29udGV4dC5yZXBsID0gcmVwbDtcblxuICAgIC8vIFNvbWUgaW1wcm92ZW1lbnRzIHRvIHRoZSBleGlzdGluZyBoZWxwIG1lc3NhZ2VzLlxuICAgIGZ1bmN0aW9uIGFkZEhlbHAoY21kLCBoZWxwVGV4dCkge1xuICAgICAgdmFyIGluZm8gPSByZXBsLmNvbW1hbmRzW2NtZF0gfHwgcmVwbC5jb21tYW5kc1tcIi5cIiArIGNtZF07XG4gICAgICBpZiAoaW5mbykge1xuICAgICAgICBpbmZvLmhlbHAgPSBoZWxwVGV4dDtcbiAgICAgIH1cbiAgICB9XG4gICAgYWRkSGVscChcImJyZWFrXCIsIFwiVGVybWluYXRlIGN1cnJlbnQgY29tbWFuZCBpbnB1dCBhbmQgZGlzcGxheSBuZXcgcHJvbXB0XCIpO1xuICAgIGFkZEhlbHAoXCJleGl0XCIsIFwiRGlzY29ubmVjdCBmcm9tIHNlcnZlciBhbmQgbGVhdmUgc2hlbGxcIik7XG4gICAgYWRkSGVscChcImhlbHBcIiwgXCJTaG93IHRoaXMgaGVscCBpbmZvcm1hdGlvblwiKTtcblxuICAgIC8vIFdoZW4gdGhlIFJFUEwgZXhpdHMsIHNpZ25hbCB0aGUgYXR0YWNoZWQgY2xpZW50IHRvIGV4aXQgYnkgc2VuZGluZyBpdFxuICAgIC8vIHRoZSBzcGVjaWFsIEVYSVRJTkdfTUVTU0FHRS5cbiAgICByZXBsLm9uKFwiZXhpdFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChvcHRpb25zLm91dHB1dCkge1xuICAgICAgICBvcHRpb25zLm91dHB1dC53cml0ZShFWElUSU5HX01FU1NBR0UgKyBcIlxcblwiKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXQuZW5kKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBXaGVuIHRoZSBzZXJ2ZXIgcHJvY2VzcyBleGl0cywgZW5kIHRoZSBvdXRwdXQgc3RyZWFtIGJ1dCBkbyBub3RcbiAgICAvLyBzaWduYWwgdGhlIGF0dGFjaGVkIGNsaWVudCB0byBleGl0LlxuICAgIHByb2Nlc3Mub24oXCJleGl0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG9wdGlvbnMub3V0cHV0KSB7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0LmVuZCgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBNZXRlb3Itc3BlY2lmaWMgc2hlbGwgY29tbWFuZCByZWJ1aWxkcyB0aGUgYXBwbGljYXRpb24gYXMgaWYgYVxuICAgIC8vIGNoYW5nZSB3YXMgbWFkZSB0byBzZXJ2ZXIgY29kZS5cbiAgICByZXBsLmRlZmluZUNvbW1hbmQoXCJyZWxvYWRcIiwge1xuICAgICAgaGVscDogXCJSZXN0YXJ0IHRoZSBzZXJ2ZXIgYW5kIHRoZSBzaGVsbFwiLFxuICAgICAgYWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogTm9kZSA2OiBSZXZpc2l0IHRoaXMgYXMgcmVwbC5fUmVjb3ZlcmFibGVFcnJvciBpcyBub3cgZXhwb3J0ZWQuXG4gICAgLy8gICAgICAgYXMgYFJlY292ZXJhYmxlYCBmcm9tIGByZXBsYC4gIE1heWJlIHJldmlzaXQgdGhpcyBlbnRpcmVseVxuICAgIC8vICAgICAgIGFzIHRoZSBkb2NzIGhhdmUgYmVlbiB1cGRhdGVkIHRvbzpcbiAgICAvLyAgICAgICBodHRwczovL25vZGVqcy5vcmcvYXBpL3JlcGwuaHRtbCNyZXBsX2N1c3RvbV9ldmFsdWF0aW9uX2Z1bmN0aW9uc1xuICAgIC8vICAgICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL3Y2LngvbGliL3JlcGwuanMjTDEzOThcbiAgICAvLyBUcmlnZ2VyIG9uZSByZWNvdmVyYWJsZSBlcnJvciB1c2luZyB0aGUgZGVmYXVsdCBldmFsIGZ1bmN0aW9uLCBqdXN0XG4gICAgLy8gdG8gY2FwdHVyZSB0aGUgUmVjb3ZlcmFibGUgZXJyb3IgY29uc3RydWN0b3IsIHNvIHRoYXQgb3VyIGN1c3RvbVxuICAgIC8vIGV2YWxDb21tYW5kIGZ1bmN0aW9uIGNhbiB3cmFwIHJlY292ZXJhYmxlIGVycm9ycyBwcm9wZXJseS5cbiAgICByZXBsLmV2YWwoXG4gICAgICBcIntcIiwgbnVsbCwgXCI8bWV0ZW9yIHNoZWxsPlwiLFxuICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIC8vIENhcHR1cmUgdGhlIFJlY292ZXJhYmxlIGVycm9yIGNvbnN0cnVjdG9yLlxuICAgICAgICByZXBsLl9SZWNvdmVyYWJsZUVycm9yID0gZXJyb3IgJiYgZXJyb3IuY29uc3RydWN0b3I7XG5cbiAgICAgICAgLy8gTm93IHNldCByZXBsLmV2YWwgdG8gdGhlIGFjdHVhbCBldmFsQ29tbWFuZCBmdW5jdGlvbiB0aGF0IHdlIHdhbnRcbiAgICAgICAgLy8gdG8gdXNlLCBib3VuZCB0byByZXBsLl9kb21haW4gaWYgbmVjZXNzYXJ5LlxuICAgICAgICByZXBsLmV2YWwgPSByZXBsLl9kb21haW5cbiAgICAgICAgICA/IHJlcGwuX2RvbWFpbi5iaW5kKGV2YWxDb21tYW5kKVxuICAgICAgICAgIDogZXZhbENvbW1hbmQ7XG5cbiAgICAgICAgLy8gVGVybWluYXRlIHRoZSBwYXJ0aWFsIGV2YWx1YXRpb24gb2YgdGhlIHsgY29tbWFuZC5cbiAgICAgICAgcmVwbC5jb21tYW5kc1tcImJyZWFrXCJdLmFjdGlvbi5jYWxsKHJlcGwpO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICAvLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyBhIHBlcnNpc3RlbnQgaGlzdG9yeSBvZiBzaGVsbCBjb21tYW5kcyB0byBiZSBzYXZlZFxuICAvLyB0byBhbmQgbG9hZGVkIGZyb20gLm1ldGVvci9sb2NhbC9zaGVsbC1oaXN0b3J5LlxuICBpbml0aWFsaXplSGlzdG9yeSgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJsaSA9IHNlbGYucmVwbC5ybGk7XG4gICAgdmFyIGhpc3RvcnlGaWxlID0gZ2V0SGlzdG9yeUZpbGUoc2VsZi5zaGVsbERpcik7XG4gICAgdmFyIGhpc3RvcnlGZCA9IGZzLm9wZW5TeW5jKGhpc3RvcnlGaWxlLCBcImErXCIpO1xuICAgIHZhciBoaXN0b3J5TGluZXMgPSBmcy5yZWFkRmlsZVN5bmMoaGlzdG9yeUZpbGUsIFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgc2VlbkxpbmVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGlmICghIHJsaS5oaXN0b3J5KSB7XG4gICAgICBybGkuaGlzdG9yeSA9IFtdO1xuICAgICAgcmxpLmhpc3RvcnlJbmRleCA9IC0xO1xuICAgIH1cblxuICAgIHdoaWxlIChybGkuaGlzdG9yeSAmJiBoaXN0b3J5TGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGxpbmUgPSBoaXN0b3J5TGluZXMucG9wKCk7XG4gICAgICBpZiAobGluZSAmJiAvXFxTLy50ZXN0KGxpbmUpICYmICEgc2VlbkxpbmVzW2xpbmVdKSB7XG4gICAgICAgIHJsaS5oaXN0b3J5LnB1c2gobGluZSk7XG4gICAgICAgIHNlZW5MaW5lc1tsaW5lXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmxpLmFkZExpc3RlbmVyKFwibGluZVwiLCBmdW5jdGlvbihsaW5lKSB7XG4gICAgICBpZiAoaGlzdG9yeUZkID49IDAgJiYgL1xcUy8udGVzdChsaW5lKSkge1xuICAgICAgICBmcy53cml0ZVN5bmMoaGlzdG9yeUZkLCBsaW5lICsgXCJcXG5cIik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzZWxmLnJlcGwub24oXCJleGl0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgZnMuY2xvc2VTeW5jKGhpc3RvcnlGZCk7XG4gICAgICBoaXN0b3J5RmQgPSAtMTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkSlNPTkZyb21TdHJlYW0oaW5wdXRTdHJlYW0sIGNhbGxiYWNrKSB7XG4gIHZhciBvdXRwdXRTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoO1xuICB2YXIgZGF0YVNvRmFyID0gXCJcIjtcblxuICBmdW5jdGlvbiBvbkRhdGEoYnVmZmVyKSB7XG4gICAgdmFyIGxpbmVzID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcblxuICAgIHdoaWxlIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBkYXRhU29GYXIgKz0gbGluZXMuc2hpZnQoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKGRhdGFTb0Zhcik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZpbmlzaChlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG91dHB1dFN0cmVhbS53cml0ZShsaW5lcy5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cblxuICAgICAgaW5wdXRTdHJlYW0ucGlwZShvdXRwdXRTdHJlYW0pO1xuXG4gICAgICByZXR1cm4gZmluaXNoKG51bGwsIGpzb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2xvc2UoKSB7XG4gICAgZmluaXNoKG5ldyBFcnJvcihcInN0cmVhbSB1bmV4cGVjdGVkbHkgY2xvc2VkXCIpKTtcbiAgfVxuXG4gIHZhciBmaW5pc2hlZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBmaW5pc2goZXJyb3IsIGpzb24pIHtcbiAgICBpZiAoISBmaW5pc2hlZCkge1xuICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgaW5wdXRTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJkYXRhXCIsIG9uRGF0YSk7XG4gICAgICBpbnB1dFN0cmVhbS5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsIGZpbmlzaCk7XG4gICAgICBpbnB1dFN0cmVhbS5yZW1vdmVMaXN0ZW5lcihcImNsb3NlXCIsIG9uQ2xvc2UpO1xuICAgICAgY2FsbGJhY2soZXJyb3IsIGpzb24sIG91dHB1dFN0cmVhbSk7XG4gICAgfVxuICB9XG5cbiAgaW5wdXRTdHJlYW0ub24oXCJkYXRhXCIsIG9uRGF0YSk7XG4gIGlucHV0U3RyZWFtLm9uKFwiZXJyb3JcIiwgZmluaXNoKTtcbiAgaW5wdXRTdHJlYW0ub24oXCJjbG9zZVwiLCBvbkNsb3NlKTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5mb0ZpbGUoc2hlbGxEaXIpIHtcbiAgcmV0dXJuIHBhdGguam9pbihzaGVsbERpciwgXCJpbmZvLmpzb25cIik7XG59XG5cbmZ1bmN0aW9uIGdldEhpc3RvcnlGaWxlKHNoZWxsRGlyKSB7XG4gIHJldHVybiBwYXRoLmpvaW4oc2hlbGxEaXIsIFwiaGlzdG9yeVwiKTtcbn1cblxuLy8gU2hlbGwgY29tbWFuZHMgbmVlZCB0byBiZSBleGVjdXRlZCBpbiBhIEZpYmVyIGluIGNhc2UgdGhleSBjYWxsIGludG9cbi8vIGNvZGUgdGhhdCB5aWVsZHMuIFVzaW5nIGEgUHJvbWlzZSBpcyBhbiBldmVuIGJldHRlciBpZGVhLCBzaW5jZSBpdCBydW5zXG4vLyBpdHMgY2FsbGJhY2tzIGluIEZpYmVycyBkcmF3biBmcm9tIGEgcG9vbCwgc28gdGhlIEZpYmVycyBhcmUgcmVjeWNsZWQuXG52YXIgZXZhbENvbW1hbmRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbmZ1bmN0aW9uIGV2YWxDb21tYW5kKGNvbW1hbmQsIGNvbnRleHQsIGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICB2YXIgcmVwbCA9IHRoaXM7XG5cbiAgZnVuY3Rpb24gd3JhcEVycm9ySWZSZWNvdmVyYWJsZShlcnJvcikge1xuICAgIGlmIChyZXBsLl9SZWNvdmVyYWJsZUVycm9yICYmXG4gICAgICAgIGlzUmVjb3ZlcmFibGVFcnJvcihlcnJvciwgcmVwbCkpIHtcbiAgICAgIHJldHVybiBuZXcgcmVwbC5fUmVjb3ZlcmFibGVFcnJvcihlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBpZiAoUGFja2FnZS5lY21hc2NyaXB0KSB7XG4gICAgdmFyIG5vUGFyZW5zID0gc3RyaXBQYXJlbnMoY29tbWFuZCk7XG4gICAgaWYgKG5vUGFyZW5zICE9PSBjb21tYW5kKSB7XG4gICAgICB2YXIgY2xhc3NNYXRjaCA9IC9eXFxzKmNsYXNzXFxzKyhcXHcrKS8uZXhlYyhub1BhcmVucyk7XG4gICAgICBpZiAoY2xhc3NNYXRjaCAmJiBjbGFzc01hdGNoWzFdICE9PSBcImV4dGVuZHNcIikge1xuICAgICAgICAvLyBJZiB0aGUgY29tbWFuZCBsb29rcyBsaWtlIGEgbmFtZWQgRVMyMDE1IGNsYXNzLCB3ZSByZW1vdmUgdGhlXG4gICAgICAgIC8vIGV4dHJhIGxheWVyIG9mIHBhcmVudGhlc2VzIGFkZGVkIGJ5IHRoZSBSRVBMIHNvIHRoYXQgdGhlXG4gICAgICAgIC8vIGNvbW1hbmQgd2lsbCBiZSBldmFsdWF0ZWQgYXMgYSBjbGFzcyBkZWNsYXJhdGlvbiByYXRoZXIgdGhhbiBhc1xuICAgICAgICAvLyBhIG5hbWVkIGNsYXNzIGV4cHJlc3Npb24uIE5vdGUgdGhhdCB5b3UgY2FuIHN0aWxsIHR5cGUgKGNsYXNzIEFcbiAgICAgICAgLy8ge30pIGV4cGxpY2l0bHkgdG8gZXZhbHVhdGUgYSBuYW1lZCBjbGFzcyBleHByZXNzaW9uLiBUaGUgUkVQTFxuICAgICAgICAvLyBjb2RlIHRoYXQgY2FsbHMgZXZhbENvbW1hbmQgaGFuZGxlcyBuYW1lZCBmdW5jdGlvbiBleHByZXNzaW9uc1xuICAgICAgICAvLyBzaW1pbGFybHkgKGZpcnN0IHdpdGggYW5kIHRoZW4gd2l0aG91dCBwYXJlbnRoZXNlcyksIGJ1dCB0aGF0XG4gICAgICAgIC8vIGNvZGUgZG9lc24ndCBrbm93IGFib3V0IEVTMjAxNSBjbGFzc2VzLCB3aGljaCBpcyB3aHkgd2UgaGF2ZSB0b1xuICAgICAgICAvLyBoYW5kbGUgdGhlbSBoZXJlLlxuICAgICAgICBjb21tYW5kID0gbm9QYXJlbnM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbW1hbmQgPSBQYWNrYWdlLmVjbWFzY3JpcHQuRUNNQVNjcmlwdC5jb21waWxlRm9yU2hlbGwoY29tbWFuZCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNhbGxiYWNrKHdyYXBFcnJvcklmUmVjb3ZlcmFibGUoZXJyb3IpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICB0cnkge1xuICAgIHZhciBzY3JpcHQgPSBuZXcgdm0uU2NyaXB0KGNvbW1hbmQsIHtcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgIGRpc3BsYXlFcnJvcnM6IGZhbHNlXG4gICAgfSk7XG4gIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICBjYWxsYmFjayh3cmFwRXJyb3JJZlJlY292ZXJhYmxlKHBhcnNlRXJyb3IpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBldmFsQ29tbWFuZFByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHJlcGwuaW5wdXQpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHNjcmlwdC5ydW5JblRoaXNDb250ZXh0KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiByZXBsIGRpZG4ndCBzdGFydCwgYHJlcXVpcmVgIGFuZCBgbW9kdWxlYCBhcmUgbm90IHZpc2libGVcbiAgICAgIC8vIGluIHRoZSB2bSBjb250ZXh0LlxuICAgICAgc2V0UmVxdWlyZUFuZE1vZHVsZShnbG9iYWwpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgc2NyaXB0LnJ1bkluVGhpc0NvbnRleHQoKSk7XG4gICAgfVxuICB9KS5jYXRjaChjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHN0cmlwUGFyZW5zKGNvbW1hbmQpIHtcbiAgaWYgKGNvbW1hbmQuY2hhckF0KDApID09PSBcIihcIiAmJlxuICAgICAgY29tbWFuZC5jaGFyQXQoY29tbWFuZC5sZW5ndGggLSAxKSA9PT0gXCIpXCIpIHtcbiAgICByZXR1cm4gY29tbWFuZC5zbGljZSgxLCBjb21tYW5kLmxlbmd0aCAtIDEpO1xuICB9XG4gIHJldHVybiBjb21tYW5kO1xufVxuXG4vLyBUaGUgYmFpbE9uSWxsZWdhbFRva2VuIGFuZCBpc1JlY292ZXJhYmxlRXJyb3IgZnVuY3Rpb25zIGFyZSB0YWtlbiBmcm9tXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi9jOWU2NzBlYTJhL2xpYi9yZXBsLmpzI0wxMjI3LUwxMjUzXG5mdW5jdGlvbiBiYWlsT25JbGxlZ2FsVG9rZW4ocGFyc2VyKSB7XG4gIHJldHVybiBwYXJzZXIuX2xpdGVyYWwgPT09IG51bGwgJiZcbiAgICAhIHBhcnNlci5ibG9ja0NvbW1lbnQgJiZcbiAgICAhIHBhcnNlci5yZWdFeHBMaXRlcmFsO1xufVxuXG4vLyBJZiB0aGUgZXJyb3IgaXMgdGhhdCB3ZSd2ZSB1bmV4cGVjdGVkbHkgZW5kZWQgdGhlIGlucHV0LFxuLy8gdGhlbiBsZXQgdGhlIHVzZXIgdHJ5IHRvIHJlY292ZXIgYnkgYWRkaW5nIG1vcmUgaW5wdXQuXG5mdW5jdGlvbiBpc1JlY292ZXJhYmxlRXJyb3IoZSwgcmVwbCkge1xuICBpZiAoZSAmJiBlLm5hbWUgPT09ICdTeW50YXhFcnJvcicpIHtcbiAgICB2YXIgbWVzc2FnZSA9IGUubWVzc2FnZTtcbiAgICBpZiAobWVzc2FnZSA9PT0gJ1VudGVybWluYXRlZCB0ZW1wbGF0ZSBsaXRlcmFsJyB8fFxuICAgICAgICBtZXNzYWdlID09PSAnTWlzc2luZyB9IGluIHRlbXBsYXRlIGV4cHJlc3Npb24nKSB7XG4gICAgICByZXBsLl9pblRlbXBsYXRlTGl0ZXJhbCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS5zdGFydHNXaXRoKCdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcpIHx8XG4gICAgICAgIG1lc3NhZ2Uuc3RhcnRzV2l0aCgnbWlzc2luZyApIGFmdGVyIGFyZ3VtZW50IGxpc3QnKSB8fFxuICAgICAgICBtZXNzYWdlLnN0YXJ0c1dpdGgoJ1VuZXhwZWN0ZWQgdG9rZW4nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UgPT09ICdJbnZhbGlkIG9yIHVuZXhwZWN0ZWQgdG9rZW4nKSB7XG4gICAgICByZXR1cm4gISBiYWlsT25JbGxlZ2FsVG9rZW4ocmVwbC5saW5lUGFyc2VyKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNldFJlcXVpcmVBbmRNb2R1bGUoY29udGV4dCkge1xuICBpZiAoUGFja2FnZS5tb2R1bGVzKSB7XG4gICAgLy8gVXNlIHRoZSBzYW1lIGByZXF1aXJlYCBmdW5jdGlvbiBhbmQgYG1vZHVsZWAgb2JqZWN0IHZpc2libGUgdG8gdGhlXG4gICAgLy8gYXBwbGljYXRpb24uXG4gICAgdmFyIHRvQmVJbnN0YWxsZWQgPSB7fTtcbiAgICB2YXIgc2hlbGxNb2R1bGVOYW1lID0gXCJtZXRlb3Itc2hlbGwtXCIgK1xuICAgICAgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyBcIi5qc1wiO1xuXG4gICAgdG9CZUluc3RhbGxlZFtzaGVsbE1vZHVsZU5hbWVdID0gZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAgICAgY29udGV4dC5tb2R1bGUgPSBtb2R1bGU7XG4gICAgICBjb250ZXh0LnJlcXVpcmUgPSByZXF1aXJlO1xuXG4gICAgICAvLyBUYWIgY29tcGxldGlvbiBzb21ldGltZXMgdXNlcyByZXF1aXJlLmV4dGVuc2lvbnMsIGJ1dCBvbmx5IGZvclxuICAgICAgLy8gdGhlIGtleXMuXG4gICAgICByZXF1aXJlLmV4dGVuc2lvbnMgPSB7XG4gICAgICAgIFwiLmpzXCI6IHRydWUsXG4gICAgICAgIFwiLmpzb25cIjogdHJ1ZSxcbiAgICAgICAgXCIubm9kZVwiOiB0cnVlLFxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gVGhpcyBwb3B1bGF0ZXMgcmVwbC5jb250ZXh0Lnttb2R1bGUscmVxdWlyZX0gYnkgZXZhbHVhdGluZyB0aGVcbiAgICAvLyBtb2R1bGUgZGVmaW5lZCBhYm92ZS5cbiAgICBQYWNrYWdlLm1vZHVsZXMubWV0ZW9ySW5zdGFsbCh0b0JlSW5zdGFsbGVkKShcIi4vXCIgKyBzaGVsbE1vZHVsZU5hbWUpO1xuICB9XG59XG4iXX0=
