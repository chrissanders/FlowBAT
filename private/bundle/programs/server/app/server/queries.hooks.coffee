(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/queries.hooks.coffee                                         //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Queries.after.remove(function (userId, query) {                  // 1
  return Meteor.users.update({                                         // 2
    "profile.dashboardQueryIds": query._id                             // 2
  }, {                                                                 // 2
    $pull: {                                                           // 2
      "profile.dashboardQueryIds": query._id                           // 2
    }                                                                  // 2
  }, {                                                                 // 2
    multi: true                                                        // 2
  });                                                                  // 2
});                                                                    // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/queries.hooks.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3F1ZXJpZXMuaG9va3MuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwiUXVlcmllcyIsImFmdGVyIiwicmVtb3ZlIiwidXNlcklkIiwicXVlcnkiLCJNZXRlb3IiLCJ1c2VycyIsInVwZGF0ZSIsIl9pZCIsIiRwdWxsIiwibXVsdGkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxNQUFNQyxPQUFOLENBQWNDLEtBQWQsQ0FBb0JDLE1BQXBCLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVDtBQUN6QixTQUFBQyxPQUFPQyxLQUFQLENBQWFDLE1BQWIsQ0FBb0I7QUFBQyxpQ0FBNkJILE1BQU1JO0FBQXBDLEdBQXBCLEVBQThEO0FBQUNDLFdBQU87QUFBQyxtQ0FBNkJMLE1BQU1JO0FBQXBDO0FBQVIsR0FBOUQsRUFBaUg7QUFBQ0UsV0FBTztBQUFSLEdBQWpIO0FBREYsMkUiLCJmaWxlIjoiL3NlcnZlci9xdWVyaWVzLmhvb2tzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbInNoYXJlLlF1ZXJpZXMuYWZ0ZXIucmVtb3ZlICh1c2VySWQsIHF1ZXJ5KSAtPlxuICBNZXRlb3IudXNlcnMudXBkYXRlKHtcInByb2ZpbGUuZGFzaGJvYXJkUXVlcnlJZHNcIjogcXVlcnkuX2lkfSwgeyRwdWxsOiB7XCJwcm9maWxlLmRhc2hib2FyZFF1ZXJ5SWRzXCI6IHF1ZXJ5Ll9pZH19LCB7bXVsdGk6IHRydWV9KVxuIl19
