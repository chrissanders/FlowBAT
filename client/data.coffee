insertData = (data, collection) ->
  for _id, object of data
    object._id = _id
    collection.insert(object)

meetings =
  FirstMeeting:
    name: "First meeting"
    maximumDuration: 4.5 * share.hour
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
