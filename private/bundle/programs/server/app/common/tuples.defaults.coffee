(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// common/tuples.defaults.coffee                                       //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var tuplePreSave;                                                      // 1
                                                                       //
tuplePreSave = function (userId, changes) {};                          // 1
                                                                       //
share.Tuples.before.insert(function (userId, tuple) {                  // 3
  var count, now, prefix;                                              // 4
  tuple._id = tuple._id || Random.id();                                // 4
  now = new Date();                                                    // 5
                                                                       //
  _.defaults(tuple, {                                                  // 6
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
  if (!tuple.name) {                                                   // 16
    prefix = "New Tuple File";                                         // 17
    count = share.Tuples.find({                                        // 18
      name: {                                                          // 18
        $regex: "^" + prefix,                                          // 18
        $options: "i"                                                  // 18
      }                                                                // 18
    }).count();                                                        // 18
    tuple.name = prefix;                                               // 19
                                                                       //
    if (count) {                                                       // 20
      tuple.name += " (" + count + ")";                                // 21
    }                                                                  // 16
  }                                                                    // 31
                                                                       //
  return tuplePreSave.call(this, userId, tuple);                       // 32
});                                                                    // 3
share.Tuples.before.update(function (userId, tuple, fieldNames, modifier, options) {
  var now;                                                             // 25
  now = new Date();                                                    // 25
  modifier.$set = modifier.$set || {};                                 // 26
  modifier.$set.updatedAt = modifier.$set.updatedAt || now;            // 27
  return tuplePreSave.call(this, userId, modifier.$set);               // 40
});                                                                    // 24
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/common/tuples.defaults.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvY29tbW9uL3R1cGxlcy5kZWZhdWx0cy5jb2ZmZWUiXSwibmFtZXMiOlsidHVwbGVQcmVTYXZlIiwidXNlcklkIiwiY2hhbmdlcyIsInNoYXJlIiwiVHVwbGVzIiwiYmVmb3JlIiwiaW5zZXJ0IiwidHVwbGUiLCJjb3VudCIsIm5vdyIsInByZWZpeCIsIl9pZCIsIlJhbmRvbSIsImlkIiwiRGF0ZSIsIl8iLCJkZWZhdWx0cyIsIm5hbWUiLCJub3RlIiwiY29udGVudHMiLCJpc091dHB1dFN0YWxlIiwiaXNOZXciLCJvd25lcklkIiwidXBkYXRlZEF0IiwiY3JlYXRlZEF0IiwiZmluZCIsIiRyZWdleCIsIiRvcHRpb25zIiwiY2FsbCIsInVwZGF0ZSIsImZpZWxkTmFtZXMiLCJtb2RpZmllciIsIm9wdGlvbnMiLCIkc2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxJQUFBQSxZQUFBOztBQUFBQSxlQUFlLFVBQUNDLE1BQUQsRUFBU0MsT0FBVCxJQUFmOztBQUVBQyxNQUFNQyxNQUFOLENBQWFDLE1BQWIsQ0FBb0JDLE1BQXBCLENBQTJCLFVBQUNMLE1BQUQsRUFBU00sS0FBVDtBQUN6QixNQUFBQyxLQUFBLEVBQUFDLEdBQUEsRUFBQUMsTUFBQTtBQUFBSCxRQUFNSSxHQUFOLEdBQVlKLE1BQU1JLEdBQU4sSUFBYUMsT0FBT0MsRUFBUCxFQUF6QjtBQUNBSixRQUFNLElBQUlLLElBQUosRUFBTjs7QUFDQUMsSUFBRUMsUUFBRixDQUFXVCxLQUFYLEVBQ0U7QUFBQVUsVUFBTSxFQUFOO0FBQ0FDLFVBQU0sRUFETjtBQUVBQyxjQUFVLEVBRlY7QUFHQUMsbUJBQWUsSUFIZjtBQUlBQyxXQUFPLElBSlA7QUFLQUMsYUFBU3JCLE1BTFQ7QUFNQXNCLGVBQVdkLEdBTlg7QUFPQWUsZUFBV2Y7QUFQWCxHQURGOztBQVVBLE1BQUcsQ0FBSUYsTUFBTVUsSUFBYjtBQUNFUCxhQUFTLGdCQUFUO0FBQ0FGLFlBQVFMLE1BQU1DLE1BQU4sQ0FBYXFCLElBQWIsQ0FBa0I7QUFBRVIsWUFBTTtBQUFFUyxnQkFBUSxNQUFNaEIsTUFBaEI7QUFBd0JpQixrQkFBVTtBQUFsQztBQUFSLEtBQWxCLEVBQXFFbkIsS0FBckUsRUFBUjtBQUNBRCxVQUFNVSxJQUFOLEdBQWFQLE1BQWI7O0FBQ0EsUUFBR0YsS0FBSDtBQUNFRCxZQUFNVSxJQUFOLElBQWMsT0FBT1QsS0FBUCxHQUFlLEdBQTdCO0FBTEo7QUFlQzs7QUFDRCxTQVZBUixhQUFhNEIsSUFBYixDQUFrQixJQUFsQixFQUFxQjNCLE1BQXJCLEVBQTZCTSxLQUE3QixDQVVBO0FBN0JGO0FBcUJBSixNQUFNQyxNQUFOLENBQWFDLE1BQWIsQ0FBb0J3QixNQUFwQixDQUEyQixVQUFDNUIsTUFBRCxFQUFTTSxLQUFULEVBQWdCdUIsVUFBaEIsRUFBNEJDLFFBQTVCLEVBQXNDQyxPQUF0QztBQUN6QixNQUFBdkIsR0FBQTtBQUFBQSxRQUFNLElBQUlLLElBQUosRUFBTjtBQUNBaUIsV0FBU0UsSUFBVCxHQUFnQkYsU0FBU0UsSUFBVCxJQUFpQixFQUFqQztBQUNBRixXQUFTRSxJQUFULENBQWNWLFNBQWQsR0FBMEJRLFNBQVNFLElBQVQsQ0FBY1YsU0FBZCxJQUEyQmQsR0FBckQ7QUFhQSxTQVpBVCxhQUFhNEIsSUFBYixDQUFrQixJQUFsQixFQUFxQjNCLE1BQXJCLEVBQTZCOEIsU0FBU0UsSUFBdEMsQ0FZQTtBQWhCRiw0RSIsImZpbGUiOiIvY29tbW9uL3R1cGxlcy5kZWZhdWx0cy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJ0dXBsZVByZVNhdmUgPSAodXNlcklkLCBjaGFuZ2VzKSAtPlxuXG5zaGFyZS5UdXBsZXMuYmVmb3JlLmluc2VydCAodXNlcklkLCB0dXBsZSkgLT5cbiAgdHVwbGUuX2lkID0gdHVwbGUuX2lkIHx8IFJhbmRvbS5pZCgpXG4gIG5vdyA9IG5ldyBEYXRlKClcbiAgXy5kZWZhdWx0cyh0dXBsZSxcbiAgICBuYW1lOiBcIlwiXG4gICAgbm90ZTogXCJcIlxuICAgIGNvbnRlbnRzOiBcIlwiXG4gICAgaXNPdXRwdXRTdGFsZTogdHJ1ZVxuICAgIGlzTmV3OiB0cnVlXG4gICAgb3duZXJJZDogdXNlcklkXG4gICAgdXBkYXRlZEF0OiBub3dcbiAgICBjcmVhdGVkQXQ6IG5vd1xuICApXG4gIGlmIG5vdCB0dXBsZS5uYW1lXG4gICAgcHJlZml4ID0gXCJOZXcgVHVwbGUgRmlsZVwiXG4gICAgY291bnQgPSBzaGFyZS5UdXBsZXMuZmluZCh7IG5hbWU6IHsgJHJlZ2V4OiBcIl5cIiArIHByZWZpeCwgJG9wdGlvbnM6IFwiaVwiIH0gfSkuY291bnQoKVxuICAgIHR1cGxlLm5hbWUgPSBwcmVmaXhcbiAgICBpZiBjb3VudFxuICAgICAgdHVwbGUubmFtZSArPSBcIiAoXCIgKyBjb3VudCArIFwiKVwiXG4gIHR1cGxlUHJlU2F2ZS5jYWxsKEAsIHVzZXJJZCwgdHVwbGUpXG5cbnNoYXJlLlR1cGxlcy5iZWZvcmUudXBkYXRlICh1c2VySWQsIHR1cGxlLCBmaWVsZE5hbWVzLCBtb2RpZmllciwgb3B0aW9ucykgLT5cbiAgbm93ID0gbmV3IERhdGUoKVxuICBtb2RpZmllci4kc2V0ID0gbW9kaWZpZXIuJHNldCBvciB7fVxuICBtb2RpZmllci4kc2V0LnVwZGF0ZWRBdCA9IG1vZGlmaWVyLiRzZXQudXBkYXRlZEF0IG9yIG5vd1xuICB0dXBsZVByZVNhdmUuY2FsbChALCB1c2VySWQsIG1vZGlmaWVyLiRzZXQpXG4iXX0=
