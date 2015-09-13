(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.securityRulesWrapper = function(func) {
  return function() {
    var exception, user;
    user = Meteor.user();
    if (user) {
      root.i18n.setLng(user.profile.locale);
      moment.lang(user.profile.locale);
    }
    try {
      return func.apply(this, arguments);
    } catch (_error) {
      exception = _error;
      Meteor._debug(exception);
      Meteor._debug(arguments);
      throw exception;
    }
  };
};

})();

//# sourceMappingURL=securityRulesWrapper.coffee.js.map
