/**
 *     Goodtime Productivity
 *     Copyright (C) 2025 Adrian Cotfas
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.apps.adrcotfas.goodtime.data.firestore

import android.util.Log
import com.apps.adrcotfas.goodtime.data.local.LabelDao
import com.apps.adrcotfas.goodtime.data.local.SessionDao
import com.apps.adrcotfas.goodtime.data.local.TimerProfileDao
import com.apps.adrcotfas.goodtime.data.model.Session
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

sealed class FirestoreSyncResult {
    object Success : FirestoreSyncResult()

    data class Error(
        val message: String,
    ) : FirestoreSyncResult()
}

class FirestoreManager(
    private val sessionDao: SessionDao,
    private val labelDao: LabelDao,
    private val timerProfileDao: TimerProfileDao,
) {
    private val db = Firebase.firestore

    companion object {
        private const val TAG = "FirestoreManager"
    }

    suspend fun syncData(): FirestoreSyncResult =
        try {
            val sessions = sessionDao.selectAll().first()

            // Save each session to timesheet_entries
            for (session in sessions) {
                val result = saveSessionToTimesheet(session)
                if (result is FirestoreSyncResult.Error) {
                    // Log the error but continue with other sessions
                    Log.w(TAG, "Failed to sync session ${session.id}: ${result.message}")
                }
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing data", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }

    suspend fun saveSessionToTimesheet(session: Session): FirestoreSyncResult {
        return try {
            // Convert timestamp to DD-MM-YYYY format
            val instant = Instant.fromEpochMilliseconds(session.timestamp)
            val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            val documentId =
                String.format(
                    "%02d-%02d-%04d",
                    localDateTime.dayOfMonth,
                    localDateTime.monthNumber,
                    localDateTime.year,
                )

            val collectionRef = db.collection("timesheet_entries")
            val documentRef = collectionRef.document(documentId)

            // Fetch the document
            val document = documentRef.get().await()

            if (document.exists()) {
                // Document exists, update it
                val formData = document.get("formData") as? Map<*, *>
                val tagSnapshot = formData?.get("tagSnapshot") as? Map<*, *>

                if (tagSnapshot == null) {
                    return FirestoreSyncResult.Error("tagSnapshot not found in document")
                }

                // Find the field name for this tag
                val fieldName =
                    tagSnapshot.entries
                        .find {
                            it.value == session.label
                        }?.key as? String

                if (fieldName == null) {
                    return FirestoreSyncResult.Error("No tag with name ${session.label} found in database")
                }

                // Update the field in formData
                val currentValue = formData[fieldName] as? String ?: "0"
                val newValue = (currentValue.toIntOrNull() ?: 0) + session.duration.toInt()

                documentRef.update("formData.$fieldName", newValue.toString()).await()
                Log.d(TAG, "Updated $fieldName with value $newValue for date $documentId")
            } else {
                // Document doesn't exist, create it with the full structure
                val createdAt = System.currentTimeMillis()
                val entryDate = instant.toEpochMilliseconds()

                val newDocument =
                    hashMapOf(
                        "id" to documentId,
                        "createdAt" to createdAt,
                        "formData" to
                            hashMapOf(
                                "entryDate" to entryDate,
                                "tagSnapshot" to
                                    hashMapOf(
                                        "avdhanaMode" to "AV",
                                        "wcmn" to "WCMN",
                                        "work3" to "W3",
                                        "work4" to "W4",
                                        "work2" to "W2",
                                        "work5" to "W5",
                                        "ltg" to "LTG",
                                        "timeWasted" to "TW",
                                        "essentials" to "ESS",
                                        "finance" to "FIN",
                                        "others" to "OTH",
                                        "work1Main" to "W1M",
                                        "work1Misc" to "W1X",
                                        "projectManagement" to "PM",
                                        "learning" to "LRN",
                                        "meditation" to "MED",
                                        "exercise" to "EXE",
                                    ),
                                "intoxNo" to "5",
                                "mbtNo" to "3",
                                "topPriorityTime" to "30",
                                "topPriorityThinking" to "Yes",
                                "playedFirstThingComesToMindGame" to true,
                                "thinking" to true,
                                "issue" to "NONE",
                                "issueOtherText" to "",
                                "onTimeSleep" to true,
                                "mpvOfSleep" to true,
                                "wakedUpAt4Am" to true,
                                "selfAndSurroundingVastu" to true,
                                "twentyMinsLearning" to true,
                                "thirtyMinsMeditation" to true,
                                "sixtyMinsExercise" to true,
                                "overallHealthStatus" to 4,
                                "phase2Sleep" to false,
                                "minimum270Min" to true,
                                "dayProductivity" to "PRODUCTIVE",
                                "timePocketFollowed" to true,
                                "youtubeTimeUtilizerDocFollowed" to true,
                                "wastedMoreThan15Mins" to true,
                                "approxWastedMinutes" to 45,
                                "activity1" to "Social Media",
                                "activity2" to "YouTube",
                                "activity3" to "",
                                "activity4" to "",
                                "activity5" to "",
                                "pomodoroFollowed" to true,
                                "sprint" to 8,
                                "avdhanaMode" to "60",
                                "work1ToWork4Ikigai" to "120",
                                "work3Udemy" to "30",
                                "work4TechWebsite" to "45",
                                "work2Youtube" to "20",
                                "work5OnlineSale" to "15",
                                "ltgLongTermGoal" to "90",
                                "timeWasted" to "30",
                                "spentOnEssentials" to "45",
                                "finance" to "20",
                                "others" to "10",
                                "work1Main" to "180",
                                "work1Misc" to "60",
                                "projectManagement" to "40",
                                "learning" to "20",
                                "meditation" to "30",
                                "exercise" to "60",
                                "mitsCompletedWithin270To360Mins" to true,
                                "total" to "475",
                                "completed270MinsBeforeSixPm" to true,
                                "ableToCompleteDaysMits" to true,
                                "carpeMomentum1440FollowedToday" to true,
                                "timePocketFollowedToday" to true,
                                "productivityPointsSuccessDocFollowed" to true,
                                "anchorPoints" to true,
                                "sitStraightFor2Sprints" to true,
                                "didEverythingTimeBound" to true,
                                "followed4To4Policy" to true,
                                "ateBreakfastDistractionFree" to true,
                                "satOnTimeAfterDWT3" to true,
                                "relaxationAfter2Sprints" to "15 mins after every 2 sprints",
                                "sleepPhase1" to "7 hours night sleep",
                                "sleepPhase2" to "1 hour afternoon nap",
                                "pppw" to "Weekly planning session",
                                "tppw" to "Time tracking review",
                                "entertainment" to "1 hour Netflix",
                            ),
                    )

                // Now find the field for this session's tag
                val tagSnapshot = (newDocument["formData"] as HashMap<*, *>)["tagSnapshot"] as? HashMap<*, *>
                val fieldName =
                    tagSnapshot
                        ?.entries
                        ?.find {
                            it.value == session.label
                        }?.key as? String

                if (fieldName == null) {
                    return FirestoreSyncResult.Error("No tag with name ${session.label} found in database")
                }

                // Set the duration for this session
                @Suppress("UNCHECKED_CAST")
                (newDocument["formData"] as HashMap<String, Any>)[fieldName] = session.duration.toString()

                documentRef.set(newDocument).await()
                Log.d(TAG, "Created new document with ID: $documentId and set $fieldName to ${session.duration}")
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error saving session to timesheet", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
    }
}
