(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/transformations.coffee                                          //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
                                                                       //
// not used by default                                                 // 1
var indexOf = [].indexOf;                                              // 1
                                                                       //
share.User = function () {                                             // 2
  function User(doc) {                                                 // 3
    _classCallCheck(this, User);                                       // 3
                                                                       //
    var ref, ref1;                                                     // 4
                                                                       //
    _.extend(this, doc);                                               // 4
                                                                       //
    this.email = (ref = this.emails) != null ? (ref1 = ref[0]) != null ? ref1.address : void 0 : void 0;
    this.name = this.profile.name;                                     // 6
    this.firstName = this.name.split(' ').slice(0, 1).join(' ');       // 7
    this.lastName = this.name.split(' ').slice(1).join(' ');           // 8
  }                                                                    // 3
                                                                       //
  return User;                                                         // 2
}();                                                                   // 2
                                                                       //
share.Config = function () {                                           // 10
  function Config(doc) {                                               // 11
    _classCallCheck(this, Config);                                     // 11
                                                                       //
    _.extend(this, doc);                                               // 12
  }                                                                    // 11
                                                                       //
  Config.prototype.wrapCommand = function () {                         // 10
    function wrapCommand(command) {                                    // 10
      return "ssh " + this.getSSHOptions() + " -p " + this.port + " " + this.user + "@" + this.host + " \"" + command + "\"";
    }                                                                  // 13
                                                                       //
    return wrapCommand;                                                // 10
  }();                                                                 // 10
                                                                       //
  Config.prototype.getSSHOptions = function () {                       // 10
    function getSSHOptions() {                                         // 10
      return "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -i " + this.getIdentityFile();
    }                                                                  // 15
                                                                       //
    return getSSHOptions;                                              // 10
  }();                                                                 // 10
                                                                       //
  Config.prototype.getIdentityFile = function () {                     // 10
    function getIdentityFile() {                                       // 10
      if (this.identityFile) {                                         // 18
        return this.identityFile;                                      // 31
      } else {                                                         // 18
        return process.env.PWD + "/settings/identity";                 // 33
      }                                                                // 34
    }                                                                  // 17
                                                                       //
    return getIdentityFile;                                            // 10
  }();                                                                 // 10
                                                                       //
  return Config;                                                       // 10
}();                                                                   // 10
                                                                       //
share.Query = function () {                                            // 20
  function Query(doc) {                                                // 21
    _classCallCheck(this, Query);                                      // 21
                                                                       //
    var distinctRegex, filteredHeader, i, index, j, k, l, len, len1, len2, len3, len4, len5, m, n, name, o, parsedResult, parsedRow, parsedValue, rawHeader, ref, ref1, row, spec;
                                                                       //
    _.extend(this, doc);                                               // 22
                                                                       //
    this.header = [];                                                  // 23
    this.rows = [];                                                    // 24
                                                                       //
    if (this.result) {                                                 // 25
      parsedResult = share.parseResult(this.result);                   // 26
                                                                       //
      if (this.output === "rwstats") {                                 // 27
        parsedResult.shift();                                          // 28
        parsedResult.shift();                                          // 29
      } // shift-shift outta here, you redundant rows                  // 26
                                                                       //
                                                                       //
      if (this.output === "rwcount") {                                 // 31
        parsedResult.unshift(share.rwcountFields);                     // 32
      }                                                                // 54
                                                                       //
      rawHeader = parsedResult.shift();                                // 33
                                                                       //
      for (i = 0, len = rawHeader.length; i < len; i++) {              // 34
        name = rawHeader[i];                                           // 57
        spec = {                                                       // 35
          _id: name,                                                   // 36
          name: name.trim(),                                           // 37
          isDistinct: false,                                           // 38
          isPercentage: false                                          // 39
        };                                                             // 36
                                                                       //
        if (spec.name.indexOf("%") === 0) {                            // 40
          spec.isPercentage = true;                                    // 41
          spec.name = spec.name.substr(1);                             // 42
        }                                                              // 67
                                                                       //
        distinctRegex = /-D.*$/i;                                      // 43
                                                                       //
        if (spec.name.match(distinctRegex)) {                          // 44
          spec.isDistinct = true;                                      // 45
          spec.name = spec.name.replace(distinctRegex, "");            // 46
        }                                                              // 72
                                                                       //
        if (spec.isDistinct) {                                         // 47
          spec.chartType = "number";                                   // 48
        } else {                                                       // 47
          spec.chartType = share.chartFieldTypes[spec.name] || "string";
        }                                                              // 77
                                                                       //
        this.header.push(spec);                                        // 51
      }                                                                // 34
                                                                       //
      if (this.presentation === "chart") {                             // 52
        for (j = 0, len1 = parsedResult.length; j < len1; j++) {       // 53
          parsedRow = parsedResult[j];                                 // 82
          row = [];                                                    // 54
                                                                       //
          for (index = k = 0, len2 = parsedRow.length; k < len2; index = ++k) {
            parsedValue = parsedRow[index];                            // 85
            spec = this.header[index];                                 // 56
                                                                       //
            if (this.output === "rwcount" && (ref = spec.name, indexOf.call(this.rwcountFields, ref) < 0)) {
              continue;                                                // 58
            }                                                          // 89
                                                                       //
            switch (spec.chartType) {                                  // 59
              case "number":                                           // 59
                parsedValue = parseFloat(parsedValue);                 // 61
                break;                                                 // 60
                                                                       //
              case "date":                                             // 59
              case "datetime":                                         // 59
                m = moment.utc(parsedValue, "YYYY/MM/DDTHH:mm:ss.SSS");
                parsedValue = m.toDate();                              // 64
            }                                                          // 59
                                                                       //
            row.push(parsedValue);                                     // 65
          }                                                            // 55
                                                                       //
          this.rows.push(row);                                         // 66
        }                                                              // 52
      } else {                                                         // 52
        for (l = 0, len3 = parsedResult.length; l < len3; l++) {       // 68
          parsedRow = parsedResult[l];                                 // 105
          row = [];                                                    // 69
                                                                       //
          for (index = n = 0, len4 = parsedRow.length; n < len4; index = ++n) {
            parsedValue = parsedRow[index];                            // 108
            spec = this.header[index];                                 // 71
            row.push({                                                 // 72
              _id: spec._id,                                           // 72
              value: parsedValue,                                      // 72
              queryId: this._id                                        // 72
            });                                                        // 72
          }                                                            // 70
                                                                       //
          this.rows.push(row);                                         // 73
        }                                                              // 52
      }                                                                // 118
                                                                       //
      filteredHeader = [];                                             // 74
      ref1 = this.header;                                              // 75
                                                                       //
      for (o = 0, len5 = ref1.length; o < len5; o++) {                 // 75
        spec = ref1[o];                                                // 122
        filteredHeader.push(spec);                                     // 76
      }                                                                // 75
                                                                       //
      this.header = filteredHeader;                                    // 77
    }                                                                  // 126
  }                                                                    // 21
                                                                       //
  Query.prototype.displayName = function () {                          // 20
    function displayName() {                                           // 20
      if (this.isQuick) {                                              // 79
        return "Quick query #" + this._id;                             // 131
      } else {                                                         // 79
        return this.name || "#" + this._id;                            // 133
      }                                                                // 134
    }                                                                  // 78
                                                                       //
    return displayName;                                                // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.inputCommand = function () {                         // 20
    function inputCommand(config, profile) {                           // 20
      var isPresentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var command, exclusion, i, len, pcapFile, pcapFileValidate, ref, rwFileValidate, typeValidate;
      command = "rwfilter";                                            // 81
      command += " " + this.inputOptions(config); // defaults to having --type=all as the standard instead of the SiLK default.
                                                                       //
      if (this.interface === "cmd") {                                  // 84
        typeValidate = command.search(RegExp('--type', 'i'));          // 85
                                                                       //
        if (typeValidate < 0) {                                        // 86
          command += " --type=all ";                                   // 87
        }                                                              // 84
      }                                                                // 147
                                                                       //
      if (config.siteConfigFile) {                                     // 88
        command += " --site-config-file=" + config.siteConfigFile;     // 89
      } // rwf and pcap integration                                    // 81
                                                                       //
                                                                       //
      rwFileValidate = command.search(RegExp(' (\\/|\\w)+(\\/|\\w|\\-)*\\.(rwf|rw)', 'i'));
                                                                       //
      if (rwFileValidate < 0) {                                        // 92
        pcapFileValidate = command.search(RegExp(' (\\/|\\w)+(\\/|\\w|\\-)*\\.(pcap)', 'i'));
                                                                       //
        if (pcapFileValidate >= 0) {                                   // 94
          pcapFile = command.match(RegExp('(\\/|\\w)+(\\/|\\w|\\-)*\\.(pcap)', 'i'));
          command += " --input-pipe=stdin";                            // 96
          command = command.replace(pcapFile[0], "");                  // 97
          command = "rwp2yaf2silk --in=" + pcapFile[0] + " --out=- |" + command;
        } else {                                                       // 94
          if (config.dataRootdir) {                                    // 100
            command += " --data-rootdir=" + config.dataRootdir;        // 101
          }                                                            // 94
        }                                                              // 92
      }                                                                // 165
                                                                       //
      command += " --pass=stdout";                                     // 103
      ref = this.inputExclusions();                                    // 104
                                                                       //
      for (i = 0, len = ref.length; i < len; i++) {                    // 104
        exclusion = ref[i];                                            // 169
        command += " | rwfilter --input-pipe=stdin";                   // 105
        command += " " + exclusion;                                    // 106
                                                                       //
        if (config.siteConfigFile) {                                   // 107
          command += " --site-config-file=" + config.siteConfigFile;   // 108
        } // config.dataRootdir shouldn't be used with exclusions      // 105
                                                                       //
                                                                       //
        command += " --fail=stdout";                                   // 110
      }                                                                // 104
                                                                       //
      command += " > " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
                                                                       //
      if (config.isSSH && !isPresentation) {                           // 112
        command = config.wrapCommand(command);                         // 113
      }                                                                // 181
                                                                       //
      return command;                                                  // 182
    }                                                                  // 80
                                                                       //
    return inputCommand;                                               // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.inputOptions = function () {                         // 20
    function inputOptions(config) {                                    // 20
      var eTimeMoment, parameters, sTimeMoment, startDateOffsetNumber, string, value;
                                                                       //
      if (this.interface === "builder") {                              // 116
        parameters = [];                                               // 117
                                                                       //
        if (this.typesEnabled && this.types.length && _.difference(share.queryTypes, this.types).length) {
          value = this.types.join(",");                                // 119
        } else {                                                       // 118
          value = "all";                                               // 121
        }                                                              // 193
                                                                       //
        parameters.push("--type=" + value);                            // 122
                                                                       //
        if (this.startDateType === "interval") {                       // 123
          if (this.startDateEnabled && this.startDate) {               // 124
            parameters.push("--start-date=" + this.startDate);         // 125
          }                                                            // 198
                                                                       //
          if (this.endDateEnabled && this.endDate) {                   // 126
            parameters.push("--end-date=" + this.endDate);             // 127
          }                                                            // 201
                                                                       //
          if (this.activeTimeEnabled && this.activeTime) {             // 128
            parameters.push("--active-time=" + this.activeTime);       // 129
          }                                                            // 123
        } else {                                                       // 123
          if (this.startDateOffsetEnabled && this.startDateOffset) {   // 131
            startDateOffsetNumber = share.intval(this.startDateOffset);
            eTimeMoment = moment.utc();                                // 133
            sTimeMoment = eTimeMoment.clone().subtract(startDateOffsetNumber, 'minutes');
            parameters.push("--start-date=" + sTimeMoment.format("YYYY/MM/DD:HH"));
            parameters.push("--end-date=" + eTimeMoment.format("YYYY/MM/DD:HH"));
            parameters.push("--active-time=" + sTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS") + "-" + eTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS"));
          }                                                            // 123
        }                                                              // 214
                                                                       //
        if (this.sensorEnabled && this.sensor) {                       // 138
          parameters.push("--sensor=" + this.sensor);                  // 139
        }                                                              // 217
                                                                       //
        if (this.daddressEnabled && this.daddress) {                   // 140
          parameters.push("--daddress=" + this.daddress);              // 141
        }                                                              // 220
                                                                       //
        if (this.saddressEnabled && this.saddress) {                   // 142
          parameters.push("--saddress=" + this.saddress);              // 143
        }                                                              // 223
                                                                       //
        if (this.anyAddressEnabled && this.anyAddress) {               // 144
          parameters.push("--any-address=" + this.anyAddress);         // 145
        }                                                              // 226
                                                                       //
        if (this.dipSetEnabled && this.dipSet) {                       // 146
          parameters.push("--dipset=" + (config.dataTempdir || "/tmp") + "/" + this.dipSet + ".rws");
        }                                                              // 229
                                                                       //
        if (this.sipSetEnabled && this.sipSet) {                       // 148
          parameters.push("--sipset=" + (config.dataTempdir || "/tmp") + "/" + this.sipSet + ".rws");
        }                                                              // 232
                                                                       //
        if (this.anySetEnabled && this.anySet) {                       // 150
          parameters.push("--anyset=" + (config.dataTempdir || "/tmp") + "/" + this.anySet + ".rws");
        }                                                              // 235
                                                                       //
        if (this.tupleFileEnabled && this.tupleFile) {                 // 152
          parameters.push("--tuple-file=" + (config.dataTempdir || "/tmp") + "/" + this.tupleFile + ".tuple");
        }                                                              // 238
                                                                       //
        if (this.tupleDirectionEnabled && this.tupleDirection) {       // 154
          parameters.push("--tuple-direction=" + this.tupleDirection);
        }                                                              // 241
                                                                       //
        if (this.tupleDelimiterEnabled && this.tupleDelimiter) {       // 156
          parameters.push("--tuple-delimiter=" + this.tupleDelimiter);
        }                                                              // 244
                                                                       //
        if (this.tupleFieldsEnabled && this.tupleFields) {             // 158
          parameters.push("--tuple-fields=" + this.tupleFields);       // 159
        }                                                              // 247
                                                                       //
        if (this.dportEnabled && this.dport) {                         // 160
          parameters.push("--dport=" + this.dport);                    // 161
        }                                                              // 250
                                                                       //
        if (this.sportEnabled && this.sport) {                         // 162
          parameters.push("--sport=" + this.sport);                    // 163
        }                                                              // 253
                                                                       //
        if (this.aportEnabled && this.aport) {                         // 164
          parameters.push("--aport=" + this.aport);                    // 165
        }                                                              // 256
                                                                       //
        if (this.dccEnabled && this.dcc.length) {                      // 166
          parameters.push("--dcc=" + this.dcc.join(","));              // 167
        }                                                              // 259
                                                                       //
        if (this.sccEnabled && this.scc.length) {                      // 168
          parameters.push("--scc=" + this.scc.join(","));              // 169
        }                                                              // 262
                                                                       //
        if (this.protocolEnabled && this.protocol) {                   // 170
          parameters.push("--protocol=" + this.protocol);              // 171
        }                                                              // 265
                                                                       //
        if (this.flagsAllEnabled && this.flagsAll) {                   // 172
          parameters.push("--flags-all=" + this.flagsAll);             // 173
        }                                                              // 268
                                                                       //
        if (this.additionalParametersEnabled && this.additionalParameters) {
          parameters.push(this.additionalParameters);                  // 175
        }                                                              // 271
                                                                       //
        string = parameters.join(" ");                                 // 176
      } else {                                                         // 116
        string = this.cmd;                                             // 178
      }                                                                // 275
                                                                       //
      return share.filterOptions(string);                              // 276
    }                                                                  // 115
                                                                       //
    return inputOptions;                                               // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.inputExclusions = function () {                      // 20
    function inputExclusions() {                                       // 20
      var exclusionsCmd;                                               // 181
      exclusionsCmd = "";                                              // 181
                                                                       //
      if (this.interface === "builder") {                              // 182
        if (this.additionalExclusionsCmdEnabled) {                     // 183
          exclusionsCmd = this.additionalExclusionsCmd;                // 184
        }                                                              // 182
      } else {                                                         // 182
        exclusionsCmd = this.exclusionsCmd;                            // 186
      }                                                                // 288
                                                                       //
      exclusionsCmd = share.filterOptions(exclusionsCmd);              // 187
      return _.compact(exclusionsCmd.split(/\s+(?:OR|\|\|)\s+/i));     // 290
    }                                                                  // 180
                                                                       //
    return inputExclusions;                                            // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.outputCommand = function () {                        // 20
    function outputCommand(config, profile) {                          // 20
      var isPresentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
                                                                       //
      switch (this.output) {                                           // 190
        case "rwcut":                                                  // 190
          return this.outputRwcutCommand(config, profile, isPresentation);
                                                                       //
        case "rwstats":                                                // 190
          return this.outputRwstatsCommand(config, profile, isPresentation);
                                                                       //
        case "rwcount":                                                // 190
          return this.outputRwcountCommand(config, profile, isPresentation);
      }                                                                // 190
    }                                                                  // 189
                                                                       //
    return outputCommand;                                              // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.outputRwcutCommand = function () {                   // 20
    function outputRwcutCommand(config, profile) {                     // 20
      var isPresentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var command, commands, rwcutOptions, rwcutOptionsString, rwsortOptions, rwsortOptionsString;
      commands = [];                                                   // 198
                                                                       //
      if (this.sortField) {                                            // 199
        rwsortOptions = ["--fields=" + this.sortField];                // 200
                                                                       //
        if (this.sortReverse) {                                        // 201
          rwsortOptions.push("--reverse");                             // 202
        }                                                              // 311
                                                                       //
        if (config.siteConfigFile) {                                   // 203
          rwsortOptions.push("--site-config-file=" + config.siteConfigFile);
        }                                                              // 314
                                                                       //
        rwsortOptionsString = rwsortOptions.join(" ");                 // 205
        rwsortOptionsString = share.filterOptions(rwsortOptionsString);
        commands.push("rwsort " + rwsortOptionsString);                // 207
      }                                                                // 318
                                                                       //
      rwcutOptions = ["--num-recs=" + profile.numRecs, "--start-rec-num=" + this.startRecNum, "--delimited"];
                                                                       //
      if (this.fields.length) {                                        // 209
        rwcutOptions.push("--fields=" + _.intersection(this.fieldsOrder, this.fields).join(","));
      }                                                                // 322
                                                                       //
      if (config.siteConfigFile) {                                     // 211
        rwcutOptions.push("--site-config-file=" + config.siteConfigFile);
      }                                                                // 325
                                                                       //
      rwcutOptionsString = rwcutOptions.join(" ");                     // 213
      rwcutOptionsString = share.filterOptions(rwcutOptionsString);    // 214
      commands.push("rwcut " + rwcutOptionsString);                    // 215
      commands[0] += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
      command = commands.join(" | ");                                  // 217
                                                                       //
      if (config.isSSH && !isPresentation) {                           // 218
        command = config.wrapCommand(command);                         // 219
      }                                                                // 333
                                                                       //
      return command;                                                  // 334
    }                                                                  // 197
                                                                       //
    return outputRwcutCommand;                                         // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.outputRwstatsCommand = function () {                 // 20
    function outputRwstatsCommand(config, profile) {                   // 20
      var isPresentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var command, defaultRwstatsOptions, i, index, len, ref, rwstatsOptions, rwstatsOptionsString, rwstatsValues, rwstatsValuesOrder, value, values;
      defaultRwstatsOptions = ["--delimited"];                         // 222
                                                                       //
      if (this.interface === "builder") {                              // 223
        rwstatsOptions = defaultRwstatsOptions;                        // 224
                                                                       //
        if (this.rwstatsFields.length) {                               // 225
          rwstatsOptions.push("--fields=" + _.intersection(this.rwstatsFieldsOrder, this.rwstatsFields).join(","));
        }                                                              // 344
                                                                       //
        rwstatsValues = this.rwstatsValues.slice(0);                   // 227
        rwstatsValuesOrder = this.rwstatsValuesOrder.slice(0);         // 228
                                                                       //
        if (this.rwstatsPrimaryValue) {                                // 229
          rwstatsValues.unshift(this.rwstatsPrimaryValue);             // 230
          rwstatsValuesOrder.unshift(this.rwstatsPrimaryValue);        // 231
        }                                                              // 350
                                                                       //
        if (rwstatsValues.length) {                                    // 232
          values = _.intersection(rwstatsValuesOrder, rwstatsValues);  // 233
                                                                       //
          for (index = i = 0, len = values.length; i < len; index = ++i) {
            value = values[index];                                     // 354
                                                                       //
            if (indexOf.call(share.rwstatsValues, value) < 0) {        // 235
              values[index] = "distinct:" + value;                     // 236
            }                                                          // 357
          }                                                            // 234
                                                                       //
          rwstatsOptions.push("--values=" + values.join(","));         // 237
                                                                       //
          if (ref = values[0], indexOf.call(share.rwstatsValues, ref) < 0) {
            rwstatsOptions.push("--no-percents");                      // 239
          }                                                            // 232
        }                                                              // 363
                                                                       //
        rwstatsOptions.push("--" + this.rwstatsDirection);             // 240
                                                                       //
        switch (this.rwstatsMode) {                                    // 241
          case "count":                                                // 241
            rwstatsOptions.push("--count=" + this.rwstatsCountModeValue);
            break;                                                     // 242
                                                                       //
          case "threshold":                                            // 241
            rwstatsOptions.push("--threshold=" + this.rwstatsThresholdModeValue);
            break;                                                     // 244
                                                                       //
          case "percentage":                                           // 241
            rwstatsOptions.push("--percentage=" + this.rwstatsPercentageModeValue);
        }                                                              // 241
                                                                       //
        if (this.rwstatsBinTimeEnabled) {                              // 248
          if (this.rwstatsBinTime) {                                   // 249
            rwstatsOptions.push("--bin-time=" + this.rwstatsBinTime);  // 250
          } else {                                                     // 249
            rwstatsOptions.push("--bin-time");                         // 252
          }                                                            // 248
        }                                                              // 381
                                                                       //
        if (config.siteConfigFile) {                                   // 253
          rwstatsOptions.push("--site-config-file=" + config.siteConfigFile);
        }                                                              // 384
                                                                       //
        rwstatsOptionsString = rwstatsOptions.join(" ");               // 255
      } else {                                                         // 223
        rwstatsOptionsString = this.rwstatsCmd + " " + defaultRwstatsOptions.join(" ");
        rwstatsOptionsString = share.filterOptions(rwstatsOptionsString);
      }                                                                // 389
                                                                       //
      command = "rwstats " + rwstatsOptionsString;                     // 259
      command += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
                                                                       //
      if (config.isSSH && !isPresentation) {                           // 261
        command = config.wrapCommand(command);                         // 262
      }                                                                // 394
                                                                       //
      return command;                                                  // 395
    }                                                                  // 221
                                                                       //
    return outputRwstatsCommand;                                       // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.outputRwcountCommand = function () {                 // 20
    function outputRwcountCommand(config, profile) {                   // 20
      var isPresentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var command, defaultRwcountOptions, fieldIndex, headCommand, headOptions, rwcountOptions, rwcountOptionsString, sortCommand, sortOptions, tailCommand, tailOptions;
      defaultRwcountOptions = ["--delimited", "--no-titles" // --no-titles is necessary, because header is added later
      ];                                                               // 265
                                                                       //
      if (this.interface === "builder") {                              // 266
        rwcountOptions = defaultRwcountOptions;                        // 267
                                                                       //
        if (this.rwcountBinSizeEnabled) {                              // 268
          rwcountOptions.push("--bin-size=" + this.rwcountBinSize);    // 269
        }                                                              // 408
                                                                       //
        if (this.rwcountLoadSchemeEnabled) {                           // 270
          rwcountOptions.push("--load-scheme=" + this.rwcountLoadScheme);
        }                                                              // 411
                                                                       //
        if (this.rwcountSkipZeroes) {                                  // 272
          rwcountOptions.push("--skip-zeroes");                        // 273
        }                                                              // 414
                                                                       //
        if (config.siteConfigFile) {                                   // 274
          rwcountOptions.push("--site-config-file=" + config.siteConfigFile);
        }                                                              // 417
                                                                       //
        rwcountOptionsString = rwcountOptions.join(" ");               // 276
      } else {                                                         // 266
        rwcountOptionsString = this.rwcountCmd + " " + defaultRwcountOptions.join(" ");
      }                                                                // 421
                                                                       //
      rwcountOptionsString = share.filterOptions(rwcountOptionsString);
      command = "rwcount " + rwcountOptionsString;                     // 280
      command += " " + (config.dataTempdir || "/tmp") + "/" + this._id + ".rwf";
                                                                       //
      if (this.presentation === "table") {                             // 282
        if (this.sortField) {                                          // 283
          fieldIndex = share.rwcountFields.indexOf(this.sortField);    // 284
          sortOptions = "--field-separator=\\\| --key=+" + (fieldIndex + 1) + "n" + (this.sortReverse ? "r" : "");
          sortOptions = share.filterOptions(sortOptions, "\\\\\\|\\+");
          sortCommand = "sort " + sortOptions;                         // 287
          command += " | " + sortCommand;                              // 288
        }                                                              // 432
                                                                       //
        if (profile.numRecs) {                                         // 289
          headOptions = "--lines=" + (this.startRecNum + profile.numRecs - 1);
          headOptions = share.filterOptions(headOptions);              // 291
          headCommand = "head " + headOptions;                         // 292
          tailOptions = "--lines=" + profile.numRecs;                  // 293
          tailOptions = share.filterOptions(tailOptions);              // 294
          tailCommand = "tail " + tailOptions;                         // 295
          command += " | " + headCommand + " | " + tailCommand;        // 296
        }                                                              // 282
      }                                                                // 442
                                                                       //
      if (config.isSSH && !isPresentation) {                           // 297
        command = config.wrapCommand(command);                         // 298
      }                                                                // 445
                                                                       //
      return command;                                                  // 446
    }                                                                  // 264
                                                                       //
    return outputRwcountCommand;                                       // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.rwstatsCountModeValueIsEnabled = function () {       // 20
    function rwstatsCountModeValueIsEnabled() {                        // 20
      return this.rwstatsMode === "count";                             // 450
    }                                                                  // 300
                                                                       //
    return rwstatsCountModeValueIsEnabled;                             // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.rwstatsThresholdModeValueIsEnabled = function () {   // 20
    function rwstatsThresholdModeValueIsEnabled() {                    // 20
      return this.rwstatsMode === "threshold";                         // 454
    }                                                                  // 302
                                                                       //
    return rwstatsThresholdModeValueIsEnabled;                         // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.rwstatsPercentageModeValueIsEnabled = function () {  // 20
    function rwstatsPercentageModeValueIsEnabled() {                   // 20
      return this.rwstatsMode === "percentage";                        // 458
    }                                                                  // 304
                                                                       //
    return rwstatsPercentageModeValueIsEnabled;                        // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.availableChartTypes = function () {                  // 20
    function availableChartTypes() {                                   // 20
      return share.availableChartTypes[this.output];                   // 462
    }                                                                  // 306
                                                                       //
    return availableChartTypes;                                        // 20
  }();                                                                 // 20
                                                                       //
  Query.prototype.path = function () {                                 // 20
    function path() {                                                  // 20
      return "/query/" + this._id;                                     // 466
    }                                                                  // 308
                                                                       //
    return path;                                                       // 20
  }();                                                                 // 20
                                                                       //
  return Query;                                                        // 20
}();                                                                   // 20
                                                                       //
