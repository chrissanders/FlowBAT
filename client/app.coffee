share.nextQuestion = (category) ->
#  propertyIds = _.pluck(share.Properties.find({categoryId: category._id, _id: {$nin: amplify.store("processedPropertyIds")}}).fetch(), "_id")
  apps = share.filteredResults(category).fetch()
  cl apps
  idealDistance = apps.length / 2
  propertyIds = []
  for app in apps
    propertyIds = propertyIds.concat(app.propertyIds)
  propertyIdGroups = _.groupBy(propertyIds)
  propertyId = null
  currentDifference = Infinity
  processedPropertyIds = amplify.store("processedPropertyIds")
  for _id, ids of propertyIdGroups when _id not in processedPropertyIds
    distance = ids.length
    newDifference = Math.abs(idealDistance - distance)
    if newDifference < currentDifference
      currentDifference = newDifference
      propertyId = _id
    else if newDifference is currentDifference
      newPropertyDefinitiveness = share.Properties.findOne(_id).definitiveness
      currentPropertyDefinitiveness = share.Properties.findOne(propertyId).definitiveness
      if newPropertyDefinitiveness > currentPropertyDefinitiveness
        currentDifference = newDifference
        propertyId = _id
#  cl propertyIdGroups
#  cl propertyId
#  cl currentDifference
  if currentDifference is idealDistance or apps.length is 1 or not propertyId
    url = "/" + category.slug + "/results"
  else
    url = "/" + category.slug + "/" + share.Properties.findOne(propertyId).slug
  Router.go(url)

share.allResults = (category) ->
  share.Apps.find({categoryId: category._id})

share.filteredResults = (category) ->
  appSelector = {categoryId: category._id}
  requiredPropertyIds = amplify.store("requiredPropertyIds")
  if requiredPropertyIds.length
    appSelector.propertyIds = {$all: requiredPropertyIds}
  share.Apps.find(appSelector)

amplify.push = (key, element) ->
  value = amplify.store(key) or []
  value.push(element)
  amplify.store(key, value)
