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
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import co.touchlab.kermit.Logger
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Manager for scheduling and canceling auto cloud backup operations.
 * It observes the CloudBackupSettings from SettingsRepository and schedules or cancels
 * the backup work accordingly.
 */
class AutoBackupManager(
    context: Context,
    private val settingsRepository: SettingsRepository,
    private val logger: Logger,
) {
    private val workManager = WorkManager.getInstance(context)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    init {
        logger.i { "AutoBackupManager initialized" }
        observeCloudBackupSettings()
    }

    private fun observeCloudBackupSettings() {
        scope.launch {
            settingsRepository.settings
                .map { it.cloudBackupSettings }
                .distinctUntilChanged()
                .collect { cloudBackupSettings ->
                    handleCloudBackupSettingsChange(cloudBackupSettings)
                }
        }
    }

    private fun handleCloudBackupSettingsChange(cloudBackupSettings: CloudBackupSettings) {
        logger.i {
            "Cloud backup settings changed: autoCloudBackupEnabled=${cloudBackupSettings.autoCloudBackupEnabled}"
        }

        if (cloudBackupSettings.autoCloudBackupEnabled) {
            scheduleCloudBackupAtMidnight()
            logger.i { "Auto cloud backup scheduled daily at midnight" }
        } else {
            cancelCloudBackup()
            logger.i { "Auto cloud backup canceled" }
        }
    }

    private fun scheduleCloudBackupAtMidnight() {
        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        val initialDelay = calculateMillisToNextMidnight()
        logger.i { "Auto cloud backup initial delay: ${initialDelay / 1000 / 60} minutes until midnight" }

        val backupWorkRequest =
            PeriodicWorkRequestBuilder<AutoBackupWorker>(
                repeatInterval = 24,
                repeatIntervalTimeUnit = TimeUnit.HOURS,
            ).setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.HOURS)
                .build()

        workManager.enqueueUniquePeriodicWork(
            AutoBackupWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.REPLACE,
            backupWorkRequest,
        )
    }

    /** Returns milliseconds until the next 12:00 AM (midnight). */
    private fun calculateMillisToNextMidnight(): Long {
        val now = Calendar.getInstance()
        val midnight =
            Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
        return midnight.timeInMillis - now.timeInMillis
    }

    private fun cancelCloudBackup() {
        logger.i { "Auto cloud backup canceled" }
        workManager.cancelUniqueWork(AutoBackupWorker.WORK_NAME)
    }
}