share.IPSet = function () {                                            // 311
  function IPSet(doc) {                                                // 312
    _classCallCheck(this, IPSet);                                      // 312
                                                                       //
    _.extend(this, doc);                                               // 313
  }                                                                    // 312
                                                                       //
  IPSet.prototype.displayName = function () {                          // 311
    function displayName() {                                           // 311
      return this.name || "#" + this._id;                              // 477
    }                                                                  // 314
                                                                       //
    return displayName;                                                // 311
  }();                                                                 // 311
                                                                       //
  IPSet.prototype.objectSelectName = function () {                     // 311
    function objectSelectName() {                                      // 311
      return this.displayName();                                       // 481
    }                                                                  // 316
                                                                       //
    return objectSelectName;                                           // 311
  }();                                                                 // 311
                                                                       //
  IPSet.prototype.objectSelectValue = function () {                    // 311
    function objectSelectValue() {                                     // 311
      return this._id;                                                 // 485
    }                                                                  // 318
                                                                       //
    return objectSelectValue;                                          // 311
  }();                                                                 // 311
                                                                       //
  IPSet.prototype.path = function () {                                 // 311
    function path() {                                                  // 311
      return "/ipset/" + this._id;                                     // 489
    }                                                                  // 320
                                                                       //
    return path;                                                       // 311
  }();                                                                 // 311
                                                                       //
  return IPSet;                                                        // 311
}();                                                                   // 311
                                                                       //
