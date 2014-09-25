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
    _.map(@rwstatsValues, (value) -> {value: value, name: i18n.t("rwcut.fields." + value)})
  rwcountLoadSchemeOptions: ->
    options = []
    for loadScheme, index in share.rwcountLoadSchemes
      options.push(
        value: index
        name: loadScheme
      )
    options

Template.fieldsets.rendered = ->
  share.initAutocomplete(@$(".input-group.additional-parameters-form-group input"), share.rwfilterAutocompleteOptions)

Template.fieldsets.events
  "click .open-calendar": encapsulate (event, template) ->
    $target = $(event.currentTarget)
    $input = $target.closest(".input-group").find(".hasDatepicker")
    if $input.datepicker('widget').is(':hidden')
      $input.datepicker('show')
    else
      $input.datepicker('hide')
