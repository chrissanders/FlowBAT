(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Match.App = {
  Id: Match.Where(function(value) {
    check(value, String);
    if (__indexOf.call(share.fixtureIds, value) >= 0) {
      return true;
    }
    if (value.length !== 17 || _.difference(value.split(""), ["2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]).length) {
      throw new Match.Error("Value \"" + value + "\" is not a valid ID");
    }
    return true;
  }),
  UserId: Match.Where(function(value) {
    check(value, Match.App.Id);
    if (!Meteor.users.findOne(value)) {
      throw new Match.Error("User with ID \"" + value + "\" doesn't exist");
    }
    return true;
  }),
  QueryId: Match.Where(function(value) {
    check(value, Match.App.Id);
    if (!share.Queries.findOne(value)) {
      throw new Match.Error("Query with ID \"" + value + "\" doesn't exist");
    }
    return true;
  }),
  IPSetId: Match.Where(function(value) {
    check(value, Match.App.Id);
    if (!share.IPSets.findOne(value)) {
      throw new Match.Error("IP Set with ID \"" + value + "\" doesn't exist");
    }
    return true;
  }),
  TupleId: Match.Where(function(value) {
    check(value, Match.App.Id);
    if (!share.Tuples.findOne(value)) {
      throw new Match.Error("Tuple file with ID \"" + value + "\" doesn't exist");
    }
    return true;
  }),
  isNewUpdate: function(oldValue) {
    return Match.Where(function(value) {
      check(value, Boolean);
      if (value && !oldValue) {
        throw new Match.Error("isNew update can't be true from false");
      }
      return true;
    });
  },
  InArray: function(possibleValues) {
    return Match.Where(function(value) {
      if (possibleValues.indexOf(value) === -1) {
        throw new Match.Error("Expected one of \"" + possibleValues.join("\", \"") + "\"; got \"" + value + "\"");
      }
      return true;
    });
  },
  UnsignedNumber: Match.Where(function(value) {
    check(value, Number);
    if (value < 0) {
      throw new Match.Error("Must be unsigned number");
    }
    return true;
  }),
  Email: Match.Where(function(value) {
    return value.match(share.emailRegex);
  })
};

_.extend(Match.App, {
  ExternalSource: Match.App.InArray(["trello"])
});

})();

//# sourceMappingURL=matches.coffee.js.map
