(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var getInitials, userPreSave;

getInitials = function(name) {
  var firstLetters, firstWords;
  firstWords = _.first(name.replace(/\s+/g, " ").trim().split(" "), 2);
  if (firstWords.length < 2) {
    firstLetters = firstWords[0].substring(0, 2);
  } else {
    firstLetters = _.map(firstWords || [], function(word) {
      return word.charAt(0);
    }).join("");
  }
  return firstLetters.toUpperCase();
};

userPreSave = function(userId, changes) {
  var _ref;
  if ((_ref = changes.profile) != null ? _ref.name : void 0) {
    changes.profile.initials = getInitials(changes.profile.name);
  }
  if (changes["profile.name"]) {
    return changes["profile.initials"] = getInitials(changes["profile.name"]);
  }
};

Meteor.users.before.insert(function(userId, user) {
  _.defaults(user, {
    isNew: true,
    isInvitation: false,
    invitations: []
  });
  _.defaults(user.profile, {
    numRecs: 10,
    dashboardQueryIds: [],
    isRealName: false
  });
  return userPreSave.call(this, userId, user);
});

Meteor.users.before.update(function(userId, user, fieldNames, modifier, options) {
  return userPreSave.call(this, userId, modifier.$set || {});
});

})();

//# sourceMappingURL=users.defaults.coffee.js.map
