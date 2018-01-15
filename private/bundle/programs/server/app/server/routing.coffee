(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/routing.coffee                                               //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var fs;                                                                // 1
fs = Npm.require('fs');                                                // 1
Router.map(function () {                                               // 3
  return this.route('dump', {                                          // 6
    path: '/dump/:token',                                              // 5
    where: 'server',                                                   // 6
    action: function () {                                              // 7
      var basename, content, e, filename, stats;                       // 8
      basename = this.params.token + ".rwf";                           // 8
      filename = "/tmp" + "/" + basename;                              // 9
                                                                       //
      try {                                                            // 10
        stats = fs.statSync(filename);                                 // 11
                                                                       //
        if (stats.isFile()) {                                          // 12
          this.response.writeHead(200, {                               // 13
            "Content-Type": "application/octet-stream",                // 14
            "Content-Length": stats.size,                              // 15
            "Pragma": "public",                                        // 16
            "Expires": "0",                                            // 17
            "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
            "Content-Disposition": "attachment; filename=\"" + basename + "\"",
            "Content-Transfer-Encoding": "binary"                      // 20
          });                                                          // 14
          content = fs.readFileSync(filename);                         // 21
          this.response.write(content);                                // 22
          this.response.end();                                         // 23
          return;                                                      // 24
        }                                                              // 10
      } catch (error) {                                                // 10
        e = error;                                                     // 25
      }                                                                // 32
                                                                       //
      this.response.writeHead(404);                                    // 26
      return this.response.end();                                      // 34
    }                                                                  // 7
  });                                                                  // 4
});                                                                    // 3
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/server/routing.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL3JvdXRpbmcuY29mZmVlIl0sIm5hbWVzIjpbImZzIiwiTnBtIiwicmVxdWlyZSIsIlJvdXRlciIsIm1hcCIsInJvdXRlIiwicGF0aCIsIndoZXJlIiwiYWN0aW9uIiwiYmFzZW5hbWUiLCJjb250ZW50IiwiZSIsImZpbGVuYW1lIiwic3RhdHMiLCJwYXJhbXMiLCJ0b2tlbiIsInN0YXRTeW5jIiwiaXNGaWxlIiwicmVzcG9uc2UiLCJ3cml0ZUhlYWQiLCJzaXplIiwicmVhZEZpbGVTeW5jIiwid3JpdGUiLCJlbmQiLCJlcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsSUFBQUEsRUFBQTtBQUFBQSxLQUFLQyxJQUFJQyxPQUFKLENBQVksSUFBWixDQUFMO0FBRUFDLE9BQU9DLEdBQVAsQ0FBVztBQUdULFNBRkEsS0FBQ0MsS0FBRCxDQUFPLE1BQVAsRUFBZTtBQUNiQyxVQUFNLGNBRE87QUFFYkMsV0FBTyxRQUZNO0FBR2JDLFlBQVE7QUFDTixVQUFBQyxRQUFBLEVBQUFDLE9BQUEsRUFBQUMsQ0FBQSxFQUFBQyxRQUFBLEVBQUFDLEtBQUE7QUFBQUosaUJBQVcsS0FBQ0ssTUFBRCxDQUFRQyxLQUFSLEdBQWdCLE1BQTNCO0FBQ0FILGlCQUFXLFNBQVMsR0FBVCxHQUFlSCxRQUExQjs7QUFDQTtBQUNFSSxnQkFBUWIsR0FBR2dCLFFBQUgsQ0FBWUosUUFBWixDQUFSOztBQUNBLFlBQUdDLE1BQU1JLE1BQU4sRUFBSDtBQUNFLGVBQUNDLFFBQUQsQ0FBVUMsU0FBVixDQUFvQixHQUFwQixFQUNFO0FBQUEsNEJBQWdCLDBCQUFoQjtBQUNBLDhCQUFrQk4sTUFBTU8sSUFEeEI7QUFFQSxzQkFBVSxRQUZWO0FBR0EsdUJBQVcsR0FIWDtBQUlBLDZCQUFpQiw0Q0FKakI7QUFLQSxtQ0FBdUIsNEJBQTRCWCxRQUE1QixHQUF1QyxJQUw5RDtBQU1BLHlDQUE2QjtBQU43QixXQURGO0FBUUFDLG9CQUFVVixHQUFHcUIsWUFBSCxDQUFnQlQsUUFBaEIsQ0FBVjtBQUNBLGVBQUNNLFFBQUQsQ0FBVUksS0FBVixDQUFnQlosT0FBaEI7QUFDQSxlQUFDUSxRQUFELENBQVVLLEdBQVY7QUFDQTtBQWRKO0FBQUEsZUFBQUMsS0FBQTtBQWVNYixZQUFBYSxLQUFBO0FBT0w7O0FBTkQsV0FBQ04sUUFBRCxDQUFVQyxTQUFWLENBQW9CLEdBQXBCO0FBUUEsYUFQQSxLQUFDRCxRQUFELENBQVVLLEdBQVYsRUFPQTtBQTNCTTtBQUhLLEdBQWYsQ0FFQTtBQUhGLDJFIiwiZmlsZSI6Ii9zZXJ2ZXIvcm91dGluZy5jb2ZmZWUiLCJzb3VyY2VzQ29udGVudCI6WyJmcyA9IE5wbS5yZXF1aXJlKCdmcycpXG5cblJvdXRlci5tYXAgLT5cbiAgQHJvdXRlKCdkdW1wJywge1xuICAgIHBhdGg6ICcvZHVtcC86dG9rZW4nLFxuICAgIHdoZXJlOiAnc2VydmVyJyxcbiAgICBhY3Rpb246IC0+XG4gICAgICBiYXNlbmFtZSA9IEBwYXJhbXMudG9rZW4gKyBcIi5yd2ZcIlxuICAgICAgZmlsZW5hbWUgPSBcIi90bXBcIiArIFwiL1wiICsgYmFzZW5hbWVcbiAgICAgIHRyeVxuICAgICAgICBzdGF0cyA9IGZzLnN0YXRTeW5jKGZpbGVuYW1lKVxuICAgICAgICBpZiBzdGF0cy5pc0ZpbGUoKVxuICAgICAgICAgIEByZXNwb25zZS53cml0ZUhlYWQgMjAwLFxuICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuICAgICAgICAgICAgXCJDb250ZW50LUxlbmd0aFwiOiBzdGF0cy5zaXplXG4gICAgICAgICAgICBcIlByYWdtYVwiOiBcInB1YmxpY1wiXG4gICAgICAgICAgICBcIkV4cGlyZXNcIjogXCIwXCJcbiAgICAgICAgICAgIFwiQ2FjaGUtQ29udHJvbFwiOiBcIm11c3QtcmV2YWxpZGF0ZSwgcG9zdC1jaGVjaz0wLCBwcmUtY2hlY2s9MFwiXG4gICAgICAgICAgICBcIkNvbnRlbnQtRGlzcG9zaXRpb25cIjogXCJhdHRhY2htZW50OyBmaWxlbmFtZT1cXFwiXCIgKyBiYXNlbmFtZSArIFwiXFxcIlwiXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHJhbnNmZXItRW5jb2RpbmdcIjogXCJiaW5hcnlcIlxuICAgICAgICAgIGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUpXG4gICAgICAgICAgQHJlc3BvbnNlLndyaXRlKGNvbnRlbnQpXG4gICAgICAgICAgQHJlc3BvbnNlLmVuZCgpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICBjYXRjaCBlXG4gICAgICBAcmVzcG9uc2Uud3JpdGVIZWFkKDQwNClcbiAgICAgIEByZXNwb25zZS5lbmQoKVxuICB9KVxuIl19
