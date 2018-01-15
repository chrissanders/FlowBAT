(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/security/lib/securityRulesWrapper.coffee                     //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.securityRulesWrapper = function (func) {                         // 1
  return function () {                                                 // 2
    var exception, user;                                               // 3
    user = Meteor.user();                                              // 3
                                                                       //
    if (user) {                                                        // 4
      root.i18n.setLng(user.profile.locale);                           // 5
      moment.lang(user.profile.locale);                                // 6
    }                                                                  // 8
                                                                       //
    try {                                                              // 7
      return func.apply(this, arguments);                              // 8
    } catch (error) {                                                  // 7
      exception = error;                                               // 9
                                                                       //
      Meteor._debug(exception);                                        // 10
                                                                       //
      Meteor._debug(arguments);                                        // 11
                                                                       //
      throw exception;                                                 // 12
    }                                                                  // 16
  };                                                                   // 2
};                                                                     // 1
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/security/lib/securityRulesWrapper.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3NlY3VyaXR5L2xpYi9zZWN1cml0eVJ1bGVzV3JhcHBlci5jb2ZmZWUiXSwibmFtZXMiOlsic2hhcmUiLCJzZWN1cml0eVJ1bGVzV3JhcHBlciIsImZ1bmMiLCJleGNlcHRpb24iLCJ1c2VyIiwiTWV0ZW9yIiwicm9vdCIsImkxOG4iLCJzZXRMbmciLCJwcm9maWxlIiwibG9jYWxlIiwibW9tZW50IiwibGFuZyIsImFwcGx5IiwiYXJndW1lbnRzIiwiZXJyb3IiLCJfZGVidWciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBQSxNQUFNQyxvQkFBTixHQUE2QixVQUFDQyxJQUFEO0FBQzNCLFNBQU87QUFDTCxRQUFBQyxTQUFBLEVBQUFDLElBQUE7QUFBQUEsV0FBT0MsT0FBT0QsSUFBUCxFQUFQOztBQUNBLFFBQUdBLElBQUg7QUFDRUUsV0FBS0MsSUFBTCxDQUFVQyxNQUFWLENBQWlCSixLQUFLSyxPQUFMLENBQWFDLE1BQTlCO0FBQ0FDLGFBQU9DLElBQVAsQ0FBWVIsS0FBS0ssT0FBTCxDQUFhQyxNQUF6QjtBQUVEOztBQUREO0FBQ0UsYUFBT1IsS0FBS1csS0FBTCxDQUFXLElBQVgsRUFBY0MsU0FBZCxDQUFQO0FBREYsYUFBQUMsS0FBQTtBQUVNWixrQkFBQVksS0FBQTs7QUFDSlYsYUFBT1csTUFBUCxDQUFjYixTQUFkOztBQUNBRSxhQUFPVyxNQUFQLENBQWNGLFNBQWQ7O0FBQ0EsWUFBTVgsU0FBTjtBQUlEO0FBZEksR0FBUDtBQUQyQixDQUE3QiwwRSIsImZpbGUiOiIvc2VydmVyL3NlY3VyaXR5L2xpYi9zZWN1cml0eVJ1bGVzV3JhcHBlci5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJzaGFyZS5zZWN1cml0eVJ1bGVzV3JhcHBlciA9IChmdW5jKSAtPlxuICByZXR1cm4gLT5cbiAgICB1c2VyID0gTWV0ZW9yLnVzZXIoKVxuICAgIGlmIHVzZXJcbiAgICAgIHJvb3QuaTE4bi5zZXRMbmcodXNlci5wcm9maWxlLmxvY2FsZSlcbiAgICAgIG1vbWVudC5sYW5nKHVzZXIucHJvZmlsZS5sb2NhbGUpXG4gICAgdHJ5XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShALCBhcmd1bWVudHMpXG4gICAgY2F0Y2ggZXhjZXB0aW9uXG4gICAgICBNZXRlb3IuX2RlYnVnKGV4Y2VwdGlvbilcbiAgICAgIE1ldGVvci5fZGVidWcoYXJndW1lbnRzKVxuICAgICAgdGhyb3cgZXhjZXB0aW9uXG4iXX0=
