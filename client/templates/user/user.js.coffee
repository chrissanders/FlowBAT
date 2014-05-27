Template.user.helpers
  isCurrentUser: ->
    @user._id is Meteor.userId()
