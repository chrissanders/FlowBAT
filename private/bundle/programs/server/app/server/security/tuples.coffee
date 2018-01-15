(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/tuples.coffee                                       //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Tuples.allow({                                                   // 1
  insert: share.securityRulesWrapper(function (userId, tuple) {        // 2
    if (!userId) {                                                     // 3
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 5
                                                                       //
    tuple._id = tuple._id || Random.id();                              // 5
    tuple.ownerId = userId;                                            // 6
    check(tuple, {                                                     // 7
      _id: Match.App.Id,                                               // 8
      name: String,                                                    // 9
      note: String,                                                    // 10
      contents: String,                                                // 11
      isOutputStale: Boolean,                                          // 12
      isNew: Boolean,                                                  // 13
      ownerId: Match.App.UserId,                                       // 14
      updatedAt: Date,                                                 // 15
      createdAt: Date                                                  // 16
    });                                                                // 8
                                                                       //
    if (!tuple.name) {                                                 // 18
      throw new Match.Error("Name required");                          // 19
    }                                                                  // 21
                                                                       //
    if (!tuple.contents) {                                             // 20
      throw new Match.Error("Contents required");                      // 21
    }                                                                  // 24
                                                                       //
    return true;                                                       // 25
  }),                                                                  // 2
  update: share.securityRulesWrapper(function (userId, tuple, fieldNames, modifier, options) {
    var $set;                                                          // 24
                                                                       //
    if (!userId) {                                                     // 24
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 31
                                                                       //
    if (userId !== tuple.ownerId) {                                    // 26
      throw new Match.Error("Operation not allowed for non-owners");   // 27
    }                                                                  // 34
                                                                       //
    $set = {                                                           // 28
      name: Match.Optional(String),                                    // 29
      note: Match.Optional(String),                                    // 30
      contents: Match.Optional(String),                                // 31
      isOutputStale: Match.Optional(Boolean),                          // 32
      isNew: Match.Optional(Match.App.isNewUpdate(tuple.isNew)),       // 33
      updatedAt: Date                                                  // 34
    };                                                                 // 29
    check(modifier, {                                                  // 35
      $set: $set                                                       // 36
    });                                                                // 36
                                                                       //
    if (modifier.$set && _.has(modifier.$set, "name") && !modifier.$set.name) {
      throw new Match.Error("Name required");                          // 39
    }                                                                  // 48
                                                                       //
    if (modifier.$set && _.has(modifier.$set, "contents") && !modifier.$set.contents) {
      throw new Match.Error("Contents required");                      // 41
    }                                                                  // 51
                                                                       //
    return true;                                                       // 52
  }),                                                                  // 23
  remove: share.securityRulesWrapper(function (userId, tuple) {        // 43
    if (!userId) {                                                     // 44
      throw new Match.Error("Operation not allowed for unauthorized users");
    }                                                                  // 57
                                                                       //
    if (userId !== tuple.ownerId) {                                    // 46
      throw new Match.Error("Operation not allowed for non-owners");   // 47
    }                                                                  // 60
                                                                       //
    return true;                                                       // 61
  })                                                                   // 43
});                                                                    // 2
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/tuples.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L3R1cGxlcy5jb2ZmZWUiXSwibmFtZXMiOlsic2hhcmUiLCJUdXBsZXMiLCJhbGxvdyIsImluc2VydCIsInNlY3VyaXR5UnVsZXNXcmFwcGVyIiwidXNlcklkIiwidHVwbGUiLCJNYXRjaCIsIkVycm9yIiwiX2lkIiwiUmFuZG9tIiwiaWQiLCJvd25lcklkIiwiY2hlY2siLCJBcHAiLCJJZCIsIm5hbWUiLCJTdHJpbmciLCJub3RlIiwiY29udGVudHMiLCJpc091dHB1dFN0YWxlIiwiQm9vbGVhbiIsImlzTmV3IiwiVXNlcklkIiwidXBkYXRlZEF0IiwiRGF0ZSIsImNyZWF0ZWRBdCIsInVwZGF0ZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCIkc2V0IiwiT3B0aW9uYWwiLCJpc05ld1VwZGF0ZSIsIl8iLCJoYXMiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxNQUFNQyxNQUFOLENBQWFDLEtBQWIsQ0FDRTtBQUFBQyxVQUFRSCxNQUFNSSxvQkFBTixDQUEyQixVQUFDQyxNQUFELEVBQVNDLEtBQVQ7QUFDakMsU0FBT0QsTUFBUDtBQUNFLFlBQU0sSUFBSUUsTUFBTUMsS0FBVixDQUFnQiw4Q0FBaEIsQ0FBTjtBQUNEOztBQUFERixVQUFNRyxHQUFOLEdBQVlILE1BQU1HLEdBQU4sSUFBYUMsT0FBT0MsRUFBUCxFQUF6QjtBQUNBTCxVQUFNTSxPQUFOLEdBQWdCUCxNQUFoQjtBQUNBUSxVQUFNUCxLQUFOLEVBQ0U7QUFBQUcsV0FBS0YsTUFBTU8sR0FBTixDQUFVQyxFQUFmO0FBQ0FDLFlBQU1DLE1BRE47QUFFQUMsWUFBTUQsTUFGTjtBQUdBRSxnQkFBVUYsTUFIVjtBQUlBRyxxQkFBZUMsT0FKZjtBQUtBQyxhQUFPRCxPQUxQO0FBTUFULGVBQVNMLE1BQU1PLEdBQU4sQ0FBVVMsTUFObkI7QUFPQUMsaUJBQVdDLElBUFg7QUFRQUMsaUJBQVdEO0FBUlgsS0FERjs7QUFXQSxRQUFHLENBQUluQixNQUFNVSxJQUFiO0FBQ0UsWUFBTSxJQUFJVCxNQUFNQyxLQUFWLENBQWdCLGVBQWhCLENBQU47QUFFRDs7QUFERCxRQUFHLENBQUlGLE1BQU1hLFFBQWI7QUFDRSxZQUFNLElBQUlaLE1BQU1DLEtBQVYsQ0FBZ0IsbUJBQWhCLENBQU47QUFHRDs7QUFDRCxXQUhBLElBR0E7QUF2Qk0sSUFBUjtBQXFCQW1CLFVBQVEzQixNQUFNSSxvQkFBTixDQUEyQixVQUFDQyxNQUFELEVBQVNDLEtBQVQsRUFBZ0JzQixVQUFoQixFQUE0QkMsUUFBNUIsRUFBc0NDLE9BQXRDO0FBQ2pDLFFBQUFDLElBQUE7O0FBQUEsU0FBTzFCLE1BQVA7QUFDRSxZQUFNLElBQUlFLE1BQU1DLEtBQVYsQ0FBZ0IsOENBQWhCLENBQU47QUFNRDs7QUFMRCxRQUFPSCxXQUFVQyxNQUFNTSxPQUF2QjtBQUNFLFlBQU0sSUFBSUwsTUFBTUMsS0FBVixDQUFnQixzQ0FBaEIsQ0FBTjtBQU9EOztBQU5EdUIsV0FDRTtBQUFBZixZQUFNVCxNQUFNeUIsUUFBTixDQUFlZixNQUFmLENBQU47QUFDQUMsWUFBTVgsTUFBTXlCLFFBQU4sQ0FBZWYsTUFBZixDQUROO0FBRUFFLGdCQUFVWixNQUFNeUIsUUFBTixDQUFlZixNQUFmLENBRlY7QUFHQUcscUJBQWViLE1BQU15QixRQUFOLENBQWVYLE9BQWYsQ0FIZjtBQUlBQyxhQUFPZixNQUFNeUIsUUFBTixDQUFlekIsTUFBTU8sR0FBTixDQUFVbUIsV0FBVixDQUFzQjNCLE1BQU1nQixLQUE1QixDQUFmLENBSlA7QUFLQUUsaUJBQVdDO0FBTFgsS0FERjtBQU9BWixVQUFNZ0IsUUFBTixFQUNFO0FBQUFFLFlBQU1BO0FBQU4sS0FERjs7QUFHQSxRQUFHRixTQUFTRSxJQUFULElBQWtCRyxFQUFFQyxHQUFGLENBQU1OLFNBQVNFLElBQWYsRUFBcUIsTUFBckIsQ0FBbEIsSUFBbUQsQ0FBSUYsU0FBU0UsSUFBVCxDQUFjZixJQUF4RTtBQUNFLFlBQU0sSUFBSVQsTUFBTUMsS0FBVixDQUFnQixlQUFoQixDQUFOO0FBU0Q7O0FBUkQsUUFBR3FCLFNBQVNFLElBQVQsSUFBa0JHLEVBQUVDLEdBQUYsQ0FBTU4sU0FBU0UsSUFBZixFQUFxQixVQUFyQixDQUFsQixJQUF1RCxDQUFJRixTQUFTRSxJQUFULENBQWNaLFFBQTVFO0FBQ0UsWUFBTSxJQUFJWixNQUFNQyxLQUFWLENBQWdCLG1CQUFoQixDQUFOO0FBVUQ7O0FBQ0QsV0FWQSxJQVVBO0FBN0JNLElBckJSO0FBeUNBNEIsVUFBUXBDLE1BQU1JLG9CQUFOLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVDtBQUNqQyxTQUFPRCxNQUFQO0FBQ0UsWUFBTSxJQUFJRSxNQUFNQyxLQUFWLENBQWdCLDhDQUFoQixDQUFOO0FBWUQ7O0FBWEQsUUFBT0gsV0FBVUMsTUFBTU0sT0FBdkI7QUFDRSxZQUFNLElBQUlMLE1BQU1DLEtBQVYsQ0FBZ0Isc0NBQWhCLENBQU47QUFhRDs7QUFDRCxXQWJBLElBYUE7QUFsQk07QUF6Q1IsQ0FERiwwRSIsImZpbGUiOiIvc2VydmVyL3NlY3VyaXR5L3R1cGxlcy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5UdXBsZXMuYWxsb3dcbiAgaW5zZXJ0OiBzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciAodXNlcklkLCB0dXBsZSkgLT5cbiAgICB1bmxlc3MgdXNlcklkXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJPcGVyYXRpb24gbm90IGFsbG93ZWQgZm9yIHVuYXV0aG9yaXplZCB1c2Vyc1wiKVxuICAgIHR1cGxlLl9pZCA9IHR1cGxlLl9pZCBvciBSYW5kb20uaWQoKVxuICAgIHR1cGxlLm93bmVySWQgPSB1c2VySWRcbiAgICBjaGVjayh0dXBsZSxcbiAgICAgIF9pZDogTWF0Y2guQXBwLklkXG4gICAgICBuYW1lOiBTdHJpbmdcbiAgICAgIG5vdGU6IFN0cmluZ1xuICAgICAgY29udGVudHM6IFN0cmluZ1xuICAgICAgaXNPdXRwdXRTdGFsZTogQm9vbGVhblxuICAgICAgaXNOZXc6IEJvb2xlYW5cbiAgICAgIG93bmVySWQ6IE1hdGNoLkFwcC5Vc2VySWRcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZVxuICAgICAgY3JlYXRlZEF0OiBEYXRlXG4gICAgKVxuICAgIGlmIG5vdCB0dXBsZS5uYW1lXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJOYW1lIHJlcXVpcmVkXCIpXG4gICAgaWYgbm90IHR1cGxlLmNvbnRlbnRzXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJDb250ZW50cyByZXF1aXJlZFwiKVxuICAgIHRydWVcbiAgdXBkYXRlOiBzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciAodXNlcklkLCB0dXBsZSwgZmllbGROYW1lcywgbW9kaWZpZXIsIG9wdGlvbnMpIC0+XG4gICAgdW5sZXNzIHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICB1bmxlc3MgdXNlcklkIGlzIHR1cGxlLm93bmVySWRcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3Igbm9uLW93bmVyc1wiKVxuICAgICRzZXQgPVxuICAgICAgbmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgbm90ZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKVxuICAgICAgY29udGVudHM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZylcbiAgICAgIGlzT3V0cHV0U3RhbGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pXG4gICAgICBpc05ldzogTWF0Y2guT3B0aW9uYWwoTWF0Y2guQXBwLmlzTmV3VXBkYXRlKHR1cGxlLmlzTmV3KSlcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZVxuICAgIGNoZWNrKG1vZGlmaWVyLFxuICAgICAgJHNldDogJHNldFxuICAgIClcbiAgICBpZiBtb2RpZmllci4kc2V0IGFuZCBfLmhhcyhtb2RpZmllci4kc2V0LCBcIm5hbWVcIikgYW5kIG5vdCBtb2RpZmllci4kc2V0Lm5hbWVcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk5hbWUgcmVxdWlyZWRcIilcbiAgICBpZiBtb2RpZmllci4kc2V0IGFuZCBfLmhhcyhtb2RpZmllci4kc2V0LCBcImNvbnRlbnRzXCIpIGFuZCBub3QgbW9kaWZpZXIuJHNldC5jb250ZW50c1xuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiQ29udGVudHMgcmVxdWlyZWRcIilcbiAgICB0cnVlXG4gIHJlbW92ZTogc2hhcmUuc2VjdXJpdHlSdWxlc1dyYXBwZXIgKHVzZXJJZCwgdHVwbGUpIC0+XG4gICAgdW5sZXNzIHVzZXJJZFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiT3BlcmF0aW9uIG5vdCBhbGxvd2VkIGZvciB1bmF1dGhvcml6ZWQgdXNlcnNcIilcbiAgICB1bmxlc3MgdXNlcklkIGlzIHR1cGxlLm93bmVySWRcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk9wZXJhdGlvbiBub3QgYWxsb3dlZCBmb3Igbm9uLW93bmVyc1wiKVxuICAgIHRydWVcbiJdfQ==
