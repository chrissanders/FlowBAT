(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/startup.coffee                                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
process.env.MAIL_URL = Meteor.settings.mailUrl; //share.twilio = if Meteor.settings.twilio.sid then Twilio(Meteor.settings.twilio.sid, Meteor.settings.twilio.token) else null
                                                                       //
Email.sendImmediate = Email.send;                                      // 4
                                                                       //
Email.send = function (options) {                                      // 5
  share.Emails.insert(options);                                        // 6
                                                                       //
  if (Meteor.settings.public.isDebug) {                                // 7
    return Meteor.setTimeout(function () {                             // 9
      return share.sendEmails();                                       // 10
    }, 1000);                                                          // 8
  }                                                                    // 12
};                                                                     // 5
                                                                       //
Accounts.emailTemplates.from = "Postman (FlowBAT) <postman@flowbat.com>";
                                                                       //
Accounts.emailTemplates.resetPassword.subject = function (user) {      // 13
  return Handlebars.templates["resetPasswordSubject"]({                // 18
    user: user,                                                        // 14
    settings: Meteor.settings                                          // 14
  }).trim();                                                           // 14
};                                                                     // 13
                                                                       //
Accounts.emailTemplates.resetPassword.text = function (user, url) {};  // 15
                                                                       //
Accounts.emailTemplates.resetPassword.html = function (user, url) {    // 16
  return Handlebars.templates["resetPasswordHtml"]({                   // 27
    user: user,                                                        // 17
    url: url,                                                          // 17
    settings: Meteor.settings                                          // 17
  }).trim();                                                           // 17
};                                                                     // 16
                                                                       //
Meteor.startup(function () {                                           // 19
  Meteor.users._ensureIndex({                                          // 20
    friendUserIds: 1                                                   // 20
  }, {                                                                 // 20
    background: true                                                   // 20
  });                                                                  // 20
                                                                       //
  share.loadFixtures();                                                // 21
                                                                       //
  if (Meteor.settings.public.isDebug) {                                // 22
    Meteor.setInterval(share.loadFixtures, 300);                       // 23
    Meteor.setInterval(share.cleanupQuickQueries, 500);                // 24
    Meteor.setInterval(share.cleanupCachedQueryResults, 500);          // 25
  } else {                                                             // 22
    Meteor.setInterval(share.cleanupQuickQueries, 60 * 60 * 1000);     // 27
    Meteor.setInterval(share.cleanupCachedQueryResults, 60 * 60 * 1000);
  }                                                                    // 48
                                                                       //
  return share.periodicExecution.execute();                            // 49
}); //    Apm.connect(Meteor.settings.apm.appId, Meteor.settings.apm.secret)
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/startup.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3N0YXJ0dXAuY29mZmVlIl0sIm5hbWVzIjpbInByb2Nlc3MiLCJlbnYiLCJNQUlMX1VSTCIsIk1ldGVvciIsInNldHRpbmdzIiwibWFpbFVybCIsIkVtYWlsIiwic2VuZEltbWVkaWF0ZSIsInNlbmQiLCJvcHRpb25zIiwic2hhcmUiLCJFbWFpbHMiLCJpbnNlcnQiLCJwdWJsaWMiLCJpc0RlYnVnIiwic2V0VGltZW91dCIsInNlbmRFbWFpbHMiLCJBY2NvdW50cyIsImVtYWlsVGVtcGxhdGVzIiwiZnJvbSIsInJlc2V0UGFzc3dvcmQiLCJzdWJqZWN0IiwidXNlciIsIkhhbmRsZWJhcnMiLCJ0ZW1wbGF0ZXMiLCJ0cmltIiwidGV4dCIsInVybCIsImh0bWwiLCJzdGFydHVwIiwidXNlcnMiLCJfZW5zdXJlSW5kZXgiLCJmcmllbmRVc2VySWRzIiwiYmFja2dyb3VuZCIsImxvYWRGaXh0dXJlcyIsInNldEludGVydmFsIiwiY2xlYW51cFF1aWNrUXVlcmllcyIsImNsZWFudXBDYWNoZWRRdWVyeVJlc3VsdHMiLCJwZXJpb2RpY0V4ZWN1dGlvbiIsImV4ZWN1dGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxRQUFRQyxHQUFSLENBQVlDLFFBQVosR0FBdUJDLE9BQU9DLFFBQVAsQ0FBZ0JDLE9BQXZDLEMsQ0FFQTs7QUFDQUMsTUFBTUMsYUFBTixHQUFzQkQsTUFBTUUsSUFBNUI7O0FBQ0FGLE1BQU1FLElBQU4sR0FBYSxVQUFDQyxPQUFEO0FBQ1hDLFFBQU1DLE1BQU4sQ0FBYUMsTUFBYixDQUFvQkgsT0FBcEI7O0FBQ0EsTUFBR04sT0FBT0MsUUFBUCxDQUFnQlMsTUFBaEIsQ0FBdUJDLE9BQTFCO0FBRUUsV0FEQVgsT0FBT1ksVUFBUCxDQUFrQjtBQUVoQixhQURBTCxNQUFNTSxVQUFOLEVBQ0E7QUFGRixPQUVFLElBRkYsQ0FDQTtBQUdEO0FBUFUsQ0FBYjs7QUFPQUMsU0FBU0MsY0FBVCxDQUF3QkMsSUFBeEIsR0FBK0IseUNBQS9COztBQUNBRixTQUFTQyxjQUFULENBQXdCRSxhQUF4QixDQUFzQ0MsT0FBdEMsR0FBZ0QsVUFBQ0MsSUFBRDtBQUs5QyxTQUpBQyxXQUFXQyxTQUFYLENBQXFCLHNCQUFyQixFQUE2QztBQUFBRixVQUFNQSxJQUFOO0FBQVlsQixjQUFVRCxPQUFPQztBQUE3QixHQUE3QyxFQUFvRnFCLElBQXBGLEVBSUE7QUFMOEMsQ0FBaEQ7O0FBRUFSLFNBQVNDLGNBQVQsQ0FBd0JFLGFBQXhCLENBQXNDTSxJQUF0QyxHQUE2QyxVQUFDSixJQUFELEVBQU9LLEdBQVAsSUFBN0M7O0FBQ0FWLFNBQVNDLGNBQVQsQ0FBd0JFLGFBQXhCLENBQXNDUSxJQUF0QyxHQUE2QyxVQUFDTixJQUFELEVBQU9LLEdBQVA7QUFXM0MsU0FWQUosV0FBV0MsU0FBWCxDQUFxQixtQkFBckIsRUFBMEM7QUFBQUYsVUFBTUEsSUFBTjtBQUFZSyxTQUFLQSxHQUFqQjtBQUFzQnZCLGNBQVVELE9BQU9DO0FBQXZDLEdBQTFDLEVBQTJGcUIsSUFBM0YsRUFVQTtBQVgyQyxDQUE3Qzs7QUFHQXRCLE9BQU8wQixPQUFQLENBQWU7QUFDYjFCLFNBQU8yQixLQUFQLENBQWFDLFlBQWIsQ0FBMEI7QUFBQ0MsbUJBQWU7QUFBaEIsR0FBMUIsRUFBOEM7QUFBQ0MsZ0JBQVk7QUFBYixHQUE5Qzs7QUFDQXZCLFFBQU13QixZQUFOOztBQUNBLE1BQUcvQixPQUFPQyxRQUFQLENBQWdCUyxNQUFoQixDQUF1QkMsT0FBMUI7QUFDRVgsV0FBT2dDLFdBQVAsQ0FBbUJ6QixNQUFNd0IsWUFBekIsRUFBdUMsR0FBdkM7QUFDQS9CLFdBQU9nQyxXQUFQLENBQW1CekIsTUFBTTBCLG1CQUF6QixFQUE4QyxHQUE5QztBQUNBakMsV0FBT2dDLFdBQVAsQ0FBbUJ6QixNQUFNMkIseUJBQXpCLEVBQW9ELEdBQXBEO0FBSEY7QUFLRWxDLFdBQU9nQyxXQUFQLENBQW1CekIsTUFBTTBCLG1CQUF6QixFQUE4QyxLQUFLLEVBQUwsR0FBVSxJQUF4RDtBQUNBakMsV0FBT2dDLFdBQVAsQ0FBbUJ6QixNQUFNMkIseUJBQXpCLEVBQW9ELEtBQUssRUFBTCxHQUFVLElBQTlEO0FBb0JEOztBQUNELFNBcEJBM0IsTUFBTTRCLGlCQUFOLENBQXdCQyxPQUF4QixFQW9CQTtBQTlCRixHLENBbEJBLHdFIiwiZmlsZSI6Ii9zZXJ2ZXIvc3RhcnR1cC5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJwcm9jZXNzLmVudi5NQUlMX1VSTCA9IE1ldGVvci5zZXR0aW5ncy5tYWlsVXJsXG4jc2hhcmUudHdpbGlvID0gaWYgTWV0ZW9yLnNldHRpbmdzLnR3aWxpby5zaWQgdGhlbiBUd2lsaW8oTWV0ZW9yLnNldHRpbmdzLnR3aWxpby5zaWQsIE1ldGVvci5zZXR0aW5ncy50d2lsaW8udG9rZW4pIGVsc2UgbnVsbFxuXG5FbWFpbC5zZW5kSW1tZWRpYXRlID0gRW1haWwuc2VuZFxuRW1haWwuc2VuZCA9IChvcHRpb25zKSAtPlxuICBzaGFyZS5FbWFpbHMuaW5zZXJ0KG9wdGlvbnMpXG4gIGlmIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuaXNEZWJ1Z1xuICAgIE1ldGVvci5zZXRUaW1lb3V0KC0+XG4gICAgICBzaGFyZS5zZW5kRW1haWxzKClcbiAgICAsIDEwMDApXG5cbkFjY291bnRzLmVtYWlsVGVtcGxhdGVzLmZyb20gPSBcIlBvc3RtYW4gKEZsb3dCQVQpIDxwb3N0bWFuQGZsb3diYXQuY29tPlwiXG5BY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5yZXNldFBhc3N3b3JkLnN1YmplY3QgPSAodXNlcikgLT5cbiAgSGFuZGxlYmFycy50ZW1wbGF0ZXNbXCJyZXNldFBhc3N3b3JkU3ViamVjdFwiXSh1c2VyOiB1c2VyLCBzZXR0aW5nczogTWV0ZW9yLnNldHRpbmdzKS50cmltKClcbkFjY291bnRzLmVtYWlsVGVtcGxhdGVzLnJlc2V0UGFzc3dvcmQudGV4dCA9ICh1c2VyLCB1cmwpIC0+XG5BY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5yZXNldFBhc3N3b3JkLmh0bWwgPSAodXNlciwgdXJsKSAtPlxuICBIYW5kbGViYXJzLnRlbXBsYXRlc1tcInJlc2V0UGFzc3dvcmRIdG1sXCJdKHVzZXI6IHVzZXIsIHVybDogdXJsLCBzZXR0aW5nczogTWV0ZW9yLnNldHRpbmdzKS50cmltKClcblxuTWV0ZW9yLnN0YXJ0dXAgLT5cbiAgTWV0ZW9yLnVzZXJzLl9lbnN1cmVJbmRleCh7ZnJpZW5kVXNlcklkczogMX0sIHtiYWNrZ3JvdW5kOiB0cnVlfSlcbiAgc2hhcmUubG9hZEZpeHR1cmVzKClcbiAgaWYgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5pc0RlYnVnXG4gICAgTWV0ZW9yLnNldEludGVydmFsKHNoYXJlLmxvYWRGaXh0dXJlcywgMzAwKVxuICAgIE1ldGVvci5zZXRJbnRlcnZhbChzaGFyZS5jbGVhbnVwUXVpY2tRdWVyaWVzLCA1MDApXG4gICAgTWV0ZW9yLnNldEludGVydmFsKHNoYXJlLmNsZWFudXBDYWNoZWRRdWVyeVJlc3VsdHMsIDUwMClcbiAgZWxzZVxuICAgIE1ldGVvci5zZXRJbnRlcnZhbChzaGFyZS5jbGVhbnVwUXVpY2tRdWVyaWVzLCA2MCAqIDYwICogMTAwMClcbiAgICBNZXRlb3Iuc2V0SW50ZXJ2YWwoc2hhcmUuY2xlYW51cENhY2hlZFF1ZXJ5UmVzdWx0cywgNjAgKiA2MCAqIDEwMDApXG4gIHNoYXJlLnBlcmlvZGljRXhlY3V0aW9uLmV4ZWN1dGUoKVxuIyAgICBBcG0uY29ubmVjdChNZXRlb3Iuc2V0dGluZ3MuYXBtLmFwcElkLCBNZXRlb3Iuc2V0dGluZ3MuYXBtLnNlY3JldClcbiJdfQ==
