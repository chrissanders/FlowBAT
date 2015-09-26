(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var fs;

fs = Npm.require('fs');

Router.map(function() {
  return this.route('dump', {
    path: '/dump/:token',
    where: 'server',
    action: function() {
      var basename, content, e, filename, stats;
      basename = this.params.token + ".rwf";
      filename = "/tmp" + "/" + basename;
      try {
        stats = fs.statSync(filename);
        if (stats.isFile()) {
          this.response.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": stats.size,
            "Pragma": "public",
            "Expires": "0",
            "Cache-Control": "must-revalidate, post-check=0, pre-check=0",
            "Content-Disposition": "attachment; filename=\"" + basename + "\"",
            "Content-Transfer-Encoding": "binary"
          });
          content = fs.readFileSync(filename);
          this.response.write(content);
          this.response.end();
          return;
        }
      } catch (_error) {
        e = _error;
      }
      this.response.writeHead(404);
      return this.response.end();
    }
  });
});

})();

//# sourceMappingURL=routing.coffee.js.map
