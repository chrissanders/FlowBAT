(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var emailIntervalId, setIntervals;

share.sendEmails = function() {
  if (share.sendEmailsRunning) {
    Meteor._debug("Send email already running; skipping");
    return;
  }
  share.sendEmailsRunning = true;
  try {
    return share.Emails.find().forEach(function(email) {
      if (!email.to.match(/@flowbat.com$/)) {
        Email.sendImmediate(email);
      }
      return share.Emails.remove(email._id);
    });
  } finally {
    share.sendEmailsRunning = false;
  }
};

emailIntervalId = null;

setIntervals = function() {
  var seconds;
  seconds = Meteor.settings["public"].isDebug ? 5 : 60;
  return emailIntervalId = Meteor.setInterval(share.sendEmails, seconds * 1000);
};

Meteor.startup(function() {
  if (Meteor.settings["public"].isDebug) {

  } else {
    return setIntervals();
  }
});

})();

//# sourceMappingURL=cron.coffee.js.map
