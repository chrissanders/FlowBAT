(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/users.defaults.coffee                                        //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var getInitials, userPreSave;                                          // 1
                                                                       //
getInitials = function (name) {                                        // 1
  var firstLetters, firstWords;                                        // 2
  firstWords = _.first(name.replace(/\s+/g, " ").trim().split(" "), 2);
                                                                       //
  if (firstWords.length < 2) {                                         // 3
    firstLetters = firstWords[0].substring(0, 2);                      // 4
  } else {                                                             // 3
    firstLetters = _.map(firstWords || [], function (word) {           // 6
      return word.charAt(0);                                           // 10
    }).join("");                                                       // 6
  }                                                                    // 12
                                                                       //
  return firstLetters.toUpperCase();                                   // 13
};                                                                     // 1
                                                                       //
userPreSave = function (userId, changes) {                             // 10
  var ref;                                                             // 11
                                                                       //
  if ((ref = changes.profile) != null ? ref.name : void 0) {           // 11
    changes.profile.initials = getInitials(changes.profile.name);      // 12
  }                                                                    // 20
                                                                       //
  if (changes["profile.name"]) {                                       // 13
    return changes["profile.initials"] = getInitials(changes["profile.name"]);
  }                                                                    // 23
};                                                                     // 10
                                                                       //
Meteor.users.before.insert(function (userId, user) {                   // 16
  _.defaults(user, {                                                   // 17
    isNew: true,                                                       // 18
    isInvitation: false,                                               // 19
    invitations: []                                                    // 20
  });                                                                  // 18
                                                                       //
  _.defaults(user.profile, {                                           // 22
    numRecs: 10,                                                       // 23
    dashboardQueryIds: [],                                             // 24
    isRealName: false                                                  // 25
  });                                                                  // 23
                                                                       //
  return userPreSave.call(this, userId, user);                         // 37
});                                                                    // 16
Meteor.users.before.update(function (userId, user, fieldNames, modifier, options) {
  return userPreSave.call(this, userId, modifier.$set || {});          // 41
});                                                                    // 29
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/users.defaults.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL3VzZXJzLmRlZmF1bHRzLmNvZmZlZSJdLCJuYW1lcyI6WyJnZXRJbml0aWFscyIsInVzZXJQcmVTYXZlIiwibmFtZSIsImZpcnN0TGV0dGVycyIsImZpcnN0V29yZHMiLCJfIiwiZmlyc3QiLCJyZXBsYWNlIiwidHJpbSIsInNwbGl0IiwibGVuZ3RoIiwic3Vic3RyaW5nIiwibWFwIiwid29yZCIsImNoYXJBdCIsImpvaW4iLCJ0b1VwcGVyQ2FzZSIsInVzZXJJZCIsImNoYW5nZXMiLCJyZWYiLCJwcm9maWxlIiwiaW5pdGlhbHMiLCJNZXRlb3IiLCJ1c2VycyIsImJlZm9yZSIsImluc2VydCIsInVzZXIiLCJkZWZhdWx0cyIsImlzTmV3IiwiaXNJbnZpdGF0aW9uIiwiaW52aXRhdGlvbnMiLCJudW1SZWNzIiwiZGFzaGJvYXJkUXVlcnlJZHMiLCJpc1JlYWxOYW1lIiwiY2FsbCIsInVwZGF0ZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCIkc2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxXQUFBLEVBQUFDLFdBQUE7O0FBQUFELGNBQWMsVUFBQ0UsSUFBRDtBQUNaLE1BQUFDLFlBQUEsRUFBQUMsVUFBQTtBQUFBQSxlQUFhQyxFQUFFQyxLQUFGLENBQVFKLEtBQUtLLE9BQUwsQ0FBYSxNQUFiLEVBQXFCLEdBQXJCLEVBQTBCQyxJQUExQixHQUFpQ0MsS0FBakMsQ0FBdUMsR0FBdkMsQ0FBUixFQUFxRCxDQUFyRCxDQUFiOztBQUNBLE1BQUdMLFdBQVdNLE1BQVgsR0FBb0IsQ0FBdkI7QUFDRVAsbUJBQWVDLFdBQVcsQ0FBWCxFQUFjTyxTQUFkLENBQXdCLENBQXhCLEVBQTJCLENBQTNCLENBQWY7QUFERjtBQUdFUixtQkFBZUUsRUFBRU8sR0FBRixDQUFNUixjQUFjLEVBQXBCLEVBQXdCLFVBQUNTLElBQUQ7QUFJckMsYUFIQUEsS0FBS0MsTUFBTCxDQUFZLENBQVosQ0FHQTtBQUphLE9BQ0dDLElBREgsQ0FDUSxFQURSLENBQWY7QUFNRDs7QUFDRCxTQUxBWixhQUFhYSxXQUFiLEVBS0E7QUFaWSxDQUFkOztBQVNBZixjQUFjLFVBQUNnQixNQUFELEVBQVNDLE9BQVQ7QUFDWixNQUFBQyxHQUFBOztBQUFBLE9BQUFBLE1BQUFELFFBQUFFLE9BQUEsWUFBQUQsSUFBb0JqQixJQUFwQixHQUFvQixNQUFwQjtBQUNFZ0IsWUFBUUUsT0FBUixDQUFnQkMsUUFBaEIsR0FBMkJyQixZQUFZa0IsUUFBUUUsT0FBUixDQUFnQmxCLElBQTVCLENBQTNCO0FBUUQ7O0FBUEQsTUFBR2dCLFFBQVEsY0FBUixDQUFIO0FBU0UsV0FSQUEsUUFBUSxrQkFBUixJQUE4QmxCLFlBQVlrQixRQUFRLGNBQVIsQ0FBWixDQVE5QjtBQUNEO0FBYlcsQ0FBZDs7QUFNQUksT0FBT0MsS0FBUCxDQUFhQyxNQUFiLENBQW9CQyxNQUFwQixDQUEyQixVQUFDUixNQUFELEVBQVNTLElBQVQ7QUFDekJyQixJQUFFc0IsUUFBRixDQUFXRCxJQUFYLEVBQ0U7QUFBQUUsV0FBTyxJQUFQO0FBQ0FDLGtCQUFjLEtBRGQ7QUFFQUMsaUJBQWE7QUFGYixHQURGOztBQUtBekIsSUFBRXNCLFFBQUYsQ0FBV0QsS0FBS04sT0FBaEIsRUFDRTtBQUFBVyxhQUFTLEVBQVQ7QUFDQUMsdUJBQW1CLEVBRG5CO0FBRUFDLGdCQUFZO0FBRlosR0FERjs7QUFlQSxTQVZBaEMsWUFBWWlDLElBQVosQ0FBaUIsSUFBakIsRUFBb0JqQixNQUFwQixFQUE0QlMsSUFBNUIsQ0FVQTtBQXJCRjtBQWFBSixPQUFPQyxLQUFQLENBQWFDLE1BQWIsQ0FBb0JXLE1BQXBCLENBQTJCLFVBQUNsQixNQUFELEVBQVNTLElBQVQsRUFBZVUsVUFBZixFQUEyQkMsUUFBM0IsRUFBcUNDLE9BQXJDO0FBWXpCLFNBWEFyQyxZQUFZaUMsSUFBWixDQUFpQixJQUFqQixFQUFvQmpCLE1BQXBCLEVBQTRCb0IsU0FBU0UsSUFBVCxJQUFpQixFQUE3QyxDQVdBO0FBWkYsNEUiLCJmaWxlIjoiL2NvbW1vbi91c2Vycy5kZWZhdWx0cy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJnZXRJbml0aWFscyA9IChuYW1lKSAtPlxuICBmaXJzdFdvcmRzID0gXy5maXJzdChuYW1lLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKS5zcGxpdChcIiBcIiksIDIpXG4gIGlmIGZpcnN0V29yZHMubGVuZ3RoIDwgMlxuICAgIGZpcnN0TGV0dGVycyA9IGZpcnN0V29yZHNbMF0uc3Vic3RyaW5nKDAsIDIpXG4gIGVsc2VcbiAgICBmaXJzdExldHRlcnMgPSBfLm1hcChmaXJzdFdvcmRzIHx8IFtdLCAod29yZCkgLT5cbiAgICAgIHdvcmQuY2hhckF0KDApKS5qb2luKFwiXCIpXG4gIGZpcnN0TGV0dGVycy50b1VwcGVyQ2FzZSgpXG5cbnVzZXJQcmVTYXZlID0gKHVzZXJJZCwgY2hhbmdlcykgLT5cbiAgaWYgY2hhbmdlcy5wcm9maWxlPy5uYW1lXG4gICAgY2hhbmdlcy5wcm9maWxlLmluaXRpYWxzID0gZ2V0SW5pdGlhbHMoY2hhbmdlcy5wcm9maWxlLm5hbWUpXG4gIGlmIGNoYW5nZXNbXCJwcm9maWxlLm5hbWVcIl1cbiAgICBjaGFuZ2VzW1wicHJvZmlsZS5pbml0aWFsc1wiXSA9IGdldEluaXRpYWxzKGNoYW5nZXNbXCJwcm9maWxlLm5hbWVcIl0pXG5cbk1ldGVvci51c2Vycy5iZWZvcmUuaW5zZXJ0ICh1c2VySWQsIHVzZXIpIC0+XG4gIF8uZGVmYXVsdHModXNlcixcbiAgICBpc05ldzogdHJ1ZVxuICAgIGlzSW52aXRhdGlvbjogZmFsc2VcbiAgICBpbnZpdGF0aW9uczogW11cbiAgKVxuICBfLmRlZmF1bHRzKHVzZXIucHJvZmlsZSxcbiAgICBudW1SZWNzOiAxMFxuICAgIGRhc2hib2FyZFF1ZXJ5SWRzOiBbXVxuICAgIGlzUmVhbE5hbWU6IGZhbHNlXG4gIClcbiAgdXNlclByZVNhdmUuY2FsbChALCB1c2VySWQsIHVzZXIpXG5cbk1ldGVvci51c2Vycy5iZWZvcmUudXBkYXRlICh1c2VySWQsIHVzZXIsIGZpZWxkTmFtZXMsIG1vZGlmaWVyLCBvcHRpb25zKSAtPlxuICB1c2VyUHJlU2F2ZS5jYWxsKEAsIHVzZXJJZCwgbW9kaWZpZXIuJHNldCB8fCB7fSlcbiJdfQ==
