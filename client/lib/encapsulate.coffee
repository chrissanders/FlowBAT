window.encapsulate = (handler) ->
  (event) ->
    event.stopPropagation()
    event.stopImmediatePropagation()
    handler.apply(@, arguments)

window.grab = (handler) ->
  (event) ->
    $target = $(event.target)
    if not $target.closest(".pass-to-router").length
      event.preventDefault()
    handler.apply(@, arguments)
