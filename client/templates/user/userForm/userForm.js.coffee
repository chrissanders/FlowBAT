Template.userForm.helpers
  groups: ->
    currentGroups = Object.keys(share.Security.effectiveRoles)
    for group in currentGroups
      {
        value: group
        name: i18n.t("groups." + group)
        isCurrent: group is @group
      }

Template.userForm.rendered = ->
  $(".profile-form").validate
    errorElement: "div"
    onkeyup: (element, event) ->
      @element(element)
    rules:
      name:
        required: true
      locale:
        required: true
    messages: i18n.t("forms.profile.messages", {returnObjectTrees: true})

Template.userForm.events
  "submit .profile-form": (event) ->
    event.preventDefault()
  "input .input-profile-name": (event, template) ->
    user = share.user({"profile.isRealName": 1})
    if not user.profile.isRealName
      Meteor.users.update(user._id, {$set: {"profile.isRealName": true}})
  "input input, textarea": (event, template) ->
    $input = $(event.currentTarget)
    $form = $input.closest('form')
    if $form.valid()
      debouncedUpdateProfile()
  "change select": (event, template) ->
    $input = $(event.currentTarget)
    $form = $input.closest('form')
    if $form.valid()
      debouncedUpdateProfile()
  "click .input-profile-image": (event) ->
    share.MeetingFilepicker.showUploadImage (inkBlobs) ->
      inkBlob = inkBlobs[0]
      Meteor.users.update(Meteor.userId(), {$set: {"profile.image": inkBlob.url}})
  "click .change-password": (event, template) ->
    UI.insert(UI.renderWithData(Template.alert,
      name: i18n.t("forms.profile.passwordChange.alert.name")
      descriptionTemplateName: "changePasswordAlertDescription"
      descriptionTemplateData: {}
      buttonPanelTemplateName: "changePasswordAlertButtonsPanel"
      buttonPanelTemplateData: {user: template.data}
    ), document.body)

debouncedUpdateProfile = _.debounce(->
  $set = {}
  $(".profile-form").find(":input").each (index, editor) ->
    $editor = $(editor)
    if !$editor.attr("name")
      return
    $set["profile." + $editor.attr("name")] = $editor.val()
  if $set["profile.locale"] isnt share.user({"profile.locale": 1}).profile.locale
    callback = reloadPageCallback
  else
    callback = _.identity
  Meteor.users.update(Meteor.userId(), {$set: $set}, {}, callback)
, 300)

reloadPageCallback = (error) ->
  if error then throw error
  location.reload()
