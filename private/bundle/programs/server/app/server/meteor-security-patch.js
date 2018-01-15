(function(){(function () {
  // Remove this code after updating to Meteor 1.0.1.
  var c = typeof Mongo === "undefined" ?
        Meteor.Collection : Mongo.Collection;
  var proto = c.prototype;
  var orig = proto._validatedUpdate;
  proto._validatedUpdate = function (userId, selector, mutator) {
    check(mutator, Object);
    if (_.isEmpty(mutator)) {
      throw new Meteor.Error(403, "Access denied.");
    }
    return orig.apply(this, arguments);
  };
})();

}).call(this);
