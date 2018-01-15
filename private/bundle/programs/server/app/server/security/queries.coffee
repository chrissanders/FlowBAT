(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/queries.coffee                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Queries.allow({                                                  // 1
  insert: share.securityRulesWrapper(function (userId, query) {        // 2
    if (!userId) {                                                     // 3
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 5
                                                                       //
    query._id = query._id || Random.id();                              // 5
    query.ownerId = userId;                                            // 6
    check(query, {                                                     // 7
      _id: Match.App.Id,                                               // 8
      name: String,                                                    // 9
      cmd: String,                                                     // 10
      exclusionsCmd: String,                                           // 11
      startDateType: String,                                           // 12
      startDateOffsetEnabled: Boolean,                                 // 13
      startDateOffset: String,                                         // 14
      startDateEnabled: Boolean,                                       // 15
      startDate: String,                                               // 16
      endDateEnabled: Boolean,                                         // 17
      endDate: String,                                                 // 18
      sensorEnabled: Boolean,                                          // 19
      sensor: String,                                                  // 20
      typesEnabled: Boolean,                                           // 21
      types: [String],                                                 // 22
      daddressEnabled: Boolean,                                        // 23
      daddress: String,                                                // 24
      saddressEnabled: Boolean,                                        // 25
      saddress: String,                                                // 26
      anyAddressEnabled: Boolean,                                      // 27
      anyAddress: String,                                              // 28
      dipSetEnabled: Boolean,                                          // 29
      dipSet: Match.OneOf(null, Match.App.IPSetId),                    // 30
      sipSetEnabled: Boolean,                                          // 31
      sipSet: Match.OneOf(null, Match.App.IPSetId),                    // 32
      anySetEnabled: Boolean,                                          // 33
      anySet: Match.OneOf(null, Match.App.IPSetId),                    // 34
      tupleFileEnabled: Boolean,                                       // 35
      tupleFile: Match.OneOf(null, Match.App.TupleId),                 // 36
      tupleDirectionEnabled: Boolean,                                  // 37
      tupleDirection: String,                                          // 38
      tupleDelimiterEnabled: Boolean,                                  // 39
      tupleDelimiter: String,                                          // 40
      tupleFieldsEnabled: Boolean,                                     // 41
      tupleFields: String,                                             // 42
      dportEnabled: Boolean,                                           // 43
      dport: String,                                                   // 44
      sportEnabled: Boolean,                                           // 45
      sport: String,                                                   // 46
      aportEnabled: Boolean,                                           // 47
      aport: String,                                                   // 48
      dccEnabled: Boolean,                                             // 49
      dcc: [String],                                                   // 50
      sccEnabled: Boolean,                                             // 51
      scc: [String],                                                   // 52
      protocolEnabled: Boolean,                                        // 53
      protocol: String,                                                // 54
      flagsAllEnabled: Boolean,                                        // 55
      flagsAll: String,                                                // 56
      activeTimeEnabled: Boolean,                                      // 57
      activeTime: String,                                              // 58
      additionalParametersEnabled: Boolean,                            // 59
      additionalParameters: String,                                    // 60
      additionalExclusionsCmdEnabled: Boolean,                         // 61
      additionalExclusionsCmd: String,                                 // 62
      fields: [String],                                                // 63
      fieldsOrder: [String],                                           // 64
      rwstatsDirection: String,                                        // 65
      rwstatsMode: String,                                             // 66
      rwstatsCountModeValue: String,                                   // 67
      rwstatsThresholdModeValue: String,                               // 68
      rwstatsPercentageModeValue: String,                              // 69
      rwstatsBinTimeEnabled: Boolean,                                  // 70
      rwstatsBinTime: String,                                          // 71
      rwstatsFields: [String],                                         // 72
      rwstatsFieldsOrder: [String],                                    // 73
      rwstatsValues: [String],                                         // 74
      rwstatsValuesOrder: [String],                                    // 75
      rwstatsPrimaryValue: String,                                     // 76
      rwstatsCmd: String,                                              // 77
      rwcountBinSizeEnabled: Boolean,                                  // 78
      rwcountBinSize: String,                                          // 79
      rwcountLoadSchemeEnabled: Boolean,                               // 80
      rwcountLoadScheme: String,                                       // 81
      rwcountSkipZeroes: Boolean,                                      // 82
      rwcountCmd: String,                                              // 83
      rwcountFields: [String],                                         // 84
      result: String,                                                  // 85
      error: String,                                                   // 86
      interface: String,                                               // 87
      output: String,                                                  // 88
      presentation: String,                                            // 89
      chartType: String,                                               // 90
      chartHeight: Match.Integer,                                      // 91
      chartHiddenFields: [String],                                     // 92
      expandedFieldsets: [String],                                     // 93
      executingInterval: Match.Integer,                                // 94
      executingAt: Match.OneOf(null, Date),                            // 95
      startRecNum: Match.Integer,                                      // 96
      sortField: String,                                               // 97
      sortReverse: Boolean,                                            // 98
      isInputStale: Boolean,                                           // 99
      isOutputStale: Boolean,                                          // 100
      isUTC: Boolean,                                                  // 101
      isQuick: Boolean,                                                // 102
      isNew: Boolean,                                                  // 103
      ownerId: Match.App.UserId,                                       // 104
      updatedAt: Date,                                                 // 105
      createdAt: Date                                                  // 106
    });                                                                // 8
    return true;                                                       // 109
  }),                                                                  // 2
  update: share.securityRulesWrapper(function (userId, query, fieldNames, modifier, options) {
    var $addToSet, $pull, $set;                                        // 110
                                                                       //
    if (!userId) {                                                     // 110
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 115
                                                                       //
    if (userId !== query.ownerId) {                                    // 112
      throw new Match.Error("Operation not allowed for non-owners");   // 113
    }                                                                  // 118
                                                                       //
    $set = {                                                           // 114
      name: Match.Optional(String),                                    // 115
      cmd: Match.Optional(String),                                     // 116
      exclusionsCmd: Match.Optional(String),                           // 117
      startDateType: Match.Optional(String),                           // 118
      startDateOffsetEnabled: Match.Optional(Boolean),                 // 119
      startDateOffset: Match.Optional(String),                         // 120
      startDateEnabled: Match.Optional(Boolean),                       // 121
      startDate: Match.Optional(String),                               // 122
      endDateEnabled: Match.Optional(Boolean),                         // 123
      endDate: Match.Optional(String),                                 // 124
      sensorEnabled: Match.Optional(Boolean),                          // 125
      sensor: Match.Optional(String),                                  // 126
      typesEnabled: Match.Optional(Boolean),                           // 127
      types: Match.Optional([String]),                                 // 128
      daddressEnabled: Match.Optional(Boolean),                        // 129
      daddress: Match.Optional(String),                                // 130
      saddressEnabled: Match.Optional(Boolean),                        // 131
      saddress: Match.Optional(String),                                // 132
      anyAddressEnabled: Match.Optional(Boolean),                      // 133
      anyAddress: Match.Optional(String),                              // 134
      dipSetEnabled: Match.Optional(Boolean),                          // 135
      dipSet: Match.Optional(Match.OneOf(null, Match.App.IPSetId)),    // 136
      sipSetEnabled: Match.Optional(Boolean),                          // 137
      sipSet: Match.Optional(Match.OneOf(null, Match.App.IPSetId)),    // 138
      anySetEnabled: Match.Optional(Boolean),                          // 139
      anySet: Match.Optional(Match.OneOf(null, Match.App.IPSetId)),    // 140
      tupleFileEnabled: Match.Optional(Boolean),                       // 141
      tupleFile: Match.Optional(Match.OneOf(null, Match.App.TupleId)),
      tupleDirectionEnabled: Match.Optional(Boolean),                  // 143
      tupleDirection: Match.Optional(String),                          // 144
      tupleDelimiterEnabled: Match.Optional(Boolean),                  // 145
      tupleDelimiter: Match.Optional(String),                          // 146
      tupleFieldsEnabled: Match.Optional(Boolean),                     // 147
      tupleFields: Match.Optional(String),                             // 148
      dportEnabled: Match.Optional(Boolean),                           // 149
      dport: Match.Optional(String),                                   // 150
      sportEnabled: Match.Optional(Boolean),                           // 151
      sport: Match.Optional(String),                                   // 152
      aportEnabled: Match.Optional(Boolean),                           // 153
      aport: Match.Optional(String),                                   // 154
      dccEnabled: Match.Optional(Boolean),                             // 155
      dcc: Match.Optional([String]),                                   // 156
      sccEnabled: Match.Optional(Boolean),                             // 157
      scc: Match.Optional([String]),                                   // 158
      protocolEnabled: Match.Optional(Boolean),                        // 159
      protocol: Match.Optional(String),                                // 160
      flagsAllEnabled: Match.Optional(Boolean),                        // 161
      flagsAll: Match.Optional(String),                                // 162
      activeTimeEnabled: Match.Optional(Boolean),                      // 163
      activeTime: Match.Optional(String),                              // 164
      additionalParametersEnabled: Match.Optional(Boolean),            // 165
      additionalParameters: Match.Optional(String),                    // 166
      additionalExclusionsCmdEnabled: Match.Optional(Boolean),         // 167
      additionalExclusionsCmd: Match.Optional(String),                 // 168
      fields: Match.Optional([String]),                                // 169
      fieldsOrder: Match.Optional([String]),                           // 170
      rwstatsDirection: Match.Optional(String),                        // 171
      rwstatsMode: Match.Optional(String),                             // 172
      rwstatsCountModeValue: Match.Optional(String),                   // 173
      rwstatsThresholdModeValue: Match.Optional(String),               // 174
      rwstatsPercentageModeValue: Match.Optional(String),              // 175
      rwstatsBinTimeEnabled: Match.Optional(Boolean),                  // 176
      rwstatsBinTime: Match.Optional(String),                          // 177
      rwstatsFields: Match.Optional([String]),                         // 178
      rwstatsFieldsOrder: Match.Optional([String]),                    // 179
      rwstatsValues: Match.Optional([String]),                         // 180
      rwstatsValuesOrder: Match.Optional([String]),                    // 181
      rwstatsPrimaryValue: Match.Optional(String),                     // 182
      rwstatsCmd: Match.Optional(String),                              // 183
      rwcountBinSizeEnabled: Match.Optional(Boolean),                  // 184
      rwcountBinSize: Match.Optional(String),                          // 185
      rwcountLoadSchemeEnabled: Match.Optional(Boolean),               // 186
      rwcountLoadScheme: Match.Optional(String),                       // 187
      rwcountSkipZeroes: Match.Optional(Boolean),                      // 188
      rwcountCmd: Match.Optional(String),                              // 189
      rwcountFields: Match.Optional([String]),                         // 190
      result: Match.Optional(String),                                  // 191
      error: Match.Optional(String),                                   // 192
      interface: Match.Optional(String),                               // 193
      output: Match.Optional(String),                                  // 194
      presentation: Match.Optional(String),                            // 195
      chartType: Match.Optional(String),                               // 196
      chartHeight: Match.Optional(Match.Integer),                      // 197
      chartHiddenFields: Match.Optional([String]),                     // 198
      expandedFieldsets: Match.Optional([String]),                     // 199
      executingInterval: Match.Optional(Match.Integer),                // 200
      executingAt: Match.Optional(Match.OneOf(null, Date)),            // 201
      startRecNum: Match.Optional(Match.Integer),                      // 202
      sortField: Match.Optional(String),                               // 203
      sortReverse: Match.Optional(Boolean),                            // 204
      isInputStale: Match.Optional(Boolean),                           // 205
      isOutputStale: Match.Optional(Boolean),                          // 206
      isUTC: Match.Optional(Boolean),                                  // 207
      isQuick: Match.Optional(Boolean),                                // 208
      isNew: Match.Optional(Match.App.isNewUpdate(query.isNew)),       // 209
      updatedAt: Date                                                  // 210
    };                                                                 // 115
    $addToSet = {                                                      // 211
      fields: Match.Optional(String),                                  // 212
      rwstatsFields: Match.Optional(String),                           // 213
      rwstatsValues: Match.Optional(String),                           // 214
      rwcountFields: Match.Optional(String),                           // 215
      expandedFieldsets: Match.Optional(String),                       // 216
      chartHiddenFields: Match.Optional(String)                        // 217
    };                                                                 // 212
    $pull = {                                                          // 218
      fields: Match.Optional(String),                                  // 219
      rwstatsFields: Match.Optional(String),                           // 220
      rwstatsValues: Match.Optional(String),                           // 221
      rwcountFields: Match.Optional(String),                           // 222
      expandedFieldsets: Match.Optional(String),                       // 223
      chartHiddenFields: Match.Optional(String)                        // 224
    };                                                                 // 219
    check(modifier, {                                                  // 225
      $set: Match.Optional($set),                                      // 226
      $addToSet: Match.Optional($addToSet),                            // 227
      $pull: Match.Optional($pull)                                     // 228
    });                                                                // 226
    return true;                                                       // 238
  }),                                                                  // 109
  remove: share.securityRulesWrapper(function (userId, query) {        // 231
    if (!userId) {                                                     // 232
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 243
                                                                       //
    if (userId !== query.ownerId) {                                    // 234
      throw new Match.Error("Operation not allowed for non-owners");   // 235
    }                                                                  // 246
                                                                       //
    return true;                                                       // 247
  })                                                                   // 231
});                                                                    // 2
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/queries.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L3F1ZXJpZXMuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwiUXVlcmllcyIsImFsbG93IiwiaW5zZXJ0Iiwic2VjdXJpdHlSdWxlc1dyYXBwZXIiLCJ1c2VySWQiLCJxdWVyeSIsIk1hdGNoIiwiRXJyb3IiLCJfaWQiLCJSYW5kb20iLCJpZCIsIm93bmVySWQiLCJjaGVjayIsIkFwcCIsIklkIiwibmFtZSIsIlN0cmluZyIsImNtZCIsImV4Y2x1c2lvbnNDbWQiLCJzdGFydERhdGVUeXBlIiwic3RhcnREYXRlT2Zmc2V0RW5hYmxlZCIsIkJvb2xlYW4iLCJzdGFydERhdGVPZmZzZXQiLCJzdGFydERhdGVFbmFibGVkIiwic3RhcnREYXRlIiwiZW5kRGF0ZUVuYWJsZWQiLCJlbmREYXRlIiwic2Vuc29yRW5hYmxlZCIsInNlbnNvciIsInR5cGVzRW5hYmxlZCIsInR5cGVzIiwiZGFkZHJlc3NFbmFibGVkIiwiZGFkZHJlc3MiLCJzYWRkcmVzc0VuYWJsZWQiLCJzYWRkcmVzcyIsImFueUFkZHJlc3NFbmFibGVkIiwiYW55QWRkcmVzcyIsImRpcFNldEVuYWJsZWQiLCJkaXBTZXQiLCJPbmVPZiIsIklQU2V0SWQiLCJzaXBTZXRFbmFibGVkIiwic2lwU2V0IiwiYW55U2V0RW5hYmxlZCIsImFueVNldCIsInR1cGxlRmlsZUVuYWJsZWQiLCJ0dXBsZUZpbGUiLCJUdXBsZUlkIiwidHVwbGVEaXJlY3Rpb25FbmFibGVkIiwidHVwbGVEaXJlY3Rpb24iLCJ0dXBsZURlbGltaXRlckVuYWJsZWQiLCJ0dXBsZURlbGltaXRlciIsInR1cGxlRmllbGRzRW5hYmxlZCIsInR1cGxlRmllbGRzIiwiZHBvcnRFbmFibGVkIiwiZHBvcnQiLCJzcG9ydEVuYWJsZWQiLCJzcG9ydCIsImFwb3J0RW5hYmxlZCIsImFwb3J0IiwiZGNjRW5hYmxlZCIsImRjYyIsInNjY0VuYWJsZWQiLCJzY2MiLCJwcm90b2NvbEVuYWJsZWQiLCJwcm90b2NvbCIsImZsYWdzQWxsRW5hYmxlZCIsImZsYWdzQWxsIiwiYWN0aXZlVGltZUVuYWJsZWQiLCJhY3RpdmVUaW1lIiwiYWRkaXRpb25hbFBhcmFtZXRlcnNFbmFibGVkIiwiYWRkaXRpb25hbFBhcmFtZXRlcnMiLCJhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZEVuYWJsZWQiLCJhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZCIsImZpZWxkcyIsImZpZWxkc09yZGVyIiwicndzdGF0c0RpcmVjdGlvbiIsInJ3c3RhdHNNb2RlIiwicndzdGF0c0NvdW50TW9kZVZhbHVlIiwicndzdGF0c1RocmVzaG9sZE1vZGVWYWx1ZSIsInJ3c3RhdHNQZXJjZW50YWdlTW9kZVZhbHVlIiwicndzdGF0c0JpblRpbWVFbmFibGVkIiwicndzdGF0c0JpblRpbWUiLCJyd3N0YXRzRmllbGRzIiwicndzdGF0c0ZpZWxkc09yZGVyIiwicndzdGF0c1ZhbHVlcyIsInJ3c3RhdHNWYWx1ZXNPcmRlciIsInJ3c3RhdHNQcmltYXJ5VmFsdWUiLCJyd3N0YXRzQ21kIiwicndjb3VudEJpblNpemVFbmFibGVkIiwicndjb3VudEJpblNpemUiLCJyd2NvdW50TG9hZFNjaGVtZUVuYWJsZWQiLCJyd2NvdW50TG9hZFNjaGVtZSIsInJ3Y291bnRTa2lwWmVyb2VzIiwicndjb3VudENtZCIsInJ3Y291bnRGaWVsZHMiLCJyZXN1bHQiLCJlcnJvciIsImludGVyZmFjZSIsIm91dHB1dCIsInByZXNlbnRhdGlvbiIsImNoYXJ0VHlwZSIsImNoYXJ0SGVpZ2h0IiwiSW50ZWdlciIsImNoYXJ0SGlkZGVuRmllbGRzIiwiZXhwYW5kZWRGaWVsZHNldHMiLCJleGVjdXRpbmdJbnRlcnZhbCIsImV4ZWN1dGluZ0F0IiwiRGF0ZSIsInN0YXJ0UmVjTnVtIiwic29ydEZpZWxkIiwic29ydFJldmVyc2UiLCJpc0lucHV0U3RhbGUiLCJpc091dHB1dFN0YWxlIiwiaXNVVEMiLCJpc1F1aWNrIiwiaXNOZXciLCJVc2VySWQiLCJ1cGRhdGVkQXQiLCJjcmVhdGVkQXQiLCJ1cGRhdGUiLCJmaWVsZE5hbWVzIiwibW9kaWZpZXIiLCJvcHRpb25zIiwiJGFkZFRvU2V0IiwiJHB1bGwiLCIkc2V0IiwiT3B0aW9uYWwiLCJpc05ld1VwZGF0ZSIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUFBLE1BQU1DLE9BQU4sQ0FBY0MsS0FBZCxDQUNFO0FBQUFDLFVBQVFILE1BQU1JLG9CQUFOLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVDtBQUNqQyxTQUFPRCxNQUFQO0FBQ0UsWUFBTSxJQUFJRSxNQUFNQyxLQUFWLENBQWdCLDhDQUFoQixDQUFOO0FBQ0Q7O0FBQURGLFVBQU1HLEdBQU4sR0FBWUgsTUFBTUcsR0FBTixJQUFhQyxPQUFPQyxFQUFQLEVBQXpCO0FBQ0FMLFVBQU1NLE9BQU4sR0FBZ0JQLE1BQWhCO0FBQ0FRLFVBQU1QLEtBQU4sRUFDRTtBQUFBRyxXQUFLRixNQUFNTyxHQUFOLENBQVVDLEVBQWY7QUFDQUMsWUFBTUMsTUFETjtBQUVBQyxXQUFLRCxNQUZMO0FBR0FFLHFCQUFlRixNQUhmO0FBSUFHLHFCQUFlSCxNQUpmO0FBS0FJLDhCQUF3QkMsT0FMeEI7QUFNQUMsdUJBQWlCTixNQU5qQjtBQU9BTyx3QkFBa0JGLE9BUGxCO0FBUUFHLGlCQUFXUixNQVJYO0FBU0FTLHNCQUFnQkosT0FUaEI7QUFVQUssZUFBU1YsTUFWVDtBQVdBVyxxQkFBZU4sT0FYZjtBQVlBTyxjQUFRWixNQVpSO0FBYUFhLG9CQUFjUixPQWJkO0FBY0FTLGFBQU8sQ0FBQ2QsTUFBRCxDQWRQO0FBZUFlLHVCQUFpQlYsT0FmakI7QUFnQkFXLGdCQUFVaEIsTUFoQlY7QUFpQkFpQix1QkFBaUJaLE9BakJqQjtBQWtCQWEsZ0JBQVVsQixNQWxCVjtBQW1CQW1CLHlCQUFtQmQsT0FuQm5CO0FBb0JBZSxrQkFBWXBCLE1BcEJaO0FBcUJBcUIscUJBQWVoQixPQXJCZjtBQXNCQWlCLGNBQVFoQyxNQUFNaUMsS0FBTixDQUFZLElBQVosRUFBa0JqQyxNQUFN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RDs7QUFURCxRQUFPSCxXQUFVQyxNQUFNTSxPQUF2QjtBQUNFLFlBQU0sSUFBSUwsTUFBTUMsS0FBVixDQUFnQixzQ0FBaEIsQ0FBTjtBQVdEOztBQUNELFdBWEEsSUFXQTtBQWhCTTtBQXJPUixDQURGLDBFIiwiZmlsZSI6Ii9zZXJ2ZXIvc2VjdXJpdHkvcXVlcmllcy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5RdWVyaWVzLmFsbG93XG4gIGluc2VydDogc2hhcmUuc2VjdXJpdHlSdWxlc1dyYXBwZXIgKHVzZXJJZCwgcXVlcnkpIC0+XG4gICAgdW5sZXNzIHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICBxdWVyeS5faWQgPSBxdWVyeS5faWQgb3IgUmFuZG9tLmlkKClcbiAgICBxdWVyeS5vd25lcklkID0gdXNlcklkXG4gICAgY2hlY2socXVlcnksXG4gICAgICBfaWQ6IE1hdGNoLkFwcC5JZFxuICAgICAgbmFtZTogU3RyaW5nXG4gICAgICBjbWQ6IFN0cmluZ1xuICAgICAgZXhjbHVzaW9uc0NtZDogU3RyaW5nXG4gICAgICBzdGFydERhdGVUeXBlOiBTdHJpbmdcbiAgICAgIHN0YXJ0RGF0ZU9mZnNldEVuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIHN0YXJ0RGF0ZU9mZnNldDogU3RyaW5nXG4gICAgICBzdGFydERhdGVFbmFibGVkOiBCb29sZWFuXG4gICAgICBzdGFydERhdGU6IFN0cmluZ1xuICAgICAgZW5kRGF0ZUVuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGVuZERhdGU6IFN0cmluZ1xuICAgICAgc2Vuc29yRW5hYmxlZDogQm9vbGVhblxuICAgICAgc2Vuc29yOiBTdHJpbmdcbiAgICAgIHR5cGVzRW5hYmxlZDogQm9vbGVhblxuICAgICAgdHlwZXM6IFtTdHJpbmddXG4gICAgICBkYWRkcmVzc0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGRhZGRyZXNzOiBTdHJpbmdcbiAgICAgIHNhZGRyZXNzRW5hYmxlZDogQm9vbGVhblxuICAgICAgc2FkZHJlc3M6IFN0cmluZ1xuICAgICAgYW55QWRkcmVzc0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGFueUFkZHJlc3M6IFN0cmluZ1xuICAgICAgZGlwU2V0RW5hYmxlZDogQm9vbGVhblxuICAgICAgZGlwU2V0OiBNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuSVBTZXRJZClcbiAgICAgIHNpcFNldEVuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIHNpcFNldDogTWF0Y2guT25lT2YobnVsbCwgTWF0Y2guQXBwLklQU2V0SWQpXG4gICAgICBhbnlTZXRFbmFibGVkOiBCb29sZWFuXG4gICAgICBhbnlTZXQ6IE1hdGNoLk9uZU9mKG51bGwsIE1hdGNoLkFwcC5JUFNldElkKVxuICAgICAgdHVwbGVGaWxlRW5hYmxlZDogQm9vbGVhblxuICAgICAgdHVwbGVGaWxlOiBNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuVHVwbGVJZClcbiAgICAgIHR1cGxlRGlyZWN0aW9uRW5hYmxlZDogQm9vbGVhblxuICAgICAgdHVwbGVEaXJlY3Rpb246IFN0cmluZ1xuICAgICAgdHVwbGVEZWxpbWl0ZXJFbmFibGVkOiBCb29sZWFuXG4gICAgICB0dXBsZURlbGltaXRlcjogU3RyaW5nXG4gICAgICB0dXBsZUZpZWxkc0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIHR1cGxlRmllbGRzOiBTdHJpbmdcbiAgICAgIGRwb3J0RW5hYmxlZDogQm9vbGVhblxuICAgICAgZHBvcnQ6IFN0cmluZ1xuICAgICAgc3BvcnRFbmFibGVkOiBCb29sZWFuXG4gICAgICBzcG9ydDogU3RyaW5nXG4gICAgICBhcG9ydEVuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGFwb3J0OiBTdHJpbmdcbiAgICAgIGRjY0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGRjYzogW1N0cmluZ11cbiAgICAgIHNjY0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIHNjYzogW1N0cmluZ11cbiAgICAgIHByb3RvY29sRW5hYmxlZDogQm9vbGVhblxuICAgICAgcHJvdG9jb2w6IFN0cmluZ1xuICAgICAgZmxhZ3NBbGxFbmFibGVkOiBCb29sZWFuXG4gICAgICBmbGFnc0FsbDogU3RyaW5nXG4gICAgICBhY3RpdmVUaW1lRW5hYmxlZDogQm9vbGVhblxuICAgICAgYWN0aXZlVGltZTogU3RyaW5nXG4gICAgICBhZGRpdGlvbmFsUGFyYW1ldGVyc0VuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIGFkZGl0aW9uYWxQYXJhbWV0ZXJzOiBTdHJpbmdcbiAgICAgIGFkZGl0aW9uYWxFeGNsdXNpb25zQ21kRW5hYmxlZDogQm9vbGVhblxuICAgICAgYWRkaXRpb25hbEV4Y2x1c2lvbnNDbWQ6IFN0cmluZ1xuICAgICAgZmllbGRzOiBbU3RyaW5nXVxuICAgICAgZmllbGRzT3JkZXI6IFtTdHJpbmddXG4gICAgICByd3N0YXRzRGlyZWN0aW9uOiBTdHJpbmdcbiAgICAgIHJ3c3RhdHNNb2RlOiBTdHJpbmdcbiAgICAgIHJ3c3RhdHNDb3VudE1vZGVWYWx1ZTogU3RyaW5nXG4gICAgICByd3N0YXRzVGhyZXNob2xkTW9kZVZhbHVlOiBTdHJpbmdcbiAgICAgIHJ3c3RhdHNQZXJjZW50YWdlTW9kZVZhbHVlOiBTdHJpbmdcbiAgICAgIHJ3c3RhdHNCaW5UaW1lRW5hYmxlZDogQm9vbGVhblxuICAgICAgcndzdGF0c0JpblRpbWU6IFN0cmluZ1xuICAgICAgcndzdGF0c0ZpZWxkczogW1N0cmluZ11cbiAgICAgIHJ3c3RhdHNGaWVsZHNPcmRlcjogW1N0cmluZ11cbiAgICAgIHJ3c3RhdHNWYWx1ZXM6IFtTdHJpbmddXG4gICAgICByd3N0YXRzVmFsdWVzT3JkZXI6IFtTdHJpbmddXG4gICAgICByd3N0YXRzUHJpbWFyeVZhbHVlOiBTdHJpbmdcbiAgICAgIHJ3c3RhdHNDbWQ6IFN0cmluZ1xuICAgICAgcndjb3VudEJpblNpemVFbmFibGVkOiBCb29sZWFuXG4gICAgICByd2NvdW50QmluU2l6ZTogU3RyaW5nXG4gICAgICByd2NvdW50TG9hZFNjaGVtZUVuYWJsZWQ6IEJvb2xlYW5cbiAgICAgIHJ3Y291bnRMb2FkU2NoZW1lOiBTdHJpbmdcbiAgICAgIHJ3Y291bnRTa2lwWmVyb2VzOiBCb29sZWFuXG4gICAgICByd2NvdW50Q21kOiBTdHJpbmdcbiAgICAgIHJ3Y291bnRGaWVsZHM6IFtTdHJpbmddXG4gICAgICByZXN1bHQ6IFN0cmluZ1xuICAgICAgZXJyb3I6IFN0cmluZ1xuICAgICAgaW50ZXJmYWNlOiBTdHJpbmdcbiAgICAgIG91dHB1dDogU3RyaW5nXG4gICAgICBwcmVzZW50YXRpb246IFN0cmluZ1xuICAgICAgY2hhcnRUeXBlOiBTdHJpbmdcbiAgICAgIGNoYXJ0SGVpZ2h0OiBNYXRjaC5JbnRlZ2VyXG4gICAgICBjaGFydEhpZGRlbkZpZWxkczogW1N0cmluZ11cbiAgICAgIGV4cGFuZGVkRmllbGRzZXRzOiBbU3RyaW5nXVxuICAgICAgZXhlY3V0aW5nSW50ZXJ2YWw6IE1hdGNoLkludGVnZXJcbiAgICAgIGV4ZWN1dGluZ0F0OiBNYXRjaC5PbmVPZihudWxsLCBEYXRlKVxuICAgICAgc3RhcnRSZWNOdW06IE1hdGNoLkludGVnZXJcbiAgICAgIHNvcnRGaWVsZDogU3RyaW5nXG4gICAgICBzb3J0UmV2ZXJzZTogQm9vbGVhblxuICAgICAgaXNJbnB1dFN0YWxlOiBCb29sZWFuXG4gICAgICBpc091dHB1dFN0YWxlOiBCb29sZWFuXG4gICAgICBpc1VUQzogQm9vbGVhblxuICAgICAgaXNRdWljazogQm9vbGVhblxuICAgICAgaXNOZXc6IEJvb2xlYW5cbiAgICAgIG93bmVySWQ6IE1hdGNoLkFwcC5Vc2VySWRcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZVxuICAgICAgY3JlYXRlZEF0OiBEYXRlXG4gICAgKVxuICAgIHRydWVcbiAgdXBkYXRlOiBzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciAodXNlcklkLCBxdWVyeSwgZmllbGROYW1lcywgbW9kaWZpZXIsIG9wdGlvbnMpIC0+XG4gICAgdW5sZXNzIHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICB1bmxlc3MgdXNlcklkIGlzIHF1ZXJ5Lm93bmVySWRcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3Igbm9uLW93bmVyc1wiKVxuICAgICRzZXQgPVxuICAgICAgbmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgY21kOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBleGNsdXNpb25zQ21kOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBzdGFydERhdGVUeXBlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBzdGFydERhdGVPZmZzZXRFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgc3RhcnREYXRlT2Zmc2V0OiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBzdGFydERhdGVFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgc3RhcnREYXRlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBlbmREYXRlRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGVuZERhdGU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHNlbnNvckVuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBzZW5zb3I6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHR5cGVzRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIHR5cGVzOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIGRhZGRyZXNzRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGRhZGRyZXNzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBzYWRkcmVzc0VuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBzYWRkcmVzczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgYW55QWRkcmVzc0VuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBhbnlBZGRyZXNzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBkaXBTZXRFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgZGlwU2V0OiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuSVBTZXRJZCkpXG4gICAgICBzaXBTZXRFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgc2lwU2V0OiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuSVBTZXRJZCkpXG4gICAgICBhbnlTZXRFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgYW55U2V0OiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuSVBTZXRJZCkpXG4gICAgICB0dXBsZUZpbGVFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgdHVwbGVGaWxlOiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihudWxsLCBNYXRjaC5BcHAuVHVwbGVJZCkpXG4gICAgICB0dXBsZURpcmVjdGlvbkVuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICB0dXBsZURpcmVjdGlvbjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgdHVwbGVEZWxpbWl0ZXJFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgdHVwbGVEZWxpbWl0ZXI6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHR1cGxlRmllbGRzRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIHR1cGxlRmllbGRzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBkcG9ydEVuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBkcG9ydDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgc3BvcnRFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgc3BvcnQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGFwb3J0RW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGFwb3J0OiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBkY2NFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgZGNjOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIHNjY0VuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBzY2M6IE1hdGNoLk9wdGlvbmFsKFtTdHJpbmddKVxuICAgICAgcHJvdG9jb2xFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgcHJvdG9jb2w6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGZsYWdzQWxsRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGZsYWdzQWxsOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBhY3RpdmVUaW1lRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGFjdGl2ZVRpbWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGFkZGl0aW9uYWxQYXJhbWV0ZXJzRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGFkZGl0aW9uYWxQYXJhbWV0ZXJzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZEVuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgZmllbGRzOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIGZpZWxkc09yZGVyOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIHJ3c3RhdHNEaXJlY3Rpb246IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHJ3c3RhdHNNb2RlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd3N0YXRzQ291bnRNb2RlVmFsdWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHJ3c3RhdHNUaHJlc2hvbGRNb2RlVmFsdWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHJ3c3RhdHNQZXJjZW50YWdlTW9kZVZhbHVlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd3N0YXRzQmluVGltZUVuYWJsZWQ6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICByd3N0YXRzQmluVGltZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndzdGF0c0ZpZWxkczogTWF0Y2guT3B0aW9uYWwoW1N0cmluZ10pXG4gICAgICByd3N0YXRzRmllbGRzT3JkZXI6IE1hdGNoLk9wdGlvbmFsKFtTdHJpbmddKVxuICAgICAgcndzdGF0c1ZhbHVlczogTWF0Y2guT3B0aW9uYWwoW1N0cmluZ10pXG4gICAgICByd3N0YXRzVmFsdWVzT3JkZXI6IE1hdGNoLk9wdGlvbmFsKFtTdHJpbmddKVxuICAgICAgcndzdGF0c1ByaW1hcnlWYWx1ZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndzdGF0c0NtZDogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndjb3VudEJpblNpemVFbmFibGVkOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgcndjb3VudEJpblNpemU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHJ3Y291bnRMb2FkU2NoZW1lRW5hYmxlZDogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIHJ3Y291bnRMb2FkU2NoZW1lOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd2NvdW50U2tpcFplcm9lczogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIHJ3Y291bnRDbWQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHJ3Y291bnRGaWVsZHM6IE1hdGNoLk9wdGlvbmFsKFtTdHJpbmddKVxuICAgICAgcmVzdWx0OiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBlcnJvcjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgaW50ZXJmYWNlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBvdXRwdXQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHByZXNlbnRhdGlvbjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgY2hhcnRUeXBlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBjaGFydEhlaWdodDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guSW50ZWdlcilcbiAgICAgIGNoYXJ0SGlkZGVuRmllbGRzOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIGV4cGFuZGVkRmllbGRzZXRzOiBNYXRjaC5PcHRpb25hbChbU3RyaW5nXSlcbiAgICAgIGV4ZWN1dGluZ0ludGVydmFsOiBNYXRjaC5PcHRpb25hbChNYXRjaC5JbnRlZ2VyKVxuICAgICAgZXhlY3V0aW5nQXQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKG51bGwsIERhdGUpKVxuICAgICAgc3RhcnRSZWNOdW06IE1hdGNoLk9wdGlvbmFsKE1hdGNoLkludGVnZXIpXG4gICAgICBzb3J0RmllbGQ6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHNvcnRSZXZlcnNlOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgaXNJbnB1dFN0YWxlOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgaXNPdXRwdXRTdGFsZTogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGlzVVRDOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKVxuICAgICAgaXNRdWljazogTWF0Y2guT3B0aW9uYWwoQm9vbGVhbilcbiAgICAgIGlzTmV3OiBNYXRjaC5PcHRpb25hbChNYXRjaC5BcHAuaXNOZXdVcGRhdGUocXVlcnkuaXNOZXcpKVxuICAgICAgdXBkYXRlZEF0OiBEYXRlXG4gICAgJGFkZFRvU2V0ID1cbiAgICAgIGZpZWxkczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndzdGF0c0ZpZWxkczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndzdGF0c1ZhbHVlczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgcndjb3VudEZpZWxkczogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgZXhwYW5kZWRGaWVsZHNldHM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGNoYXJ0SGlkZGVuRmllbGRzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgJHB1bGwgPVxuICAgICAgZmllbGRzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd3N0YXRzRmllbGRzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd3N0YXRzVmFsdWVzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICByd2NvdW50RmllbGRzOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBleHBhbmRlZEZpZWxkc2V0czogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgY2hhcnRIaWRkZW5GaWVsZHM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICBjaGVjayhtb2RpZmllcixcbiAgICAgICRzZXQ6IE1hdGNoLk9wdGlvbmFsKCRzZXQpXG4gICAgICAkYWRkVG9TZXQ6IE1hdGNoLk9wdGlvbmFsKCRhZGRUb1NldClcbiAgICAgICRwdWxsOiBNYXRjaC5PcHRpb25hbCgkcHVsbClcbiAgICApXG4gICAgdHJ1ZVxuICByZW1vdmU6IHNoYXJlLnNlY3VyaXR5UnVsZXNXcmFwcGVyICh1c2VySWQsIHF1ZXJ5KSAtPlxuICAgIHVubGVzcyB1c2VySWRcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3IgdW5hdXRob3JpemVkIHVzZXJzXCIpXG4gICAgdW5sZXNzIHVzZXJJZCBpcyBxdWVyeS5vd25lcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIG5vbi1vd25lcnNcIilcbiAgICB0cnVlXG4iXX0=
