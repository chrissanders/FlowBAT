share.EditorCache =
  editors: {}
  register: (editor) ->
    @editors[editor.family] = editor
  editorId: (family, _id) ->
    family + ":" + _id
  editorKey: (family, _id, key) ->
    family + "-" + _id + "-" + key
  getSessionValue: (subkey) ->
    Session.get(subkey + "-editors") or {}
  setSessionValue: (subkey, value) ->
    Session.set(subkey + "-editors", value)
  add: (editorId, subkey, info) ->
    bag = @getSessionValue(subkey)
    bag[editorId] = info
    @setSessionValue(subkey, bag)
  remove: (editorId, subkey) ->
    bag = @getSessionValue(subkey)
    delete bag[editorId]
    @setSessionValue(subkey, bag)
  stopEditing: (exceptEditorId = null) ->
    for editorId, info of @getSessionValue("is-edited") when editorId isnt exceptEditorId
      @editors[info.family].stopEditing(info._id)

class share.Editor
  defaultEditedProperty: "name"
  constructor: (options) ->
    _.extend(@, options)
    share.EditorCache.register(@)
  editorId: (_id) ->
    share.EditorCache.editorId(@family, _id)
  editorKey: (_id, key) ->
    share.EditorCache.editorKey(@family, _id, key)
  insert: (object = {}, callback = ->) ->
    _.defaults(object, i18n.t("defaults." + @family, {returnObjectTrees: true}) or {})
    _id = @collection.insert(object, callback)
    @startEditing(_id)
    _id
  insertAfter: (_id, object = {}, callback = ->) ->
    @insertAndShow(object, callback)
  insertAndShow: (object = {}, callback = ->) ->
    _id = @insert(object, callback)
    object = @collection.findOne(_id)
    path = object.path()
    _.defer ->
      Router.go(path)
  isEdited: (_id) ->
    Session.equals(@editorKey(_id, "is-edited"), true)
  isEditedProperty: (_id, property) ->
    @isEdited(_id) and Session.equals(@editorKey(_id, "edited-property"), property)
  startEditing: (_id, property) ->
    Session.set(@editorKey(_id, "is-edited"), true)
    share.EditorCache.add(@editorId(_id), "is-edited", {family: @family, _id: _id})
    @setEditingProperty(_id, property or @defaultEditedProperty)
  setEditingProperty: (_id, property) ->
    Session.set(@editorKey(_id, "edited-property"), property)
  stopEditing: (_id) ->
    @saveObject(_id)
    Session.set(@editorKey(_id, "is-edited"), null)
    Session.set(@editorKey(_id, "edited-property"), null)
    share.EditorCache.remove(@editorId(_id), "is-edited")
  cleanProperty: (property, value) ->
    value
  saveProperty: (_id, property, value) ->
    $set = {}
    $set[property] = @cleanProperty(property, value)
    @collection.update(_id, {$set: $set})
  insertObject: ->
    object = @findProperties("NEW")
    object.isNew = false
    @collection.insert(object)
  saveObject: (_id) ->
    $set = @findProperties(_id)
    object = @collection.findOne(_id)
    if object.isNew
      $set["isNew"] = false
    @collection.update(_id, {$set: $set})
  findProperties: (_id) ->
    properties = {}
    $(".property-editor[data-family='" + @family + "'][data-object-id='" + _id + "']").each (index, element) =>
      $element = $(element)
      property = $element.attr("name")
      value = $element.val()
      properties[property] = @cleanProperty(property, value)
    properties
  isSingleLine: (property) ->
    false
  remove: (_id) ->
    @collection.remove(_id)
    share.EditorCache.remove(@editorId(_id), "is-edited")
share.Editor::debouncedSaveProperty = _.debounce(share.Editor::saveProperty, 500)
share.Editor::debouncedSaveObject = _.debounce(share.Editor::saveObject, 500)

share.createExtension = ->
  share.stopEditingExtension()
  extensionId = Extensions.insert({})
  if extensionId
    extension = Extensions.findOne(extensionId)
    #    Session.set(extension.htmlId() + "-is-open", true)
    Session.set("editedExtensionProperty", "name")
    Session.set("isEditedExtensionModal", true)
    Session.set("editedExtensionHtmlId", extension.htmlId())
    Session.set("editedExtensionId", extensionId)
    share.setUrlAndOpenExtensionModal(extensionId)

share.saveEditedExtension = (stopEditing = false) ->
  editedObjectId = Session.get("editedExtensionId")
  editedObject = share.Extensions.findOne(editedObjectId)
  if editedObjectId
    $editors = $(".extension[data-id='" + editedObjectId + "'] .property-editor")
    $set = {}
    if stopEditing
      $set.isNew = false
    $editors.each (index, editor) ->
      $editor = $(editor)
      name = $editor.attr("name")
      value = $editor.val()
      if stopEditing
        value = value.trim()
      if name is "execUrls"
        execUrls = value.match(share.linkRegExp) || []
        value = []
        for execUrl in execUrls
          execUrl = execUrl.trim()
          if not execUrl.match(/^#/i) # comments
            value.push(execUrl)
      if not _.isEqual(editedObject[name], value)
        $set[name] = value
    if not _.isEmpty($set)
      Extensions.update(editedObjectId, {$set: $set})

share.stopEditingExtension = (forceRemovalNewEmptyExtension = false) ->
  extension = Extensions.findOne(Session.get("editedExtensionId"))
  isNew = extension?.isNew # will change upon save
  share.saveEditedExtension(true)
  extension = Extensions.findOne(Session.get("editedExtensionId")) # refresh
  if extension?.isEmpty()
    if forceRemovalNewEmptyExtension and isNew
      Extensions.remove(extension._id)
      Session.set("editedExtensionId", null)
      Session.set("editedExtensionHtmlId", null)
    else
      # noop
  else
    Session.set("editedExtensionId", null)
    Session.set("editedExtensionHtmlId", null)

share.debouncedSaveEditedExtension = _.debounce(share.saveEditedExtension, 1000)
