(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/cron.coffee                                                  //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var emailIntervalId, setIntervals;                                     // 1
                                                                       //
share.sendEmails = function () {                                       // 1
  if (share.sendEmailsRunning) {                                       // 2
    Meteor._debug("Send email already running; skipping");             // 3
                                                                       //
    return;                                                            // 4
  }                                                                    // 7
                                                                       //
  share.sendEmailsRunning = true;                                      // 5
                                                                       //
  try {                                                                // 6
    return share.Emails.find().forEach(function (email) {              // 10
      if (!email.to.match(/@flowbat.com$/)) {                          // 8
        //        if Meteor.settings.public.isDebug then Meteor._debug('Sending "'+email.subject+'" to "'+email.to+'"')
        Email.sendImmediate(email);                                    // 10
      }                                                                // 14
                                                                       //
      return share.Emails.remove(email._id);                           // 15
    });                                                                // 7
  } finally {                                                          // 6
    share.sendEmailsRunning = false;                                   // 13
  }                                                                    // 19
};                                                                     // 1
                                                                       //
emailIntervalId = null;                                                // 15
                                                                       //
setIntervals = function () {                                           // 16
  var seconds;                                                         // 17
  seconds = Meteor.settings.public.isDebug ? 5 : 60;                   // 17
  return emailIntervalId = Meteor.setInterval(share.sendEmails, seconds * 1000);
};                                                                     // 16
                                                                       //
Meteor.startup(function () {                                           // 20
  if (Meteor.settings.public.isDebug) {} else {                        // 21
    //    setIntervals()                                               // 34
    return setIntervals();                                             // 35
  }                                                                    // 36
});                                                                    // 20
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/cron.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2Nyb24uY29mZmVlIl0sIm5hbWVzIjpbImVtYWlsSW50ZXJ2YWxJZCIsInNldEludGVydmFscyIsInNoYXJlIiwic2VuZEVtYWlscyIsInNlbmRFbWFpbHNSdW5uaW5nIiwiTWV0ZW9yIiwiX2RlYnVnIiwiRW1haWxzIiwiZmluZCIsImZvckVhY2giLCJlbWFpbCIsInRvIiwibWF0Y2giLCJFbWFpbCIsInNlbmRJbW1lZGlhdGUiLCJyZW1vdmUiLCJfaWQiLCJzZWNvbmRzIiwic2V0dGluZ3MiLCJwdWJsaWMiLCJpc0RlYnVnIiwic2V0SW50ZXJ2YWwiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxlQUFBLEVBQUFDLFlBQUE7O0FBQUFDLE1BQU1DLFVBQU4sR0FBbUI7QUFDakIsTUFBR0QsTUFBTUUsaUJBQVQ7QUFDRUMsV0FBT0MsTUFBUCxDQUFjLHNDQUFkOztBQUNBO0FBR0Q7O0FBRkRKLFFBQU1FLGlCQUFOLEdBQTBCLElBQTFCOztBQUNBO0FBSUUsV0FIQUYsTUFBTUssTUFBTixDQUFhQyxJQUFiLEdBQW9CQyxPQUFwQixDQUE0QixVQUFDQyxLQUFEO0FBQzFCLFVBQUcsQ0FBQ0EsTUFBTUMsRUFBTixDQUFTQyxLQUFULENBQWUsZUFBZixDQUFKO0FBSUU7QUFGQUMsY0FBTUMsYUFBTixDQUFvQkosS0FBcEI7QUFJRDs7QUFDRCxhQUpBUixNQUFNSyxNQUFOLENBQWFRLE1BQWIsQ0FBb0JMLE1BQU1NLEdBQTFCLENBSUE7QUFSRixNQUdBO0FBSkY7QUFPRWQsVUFBTUUsaUJBQU4sR0FBMEIsS0FBMUI7QUFNRDtBQWxCZ0IsQ0FBbkI7O0FBY0FKLGtCQUFrQixJQUFsQjs7QUFDQUMsZUFBZTtBQUNiLE1BQUFnQixPQUFBO0FBQUFBLFlBQWFaLE9BQU9hLFFBQVAsQ0FBZ0JDLE1BQWhCLENBQXVCQyxPQUF2QixHQUFvQyxDQUFwQyxHQUEyQyxFQUF4RDtBQVVBLFNBVEFwQixrQkFBa0JLLE9BQU9nQixXQUFQLENBQW1CbkIsTUFBTUMsVUFBekIsRUFBcUNjLFVBQVUsSUFBL0MsQ0FTbEI7QUFYYSxDQUFmOztBQUlBWixPQUFPaUIsT0FBUCxDQUFlO0FBQ2IsTUFBR2pCLE9BQU9hLFFBQVAsQ0FBZ0JDLE1BQWhCLENBQXVCQyxPQUExQjtBQWFFO0FBQ0EsV0FYQW5CLGNBV0E7QUFDRDtBQWhCSCw0RSIsImZpbGUiOiIvc2VydmVyL2Nyb24uY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsic2hhcmUuc2VuZEVtYWlscyA9IC0+XG4gIGlmIHNoYXJlLnNlbmRFbWFpbHNSdW5uaW5nXG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIlNlbmQgZW1haWwgYWxyZWFkeSBydW5uaW5nOyBza2lwcGluZ1wiKVxuICAgIHJldHVyblxuICBzaGFyZS5zZW5kRW1haWxzUnVubmluZyA9IHRydWVcbiAgdHJ5XG4gICAgc2hhcmUuRW1haWxzLmZpbmQoKS5mb3JFYWNoIChlbWFpbCkgLT5cbiAgICAgIGlmICFlbWFpbC50by5tYXRjaCgvQGZsb3diYXQuY29tJC8pXG4jICAgICAgICBpZiBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmlzRGVidWcgdGhlbiBNZXRlb3IuX2RlYnVnKCdTZW5kaW5nIFwiJytlbWFpbC5zdWJqZWN0KydcIiB0byBcIicrZW1haWwudG8rJ1wiJylcbiAgICAgICAgRW1haWwuc2VuZEltbWVkaWF0ZShlbWFpbClcbiAgICAgIHNoYXJlLkVtYWlscy5yZW1vdmUoZW1haWwuX2lkKVxuICBmaW5hbGx5XG4gICAgc2hhcmUuc2VuZEVtYWlsc1J1bm5pbmcgPSBmYWxzZVxuXG5lbWFpbEludGVydmFsSWQgPSBudWxsXG5zZXRJbnRlcnZhbHMgPSAtPlxuICBzZWNvbmRzID0gaWYgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5pc0RlYnVnIHRoZW4gNSBlbHNlIDYwXG4gIGVtYWlsSW50ZXJ2YWxJZCA9IE1ldGVvci5zZXRJbnRlcnZhbChzaGFyZS5zZW5kRW1haWxzLCBzZWNvbmRzICogMTAwMClcblxuTWV0ZW9yLnN0YXJ0dXAgLT5cbiAgaWYgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5pc0RlYnVnXG4jICAgIHNldEludGVydmFscygpXG4gIGVsc2VcbiAgICBzZXRJbnRlcnZhbHMoKVxuXG4iXX0=
