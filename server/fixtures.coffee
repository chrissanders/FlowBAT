insertData = (data, collection) ->
  if collection.find().count() is 0
    for _id, object of data
      object._id = _id
      collection.insert(object)
    return true

share.loadFixtures = ->
  now = new Date()
  lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  users =
    MortenJohansen:
      _id: "MortenJohansen"
      profile:
        name: "Morten Johansen"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.morten@faster-than-wind.ru"
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
    DenisGorbachev:
      _id: "DenisGorbachev"
      profile:
        name: "Denis Gorbachev"
        locale: "en"
      emails: [
        {
          address: "denis.gorbachev+meetings.denis@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    JensStoltenberg:
      _id: "JensStoltenberg"
      profile:
        name: "Jens Stoltenberg"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.jens@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    ErnaSolberg:
      _id: "ErnaSolberg"
      profile:
        name: "Erna Solberg"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.erna@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    SivJensen:
      _id: "SivJensen"
      profile:
        name: "Siv Jensen"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.siv@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    KnutArildHareide:
      _id: "KnutArildHareide"
      profile:
        name: "Knut Arild Hareide"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.knut@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    LivSigneNavarsete:
      _id: "LivSigneNavarsete"
      profile:
        name: "Liv Signe Navarsete"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.liv@faster-than-wind.ru"
          verified: false
        }
      ]
      services:
        password: #123123
          srp:
            identity: "yE3SDLstoyKgho6aw"
            salt: "2KaD5ByuLFiB9D67m"
            verifier: "a9cd2d77478f4538a31651af4e9030a2e39da29ad335725054dcef3efd256caab0387964920bb924eddd17f8b20498a109e652ace08e514ed16cc0e38e352cde5edae0f56fae6feb3f37e4afee5ca96fb473fad9ab70d5a5307e662a377e79c9e4aa99e4fd5983d7ca2df98c07fd631f3a693da42ad92249b3b9fae36f7e8e40"
      createdAt: lastWeek
    TrineSkeiGrande:
      _id: "TrineSkeiGrande"
      profile:
        name: "Trine Skei Grande"
        locale: "no"
      emails: [
        {
          address: "denis.gorbachev+meetings.trine@faster-than-wind.ru"
          verified: false
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
      meetingId: "FirstMeeting"
    SecondSak:
      name: "Second sak"
      number: "02/14"
      maximumDuration: 15 * share.minute
      meetingId: "FirstMeeting"
    ThirdSak:
      name: "Third sak"
      number: "03/14"
      maximumDuration: 1.5 * 60 * share.minute
      meetingId: "FirstMeeting"
    FourthSak:
      name: "Fourth sak"
      number: "04/14"
      meetingId: "SecondMeeting"
    FifthSak:
      name: "Fifth sak"
      number: "05/14"
      meetingId: "SecondMeeting"
    SixthSak:
      name: "Sixth sak"
      number: "06/14"
      meetingId: "ThirdMeeting"

  insertData(saker, share.Saker)

  talks =
    MortenJohansenFirstSakTalk:
      sakId: "FirstSak"
      userId: "MortenJohansen"
    DenisGorbachevFirstSakTalk:
      sakId: "FirstSak"
      userId: "DenisGorbachev"
    JensStoltenbergSecondSakTalk:
      sakId: "SecondSak"
      userId: "JensStoltenberg"
    ErnaSolbergSecondSakTalk:
      sakId: "SecondSak"
      userId: "ErnaSolberg"
    KnutArildHareideSecondSakTalk:
      sakId: "SecondSak"
      userId: "KnutArildHareide"
    LivSigneNavarseteSecondSakTalk:
      sakId: "SecondSak"
      userId: "LivSigneNavarsete"

  insertData(talks, share.Talks)

  replies =
    MortenJohansenFirstSakTalkReplyByJensStoltenberg:
      talkId: "MortenJohansenFirstSakTalk"
      userId: "JensStoltenberg"
    MortenJohansenFirstSakTalkReplyBySivJensen:
      talkId: "MortenJohansenFirstSakTalk"
      userId: "SivJensen"

  insertData(replies, share.Replies)

#  AccountsLoginServiceConfigurationData = [
#    {
#      service: "google",
#      clientId: Meteor.settings.public.google.clientId,
#      secret: Meteor.settings.google.secret
#    }
#  ]
#  insertData(AccountsLoginServiceConfigurationData, Accounts.loginServiceConfiguration)
