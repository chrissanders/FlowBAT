(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

share.User = (function() {
  function User(doc) {
    var _ref, _ref1;
    _.extend(this, doc);
    this.email = (_ref = this.emails) != null ? (_ref1 = _ref[0]) != null ? _ref1.address : void 0 : void 0;
    this.name = this.profile.name;
    this.firstName = this.name.split(' ').slice(0, 1).join(' ');
    this.lastName = this.name.split(' ').slice(1).join(' ');
  }

  return User;

})();

share.Config = (function() {
  function Config(doc) {
    _.extend(this, doc);
  }

  Config.prototype.wrapCommand = function(command) {
    return "ssh " + this.getSSHOptions() + " -p " + this.port + " " + this.user + "@" + this.host + " \"" + command + "\"";
  };

  Config.prototype.getSSHOptions = function() {
    return "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -i " + this.getIdentityFile();
  };

  Config.prototype.getIdentityFile = function() {
    if (this.identityFile) {
      return this.identityFile;
    } else {
      return process.env.PWD + "/settings/identity";
    }
  };

  return Config;

})();

share.Query = (function() {
  function Query(doc) {
    var distinctRegex, filteredHeader, index, m, name, parsedResult, parsedRow, parsedValue, rawHeader, row, spec, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1;
    _.extend(this, doc);
    this.header = [];
    this.rows = [];
    if (this.result) {
      parsedResult = share.parseResult(this.result);
      if (this.output === "rwstats") {
        parsedResult.shift();
        parsedResult.shift();
      }
      if (this.output === "rwcount") {
        parsedResult.unshift(share.rwcountFields);
      }
      rawHeader = parsedResult.shift();
      for (_i = 0, _len = rawHeader.length; _i < _len; _i++) {
        name = rawHeader[_i];
        spec = {
          _id: name,
          name: name.trim(),
          isDistinct: false,
          isPercentage: false
        };
        if (spec.name.indexOf("%") === 0) {
          spec.isPercentage = true;
          spec.name = spec.name.substr(1);
        }
        distinctRegex = /-D.*$/i;
        if (spec.name.match(distinctRegex)) {
          spec.isDistinct = true;
          spec.name = spec.name.replace(distinctRegex, "");
        }
        if (spec.isDistinct) {
          spec.chartType = "number";
        } else {
          spec.chartType = share.chartFieldTypes[spec.name] || "string";
        }
        this.header.push(spec);
      }
      if (this.presentation === "chart") {
        for (_j = 0, _len1 = parsedResult.length; _j < _len1; _j++) {
          parsedRow = parsedResult[_j];
          row = [];
          for (index = _k = 0, _len2 = parsedRow.length; _k < _len2; index = ++_k) {
            parsedValue = parsedRow[index];
            spec = this.header[index];
            if (this.output === "rwcount" && (_ref = spec.name, __indexOf.call(this.rwcountFields, _ref) < 0)) {
              continue;
            }
            switch (spec.chartType) {
              case "number":
                parsedValue = parseFloat(parsedValue);
                break;
              case "date":
              case "datetime":
                m = moment.utc(parsedValue, "YYYY/MM/DDTHH:mm:ss.SSS");
                parsedValue = m.toDate();
            }
            row.push(parsedValue);
          }
          this.rows.push(row);
        }
      } else {
        for (_l = 0, _len3 = parsedResult.length; _l < _len3; _l++) {
          parsedRow = parsedResult[_l];
          row = [];
          for (index = _m = 0, _len4 = parsedRow.length; _m < _len4; index = ++_m) {
            parsedValue = parsedRow[index];
            spec = this.header[index];
            row.push({
              _id: spec._id,
              value: parsedValue,
              queryId: this._id
            });
          }
          this.rows.push(row);
        }
      }
      filteredHeader = [];
      _ref1 = this.header;
      for (_n = 0, _len5 = _ref1.length; _n < _len5; _n++) {
        spec = _ref1[_n];
        filteredHeader.push(spec);
      }
      this.header = filteredHeader;
    }
  }

  Query.prototype.displayName = function() {
    if (this.isQuick) {
      return "Quick query #" + this._id;
    } else {
      return this.name || "#" + this._id;
    }
  };

  Query.prototype.inputCommand = function(config, profile, isPresentation) {
    var command, exclusion, pcapFile, pcapFileValidate, rwFileValidate, typeValidate, _i, _len, _ref;
    if (isPresentation == null) {
      isPresentation = false;
    }
    command = "rwfilter";
    command += " " + this.inputOptions(config);
    if (this["interface"] === "cmd") {
      typeValidate = command.search(RegExp('--type', 'i'));
      if (typeValidate < 0) {
        command += " --type=all ";
      }
    }
    if (config.siteConfigFile) {
      command += " --site-config-file=" + config.siteConfigFile;
    }
    rwFileValidate = command.search(RegExp(' (\\/|\\w)+(\\/|\\w|\\-)*\\.(rwf|rw)', 'i'));
    if (rwFileValidate < 0) {
      pcapFileValidate = command.search(RegExp(' (\\/|\\w)+(\\/|\\w|\\-)*\\.(pcap)', 'i'));
      if (pcapFileValidate >= 0) {
        pcapFile = command.match(RegExp('(\\/|\\w)+(\\/|\\w|\\-)*\\.(pcap)', 'i'));
        command += " --input-pipe=stdin";
        command = command.replace(pcapFile[0], "");
        command = "rwp2yaf2silk --in=" + pcapFile[0] + " --out=- |" + command;
      } else {
        if (config.dataRootdir) {
          command += " --data-rootdir=" + config.dataRootdir;
        }
      }
    }
    command += " --pass=stdout";
    _ref = this.inputExclusions();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      exclusion = _ref[_i];
      command += " | rwfilter --input-pipe=stdin";
      command += " " + exclusion;
      if (config.siteConfigFile) {
        command += " --site-config-file=" + config.siteConfigFile;
      }
      command += " --fail=stdout";
    }
    command += " > " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
    if (config.isSSH && !isPresentation) {
      command = config.wrapCommand(command);
    }
    return command;
  };

  Query.prototype.inputOptions = function(config) {
    var eTimeMoment, parameters, sTimeMoment, startDateOffsetNumber, string, value;
    if (this["interface"] === "builder") {
      parameters = [];
      if (this.typesEnabled && this.types.length && _.difference(share.queryTypes, this.types).length) {
        value = this.types.join(",");
      } else {
        value = "all";
      }
      parameters.push("--type=" + value);
      if (this.startDateType === "interval") {
        if (this.startDateEnabled && this.startDate) {
          parameters.push("--start-date=" + this.startDate);
        }
        if (this.endDateEnabled && this.endDate) {
          parameters.push("--end-date=" + this.endDate);
        }
        if (this.activeTimeEnabled && this.activeTime) {
          parameters.push("--active-time=" + this.activeTime);
        }
      } else {
        if (this.startDateOffsetEnabled && this.startDateOffset) {
          startDateOffsetNumber = share.intval(this.startDateOffset);
          eTimeMoment = moment.utc();
          sTimeMoment = eTimeMoment.clone().subtract(startDateOffsetNumber, 'minutes');
          parameters.push("--start-date=" + sTimeMoment.format("YYYY/MM/DD:HH"));
          parameters.push("--end-date=" + eTimeMoment.format("YYYY/MM/DD:HH"));
          parameters.push("--active-time=" + sTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS") + "-" + eTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS"));
        }
      }
      if (this.sensorEnabled && this.sensor) {
        parameters.push("--sensor=" + this.sensor);
      }
      if (this.daddressEnabled && this.daddress) {
        parameters.push("--daddress=" + this.daddress);
      }
      if (this.saddressEnabled && this.saddress) {
        parameters.push("--saddress=" + this.saddress);
      }
      if (this.anyAddressEnabled && this.anyAddress) {
        parameters.push("--any-address=" + this.anyAddress);
      }
      if (this.dipSetEnabled && this.dipSet) {
        parameters.push("--dipset=" + (config.dataTempdir || "/tmp") + "/" + this.dipSet + ".rws");
      }
      if (this.sipSetEnabled && this.sipSet) {
        parameters.push("--sipset=" + (config.dataTempdir || "/tmp") + "/" + this.sipSet + ".rws");
      }
      if (this.anySetEnabled && this.anySet) {
        parameters.push("--anyset=" + (config.dataTempdir || "/tmp") + "/" + this.anySet + ".rws");
      }
      if (this.tupleFileEnabled && this.tupleFile) {
        parameters.push("--tuple-file=" + (config.dataTempdir || "/tmp") + "/" + this.tupleFile + ".tuple");
      }
      if (this.tupleDirectionEnabled && this.tupleDirection) {
        parameters.push("--tuple-direction=" + this.tupleDirection);
      }
      if (this.tupleDelimiterEnabled && this.tupleDelimiter) {
        parameters.push("--tuple-delimiter=" + this.tupleDelimiter);
      }
      if (this.tupleFieldsEnabled && this.tupleFields) {
        parameters.push("--tuple-fields=" + this.tupleFields);
      }
      if (this.dportEnabled && this.dport) {
        parameters.push("--dport=" + this.dport);
      }
      if (this.sportEnabled && this.sport) {
        parameters.push("--sport=" + this.sport);
      }
      if (this.aportEnabled && this.aport) {
        parameters.push("--aport=" + this.aport);
      }
      if (this.dccEnabled && this.dcc.length) {
        parameters.push("--dcc=" + this.dcc.join(","));
      }
      if (this.sccEnabled && this.scc.length) {
        parameters.push("--scc=" + this.scc.join(","));
      }
      if (this.protocolEnabled && this.protocol) {
        parameters.push("--protocol=" + this.protocol);
      }
      if (this.flagsAllEnabled && this.flagsAll) {
        parameters.push("--flags-all=" + this.flagsAll);
      }
      if (this.additionalParametersEnabled && this.additionalParameters) {
        parameters.push(this.additionalParameters);
      }
      string = parameters.join(" ");
    } else {
      string = this.cmd;
    }
    return share.filterOptions(string);
  };

  Query.prototype.inputExclusions = function() {
    var exclusionsCmd;
    exclusionsCmd = "";
    if (this["interface"] === "builder") {
      if (this.additionalExclusionsCmdEnabled) {
        exclusionsCmd = this.additionalExclusionsCmd;
      }
    } else {
      exclusionsCmd = this.exclusionsCmd;
    }
    exclusionsCmd = share.filterOptions(exclusionsCmd);
    return _.compact(exclusionsCmd.split(/\s+(?:OR|\|\|)\s+/i));
  };

  Query.prototype.outputCommand = function(config, profile, isPresentation) {
    if (isPresentation == null) {
      isPresentation = false;
    }
    switch (this.output) {
      case "rwcut":
        return this.outputRwcutCommand(config, profile, isPresentation);
      case "rwstats":
        return this.outputRwstatsCommand(config, profile, isPresentation);
      case "rwcount":
        return this.outputRwcountCommand(config, profile, isPresentation);
    }
  };

  Query.prototype.outputRwcutCommand = function(config, profile, isPresentation) {
    var command, commands, rwcutOptions, rwcutOptionsString, rwsortOptions, rwsortOptionsString;
    if (isPresentation == null) {
      isPresentation = false;
    }
    commands = [];
    if (this.sortField) {
      rwsortOptions = ["--fields=" + this.sortField];
      if (this.sortReverse) {
        rwsortOptions.push("--reverse");
      }
      if (config.siteConfigFile) {
        rwsortOptions.push("--site-config-file=" + config.siteConfigFile);
      }
      rwsortOptionsString = rwsortOptions.join(" ");
      rwsortOptionsString = share.filterOptions(rwsortOptionsString);
      commands.push("rwsort " + rwsortOptionsString);
    }
    rwcutOptions = ["--num-recs=" + profile.numRecs, "--start-rec-num=" + this.startRecNum, "--delimited"];
    if (this.fields.length) {
      rwcutOptions.push("--fields=" + _.intersection(this.fieldsOrder, this.fields).join(","));
    }
    if (config.siteConfigFile) {
      rwcutOptions.push("--site-config-file=" + config.siteConfigFile);
    }
    rwcutOptionsString = rwcutOptions.join(" ");
    rwcutOptionsString = share.filterOptions(rwcutOptionsString);
    commands.push("rwcut " + rwcutOptionsString);
    commands[0] += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
    command = commands.join(" | ");
    if (config.isSSH && !isPresentation) {
      command = config.wrapCommand(command);
    }
    return command;
  };

  Query.prototype.outputRwstatsCommand = function(config, profile, isPresentation) {
    var command, defaultRwstatsOptions, index, rwstatsOptions, rwstatsOptionsString, rwstatsValues, rwstatsValuesOrder, value, values, _i, _len, _ref;
    if (isPresentation == null) {
      isPresentation = false;
    }
    defaultRwstatsOptions = ["--delimited"];
    if (this["interface"] === "builder") {
      rwstatsOptions = defaultRwstatsOptions;
      if (this.rwstatsFields.length) {
        rwstatsOptions.push("--fields=" + _.intersection(this.rwstatsFieldsOrder, this.rwstatsFields).join(","));
      }
      rwstatsValues = this.rwstatsValues.slice(0);
      rwstatsValuesOrder = this.rwstatsValuesOrder.slice(0);
      if (this.rwstatsPrimaryValue) {
        rwstatsValues.unshift(this.rwstatsPrimaryValue);
        rwstatsValuesOrder.unshift(this.rwstatsPrimaryValue);
      }
      if (rwstatsValues.length) {
        values = _.intersection(rwstatsValuesOrder, rwstatsValues);
        for (index = _i = 0, _len = values.length; _i < _len; index = ++_i) {
          value = values[index];
          if (__indexOf.call(share.rwstatsValues, value) < 0) {
            values[index] = "distinct:" + value;
          }
        }
        rwstatsOptions.push("--values=" + values.join(","));
        if (_ref = values[0], __indexOf.call(share.rwstatsValues, _ref) < 0) {
          rwstatsOptions.push("--no-percents");
        }
      }
      rwstatsOptions.push("--" + this.rwstatsDirection);
      switch (this.rwstatsMode) {
        case "count":
          rwstatsOptions.push("--count=" + this.rwstatsCountModeValue);
          break;
        case "threshold":
          rwstatsOptions.push("--threshold=" + this.rwstatsThresholdModeValue);
          break;
        case "percentage":
          rwstatsOptions.push("--percentage=" + this.rwstatsPercentageModeValue);
      }
      if (this.rwstatsBinTimeEnabled) {
        if (this.rwstatsBinTime) {
          rwstatsOptions.push("--bin-time=" + this.rwstatsBinTime);
        } else {
          rwstatsOptions.push("--bin-time");
        }
      }
      if (config.siteConfigFile) {
        rwstatsOptions.push("--site-config-file=" + config.siteConfigFile);
      }
      rwstatsOptionsString = rwstatsOptions.join(" ");
    } else {
      rwstatsOptionsString = this.rwstatsCmd + " " + defaultRwstatsOptions.join(" ");
      rwstatsOptionsString = share.filterOptions(rwstatsOptionsString);
    }
    command = "rwstats " + rwstatsOptionsString;
    command += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
    if (config.isSSH && !isPresentation) {
      command = config.wrapCommand(command);
    }
    return command;
  };

  Query.prototype.outputRwcountCommand = function(config, profile, isPresentation) {
    var command, defaultRwcountOptions, fieldIndex, headCommand, headOptions, rwcountOptions, rwcountOptionsString, sortCommand, sortOptions, tailCommand, tailOptions;
    if (isPresentation == null) {
      isPresentation = false;
    }
    defaultRwcountOptions = ["--delimited", "--no-titles"];
    if (this["interface"] === "builder") {
      rwcountOptions = defaultRwcountOptions;
      if (this.rwcountBinSizeEnabled) {
        rwcountOptions.push("--bin-size=" + this.rwcountBinSize);
      }
      if (this.rwcountLoadSchemeEnabled) {
        rwcountOptions.push("--load-scheme=" + this.rwcountLoadScheme);
      }
      if (this.rwcountSkipZeroes) {
        rwcountOptions.push("--skip-zeroes");
      }
      if (config.siteConfigFile) {
        rwcountOptions.push("--site-config-file=" + config.siteConfigFile);
      }
      rwcountOptionsString = rwcountOptions.join(" ");
    } else {
      rwcountOptionsString = this.rwcountCmd + " " + defaultRwcountOptions.join(" ");
    }
    rwcountOptionsString = share.filterOptions(rwcountOptionsString);
    command = "rwcount " + rwcountOptionsString;
    command += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
    if (this.presentation === "table") {
      if (this.sortField) {
        fieldIndex = share.rwcountFields.indexOf(this.sortField);
        sortOptions = "--field-separator=\\\| --key=+" + (fieldIndex + 1) + "n" + (this.sortReverse ? "r" : "");
        sortOptions = share.filterOptions(sortOptions, "\\\\\\|\\+");
        sortCommand = "sort " + sortOptions;
        command += " | " + sortCommand;
      }
      if (profile.numRecs) {
        headOptions = "--lines=" + (this.startRecNum + profile.numRecs - 1);
        headOptions = share.filterOptions(headOptions);
        headCommand = "head " + headOptions;
        tailOptions = "--lines=" + profile.numRecs;
        tailOptions = share.filterOptions(tailOptions);
        tailCommand = "tail " + tailOptions;
        command += " | " + headCommand + " | " + tailCommand;
      }
    }
    if (config.isSSH && !isPresentation) {
      command = config.wrapCommand(command);
    }
    return command;
  };

  Query.prototype.rwstatsCountModeValueIsEnabled = function() {
    return this.rwstatsMode === "count";
  };

  Query.prototype.rwstatsThresholdModeValueIsEnabled = function() {
    return this.rwstatsMode === "threshold";
  };

  Query.prototype.rwstatsPercentageModeValueIsEnabled = function() {
    return this.rwstatsMode === "percentage";
  };

  Query.prototype.availableChartTypes = function() {
    return share.availableChartTypes[this.output];
  };

  Query.prototype.path = function() {
    return "/query/" + this._id;
  };

  return Query;

})();

