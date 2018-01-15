(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/methods.coffee                                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.getMailDomail = function () {                                    // 1
  var matches;                                                         // 2
                                                                       //
  if (process.env.MAIL_URL) {                                          // 2
    matches = process.env.MAIL_URL.match(/\/\/(.+)%40(.+):(.+)@(.+):(\d+)/);
    return matches[2];                                                 // 4
  }                                                                    // 6
                                                                       //
  return "";                                                           // 5
};                                                                     // 1
                                                                       //
Meteor.methods({                                                       // 7
  setPassword: function (userId, password) {                           // 8
    check(userId, String);                                             // 9
    check(password, String);                                           // 10
                                                                       //
    if (!(userId === this.userId || share.Security.hasRole(this.userId, "admin"))) {
      Meteor._debug("Setting password is not allowed for non admins");
                                                                       //
      return;                                                          // 13
    }                                                                  // 17
                                                                       //
    return Accounts.setPassword(userId, password);                     // 18
  },                                                                   // 8
  addNewUser: function (newUser) {                                     // 15
    var config, user, userId;                                          // 16
    check(newUser, {                                                   // 16
      email: Match.App.Email,                                          // 17
      name: String,                                                    // 18
      password: String,                                                // 19
      group: Match.App.InArray(share.Security.groups())                // 20
    });                                                                // 17
    newUser.email = newUser.email.toLowerCase();                       // 21
                                                                       //
    if (this.userId) {                                                 // 22
      if (!share.Security.hasRole(this.userId, "admin")) {             // 23
        Meteor._debug("Creating users is not allowed for non admins");
                                                                       //
        return;                                                        // 25
      }                                                                // 22
    } else {                                                           // 22
      config = share.Configs.findOne();                                // 27
                                                                       //
      if (config.isSetupComplete) {                                    // 28
        Meteor._debug("Creating users is not allowed for non admins");
                                                                       //
        return;                                                        // 30
      } else {                                                         // 28
        newUser.group = "admin";                                       // 32
      }                                                                // 22
    }                                                                  // 42
                                                                       //
    userId = Accounts.createUser({                                     // 33
      email: newUser.email,                                            // 34
      password: newUser.password,                                      // 35
      profile: {                                                       // 36
        name: newUser.name                                             // 37
      }                                                                // 37
    });                                                                // 34
    Meteor.users.update(userId, {                                      // 38
      $set: {                                                          // 38
        group: newUser.group                                           // 38
      }                                                                // 38
    });                                                                // 38
    user = Meteor.users.findOne(userId);                               // 39
    Email.send({                                                       // 40
      from: '"' + root.i18n.t("messages.postman") + ' (FlowBAT)" <herald@' + share.getMailDomail() + '>',
      to: newUser.email,                                               // 42
      subject: Handlebars.templates["newUserSubject"]({                // 43
        user: user,                                                    // 43
        settings: Meteor.settings                                      // 43
      }).trim(),                                                       // 43
      html: Handlebars.templates["newUserHtml"]({                      // 44
        user: user,                                                    // 44
        email: newUser.email,                                          // 44
        password: newUser.password,                                    // 44
        settings: Meteor.settings                                      // 44
      }).trim()                                                        // 44
    });                                                                // 41
    return userId;                                                     // 70
  }                                                                    // 15
});                                                                    // 8
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/methods.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21ldGhvZHMuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwiZ2V0TWFpbERvbWFpbCIsIm1hdGNoZXMiLCJwcm9jZXNzIiwiZW52IiwiTUFJTF9VUkwiLCJtYXRjaCIsIk1ldGVvciIsIm1ldGhvZHMiLCJzZXRQYXNzd29yZCIsInVzZXJJZCIsInBhc3N3b3JkIiwiY2hlY2siLCJTdHJpbmciLCJTZWN1cml0eSIsImhhc1JvbGUiLCJfZGVidWciLCJBY2NvdW50cyIsImFkZE5ld1VzZXIiLCJuZXdVc2VyIiwiY29uZmlnIiwidXNlciIsImVtYWlsIiwiTWF0Y2giLCJBcHAiLCJFbWFpbCIsIm5hbWUiLCJncm91cCIsIkluQXJyYXkiLCJncm91cHMiLCJ0b0xvd2VyQ2FzZSIsIkNvbmZpZ3MiLCJmaW5kT25lIiwiaXNTZXR1cENvbXBsZXRlIiwiY3JlYXRlVXNlciIsInByb2ZpbGUiLCJ1c2VycyIsInVwZGF0ZSIsIiRzZXQiLCJzZW5kIiwiZnJvbSIsInJvb3QiLCJpMThuIiwidCIsInRvIiwic3ViamVjdCIsIkhhbmRsZWJhcnMiLCJ0ZW1wbGF0ZXMiLCJzZXR0aW5ncyIsInRyaW0iLCJodG1sIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQUEsTUFBTUMsYUFBTixHQUFzQjtBQUNwQixNQUFBQyxPQUFBOztBQUFBLE1BQUdDLFFBQVFDLEdBQVIsQ0FBWUMsUUFBZjtBQUNFSCxjQUFVQyxRQUFRQyxHQUFSLENBQVlDLFFBQVosQ0FBcUJDLEtBQXJCLENBQTJCLGlDQUEzQixDQUFWO0FBQ0EsV0FBT0osUUFBUSxDQUFSLENBQVA7QUFFRDs7QUFERCxTQUFPLEVBQVA7QUFKb0IsQ0FBdEI7O0FBTUFLLE9BQU9DLE9BQVAsQ0FDRTtBQUFBQyxlQUFhLFVBQUNDLE1BQUQsRUFBU0MsUUFBVDtBQUNYQyxVQUFNRixNQUFOLEVBQWNHLE1BQWQ7QUFDQUQsVUFBTUQsUUFBTixFQUFnQkUsTUFBaEI7O0FBQ0EsVUFBT0gsV0FBVSxLQUFDQSxNQUFYLElBQXFCVixNQUFNYyxRQUFOLENBQWVDLE9BQWYsQ0FBdUIsS0FBQ0wsTUFBeEIsRUFBZ0MsT0FBaEMsQ0FBNUI7QUFDRUgsYUFBT1MsTUFBUCxDQUFjLGdEQUFkOztBQUNBO0FBSUQ7O0FBQ0QsV0FKQUMsU0FBU1IsV0FBVCxDQUFxQkMsTUFBckIsRUFBNkJDLFFBQTdCLENBSUE7QUFWRjtBQU9BTyxjQUFZLFVBQUNDLE9BQUQ7QUFDVixRQUFBQyxNQUFBLEVBQUFDLElBQUEsRUFBQVgsTUFBQTtBQUFBRSxVQUFNTyxPQUFOLEVBQ0U7QUFBQUcsYUFBT0MsTUFBTUMsR0FBTixDQUFVQyxLQUFqQjtBQUNBQyxZQUFNYixNQUROO0FBRUFGLGdCQUFVRSxNQUZWO0FBR0FjLGFBQU9KLE1BQU1DLEdBQU4sQ0FBVUksT0FBVixDQUFrQjVCLE1BQU1jLFFBQU4sQ0FBZWUsTUFBZixFQUFsQjtBQUhQLEtBREY7QUFLQVYsWUFBUUcsS0FBUixHQUFnQkgsUUFBUUcsS0FBUixDQUFjUSxXQUFkLEVBQWhCOztBQUNBLFFBQUcsS0FBQ3BCLE1BQUo7QUFDRSxVQUFHLENBQUlWLE1BQU1jLFFBQU4sQ0FBZUMsT0FBZixDQUF1QixLQUFDTCxNQUF4QixFQUFnQyxPQUFoQyxDQUFQO0FBQ0VILGVBQU9TLE1BQVAsQ0FBYyw4Q0FBZDs7QUFDQTtBQUhKO0FBQUE7QUFLRUksZUFBU3BCLE1BQU0rQixPQUFOLENBQWNDLE9BQWQsRUFBVDs7QUFDQSxVQUFHWixPQUFPYSxlQUFWO0FBQ0UxQixlQUFPUyxNQUFQLENBQWMsOENBQWQ7O0FBQ0E7QUFGRjtBQUlFRyxnQkFBUVEsS0FBUixHQUFnQixPQUFoQjtBQVZKO0FBb0JDOztBQVREakIsYUFBU08sU0FBU2lCLFVBQVQsQ0FDUDtBQUFBWixhQUFPSCxRQUFRRyxLQUFmO0FBQ0FYLGdCQUFVUSxRQUFRUixRQURsQjtBQUVBd0IsZUFDRTtBQUFBVCxjQUFNUCxRQUFRTztBQUFkO0FBSEYsS0FETyxDQUFUO0FBS0FuQixXQUFPNkIsS0FBUCxDQUFhQyxNQUFiLENBQW9CM0IsTUFBcEIsRUFBNEI7QUFBQzRCLFlBQU07QUFBQ1gsZUFBT1IsUUFBUVE7QUFBaEI7QUFBUCxLQUE1QjtBQUNBTixXQUFPZCxPQUFPNkIsS0FBUCxDQUFhSixPQUFiLENBQXFCdEIsTUFBckIsQ0FBUDtBQUNBZSxVQUFNYyxJQUFOLENBQ0U7QUFBQUMsWUFBTSxNQUFNQyxLQUFLQyxJQUFMLENBQVVDLENBQVYsQ0FBWSxrQkFBWixDQUFOLEdBQXdDLHNCQUF4QyxHQUFpRTNDLE1BQU1DLGFBQU4sRUFBakUsR0FBeUYsR0FBL0Y7QUFDQTJDLFVBQUl6QixRQUFRRyxLQURaO0FBRUF1QixlQUFTQyxXQUFXQyxTQUFYLENBQXFCLGdCQUFyQixFQUF1QztBQUFBMUIsY0FBTUEsSUFBTjtBQUFZMkIsa0JBQVV6QyxPQUFPeUM7QUFBN0IsT0FBdkMsRUFBOEVDLElBQTlFLEVBRlQ7QUFHQUMsWUFBTUosV0FBV0MsU0FBWCxDQUFxQixhQUFyQixFQUFvQztBQUFBMUIsY0FBTUEsSUFBTjtBQUFZQyxlQUFPSCxRQUFRRyxLQUEzQjtBQUFrQ1gsa0JBQVVRLFFBQVFSLFFBQXBEO0FBQThEcUMsa0JBQVV6QyxPQUFPeUM7QUFBL0UsT0FBcEMsRUFBNkhDLElBQTdIO0FBSE4sS0FERjtBQThCQSxXQXpCQXZDLE1BeUJBO0FBdkRVO0FBUFosQ0FERiwwRSIsImZpbGUiOiIvc2VydmVyL21ldGhvZHMuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsic2hhcmUuZ2V0TWFpbERvbWFpbCA9IC0+XG4gIGlmIHByb2Nlc3MuZW52Lk1BSUxfVVJMXG4gICAgbWF0Y2hlcyA9IHByb2Nlc3MuZW52Lk1BSUxfVVJMLm1hdGNoKC9cXC9cXC8oLispJTQwKC4rKTooLispQCguKyk6KFxcZCspLylcbiAgICByZXR1cm4gbWF0Y2hlc1syXVxuICByZXR1cm4gXCJcIlxuXG5NZXRlb3IubWV0aG9kc1xuICBzZXRQYXNzd29yZDogKHVzZXJJZCwgcGFzc3dvcmQpIC0+XG4gICAgY2hlY2sodXNlcklkLCBTdHJpbmcpXG4gICAgY2hlY2socGFzc3dvcmQsIFN0cmluZylcbiAgICB1bmxlc3MgdXNlcklkIGlzIEB1c2VySWQgb3Igc2hhcmUuU2VjdXJpdHkuaGFzUm9sZShAdXNlcklkLCBcImFkbWluXCIpXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiU2V0dGluZyBwYXNzd29yZCBpcyBub3QgYWxsb3dlZCBmb3Igbm9uIGFkbWluc1wiKVxuICAgICAgcmV0dXJuXG4gICAgQWNjb3VudHMuc2V0UGFzc3dvcmQodXNlcklkLCBwYXNzd29yZClcbiAgYWRkTmV3VXNlcjogKG5ld1VzZXIpIC0+XG4gICAgY2hlY2sgbmV3VXNlcixcbiAgICAgIGVtYWlsOiBNYXRjaC5BcHAuRW1haWxcbiAgICAgIG5hbWU6IFN0cmluZ1xuICAgICAgcGFzc3dvcmQ6IFN0cmluZ1xuICAgICAgZ3JvdXA6IE1hdGNoLkFwcC5JbkFycmF5KHNoYXJlLlNlY3VyaXR5Lmdyb3VwcygpKVxuICAgIG5ld1VzZXIuZW1haWwgPSBuZXdVc2VyLmVtYWlsLnRvTG93ZXJDYXNlKClcbiAgICBpZiBAdXNlcklkXG4gICAgICBpZiBub3Qgc2hhcmUuU2VjdXJpdHkuaGFzUm9sZShAdXNlcklkLCBcImFkbWluXCIpXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJDcmVhdGluZyB1c2VycyBpcyBub3QgYWxsb3dlZCBmb3Igbm9uIGFkbWluc1wiKVxuICAgICAgICByZXR1cm5cbiAgICBlbHNlXG4gICAgICBjb25maWcgPSBzaGFyZS5Db25maWdzLmZpbmRPbmUoKVxuICAgICAgaWYgY29uZmlnLmlzU2V0dXBDb21wbGV0ZVxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiQ3JlYXRpbmcgdXNlcnMgaXMgbm90IGFsbG93ZWQgZm9yIG5vbiBhZG1pbnNcIilcbiAgICAgICAgcmV0dXJuXG4gICAgICBlbHNlXG4gICAgICAgIG5ld1VzZXIuZ3JvdXAgPSBcImFkbWluXCJcbiAgICB1c2VySWQgPSBBY2NvdW50cy5jcmVhdGVVc2VyXG4gICAgICBlbWFpbDogbmV3VXNlci5lbWFpbFxuICAgICAgcGFzc3dvcmQ6IG5ld1VzZXIucGFzc3dvcmRcbiAgICAgIHByb2ZpbGU6XG4gICAgICAgIG5hbWU6IG5ld1VzZXIubmFtZVxuICAgIE1ldGVvci51c2Vycy51cGRhdGUodXNlcklkLCB7JHNldDoge2dyb3VwOiBuZXdVc2VyLmdyb3VwfX0pXG4gICAgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZClcbiAgICBFbWFpbC5zZW5kXG4gICAgICBmcm9tOiAnXCInICsgcm9vdC5pMThuLnQoXCJtZXNzYWdlcy5wb3N0bWFuXCIpICsgJyAoRmxvd0JBVClcIiA8aGVyYWxkQCcgKyBzaGFyZS5nZXRNYWlsRG9tYWlsKCkgKyAnPidcbiAgICAgIHRvOiBuZXdVc2VyLmVtYWlsXG4gICAgICBzdWJqZWN0OiBIYW5kbGViYXJzLnRlbXBsYXRlc1tcIm5ld1VzZXJTdWJqZWN0XCJdKHVzZXI6IHVzZXIsIHNldHRpbmdzOiBNZXRlb3Iuc2V0dGluZ3MpLnRyaW0oKVxuICAgICAgaHRtbDogSGFuZGxlYmFycy50ZW1wbGF0ZXNbXCJuZXdVc2VySHRtbFwiXSh1c2VyOiB1c2VyLCBlbWFpbDogbmV3VXNlci5lbWFpbCwgcGFzc3dvcmQ6IG5ld1VzZXIucGFzc3dvcmQsIHNldHRpbmdzOiBNZXRlb3Iuc2V0dGluZ3MpLnRyaW0oKVxuICAgIHVzZXJJZFxuIl19
