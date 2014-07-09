fs = Npm.require('fs')

Router.map ->
  @route('dump', {
    path: '/dump/:token',
    where: 'server',
    action: ->
      basename = @params.token + ".rwf"
      filename = "/tmp/" + basename
      try
        stats = fs.statSync(filename)
        if stats.isFile()
          @response.writeHead 200,
            "Content-Type": "application/octet-stream"
            "Content-Length": stats.size
            "Pragma": "public"
            "Expires": "0"
            "Cache-Control": "must-revalidate, post-check=0, pre-check=0"
            "Content-Disposition": "attachment; filename=\"" + basename + "\""
            "Content-Transfer-Encoding": "binary"
          content = fs.readFileSync(filename)
          @response.write(content)
          @response.end()
          return
      catch e
      @response.writeHead(404)
      @response.end()
  })

