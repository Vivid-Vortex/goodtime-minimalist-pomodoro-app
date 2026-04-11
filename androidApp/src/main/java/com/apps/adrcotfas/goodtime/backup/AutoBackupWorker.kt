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
package com.apps.adrcotfas.goodtime.backup

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import co.touchlab.kermit.Logger
import com.apps.adrcotfas.goodtime.bl.TimerManager
import com.apps.adrcotfas.goodtime.bl.isActive
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncHandler
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncResult
import com.apps.adrcotfas.goodtime.data.settings.AppSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * WorkManager worker that performs auto cloud backup operation.
 * It syncs all sessions to Firestore cloud storage on a scheduled basis.
 */
class AutoBackupWorker(
    private val context: Context,
    private val settingsRepository: SettingsRepository,
    private val logger: Logger,
    params: WorkerParameters,
) : CoroutineWorker(context, params),
    KoinComponent {
    private val firestoreSyncHandler: FirestoreSyncHandler by inject()
    private val timerManager: TimerManager by inject()

    override suspend fun doWork(): Result {
        logger.i { "Starting midnight auto cloud backup worker" }

        try {
            val settings: AppSettings = settingsRepository.settings.first()

            if (!settings.cloudBackupSettings.autoCloudBackupEnabled) {
                logger.w { "Auto cloud backup is disabled, skipping backup" }
                return Result.failure()
            }

            // If the timer is currently active, complete it first so the session is saved
            val currentTimerState = timerManager.timerData.value
            if (currentTimerState.state.isActive) {
                logger.i { "Timer is active at midnight — completing current session before cloud push" }
                timerManager.skip()
                // Give the session time to persist to the local DB
                delay(2000)
            }

            // Sync all data to Firestore
            val result = firestoreSyncHandler.syncData()

            return when (result) {
                is FirestoreSyncResult.Success -> {
                    logger.i { "Auto cloud backup completed successfully" }
                    Result.success()
                }
                is FirestoreSyncResult.CloudData -> {
                    logger.i { "Auto cloud backup completed successfully" }
                    Result.success()
                }
                is FirestoreSyncResult.Error -> {
                    logger.e { "Auto cloud backup failed: ${result.message}" }
                    Result.retry()
                }
            }
        } catch (e: Exception) {
            logger.e(e) { "Auto cloud backup failed with exception" }
            return Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "auto_cloud_backup_work"
    }
}
