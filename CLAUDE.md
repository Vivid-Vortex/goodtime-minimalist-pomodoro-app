firestore database entry as 29-10-2025 where 29 is data, 10 is month and 2025 is year 

I have pasted the google-services.json file in this andriodApp folder of this project. Kinldy add the "Save to cloud" option under Backup and restore section of this app.

Data saving logic per tag:
Say the user ran the timer for tag named as ESS, then you have to look into the collection named timesheet_entries and then go the document
identified by that data for which data is getting saved for (take care of date conversion but don't modify anything int he collection only save the data). Then you have look into formData.tagSnapshot, these ESS tag will be present in the value of one of the keys of tagSnapshot.
If no tag with that name found then show the error with diaglog box as no tag with name ESS found in db.

timesheet_entries collection json format:
 {
    "id": "29-10-2025",
    "createdAt": 1730208645000,
    "formData": {
      "tagSnapshot": {
        "avdhanaMode": "AV",
        "wcmn": "WCMN",
        "essentials": "ESS",
        "finance": "FIN",
        ...
      },
      "avdhanaMode": "60",
      "work1ToWork4Ikigai": "120",
      "spentOnEssentials": "45",
      "finance": "20",
      ...
    }
  }

In case if you're not able to find the document if with that particular date say 29-18-2025 (mm-dd-yyyy) in the collection timesheet_entries, then push below mentioned complete json strucure with above mentioned "Data saving logic per tag" section logic. 
Please note that you must send the entire json structre as given below as the other fields will be populated by the third party system.

Entire json structre:
{
    "id": "29-10-2025",
    "createdAt": 1730208645000,
    "formData": {
      "entryDate": 1730160000000,

      "tagSnapshot": {
        "avdhanaMode": "AV",
        "wcmn": "WCMN",
        "work3": "W3",
        "work4": "W4",
        "work2": "W2",
        "work5": "W5",
        "ltg": "LTG",
        "timeWasted": "TW",
        "essentials": "ESS",
        "finance": "FIN",
        "others": "OTH",
        "work1Main": "W1M",
        "work1Misc": "W1X",
        "projectManagement": "PM",
        "learning": "LRN",
        "meditation": "MED",
        "exercise": "EXE"
      },

      "intoxNo": "5",
      "mbtNo": "3",
      "topPriorityTime": "30",
      "topPriorityThinking": "Yes",
      "playedFirstThingComesToMindGame": true,

      "thinking": true,
      "issue": "NONE",
      "issueOtherText": "",

      "onTimeSleep": true,
      "mpvOfSleep": true,
      "wakedUpAt4Am": true,
      "selfAndSurroundingVastu": true,

      "twentyMinsLearning": true,
      "thirtyMinsMeditation": true,
      "sixtyMinsExercise": true,

      "overallHealthStatus": 4,

      "phase2Sleep": false,
      "minimum270Min": true,
      "dayProductivity": "PRODUCTIVE",
      "timePocketFollowed": true,
      "youtubeTimeUtilizerDocFollowed": true,

      "wastedMoreThan15Mins": true,
      "approxWastedMinutes": 45,
      "activity1": "Social Media",
      "activity2": "YouTube",
      "activity3": "",
      "activity4": "",
      "activity5": "",

      "pomodoroFollowed": true,
      "sprint": 8,

      "avdhanaMode": "60",
      "work1ToWork4Ikigai": "120",
      "work3Udemy": "30",
      "work4TechWebsite": "45",
      "work2Youtube": "20",
      "work5OnlineSale": "15",
      "ltgLongTermGoal": "90",
      "timeWasted": "30",
      "spentOnEssentials": "45",
      "finance": "20",
      "others": "10",

      "work1Main": "180",
      "work1Misc": "60",
      "projectManagement": "40",

      "learning": "20",
      "meditation": "30",
      "exercise": "60",

      "mitsCompletedWithin270To360Mins": true,
      "total": "475",
      "completed270MinsBeforeSixPm": true,
      "ableToCompleteDaysMits": true,

      "carpeMomentum1440FollowedToday": true,
      "timePocketFollowedToday": true,
      "productivityPointsSuccessDocFollowed": true,
      "anchorPoints": true,

      "sitStraightFor2Sprints": true,
      "didEverythingTimeBound": true,
      "followed4To4Policy": true,
      "ateBreakfastDistractionFree": true,
      "satOnTimeAfterDWT3": true,

      "relaxationAfter2Sprints": "15 mins after every 2 sprints",
      "sleepPhase1": "7 hours night sleep",
      "sleepPhase2": "1 hour afternoon nap",
      "pppw": "Weekly planning session",
      "tppw": "Time tracking review",
      "entertainment": "1 hour Netflix"
    }
  }
	
New Json structure:
 {
    "id": "30-10-2025",
    "createdAt": 1730332800000,
    "formData": {
      "entryDate": 1730332800000,

      "tagSnapshot": {
        "avdhanaMode": "AV",
        "wcmn": "WCMN",
        "work3": "W3",
        "work4": "W4",
        "work2": "W2",
        "work5": "W5",
        "ltg": "LTG",
        "timeWasted": "TW",
        "essentials": "ESS",
        "finance": "FIN",
        "others": "OTH",
        "work1Main": "W1M",
        "work1Misc": "W1X",
        "projectManagement": "PM",
        "learning": "LRN",
        "meditation": "MED",
        "exercise": "EXE"
      },

      "intoxNo": "N/A",
      "mbtNo": "N/A",
      "topPriorityTime": "",
      "topPriorityThinking": "N/A",
      "playedFirstThingComesToMindGame": false,

      "thinking": true,
      "issue": "NONE",
      "issueOtherText": "",

      "onTimeSleep": false,
      "mpvOfSleep": false,
      "wakedUpAt4Am": false,
      "selfAndSurroundingVastu": false,

      "twentyMinsLearning": false,
      "thirtyMinsMeditation": false,
      "sixtyMinsExercise": false,

      "overallHealthStatus": 1,

      "phase2Sleep": false,
      "minimum270Min": false,
      "dayProductivity": "PRODUCTIVE",
      "timePocketFollowed": false,
      "youtubeTimeUtilizerDocFollowed": false,

      "wastedMoreThan15Mins": false,
      "approxWastedMinutes": 0,
      "activity1": "",
      "activity2": "",
      "activity3": "",
      "activity4": "",
      "activity5": "",

      "pomodoroFollowed": false,
      "sprint": 6,

      "avdhanaMode": "",
      "work1ToWork4Ikigai": "",
      "work3Udemy": "",
      "work4TechWebsite": "",
      "work2Youtube": "",
      "work5OnlineSale": "",
      "ltgLongTermGoal": "",
      "timeWasted": "",
      "spentOnEssentials": "",
      "finance": "",
      "others": "",

      "work1Main": "",
      "work1Misc": "",
      "projectManagement": "",

      "learning": "",
      "meditation": "",
      "exercise": "",

      "mitsCompletedWithin270To360Mins": false,
      "total": "",
      "completed270MinsBeforeSixPm": false,
      "ableToCompleteDaysMits": false,

      "carpeMomentum1440FollowedToday": false,
      "timePocketFollowedToday": false,
      "productivityPointsSuccessDocFollowed": false,
      "anchorPoints": false,

      "sitStraightFor2Sprints": false,
      "didEverythingTimeBound": false,
      "followed4To4Policy": false,
      "ateBreakfastDistractionFree": false,
      "satOnTimeAfterDWT3": false,

      "relaxationAfter2Sprints": "",
      "sleepPhase1": "",
      "sleepPhase2": "",
      "pppw": "",
      "tppw": "",
      "entertainment": ""
    }
  }
	
---
Section 2:

First check why app name not changed form Goodtime to Pomodoro Auto.
Why the app is crashing when I am pressing Save to cloud button after instlling in the device.
---

