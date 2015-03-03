FastRender.onAllRoutes (params) ->
  @subscribe("currentUser")
  @subscribe("users")
  @subscribe("configs")
  @subscribe("queries")
  @subscribe("ipsets")
  @subscribe("tuples")