share.IPSet = (function() {
  function IPSet(doc) {
    _.extend(this, doc);
  }

  IPSet.prototype.displayName = function() {
    return this.name || "#" + this._id;
  };

  IPSet.prototype.objectSelectName = function() {
    return this.displayName();
  };

  IPSet.prototype.objectSelectValue = function() {
    return this._id;
  };

  IPSet.prototype.path = function() {
    return "/ipset/" + this._id;
  };

  return IPSet;

})();

share.Tuple = (function() {
  function Tuple(doc) {
    _.extend(this, doc);
  }

  Tuple.prototype.displayName = function() {
    return this.name || "#" + this._id;
  };

  Tuple.prototype.objectSelectName = function() {
    return this.displayName();
  };

  Tuple.prototype.objectSelectValue = function() {
    return this._id;
  };

  Tuple.prototype.path = function() {
    return "/tuple/" + this._id;
  };

  return Tuple;

})();

share.Transformations = {
  user: function(user) {
    if (user instanceof share.User || !user) {
      return user;
    } else {
      return new share.User(user);
    }
  },
  config: function(config) {
    if (config instanceof share.Config || !config) {
      return config;
    } else {
      return new share.Config(config);
    }
  },
  query: function(query) {
    if (query instanceof share.Query || !query) {
      return query;
    } else {
      return new share.Query(query);
    }
  },
  ipset: function(ipset) {
    if (ipset instanceof share.IPSet || !ipset) {
      return ipset;
    } else {
      return new share.IPSet(ipset);
    }
  },
  tuple: function(tuple) {
    if (tuple instanceof share.Tuple || !tuple) {
      return tuple;
    } else {
      return new share.Tuple(tuple);
    }
  }
};

})();

//# sourceMappingURL=transformations.coffee.js.map
