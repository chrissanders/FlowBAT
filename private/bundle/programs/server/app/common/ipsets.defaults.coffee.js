(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var ipsetPreSave;

ipsetPreSave = function(userId, changes) {};

share.IPSets.before.insert(function(userId, ipset) {
  var count, now, prefix;
  ipset._id = ipset._id || Random.id();
  now = new Date();
  _.defaults(ipset, {
    name: "",
    note: "",
    contents: "",
    isOutputStale: true,
    isNew: true,
    ownerId: userId,
    updatedAt: now,
    createdAt: now
  });
  if (!ipset.name) {
    prefix = "New IP Set";
    count = share.IPSets.find({
      name: {
        $regex: "^" + prefix,
        $options: "i"
      }
    }).count();
    ipset.name = prefix;
    if (count) {
      ipset.name += " (" + count + ")";
    }
  }
  return ipsetPreSave.call(this, userId, ipset);
});

share.IPSets.before.update(function(userId, ipset, fieldNames, modifier, options) {
  var now;
  now = new Date();
  modifier.$set = modifier.$set || {};
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;
  return ipsetPreSave.call(this, userId, modifier.$set);
});

})();

//# sourceMappingURL=ipsets.defaults.coffee.js.map
