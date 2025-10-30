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
package com.apps.adrcotfas.goodtime.data.local.backup

import android.util.Log
import com.apps.adrcotfas.goodtime.data.local.LocalSession
import com.apps.adrcotfas.goodtime.data.local.SessionDao
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

actual class FirestoreSyncHandler(
    private val sessionDao: SessionDao,
) {
    private val db = Firebase.firestore

    companion object {
        private const val TAG = "FirestoreSyncHandler"
    }

    actual suspend fun syncData(): FirestoreSyncResult =
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

    private suspend fun saveSessionToTimesheet(session: LocalSession): FirestoreSyncResult {
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
                            it.value == session.labelName
                        }?.key as? String

                if (fieldName == null) {
                    return FirestoreSyncResult.Error("No tag with name ${session.labelName} found in database")
                }

                // Update the field in formData
                // Duration is already in minutes, just use it directly
                val durationInMinutes = session.duration.toInt()

                // Get current value - could be string or number in Firestore
                val currentValue =
                    when (val value = formData[fieldName]) {
                        is String -> value.toIntOrNull() ?: 0
                        is Number -> value.toInt()
                        else -> 0
                    }
                val newValue = currentValue + durationInMinutes

                // Store as integer for Log Hours fields
                documentRef.update("formData.$fieldName", newValue).await()
                Log.d(TAG, "Updated $fieldName with value $newValue for date $documentId")
            } else {
                // Document doesn't exist, create it with the full structure (New Json structure from CLAUDE.md)
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
                                "intoxNo" to "N/A",
                                "mbtNo" to "N/A",
                                "topPriorityTime" to "",
                                "topPriorityThinking" to "N/A",
                                "playedFirstThingComesToMindGame" to false,
                                "thinking" to true,
                                "issue" to "NONE",
                                "issueOtherText" to "",
                                "onTimeSleep" to false,
                                "mpvOfSleep" to false,
                                "wakedUpAt4Am" to false,
                                "selfAndSurroundingVastu" to false,
                                "twentyMinsLearning" to false,
                                "thirtyMinsMeditation" to false,
                                "sixtyMinsExercise" to false,
                                "overallHealthStatus" to 1,
                                "phase2Sleep" to false,
                                "minimum270Min" to false,
                                "dayProductivity" to "PRODUCTIVE",
                                "timePocketFollowed" to false,
                                "youtubeTimeUtilizerDocFollowed" to false,
                                "wastedMoreThan15Mins" to false,
                                "approxWastedMinutes" to 0,
                                "activity1" to "",
                                "activity2" to "",
                                "activity3" to "",
                                "activity4" to "",
                                "activity5" to "",
                                "pomodoroFollowed" to false,
                                "sprint" to 6,
                                "avdhanaMode" to 0,
                                "work1ToWork4Ikigai" to 0,
                                "work3Udemy" to 0,
                                "work4TechWebsite" to 0,
                                "work2Youtube" to 0,
                                "work5OnlineSale" to 0,
                                "ltgLongTermGoal" to 0,
                                "timeWasted" to 0,
                                "spentOnEssentials" to 0,
                                "finance" to 0,
                                "others" to 0,
                                "work1Main" to 0,
                                "work1Misc" to 0,
                                "projectManagement" to 0,
                                "learning" to 0,
                                "meditation" to 0,
                                "exercise" to 0,
                                "mitsCompletedWithin270To360Mins" to false,
                                "total" to "",
                                "completed270MinsBeforeSixPm" to false,
                                "ableToCompleteDaysMits" to false,
                                "carpeMomentum1440FollowedToday" to false,
                                "timePocketFollowedToday" to false,
                                "productivityPointsSuccessDocFollowed" to false,
                                "anchorPoints" to false,
                                "sitStraightFor2Sprints" to false,
                                "didEverythingTimeBound" to false,
                                "followed4To4Policy" to false,
                                "ateBreakfastDistractionFree" to false,
                                "satOnTimeAfterDWT3" to false,
                                "relaxationAfter2Sprints" to "",
                                "sleepPhase1" to "",
                                "sleepPhase2" to "",
                                "pppw" to "",
                                "tppw" to "",
                                "entertainment" to "",
                            ),
                    )

                // Now find the field for this session's tag
                val tagSnapshot = (newDocument["formData"] as HashMap<*, *>)["tagSnapshot"] as? HashMap<*, *>
                val fieldName =
                    tagSnapshot
                        ?.entries
                        ?.find {
                            it.value == session.labelName
                        }?.key as? String

                if (fieldName == null) {
                    return FirestoreSyncResult.Error("No tag with name ${session.labelName} found in database")
                }

                // Set the duration for this session (duration is already in minutes)
                // Store as integer for Log Hours fields
                val durationInMinutes = session.duration.toInt()
                @Suppress("UNCHECKED_CAST")
                (newDocument["formData"] as HashMap<String, Any>)[fieldName] = durationInMinutes

                documentRef.set(newDocument).await()
                Log.d(TAG, "Created new document with ID: $documentId and set $fieldName to $durationInMinutes minutes")
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error saving session to timesheet", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
    }
}
