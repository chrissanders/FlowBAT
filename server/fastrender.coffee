FastRender.onAllRoutes (params) ->
  @subscribe("currentUser")
  @subscribe("configs")
  @subscribe("queries")
  @subscribe("ipsets")
