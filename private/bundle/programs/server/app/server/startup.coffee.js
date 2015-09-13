(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
process.env.MAIL_URL = Meteor.settings.mailUrl;

Email.sendImmediate = Email.send;

Email.send = function(options) {
  share.Emails.insert(options);
  if (Meteor.settings["public"].isDebug) {
    return Meteor.setTimeout(function() {
      return share.sendEmails();
    }, 1000);
  }
};

Accounts.emailTemplates.from = "Postman (FlowBAT) <postman@flowbat.com>";

Accounts.emailTemplates.resetPassword.subject = function(user) {
  return Handlebars.templates["resetPasswordSubject"]({
    user: user,
    settings: Meteor.settings
  }).trim();
};

Accounts.emailTemplates.resetPassword.text = function(user, url) {};

Accounts.emailTemplates.resetPassword.html = function(user, url) {
  return Handlebars.templates["resetPasswordHtml"]({
    user: user,
    url: url,
    settings: Meteor.settings
  }).trim();
};

Meteor.startup(function() {
  Meteor.users._ensureIndex({
    friendUserIds: 1
  }, {
    background: true
  });
  share.loadFixtures();
  if (Meteor.settings["public"].isDebug) {
    Meteor.setInterval(share.loadFixtures, 300);
    Meteor.setInterval(share.cleanupQuickQueries, 500);
    Meteor.setInterval(share.cleanupCachedQueryResults, 500);
  } else {
    Meteor.setInterval(share.cleanupQuickQueries, 60 * 60 * 1000);
    Meteor.setInterval(share.cleanupCachedQueryResults, 60 * 60 * 1000);
  }
  return share.periodicExecution.execute();
});

})();

//# sourceMappingURL=startup.coffee.js.map
