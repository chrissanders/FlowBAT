Template.sak.helpers
  isEdited: ->
    share.SakEditor.isEdited(@_id)
  isAddingTalk: ->
    share.SakEditor.isAddingTalk(@_id)
  addTalkSearchResults: ->
    addTalkQuery = Session.get("add-talk-query")
    if addTalkQuery
      regexp = new RegExp(addTalkQuery, "gi")
      existingUserIds = _.pluck(@talks().fetch(), "userId")
      Meteor.users.find({"profile.name": regexp}, {limit: 9, sort: {createdAt: 1}, transform: (user) ->
        user.isAlreadyAdded = user._id in existingUserIds
        user
      })
    else
      []
  durationOverflowClass: ->
    if not @maximumDuration
      return ""
    if @calculatedDurationSum() > @maximumDuration
      return "text-danger"
    else
      return "text-success"

Template.sak.rendered = ->

Template.sak.events
  "click .start-editing": encapsulate (event, template) ->
    share.EditorCache.stopEditing(template.data._id)
    share.SakEditor.startEditing(template.data._id, $(event.currentTarget).attr("data-edited-property"))
  "click .stop-editing": encapsulate (event, template) ->
    share.SakEditor.stopEditing(template.data._id)
  "click .remove": grab encapsulate (event, template) ->
    $target = $(event.currentTarget)
    confirmation = $target.attr("data-confirmation")
    if (not confirmation or confirm(confirmation))
      share.SakEditor.remove(template.data._id)
  "submit .object form": grab encapsulate (event, template) ->
    share.SakEditor.stopEditing(template.data._id)
  "click .add-talk": encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.SakEditor.startAddingTalk(template.data._id)
    _.defer ->
      $(".add-talk-wrapper input").first().focus()
  "click .add-talk-wrapper .cancel": grab encapsulate (event, template) ->
    share.EditorCache.stopEditing()
    share.SakEditor.stopAddingTalk(template.data._id)
    Session.set("add-talk-query", "")
  "input .add-talk-query": encapsulate (event, template) ->
    Session.set("add-talk-query", $(event.currentTarget).val())
  "click .add-talk-wrapper .user": encapsulate (event, template) ->
    $user = $(event.currentTarget)
    if $user.hasClass("already-added")
      talk = share.Talks.findOne(
        sakId: template.data._id
        userId: $user.attr("data-id")
      )
      share.Talks.remove(talk._id)
    else
      _id = share.SakEditor.insertTalk(template.data._id,
        userId: $user.attr("data-id")
        isNew: false
      )
      share.TalkEditor.stopEditing(_id)
      Session.set("add-talk-query", "")
      _.defer ->
        template.$(".add-talk-wrapper input").first().focus()
