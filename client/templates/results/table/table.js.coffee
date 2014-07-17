#usedCodes = []
#map = []
#map.push({value: "--", name: "N/A (private and reserved)"})
#map.push({value: "o1", name: "Other"})
#map.push({value: "a1", name: "Anonymous proxy"})
#map.push({value: "a2", name: "Satellite provider"})
#for tr in $("tr")
#  $tr = $(tr)
#  $tds = $tr.find("td")
#  codeTd = $tds.get(4)
#  countryTd = $tds.get(5)
#  code = codeTd.innerText.trim()
#  lccode = code.toLowerCase()
#  country = countryTd.innerText.trim()
#  if usedCodes.indexOf(lccode) is -1
#    usedCodes.push(lccode)
#    map.push({value: lccode, name: country + " (" + code + ")"})
#console.log JSON.stringify(map)

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