share.Tuple = function () {                                            // 323
  function Tuple(doc) {                                                // 324
    _classCallCheck(this, Tuple);                                      // 324
                                                                       //
    _.extend(this, doc);                                               // 325
  }                                                                    // 324
                                                                       //
  Tuple.prototype.displayName = function () {                          // 323
    function displayName() {                                           // 323
      return this.name || "#" + this._id;                              // 500
    }                                                                  // 326
                                                                       //
    return displayName;                                                // 323
  }();                                                                 // 323
                                                                       //
  Tuple.prototype.objectSelectName = function () {                     // 323
    function objectSelectName() {                                      // 323
      return this.displayName();                                       // 504
    }                                                                  // 328
                                                                       //
    return objectSelectName;                                           // 323
  }();                                                                 // 323
                                                                       //
  Tuple.prototype.objectSelectValue = function () {                    // 323
    function objectSelectValue() {                                     // 323
      return this._id;                                                 // 508
    }                                                                  // 330
                                                                       //
    return objectSelectValue;                                          // 323
  }();                                                                 // 323
                                                                       //
  Tuple.prototype.path = function () {                                 // 323
    function path() {                                                  // 323
      return "/tuple/" + this._id;                                     // 512
    }                                                                  // 332
                                                                       //
    return path;                                                       // 323
  }();                                                                 // 323
                                                                       //
  return Tuple;                                                        // 323
}();                                                                   // 323
                                                                       //
