(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

share.Security = {
  effectiveRoles: {
    admin: ["admin", "analyst"],
    analyst: ["analyst"]
  },
  groups: function() {
    return Object.keys(this.effectiveRoles);
  },
  currentUserHasRole: function(role) {
    return share.Security.hasRole(Meteor.userId(), role);
  },
  userIdCanChangeUserGroupOrRemove: function(userId, user) {
    return userId !== user._id && this.hasRole(userId, "admin");
  },
  hasRole: function(userId, role) {
    var user;
    user = Meteor.users.findOne(userId);
    if (user) {
      if (__indexOf.call(share.Security.effectiveRoles[user.group], role) >= 0) {
        return true;
      }
    }
    return false;
  }
};

})();

//# sourceMappingURL=security.coffee.js.map
