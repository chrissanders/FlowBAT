Template.table.helpers
  isPivotable: ->
    true # _.has(share.Pivoting.fields2properties, @_id)
  fieldI18n: ->
    i18n.t("rwcut.fields." + @_id)

Template.table.rendered = ->
  _id = @data._id
  if @data.output is "rwcut"
    @$('.results-table').dragtable(
      dataHeader: "data-field"
      stop: (event, draginfo) ->
        query = share.Queries.findOne(_id)
        field = draginfo.order[draginfo.endIndex]
        fieldsOrder = _.without(query.fieldsOrder, field)
        if draginfo.endIndex
          pivotField = draginfo.order[draginfo.endIndex - 1]
          pivotFieldIndex = fieldsOrder.indexOf(pivotField)
          fieldsOrder.splice(pivotFieldIndex + 1, 0, field)
        else
          fieldsOrder.splice(0, 0, field)
        if _.isEqual(fieldsOrder, query.fieldsOrder)
          if field is query.sortField
            if query.sortReverse
              sortReverse = false
            else
              field = ""
              sortReverse = true
          share.Queries.update(query._id, {$set: {sortField: field, sortReverse: sortReverse}})
        else
          share.Queries.update(query._id, {$set: {fieldsOrder: fieldsOrder}})
    )

Template.table.events
#  "click .selector": (event, template) ->
