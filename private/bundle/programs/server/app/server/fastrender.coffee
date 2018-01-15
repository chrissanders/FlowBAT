(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/fastrender.coffee                                            //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
FastRender.onAllRoutes(function (params) {                             // 1
  this.subscribe("currentUser");                                       // 2
  this.subscribe("users");                                             // 3
  this.subscribe("configs");                                           // 4
  this.subscribe("queries");                                           // 5
  this.subscribe("ipsets");                                            // 6
  return this.subscribe("tuples");                                     // 7
});                                                                    // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/fastrender.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2Zhc3RyZW5kZXIuY29mZmVlIl0sIm5hbWVzIjpbIkZhc3RSZW5kZXIiLCJvbkFsbFJvdXRlcyIsInBhcmFtcyIsInN1YnNjcmliZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUFBLFdBQVdDLFdBQVgsQ0FBdUIsVUFBQ0MsTUFBRDtBQUNyQixPQUFDQyxTQUFELENBQVcsYUFBWDtBQUNBLE9BQUNBLFNBQUQsQ0FBVyxPQUFYO0FBQ0EsT0FBQ0EsU0FBRCxDQUFXLFNBQVg7QUFDQSxPQUFDQSxTQUFELENBQVcsU0FBWDtBQUNBLE9BQUNBLFNBQUQsQ0FBVyxRQUFYO0FBQ0EsY0FBQ0EsU0FBRCxDQUFXLFFBQVg7QUFORiwyRSIsImZpbGUiOiIvc2VydmVyL2Zhc3RyZW5kZXIuY29mZmVlIiwic291cmNlc0NvbnRlbnQiOlsiRmFzdFJlbmRlci5vbkFsbFJvdXRlcyAocGFyYW1zKSAtPlxuICBAc3Vic2NyaWJlKFwiY3VycmVudFVzZXJcIilcbiAgQHN1YnNjcmliZShcInVzZXJzXCIpXG4gIEBzdWJzY3JpYmUoXCJjb25maWdzXCIpXG4gIEBzdWJzY3JpYmUoXCJxdWVyaWVzXCIpXG4gIEBzdWJzY3JpYmUoXCJpcHNldHNcIilcbiAgQHN1YnNjcmliZShcInR1cGxlc1wiKVxuIl19
