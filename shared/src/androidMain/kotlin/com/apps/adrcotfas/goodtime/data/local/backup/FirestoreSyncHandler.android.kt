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

import android.os.Build
import android.util.Log
import com.apps.adrcotfas.goodtime.data.local.LabelDao
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
    private val labelDao: LabelDao,
) {
    private val db = Firebase.firestore
    private val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"

    companion object {
        private const val TAG = "FirestoreSyncHandler"
        private const val COLLECTION_TIMESHEET = "timesheet_entries"
        private const val COLLECTION_APP_HISTORY = "pomodoro_app_history"
    }

    actual suspend fun syncData(): FirestoreSyncResult {
        return try {
            val allSessions = sessionDao.selectAll().first()

            // Filter only unsynced sessions (those without "cloud_synced_at" in notes)
            val unsyncedSessions =
                allSessions.filter {
                    !it.notes.contains("cloud_synced_at:", ignoreCase = true)
                }

            if (unsyncedSessions.isEmpty()) {
                Log.d(TAG, "No new sessions to sync")
                return FirestoreSyncResult.Success
            }

            Log.d(TAG, "Syncing ${unsyncedSessions.size} unsynced sessions")

            // Aggregate unsynced sessions by date and label
            val aggregated = aggregateSessionsByDateAndLabel(unsyncedSessions)

            // Save aggregated data to timesheet
            for ((key, totalDuration) in aggregated) {
                val (date, label) = key
                val timesheetResult = saveAggregatedToTimesheet(date, label, totalDuration)
                if (timesheetResult is FirestoreSyncResult.Error) {
                    Log.w(TAG, "Failed to sync aggregated data for $label on $date: ${timesheetResult.message}")
                }
            }

            // Save each unsynced session to app history
            for (session in unsyncedSessions) {
                val historyResult = saveSessionToAppHistory(session)
                if (historyResult is FirestoreSyncResult.Error) {
                    Log.w(TAG, "Failed to save to app history ${session.id}: ${historyResult.message}")
                } else {
                    // Mark session as synced by adding a hidden timestamp marker
                    markSessionAsSynced(session)
                }
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing data", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
    }

    private fun aggregateSessionsByDateAndLabel(sessions: List<LocalSession>): Map<Pair<String, String>, Long> {
        val aggregated = mutableMapOf<Pair<String, String>, Long>()

        for (session in sessions) {
            val instant = Instant.fromEpochMilliseconds(session.timestamp)
            val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            val dateKey =
                String.format(
                    "%02d-%02d-%04d",
                    localDateTime.dayOfMonth,
                    localDateTime.monthNumber,
                    localDateTime.year,
                )

            val key = Pair(dateKey, session.labelName)
            aggregated[key] = (aggregated[key] ?: 0) + session.duration
        }

        return aggregated
    }

    private suspend fun markSessionAsSynced(session: LocalSession) {
        try {
            // Add hidden timestamp marker that won't be displayed to user
            val syncMarker = "[cloud_synced_at:${System.currentTimeMillis()}]"
            val updatedNotes =
                if (session.notes.isEmpty()) {
                    syncMarker
                } else {
                    "${session.notes} $syncMarker"
                }
            sessionDao.updateNotes(session.id, updatedNotes)
        } catch (e: Exception) {
            Log.e(TAG, "Error marking session as synced", e)
        }
    }

    private suspend fun saveAggregatedToTimesheet(
        dateKey: String,
        label: String,
        durationToAdd: Long,
    ): FirestoreSyncResult {
        return try {
            val collectionRef = db.collection(COLLECTION_TIMESHEET)
            val documentRef = collectionRef.document(dateKey)

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
                        .find { it.value == label }
                        ?.key as? String

                if (fieldName == null) {
                    return FirestoreSyncResult.Error("No tag with name $label found in database")
                }

                // Get current value - could be string or number in Firestore
                val currentValue =
                    when (val value = formData[fieldName]) {
                        is String -> value.toIntOrNull() ?: 0
                        is Number -> value.toInt()
                        else -> 0
                    }
                val newValue = currentValue + durationToAdd.toInt()

                // Store as integer for Log Hours fields
                documentRef.update("formData.$fieldName", newValue).await()
                Log.d(TAG, "Updated $fieldName with value $newValue for date $dateKey (added $durationToAdd minutes)")
            } else {
                // Document doesn't exist, create it with the aggregated data
                createNewTimesheetDocument(dateKey, label, durationToAdd.toInt())
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error saving aggregated data to timesheet", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
    }

    private suspend fun createNewTimesheetDocument(
        dateKey: String,
        label: String,
        durationMinutes: Int,
    ) {
        val collectionRef = db.collection(COLLECTION_TIMESHEET)
        val documentRef = collectionRef.document(dateKey)

        val parts = dateKey.split("-")
        val day = parts[0].toInt()
        val month = parts[1].toInt()
        val year = parts[2].toInt()

        val calendar = java.util.Calendar.getInstance()
        calendar.set(year, month - 1, day, 0, 0, 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        val entryDate = calendar.timeInMillis

        val createdAt = System.currentTimeMillis()

        val newDocument = createBaseTimesheetStructure(dateKey, createdAt, entryDate)

        // Find field name for the label and set the duration
        val tagSnapshot = (newDocument["formData"] as HashMap<*, *>)["tagSnapshot"] as? HashMap<*, *>
        val fieldName = tagSnapshot?.entries?.find { it.value == label }?.key as? String

        if (fieldName != null) {
            @Suppress("UNCHECKED_CAST")
            (newDocument["formData"] as HashMap<String, Any>)[fieldName] = durationMinutes
            documentRef.set(newDocument).await()
            Log.d(TAG, "Created new document with ID: $dateKey and set $fieldName to $durationMinutes minutes")
        } else {
            Log.e(TAG, "No tag with name $label found in tagSnapshot")
        }
    }

    private fun createBaseTimesheetStructure(
        dateKey: String,
        createdAt: Long,
        entryDate: Long,
    ): HashMap<String, Any> =
        hashMapOf(
            "id" to dateKey,
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

    actual suspend fun fetchFromCloud(): FirestoreSyncResult {
        return try {
            Log.d(TAG, "Fetching aggregated data from cloud (Timeline data)...")

            val collectionRef = db.collection(COLLECTION_TIMESHEET)
            val querySnapshot = collectionRef.get().await()

            if (querySnapshot.isEmpty) {
                Log.d(TAG, "No cloud data found")
                return FirestoreSyncResult.CloudData(emptyMap())
            }

            // Store cloud aggregated data: Map<"timestamp_label", duration>
            val cloudAggregatedData = mutableMapOf<String, Long>()

            for (document in querySnapshot.documents) {
                try {
                    val dateKey = document.id // e.g., "29-10-2025"
                    val parts = dateKey.split("-")
                    if (parts.size != 3) continue

                    val day = parts[0].toIntOrNull() ?: continue
                    val month = parts[1].toIntOrNull() ?: continue
                    val year = parts[2].toIntOrNull() ?: continue

                    // Create timestamp for start of day
                    val calendar = java.util.Calendar.getInstance()
                    calendar.set(year, month - 1, day, 0, 0, 0)
                    calendar.set(java.util.Calendar.MILLISECOND, 0)
                    val timestamp = calendar.timeInMillis

                    val formData = document.get("formData") as? Map<*, *> ?: continue
                    val tagSnapshot = formData["tagSnapshot"] as? Map<*, *> ?: continue

                    // Mapping from tagSnapshot keys to outer field names (CLAUDE.md structure)
                    // First try long names, fallback to short names for third-party app compatibility
                    val tagSnapshotKeyToFieldNames =
                        mapOf(
                            "avdhanaMode" to listOf("avdhanaMode"),
                            "wcmn" to listOf("work1ToWork4Ikigai", "wcmn"),
                            "work3" to listOf("work3Udemy", "work3"),
                            "work4" to listOf("work4TechWebsite", "work4"),
                            "work2" to listOf("work2Youtube", "work2"),
                            "work5" to listOf("work5OnlineSale", "work5"),
                            "ltg" to listOf("ltgLongTermGoal", "ltg"),
                            "timeWasted" to listOf("timeWasted"),
                            "essentials" to listOf("spentOnEssentials", "essentials"),
                            "finance" to listOf("finance"),
                            "others" to listOf("others"),
                            "work1Main" to listOf("work1Main"),
                            "work1Misc" to listOf("work1Misc"),
                            "projectManagement" to listOf("projectManagement"),
                            "learning" to listOf("learning"),
                            "meditation" to listOf("meditation"),
                            "exercise" to listOf("exercise"),
                        )

                    // Process each tagSnapshot entry
                    for ((tagSnapshotKey, tagValue) in tagSnapshot) {
                        val tagKey = tagSnapshotKey.toString()
                        val tagCode = tagValue.toString()

                        // Get possible field names (try long name first, then short name)
                        val possibleFieldNames = tagSnapshotKeyToFieldNames[tagKey]

                        if (possibleFieldNames == null) {
                            Log.d(TAG, "No mapping found for tagSnapshot key: $tagKey (tagCode: $tagCode)")
                            continue
                        }

                        // Try each possible field name until we find one with data
                        var durationValue = 0
                        var usedFieldName = ""

                        for (fieldName in possibleFieldNames) {
                            val rawValue = formData[fieldName]
                            if (rawValue != null) {
                                durationValue =
                                    when (rawValue) {
                                        is Number -> rawValue.toInt()
                                        is String -> rawValue.toIntOrNull() ?: 0
                                        else -> 0
                                    }
                                if (durationValue > 0) {
                                    usedFieldName = fieldName
                                    Log.d(
                                        TAG,
                                        "Processing: tagKey=$tagKey, tagCode=$tagCode, fieldName=$fieldName, rawValue=$rawValue (${rawValue.javaClass.simpleName})",
                                    )
                                    break
                                }
                            }
                        }

                        if (durationValue > 0) {
                            // Store cloud data with key: "timestamp_label"
                            val key = "${timestamp}_$tagCode"
                            cloudAggregatedData[key] = durationValue.toLong()
                            Log.d(TAG, "✓ Fetched from cloud: $tagCode = $durationValue mins on $dateKey (field: $usedFieldName)")
                        } else {
                            Log.d(TAG, "✗ Skipping $tagCode: duration=$durationValue (tried fields: $possibleFieldNames)")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing document ${document.id}", e)
                    // Continue with next document
                }
            }

            Log.d(TAG, "Successfully fetched ${cloudAggregatedData.size} entries from cloud for Timeline")

            // Also fetch app history from pomodoro_app_history collection
            val appHistorySessions = fetchAppHistoryFromCloud()

            FirestoreSyncResult.CloudData(
                aggregatedData = cloudAggregatedData,
                appHistorySessions = appHistorySessions,
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching from cloud", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
    }

    private suspend fun fetchAppHistoryFromCloud(): List<com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession> =
        try {
            Log.d(TAG, "Fetching app history from pomodoro_app_history...")

            val appHistoryCollection = db.collection(COLLECTION_APP_HISTORY)
            val querySnapshot = appHistoryCollection.get().await()

            val sessions = mutableListOf<com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession>()

            for (document in querySnapshot.documents) {
                try {
                    val sessionsArray = document.get("sessions") as? List<*> ?: continue

                    for (sessionData in sessionsArray) {
                        val sessionMap = sessionData as? Map<*, *> ?: continue

                        val id = (sessionMap["id"] as? Number)?.toLong() ?: continue
                        val timestamp = (sessionMap["timestamp"] as? Number)?.toLong() ?: continue
                        val duration = (sessionMap["duration"] as? Number)?.toLong() ?: 0
                        val label = sessionMap["label"] as? String ?: continue
                        val notes = sessionMap["notes"] as? String ?: ""
                        val deviceName = sessionMap["deviceName"] as? String ?: "Unknown Device"
                        val syncedAt = (sessionMap["syncedAt"] as? Number)?.toLong() ?: timestamp

                        sessions.add(
                            com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession(
                                id = id,
                                timestamp = timestamp,
                                duration = duration,
                                label = label,
                                notes = notes,
                                deviceName = deviceName,
                                syncedAt = syncedAt,
                            ),
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing app history document ${document.id}", e)
                }
            }

            Log.d(TAG, "Fetched ${sessions.size} app history sessions from cloud")
            sessions
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching app history from cloud", e)
            emptyList()
        }

    private suspend fun saveSessionToAppHistory(session: LocalSession): FirestoreSyncResult =
        try {
            val instant = Instant.fromEpochMilliseconds(session.timestamp)
            val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            val documentId =
                String.format(
                    "%02d-%02d-%04d",
                    localDateTime.dayOfMonth,
                    localDateTime.monthNumber,
                    localDateTime.year,
                )

            val collectionRef = db.collection(COLLECTION_APP_HISTORY)
            val documentRef = collectionRef.document(documentId)

            // Fetch the document
            val document = documentRef.get().await()

            val sessionData =
                hashMapOf(
                    "id" to session.id,
                    "timestamp" to session.timestamp,
                    "duration" to session.duration.toInt(),
                    "label" to session.labelName,
                    "notes" to session.notes,
                    "deviceName" to deviceName,
                    "syncedAt" to System.currentTimeMillis(),
                )

            if (document.exists()) {
                // Document exists, add session to sessions array
                val sessions = document.get("sessions") as? List<*> ?: emptyList<Any>()

                // Check if this session already exists (by id)
                val sessionExists =
                    sessions.any {
                        (it as? Map<*, *>)?.get("id") == session.id
                    }

                if (!sessionExists) {
                    documentRef
                        .update(
                            "sessions",
                            com.google.firebase.firestore.FieldValue
                                .arrayUnion(sessionData),
                        ).await()
                    Log.d(TAG, "Added session to app history for date $documentId")
                }
            } else {
                // Document doesn't exist, create it
                val newDocument =
                    hashMapOf(
                        "id" to documentId,
                        "createdAt" to System.currentTimeMillis(),
                        "sessions" to listOf(sessionData),
                    )
                documentRef.set(newDocument).await()
                Log.d(TAG, "Created new app history document with ID: $documentId")
            }

            FirestoreSyncResult.Success
        } catch (e: Exception) {
            Log.e(TAG, "Error saving session to app history", e)
            FirestoreSyncResult.Error(e.message ?: "Unknown error")
        }
}
