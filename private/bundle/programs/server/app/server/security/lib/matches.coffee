(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/lib/matches.coffee                                  //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var indexOf = [].indexOf;                                              // 1
Match.App = {                                                          // 1
  Id: Match.Where(function (value) {                                   // 2
    check(value, String);                                              // 3
                                                                       //
    if (indexOf.call(share.fixtureIds, value) >= 0) {                  // 4
      return true; // verbose IDs                                      // 5
    }                                                                  // 8
                                                                       //
    if (value.length !== 17 || _.difference(value.split(""), ["2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]).length) {
      throw new Match.Error("Value \"" + value + "\" is not a valid ID");
    }                                                                  // 11
                                                                       //
    return true;                                                       // 12
  }),                                                                  // 2
  UserId: Match.Where(function (value) {                               // 9
    check(value, Match.App.Id);                                        // 10
                                                                       //
    if (!Meteor.users.findOne(value)) {                                // 11
      throw new Match.Error("User with ID \"" + value + "\" doesn't exist");
    }                                                                  // 18
                                                                       //
    return true;                                                       // 19
  }),                                                                  // 9
  QueryId: Match.Where(function (value) {                              // 14
    check(value, Match.App.Id);                                        // 15
                                                                       //
    if (!share.Queries.findOne(value)) {                               // 16
      throw new Match.Error("Query with ID \"" + value + "\" doesn't exist");
    }                                                                  // 25
                                                                       //
    return true;                                                       // 26
  }),                                                                  // 14
  IPSetId: Match.Where(function (value) {                              // 19
    check(value, Match.App.Id);                                        // 20
                                                                       //
    if (!share.IPSets.findOne(value)) {                                // 21
      throw new Match.Error("IP Set with ID \"" + value + "\" doesn't exist");
    }                                                                  // 32
                                                                       //
    return true;                                                       // 33
  }),                                                                  // 19
  TupleId: Match.Where(function (value) {                              // 24
    check(value, Match.App.Id);                                        // 25
                                                                       //
    if (!share.Tuples.findOne(value)) {                                // 26
      throw new Match.Error("Tuple file with ID \"" + value + "\" doesn't exist");
    }                                                                  // 39
                                                                       //
    return true;                                                       // 40
  }),                                                                  // 24
  isNewUpdate: function (oldValue) {                                   // 29
    return Match.Where(function (value) {                              // 43
      check(value, Boolean);                                           // 31
                                                                       //
      if (value && !oldValue) {                                        // 32
        throw new Match.Error("isNew update can't be true from false");
      }                                                                // 47
                                                                       //
      return true;                                                     // 48
    });                                                                // 30
  },                                                                   // 2
  InArray: function (possibleValues) {                                 // 35
    return Match.Where(function (value) {                              // 52
      if (possibleValues.indexOf(value) === -1) {                      // 37
        throw new Match.Error("Expected one of \"" + possibleValues.join("\", \"") + "\"; got \"" + value + "\"");
      }                                                                // 55
                                                                       //
      return true;                                                     // 56
    });                                                                // 36
  },                                                                   // 2
  UnsignedNumber: Match.Where(function (value) {                       // 40
    check(value, Number);                                              // 41
                                                                       //
    if (value < 0) {                                                   // 42
      throw new Match.Error("Must be unsigned number");                // 43
    }                                                                  // 63
                                                                       //
    return true;                                                       // 64
  }),                                                                  // 40
  Email: Match.Where(function (value) {                                // 45
    return value.match(share.emailRegex);                              // 67
  })                                                                   // 45
};                                                                     // 2
                                                                       //
_.extend(Match.App, {                                                  // 47
  ExternalSource: Match.App.InArray(["trello"])                        // 48
});                                                                    // 48
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/lib/matches.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L2xpYi9tYXRjaGVzLmNvZmZlZSJdLCJuYW1lcyI6WyJpbmRleE9mIiwiTWF0Y2giLCJBcHAiLCJJZCIsIldoZXJlIiwidmFsdWUiLCJjaGVjayIsIlN0cmluZyIsImNhbGwiLCJzaGFyZSIsImZpeHR1cmVJZHMiLCJsZW5ndGgiLCJfIiwiZGlmZmVyZW5jZSIsInNwbGl0IiwiRXJyb3IiLCJVc2VySWQiLCJNZXRlb3IiLCJ1c2VycyIsImZpbmRPbmUiLCJRdWVyeUlkIiwiUXVlcmllcyIsIklQU2V0SWQiLCJJUFNldHMiLCJUdXBsZUlkIiwiVHVwbGVzIiwiaXNOZXdVcGRhdGUiLCJvbGRWYWx1ZSIsIkJvb2xlYW4iLCJJbkFycmF5IiwicG9zc2libGVWYWx1ZXMiLCJqb2luIiwiVW5zaWduZWROdW1iZXIiLCJOdW1iZXIiLCJFbWFpbCIsIm1hdGNoIiwiZW1haWxSZWdleCIsImV4dGVuZCIsIkV4dGVybmFsU291cmNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxVQUFBLEdBQUFBLE9BQUE7QUFBQUMsTUFBTUMsR0FBTixHQUNFO0FBQUFDLE1BQUlGLE1BQU1HLEtBQU4sQ0FBWSxVQUFDQyxLQUFEO0FBQ2RDLFVBQU1ELEtBQU4sRUFBYUUsTUFBYjs7QUFDQSxRQUFHUCxRQUFBUSxJQUFBLENBQVNDLE1BQU1DLFVBQWYsRUFBQUwsS0FBQSxNQUFIO0FBQ0UsYUFBTyxJQUFQLENBREY7QUFJQzs7QUFGRCxRQUFHQSxNQUFNTSxNQUFOLEtBQWtCLEVBQWxCLElBQXdCQyxFQUFFQyxVQUFGLENBQWFSLE1BQU1TLEtBQU4sQ0FBWSxFQUFaLENBQWIsRUFBOEIsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsR0FBMUIsRUFBK0IsR0FBL0IsRUFBb0MsR0FBcEMsRUFBeUMsR0FBekMsRUFBOEMsR0FBOUMsRUFBbUQsR0FBbkQs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LFdBQVMsVUFBQ0MsY0FBRDtBQWlCUCxXQWhCQTdCLE1BQU1HLEtBQU4sQ0FBWSxVQUFDQyxLQUFEO0FBQ1YsVUFBR3lCLGVBQWU5QixPQUFmLENBQXVCSyxLQUF2QixNQUFpQyxDQUFDLENBQXJDO0FBQ0UsY0FBTSxJQUFJSixNQUFNYyxLQUFWLENBQWdCLHVCQUFxQmUsZUFBZUMsSUFBZixDQUFvQixRQUFwQixDQUFyQixHQUFtRCxZQUFuRCxHQUFrRTFCLEtBQWxFLEdBQTBFLElBQTFGLENBQU47QUFpQkQ7O0FBQ0QsYUFqQkEsSUFpQkE7QUFwQkYsTUFnQkE7QUFsREY7QUFzQ0EyQixrQkFBZ0IvQixNQUFNRyxLQUFOLENBQVksVUFBQ0MsS0FBRDtBQUMxQkMsVUFBTUQsS0FBTixFQUFhNEIsTUFBYjs7QUFDQSxRQUFHNUIsUUFBUSxDQUFYO0FBQ0UsWUFBTSxJQUFJSixNQUFNYyxLQUFWLENBQWdCLHlCQUFoQixDQUFOO0FBb0JEOztBQUNELFdBcEJBLElBb0JBO0FBeEJjLElBdENoQjtBQTJDQW1CLFNBQU9qQyxNQUFNRyxLQUFOLENBQVksVUFBQ0MsS0FBRDtBQXNCakIsV0FyQkFBLE1BQU04QixLQUFOLENBQVkxQixNQUFNMkIsVUFBbEIsQ0FxQkE7QUF0Qks7QUEzQ1AsQ0FERjs7QUE4Q0F4QixFQUFFeUIsTUFBRixDQUFTcEMsTUFBTUMsR0FBZixFQUNFO0FBQUFvQyxrQkFBZ0JyQyxNQUFNQyxHQUFOLENBQVUyQixPQUFWLENBQWtCLENBQUMsUUFBRCxDQUFsQjtBQUFoQixDQURGLDJFIiwiZmlsZSI6Ii9zZXJ2ZXIvc2VjdXJpdHkvbGliL21hdGNoZXMuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsiTWF0Y2guQXBwID1cbiAgSWQ6IE1hdGNoLldoZXJlICh2YWx1ZSkgLT5cbiAgICBjaGVjayh2YWx1ZSwgU3RyaW5nKVxuICAgIGlmIHZhbHVlIGluIHNoYXJlLmZpeHR1cmVJZHNcbiAgICAgIHJldHVybiB0cnVlICMgdmVyYm9zZSBJRHNcbiAgICBpZiB2YWx1ZS5sZW5ndGggaXNudCAxNyBvciBfLmRpZmZlcmVuY2UodmFsdWUuc3BsaXQoXCJcIiksIFtcIjJcIiwgXCIzXCIsIFwiNFwiLCBcIjVcIiwgXCI2XCIsIFwiN1wiLCBcIjhcIiwgXCI5XCIsIFwiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiLCBcIkVcIiwgXCJGXCIsIFwiR1wiLCBcIkhcIiwgXCJKXCIsIFwiS1wiLCBcIkxcIiwgXCJNXCIsIFwiTlwiLCBcIlBcIiwgXCJRXCIsIFwiUlwiLCBcIlNcIiwgXCJUXCIsIFwiV1wiLCBcIlhcIiwgXCJZXCIsIFwiWlwiLCBcImFcIiwgXCJiXCIsIFwiY1wiLCBcImRcIiwgXCJlXCIsIFwiZlwiLCBcImdcIiwgXCJoXCIsIFwiaVwiLCBcImpcIiwgXCJrXCIsIFwibVwiLCBcIm5cIiwgXCJvXCIsIFwicFwiLCBcInFcIiwgXCJyXCIsIFwic1wiLCBcInRcIiwgXCJ1XCIsIFwidlwiLCBcIndcIiwgXCJ4XCIsIFwieVwiLCBcInpcIl0pLmxlbmd0aFxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVmFsdWUgXFxcIlwiICsgdmFsdWUgKyBcIlxcXCIgaXMgbm90IGEgdmFsaWQgSURcIilcbiAgICB0cnVlXG4gIFVzZXJJZDogTWF0Y2guV2hlcmUgKHZhbHVlKSAtPlxuICAgIGNoZWNrKHZhbHVlLCBNYXRjaC5BcHAuSWQpXG4gICAgdW5sZXNzIE1ldGVvci51c2Vycy5maW5kT25lKHZhbHVlKVxuICAgICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVXNlciB3aXRoIElEIFxcXCJcIiArIHZhbHVlICsgXCJcXFwiIGRvZXNuJ3QgZXhpc3RcIilcbiAgICB0cnVlXG4gIFF1ZXJ5SWQ6IE1hdGNoLldoZXJlICh2YWx1ZSkgLT5cbiAgICBjaGVjayh2YWx1ZSwgTWF0Y2guQXBwLklkKVxuICAgIHVubGVzcyBzaGFyZS5RdWVyaWVzLmZpbmRPbmUodmFsdWUpXG4gICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJRdWVyeSB3aXRoIElEIFxcXCJcIiArIHZhbHVlICsgXCJcXFwiIGRvZXNuJ3QgZXhpc3RcIilcbiAgICB0cnVlXG4gIElQU2V0SWQ6IE1hdGNoLldoZXJlICh2YWx1ZSkgLT5cbiAgICBjaGVjayh2YWx1ZSwgTWF0Y2guQXBwLklkKVxuICAgIHVubGVzcyBzaGFyZS5JUFNldHMuZmluZE9uZSh2YWx1ZSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIklQIFNldCB3aXRoIElEIFxcXCJcIiArIHZhbHVlICsgXCJcXFwiIGRvZXNuJ3QgZXhpc3RcIilcbiAgICB0cnVlXG4gIFR1cGxlSWQ6IE1hdGNoLldoZXJlICh2YWx1ZSkgLT5cbiAgICBjaGVjayh2YWx1ZSwgTWF0Y2guQXBwLklkKVxuICAgIHVubGVzcyBzaGFyZS5UdXBsZXMuZmluZE9uZSh2YWx1ZSlcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlR1cGxlIGZpbGUgd2l0aCBJRCBcXFwiXCIgKyB2YWx1ZSArIFwiXFxcIiBkb2Vzbid0IGV4aXN0XCIpXG4gICAgdHJ1ZVxuICBpc05ld1VwZGF0ZTogKG9sZFZhbHVlKSAtPlxuICAgIE1hdGNoLldoZXJlICh2YWx1ZSkgLT5cbiAgICAgIGNoZWNrKHZhbHVlLCBCb29sZWFuKVxuICAgICAgaWYgdmFsdWUgYW5kIG5vdCBvbGRWYWx1ZVxuICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJpc05ldyB1cGRhdGUgY2FuJ3QgYmUgdHJ1ZSBmcm9tIGZhbHNlXCIpXG4gICAgICB0cnVlXG4gIEluQXJyYXk6IChwb3NzaWJsZVZhbHVlcykgLT5cbiAgICBNYXRjaC5XaGVyZSAodmFsdWUpIC0+XG4gICAgICBpZiBwb3NzaWJsZVZhbHVlcy5pbmRleE9mKHZhbHVlKSA9PSAtMVxuICAgICAgICB0aHJvdyBuZXcgTWF0Y2guRXJyb3IoXCJFeHBlY3RlZCBvbmUgb2YgXFxcIlwiK3Bvc3NpYmxlVmFsdWVzLmpvaW4oXCJcXFwiLCBcXFwiXCIpK1wiXFxcIjsgZ290IFxcXCJcIiArIHZhbHVlICsgXCJcXFwiXCIpXG4gICAgICB0cnVlXG4gIFVuc2lnbmVkTnVtYmVyOiBNYXRjaC5XaGVyZSAodmFsdWUpIC0+XG4gICAgY2hlY2sodmFsdWUsIE51bWJlcilcbiAgICBpZiB2YWx1ZSA8IDBcbiAgICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIk11c3QgYmUgdW5zaWduZWQgbnVtYmVyXCIpXG4gICAgdHJ1ZVxuICBFbWFpbDogTWF0Y2guV2hlcmUgKHZhbHVlKSAtPlxuICAgIHZhbHVlLm1hdGNoKHNoYXJlLmVtYWlsUmVnZXgpXG5fLmV4dGVuZChNYXRjaC5BcHAsXG4gIEV4dGVybmFsU291cmNlOiBNYXRjaC5BcHAuSW5BcnJheShbXCJ0cmVsbG9cIl0pXG4pXG4iXX0=
