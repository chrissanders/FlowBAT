Template.fieldsets.helpers
  ipsets: ->
    share.IPSets.find({}, {sort: {createdAt: 1}, transform: (ipset) ->
      ipset = share.Transformations.ipset(ipset)
      {
        name: ipset.displayName()
        value: ipset._id
      }
    })
  typesOptions: ->
    for type in share.queryTypes
      {
        name: type
        value: type
      }
  countriesOptions: ->
    window.countryCodesMap
  rwstatsPrimaryValueOptions: ->
    _.map(@rwstatsValuesOrder, (value) -> {value: value, name: i18n.t("rwcut.fields." + value)})

Template.fieldsets.rendered = ->
  share.queryAutocomplete(@$(".input-group.additional-parameters-form-group input"))

Template.fieldsets.events
