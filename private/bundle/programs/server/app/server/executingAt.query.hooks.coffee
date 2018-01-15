(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/executingAt.query.hooks.coffee                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var indexOf = [].indexOf;                                              // 1
share.Queries.before.update(function (userId, query, fieldNames, modifier, options) {
  if (modifier.$set) {                                                 // 2
    if (_.has(modifier.$set, "executingInterval")) {                   // 3
      if (modifier.$set.executingInterval) {                           // 4
        return modifier.$set.executingAt = new Date(new Date().getTime() + modifier.$set.executingInterval);
      } else {                                                         // 4
        return modifier.$set.executingAt = null;                       // 9
      }                                                                // 3
    }                                                                  // 2
  }                                                                    // 12
});                                                                    // 1
share.Queries.after.update(function (userId, query, fieldNames, modifier, options) {
  if (options.skipResetTimeout) {                                      // 10
    return;                                                            // 11
  }                                                                    // 18
                                                                       //
  if (indexOf.call(fieldNames, "executingAt") >= 0 && query.executingAt) {
    return share.periodicExecution.resetTimeout();                     // 20
  }                                                                    // 21
});                                                                    // 9
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/executingAt.query.hooks.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2V4ZWN1dGluZ0F0LnF1ZXJ5Lmhvb2tzLmNvZmZlZSJdLCJuYW1lcyI6WyJpbmRleE9mIiwic2hhcmUiLCJRdWVyaWVzIiwiYmVmb3JlIiwidXBkYXRlIiwidXNlcklkIiwicXVlcnkiLCJmaWVsZE5hbWVzIiwibW9kaWZpZXIiLCJvcHRpb25zIiwiJHNldCIsIl8iLCJoYXMiLCJleGVjdXRpbmdJbnRlcnZhbCIsImV4ZWN1dGluZ0F0IiwiRGF0ZSIsImdldFRpbWUiLCJhZnRlciIsInNraXBSZXNldFRpbWVvdXQiLCJjYWxsIiwicGVyaW9kaWNFeGVjdXRpb24iLCJyZXNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLElBQUFBLFVBQUEsR0FBQUEsT0FBQTtBQUFBQyxNQUFNQyxPQUFOLENBQWNDLE1BQWQsQ0FBcUJDLE1BQXJCLENBQTRCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFnQkMsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUMxQixNQUFHRCxTQUFTRSxJQUFaO0FBQ0UsUUFBR0MsRUFBRUMsR0FBRixDQUFNSixTQUFTRSxJQUFmLEVBQXFCLG1CQUFyQixDQUFIO0FBQ0UsVUFBR0YsU0FBU0UsSUFBVCxDQUFjRyxpQkFBakI7QUFHRSxlQUZBTCxTQUFTRSxJQUFULENBQWNJLFdBQWQsR0FBNEIsSUFBSUMsSUFBSixDQUFTLElBQUlBLElBQUosR0FBV0MsT0FBWCxLQUF1QlIsU0FBU0UsSUFBVCxDQUFjRyxpQkFBOUMsQ0FFNUI7QUFIRjtBQUtFLGVBRkFMLFNBQVNFLElBQVQsQ0FBY0ksV0FBZCxHQUE0QixJQUU1QjtBQU5KO0FBREY7QUFVQztBQVhIO0FBUUFiLE1BQU1DLE9BQU4sQ0FBY2UsS0FBZCxDQUFvQmIsTUFBcEIsQ0FBMkIsVUFBQ0MsTUFBRCxFQUFTQyxLQUFULEVBQWdCQyxVQUFoQixFQUE0QkMsUUFBNUIsRUFBc0NDLE9BQXRDO0FBQ3pCLE1BQUdBLFFBQVFTLGdCQUFYO0FBQ0U7QUFPRDs7QUFORCxNQUFHbEIsUUFBQW1CLElBQUEsQ0FBaUJaLFVBQWpCLHlCQUFnQ0QsTUFBTVEsV0FBekM7QUFRRSxXQVBBYixNQUFNbUIsaUJBQU4sQ0FBd0JDLFlBQXhCLEVBT0E7QUFDRDtBQVpILDJFIiwiZmlsZSI6Ii9zZXJ2ZXIvZXhlY3V0aW5nQXQucXVlcnkuaG9va3MuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsic2hhcmUuUXVlcmllcy5iZWZvcmUudXBkYXRlICh1c2VySWQsIHF1ZXJ5LCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgaWYgbW9kaWZpZXIuJHNldFxuICAgIGlmIF8uaGFzKG1vZGlmaWVyLiRzZXQsIFwiZXhlY3V0aW5nSW50ZXJ2YWxcIilcbiAgICAgIGlmIG1vZGlmaWVyLiRzZXQuZXhlY3V0aW5nSW50ZXJ2YWxcbiAgICAgICAgbW9kaWZpZXIuJHNldC5leGVjdXRpbmdBdCA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgbW9kaWZpZXIuJHNldC5leGVjdXRpbmdJbnRlcnZhbClcbiAgICAgIGVsc2VcbiAgICAgICAgbW9kaWZpZXIuJHNldC5leGVjdXRpbmdBdCA9IG51bGxcblxuc2hhcmUuUXVlcmllcy5hZnRlci51cGRhdGUgKHVzZXJJZCwgcXVlcnksIGZpZWxkTmFtZXMsIG1vZGlmaWVyLCBvcHRpb25zKSAtPlxuICBpZiBvcHRpb25zLnNraXBSZXNldFRpbWVvdXRcbiAgICByZXR1cm5cbiAgaWYgXCJleGVjdXRpbmdBdFwiIGluIGZpZWxkTmFtZXMgYW5kIHF1ZXJ5LmV4ZWN1dGluZ0F0XG4gICAgc2hhcmUucGVyaW9kaWNFeGVjdXRpb24ucmVzZXRUaW1lb3V0KCkiXX0=
