(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/tuples.hooks.coffee                                          //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.Tuples.before.update(function (userId, tuple, fieldNames, modifier, options) {
  if (_.intersection(fieldNames, ["contents"]).length) {               // 2
    modifier.$set = modifier.$set || {};                               // 3
    return modifier.$set.isOutputStale = true;                         // 4
  }                                                                    // 5
});                                                                    // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/tuples.hooks.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL3R1cGxlcy5ob29rcy5jb2ZmZWUiXSwibmFtZXMiOlsic2hhcmUiLCJUdXBsZXMiLCJiZWZvcmUiLCJ1cGRhdGUiLCJ1c2VySWQiLCJ0dXBsZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCJfIiwiaW50ZXJzZWN0aW9uIiwibGVuZ3RoIiwiJHNldCIsImlzT3V0cHV0U3RhbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxNQUFNQyxNQUFOLENBQWFDLE1BQWIsQ0FBb0JDLE1BQXBCLENBQTJCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFnQkMsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUN6QixNQUFHQyxFQUFFQyxZQUFGLENBQWVKLFVBQWYsRUFBMkIsQ0FBQyxVQUFELENBQTNCLEVBQXlDSyxNQUE1QztBQUNFSixhQUFTSyxJQUFULEdBQWdCTCxTQUFTSyxJQUFULElBQWlCLEVBQWpDO0FBQ0EsV0FBQUwsU0FBU0ssSUFBVCxDQUFjQyxhQUFkLEdBQThCLElBQTlCO0FBQ0Q7QUFKSCwyRSIsImZpbGUiOiIvY29tbW9uL3R1cGxlcy5ob29rcy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5UdXBsZXMuYmVmb3JlLnVwZGF0ZSAodXNlcklkLCB0dXBsZSwgZmllbGROYW1lcywgbW9kaWZpZXIsIG9wdGlvbnMpIC0+XG4gIGlmIF8uaW50ZXJzZWN0aW9uKGZpZWxkTmFtZXMsIFtcImNvbnRlbnRzXCJdKS5sZW5ndGhcbiAgICBtb2RpZmllci4kc2V0ID0gbW9kaWZpZXIuJHNldCBvciB7fVxuICAgIG1vZGlmaWVyLiRzZXQuaXNPdXRwdXRTdGFsZSA9IHRydWVcbiJdfQ==
