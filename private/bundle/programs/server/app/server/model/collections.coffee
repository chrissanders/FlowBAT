(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/model/collections.coffee                                     //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
// Don't use transforms, they break validation ("Expected plain object", but transforms give an extended object)
share.Emails = new Meteor.Collection("emails");                        // 3
share.Queries = new Meteor.Collection("queries");                      // 4
share.IPSets = new Meteor.Collection("ipsets");                        // 5
share.Tuples = new Meteor.Collection("tuples");                        // 6
share.Configs = new Meteor.Collection("configs");                      // 7
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/model/collections.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21vZGVsL2NvbGxlY3Rpb25zLmNvZmZlZSJdLCJuYW1lcyI6WyJzaGFyZSIsIkVtYWlscyIsIk1ldGVvciIsIkNvbGxlY3Rpb24iLCJRdWVyaWVzIiwiSVBTZXRzIiwiVHVwbGVzIiwiQ29uZmlncyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7QUFFQUEsTUFBTUMsTUFBTixHQUFlLElBQUlDLE9BQU9DLFVBQVgsQ0FBc0IsUUFBdEIsQ0FBZjtBQUNBSCxNQUFNSSxPQUFOLEdBQWdCLElBQUlGLE9BQU9DLFVBQVgsQ0FBc0IsU0FBdEIsQ0FBaEI7QUFDQUgsTUFBTUssTUFBTixHQUFlLElBQUlILE9BQU9DLFVBQVgsQ0FBc0IsUUFBdEIsQ0FBZjtBQUNBSCxNQUFNTSxNQUFOLEdBQWUsSUFBSUosT0FBT0MsVUFBWCxDQUFzQixRQUF0QixDQUFmO0FBQ0FILE1BQU1PLE9BQU4sR0FBZ0IsSUFBSUwsT0FBT0MsVUFBWCxDQUFzQixTQUF0QixDQUFoQiwyQiIsImZpbGUiOiIvc2VydmVyL21vZGVsL2NvbGxlY3Rpb25zLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbIiMgRG9uJ3QgdXNlIHRyYW5zZm9ybXMsIHRoZXkgYnJlYWsgdmFsaWRhdGlvbiAoXCJFeHBlY3RlZCBwbGFpbiBvYmplY3RcIiwgYnV0IHRyYW5zZm9ybXMgZ2l2ZSBhbiBleHRlbmRlZCBvYmplY3QpXG5cbnNoYXJlLkVtYWlscyA9IG5ldyBNZXRlb3IuQ29sbGVjdGlvbihcImVtYWlsc1wiKVxuc2hhcmUuUXVlcmllcyA9IG5ldyBNZXRlb3IuQ29sbGVjdGlvbihcInF1ZXJpZXNcIilcbnNoYXJlLklQU2V0cyA9IG5ldyBNZXRlb3IuQ29sbGVjdGlvbihcImlwc2V0c1wiKVxuc2hhcmUuVHVwbGVzID0gbmV3IE1ldGVvci5Db2xsZWN0aW9uKFwidHVwbGVzXCIpXG5zaGFyZS5Db25maWdzID0gbmV3IE1ldGVvci5Db2xsZWN0aW9uKFwiY29uZmlnc1wiKVxuIl19
