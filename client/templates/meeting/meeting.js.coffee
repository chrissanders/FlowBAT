Template.meeting.helpers
  isEdited: ->
    share.MeetingEditor.isEdited(@_id)
  durationOverflowClass: ->
    if not @maximumDurationSum()
      return ""
    if @calculatedDurationSum() > @maximumDurationSum()
      return "text-danger"
    else
      return "text-success"

Template.meeting.rendered = ->
  @$(".saker").sortable(
    axis: "y"
    delay: 75
    distance: 4
    handle: ".sortable-handle"
    cursor: "move"
    tolerance: "pointer"
    forceHelperSize: true
    forcePlaceholderSize: true
    placeholder: "object sak placeholder"
#    start: (event, ui) ->
#      ui.item.addClass("prevent-click")
#    stop: (event, ui) ->
#      _.defer ->
#        ui.item.removeClass("prevent-click") # prevent click after drag in Firefox
    update: (event, ui) ->
      if ui.sender # duplicate "update" event
        return
      $sak = ui.item
      sakId = $sak.attr("data-id")
      prevSakId = $sak.prev().attr("data-id")
      nextSakId = $sak.next().attr("data-id")
      if !prevSakId && !nextSakId
        position = 1
      else if !prevSakId
        position = share.Saker.findOne(nextSakId).position - 1
      else if !nextSakId
        position = share.Saker.findOne(prevSakId).position + 1
      else
        position = (share.Saker.findOne(nextSakId).position + share.Saker.findOne(prevSakId).position) / 2
      sak = share.Saker.findOne(sakId)
      $set = {position: position}
      share.Saker.update(sakId, {$set: $set})
  )

Template.meeting.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.MeetingEditor.startEditing(template.data._id)
  "click .stop-editing": encapsulate (event, template) ->
    share.MeetingEditor.stopEditing(template.data._id)
  "click .remove": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.MeetingEditor.remove(template.data._id)
      Router.go("/")
  "click .add-sak": grab encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.MeetingEditor.insertSak(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.MeetingEditor.stopEditing(template.data._id)
