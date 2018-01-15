(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/app.coffee                                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var object, share;                                                     // 1
share = share || {}; //share.combine = (funcs...) ->                   // 1
//  (args...) =>                                                       // 6
//    for func in funcs                                                // 7
//      func.apply(@, args)                                            // 8
                                                                       //
share.user = function (fields) {                                       // 8
  var userId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Meteor.userId();
  return Meteor.users.findOne(userId, {                                // 10
    fields: fields                                                     // 9
  });                                                                  // 9
};                                                                     // 8
                                                                       //
share.intval = function (value) {                                      // 11
  return parseInt(value, 10) || 0;                                     // 16
};                                                                     // 11
                                                                       //
share.minute = 60 * 1000;                                              // 14
share.hour = 60 * share.minute;                                        // 15
share.datetimeFormat = "YYYY/MM/DD HH:mm:ss.SSS";                      // 17
share.rwcutFields = ["sIP", "dIP", "sPort", "dPort", "protocol", "packets", "bytes", "flags", "sTime", "duration", "eTime", "sensor", "class", "scc", "dcc", "initialFlags", "sessionFlags", "application", "type", "icmpTypeCode"];
share.rwstatsValues = ["Records", "Packets", "Bytes"];                 // 40
share.rwcountFields = ["Date", "Records", "Bytes", "Packets"];         // 45
share.rwcountLoadSchemes = ["", "bin-uniform", "start-spike", "end-spike", "middle-spike", "time-proportional", "maximum-volume", "minimum-volume"];
share.tupleDirections = ["", "both", "forward", "reverse"];            // 61
share.availableChartTypes = {                                          // 67
  "rwcut": [],                                                         // 68
  "rwstats": ["BarChart", "ColumnChart", "PieChart"],                  // 69
  "rwcount": ["LineChart"]                                             // 70
};                                                                     // 68
share.chartFieldTypes = {                                              // 71
  "sPort": "number",                                                   // 72
  "dPort": "number",                                                   // 73
  "protocol": "number",                                                // 74
  "pro": "number",                                                     // 75
  "packets": "number",                                                 // 76
  "bytes": "number",                                                   // 77
  "sTime": "datetime",                                                 // 78
  "duration": "number",                                                // 79
  "dur": "number",                                                     // 80
  "eTime": "datetime",                                                 // 81
  "Records": "number",                                                 // 82
  "Packets": "number",                                                 // 83
  "Bytes": "number",                                                   // 84
  "Date": "datetime",                                                  // 85
  "cumul_%": "number"                                                  // 86
};                                                                     // 72
share.startDateOffsets = {                                             // 87
  "Hour": 60..toString(),                                              // 88
  "Day": (24 * 60).toString(),                                         // 89
  "Week": (7 * 24 * 60).toString(),                                    // 90
  "Month": (30 * 24 * 60).toString()                                   // 91
};                                                                     // 88
                                                                       //
share.parseResult = function (result) {                                // 93
  var i, len, ref, row, rows;                                          // 94
  rows = [];                                                           // 94
  ref = result.split("\n");                                            // 95
                                                                       //
  for (i = 0, len = ref.length; i < len; i++) {                        // 95
    row = ref[i];                                                      // 71
    rows.push(row.split("|"));                                         // 96
  }                                                                    // 95
                                                                       //
  return rows;                                                         // 74
};                                                                     // 93
                                                                       //
share.queryTypes = ["in", "out", "inweb", "outweb", "inicmp", "outicmp", "innull", "outnull", "int2int", "ext2ext", "other"];
share.inputFields = ["interface", "cmd", "exclusionsCmd", "startDateEnabled", "startDate", "endDateEnabled", "endDate", "sensorEnabled", "sensor", "typesEnabled", "types", "daddressEnabled", "daddress", "saddressEnabled", "saddress", "anyAddressEnabled", "anyAddress", "dipSetEnabled", "dipSet", "sipSetEnabled", "sipSet", "anySetEnabled", "anySet", "tupleFileEnabled", "tupleFile", "tupleDirectionEnabled", "tupleDirection", "tupleDelimiterEnabled", "tupleDelimiter", "tupleFieldsEnabled", "tupleFields", "dportEnabled", "dport", "sportEnabled", "sport", "aportEnabled", "aport", "dccEnabled", "dcc", "sccEnabled", "scc", "protocolEnabled", "protocol", "flagsAllEnabled", "flagsAll", "activeTimeEnabled", "activeTime", "additionalParametersEnabled", "additionalParameters", "additionalExclusionsCmdEnabled", "additionalExclusionsCmd"];
                                                                       //
share.filterOptions = function (options) {                             // 154
  var additionalPermittedCharacters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var excludedOption, filter, i, len, ref, regexp;                     // 155
  ref = ["--python-expr", "--python-file", "--pmap", "--dynamic-library", "--all-destination", "--fail-destination", "--pass-destination", "--print-statistics", "--print-volume-statistics", "--xargs"];
                                                                       //
  for (i = 0, len = ref.length; i < len; i++) {                        // 155
    excludedOption = ref[i];                                           // 85
    regexp = new RegExp(excludedOption + "=?[^\\s]*", "gi");           // 156
    options = options.replace(regexp, "");                             // 157
  }                                                                    // 155
                                                                       //
  filter = new RegExp("[^\\s\\=\\-\\/\\,\\.\\:0-9a-z_" + additionalPermittedCharacters + "]", "gi");
  options = options.replace(filter, "");                               // 159
  return options;                                                      // 91
};                                                                     // 154
                                                                       //
share.isDebug = Meteor.settings.public.isDebug;                        // 162
object = typeof window !== "undefined" ? window : global;              // 164
object.isDebug = share.isDebug;                                        // 165
                                                                       //
if (typeof console !== "undefined" && console.log && _.isFunction(console.log)) {
  object.cl = _.bind(console.log, console);                            // 167
} else {                                                               // 166
  object.cl = function () {};                                          // 169
}                                                                      // 104
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/lib/app.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvbGliL2FwcC5jb2ZmZWUiXSwibmFtZXMiOlsib2JqZWN0Iiwic2hhcmUiLCJ1c2VyIiwiZmllbGRzIiwidXNlcklkIiwiTWV0ZW9yIiwidXNlcnMiLCJmaW5kT25lIiwiaW50dmFsIiwidmFsdWUiLCJwYXJzZUludCIsIm1pbnV0ZSIsImhvdXIiLCJkYXRldGltZUZvcm1hdCIsInJ3Y3V0RmllbGRzIiwicndzdGF0c1ZhbHVlcyIsInJ3Y291bnRGaWVsZHMiLCJyd2NvdW50TG9hZFNjaGVtZXMiLCJ0dXBsZURpcmVjdGlvbnMiLCJhdmFpbGFibGVDaGFydFR5cGVzIiwiY2hhcnRGaWVsZFR5cGVzIiwic3RhcnREYXRlT2Zmc2V0cyIsInRvU3RyaW5nIiwicGFyc2VSZXN1bHQiLCJyZXN1bHQiLCJpIiwibGVuIiwicmVmIiwicm93Iiwicm93cyIsInNwbGl0IiwibGVuZ3RoIiwicHVzaCIsInF1ZXJ5VHlwZXMiLCJpbnB1dEZpZWxkcyIsImZpbHRlck9wdGlvbnMiLCJvcHRpb25zIiwiYWRkaXRpb25hbFBlcm1pdHRlZENoYXJhY3RlcnMiLCJleGNsdWRlZE9wdGlvbiIsImZpbHRlciIsInJlZ2V4cCIsIlJlZ0V4cCIsInJlcGxhY2UiLCJpc0RlYnVnIiwic2V0dGluZ3MiLCJwdWJsaWMiLCJ3aW5kb3ciLCJnbG9iYWwiLCJjb25zb2xlIiwibG9nIiwiXyIsImlzRnVuY3Rpb24iLCJjbCIsImJpbmQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLElBQUFBLE1BQUEsRUFBQUMsS0FBQTtBQUFBQSxRQUFRQSxTQUFTLEVBQWpCLEMsQ0FJQTtBQUNBO0FBQ0E7QUFDQTs7QUFBQUEsTUFBTUMsSUFBTixHQUFhLFVBQUNDLE1BQUQ7QUFBQSxNQUFTQyxNQUFULHVFQUFrQkMsT0FBT0QsTUFBUCxFQUFsQjtBQUVYLFNBREFDLE9BQU9DLEtBQVAsQ0FBYUMsT0FBYixDQUFxQkgsTUFBckIsRUFBNkI7QUFBQ0QsWUFBUUE7QUFBVCxH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c2hhcmUuY29tYmluZSA9IChmdW5jcy4uLikgLT5cbiMgIChhcmdzLi4uKSA9PlxuIyAgICBmb3IgZnVuYyBpbiBmdW5jc1xuIyAgICAgIGZ1bmMuYXBwbHkoQCwgYXJncylcblxuc2hhcmUudXNlciA9IChmaWVsZHMsIHVzZXJJZCA9IE1ldGVvci51c2VySWQoKSkgLT5cbiAgTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkLCB7ZmllbGRzOiBmaWVsZHN9KVxuXG5zaGFyZS5pbnR2YWwgPSAodmFsdWUpIC0+XG4gIHBhcnNlSW50KHZhbHVlLCAxMCkgfHwgMFxuXG5zaGFyZS5taW51dGUgPSA2MCAqIDEwMDBcbnNoYXJlLmhvdXIgPSA2MCAqIHNoYXJlLm1pbnV0ZVxuXG5zaGFyZS5kYXRldGltZUZvcm1hdCA9IFwiWVlZWS9NTS9ERCBISDptbTpzcy5TU1NcIlxuc2hhcmUucndjdXRGaWVsZHMgPSBbXG4gIFwic0lQXCJcbiAgXCJkSVBcIlxuICBcInNQb3J0XCJcbiAgXCJkUG9ydFwiXG4gIFwicHJvdG9jb2xcIlxuICBcInBhY2tldHNcIlxuICBcImJ5dGVzXCJcbiAgXCJmbGFnc1wiXG4gIFwic1RpbWVcIlxuICBcImR1cmF0aW9uXCJcbiAgXCJlVGltZVwiXG4gIFwic2Vuc29yXCJcbiAgXCJjbGFzc1wiXG4gIFwic2NjXCJcbiAgXCJkY2NcIlxuICBcImluaXRpYWxGbGFnc1wiXG4gIFwic2Vzc2lvbkZsYWdzXCJcbiAgXCJhcHBsaWNhdGlvblwiXG4gIFwidHlwZVwiXG4gIFwiaWNtcFR5cGVDb2RlXCJcbl1cbnNoYXJlLnJ3c3RhdHNWYWx1ZXMgPSBbXG4gIFwiUmVjb3Jkc1wiXG4gIFwiUGFja2V0c1wiXG4gIFwiQnl0ZXNcIlxuXVxuc2hhcmUucndjb3VudEZpZWxkcyA9IFtcbiAgXCJEYXRlXCJcbiAgXCJSZWNvcmRzXCJcbiAgXCJCeXRlc1wiXG4gIFwiUGFja2V0c1wiXG5dXG5zaGFyZS5yd2NvdW50TG9hZFNjaGVtZXMgPSBbXG4gIFwiXCJcbiAgXCJiaW4tdW5pZm9ybVwiXG4gIFwic3RhcnQtc3Bpa2VcIlxuICBcImVuZC1zcGlrZVwiXG4gIFwibWlkZGxlLXNwaWtlXCJcbiAgXCJ0aW1lLXByb3BvcnRpb25hbFwiXG4gIFwibWF4aW11bS12b2x1bWVcIlxuICBcIm1pbmltdW0tdm9sdW1lXCJcbl1cbnNoYXJlLnR1cGxlRGlyZWN0aW9ucyA9IFtcbiAgXCJcIlxuICBcImJvdGhcIlxuICBcImZvcndhcmRcIlxuICBcInJldmVyc2VcIlxuXVxuc2hhcmUuYXZhaWxhYmxlQ2hhcnRUeXBlcyA9XG4gIFwicndjdXRcIjogW11cbiAgXCJyd3N0YXRzXCI6IFtcIkJhckNoYXJ0XCIsIFwiQ29sdW1uQ2hhcnRcIiwgIFwiUGllQ2hhcnRcIl1cbiAgXCJyd2NvdW50XCI6IFtcIkxpbmVDaGFydFwiXVxuc2hhcmUuY2hhcnRGaWVsZFR5cGVzID1cbiAgXCJzUG9ydFwiOiBcIm51bWJlclwiXG4gIFwiZFBvcnRcIjogXCJudW1iZXJcIlxuICBcInByb3RvY29sXCI6IFwibnVtYmVyXCJcbiAgXCJwcm9cIjogXCJudW1iZXJcIlxuICBcInBhY2tldHNcIjogXCJudW1iZXJcIlxuICBcImJ5dGVzXCI6IFwibnVtYmVyXCJcbiAgXCJzVGltZVwiOiBcImRhdGV0aW1lXCJcbiAgXCJkdXJhdGlvblwiOiBcIm51bWJlclwiXG4gIFwiZHVyXCI6IFwibnVtYmVyXCJcbiAgXCJlVGltZVwiOiBcImRhdGV0aW1lXCJcbiAgXCJSZWNvcmRzXCI6IFwibnVtYmVyXCJcbiAgXCJQYWNrZXRzXCI6IFwibnVtYmVyXCJcbiAgXCJCeXRlc1wiOiBcIm51bWJlclwiXG4gIFwiRGF0ZVwiOiBcImRhdGV0aW1lXCJcbiAgXCJjdW11bF8lXCI6IFwibnVtYmVyXCJcbnNoYXJlLnN0YXJ0RGF0ZU9mZnNldHMgPVxuICBcIkhvdXJcIjogKDYwKS50b1N0cmluZygpXG4gIFwiRGF5XCI6ICgyNCAqIDYwKS50b1N0cmluZygpXG4gIFwiV2Vla1wiOiAoNyAqIDI0ICogNjApLnRvU3RyaW5nKClcbiAgXCJNb250aFwiOiAoMzAgKiAyNCAqIDYwKS50b1N0cmluZygpXG5cbnNoYXJlLnBhcnNlUmVzdWx0ID0gKHJlc3VsdCkgLT5cbiAgcm93cyA9IFtdXG4gIGZvciByb3cgaW4gcmVzdWx0LnNwbGl0KFwiXFxuXCIpXG4gICAgcm93cy5wdXNoKHJvdy5zcGxpdChcInxcIikpXG4gIHJvd3Ncblxuc2hhcmUucXVlcnlUeXBlcyA9IFtcImluXCIsIFwib3V0XCIsIFwiaW53ZWJcIiwgXCJvdXR3ZWJcIiwgXCJpbmljbXBcIiwgXCJvdXRpY21wXCIsIFwiaW5udWxsXCIsIFwib3V0bnVsbFwiLCBcImludDJpbnRcIiwgXCJleHQyZXh0XCIsIFwib3RoZXJcIl1cbnNoYXJlLmlucHV0RmllbGRzID0gW1xuICBcImludGVyZmFjZVwiXG4gIFwiY21kXCJcbiAgXCJleGNsdXNpb25zQ21kXCJcbiAgXCJzdGFydERhdGVFbmFibGVkXCJcbiAgXCJzdGFydERhdGVcIlxuICBcImVuZERhdGVFbmFibGVkXCJcbiAgXCJlbmREYXRlXCJcbiAgXCJzZW5zb3JFbmFibGVkXCJcbiAgXCJzZW5zb3JcIlxuICBcInR5cGVzRW5hYmxlZFwiXG4gIFwidHlwZXNcIlxuICBcImRhZGRyZXNzRW5hYmxlZFwiXG4gIFwiZGFkZHJlc3NcIlxuICBcInNhZGRyZXNzRW5hYmxlZFwiXG4gIFwic2FkZHJlc3NcIlxuICBcImFueUFkZHJlc3NFbmFibGVkXCJcbiAgXCJhbnlBZGRyZXNzXCJcbiAgXCJkaXBTZXRFbmFibGVkXCJcbiAgXCJkaXBTZXRcIlxuICBcInNpcFNldEVuYWJsZWRcIlxuICBcInNpcFNldFwiXG4gIFwiYW55U2V0RW5hYmxlZFwiXG4gIFwiYW55U2V0XCJcbiAgXCJ0dXBsZUZpbGVFbmFibGVkXCJcbiAgXCJ0dXBsZUZpbGVcIlxuICBcInR1cGxlRGlyZWN0aW9uRW5hYmxlZFwiXG4gIFwidHVwbGVEaXJlY3Rpb25cIlxuICBcInR1cGxlRGVsaW1pdGVyRW5hYmxlZFwiXG4gIFwidHVwbGVEZWxpbWl0ZXJcIlxuICBcInR1cGxlRmllbGRzRW5hYmxlZFwiXG4gIFwidHVwbGVGaWVsZHNcIlxuICBcImRwb3J0RW5hYmxlZFwiXG4gIFwiZHBvcnRcIlxuICBcInNwb3J0RW5hYmxlZFwiXG4gIFwic3BvcnRcIlxuICBcImFwb3J0RW5hYmxlZFwiXG4gIFwiYXBvcnRcIlxuICBcImRjY0VuYWJsZWRcIlxuICBcImRjY1wiXG4gIFwic2NjRW5hYmxlZFwiXG4gIFwic2NjXCJcbiAgXCJwcm90b2NvbEVuYWJsZWRcIlxuICBcInByb3RvY29sXCJcbiAgXCJmbGFnc0FsbEVuYWJsZWRcIlxuICBcImZsYWdzQWxsXCJcbiAgXCJhY3RpdmVUaW1lRW5hYmxlZFwiXG4gIFwiYWN0aXZlVGltZVwiXG4gIFwiYWRkaXRpb25hbFBhcmFtZXRlcnNFbmFibGVkXCJcbiAgXCJhZGRpdGlvbmFsUGFyYW1ldGVyc1wiXG4gIFwiYWRkaXRpb25hbEV4Y2x1c2lvbnNDbWRFbmFibGVkXCJcbiAgXCJhZGRpdGlvbmFsRXhjbHVzaW9uc0NtZFwiXG5dXG5cbnNoYXJlLmZpbHRlck9wdGlvbnMgPSAob3B0aW9ucywgYWRkaXRpb25hbFBlcm1pdHRlZENoYXJhY3RlcnMgPSBcIlwiKSAtPlxuICBmb3IgZXhjbHVkZWRPcHRpb24gaW4gW1wiLS1weXRob24tZXhwclwiLCBcIi0tcHl0aG9uLWZpbGVcIiwgXCItLXBtYXBcIiwgXCItLWR5bmFtaWMtbGlicmFyeVwiLCBcIi0tYWxsLWRlc3RpbmF0aW9uXCIsIFwiLS1mYWlsLWRlc3RpbmF0aW9uXCIsIFwiLS1wYXNzLWRlc3RpbmF0aW9uXCIsIFwiLS1wcmludC1zdGF0aXN0aWNzXCIsIFwiLS1wcmludC12b2x1bWUtc3RhdGlzdGljc1wiLCBcIi0teGFyZ3NcIl1cbiAgICByZWdleHAgPSBuZXcgUmVnRXhwKGV4Y2x1ZGVkT3B0aW9uICsgXCI9P1teXFxcXHNdKlwiLCBcImdpXCIpXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMucmVwbGFjZShyZWdleHAsIFwiXCIpXG4gIGZpbHRlciA9IG5ldyBSZWdFeHAoXCJbXlxcXFxzXFxcXD1cXFxcLVxcXFwvXFxcXCxcXFxcLlxcXFw6MC05YS16X1wiICsgYWRkaXRpb25hbFBlcm1pdHRlZENoYXJhY3RlcnMgKyBcIl1cIiwgXCJnaVwiKVxuICBvcHRpb25zID0gb3B0aW9ucy5yZXBsYWNlKGZpbHRlciwgXCJcIilcbiAgb3B0aW9uc1xuXG5zaGFyZS5pc0RlYnVnID0gTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5pc0RlYnVnXG5cbm9iamVjdCA9IGlmIHR5cGVvZih3aW5kb3cpICE9IFwidW5kZWZpbmVkXCIgdGhlbiB3aW5kb3cgZWxzZSBnbG9iYWxcbm9iamVjdC5pc0RlYnVnID0gc2hhcmUuaXNEZWJ1Z1xuaWYgdHlwZW9mKGNvbnNvbGUpICE9IFwidW5kZWZpbmVkXCIgJiYgY29uc29sZS5sb2cgJiYgXy5pc0Z1bmN0aW9uKGNvbnNvbGUubG9nKVxuICBvYmplY3QuY2wgPSBfLmJpbmQoY29uc29sZS5sb2csIGNvbnNvbGUpXG5lbHNlXG4gIG9iamVjdC5jbCA9IC0+XG4iXX0=
