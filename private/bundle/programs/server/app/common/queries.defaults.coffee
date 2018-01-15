(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/queries.defaults.coffee                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var queryPreSave;                                                      // 1
                                                                       //
queryPreSave = function (userId, changes) {};                          // 1
                                                                       //
share.Queries.before.insert(function (userId, query) {                 // 3
  var count, now, prefix, startDate;                                   // 4
  query._id = query._id || Random.id();                                // 4
  now = new Date();                                                    // 5
  startDate = moment.utc().format("YYYY/MM/DD:HH");                    // 6
                                                                       //
  _.defaults(query, {                                                  // 7
    name: "",                                                          // 8
    cmd: "",                                                           // 9
    exclusionsCmd: "",                                                 // 10
    startDateType: "interval",                                         // 11
    startDateOffsetEnabled: false,                                     // 12
    startDateOffset: "60",                                             // 13
    startDateEnabled: true,                                            // 14
    startDate: startDate,                                              // 15
    endDateEnabled: false,                                             // 16
    endDate: "",                                                       // 17
    sensorEnabled: false,                                              // 18
    sensor: "",                                                        // 19
    typesEnabled: false,                                               // 20
    types: [],                                                         // 21
    daddressEnabled: false,                                            // 22
    daddress: "",                                                      // 23
    saddressEnabled: false,                                            // 24
    saddress: "",                                                      // 25
    anyAddressEnabled: false,                                          // 26
    anyAddress: "",                                                    // 27
    dipSetEnabled: false,                                              // 28
    dipSet: null,                                                      // 29
    sipSetEnabled: false,                                              // 30
    sipSet: null,                                                      // 31
    anySetEnabled: false,                                              // 32
    anySet: null,                                                      // 33
    tupleFileEnabled: false,                                           // 34
    tupleFile: null,                                                   // 35
    tupleDirectionEnabled: false,                                      // 36
    tupleDirection: "",                                                // 37
    tupleDelimiterEnabled: false,                                      // 38
    tupleDelimiter: "",                                                // 39
    tupleFieldsEnabled: false,                                         // 40
    tupleFields: "",                                                   // 41
    dportEnabled: false,                                               // 42
    dport: "",                                                         // 43
    sportEnabled: false,                                               // 44
    sport: "",                                                         // 45
    aportEnabled: false,                                               // 46
    aport: "",                                                         // 47
    dccEnabled: false,                                                 // 48
    dcc: [],                                                           // 49
    sccEnabled: false,                                                 // 50
    scc: [],                                                           // 51
    protocolEnabled: true,                                             // 52
    protocol: "0-255",                                                 // 53
    flagsAllEnabled: false,                                            // 54
    flagsAll: "",                                                      // 55
    activeTimeEnabled: false,                                          // 56
    activeTime: "",                                                    // 57
    additionalParametersEnabled: false,                                // 58
    additionalParameters: "",                                          // 59
    additionalExclusionsCmdEnabled: false,                             // 60
    additionalExclusionsCmd: "",                                       // 61
    fields: ["sIP", "dIP", "sPort", "dPort", "protocol", "packets", "bytes", "flags", "sTime", "duration", "eTime", "sensor"],
    fieldsOrder: _.clone(share.rwcutFields),                           // 63
    rwstatsDirection: "top",                                           // 64
    rwstatsMode: "count",                                              // 65
    rwstatsCountModeValue: "10",                                       // 66
    rwstatsThresholdModeValue: "",                                     // 67
    rwstatsPercentageModeValue: "",                                    // 68
    rwstatsBinTimeEnabled: false,                                      // 69
    rwstatsBinTime: "60",                                              // 70
    rwstatsFields: [],                                                 // 71
    rwstatsFieldsOrder: _.clone(share.rwcutFields),                    // 72
    rwstatsValues: [],                                                 // 73
    rwstatsValuesOrder: share.rwstatsValues.concat(share.rwcutFields),
    rwstatsPrimaryValue: "",                                           // 75
    rwstatsCmd: "",                                                    // 76
    rwcountBinSizeEnabled: false,                                      // 77
    rwcountBinSize: "",                                                // 78
    rwcountLoadSchemeEnabled: false,                                   // 79
    rwcountLoadScheme: "",                                             // 80
    rwcountSkipZeroes: true,                                           // 81
    rwcountFields: _.clone(share.rwcountFields),                       // 82
    rwcountCmd: "",                                                    // 83
    "interface": "cmd",                                                // 84
    output: "rwcut",                                                   // 85
    presentation: "table",                                             // 86
    chartType: "LineChart",                                            // 87
    chartHeight: 400,                                                  // 88
    expandedFieldsets: ["time"],                                       // 89
    executingInterval: 0,                                              // 90
    executingAt: null,                                                 // 91
    isInputStale: false,                                               // 92
    isOutputStale: false,                                              // 93
    isUTC: true,                                                       // 94
    isQuick: false,                                                    // 95
    isNew: true,                                                       // 96
    ownerId: userId,                                                   // 97
    updatedAt: now,                                                    // 98
    createdAt: now                                                     // 99
  }, share.queryBlankValues, share.queryResetValues);                  // 8
                                                                       //
  if (!query.name) {                                                   // 101
    prefix = "New query";                                              // 102
    count = share.Queries.find({                                       // 103
      name: {                                                          // 103
        $regex: "^" + prefix,                                          // 103
        $options: "i"                                                  // 103
      }                                                                // 103
    }).count();                                                        // 103
    query.name = prefix;                                               // 104
                                                                       //
    if (count) {                                                       // 105
      query.name += " (" + count + ")";                                // 106
    }                                                                  // 101
  }                                                                    // 116
                                                                       //
  return queryPreSave.call(this, userId, query);                       // 117
});                                                                    // 3
share.Queries.before.update(function (userId, query, fieldNames, modifier, options) {
  var now;                                                             // 110
  now = new Date();                                                    // 110
  modifier.$set = modifier.$set || {};                                 // 111
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;            // 112
  return queryPreSave.call(this, userId, modifier.$set);               // 125
});                                                                    // 109
share.queryBlankValues = {                                             // 115
  result: "",                                                          // 116
  error: ""                                                            // 117
};                                                                     // 116
share.queryResetValues = {                                             // 119
  startRecNum: 1,                                                      // 120
  sortField: "",                                                       // 121
  sortReverse: true,                                                   // 122
  chartHiddenFields: []                                                // 123
};                                                                     // 120
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/queries.defaults.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL3F1ZXJpZXMuZGVmYXVsdHMuY29mZmVlIl0sIm5hbWVzIjpbInF1ZXJ5UHJlU2F2ZSIsInVzZXJJZCIsImNoYW5nZXMiLCJzaGFyZSIsIlF1ZXJpZXMiLCJiZWZvcmUiLCJpbnNlcnQiLCJxdWVyeSIsImNvdW50Iiwibm93IiwicHJlZml4Iiwic3RhcnREYXRlIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJEYXRlIiwibW9tZW50IiwidXRjIiwiZm9ybWF0IiwiXyIsImRlZmF1bHRzIiwibmFtZSIsImNtZCIsImV4Y2x1c2lvbnNDbWQiLCJzdGFydERhdGVUeXBlIiwic3RhcnREYXRlT2Zmc2V0RW5hYmxlZCIsInN0YXJ0RGF0ZU9mZnNldCIsInN0YXJ0RGF0ZUVuYWJsZWQiLCJlbmREYXRlRW5hYmxlZCIsImVuZERhdGUiLCJzZW5zb3JFbmFibGVkIiwic2Vuc29yIiwidHlwZXNFbmFibGVkIiwidHlwZXMiLCJkYWRkcmVzc0VuYWJsZWQiLCJkYWRkcmVzcyIsInNhZGRyZXNzRW5hYmxlZCIsInNhZGRyZXNzIiwiYW55QWRkcmVzc0VuYWJsZWQiLCJhbnlBZGRyZXNzIiwiZGlwU2V0RW5hYmxlZCIsImRpcFNldCIsInNpcFNldEVuYWJsZWQiLCJzaXBTZXQiLCJhbnlTZXRFbmFibGVkIiwiYW55U2V0IiwidHVwbGVGaWxlRW5hYmxlZCIsInR1cGxlRmlsZSIsInR1cGxlRGlyZWN0aW9uRW5hYmxlZCIsInR1cGxlRGlyZWN0aW9uIiwidHVwbGVEZWxpbWl0ZXJFbmFibGVkIiwidHVwbGVEZWxpbWl0ZXIiLCJ0dXBsZUZpZWxkc0VuYWJsZWQiLCJ0dXBsZUZpZWxkcyIsImRwb3J0RW5hYmxlZCIsImRwb3J0Iiwic3BvcnRFbmFibGVkIiwic3BvcnQiLCJhcG9ydEVuYWJsZWQiLCJhcG9ydCIsImRjY0VuYWJsZWQiLCJkY2MiLCJzY2NFbmFibGVkIiwic2NjIiwicHJvdG9jb2xFbmFibGVkIiwicHJvdG9jb2wiLCJmbGFnc0FsbEVuYWJsZWQiLCJmbGFnc0FsbCIsImFjdGl2ZVRpbWVFbmFibGVkIiwiYWN0aXZlVGltZSIsImFkZGl0aW9uYWxQYXJhbWV0ZXJzRW5hYmxlZCIsImFkZGl0aW9uYWxQYXJhbWV0ZXJzIiwiYWRkaXRpb25hbEV4Y2x1c2lvbnNDbWRFbmFibGVkIiwiYWRkaXRpb25hbEV4Y2x1c2lvbnNDbWQiLCJmaWVsZHMiLCJmaWVsZHNPcmRlciIsImNsb25lIiwicndjdXRGaWVsZHMiLCJyd3N0YXRzRGlyZWN0aW9uIiwicndzdGF0c01vZGUiLCJyd3N0YXRzQ291bnRNb2RlVmFsdWUiLCJyd3N0YXRzVGhyZXNob2xkTW9kZVZhbHVlIiwicndzdGF0c1BlcmNlbnRhZ2VNb2RlVmFsdWUiLCJyd3N0YXRzQmluVGltZUVuYWJsZWQiLCJyd3N0YXRzQmluVGltZSIsInJ3c3RhdHNGaWVsZHMiLCJyd3N0YXRzRmllbGRzT3JkZXIiLCJyd3N0YXRzVmFsdWVzIiwicndzdGF0c1ZhbHVlc09yZGVyIiwiY29uY2F0IiwicndzdGF0c1ByaW1hcnlWYWx1ZSIsInJ3c3RhdHNDbWQiLCJyd2NvdW50QmluU2l6ZUVuYWJsZWQiLCJyd2NvdW50QmluU2l6ZSIsInJ3Y291bnRMb2FkU2NoZW1lRW5hYmxlZCIsInJ3Y291bnRMb2FkU2NoZW1lIiwicndjb3VudFNraXBaZXJvZXMiLCJyd2NvdW50RmllbGRzIiwicndjb3VudENtZCIsIm91dHB1dCIsInByZXNlbnRhdGlvbiIsImNoYXJ0VHlwZSIsImNoYXJ0SGVpZ2h0IiwiZXhwYW5kZWRGaWVsZHNldHMiLCJleGVjdXRpbmdJbnRlcnZhbCIsImV4ZWN1dGluZ0F0IiwiaXNJbnB1dFN0YWxlIiwiaXNPdXRwdXRTdGFsZSIsImlzVVRDIiwiaXNRdWljayIsImlzTmV3Iiwib3duZXJJZCIsInVwZGF0ZWRBdCIsImNyZWF0ZWRBdCIsInF1ZXJ5QmxhbmtWYWx1ZXMiLCJxdWVyeVJlc2V0VmFsdWVzIiwiZmluZCIsIiRyZWdleCIsIiRvcHRpb25zIiwiY2FsbCIsInVwZGF0ZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCIkc2V0IiwicmVzdWx0IiwiZXJyb3IiLCJzdGFydFJlY051bSIsInNvcnRGaWVsZCIsInNvcnRSZXZlcnNlIiwiY2hhcnRIaWRkZW5GaWVsZHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLElBQUFBLFlBQUE7O0FBQUFBLGVBQWUsVUFBQ0MsTUFBRCxFQUFTQyxPQUFULElBQWY7O0FBRUFDLE1BQU1DLE9BQU4sQ0FBY0MsTUFBZCxDQUFxQkMsTUFBckIsQ0FBNEIsVUFBQ0wsTUFBRCxFQUFTTSxLQUFUO0FBQzFCLE1BQUFDLEtBQUEsRUFBQUMsR0FBQSxFQUFBQyxNQUFBLEVBQUFDLFNBQUE7QUFBQUosUUFBTUssR0FBTixHQUFZTCxNQUFNSyxHQUFOLElBQWFDLE9BQU9DLEVBQVAsRUFBekI7QUFDQUwsUUFBTSxJQUFJTSxJQUFKLEVBQU47QUFDQUosY0FBWUssT0FBT0MsR0FBUCxHQUFhQyxNQUFiLENBQW9CLGVBQXBCLENBQVo7O0FBQ0FDLElBQUVDLFFBQUYsQ0FBV2IsS0FBWCxFQUNFO0FBQUFjLFVBQU0sRUFBTjtBQUNBQyxTQUFLLEVBREw7QUFFQUMsbUJBQWUsRUFGZjtBQUdBQyxtQkFBZSxVQUhmO0FBSUFDLDRCQUF3QixLQUp4QjtBQUtBQyxxQkFBaUIsSUFMakI7QUFNQUMsc0JBQWtCLElBTmxCO0FBT0FoQixlQUFXQSxTQVBYO0FBUUFpQixvQkFBZ0IsS0FSaEI7QUFTQUMsYUFBUyxFQVRUO0FBVUFDLG1CQUFlLEtBVmY7QUFXQUMsWUFBUSxFQVhSO0FBWUFDLGtCQUFjLEtBWmQ7QUFhQUMsV0FBTyxFQWJQO0FBY0FDLHFCQUFpQixLQWRqQjtBQWVBQyxjQUFVLEVBZlY7QUFnQkFDLHFCQUFpQixLQWhCakI7QUFpQkFDLGNBQVUsRUFqQlY7QUFrQkFDLHVCQUFtQixLQWxCbkI7QUFtQkFDLGdCQUFZLEVBbkJaO0FBb0JBQyxtQkFBZSxLQXBCZjtBQXFCQUMsWUFBUSxJQXJCUjtBQXNCQUMsbUJBQWUsS0F0QmY7QUF1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QUVnRyxnQkFBUSxNQUFNM0csTUFBaEI7QUFBd0I0RyxrQkFBVTtBQUFsQztBQUFSLEtBQW5CLEVBQXNFOUcsS0FBdEUsRUFBUjtBQUNBRCxVQUFNYyxJQUFOLEdBQWFYLE1BQWI7O0FBQ0EsUUFBR0YsS0FBSDtBQUNFRCxZQUFNYyxJQUFOLElBQWMsT0FBT2IsS0FBUCxHQUFlLEdBQTdCO0FBTEo7QUFlQzs7QUFDRCxTQVZBUixhQUFhdUgsSUFBYixDQUFrQixJQUFsQixFQUFxQnRILE1BQXJCLEVBQTZCTSxLQUE3QixDQVVBO0FBbEhGO0FBMEdBSixNQUFNQyxPQUFOLENBQWNDLE1BQWQsQ0FBcUJtSCxNQUFyQixDQUE0QixVQUFDdkgsTUFBRCxFQUFTTSxLQUFULEVBQWdCa0gsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUMxQixNQUFBbEgsR0FBQTtBQUFBQSxRQUFNLElBQUlNLElBQUosRUFBTjtBQUNBMkcsV0FBU0UsSUFBVCxHQUFnQkYsU0FBU0UsSUFBVCxJQUFpQixFQUFqQztBQUNBRixXQUFTRSxJQUFULENBQWNaLFNBQWQsR0FBMEJVLFNBQVNFLElBQVQsQ0FBY1osU0FBZCxJQUEyQnZHLEdBQXJEO0FBYUEsU0FaQVQsYUFBYXVILElBQWIsQ0FBa0IsSUFBbEIsRUFBcUJ0SCxNQUFyQixFQUE2QnlILFNBQVNFLElBQXRDLENBWUE7QUFoQkY7QUFNQXpILE1BQU0rRyxnQkFBTixHQUNFO0FBQUFXLFVBQVEsRUFBUjtBQUNBQyxTQUFPO0FBRFAsQ0FERjtBQUlBM0gsTUFBTWdILGdCQUFOLEdBQ0U7QUFBQVksZUFBYSxDQUFiO0FBQ0FDLGFBQVcsRUFEWDtBQUVBQyxlQUFhLElBRmI7QUFHQUMscUJBQW1CO0FBSG5CLENBREYsNEUiLCJmaWxlIjoiL2NvbW1vbi9xdWVyaWVzLmRlZmF1bHRzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbInF1ZXJ5UHJlU2F2ZSA9ICh1c2VySWQsIGNoYW5nZXMpIC0+XG5cbnNoYXJlLlF1ZXJpZXMuYmVmb3JlLmluc2VydCAodXNlcklkLCBxdWVyeSkgLT5cbiAgcXVlcnkuX2lkID0gcXVlcnkuX2lkIHx8IFJhbmRvbS5pZCgpXG4gIG5vdyA9IG5ldyBEYXRlKClcbiAgc3RhcnREYXRlID0gbW9tZW50LnV0YygpLmZvcm1hdChcIllZWVkvTU0vREQ6SEhcIilcbiAgXy5kZWZhdWx0cyhxdWVyeSxcbiAgICBuYW1lOiBcIlwiXG4gICAgY21kOiBcIlwiXG4gICAgZXhjbHVzaW9uc0NtZDogXCJcIlxuICAgIHN0YXJ0RGF0ZVR5cGU6IFwiaW50ZXJ2YWxcIlxuICAgIHN0YXJ0RGF0ZU9mZnNldEVuYWJsZWQ6IGZhbHNlXG4gICAgc3RhcnREYXRlT2Zmc2V0OiBcIjYwXCJcbiAgICBzdGFydERhdGVFbmFibGVkOiB0cnVlXG4gICAgc3RhcnREYXRlOiBzdGFydERhdGVcbiAgICBlbmREYXRlRW5hYmxlZDogZmFsc2VcbiAgICBlbmREYXRlOiBcIlwiXG4gICAgc2Vuc29yRW5hYmxlZDogZmFsc2VcbiAgICBzZW5zb3I6IFwiXCJcbiAgICB0eXBlc0VuYWJsZWQ6IGZhbHNlXG4gICAgdHlwZXM6IFtdXG4gICAgZGFkZHJlc3NFbmFibGVkOiBmYWxzZVxuICAgIGRhZGRyZXNzOiBcIlwiXG4gICAgc2FkZHJlc3NFbmFibGVkOiBmYWxzZVxuICAgIHNhZGRyZXNzOiBcIlwiXG4gICAgYW55QWRkcmVzc0VuYWJsZWQ6IGZhbHNlXG4gICAgYW55QWRkcmVzczogXCJcIlxuICAgIGRpcFNldEVuYWJsZWQ6IGZhbHNlXG4gICAgZGlwU2V0OiBudWxsXG4gICAgc2lwU2V0RW5hYmxlZDogZmFsc2VcbiAgICBzaXBTZXQ6IG51bGxcbiAgICBhbnlTZXRFbmFibGVkOiBmYWxzZVxuICAgIGFueVNldDogbnVsbFxuICAgIHR1cGxlRmlsZUVuYWJsZWQ6IGZhbHNlXG4gICAgdHVwbGVGaWxlOiBudWxsXG4gICAgdHVwbGVEaXJlY3Rpb25FbmFibGVkOiBmYWxzZVxuICAgIHR1cGxlRGlyZWN0aW9uOiBcIlwiXG4gICAgdHVwbGVEZWxpbWl0ZXJFbmFibGVkOiBmYWxzZVxuICAgIHR1cGxlRGVsaW1pdGVyOiBcIlwiXG4gICAgdHVwbGVGaWVsZHNFbmFibGVkOiBmYWxzZVxuICAgIHR1cGxlRmllbGRzOiBcIlwiXG4gICAgZHBvcnRFbmFibGVkOiBmYWxzZVxuICAgIGRwb3J0OiBcIlwiXG4gICAgc3BvcnRFbmFibGVkOiBmYWxzZVxuICAgIHNwb3J0OiBcIlwiXG4gICAgYXBvcnRFbmFibGVkOiBmYWxzZVxuICAgIGFwb3J0OiBcIlwiXG4gICAgZGNjRW5hYmxlZDogZmFsc2VcbiAgICBkY2M6IFtdXG4gICAgc2NjRW5hYmxlZDogZmFsc2VcbiAgICBzY2M6IFtdXG4gICAgcHJvdG9jb2xFbmFibGVkOiB0cnVlXG4gICAgcHJvdG9jb2w6IFwiMC0yNTVcIlxuICAgIGZsYWdzQWxsRW5hYmxlZDogZmFsc2VcbiAgICBmbGFnc0FsbDogXCJcIlxuICAgIGFjdGl2ZVRpbWVFbmFibGVkOiBmYWxzZVxuICAgIGFjdGl2ZVRpbWU6IFwiXCJcbiAgICBhZGRpdGlvbmFsUGFyYW1ldGVyc0VuYWJsZWQ6IGZhbHNlXG4gICAgYWRkaXRpb25hbFBhcmFtZXRlcnM6IFwiXCJcbiAgICBhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZEVuYWJsZWQ6IGZhbHNlXG4gICAgYWRkaXRpb25hbEV4Y2x1c2lvbnNDbWQ6IFwiXCJcbiAgICBmaWVsZHM6IFtcInNJUFwiLCBcImRJUFwiLCBcInNQb3J0XCIsIFwiZFBvcnRcIiwgXCJwcm90b2NvbFwiLCBcInBhY2tldHNcIiwgXCJieXRlc1wiLCBcImZsYWdzXCIsIFwic1RpbWVcIiwgXCJkdXJhdGlvblwiLCBcImVUaW1lXCIsIFwic2Vuc29yXCJdXG4gICAgZmllbGRzT3JkZXI6IF8uY2xvbmUoc2hhcmUucndjdXRGaWVsZHMpXG4gICAgcndzdGF0c0RpcmVjdGlvbjogXCJ0b3BcIlxuICAgIHJ3c3RhdHNNb2RlOiBcImNvdW50XCJcbiAgICByd3N0YXRzQ291bnRNb2RlVmFsdWU6IFwiMTBcIlxuICAgIHJ3c3RhdHNUaHJlc2hvbGRNb2RlVmFsdWU6IFwiXCJcbiAgICByd3N0YXRzUGVyY2VudGFnZU1vZGVWYWx1ZTogXCJcIlxuICAgIHJ3c3RhdHNCaW5UaW1lRW5hYmxlZDogZmFsc2VcbiAgICByd3N0YXRzQmluVGltZTogXCI2MFwiXG4gICAgcndzdGF0c0ZpZWxkczogW11cbiAgICByd3N0YXRzRmllbGRzT3JkZXI6IF8uY2xvbmUoc2hhcmUucndjdXRGaWVsZHMpXG4gICAgcndzdGF0c1ZhbHVlczogW11cbiAgICByd3N0YXRzVmFsdWVzT3JkZXI6IHNoYXJlLnJ3c3RhdHNWYWx1ZXMuY29uY2F0KHNoYXJlLnJ3Y3V0RmllbGRzKVxuICAgIHJ3c3RhdHNQcmltYXJ5VmFsdWU6IFwiXCJcbiAgICByd3N0YXRzQ21kOiBcIlwiXG4gICAgcndjb3VudEJpblNpemVFbmFibGVkOiBmYWxzZVxuICAgIHJ3Y291bnRCaW5TaXplOiBcIlwiXG4gICAgcndjb3VudExvYWRTY2hlbWVFbmFibGVkOiBmYWxzZVxuICAgIHJ3Y291bnRMb2FkU2NoZW1lOiBcIlwiXG4gICAgcndjb3VudFNraXBaZXJvZXM6IHRydWVcbiAgICByd2NvdW50RmllbGRzOiBfLmNsb25lKHNoYXJlLnJ3Y291bnRGaWVsZHMpXG4gICAgcndjb3VudENtZDogXCJcIlxuICAgIGludGVyZmFjZTogXCJjbWRcIlxuICAgIG91dHB1dDogXCJyd2N1dFwiXG4gICAgcHJlc2VudGF0aW9uOiBcInRhYmxlXCJcbiAgICBjaGFydFR5cGU6IFwiTGluZUNoYXJ0XCJcbiAgICBjaGFydEhlaWdodDogNDAwXG4gICAgZXhwYW5kZWRGaWVsZHNldHM6IFtcInRpbWVcIl1cbiAgICBleGVjdXRpbmdJbnRlcnZhbDogMFxuICAgIGV4ZWN1dGluZ0F0OiBudWxsXG4gICAgaXNJbnB1dFN0YWxlOiBmYWxzZVxuICAgIGlzT3V0cHV0U3RhbGU6IGZhbHNlXG4gICAgaXNVVEM6IHRydWVcbiAgICBpc1F1aWNrOiBmYWxzZVxuICAgIGlzTmV3OiB0cnVlXG4gICAgb3duZXJJZDogdXNlcklkXG4gICAgdXBkYXRlZEF0OiBub3dcbiAgICBjcmVhdGVkQXQ6IG5vd1xuICAsIHNoYXJlLnF1ZXJ5QmxhbmtWYWx1ZXMsIHNoYXJlLnF1ZXJ5UmVzZXRWYWx1ZXMpXG4gIGlmIG5vdCBxdWVyeS5uYW1lXG4gICAgcHJlZml4ID0gXCJOZXcgcXVlcnlcIlxuICAgIGNvdW50ID0gc2hhcmUuUXVlcmllcy5maW5kKHsgbmFtZTogeyAkcmVnZXg6IFwiXlwiICsgcHJlZml4LCAkb3B0aW9uczogXCJpXCIgfSB9KS5jb3VudCgpXG4gICAgcXVlcnkubmFtZSA9IHByZWZpeFxuICAgIGlmIGNvdW50XG4gICAgICBxdWVyeS5uYW1lICs9IFwiIChcIiArIGNvdW50ICsgXCIpXCJcbiAgcXVlcnlQcmVTYXZlLmNhbGwoQCwgdXNlcklkLCBxdWVyeSlcblxuc2hhcmUuUXVlcmllcy5iZWZvcmUudXBkYXRlICh1c2VySWQsIHF1ZXJ5LCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgbm93ID0gbmV3IERhdGUoKVxuICBtb2RpZmllci4kc2V0ID0gbW9kaWZpZXIuJHNldCBvciB7fVxuICBtb2RpZmllci4kc2V0LnVwZGF0ZWRBdCA9IG1vZGlmaWVyLiRzZXQudXBkYXRlZEF0IG9yIG5vd1xuICBxdWVyeVByZVNhdmUuY2FsbChALCB1c2VySWQsIG1vZGlmaWVyLiRzZXQpXG5cbnNoYXJlLnF1ZXJ5QmxhbmtWYWx1ZXMgPVxuICByZXN1bHQ6IFwiXCJcbiAgZXJyb3I6IFwiXCJcblxuc2hhcmUucXVlcnlSZXNldFZhbHVlcyA9XG4gIHN0YXJ0UmVjTnVtOiAxXG4gIHNvcnRGaWVsZDogXCJcIlxuICBzb3J0UmV2ZXJzZTogdHJ1ZVxuICBjaGFydEhpZGRlbkZpZWxkczogW11cbiJdfQ==
