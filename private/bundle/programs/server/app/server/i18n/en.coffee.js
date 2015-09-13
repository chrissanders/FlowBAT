(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
i18n.addResourceBundle("en", {
  name: "English",
  dateFormat: "MMMM D, YYYY, h:mm A",
  messages: {
    resetPassword: {
      subject: 'Reset your password on flowbat.com',
      html: '<div>Hey {{user.profile.name}},</div> <div style="margin: 7px 0 0 0;">To reset your password, simply click the link below. Thanks.</div> <div style="margin: 7px 0 0 0;"><a href="{{url}}">{{url}}</a></div>'
    },
    newUser: {
      subject: 'You have been registered on flowbat.com',
      html: '<div>Hey {{user.profile.name}},</div> <div style="margin: 7px 0 0 0;">You have been registered on <a href="{{settings.baseUrl}}">flowbat.com</a></div> <div style="margin: 7px 0 0 0;">Your login: {{email}}</div> <div style="margin: 7px 0 0 0;">Your password: {{password}}</div>'
    },
    postman: "Postman"
  }
});

})();

//# sourceMappingURL=en.coffee.js.map
