(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/security.coffee                                                 //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var indexOf = [].indexOf;                                              // 1
share.Security = {                                                     // 1
  effectiveRoles: {                                                    // 2
    admin: ["admin", "analyst"],                                       // 3
    analyst: ["admin", "analyst"]                                      // 4
  },                                                                   // 3
  groups: function () {                                                // 5
    return Object.keys(this.effectiveRoles);                           // 9
  },                                                                   // 2
  currentUserHasRole: function (role) {                                // 7
    return share.Security.hasRole(Meteor.userId(), role);              // 12
  },                                                                   // 2
  userIdCanChangeUserGroupOrRemove: function (userId, user) {          // 9
    return userId !== user._id && this.hasRole(userId, "admin");       // 15
  },                                                                   // 2
  hasRole: function (userId, role) {                                   // 11
    var user;                                                          // 12
    user = Meteor.users.findOne(userId);                               // 12
                                                                       //
    if (user) {                                                        // 13
      if (indexOf.call(share.Security.effectiveRoles[user.group], role) >= 0) {
        return true;                                                   // 15
      }                                                                // 13
    }                                                                  // 24
                                                                       //
    return false;                                                      // 16
  }                                                                    // 11
};                                                                     // 2
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/lib/security.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvbGliL3NlY3VyaXR5LmNvZmZlZSJdLCJuYW1lcyI6WyJpbmRleE9mIiwic2hhcmUiLCJTZWN1cml0eSIsImVmZmVjdGl2ZVJvbGVzIiwiYWRtaW4iLCJhbmFseXN0IiwiZ3JvdXBzIiwiT2JqZWN0Iiwia2V5cyIsImN1cnJlbnRVc2VySGFzUm9sZSIsInJvbGUiLCJoYXNSb2xlIiwiTWV0ZW9yIiwidXNlcklkIiwidXNlcklkQ2FuQ2hhbmdlVXNlckdyb3VwT3JSZW1vdmUiLCJ1c2VyIiwiX2lkIiwidXNlcnMiLCJmaW5kT25lIiwiY2FsbCIsImdyb3VwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxVQUFBLEdBQUFBLE9BQUE7QUFBQUMsTUFBTUMsUUFBTixHQUNFO0FBQUFDLGtCQUNFO0FBQUFDLFdBQU8sQ0FBQyxPQUFELEVBQVUsU0FBVixDQUFQO0FBQ0FDLGFBQVMsQ0FBQyxPQUFELEVBQVUsU0FBVjtBQURULEdBREY7QUFHQUMsVUFBUTtBQUlOLFdBSEFDLE9BQU9DLElBQVAsQ0FBWSxLQUFDTCxjQUFiLENBR0E7QUFQRjtBQUtBTSxzQkFBb0IsVUFBQ0MsSUFBRDtBQUtsQixXQUpBVCxNQUFNQyxRQUFOLENBQWVTLE9BQWYsQ0FBdUJDLE9BQU9DLE1BQVAsRUFBdkIsRUFBd0NILElBQXhDLENBSUE7QUFWRjtBQU9BSSxvQ0FBa0MsVUFBQ0QsTUFBRCxFQUFTRSxJQUFUO0FBTWhDLFdBTEFGLFdBQVlFLEtBQUtDLEdBQWpCLElBQXlCLEtBQUNMLE9BQUQsQ0FBU0UsTUFBVCxFQUFpQixPQUFqQixDQUt6QjtBQWJGO0FBU0FGLFdBQVMsVUFBQ0UsTUFBRCxFQUFTSCxJQUFUO0FBQ1AsUUFBQUssSUFBQTtBQUFBQSxXQUFPSCxPQUFPSyxLQUFQLENBQWFDLE9BQWIsQ0FBcUJMLE1BQXJCLENBQVA7O0FBQ0EsUUFBR0UsSUFBSDtBQUNFLFVBQUdmLFFBQUFtQixJQUFBLENBQVFsQixNQUFNQyxRQUFOLENBQWVDLGNBQWYsQ0FBOEJZLEtBQUtLLEtBQW5DLENBQVIsRUFBQVYsSUFBQSxNQUFIO0FBQ0UsZUFBTyxJQUFQO0FBRko7QUFXQzs7QUFSRCxXQUFPLEtBQVA7QUFMTztBQVRULENBREYsMEUiLCJmaWxlIjoiL2xpYi9zZWN1cml0eS5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5TZWN1cml0eSA9XG4gIGVmZmVjdGl2ZVJvbGVzOlxuICAgIGFkbWluOiBbXCJhZG1pblwiLCBcImFuYWx5c3RcIl1cbiAgICBhbmFseXN0OiBbXCJhZG1pblwiLCBcImFuYWx5c3RcIl1cbiAgZ3JvdXBzOiAtPlxuICAgIE9iamVjdC5rZXlzKEBlZmZlY3RpdmVSb2xlcylcbiAgY3VycmVudFVzZXJIYXNSb2xlOiAocm9sZSkgLT5cbiAgICBzaGFyZS5TZWN1cml0eS5oYXNSb2xlKE1ldGVvci51c2VySWQoKSwgcm9sZSlcbiAgdXNlcklkQ2FuQ2hhbmdlVXNlckdyb3VwT3JSZW1vdmU6ICh1c2VySWQsIHVzZXIpIC0+XG4gICAgdXNlcklkIGlzbnQgdXNlci5faWQgYW5kIEBoYXNSb2xlKHVzZXJJZCwgXCJhZG1pblwiKVxuICBoYXNSb2xlOiAodXNlcklkLCByb2xlKSAtPlxuICAgIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpXG4gICAgaWYgdXNlclxuICAgICAgaWYgcm9sZSBpbiBzaGFyZS5TZWN1cml0eS5lZmZlY3RpdmVSb2xlc1t1c2VyLmdyb3VwXVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIHJldHVybiBmYWxzZVxuIl19
