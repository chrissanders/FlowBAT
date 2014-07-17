Template.table.helpers

Template.table.rendered = ->
  _id = @data._id
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
      share.Queries.update(query._id, {$set: {fieldsOrder: fieldsOrder}})
  )

Template.table.events
#  "click .selector": (event, template) ->
