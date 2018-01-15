(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/queries.hooks.coffee                                         //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var indexOf = [].indexOf;                                              // 1
share.Queries.before.update(function (userId, query, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, ["output", "presentation", "startRecNum", "sortField", "sortReverse", "fields", "fieldsOrder"]).length) {
    modifier.$set = modifier.$set || {};                               // 3
    modifier.$set.isOutputStale = true;                                // 4
  }                                                                    // 7
                                                                       //
  if (_.intersection(fieldNames, ["interface", "output", "presentation"]).length) {
    modifier.$set = modifier.$set || {};                               // 6
    return _.extend(modifier.$set, share.queryBlankValues);            // 10
  }                                                                    // 11
});                                                                    // 1
share.Queries.after.update(function (userId, query, fieldNames, modifier, options) {
  var availableChartTypes, ref, transformedQuery;                      // 10
                                                                       //
  if (_.intersection(fieldNames, ["output"]).length) {                 // 10
    transformedQuery = share.Transformations.query(query);             // 11
    availableChartTypes = transformedQuery.availableChartTypes();      // 12
                                                                       //
    if (ref = query.chartType, indexOf.call(availableChartTypes, ref) < 0) {
      return share.Queries.update(query._id, {                         // 20
        $set: {                                                        // 14
          chartType: availableChartTypes[0] || ""                      // 14
        }                                                              // 14
      });                                                              // 14
    }                                                                  // 10
  }                                                                    // 26
});                                                                    // 9
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/queries.hooks.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL3F1ZXJpZXMuaG9va3MuY29mZmVlIl0sIm5hbWVzIjpbImluZGV4T2YiLCJzaGFyZSIsIlF1ZXJpZXMiLCJiZWZvcmUiLCJ1cGRhdGUiLCJ1c2VySWQiLCJxdWVyeSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCJfIiwiaW50ZXJzZWN0aW9uIiwibGVuZ3RoIiwiJHNldCIsImlzT3V0cHV0U3RhbGUiLCJleHRlbmQiLCJxdWVyeUJsYW5rVmFsdWVzIiwiYWZ0ZXIiLCJhdmFpbGFibGVDaGFydFR5cGVzIiwicmVmIiwidHJhbnNmb3JtZWRRdWVyeSIsIlRyYW5zZm9ybWF0aW9ucyIsImNoYXJ0VHlwZSIsImNhbGwiLCJfaWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLElBQUFBLFVBQUEsR0FBQUEsT0FBQTtBQUFBQyxNQUFNQyxPQUFOLENBQWNDLE1BQWQsQ0FBcUJDLE1BQXJCLENBQTRCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFnQkMsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUMxQixNQUFHQyxFQUFFQyxZQUFGLENBQWVKLFVBQWYsRUFBMkIsQ0FBQyxRQUFELEVBQVcsY0FBWCxFQUEyQixhQUEzQixFQUEwQyxXQUExQyxFQUF1RCxhQUF2RCxFQUFzRSxRQUF0RSxFQUFnRixhQUFoRixDQUEzQixFQUEySEssTUFBOUg7QUFDRUosYUFBU0ssSUFBVCxHQUFnQkwsU0FBU0ssSUFBVCxJQUFpQixFQUFqQztBQUNBTCxhQUFTSyxJQUFULENBQWNDLGFBQWQsR0FBOEIsSUFBOUI7QUFHRDs7QUFGRCxNQUFHSixFQUFFQyxZQUFGLENBQWVKLFVBQWYsRUFBMkIsQ0FBQyxXQUFELEVBQWMsUUFBZCxFQUF3QixjQUF4QixDQUEzQixFQUFvRUssTUFBdkU7QUFDRUosYUFBU0ssSUFBVCxHQUFnQkwsU0FBU0ssSUFBVCxJQUFpQixFQUFqQztBQUlBLFdBSEFILEVBQUVLLE1BQUYsQ0FBU1AsU0FBU0ssSUFBbEIsRUFBd0JaLE1BQU1lLGdCQUE5QixDQUdBO0FBQ0Q7QUFWSDtBQVFBZixNQUFNQyxPQUFOLENBQWNlLEtBQWQsQ0FBb0JiLE1BQXBCLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFnQkMsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUN6QixNQUFBUyxtQkFBQSxFQUFBQyxHQUFBLEVBQUFDLGdCQUFBOztBQUFBLE1BQUdWLEVBQUVDLFlBQUYsQ0FBZUosVUFBZixFQUEyQixDQUFDLFFBQUQsQ0FBM0IsRUFBdUNLLE1BQTFDO0FBQ0VRLHVCQUFtQm5CLE1BQU1vQixlQUFOLENBQXNCZixLQUF0QixDQUE0QkEsS0FBNUIsQ0FBbkI7QUFDQVksMEJBQXNCRSxpQkFBaUJGLG1CQUFqQixFQUF0Qjs7QUFDQSxRQUFBQyxNQUFHYixNQUFNZ0IsU0FBVCxFQUFHdEIsUUFBQXVCLElBQUEsQ0FBdUJMLG1CQUF2QixFQUFBQyxHQUFBLEtBQUg7QUFPRSxhQU5BbEIsTUFBTUMsT0FBTixDQUFjRSxNQUFkLENBQXFCRSxNQUFNa0IsR0FBM0IsRUFBZ0M7QUFBQ1gsY0FBTTtBQUFDUyxxQkFBV0osb0JBQW9CLENBQXBCLEtBQTBCO0FBQXRDO0FBQVAsT0FBaEMsQ0FNQTtBQVZKO0FBZ0JDO0FBakJILDJFIiwiZmlsZSI6Ii9jb21tb24vcXVlcmllcy5ob29rcy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5RdWVyaWVzLmJlZm9yZS51cGRhdGUgKHVzZXJJZCwgcXVlcnksIGZpZWxkTmFtZXMsIG1vZGlmaWVyLCBvcHRpb25zKSAtPlxuICBpZiBfLmludGVyc2VjdGlvbihmaWVsZE5hbWVzLCBbXCJvdXRwdXRcIiwgXCJwcmVzZW50YXRpb25cIiwgXCJzdGFydFJlY051bVwiLCBcInNvcnRGaWVsZFwiLCBcInNvcnRSZXZlcnNlXCIsIFwiZmllbGRzXCIsIFwiZmllbGRzT3JkZXJcIl0pLmxlbmd0aFxuICAgIG1vZGlmaWVyLiRzZXQgPSBtb2RpZmllci4kc2V0IG9yIHt9XG4gICAgbW9kaWZpZXIuJHNldC5pc091dHB1dFN0YWxlID0gdHJ1ZVxuICBpZiBfLmludGVyc2VjdGlvbihmaWVsZE5hbWVzLCBbXCJpbnRlcmZhY2VcIiwgXCJvdXRwdXRcIiwgXCJwcmVzZW50YXRpb25cIl0pLmxlbmd0aFxuICAgIG1vZGlmaWVyLiRzZXQgPSBtb2RpZmllci4kc2V0IG9yIHt9XG4gICAgXy5leHRlbmQobW9kaWZpZXIuJHNldCwgc2hhcmUucXVlcnlCbGFua1ZhbHVlcylcblxuc2hhcmUuUXVlcmllcy5hZnRlci51cGRhdGUgKHVzZXJJZCwgcXVlcnksIGZpZWxkTmFtZXMsIG1vZGlmaWVyLCBvcHRpb25zKSAtPlxuICBpZiBfLmludGVyc2VjdGlvbihmaWVsZE5hbWVzLCBbXCJvdXRwdXRcIl0pLmxlbmd0aFxuICAgIHRyYW5zZm9ybWVkUXVlcnkgPSBzaGFyZS5UcmFuc2Zvcm1hdGlvbnMucXVlcnkocXVlcnkpXG4gICAgYXZhaWxhYmxlQ2hhcnRUeXBlcyA9IHRyYW5zZm9ybWVkUXVlcnkuYXZhaWxhYmxlQ2hhcnRUeXBlcygpXG4gICAgaWYgcXVlcnkuY2hhcnRUeXBlIG5vdCBpbiBhdmFpbGFibGVDaGFydFR5cGVzXG4gICAgICBzaGFyZS5RdWVyaWVzLnVwZGF0ZShxdWVyeS5faWQsIHskc2V0OiB7Y2hhcnRUeXBlOiBhdmFpbGFibGVDaGFydFR5cGVzWzBdIG9yIFwiXCJ9fSlcbiJdfQ==
