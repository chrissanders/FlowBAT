(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.getMailDomail = function() {
  var matches;
  if (process.env.MAIL_URL) {
    matches = process.env.MAIL_URL.match(/\/\/(.+)%40(.+):(.+)@(.+):(\d+)/);
    return matches[2];
  }
  return "";
};

Meteor.methods({
  setPassword: function(userId, password) {
    check(userId, String);
    check(password, String);
    if (!(userId === this.userId || share.Security.hasRole(this.userId, "admin"))) {
      Meteor._debug("Setting password is not allowed for non admins");
      return;
    }
    return Accounts.setPassword(userId, password);
  },
  addNewUser: function(newUser) {
    var config, user, userId;
    check(newUser, {
      email: Match.App.Email,
      name: String,
      password: String,
      group: Match.App.InArray(share.Security.groups())
    });
    newUser.email = newUser.email.toLowerCase();
    if (this.userId) {
      if (!share.Security.hasRole(this.userId, "admin")) {
        Meteor._debug("Creating users is not allowed for non admins");
        return;
      }
    } else {
      config = share.Configs.findOne();
      if (config.isSetupComplete) {
        Meteor._debug("Creating users is not allowed for non admins");
        return;
      } else {
        newUser.group = "admin";
      }
    }
    userId = Accounts.createUser({
      email: newUser.email,
      password: newUser.password,
      profile: {
        name: newUser.name
      }
    });
    Meteor.users.update(userId, {
      $set: {
        group: newUser.group
      }
    });
    user = Meteor.users.findOne(userId);
    Email.send({
      from: '"' + root.i18n.t("messages.postman") + ' (FlowBAT)" <herald@' + share.getMailDomail() + '>',
      to: newUser.email,
      subject: Handlebars.templates["newUserSubject"]({
        user: user,
        settings: Meteor.settings
      }).trim(),
      html: Handlebars.templates["newUserHtml"]({
        user: user,
        email: newUser.email,
        password: newUser.password,
        settings: Meteor.settings
      }).trim()
    });
    return userId;
  }
});

})();

//# sourceMappingURL=methods.coffee.js.map
