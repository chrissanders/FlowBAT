(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/users.coffee                                        //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.users.allow({                                                   // 1
  insert: share.securityRulesWrapper(function (userId, user) {         // 2
    return false;                                                      // 3
  }),                                                                  // 2
  update: share.securityRulesWrapper(function (userId, user, fieldNames, modifier) {
    if (!share.Security.hasRole(userId, "admin")) {                    // 5
      throw new Match.Error("Operation not allowed for non admins");   // 6
    }                                                                  // 8
                                                                       //
    return true;                                                       // 9
  }),                                                                  // 4
  remove: share.securityRulesWrapper(function (userId, user) {         // 8
    if (!userId) {                                                     // 9
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 14
                                                                       //
    if (userId === user._id) {                                         // 11
      throw new Match.Error("User can't remove himself");              // 12
    }                                                                  // 17
                                                                       //
    if (!share.Security.hasRole(userId, "admin")) {                    // 13
      throw new Match.Error("Operation not allowed for non admins");   // 14
    }                                                                  // 20
                                                                       //
    return true;                                                       // 21
  })                                                                   // 8
});                                                                    // 2
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/users.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L3VzZXJzLmNvZmZlZSJdLCJuYW1lcyI6WyJNZXRlb3IiLCJ1c2VycyIsImFsbG93IiwiaW5zZXJ0Iiwic2hhcmUiLCJzZWN1cml0eVJ1bGVzV3JhcHBlciIsInVzZXJJZCIsInVzZXIiLCJ1cGRhdGUiLCJmaWVsZE5hbWVzIiwibW9kaWZpZXIiLCJTZWN1cml0eSIsImhhc1JvbGUiLCJNYXRjaCIsIkVycm9yIiwicmVtb3ZlIiwiX2lkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQUEsT0FBT0MsS0FBUCxDQUFhQyxLQUFiLENBQ0U7QUFBQUMsVUFBUUMsTUFBTUMsb0JBQU4sQ0FBMkIsVUFBQ0MsTUFBRCxFQUFTQyxJQUFUO0FBQ2pDO0FBRE0sSUFBUjtBQUVBQyxVQUFRSixNQUFNQyxvQkFBTixDQUEyQixVQUFDQyxNQUFELEVBQVNDLElBQVQsRUFBZUUsVUFBZixFQUEyQkMsUUFBM0I7QUFDakMsU0FBT04sTUFBTU8sUUFBTixDQUFlQyxPQUFmLENBQXVCTixNQUF2QixFQUErQixPQUEvQixDQUFQO0FBQ0UsWUFBTSxJQUFJTyxNQUFNQyxLQUFWLENBQWdCLHNDQUFoQixDQUFOO0FBRUQ7O0FBQ0QsV0FGQSxJQUVBO0FBTE0sSUFGUjtBQU1BQyxVQUFRWCxNQUFNQyxvQkFBTixDQUEyQixVQUFDQyxNQUFELEVBQVNDLElBQVQ7QUFDakMsU0FBT0QsTUFBUDtBQUNFLFlBQU0sSUFBSU8sTUFBTUMsS0FBVixDQUFnQiw4Q0FBaEIsQ0FBTjtBQUlEOztBQUhELFFBQUdSLFdBQVVDLEtBQUtTLEdBQWxCO0FBQ0UsWUFBTSxJQUFJSCxNQUFNQyxLQUFWLENBQWdCLDJCQUFoQixDQUFOO0FBS0Q7O0FBSkQsU0FBT1YsTUFBTU8sUUFBTixDQUFlQyxPQUFmLENBQXVCTixNQUF2QixFQUErQixPQUEvQixDQUFQO0FBQ0UsWUFBTSxJQUFJTyxNQUFNQyxLQUFWLENBQWdCLHNDQUFoQixDQUFOO0FBTUQ7O0FBQ0QsV0FOQSxJQU1BO0FBYk07QUFOUixDQURGLDBFIiwiZmlsZSI6Ii9zZXJ2ZXIvc2VjdXJpdHkvdXNlcnMuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsiTWV0ZW9yLnVzZXJzLmFsbG93XG4gIGluc2VydDogc2hhcmUuc2VjdXJpdHlSdWxlc1dyYXBwZXIgKHVzZXJJZCwgdXNlcikgLT5cbiAgICBmYWxzZVxuICB1cGRhdGU6IHNoYXJlLnNlY3VyaXR5UnVsZXNXcmFwcGVyICh1c2VySWQsIHVzZXIsIGZpZWxkTmFtZXMsIG1vZGlmaWVyKSAtPlxuICAgIHVubGVzcyBzaGFyZS5TZWN1cml0eS5oYXNSb2xlKHVzZXJJZCwgXCJhZG1pblwiKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciBub24gYWRtaW5zXCIpXG4gICAgdHJ1ZVxuICByZW1vdmU6IHNoYXJlLnNlY3VyaXR5UnVsZXNXcmFwcGVyICh1c2VySWQsIHVzZXIpIC0+XG4gICAgdW5sZXNzIHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICBpZiB1c2VySWQgaXMgdXNlci5faWRcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVzZXIgY2FuJ3QgcmVtb3ZlIGhpbXNlbGZcIilcbiAgICB1bmxlc3Mgc2hhcmUuU2VjdXJpdHkuaGFzUm9sZSh1c2VySWQsIFwiYWRtaW5cIilcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3Igbm9uIGFkbWluc1wiKVxuICAgIHRydWVcbiJdfQ==
