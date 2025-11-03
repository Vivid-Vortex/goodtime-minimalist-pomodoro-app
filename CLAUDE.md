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

mapping the tag to actual fields:	
W1M (inside tagsnapshot) -> work1Main(inside tagsnapshot) -> work1Main(outside tagsnapshot)
---
Section 2:

First check why app name not changed form Goodtime to Pomodoro Auto.
Why the app is crashing when I am pressing Save to cloud button after instlling in the device.
--- 
Section 3:
I tested the app with 1 mins duration saved locally in the app for tag W1M but when I clicked on the save to cloud section, then in the database corresponding data key in thish case is work1Main for W1M which is correct but saved wrong data as 0 in cloud which should be 1 as per the local duratin. 
Make sure we a all the time in the cloud db json under Log Hours should be saved in minutes, say 60, 500, 720 etc. anything but in minutes.
Kindly modiy auto back to do the manual schedulling back up which is decidedand set by user.
Keep the same icon but change it's color to mix of pink and voilet.

---  Pending
Section 4:
work1Main is still geting saved in the cloud db as "0" even though I am seeing W1M has 1 as the value in the app.

Make sure only these fields get saved in the json to firestore db as int (and other as String as before section 3 changes and I think boolen was boolena only before section 3 so keep that as is) and not string and correct why wrong data is being saved.

with fields 
"avdhanaMode": 0,
"work1ToWork4Ikigai": 0,
"work3Udemy": 0,
"work4TechWebsite": 0,
"work2Youtube": 0,
"work5OnlineSale": 0,
"ltgLongTermGoal": 0,
"timeWasted": 0,
"spentOnEssentials": 0,
"finance": 0,
"others": 0
"work1Main": 0,
"work1Misc": 0,
"projectManagement": 0
"learning": 0,
"meditation": 0,
"exercise": 0

So that the whole json would look like:

New Json structure-v2:
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

    "avdhanaMode": 0,
    "work1ToWork4Ikigai": 0,
    "work3Udemy": 0,
    "work4TechWebsite": 0,
    "work2Youtube": 0,
    "work5OnlineSale": 0,
    "ltgLongTermGoal": 0,
    "timeWasted": 0,
    "spentOnEssentials": 0,
    "finance": 0,
    "others": 0,

    "work1Main": 0,
    "work1Misc": 0,
    "projectManagement": 0,

    "learning": 0,
    "meditation": 0,
    "exercise": 0,

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


In the firestore db json structure, You have to find the tags under all the values of tagSnapshot,
then when matched take the key of that value and find that key outside tagSnapshot. And then update
the tag value in minutes in the app to that particualr value.

Say in order to update the current value of 1 under tag W1M locally,
W1M -> work1Main (under tagSnapshot) -> work1Main (outsie tagSnapshot) should be updated with in this case 1 because for W1M value for that day or today is 1.

form the json and then push it to cloud. 

And make sure that only one entry is crated for one date say 30-10-2025 no matter how many times user create/updates the data. Say If 30-10-2025 is already there then update it else form the json (as per New Json structure-v2) and push it.
---
Section 5:

1. If for one given date let's say more than 1 tag with same string say W1M is there, then add the minutes of those tags and then save it to work1Main in the json.

2. Also, I am still not seeing the auto back under Backup and restore changed to do the schedulling of pushing the data to cloud.

3. Kindly add refresh functinality under Statistics section of the app.

4. Make sure that Statistics section pulls the lastest data from cloud either through app refresh by user or at the time of app restart.

---
Section 6.
There will be two new section as below:
Create a new collection in db named as pomodoro_app_history. This should populate the data from every device the app is running one with the device name to show which device history is that. But the collection should be same. collectoin_id should be same as timesheet_entries as date format.

App History Section: This should populate the current data as shown in Timelien section under staticstis but in addition it should also fetch the data from db and show it along with the device name as badge to indicate which device it is from. You can give device name to indentify. Also, we should not use this section to calculate total or for analytics section. This is just for history.

Timeline Section: This should show the aggregated data for each label and should be used for analytics in statics section such as graph etc. For every lable only one data should be there for each date. Even if it is calculated from device or coming from cloud db.
If coming from cloud db, then overwirte this for every lable and don't add it for each date. Use this section for analytics purpose on the device such as or showing graph etc. 

Keep saving the new data from history section and add it to the cloud section before pushing tot he db. But only new data should be add to the one on cloud. Say if cloud is havin 276 or W1M and agin user ran 6 mins in the device, then add only 6 minutes to 276 and total 282 should be saved to db. Handle this for differnt device as the app would run on differnet device with same db.
---
Section 7:

 Step 1: Update Timeline to compute cloud totals + unsynced local sessions:
The app Timeline section is not calculating the time for each date correctly. It shoudl mimick whatever is present
  in cloud db "at the time of pulling the data from cloud". At the time of pushing the data, if at all any new timer
  data present in the app history section, then only it should add those extra minutes for that particular tag, for
  that particualr date to total in corresponding date and tag in Timeline and then while pusing the data to cloud db,
  it should replace the new updated data with the new one.

Remember app history is just for showing local device history, plus it shoud also pull the data from the cloud app
history collection (and push it to as well) and show the app history including the device name on it coz every app
history section should have a deivce name attached to it aloing with other key detials such as current format
timestamp. The timeline is the one which is aggregating the data inteligently and it should show the data right away
 alongside app history.
---
Section 8:
Fetch device name

---
Section 9:
It is not pushing the data correctly - In th App history section there are 2 LTG for 1 min each and 1 min w1x and 1min w1m1 for 3 Nov. But when in the timelien section only w1m and w1x data for 1 min is shwowing. It is pushing the data to cloud also it seems like direclty from app history, whihc should be the case. It should first aggregate the data correctly as per above section 7 and then push the data correctly to cloud.

It is not fetching the data correctly from cloud db as I can see ltg has 2 and w1m and w1x has 1 each for 3 Nov but in the app timeline it is only showing for w1m and w1x as 1 min each.

Device name showing vertically in app history.
Duplicate entry: Data was pull nd pushed from the same device, then why synced_to_cloud is showing "This device" whereas there is a duplicate entry for each tag but without synced_to_cloud and also in that device name is showoing as actual device name.
If the data is being from the same device then it should not show synced_to_cloud/synced_from_cloud. Only for other device ran data,
shoudl show synced_from_whatever device name. And no need of synced_to_cloud.
---