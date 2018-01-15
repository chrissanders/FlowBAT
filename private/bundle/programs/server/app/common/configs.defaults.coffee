(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/configs.defaults.coffee                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var configPreSave;                                                     // 1
                                                                       //
configPreSave = function (userId, changes) {};                         // 1
                                                                       //
share.Configs.before.update(function (userId, config, fieldNames, modifier, options) {
  var now;                                                             // 4
  now = new Date();                                                    // 4
  modifier.$set = modifier.$set || {};                                 // 5
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;            // 6
  return configPreSave.call(this, userId, modifier.$set);              // 10
});                                                                    // 3
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/configs.defaults.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL2NvbmZpZ3MuZGVmYXVsdHMuY29mZmVlIl0sIm5hbWVzIjpbImNvbmZpZ1ByZVNhdmUiLCJ1c2VySWQiLCJjaGFuZ2VzIiwic2hhcmUiLCJDb25maWdzIiwiYmVmb3JlIiwidXBkYXRlIiwiY29uZmlnIiwiZmllbGROYW1lcyIsIm1vZGlmaWVyIiwib3B0aW9ucyIsIm5vdyIsIkRhdGUiLCIkc2V0IiwidXBkYXRlZEF0IiwiY2FsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsSUFBQUEsYUFBQTs7QUFBQUEsZ0JBQWdCLFVBQUNDLE1BQUQsRUFBU0MsT0FBVCxJQUFoQjs7QUFFQUMsTUFBTUMsT0FBTixDQUFjQyxNQUFkLENBQXFCQyxNQUFyQixDQUE0QixVQUFDTCxNQUFELEVBQVNNLE1BQVQsRUFBaUJDLFVBQWpCLEVBQTZCQyxRQUE3QixFQUF1Q0MsT0FBdkM7QUFDMUIsTUFBQUMsR0FBQTtBQUFBQSxRQUFNLElBQUlDLElBQUosRUFBTjtBQUNBSCxXQUFTSSxJQUFULEdBQWdCSixTQUFTSSxJQUFULElBQWlCLEVBQWpDO0FBQ0FKLFdBQVNJLElBQVQsQ0FBY0MsU0FBZCxHQUEwQkwsU0FBU0ksSUFBVCxDQUFjQyxTQUFkLElBQTJCSCxHQUFyRDtBQUlBLFNBSEFYLGNBQWNlLElBQWQsQ0FBbUIsSUFBbkIsRUFBc0JkLE1BQXRCLEVBQThCUSxTQUFTSSxJQUF2QyxDQUdBO0FBUEYsMkUiLCJmaWxlIjoiL2NvbW1vbi9jb25maWdzLmRlZmF1bHRzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbImNvbmZpZ1ByZVNhdmUgPSAodXNlcklkLCBjaGFuZ2VzKSAtPlxuXG5zaGFyZS5Db25maWdzLmJlZm9yZS51cGRhdGUgKHVzZXJJZCwgY29uZmlnLCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgbm93ID0gbmV3IERhdGUoKVxuICBtb2RpZmllci4kc2V0ID0gbW9kaWZpZXIuJHNldCBvciB7fVxuICBtb2RpZmllci4kc2V0LnVwZGF0ZWRBdCA9IG1vZGlmaWVyLiRzZXQudXBkYXRlZEF0IG9yIG5vd1xuICBjb25maWdQcmVTYXZlLmNhbGwoQCwgdXNlcklkLCBtb2RpZmllci4kc2V0KVxuIl19
