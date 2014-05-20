insertData = (data, collection) ->
  for _id, object of data
    object._id = _id
    collection.insert(object)

meetings =
  FirstMeeting:
    name: "First meeting"
  SecondMeeting:
    name: "Second meeting"
  ThirdMeeting:
    name: "Third meeting"

insertData(meetings, share.Meetings)

issues =
  FirstIssue:
    name: "First issue"
    meetingId: "FirstMeeting"
  SecondIssue:
    name: "Second issue"
    meetingId: "FirstMeeting"
  ThirdIssue:
    name: "Third issue"
    meetingId: "FirstMeeting"
  FourthIssue:
    name: "Fourth issue"
    meetingId: "SecondMeeting"
  FifthIssue:
    name: "Fifth issue"
    meetingId: "SecondMeeting"
  SixthIssue:
    name: "Sixth issue"
    meetingId: "ThirdMeeting"

insertData(issues, share.Issues)
