insertData = (data, collection) ->
  if collection.find().count() is 0
    for _id, object of data
      object._id = _id
      object.isNew = false
      collection.insert(object)
    return true

share.loadFixtures = ->
  now = new Date()
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  users = {}
  userinfos = [
    {
      name: "Hjort, Jens Johan"
    }
    {
      name: "Skogman, Anni"
    }
    {
      name: "Lind, Rolleiv"
    }
    {
      name: "Barman-Jenssen, Knut"
    }
    {
      name: "Echroll, Lars"
    }
    {
      name: "Fossbakk, Frid Einarsdotter"
    }
    {
      name: "Larsen, Bodil Ridderseth"
    }
    {
      name: "Mæland, Magnus"
    }
  ]
  for userinfo in userinfos
    splinters = userinfo.name.split(",")
    name = splinters.reverse().join(" ")
    _id = name.replace(/[\s-]/g, "")
    users[_id] =
      _id: _id
      profile:
        name: name
        locale: "no"
        image: "/fixtures/" + _id + ".jpg"
      emails: [
        {
          address: "denis.gorbachev+meetings." + _id + "@faster-than-wind.ru"
          verified: true
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
  allUsersIds = []
  for user in users
    allUsersIds.push(user._id)
  insertData(users, Meteor.users)

  meetings =
    FirstMeeting:
      name: "First meeting"
    SecondMeeting:
      name: "Second meeting"
    ThirdMeeting:
      name: "Third meeting"

  insertData(meetings, share.Meetings)

  saker =
    FirstSak:
      name: "First sak"
      number: "01/14"
      maximumDuration: 2.0 * 60 * share.minute
      position: 1
      meetingId: "FirstMeeting"
    SecondSak:
      name: "Second sak"
      number: "02/14"
      maximumDuration: 15 * share.minute
      position: 2
      meetingId: "FirstMeeting"
    ThirdSak:
      name: "Third sak"
      number: "03/14"
      maximumDuration: 1.5 * 60 * share.minute
      position: 3
      meetingId: "FirstMeeting"
    FourthSak:
      name: "Fourth sak"
      number: "04/14"
      position: 1
      meetingId: "SecondMeeting"
    FifthSak:
      name: "Fifth sak"
      number: "05/14"
      position: 2
      meetingId: "SecondMeeting"
    SixthSak:
      name: "Sixth sak"
      number: "06/14"
      position: 1
      meetingId: "ThirdMeeting"

  insertData(saker, share.Saker)

  talks =
    JensJohanHjortFirstSakTalk:
      sakId: "FirstSak"
      userId: "JensJohanHjort"
    AnniSkogmanFirstSakTalk:
      sakId: "FirstSak"
      userId: "AnniSkogman"
    BodilRiddersethLarsenSecondSakTalk:
      sakId: "SecondSak"
      userId: "BodilRiddersethLarsen"
    FridEinarsdotterFossbakkSecondSakTalk:
      sakId: "SecondSak"
      userId: "FridEinarsdotterFossbakk"
    KnutBarmanJenssenSecondSakTalk:
      sakId: "SecondSak"
      userId: "KnutBarmanJenssen"
    LarsEchrollSecondSakTalk:
      sakId: "SecondSak"
      userId: "LarsEchroll"

  insertData(talks, share.Talks)

  replies =
    JensJohanHjortFirstSakTalkReplyByBodilRiddersethLarsen:
      talkId: "JensJohanHjortFirstSakTalk"
      userId: "BodilRiddersethLarsen"
    JensJohanHjortFirstSakTalkReplyByKnutBarmanJenssen:
      talkId: "JensJohanHjortFirstSakTalk"
      userId: "KnutBarmanJenssen"

  insertData(replies, share.Replies)

#  AccountsLoginServiceConfigurationData = [
#    {
#      service: "google",
#      clientId: Meteor.settings.public.google.clientId,
#      secret: Meteor.settings.google.secret
#    }
#  ]
#  insertData(AccountsLoginServiceConfigurationData, Accounts.loginServiceConfiguration)
