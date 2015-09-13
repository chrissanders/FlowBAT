(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var tuplePreSave;

tuplePreSave = function(userId, changes) {};

share.Tuples.before.insert(function(userId, tuple) {
  var count, now, prefix;
  tuple._id = tuple._id || Random.id();
  now = new Date();
  _.defaults(tuple, {
    name: "",
    note: "",
    contents: "",
    isOutputStale: true,
    isNew: true,
    ownerId: userId,
    updatedAt: now,
    createdAt: now
  });
  if (!tuple.name) {
    prefix = "New Tuple File";
    count = share.Tuples.find({
      name: {
        $regex: "^" + prefix,
        $options: "i"
      }
    }).count();
    tuple.name = prefix;
    if (count) {
      tuple.name += " (" + count + ")";
    }
  }
  return tuplePreSave.call(this, userId, tuple);
});

share.Tuples.before.update(function(userId, tuple, fieldNames, modifier, options) {
  var now;
  now = new Date();
  modifier.$set = modifier.$set || {};
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;
  return tuplePreSave.call(this, userId, modifier.$set);
});

})();

//# sourceMappingURL=tuples.defaults.coffee.js.map