share.Transformations = {                                              // 335
  user: function (user) {                                              // 336
    if (user instanceof share.User || !user) {                         // 337
      return user;                                                     // 520
    } else {                                                           // 337
      return new share.User(user);                                     // 522
    }                                                                  // 523
  },                                                                   // 336
  config: function (config) {                                          // 338
    if (config instanceof share.Config || !config) {                   // 339
      return config;                                                   // 527
    } else {                                                           // 339
      return new share.Config(config);                                 // 529
    }                                                                  // 530
  },                                                                   // 336
  query: function (query) {                                            // 340
    if (query instanceof share.Query || !query) {                      // 341
      return query;                                                    // 534
    } else {                                                           // 341
      return new share.Query(query);                                   // 536
    }                                                                  // 537
  },                                                                   // 336
  ipset: function (ipset) {                                            // 342
    if (ipset instanceof share.IPSet || !ipset) {                      // 343
      return ipset;                                                    // 541
    } else {                                                           // 343
      return new share.IPSet(ipset);                                   // 543
    }                                                                  // 544
  },                                                                   // 336
  tuple: function (tuple) {                                            // 344
    if (tuple instanceof share.Tuple || !tuple) {                      // 345
      return tuple;                                                    // 548
    } else {                                                           // 345
      return new share.Tuple(tuple);                                   // 550
    }                                                                  // 551
  }                                                                    // 344
};                                                                     // 336
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/lib/transformations.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvbGliL3RyYW5zZm9ybWF0aW9ucy5jb2ZmZWUiXSwibmFtZXMiOlsiaW5kZXhPZiIsInNoYXJlIiwiVXNlciIsImRvYyIsInJlZiIsInJlZjEiLCJfIiwiZXh0ZW5kIiwiZW1haWwiLCJlbWFpbHMiLCJhZGRyZXNzIiwibmFtZSIsInByb2ZpbGUiLCJmaXJzdE5hbWUiLCJzcGxpdCIsInNsaWNlIiwiam9pbiIsImxhc3ROYW1lIiwiQ29uZmlnIiwid3JhcENvbW1hbmQiLCJjb21tYW5kIiwiZ2V0U1NIT3B0aW9ucyIsInBvcnQiLCJ1c2VyIiwiaG9zdCIsImdldElkZW50aXR5RmlsZSIsImlkZW50aXR5RmlsZSIsInByb2Nlc3MiLCJlbnYiLCJQV0QiLCJRdWVyeSIsImRpc3RpbmN0UmVnZXgiLCJmaWx0ZXJlZEhlYWRlciIsImkiLCJpbmRleCIsImoiLCJrIiwibCIsImxlbiIsImxlbjEiLCJsZW4yIiwibGVuMyIsImxlbjQiLCJsZW41IiwibSIsIm4iLCJvIiwicGFyc2VkUmVzdWx0IiwicGFyc2VkUm93IiwicGFyc2VkVmFsdWUiLCJyYXdIZWFkZXIiLCJyb3ciLCJzcGVjIiwiaGVhZGVyIiwicm93cyIsInJlc3VsdCIsInBhcnNlUmVzdWx0Iiwib3V0cHV0Iiwic2hpZnQiLCJ1bnNoaWZ0Iiwicndjb3VudEZpZWxkcyIsImxlbmd0aCIsIl9pZCIsInRyaW0iLCJpc0Rpc3RpbmN0IiwiaXNQZXJjZW50YWdlIiwic3Vic3RyIiwibWF0Y2giLCJyZXBsYWNlIiwiY2hhcnRUeXBlIiwiY2hhcnRGaWVsZFR5cGVzIiwicHVzaCIsInByZXNlbnRhdGlvbiIsImNhbGwiLCJwYXJzZUZsb2F0IiwibW9tZW50IiwidXRjIiwidG9EYXRlIiwidmFsdWUiLCJxdWVyeUlkIiwiZGlzcGxheU5hbWUiLCJpc1F1aWNrIiwiaW5wdXRDb21tYW5kIiwiY29uZmlnIiwiaXNQcmVzZW50YXRpb24iLCJleGNsdXNpb24iLCJwY2FwRmlsZSIsInBjYXBGaWxlVmFsaWRhdGUiLCJyd0ZpbGVWYWxpZGF0ZSIsInR5cGVWYWxpZGF0ZSIsImlucHV0T3B0aW9ucyIsImludGVyZmFjZSIsInNlYXJjaCIsIlJlZ0V4cCIsInNpdGVDb25maWdGaWxlIiwiZGF0YVJvb3RkaXIiLCJpbnB1dEV4Y2x1c2lvbnMiLCJkYXRhVGVtcGRpciIsImlzU1NIIiwiZVRpbWVNb21lbnQiLCJwYXJhbWV0ZXJzIiwic1RpbWVNb21lbnQiLCJzdGFydERhdGVPZmZzZXROdW1iZXIiLCJzdHJpbmciLCJ0eXBlc0VuYWJsZWQiLCJ0eXBlcyIsImRpZmZlcmVuY2UiLCJxdWVyeVR5cGVzIiwic3RhcnREYXRlVHlwZSIsInN0YXJ0RGF0ZUVuYWJsZWQiLCJzdGFydERhdGUiLCJlbmREYXRlRW5hYmxlZCIsImVuZERhdGUiLCJhY3RpdmVUaW1lRW5hYmxlZCIsImFjdGl2ZVRpbWUiLCJzdGFydERhdGVPZmZzZXRFbmFibGVkIiwic3RhcnREYXRlT2Zmc2V0IiwiaW50dmFsIiwiY2xvbmUiLCJzdWJ0cmFjdCIsImZvcm1hdCIsInNlbnNvckVuYWJsZWQiLCJzZW5zb3IiLCJkYWRkcmVzc0VuYWJsZWQiLCJkYWRkcmVzcyIsInNhZGRyZXNzRW5hYmxlZCIsInNhZGRyZXNzIiwiYW55QWRkcmVzc0VuYWJsZWQiLCJhbnlBZGRyZXNzIiwiZGlwU2V0RW5hYmxlZCIsImRpcFNldCIsInNpcFNldEVuYWJsZWQiLCJzaXBTZXQiLCJhbnlTZXRFbmFibGVkIiwiYW55U2V0IiwidHVwbGVGaWxlRW5hYmxlZCIsInR1cGxlRmlsZSIsInR1cGxlRGlyZWN0aW9uRW5hYmxlZCIsInR1cGxlRGlyZWN0aW9uIiwidHVwbGVEZWxpbWl0ZXJFbmFibGVkIiwidHVwbGVEZWxpbWl0ZXIiLCJ0dXBsZUZpZWxkc0VuYWJsZWQiLCJ0dXBsZUZpZWxkcyIsImRwb3J0RW5hYmxlZCIsImRwb3J0Iiwic3BvcnRFbmFibGVkIiwic3BvcnQiLCJhcG9ydEVuYWJsZWQiLCJhcG9ydCIsImRjY0VuYWJsZWQiLCJkY2MiLCJzY2NFbmFibGVkIiwic2NjIiwicHJvdG9jb2xFbmFibGVkIiwicHJvdG9jb2wiLCJmbGFnc0FsbEVuYWJsZWQiLCJmbGFnc0FsbCIsImFkZGl0aW9uYWxQYXJhbWV0ZXJzRW5hYmxlZCIsImFkZGl0aW9uYWxQYXJhbWV0ZXJzIiwiY21kIiwiZmlsdGVyT3B0aW9ucyIsImV4Y2x1c2lvbnNDbWQiLCJhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZEVuYWJsZWQiLCJhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZCIsImNvbXBhY3QiLCJvdXRwdXRDb21tYW5kIiwib3V0cHV0UndjdXRDb21tYW5kIiwib3V0cHV0UndzdGF0c0NvbW1hbmQiLCJvdXRwdXRSd2NvdW50Q29tbWFuZCIsImNvbW1hbmRzIiwicndjdXRPcHRpb25zIiwicndjdXRPcHRpb25zU3RyaW5nIiwicndzb3J0T3B0aW9ucyIsInJ3c29ydE9wdGlvbnNTdHJpbmciLCJzb3J0RmllbGQiLCJzb3J0UmV2ZXJzZSIsIm51bVJlY3MiLCJzdGFydFJlY051bSIsImZpZWxkcyIsImludGVyc2VjdGlvbiIsImZpZWxkc09yZGVyIiwiZGVmYXVsdFJ3c3RhdHNPcHRpb25zIiwicndzdGF0c09wdGlvbnMiLCJyd3N0YXRzT3B0aW9uc1N0cmluZyIsInJ3c3RhdHNWYWx1ZXMiLCJyd3N0YXRzVmFsdWVzT3JkZXIiLCJ2YWx1ZXMiLCJyd3N0YXRzRmllbGRzIiwicndzdGF0c0ZpZWxkc09yZGVyIiwicndzdGF0c1ByaW1hcnlWYWx1ZSIsInJ3c3RhdHNEaXJlY3Rpb24iLCJyd3N0YXRzTW9kZSIsInJ3c3RhdHNDb3VudE1vZGVWYWx1ZSIsInJ3c3RhdHNUaHJlc2hvbGRNb2RlVmFsdWUiLCJyd3N0YXRzUGVyY2VudGFnZU1vZGVWYWx1ZSIsInJ3c3RhdHNCaW5UaW1lRW5hYmxlZCIsInJ3c3RhdHNCaW5UaW1lIiwicndzdGF0c0NtZCIsImRlZmF1bHRSd2NvdW50T3B0aW9ucyIsImZpZWxkSW5kZXgiLCJoZWFkQ29tbWFuZCIsImhlYWRPcHRpb25zIiwicndjb3VudE9wdGlvbnMiLCJyd2NvdW50T3B0aW9uc1N0cmluZyIsInNvcnRDb21tYW5kIiwic29ydE9wdGlvbnMiLCJ0YWlsQ29tbWFuZCIsInRhaWxPcHRpb25zIiwicndjb3VudEJpblNpemVFbmFibGVkIiwicndjb3VudEJpblNpemUiLCJyd2NvdW50TG9hZFNjaGVtZUVuYWJsZWQiLCJyd2NvdW50TG9hZFNjaGVtZSIsInJ3Y291bnRTa2lwWmVyb2VzIiwicndjb3VudENtZCIsInJ3c3RhdHNDb3VudE1vZGVWYWx1ZUlzRW5hYmxlZCIsInJ3c3RhdHNUaHJlc2hvbGRNb2RlVmFsdWVJc0VuYWJsZWQiLCJyd3N0YXRzUGVyY2VudGFnZU1vZGVWYWx1ZUlzRW5hYmxlZCIsImF2YWlsYWJsZUNoYXJ0VHlwZXMiLCJwYXRoIiwiSVBTZXQiLCJvYmplY3RTZWxlY3ROYW1lIiwib2JqZWN0U2VsZWN0VmFsdWUiLCJUdXBsZSIsIlRyYW5zZm9ybWF0aW9ucyIsInF1ZXJ5IiwiaXBzZXQiLCJ0dXBsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTtBQUFBLElBQUFBLFVBQUEsR0FBQUEsT0FBQTs7QUFDTUMsTUFBTUMsSUFBTjtBQUNKLGdCQUFjQyxHQUFkLEVBQWE7QUFBQTs7QUFDWCxRQUFBQyxHQUFBLEVBQUFDLElBQUE7O0FBQUFDLE1BQUVDLE1BQUYsQ0FBUyxJQUFULEVBQVlKLEdBQVo7O0FBQ0EsU0FBQ0ssS0FBRCxJQUFBSixNQUFBLEtBQUFLLE1BQUEsYUFBQUosT0FBQUQsSUFBQSxjQUFBQyxLQUFzQkssT0FBdEIsR0FBc0IsTUFBdEIsR0FBc0IsTUFBdEI7QUFDQSxTQUFDQyxJQUFELEdBQVEsS0FBQ0MsT0FBRCxDQUFTRCxJQUFqQjtBQUNBLFNBQUNFLFNBQUQsR0FBYSxLQUFDRixJQUFELENBQU1HLEtBQU4sQ0FBWSxHQUFaLEVBQWlCQyxLQUFqQixDQUF1QixDQUF2QixFQUEwQixDQUExQixFQUE2QkMsSUFBN0IsQ0FBa0MsR0FBbEMsQ0FBYjtBQUNBLFNBQUNDLFFBQUQsR0FBWSxL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LFVBQUNBLEtBQUQ7QUFDTCxRQUFHQSxpQkFBaUJoTyxNQUFNME4sS0FBdkIsSUFBZ0MsQ0FBSU0sS0FBdkM7QUFzTUUsYUF0TWdEQSxLQXNNaEQ7QUF0TUY7QUF3TUUsYUF4TTJELElBQUloTyxNQUFNME4sS0FBVixDQUFnQk0sS0FBaEIsQ0F3TTNEO0FBQ0Q7QUFoTkg7QUFRQUMsU0FBTyxVQUFDQSxLQUFEO0FBQ0wsUUFBR0EsaUJBQWlCak8sTUFBTTZOLEtBQXZCLElBQWdDLENBQUlJLEtBQXZDO0FBMk1FLGFBM01nREEsS0EyTWhEO0FBM01GO0FBNk1FLGFBN00yRCxJQUFJak8sTUFBTTZOLEtBQVYsQ0FBZ0JJLEtBQWhCLENBNk0zRDtBQUNEO0FBL01JO0FBUlAsQ0FERiw0RSIsImZpbGUiOiIvbGliL3RyYW5zZm9ybWF0aW9ucy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyIjIG5vdCB1c2VkIGJ5IGRlZmF1bHRcbmNsYXNzIHNoYXJlLlVzZXJcbiAgY29uc3RydWN0b3I6IChkb2MpIC0+XG4gICAgXy5leHRlbmQoQCwgZG9jKVxuICAgIEBlbWFpbCA9IEBlbWFpbHM/WzBdPy5hZGRyZXNzXG4gICAgQG5hbWUgPSBAcHJvZmlsZS5uYW1lXG4gICAgQGZpcnN0TmFtZSA9IEBuYW1lLnNwbGl0KCcgJykuc2xpY2UoMCwgMSkuam9pbignICcpXG4gICAgQGxhc3ROYW1lID0gQG5hbWUuc3BsaXQoJyAnKS5zbGljZSgxKS5qb2luKCcgJylcblxuY2xhc3Mgc2hhcmUuQ29uZmlnXG4gIGNvbnN0cnVjdG9yOiAoZG9jKSAtPlxuICAgIF8uZXh0ZW5kKEAsIGRvYylcbiAgd3JhcENvbW1hbmQ6IChjb21tYW5kKSAtPlxuICAgIFwic3NoIFwiICsgQGdldFNTSE9wdGlvbnMoKSArIFwiIC1wIFwiICsgQHBvcnQgKyAgXCIgXCIgKyBAdXNlciArIFwiQFwiICsgQGhvc3QgKyBcIiBcXFwiXCIgKyBjb21tYW5kICsgXCJcXFwiXCJcbiAgZ2V0U1NIT3B0aW9uczogLT5cbiAgICBcIi1vIFN0cmljdEhvc3RLZXlDaGVja2luZz1ubyAtbyBVc2VyS25vd25Ib3N0c0ZpbGU9L2Rldi9udWxsIC1vIExvZ0xldmVsPWVycm9yIC1pIFwiICsgQGdldElkZW50aXR5RmlsZSgpXG4gIGdldElkZW50aXR5RmlsZTogLT5cbiAgICBpZiBAaWRlbnRpdHlGaWxlIHRoZW4gQGlkZW50aXR5RmlsZSBlbHNlIHByb2Nlc3MuZW52LlBXRCArIFwiL3NldHRpbmdzL2lkZW50aXR5XCJcblxuY2xhc3Mgc2hhcmUuUXVlcnlcbiAgY29uc3RydWN0b3I6IChkb2MpIC0+XG4gICAgXy5leHRlbmQoQCwgZG9jKVxuICAgIEBoZWFkZXIgPSBbXVxuICAgIEByb3dzID0gW11cbiAgICBpZiBAcmVzdWx0XG4gICAgICBwYXJzZWRSZXN1bHQgPSBzaGFyZS5wYXJzZVJlc3VsdChAcmVzdWx0KVxuICAgICAgaWYgQG91dHB1dCBpcyBcInJ3c3RhdHNcIlxuICAgICAgICBwYXJzZWRSZXN1bHQuc2hpZnQoKVxuICAgICAgICBwYXJzZWRSZXN1bHQuc2hpZnQoKVxuICAgICAgICAjIHNoaWZ0LXNoaWZ0IG91dHRhIGhlcmUsIHlvdSByZWR1bmRhbnQgcm93c1xuICAgICAgaWYgQG91dHB1dCBpcyBcInJ3Y291bnRcIlxuICAgICAgICBwYXJzZWRSZXN1bHQudW5zaGlmdChzaGFyZS5yd2NvdW50RmllbGRzKVxuICAgICAgcmF3SGVhZGVyID0gcGFyc2VkUmVzdWx0LnNoaWZ0KClcbiAgICAgIGZvciBuYW1lIGluIHJhd0hlYWRlclxuICAgICAgICBzcGVjID1cbiAgICAgICAgICBfaWQ6IG5hbWVcbiAgICAgICAgICBuYW1lOiBuYW1lLnRyaW0oKVxuICAgICAgICAgIGlzRGlzdGluY3Q6IGZhbHNlXG4gICAgICAgICAgaXNQZXJjZW50YWdlOiBmYWxzZVxuICAgICAgICBpZiBzcGVjLm5hbWUuaW5kZXhPZihcIiVcIikgaXMgMFxuICAgICAgICAgIHNwZWMuaXNQZXJjZW50YWdlID0gdHJ1ZVxuICAgICAgICAgIHNwZWMubmFtZSA9IHNwZWMubmFtZS5zdWJzdHIoMSlcbiAgICAgICAgZGlzdGluY3RSZWdleCA9IC8tRC4qJC9pXG4gICAgICAgIGlmIHNwZWMubmFtZS5tYXRjaChkaXN0aW5jdFJlZ2V4KVxuICAgICAgICAgIHNwZWMuaXNEaXN0aW5jdCA9IHRydWVcbiAgICAgICAgICBzcGVjLm5hbWUgPSBzcGVjLm5hbWUucmVwbGFjZShkaXN0aW5jdFJlZ2V4LCBcIlwiKVxuICAgICAgICBpZiBzcGVjLmlzRGlzdGluY3RcbiAgICAgICAgICBzcGVjLmNoYXJ0VHlwZSA9IFwibnVtYmVyXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNwZWMuY2hhcnRUeXBlID0gc2hhcmUuY2hhcnRGaWVsZFR5cGVzW3NwZWMubmFtZV0gb3IgXCJzdHJpbmdcIlxuICAgICAgICBAaGVhZGVyLnB1c2goc3BlYylcbiAgICAgIGlmIEBwcmVzZW50YXRpb24gaXMgXCJjaGFydFwiXG4gICAgICAgIGZvciBwYXJzZWRSb3cgaW4gcGFyc2VkUmVzdWx0XG4gICAgICAgICAgcm93ID0gW11cbiAgICAgICAgICBmb3IgcGFyc2VkVmFsdWUsIGluZGV4IGluIHBhcnNlZFJvd1xuICAgICAgICAgICAgc3BlYyA9IEBoZWFkZXJbaW5kZXhdXG4gICAgICAgICAgICBpZiBAb3V0cHV0IGlzIFwicndjb3VudFwiIGFuZCBzcGVjLm5hbWUgbm90IGluIEByd2NvdW50RmllbGRzXG4gICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICBzd2l0Y2ggc3BlYy5jaGFydFR5cGVcbiAgICAgICAgICAgICAgd2hlbiBcIm51bWJlclwiXG4gICAgICAgICAgICAgICAgcGFyc2VkVmFsdWUgPSBwYXJzZUZsb2F0KHBhcnNlZFZhbHVlKVxuICAgICAgICAgICAgICB3aGVuIFwiZGF0ZVwiLCBcImRhdGV0aW1lXCJcbiAgICAgICAgICAgICAgICBtID0gbW9tZW50LnV0YyhwYXJzZWRWYWx1ZSwgXCJZWVlZL01NL0REVEhIOm1tOnNzLlNTU1wiKVxuICAgICAgICAgICAgICAgIHBhcnNlZFZhbHVlID0gbS50b0RhdGUoKVxuICAgICAgICAgICAgcm93LnB1c2gocGFyc2VkVmFsdWUpXG4gICAgICAgICAgQHJvd3MucHVzaChyb3cpXG4gICAgICBlbHNlXG4gICAgICAgIGZvciBwYXJzZWRSb3cgaW4gcGFyc2VkUmVzdWx0XG4gICAgICAgICAgcm93ID0gW11cbiAgICAgICAgICBmb3IgcGFyc2VkVmFsdWUsIGluZGV4IGluIHBhcnNlZFJvd1xuICAgICAgICAgICAgc3BlYyA9IEBoZWFkZXJbaW5kZXhdXG4gICAgICAgICAgICByb3cucHVzaCh7X2lkOiBzcGVjLl9pZCwgdmFsdWU6IHBhcnNlZFZhbHVlLCBxdWVyeUlkOiBAX2lkfSlcbiAgICAgICAgICBAcm93cy5wdXNoKHJvdylcbiAgICAgIGZpbHRlcmVkSGVhZGVyID0gW11cbiAgICAgIGZvciBzcGVjIGluIEBoZWFkZXJcbiAgICAgICAgZmlsdGVyZWRIZWFkZXIucHVzaChzcGVjKVxuICAgICAgQGhlYWRlciA9IGZpbHRlcmVkSGVhZGVyXG4gIGRpc3BsYXlOYW1lOiAtPlxuICAgIGlmIEBpc1F1aWNrIHRoZW4gXCJRdWljayBxdWVyeSAjXCIgKyBAX2lkIGVsc2UgQG5hbWUgb3IgXCIjXCIgKyBAX2lkXG4gIGlucHV0Q29tbWFuZDogKGNvbmZpZywgcHJvZmlsZSwgaXNQcmVzZW50YXRpb24gPSBmYWxzZSkgLT5cbiAgICBjb21tYW5kID0gXCJyd2ZpbHRlclwiXG4gICAgY29tbWFuZCArPSBcIiBcIiArIEBpbnB1dE9wdGlvbnMoY29uZmlnKVxuICAgICMgZGVmYXVsdHMgdG8gaGF2aW5nIC0tdHlwZT1hbGwgYXMgdGhlIHN0YW5kYXJkIGluc3RlYWQgb2YgdGhlIFNpTEsgZGVmYXVsdC5cbiAgICBpZiBAaW50ZXJmYWNlIGlzIFwiY21kXCJcbiAgICAgIHR5cGVWYWxpZGF0ZSA9IGNvbW1hbmQuc2VhcmNoKFJlZ0V4cCgnLS10eXBlJywgJ2knKSlcbiAgICAgIGlmIHR5cGVWYWxpZGF0ZSA8IDBcbiAgICAgICAgY29tbWFuZCArPSBcIiAtLXR5cGU9YWxsIFwiXG4gICAgaWYgY29uZmlnLnNpdGVDb25maWdGaWxlXG4gICAgICBjb21tYW5kICs9IFwiIC0tc2l0ZS1jb25maWctZmlsZT1cIiArIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICMgcndmIGFuZCBwY2FwIGludGVncmF0aW9uXG4gICAgcndGaWxlVmFsaWRhdGUgPSBjb21tYW5kLnNlYXJjaChSZWdFeHAoJyAoXFxcXC98XFxcXHcpKyhcXFxcL3xcXFxcd3xcXFxcLSkqXFxcXC4ocndmfHJ3KScsICdpJykpXG4gICAgaWYgcndGaWxlVmFsaWRhdGUgPCAwXG4gICAgICBwY2FwRmlsZVZhbGlkYXRlID0gY29tbWFuZC5zZWFyY2goUmVnRXhwKCcgKFxcXFwvfFxcXFx3KSsoXFxcXC98XFxcXHd8XFxcXC0pKlxcXFwuKHBjYXApJywgJ2knKSlcbiAgICAgIGlmIHBjYXBGaWxlVmFsaWRhdGUgPj0gMFxuICAgICAgICBwY2FwRmlsZSA9IGNvbW1hbmQubWF0Y2goUmVnRXhwKCcoXFxcXC98XFxcXHcpKyhcXFxcL3xcXFxcd3xcXFxcLSkqXFxcXC4ocGNhcCknLCAnaScpKVxuICAgICAgICBjb21tYW5kICs9IFwiIC0taW5wdXQtcGlwZT1zdGRpblwiXG4gICAgICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UocGNhcEZpbGVbMF0sXCJcIilcbiAgICAgICAgY29tbWFuZCA9IFwicndwMnlhZjJzaWxrIC0taW49XCIgKyBwY2FwRmlsZVswXSArIFwiIC0tb3V0PS0gfFwiICsgY29tbWFuZFxuICAgICAgZWxzZVxuICAgICAgICBpZiBjb25maWcuZGF0YVJvb3RkaXJcbiAgICAgICAgICBjb21tYW5kICs9IFwiIC0tZGF0YS1yb290ZGlyPVwiICsgY29uZmlnLmRhdGFSb290ZGlyXG5cbiAgICBjb21tYW5kICs9IFwiIC0tcGFzcz1zdGRvdXRcIlxuICAgIGZvciBleGNsdXNpb24gaW4gQGlucHV0RXhjbHVzaW9ucygpXG4gICAgICBjb21tYW5kICs9IFwiIHwgcndmaWx0ZXIgLS1pbnB1dC1waXBlPXN0ZGluXCJcbiAgICAgIGNvbW1hbmQgKz0gXCIgXCIgKyBleGNsdXNpb25cbiAgICAgIGlmIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICAgICBjb21tYW5kICs9IFwiIC0tc2l0ZS1jb25maWctZmlsZT1cIiArIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICAgIyBjb25maWcuZGF0YVJvb3RkaXIgc2hvdWxkbid0IGJlIHVzZWQgd2l0aCBleGNsdXNpb25zXG4gICAgICBjb21tYW5kICs9IFwiIC0tZmFpbD1zdGRvdXRcIlxuICAgIGNvbW1hbmQgKz0gXCIgPiBcIiArIChjb25maWcuZGF0YVRlbXBkaXIgb3IgXCIvdG1wXCIpICsgXCIvXCIgKyBAX2lkICsgXCIucndmXCJcbiAgICBpZiBjb25maWcuaXNTU0ggYW5kIG5vdCBpc1ByZXNlbnRhdGlvblxuICAgICAgY29tbWFuZCA9IGNvbmZpZy53cmFwQ29tbWFuZChjb21tYW5kKVxuICAgIGNvbW1hbmRcbiAgaW5wdXRPcHRpb25zOiAoY29uZmlnKSAtPlxuICAgIGlmIEBpbnRlcmZhY2UgaXMgXCJidWlsZGVyXCJcbiAgICAgIHBhcmFtZXRlcnMgPSBbXVxuICAgICAgaWYgQHR5cGVzRW5hYmxlZCBhbmQgQHR5cGVzLmxlbmd0aCBhbmQgXy5kaWZmZXJlbmNlKHNoYXJlLnF1ZXJ5VHlwZXMsIEB0eXBlcykubGVuZ3RoXG4gICAgICAgIHZhbHVlID0gQHR5cGVzLmpvaW4oXCIsXCIpXG4gICAgICBlbHNlXG4gICAgICAgIHZhbHVlID0gXCJhbGxcIlxuICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS10eXBlPVwiICsgdmFsdWUpXG4gICAgICBpZiBAc3RhcnREYXRlVHlwZSBpcyBcImludGVydmFsXCJcbiAgICAgICAgaWYgQHN0YXJ0RGF0ZUVuYWJsZWQgYW5kIEBzdGFydERhdGVcbiAgICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLXN0YXJ0LWRhdGU9XCIgKyBAc3RhcnREYXRlKVxuICAgICAgICBpZiBAZW5kRGF0ZUVuYWJsZWQgYW5kIEBlbmREYXRlXG4gICAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1lbmQtZGF0ZT1cIiArIEBlbmREYXRlKVxuICAgICAgICBpZiBAYWN0aXZlVGltZUVuYWJsZWQgYW5kIEBhY3RpdmVUaW1lXG4gICAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1hY3RpdmUtdGltZT1cIiArIEBhY3RpdmVUaW1lKVxuICAgICAgZWxzZVxuICAgICAgICBpZiBAc3RhcnREYXRlT2Zmc2V0RW5hYmxlZCBhbmQgQHN0YXJ0RGF0ZU9mZnNldFxuICAgICAgICAgIHN0YXJ0RGF0ZU9mZnNldE51bWJlciA9IHNoYXJlLmludHZhbChAc3RhcnREYXRlT2Zmc2V0KVxuICAgICAgICAgIGVUaW1lTW9tZW50ID0gbW9tZW50LnV0YygpXG4gICAgICAgICAgc1RpbWVNb21lbnQgPSBlVGltZU1vbWVudC5jbG9uZSgpLnN1YnRyYWN0KHN0YXJ0RGF0ZU9mZnNldE51bWJlciwgJ21pbnV0ZXMnKVxuICAgICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tc3RhcnQtZGF0ZT1cIiArIHNUaW1lTW9tZW50LmZvcm1hdChcIllZWVkvTU0vREQ6SEhcIikpXG4gICAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1lbmQtZGF0ZT1cIiArIGVUaW1lTW9tZW50LmZvcm1hdChcIllZWVkvTU0vREQ6SEhcIikpXG4gICAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1hY3RpdmUtdGltZT1cIiArIHNUaW1lTW9tZW50LmZvcm1hdChcIllZWVkvTU0vRERUSEg6bW06c3MuU1NTXCIpICsgXCItXCIgKyBlVGltZU1vbWVudC5mb3JtYXQoXCJZWVlZL01NL0REVEhIOm1tOnNzLlNTU1wiKSlcbiAgICAgIGlmIEBzZW5zb3JFbmFibGVkIGFuZCBAc2Vuc29yXG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tc2Vuc29yPVwiICsgQHNlbnNvcilcbiAgICAgIGlmIEBkYWRkcmVzc0VuYWJsZWQgYW5kIEBkYWRkcmVzc1xuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLWRhZGRyZXNzPVwiICsgQGRhZGRyZXNzKVxuICAgICAgaWYgQHNhZGRyZXNzRW5hYmxlZCBhbmQgQHNhZGRyZXNzXG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tc2FkZHJlc3M9XCIgKyBAc2FkZHJlc3MpXG4gICAgICBpZiBAYW55QWRkcmVzc0VuYWJsZWQgYW5kIEBhbnlBZGRyZXNzXG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tYW55LWFkZHJlc3M9XCIgKyBAYW55QWRkcmVzcylcbiAgICAgIGlmIEBkaXBTZXRFbmFibGVkIGFuZCBAZGlwU2V0XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tZGlwc2V0PVwiICsgKGNvbmZpZy5kYXRhVGVtcGRpciBvciBcIi90bXBcIikgKyBcIi9cIiArIEBkaXBTZXQgKyBcIi5yd3NcIilcbiAgICAgIGlmIEBzaXBTZXRFbmFibGVkIGFuZCBAc2lwU2V0XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tc2lwc2V0PVwiICsgKGNvbmZpZy5kYXRhVGVtcGRpciBvciBcIi90bXBcIikgKyBcIi9cIiArIEBzaXBTZXQgKyBcIi5yd3NcIilcbiAgICAgIGlmIEBhbnlTZXRFbmFibGVkIGFuZCBAYW55U2V0XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tYW55c2V0PVwiICsgKGNvbmZpZy5kYXRhVGVtcGRpciBvciBcIi90bXBcIikgKyBcIi9cIiArIEBhbnlTZXQgKyBcIi5yd3NcIilcbiAgICAgIGlmIEB0dXBsZUZpbGVFbmFibGVkIGFuZCBAdHVwbGVGaWxlXG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tdHVwbGUtZmlsZT1cIiArIChjb25maWcuZGF0YVRlbXBkaXIgb3IgXCIvdG1wXCIpICsgXCIvXCIgKyBAdHVwbGVGaWxlICsgXCIudHVwbGVcIilcbiAgICAgIGlmIEB0dXBsZURpcmVjdGlvbkVuYWJsZWQgYW5kIEB0dXBsZURpcmVjdGlvblxuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLXR1cGxlLWRpcmVjdGlvbj1cIiArIEB0dXBsZURpcmVjdGlvbilcbiAgICAgIGlmIEB0dXBsZURlbGltaXRlckVuYWJsZWQgYW5kIEB0dXBsZURlbGltaXRlclxuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLXR1cGxlLWRlbGltaXRlcj1cIiArIEB0dXBsZURlbGltaXRlcilcbiAgICAgIGlmIEB0dXBsZUZpZWxkc0VuYWJsZWQgYW5kIEB0dXBsZUZpZWxkc1xuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLXR1cGxlLWZpZWxkcz1cIiArIEB0dXBsZUZpZWxkcylcbiAgICAgIGlmIEBkcG9ydEVuYWJsZWQgYW5kIEBkcG9ydFxuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLWRwb3J0PVwiICsgQGRwb3J0KVxuICAgICAgaWYgQHNwb3J0RW5hYmxlZCBhbmQgQHNwb3J0XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tc3BvcnQ9XCIgKyBAc3BvcnQpXG4gICAgICBpZiBAYXBvcnRFbmFibGVkIGFuZCBAYXBvcnRcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1hcG9ydD1cIiArIEBhcG9ydClcbiAgICAgIGlmIEBkY2NFbmFibGVkIGFuZCBAZGNjLmxlbmd0aFxuICAgICAgICBwYXJhbWV0ZXJzLnB1c2goXCItLWRjYz1cIiArIEBkY2Muam9pbihcIixcIikpXG4gICAgICBpZiBAc2NjRW5hYmxlZCBhbmQgQHNjYy5sZW5ndGhcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1zY2M9XCIgKyBAc2NjLmpvaW4oXCIsXCIpKVxuICAgICAgaWYgQHByb3RvY29sRW5hYmxlZCBhbmQgQHByb3RvY29sXG4gICAgICAgIHBhcmFtZXRlcnMucHVzaChcIi0tcHJvdG9jb2w9XCIgKyBAcHJvdG9jb2wpXG4gICAgICBpZiBAZmxhZ3NBbGxFbmFibGVkIGFuZCBAZmxhZ3NBbGxcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKFwiLS1mbGFncy1hbGw9XCIgKyBAZmxhZ3NBbGwpXG4gICAgICBpZiBAYWRkaXRpb25hbFBhcmFtZXRlcnNFbmFibGVkIGFuZCBAYWRkaXRpb25hbFBhcmFtZXRlcnNcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKEBhZGRpdGlvbmFsUGFyYW1ldGVycylcbiAgICAgIHN0cmluZyA9IHBhcmFtZXRlcnMuam9pbihcIiBcIilcbiAgICBlbHNlXG4gICAgICBzdHJpbmcgPSBAY21kXG4gICAgc2hhcmUuZmlsdGVyT3B0aW9ucyhzdHJpbmcpXG4gIGlucHV0RXhjbHVzaW9uczogLT5cbiAgICBleGNsdXNpb25zQ21kID0gXCJcIlxuICAgIGlmIEBpbnRlcmZhY2UgaXMgXCJidWlsZGVyXCJcbiAgICAgIGlmIEBhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZEVuYWJsZWRcbiAgICAgICAgZXhjbHVzaW9uc0NtZCA9IEBhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZFxuICAgIGVsc2VcbiAgICAgIGV4Y2x1c2lvbnNDbWQgPSBAZXhjbHVzaW9uc0NtZFxuICAgIGV4Y2x1c2lvbnNDbWQgPSBzaGFyZS5maWx0ZXJPcHRpb25zKGV4Y2x1c2lvbnNDbWQpXG4gICAgXy5jb21wYWN0KGV4Y2x1c2lvbnNDbWQuc3BsaXQoL1xccysoPzpPUnxcXHxcXHwpXFxzKy9pKSlcbiAgb3V0cHV0Q29tbWFuZDogKGNvbmZpZywgcHJvZmlsZSwgaXNQcmVzZW50YXRpb24gPSBmYWxzZSkgLT5cbiAgICBzd2l0Y2ggQG91dHB1dFxuICAgICAgd2hlbiBcInJ3Y3V0XCJcbiAgICAgICAgQG91dHB1dFJ3Y3V0Q29tbWFuZChjb25maWcsIHByb2ZpbGUsIGlzUHJlc2VudGF0aW9uKVxuICAgICAgd2hlbiBcInJ3c3RhdHNcIlxuICAgICAgICBAb3V0cHV0UndzdGF0c0NvbW1hbmQoY29uZmlnLCBwcm9maWxlLCBpc1ByZXNlbnRhdGlvbilcbiAgICAgIHdoZW4gXCJyd2NvdW50XCJcbiAgICAgICAgQG91dHB1dFJ3Y291bnRDb21tYW5kKGNvbmZpZywgcHJvZmlsZSwgaXNQcmVzZW50YXRpb24pXG4gIG91dHB1dFJ3Y3V0Q29tbWFuZDogKGNvbmZpZywgcHJvZmlsZSwgaXNQcmVzZW50YXRpb24gPSBmYWxzZSkgLT5cbiAgICBjb21tYW5kcyA9IFtdXG4gICAgaWYgQHNvcnRGaWVsZFxuICAgICAgcndzb3J0T3B0aW9ucyA9IFtcIi0tZmllbGRzPVwiICsgQHNvcnRGaWVsZF1cbiAgICAgIGlmIEBzb3J0UmV2ZXJzZVxuICAgICAgICByd3NvcnRPcHRpb25zLnB1c2goXCItLXJldmVyc2VcIilcbiAgICAgIGlmIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICAgICByd3NvcnRPcHRpb25zLnB1c2goXCItLXNpdGUtY29uZmlnLWZpbGU9XCIgKyBjb25maWcuc2l0ZUNvbmZpZ0ZpbGUpXG4gICAgICByd3NvcnRPcHRpb25zU3RyaW5nID0gcndzb3J0T3B0aW9ucy5qb2luKFwiIFwiKVxuICAgICAgcndzb3J0T3B0aW9uc1N0cmluZyA9IHNoYXJlLmZpbHRlck9wdGlvbnMocndzb3J0T3B0aW9uc1N0cmluZylcbiAgICAgIGNvbW1hbmRzLnB1c2goXCJyd3NvcnQgXCIgKyByd3NvcnRPcHRpb25zU3RyaW5nKVxuICAgIHJ3Y3V0T3B0aW9ucyA9IFtcIi0tbnVtLXJlY3M9XCIgKyBwcm9maWxlLm51bVJlY3MsIFwiLS1zdGFydC1yZWMtbnVtPVwiICsgQHN0YXJ0UmVjTnVtLCBcIi0tZGVsaW1pdGVkXCJdXG4gICAgaWYgQGZpZWxkcy5sZW5ndGhcbiAgICAgIHJ3Y3V0T3B0aW9ucy5wdXNoKFwiLS1maWVsZHM9XCIgKyBfLmludGVyc2VjdGlvbihAZmllbGRzT3JkZXIsIEBmaWVsZHMpLmpvaW4oXCIsXCIpKVxuICAgIGlmIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICAgcndjdXRPcHRpb25zLnB1c2goXCItLXNpdGUtY29uZmlnLWZpbGU9XCIgKyBjb25maWcuc2l0ZUNvbmZpZ0ZpbGUpXG4gICAgcndjdXRPcHRpb25zU3RyaW5nID0gcndjdXRPcHRpb25zLmpvaW4oXCIgXCIpXG4gICAgcndjdXRPcHRpb25zU3RyaW5nID0gc2hhcmUuZmlsdGVyT3B0aW9ucyhyd2N1dE9wdGlvbnNTdHJpbmcpXG4gICAgY29tbWFuZHMucHVzaChcInJ3Y3V0IFwiICsgcndjdXRPcHRpb25zU3RyaW5nKVxuICAgIGNvbW1hbmRzWzBdICs9IFwiIFwiICsgKGNvbmZpZy5kYXRhVGVtcGRpciBvciBcIi90bXBcIikgKyBcIi9cIiArIEBfaWQgKyBcIi5yd2ZcIlxuICAgIGNvbW1hbmQgPSBjb21tYW5kcy5qb2luKFwiIHwgXCIpXG4gICAgaWYgY29uZmlnLmlzU1NIIGFuZCBub3QgaXNQcmVzZW50YXRpb25cbiAgICAgIGNvbW1hbmQgPSBjb25maWcud3JhcENvbW1hbmQoY29tbWFuZClcbiAgICBjb21tYW5kXG4gIG91dHB1dFJ3c3RhdHNDb21tYW5kOiAoY29uZmlnLCBwcm9maWxlLCBpc1ByZXNlbnRhdGlvbiA9IGZhbHNlKSAtPlxuICAgIGRlZmF1bHRSd3N0YXRzT3B0aW9ucyA9IFtcIi0tZGVsaW1pdGVkXCJdXG4gICAgaWYgQGludGVyZmFjZSBpcyBcImJ1aWxkZXJcIlxuICAgICAgcndzdGF0c09wdGlvbnMgPSBkZWZhdWx0UndzdGF0c09wdGlvbnNcbiAgICAgIGlmIEByd3N0YXRzRmllbGRzLmxlbmd0aFxuICAgICAgICByd3N0YXRzT3B0aW9ucy5wdXNoKFwiLS1maWVsZHM9XCIgKyBfLmludGVyc2VjdGlvbihAcndzdGF0c0ZpZWxkc09yZGVyLCBAcndzdGF0c0ZpZWxkcykuam9pbihcIixcIikpXG4gICAgICByd3N0YXRzVmFsdWVzID0gQHJ3c3RhdHNWYWx1ZXMuc2xpY2UoMClcbiAgICAgIHJ3c3RhdHNWYWx1ZXNPcmRlciA9IEByd3N0YXRzVmFsdWVzT3JkZXIuc2xpY2UoMClcbiAgICAgIGlmIEByd3N0YXRzUHJpbWFyeVZhbHVlXG4gICAgICAgIHJ3c3RhdHNWYWx1ZXMudW5zaGlmdChAcndzdGF0c1ByaW1hcnlWYWx1ZSlcbiAgICAgICAgcndzdGF0c1ZhbHVlc09yZGVyLnVuc2hpZnQoQHJ3c3RhdHNQcmltYXJ5VmFsdWUpXG4gICAgICBpZiByd3N0YXRzVmFsdWVzLmxlbmd0aFxuICAgICAgICB2YWx1ZXMgPSBfLmludGVyc2VjdGlvbihyd3N0YXRzVmFsdWVzT3JkZXIsIHJ3c3RhdHNWYWx1ZXMpXG4gICAgICAgIGZvciB2YWx1ZSwgaW5kZXggaW4gdmFsdWVzXG4gICAgICAgICAgaWYgdmFsdWUgbm90IGluIHNoYXJlLnJ3c3RhdHNWYWx1ZXNcbiAgICAgICAgICAgIHZhbHVlc1tpbmRleF0gPSBcImRpc3RpbmN0OlwiICsgdmFsdWVcbiAgICAgICAgcndzdGF0c09wdGlvbnMucHVzaChcIi0tdmFsdWVzPVwiICsgdmFsdWVzLmpvaW4oXCIsXCIpKVxuICAgICAgICBpZiB2YWx1ZXNbMF0gbm90IGluIHNoYXJlLnJ3c3RhdHNWYWx1ZXNcbiAgICAgICAgICByd3N0YXRzT3B0aW9ucy5wdXNoKFwiLS1uby1wZXJjZW50c1wiKVxuICAgICAgcndzdGF0c09wdGlvbnMucHVzaChcIi0tXCIgKyBAcndzdGF0c0RpcmVjdGlvbilcbiAgICAgIHN3aXRjaCBAcndzdGF0c01vZGVcbiAgICAgICAgd2hlbiBcImNvdW50XCJcbiAgICAgICAgICByd3N0YXRzT3B0aW9ucy5wdXNoKFwiLS1jb3VudD1cIiArIEByd3N0YXRzQ291bnRNb2RlVmFsdWUpXG4gICAgICAgIHdoZW4gXCJ0aHJlc2hvbGRcIlxuICAgICAgICAgIHJ3c3RhdHNPcHRpb25zLnB1c2goXCItLXRocmVzaG9sZD1cIiArIEByd3N0YXRzVGhyZXNob2xkTW9kZVZhbHVlKVxuICAgICAgICB3aGVuIFwicGVyY2VudGFnZVwiXG4gICAgICAgICAgcndzdGF0c09wdGlvbnMucHVzaChcIi0tcGVyY2VudGFnZT1cIiArIEByd3N0YXRzUGVyY2VudGFnZU1vZGVWYWx1ZSlcbiAgICAgIGlmIEByd3N0YXRzQmluVGltZUVuYWJsZWRcbiAgICAgICAgaWYgQHJ3c3RhdHNCaW5UaW1lXG4gICAgICAgICAgcndzdGF0c09wdGlvbnMucHVzaChcIi0tYmluLXRpbWU9XCIgKyBAcndzdGF0c0JpblRpbWUpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByd3N0YXRzT3B0aW9ucy5wdXNoKFwiLS1iaW4tdGltZVwiKVxuICAgICAgaWYgY29uZmlnLnNpdGVDb25maWdGaWxlXG4gICAgICAgIHJ3c3RhdHNPcHRpb25zLnB1c2goXCItLXNpdGUtY29uZmlnLWZpbGU9XCIgKyBjb25maWcuc2l0ZUNvbmZpZ0ZpbGUpXG4gICAgICByd3N0YXRzT3B0aW9uc1N0cmluZyA9IHJ3c3RhdHNPcHRpb25zLmpvaW4oXCIgXCIpXG4gICAgZWxzZVxuICAgICAgcndzdGF0c09wdGlvbnNTdHJpbmcgPSBAcndzdGF0c0NtZCArIFwiIFwiICsgZGVmYXVsdFJ3c3RhdHNPcHRpb25zLmpvaW4oXCIgXCIpXG4gICAgICByd3N0YXRzT3B0aW9uc1N0cmluZyA9IHNoYXJlLmZpbHRlck9wdGlvbnMocndzdGF0c09wdGlvbnNTdHJpbmcpXG4gICAgY29tbWFuZCA9IFwicndzdGF0cyBcIiArIHJ3c3RhdHNPcHRpb25zU3RyaW5nXG4gICAgY29tbWFuZCArPSBcIiBcIiArIChjb25maWcuZGF0YVRlbXBkaXIgb3IgXCIvdG1wXCIpICsgXCIvXCIgKyBAX2lkICsgXCIucndmXCJcbiAgICBpZiBjb25maWcuaXNTU0ggYW5kIG5vdCBpc1ByZXNlbnRhdGlvblxuICAgICAgY29tbWFuZCA9IGNvbmZpZy53cmFwQ29tbWFuZChjb21tYW5kKVxuICAgIGNvbW1hbmRcbiAgb3V0cHV0Undjb3VudENvbW1hbmQ6IChjb25maWcsIHByb2ZpbGUsIGlzUHJlc2VudGF0aW9uID0gZmFsc2UpIC0+XG4gICAgZGVmYXVsdFJ3Y291bnRPcHRpb25zID0gW1wiLS1kZWxpbWl0ZWRcIiwgXCItLW5vLXRpdGxlc1wiXSAjIC0tbm8tdGl0bGVzIGlzIG5lY2Vzc2FyeSwgYmVjYXVzZSBoZWFkZXIgaXMgYWRkZWQgbGF0ZXJcbiAgICBpZiBAaW50ZXJmYWNlIGlzIFwiYnVpbGRlclwiXG4gICAgICByd2NvdW50T3B0aW9ucyA9IGRlZmF1bHRSd2NvdW50T3B0aW9uc1xuICAgICAgaWYgQHJ3Y291bnRCaW5TaXplRW5hYmxlZFxuICAgICAgICByd2NvdW50T3B0aW9ucy5wdXNoKFwiLS1iaW4tc2l6ZT1cIiArIEByd2NvdW50QmluU2l6ZSlcbiAgICAgIGlmIEByd2NvdW50TG9hZFNjaGVtZUVuYWJsZWRcbiAgICAgICAgcndjb3VudE9wdGlvbnMucHVzaChcIi0tbG9hZC1zY2hlbWU9XCIgKyBAcndjb3VudExvYWRTY2hlbWUpXG4gICAgICBpZiBAcndjb3VudFNraXBaZXJvZXNcbiAgICAgICAgcndjb3VudE9wdGlvbnMucHVzaChcIi0tc2tpcC16ZXJvZXNcIilcbiAgICAgIGlmIGNvbmZpZy5zaXRlQ29uZmlnRmlsZVxuICAgICAgICByd2NvdW50T3B0aW9ucy5wdXNoKFwiLS1zaXRlLWNvbmZpZy1maWxlPVwiICsgY29uZmlnLnNpdGVDb25maWdGaWxlKVxuICAgICAgcndjb3VudE9wdGlvbnNTdHJpbmcgPSByd2NvdW50T3B0aW9ucy5qb2luKFwiIFwiKVxuICAgIGVsc2VcbiAgICAgIHJ3Y291bnRPcHRpb25zU3RyaW5nID0gQHJ3Y291bnRDbWQgKyBcIiBcIiArIGRlZmF1bHRSd2NvdW50T3B0aW9ucy5qb2luKFwiIFwiKVxuICAgIHJ3Y291bnRPcHRpb25zU3RyaW5nID0gc2hhcmUuZmlsdGVyT3B0aW9ucyhyd2NvdW50T3B0aW9uc1N0cmluZylcbiAgICBjb21tYW5kID0gXCJyd2NvdW50IFwiICsgcndjb3VudE9wdGlvbnNTdHJpbmdcbiAgICBjb21tYW5kICs9IFwiIFwiICsgKGNvbmZpZy5kYXRhVGVtcGRpciBvciBcIi90bXBcIikgKyBcIi9cIiArIEBfaWQgKyBcIi5yd2ZcIlxuICAgIGlmIEBwcmVzZW50YXRpb24gaXMgXCJ0YWJsZVwiXG4gICAgICBpZiBAc29ydEZpZWxkXG4gICAgICAgIGZpZWxkSW5kZXggPSBzaGFyZS5yd2NvdW50RmllbGRzLmluZGV4T2YoQHNvcnRGaWVsZClcbiAgICAgICAgc29ydE9wdGlvbnMgPSBcIi0tZmllbGQtc2VwYXJhdG9yPVxcXFxcXHwgLS1rZXk9K1wiICsgKGZpZWxkSW5kZXggKyAxKSArIFwiblwiICsgKGlmIEBzb3J0UmV2ZXJzZSB0aGVuIFwiclwiIGVsc2UgXCJcIilcbiAgICAgICAgc29ydE9wdGlvbnMgPSBzaGFyZS5maWx0ZXJPcHRpb25zKHNvcnRPcHRpb25zLCBcIlxcXFxcXFxcXFxcXHxcXFxcK1wiKVxuICAgICAgICBzb3J0Q29tbWFuZCA9IFwic29ydCBcIiArIHNvcnRPcHRpb25zXG4gICAgICAgIGNvbW1hbmQgKz0gXCIgfCBcIiArIHNvcnRDb21tYW5kXG4gICAgICBpZiBwcm9maWxlLm51bVJlY3NcbiAgICAgICAgaGVhZE9wdGlvbnMgPSBcIi0tbGluZXM9XCIgKyAoQHN0YXJ0UmVjTnVtICsgcHJvZmlsZS5udW1SZWNzIC0gMSlcbiAgICAgICAgaGVhZE9wdGlvbnMgPSBzaGFyZS5maWx0ZXJPcHRpb25zKGhlYWRPcHRpb25zKVxuICAgICAgICBoZWFkQ29tbWFuZCA9IFwiaGVhZCBcIiArIGhlYWRPcHRpb25zXG4gICAgICAgIHRhaWxPcHRpb25zID0gXCItLWxpbmVzPVwiICsgcHJvZmlsZS5udW1SZWNzXG4gICAgICAgIHRhaWxPcHRpb25zID0gc2hhcmUuZmlsdGVyT3B0aW9ucyh0YWlsT3B0aW9ucylcbiAgICAgICAgdGFpbENvbW1hbmQgPSBcInRhaWwgXCIgKyB0YWlsT3B0aW9uc1xuICAgICAgICBjb21tYW5kICs9IFwiIHwgXCIgKyBoZWFkQ29tbWFuZCArIFwiIHwgXCIgKyB0YWlsQ29tbWFuZFxuICAgIGlmIGNvbmZpZy5pc1NTSCBhbmQgbm90IGlzUHJlc2VudGF0aW9uXG4gICAgICBjb21tYW5kID0gY29uZmlnLndyYXBDb21tYW5kKGNvbW1hbmQpXG4gICAgY29tbWFuZFxuICByd3N0YXRzQ291bnRNb2RlVmFsdWVJc0VuYWJsZWQ6IC0+XG4gICAgQHJ3c3RhdHNNb2RlIGlzIFwiY291bnRcIlxuICByd3N0YXRzVGhyZXNob2xkTW9kZVZhbHVlSXNFbmFibGVkOiAtPlxuICAgIEByd3N0YXRzTW9kZSBpcyBcInRocmVzaG9sZFwiXG4gIHJ3c3RhdHNQZXJjZW50YWdlTW9kZVZhbHVlSXNFbmFibGVkOiAtPlxuICAgIEByd3N0YXRzTW9kZSBpcyBcInBlcmNlbnRhZ2VcIlxuICBhdmFpbGFibGVDaGFydFR5cGVzOiAtPlxuICAgIHNoYXJlLmF2YWlsYWJsZUNoYXJ0VHlwZXNbQG91dHB1dF1cbiAgcGF0aDogLT5cbiAgICBcIi9xdWVyeS9cIiArIEBfaWRcblxuY2xhc3Mgc2hhcmUuSVBTZXRcbiAgY29uc3RydWN0b3I6IChkb2MpIC0+XG4gICAgXy5leHRlbmQoQCwgZG9jKVxuICBkaXNwbGF5TmFtZTogLT5cbiAgICBAbmFtZSBvciBcIiNcIiArIEBfaWRcbiAgb2JqZWN0U2VsZWN0TmFtZTogLT5cbiAgICBAZGlzcGxheU5hbWUoKVxuICBvYmplY3RTZWxlY3RWYWx1ZTogLT5cbiAgICBAX2lkXG4gIHBhdGg6IC0+XG4gICAgXCIvaXBzZXQvXCIgKyBAX2lkXG5cbmNsYXNzIHNoYXJlLlR1cGxlXG4gIGNvbnN0cnVjdG9yOiAoZG9jKSAtPlxuICAgIF8uZXh0ZW5kKEAsIGRvYylcbiAgZGlzcGxheU5hbWU6IC0+XG4gICAgQG5hbWUgb3IgXCIjXCIgKyBAX2lkXG4gIG9iamVjdFNlbGVjdE5hbWU6IC0+XG4gICAgQGRpc3BsYXlOYW1lKClcbiAgb2JqZWN0U2VsZWN0VmFsdWU6IC0+XG4gICAgQF9pZFxuICBwYXRoOiAtPlxuICAgIFwiL3R1cGxlL1wiICsgQF9pZFxuXG5zaGFyZS5UcmFuc2Zvcm1hdGlvbnMgPVxuICB1c2VyOiAodXNlcikgLT5cbiAgICBpZiB1c2VyIGluc3RhbmNlb2Ygc2hhcmUuVXNlciBvciBub3QgdXNlciB0aGVuIHVzZXIgZWxzZSBuZXcgc2hhcmUuVXNlcih1c2VyKVxuICBjb25maWc6IChjb25maWcpIC0+XG4gICAgaWYgY29uZmlnIGluc3RhbmNlb2Ygc2hhcmUuQ29uZmlnIG9yIG5vdCBjb25maWcgdGhlbiBjb25maWcgZWxzZSBuZXcgc2hhcmUuQ29uZmlnKGNvbmZpZylcbiAgcXVlcnk6IChxdWVyeSkgLT5cbiAgICBpZiBxdWVyeSBpbnN0YW5jZW9mIHNoYXJlLlF1ZXJ5IG9yIG5vdCBxdWVyeSB0aGVuIHF1ZXJ5IGVsc2UgbmV3IHNoYXJlLlF1ZXJ5KHF1ZXJ5KVxuICBpcHNldDogKGlwc2V0KSAtPlxuICAgIGlmIGlwc2V0IGluc3RhbmNlb2Ygc2hhcmUuSVBTZXQgb3Igbm90IGlwc2V0IHRoZW4gaXBzZXQgZWxzZSBuZXcgc2hhcmUuSVBTZXQoaXBzZXQpXG4gIHR1cGxlOiAodHVwbGUpIC0+XG4gICAgaWYgdHVwbGUgaW5zdGFuY2VvZiBzaGFyZS5UdXBsZSBvciBub3QgdHVwbGUgdGhlbiB0dXBsZSBlbHNlIG5ldyBzaGFyZS5UdXBsZSh0dXBsZSlcbiJdfQ==
