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
    name = splinters.reverse().join(" ").trim()
    _id = name.replace(/[^\w]/g, "")
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
    Kommunestyret:
      name: "Kommunestyret, 28.05.2014 0900"
    Forretningsutvalget:
      name: "Forretningsutvalget, 02.06.2014 1200"
    Byradet:
      name: "Byrådet, 19.06.2014 1200"

  insertData(meetings, share.Meetings)

  saker =
    KONTROLLUTVALGSSAK:
      name: "KONTROLLUTVALGSSAK 22/14 - BRANN OG REDNING	"
      number: "0075/14"
      maximumDuration: 2.0 * 60 * share.minute
      position: 1
      meetingId: "Kommunestyret"
    REGULERINGSPLAN:
      name: "PLAN- 1783- REGULERINGSPLAN FOR NEDRE VANGBERG, EIEND. 118/24 M.FL SAKSFREMLEGG TIL VEDTAK"
      number: "0076/14"
      maximumDuration: 15 * share.minute
      position: 2
      meetingId: "Kommunestyret"
    BOLIGBYGG:
      name: "PLAN -1762- NYTT BOLIGBYGG VED ST.ELISABETH"
      number: "0077/14"
      maximumDuration: 1.5 * 60 * share.minute
      position: 3
      meetingId: "Kommunestyret"
    FourthSak:
      name: "Fourth sak"
      number: "04/14"
      position: 1
      meetingId: "Forretningsutvalget"
    FifthSak:
      name: "Fifth sak"
      number: "05/14"
      position: 2
      meetingId: "Forretningsutvalget"
    SixthSak:
      name: "Sixth sak"
      number: "06/14"
      position: 1
      meetingId: "Byradet"

  insertData(saker, share.Saker)

  talks =
    JensJohanHjortKONTROLLUTVALGSSAKTalk:
      sakId: "KONTROLLUTVALGSSAK"
      userId: "JensJohanHjort"
    AnniSkogmanKONTROLLUTVALGSSAKTalk:
      sakId: "KONTROLLUTVALGSSAK"
      userId: "AnniSkogman"
    BodilRiddersethLarsenREGULERINGSPLANTalk:
      sakId: "REGULERINGSPLAN"
      userId: "BodilRiddersethLarsen"
    FridEinarsdotterFossbakkREGULERINGSPLANTalk:
      sakId: "REGULERINGSPLAN"
      userId: "FridEinarsdotterFossbakk"
    KnutBarmanJenssenREGULERINGSPLANTalk:
      sakId: "REGULERINGSPLAN"
      userId: "KnutBarmanJenssen"
    LarsEchrollREGULERINGSPLANTalk:
      sakId: "REGULERINGSPLAN"
      userId: "LarsEchroll"

  insertData(talks, share.Talks)

  replies =
    JensJohanHjortKONTROLLUTVALGSSAKTalkReplyByBodilRiddersethLarsen:
      talkId: "JensJohanHjortKONTROLLUTVALGSSAKTalk"
      userId: "BodilRiddersethLarsen"
    JensJohanHjortKONTROLLUTVALGSSAKTalkReplyByKnutBarmanJenssen:
      talkId: "JensJohanHjortKONTROLLUTVALGSSAKTalk"
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
