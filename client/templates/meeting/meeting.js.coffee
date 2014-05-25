Template.meeting.helpers
  isEdited: ->
    share.MeetingEditor.isEdited(@_id)

Template.meeting.rendered = ->

Template.meeting.events
  "click .start-editing": encapsulate (event, template) ->
    share.MeetingEditor.startEditing(template.data._id)
  "click .stop-editing": encapsulate (event, template) ->
    share.MeetingEditor.stopEditing(template.data._id)
    if template.data.isNew
      share.MeetingEditor.insertAfter(template.data._id)
  "click .remove": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.MeetingEditor.remove(template.data._id)
      Router.go("/")
  "click .add-sak": encapsulate (event, template) ->
    share.SakEditor.insert(
      meetingId: template.data._id
    )
