(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

share.Queries.before.update(function(userId, query, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, ["output", "presentation", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length) {
    modifier.$set = modifier.$set || {};
    modifier.$set.isOutputStale = true;
  }
  if (_.intersection(fieldNames, ["interface", "output", "presentation"]).length) {
    modifier.$set = modifier.$set || {};
    return _.extend(modifier.$set, share.queryBlankValues);
  }
});

share.Queries.after.update(function(userId, query, fieldNames, modifier, options) {
  var availableChartTypes, transformedQuery, _ref;
  if (_.intersection(fieldNames, ["output"]).length) {
    transformedQuery = share.Transformations.query(query);
    availableChartTypes = transformedQuery.availableChartTypes();
    if (_ref = query.chartType, __indexOf.call(availableChartTypes, _ref) < 0) {
      return share.Queries.update(query._id, {
        $set: {
          chartType: availableChartTypes[0] || ""
        }
      });
    }
  }
});

})();

//# sourceMappingURL=queries.hooks.coffee.js.map
