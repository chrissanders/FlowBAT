(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/configs.coffee                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Configs.allow({                                                  // 1
  insert: share.securityRulesWrapper(function (userId, config) {       // 2
    return false; // There can be only one!                            // 3
  }),                                                                  // 2
  update: share.securityRulesWrapper(function (userId, config, fieldNames, modifier, options) {
    var $set;                                                          // 5
                                                                       //
    if (!share.Security.hasRole(userId, "admin")) {                    // 5
      throw new Match.Error("Operation not allowed for non admins");   // 6
    }                                                                  // 9
                                                                       //
    $set = {                                                           // 7
      isSSH: Match.Optional(Boolean),                                  // 8
      host: Match.Optional(String),                                    // 9
      port: Match.Optional(String),                                    // 10
      user: Match.Optional(String),                                    // 11
      identityFile: Match.Optional(String),                            // 12
      siteConfigFile: Match.Optional(String),                          // 13
      dataRootdir: Match.Optional(String),                             // 14
      dataTempdir: Match.Optional(String),                             // 15
      isNew: Match.Optional(Match.App.isNewUpdate(config.isNew)),      // 16
      updatedAt: Date                                                  // 17
    };                                                                 // 8
                                                                       //
    if (!config.isSetupComplete) {                                     // 18
      _.extend($set, {                                                 // 19
        isSetupComplete: Match.Optional(Boolean)                       // 20
      });                                                              // 20
    }                                                                  // 26
                                                                       //
    check(modifier, {                                                  // 22
      $set: $set                                                       // 23
    });                                                                // 23
                                                                       //
    if (modifier.$set && _.has(modifier.$set, "siteConfigFile") && !modifier.$set.siteConfigFile) {
      throw new Match.Error("siteConfigFile required");                // 26
    }                                                                  // 32
                                                                       //
    if (modifier.$set && _.has(modifier.$set, "dataRootdir") && !modifier.$set.dataRootdir) {
      throw new Match.Error("dataRootdir required");                   // 28
    }                                                                  // 35
                                                                       //
    if (modifier.$set && _.has(modifier.$set, "dataTempdir") && !modifier.$set.dataTempdir) {
      throw new Match.Error("dataTempdir required");                   // 30
    }                                                                  // 38
                                                                       //
    return true;                                                       // 39
  }),                                                                  // 4
  remove: share.securityRulesWrapper(function (userId, config) {       // 32
    return false; // Who wants to live forever?                        // 42
  })                                                                   // 32
});                                                                    // 2
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/configs.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L2NvbmZpZ3MuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwiQ29uZmlncyIsImFsbG93IiwiaW5zZXJ0Iiwic2VjdXJpdHlSdWxlc1dyYXBwZXIiLCJ1c2VySWQiLCJjb25maWciLCJ1cGRhdGUiLCJmaWVsZE5hbWVzIiwibW9kaWZpZXIiLCJvcHRpb25zIiwiJHNldCIsIlNlY3VyaXR5IiwiaGFzUm9sZSIsIk1hdGNoIiwiRXJyb3IiLCJpc1NTSCIsIk9wdGlvbmFsIiwiQm9vbGVhbiIsImhvc3QiLCJTdHJpbmciLCJwb3J0IiwidXNlciIsImlkZW50aXR5RmlsZSIsInNpdGVDb25maWdGaWxlIiwiZGF0YVJvb3RkaXIiLCJkYXRhVGVtcGRpciIsImlzTmV3IiwiQXBwIiwiaXNOZXdVcGRhdGUiLCJ1cGRhdGVkQXQiLCJEYXRlIiwiaXNTZXR1cENvbXBsZXRlIiwiXyIsImV4dGVuZCIsImNoZWNrIiwiaGFzIiwicmVtb3ZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQUEsTUFBTUMsT0FBTixDQUFjQyxLQUFkLENBQ0U7QUFBQUMsVUFBUUgsTUFBTUksb0JBQU4sQ0FBMkIsVUFBQ0MsTUFBRCxFQUFTQyxNQUFUO0FBQ2pDLGlCQURpQztBQUEzQixJQUFSO0FBRUFDLFVBQVFQLE1BQU1JLG9CQUFOLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsTUFBVCxFQUFpQkUsVUFBakIsRUFBNkJDLFFBQTdCLEVBQXVDQyxPQUF2QztBQUNqQyxRQUFBQyxJQUFBOztBQUFBLFNBQU9YLE1BQU1ZLFFBQU4sQ0FBZUMsT0FBZixDQUF1QlIsTUFBdkIsRUFBK0IsT0FBL0IsQ0FBUDtBQUNFLFlBQU0sSUFBSVMsTUFBTUMsS0FBVixDQUFnQixzQ0FBaEIsQ0FBTjtBQUdEOztBQUZESixXQUNFO0FBQUFLLGFBQU9GLE1BQU1HLFFBQU4sQ0FBZUMsT0FBZixDQUFQO0FBQ0FDLFlBQU1MLE1BQU1HLFFBQU4sQ0FBZUcsTUFBZixDQUROO0FBRUFDLFlBQU1QLE1BQU1HLFFBQU4sQ0FBZUcsTUFBZixDQUZOO0FBR0FFLFlBQU1SLE1BQU1HLFFBQU4sQ0FBZUcsTUFBZixDQUhOO0FBSUFHLG9CQUFjVCxNQUFNRyxRQUFOLENBQWVHLE1BQWYsQ0FKZDtBQUtBSSxzQkFBZ0JWLE1BQU1HLFFBQU4sQ0FBZUcsTUFBZixDQUxoQjtBQU1BSyxtQkFBYVgsTUFBTUcsUUFBTixDQUFlRyxNQUFmLENBTmI7QUFPQU0sbUJBQWFaLE1BQU1HLFFBQU4sQ0FBZUcsTUFBZixDQVBiO0FBUUFPLGFBQU9iLE1BQU1HLFFBQU4sQ0FBZUgsTUFBTWMsR0FBTixDQUFVQyxXQUFWLENBQXNCdkIsT0FBT3FCLEtBQTdCLENBQWYsQ0FSUDtBQVNBRyxpQkFBV0M7QUFUWCxLQURGOztBQVdBLFFBQUcsQ0FBSXpCLE9BQU8wQixlQUFkO0FBQ0VDLFFBQUVDLE1BQUYsQ0FBU3ZCLElBQVQsRUFDRTtBQUFBcUIseUJBQWlCbEIsTUFBTUcsUUFBTixDQUFlQyxPQUFmO0FBQWpCLE9BREY7QUFPRDs7QUFKRGlCLFVBQU0xQixRQUFOLEVBQ0U7QUFBQUUsWUFBTUE7QUFBTixLQURGOztBQUdBLFFBQUdGLFNBQVNFLElBQVQsSUFBa0JzQixFQUFFRyxHQUFGLENBQU0zQixTQUFTRSxJQUFmLEVBQXFCLGdCQUFyQixDQUFsQixJQUE2RCxDQUFJRixTQUFTRSxJQUFULENBQWNhLGNBQWxGO0FBQ0UsWUFBTSxJQUFJVixNQUFNQyxLQUFWLENBQWdCLHlCQUFoQixDQUFOO0FBTUQ7O0FBTEQsUUFBR04sU0FBU0UsSUFBVCxJQUFrQnNCLEVBQUVHLEdBQUYsQ0FBTTNCLFNBQVNFLElBQWYsRUFBcUIsYUFBckIsQ0FBbEIsSUFBMEQsQ0FBSUYsU0FBU0UsSUFBVCxDQUFjYyxXQUEvRTtBQUNFLFlBQU0sSUFBSVgsTUFBTUMsS0FBVixDQUFnQixzQkFBaEIsQ0FBTjtBQU9EOztBQU5ELFFBQUdOLFNBQVNFLElBQVQsSUFBa0JzQixFQUFFRyxHQUFGLENBQU0zQixTQUFTRSxJQUFmLEVBQXFCLGFBQXJCLENBQWxCLElBQTBELENBQUlGLFNBQVNFLElBQVQsQ0FBY2UsV0FBL0U7QUFDRSxZQUFNLElBQUlaLE1BQU1DLEtBQVYsQ0FBZ0Isc0JBQWhCLENBQU47QUFRRDs7QUFDRCxXQVJBLElBUUE7QUFuQ00sSUFGUjtBQThCQXNCLFVBQVFyQyxNQUFNSSxvQkFBTixDQUEyQixVQUFDQyxNQUFELEVBQVNDLE1BQVQ7QUFVakMsV0FUQSxLQVNBLENBVmlDO0FBQTNCO0FBOUJSLENBREYsMEUiLCJmaWxlIjoiL3NlcnZlci9zZWN1cml0eS9jb25maWdzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbInNoYXJlLkNvbmZpZ3MuYWxsb3dcbiAgaW5zZXJ0OiBzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciAodXNlcklkLCBjb25maWcpIC0+XG4gICAgZmFsc2UgIyBUaGVyZSBjYW4gYmUgb25seSBvbmUhXG4gIHVwZGF0ZTogc2hhcmUuc2VjdXJpdHlSdWxlc1dyYXBwZXIgKHVzZXJJZCwgY29uZmlnLCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgICB1bmxlc3Mgc2hhcmUuU2VjdXJpdHkuaGFzUm9sZSh1c2VySWQsIFwiYWRtaW5cIilcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3Igbm9uIGFkbWluc1wiKVxuICAgICRzZXQgPVxuICAgICAgaXNTU0g6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBob3N0OiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBwb3J0OiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICB1c2VyOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBpZGVudGl0eUZpbGU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIHNpdGVDb25maWdGaWxlOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpXG4gICAgICBkYXRhUm9vdGRpcjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgZGF0YVRlbXBkaXI6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGlzTmV3OiBNYXRjaC5PcHRpb25hbChNYXRjaC5BcHAuaXNOZXdVcGRhdGUoY29uZmlnLmlzTmV3KSlcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZVxuICAgIGlmIG5vdCBjb25maWcuaXNTZXR1cENvbXBsZXRlXG4gICAgICBfLmV4dGVuZCgkc2V0LFxuICAgICAgICBpc1NldHVwQ29tcGxldGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICApXG4gICAgY2hlY2sobW9kaWZpZXIsXG4gICAgICAkc2V0OiAkc2V0XG4gICAgKVxuICAgIGlmIG1vZGlmaWVyLiRzZXQgYW5kIF8uaGFzKG1vZGlmaWVyLiRzZXQsIFwic2l0ZUNvbmZpZ0ZpbGVcIikgYW5kIG5vdCBtb2RpZmllci4kc2V0LnNpdGVDb25maWdGaWxlXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJzaXRlQ29uZmlnRmlsZSByZXF1aXJlZFwiKVxuICAgIGlmIG1vZGlmaWVyLiRzZXQgYW5kIF8uaGFzKG1vZGlmaWVyLiRzZXQsIFwiZGF0YVJvb3RkaXJcIikgYW5kIG5vdCBtb2RpZmllci4kc2V0LmRhdGFSb290ZGlyXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJkYXRhUm9vdGRpciByZXF1aXJlZFwiKVxuICAgIGlmIG1vZGlmaWVyLiRzZXQgYW5kIF8uaGFzKG1vZGlmaWVyLiRzZXQsIFwiZGF0YVRlbXBkaXJcIikgYW5kIG5vdCBtb2RpZmllci4kc2V0LmRhdGFUZW1wZGlyXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJkYXRhVGVtcGRpciByZXF1aXJlZFwiKVxuICAgIHRydWVcbiAgcmVtb3ZlOiBzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciAodXNlcklkLCBjb25maWcpIC0+XG4gICAgZmFsc2UgIyBXaG8gd2FudHMgdG8gbGl2ZSBmb3JldmVyP1xuIl19
