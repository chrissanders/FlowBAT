(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/ipsets.defaults.coffee                                       //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var ipsetPreSave;                                                      // 1
                                                                       //
ipsetPreSave = function (userId, changes) {};                          // 1
                                                                       //
share.IPSets.before.insert(function (userId, ipset) {                  // 3
  var count, now, prefix;                                              // 4
  ipset._id = ipset._id || Random.id();                                // 4
  now = new Date();                                                    // 5
                                                                       //
  _.defaults(ipset, {                                                  // 6
    name: "",                                                          // 7
    note: "",                                                          // 8
    contents: "",                                                      // 9
    isOutputStale: true,                                               // 10
    isNew: true,                                                       // 11
    ownerId: userId,                                                   // 12
    updatedAt: now,                                                    // 13
    createdAt: now                                                     // 14
  });                                                                  // 7
                                                                       //
  if (!ipset.name) {                                                   // 16
    prefix = "New IP Set";                                             // 17
    count = share.IPSets.find({                                        // 18
      name: {                                                          // 18
        $regex: "^" + prefix,                                          // 18
        $options: "i"                                                  // 18
      }                                                                // 18
    }).count();                                                        // 18
    ipset.name = prefix;                                               // 19
                                                                       //
    if (count) {                                                       // 20
      ipset.name += " (" + count + ")";                                // 21
    }                                                                  // 16
  }                                                                    // 31
                                                                       //
  return ipsetPreSave.call(this, userId, ipset);                       // 32
});                                                                    // 3
share.IPSets.before.update(function (userId, ipset, fieldNames, modifier, options) {
  var now;                                                             // 25
  now = new Date();                                                    // 25
  modifier.$set = modifier.$set || {};                                 // 26
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;            // 27
  return ipsetPreSave.call(this, userId, modifier.$set);               // 40
});                                                                    // 24
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/ipsets.defaults.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL2lwc2V0cy5kZWZhdWx0cy5jb2ZmZWUiXSwibmFtZXMiOlsiaXBzZXRQcmVTYXZlIiwidXNlcklkIiwiY2hhbmdlcyIsInNoYXJlIiwiSVBTZXRzIiwiYmVmb3JlIiwiaW5zZXJ0IiwiaXBzZXQiLCJjb3VudCIsIm5vdyIsInByZWZpeCIsIl9pZCIsIlJhbmRvbSIsImlkIiwiRGF0ZSIsIl8iLCJkZWZhdWx0cyIsIm5hbWUiLCJub3RlIiwiY29udGVudHMiLCJpc091dHB1dFN0YWxlIiwiaXNOZXciLCJvd25lcklkIiwidXBkYXRlZEF0IiwiY3JlYXRlZEF0IiwiZmluZCIsIiRyZWdleCIsIiRvcHRpb25zIiwiY2FsbCIsInVwZGF0ZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCIkc2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxZQUFBOztBQUFBQSxlQUFlLFVBQUNDLE1BQUQsRUFBU0MsT0FBVCxJQUFmOztBQUVBQyxNQUFNQyxNQUFOLENBQWFDLE1BQWIsQ0FBb0JDLE1BQXBCLENBQTJCLFVBQUNMLE1BQUQsRUFBU00sS0FBVDtBQUN6QixNQUFBQyxLQUFBLEVBQUFDLEdBQUEsRUFBQUMsTUFBQTtBQUFBSCxRQUFNSSxHQUFOLEdBQVlKLE1BQU1JLEdBQU4sSUFBYUMsT0FBT0MsRUFBUCxFQUF6QjtBQUNBSixRQUFNLElBQUlLLElBQUosRUFBTjs7QUFDQUMsSUFBRUMsUUFBRixDQUFXVCxLQUFYLEVBQ0U7QUFBQVUsVUFBTSxFQUFOO0FBQ0FDLFVBQU0sRUFETjtBQUVBQyxjQUFVLEVBRlY7QUFHQUMsbUJBQWUsSUFIZjtBQUlBQyxXQUFPLElBSlA7QUFLQUMsYUFBU3JCLE1BTFQ7QUFNQXNCLGVBQVdkLEdBTlg7QUFPQWUsZUFBV2Y7QUFQWCxHQURGOztBQVVBLE1BQUcsQ0FBSUYsTUFBTVUsSUFBYjtBQUNFUCxhQUFTLFlBQVQ7QUFDQUYsWUFBUUwsTUFBTUMsTUFBTixDQUFhcUIsSUFBYixDQUFrQjtBQUFFUixZQUFNO0FBQUVTLGdCQUFRLE1BQU1oQixNQUFoQjtBQUF3QmlCLGtCQUFVO0FBQWxDO0FBQVIsS0FBbEIsRUFBcUVuQixLQUFyRSxFQUFSO0FBQ0FELFVBQU1VLElBQU4sR0FBYVAsTUFBYjs7QUFDQSxRQUFHRixLQUFIO0FBQ0VELFlBQU1VLElBQU4sSUFBYyxPQUFPVCxLQUFQLEdBQWUsR0FBN0I7QUFMSjtBQWVDOztBQUNELFNBVkFSLGFBQWE0QixJQUFiLENBQWtCLElBQWxCLEVBQXFCM0IsTUFBckIsRUFBNkJNLEtBQTdCLENBVUE7QUE3QkY7QUFxQkFKLE1BQU1DLE1BQU4sQ0FBYUMsTUFBYixDQUFvQndCLE1BQXBCLENBQTJCLFVBQUM1QixNQUFELEVBQVNNLEtBQVQsRUFBZ0J1QixVQUFoQixFQUE0QkMsUUFBNUIsRUFBc0NDLE9BQXRDO0FBQ3pCLE1BQUF2QixHQUFBO0FBQUFBLFFBQU0sSUFBSUssSUFBSixFQUFOO0FBQ0FpQixXQUFTRSxJQUFULEdBQWdCRixTQUFTRSxJQUFULElBQWlCLEVBQWpDO0FBQ0FGLFdBQVNFLElBQVQsQ0FBY1YsU0FBZCxHQUEwQlEsU0FBU0UsSUFBVCxDQUFjVixTQUFkLElBQTJCZCxHQUFyRDtBQWFBLFNBWkFULGFBQWE0QixJQUFiLENBQWtCLElBQWxCLEVBQXFCM0IsTUFBckIsRUFBNkI4QixTQUFTRSxJQUF0QyxDQVlBO0FBaEJGLDRFIiwiZmlsZSI6Ii9jb21tb24vaXBzZXRzLmRlZmF1bHRzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbImlwc2V0UHJlU2F2ZSA9ICh1c2VySWQsIGNoYW5nZXMpIC0+XG5cbnNoYXJlLklQU2V0cy5iZWZvcmUuaW5zZXJ0ICh1c2VySWQsIGlwc2V0KSAtPlxuICBpcHNldC5faWQgPSBpcHNldC5faWQgfHwgUmFuZG9tLmlkKClcbiAgbm93ID0gbmV3IERhdGUoKVxuICBfLmRlZmF1bHRzKGlwc2V0LFxuICAgIG5hbWU6IFwiXCJcbiAgICBub3RlOiBcIlwiXG4gICAgY29udGVudHM6IFwiXCJcbiAgICBpc091dHB1dFN0YWxlOiB0cnVlXG4gICAgaXNOZXc6IHRydWVcbiAgICBvd25lcklkOiB1c2VySWRcbiAgICB1cGRhdGVkQXQ6IG5vd1xuICAgIGNyZWF0ZWRBdDogbm93XG4gIClcbiAgaWYgbm90IGlwc2V0Lm5hbWVcbiAgICBwcmVmaXggPSBcIk5ldyBJUCBTZXRcIlxuICAgIGNvdW50ID0gc2hhcmUuSVBTZXRzLmZpbmQoeyBuYW1lOiB7ICRyZWdleDogXCJeXCIgKyBwcmVmaXgsICRvcHRpb25zOiBcImlcIiB9IH0pLmNvdW50KClcbiAgICBpcHNldC5uYW1lID0gcHJlZml4XG4gICAgaWYgY291bnRcbiAgICAgIGlwc2V0Lm5hbWUgKz0gXCIgKFwiICsgY291bnQgKyBcIilcIlxuICBpcHNldFByZVNhdmUuY2FsbChALCB1c2VySWQsIGlwc2V0KVxuXG5zaGFyZS5JUFNldHMuYmVmb3JlLnVwZGF0ZSAodXNlcklkLCBpcHNldCwgZmllbGROYW1lcywgbW9kaWZpZXIsIG9wdGlvbnMpIC0+XG4gIG5vdyA9IG5ldyBEYXRlKClcbiAgbW9kaWZpZXIuJHNldCA9IG1vZGlmaWVyLiRzZXQgb3Ige31cbiAgbW9kaWZpZXIuJHNldC51cGRhdGVkQXQgPSBtb2RpZmllci4kc2V0LnVwZGF0ZWRBdCBvciBub3dcbiAgaXBzZXRQcmVTYXZlLmNhbGwoQCwgdXNlcklkLCBtb2RpZmllci4kc2V0KVxuIl19
