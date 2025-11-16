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
import com.apps.adrcotfas.goodtime.data.model.TimerProfile
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.tasks.await

/**
 * Handles Firestore operations for Timer Profiles
 * Saves profiles to global_notes collection under timer_profiles document
 */
actual class TimerProfileFirestoreHandler actual constructor() {
    private val db = Firebase.firestore

    companion object {
        private const val TAG = "TimerProfileFirestore"
        private const val COLLECTION_GLOBAL_NOTES = "global_notes"
        private const val DOCUMENT_TIMER_PROFILES = "timer_profiles"
    }

    /**
     * Save timer profiles to Firestore
     */
    actual suspend fun saveProfilesToCloud(profiles: List<TimerProfile>): Result<Unit> =
        try {
            Log.d(TAG, "Saving ${profiles.size} profiles to Firestore")

            val profilesData =
                profiles.map { profile ->
                    mapOf(
                        "name" to profile.name,
                        "isCountdown" to profile.isCountdown,
                        "workDuration" to profile.workDuration,
                        "isBreakEnabled" to profile.isBreakEnabled,
                        "breakDuration" to profile.breakDuration,
                        "isLongBreakEnabled" to profile.isLongBreakEnabled,
                        "longBreakDuration" to profile.longBreakDuration,
                        "sessionsBeforeLongBreak" to profile.sessionsBeforeLongBreak,
                        "workBreakRatio" to profile.workBreakRatio,
                    )
                }

            val data =
                mapOf(
                    "profiles" to profilesData,
                    "lastUpdated" to System.currentTimeMillis(),
                )

            db
                .collection(COLLECTION_GLOBAL_NOTES)
                .document(DOCUMENT_TIMER_PROFILES)
                .set(data)
                .await()

            Log.d(TAG, "Successfully saved profiles to Firestore")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save profiles to Firestore", e)
            Result.failure(e)
        }

    /**
     * Load timer profiles from Firestore
     */
    actual suspend fun loadProfilesFromCloud(): Result<List<TimerProfile>> {
        return try {
            Log.d(TAG, "Loading profiles from Firestore")

            val document =
                db
                    .collection(COLLECTION_GLOBAL_NOTES)
                    .document(DOCUMENT_TIMER_PROFILES)
                    .get()
                    .await()

            if (!document.exists()) {
                Log.d(TAG, "No profiles found in Firestore")
                return Result.success(emptyList())
            }

            @Suppress("UNCHECKED_CAST")
            val profilesData = document.get("profiles") as? List<Map<String, Any>> ?: emptyList()

            val profiles =
                profilesData.mapNotNull { profileMap ->
                    try {
                        TimerProfile(
                            name = profileMap["name"] as? String,
                            isCountdown = profileMap["isCountdown"] as? Boolean ?: true,
                            workDuration = (profileMap["workDuration"] as? Long)?.toInt() ?: 25,
                            isBreakEnabled = profileMap["isBreakEnabled"] as? Boolean ?: true,
                            breakDuration = (profileMap["breakDuration"] as? Long)?.toInt() ?: 5,
                            isLongBreakEnabled = profileMap["isLongBreakEnabled"] as? Boolean ?: false,
                            longBreakDuration = (profileMap["longBreakDuration"] as? Long)?.toInt() ?: 15,
                            sessionsBeforeLongBreak = (profileMap["sessionsBeforeLongBreak"] as? Long)?.toInt() ?: 4,
                            workBreakRatio = (profileMap["workBreakRatio"] as? Long)?.toInt() ?: 3,
                        )
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse profile: $profileMap", e)
                        null
                    }
                }

            Log.d(TAG, "Successfully loaded ${profiles.size} profiles from Firestore")
            Result.success(profiles)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load profiles from Firestore", e)
            Result.failure(e)
        }
    }
}
