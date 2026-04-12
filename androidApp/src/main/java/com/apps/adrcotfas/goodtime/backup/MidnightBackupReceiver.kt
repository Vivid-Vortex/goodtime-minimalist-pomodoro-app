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

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * BroadcastReceiver fired by AlarmManager at midnight (and on BOOT_COMPLETED
 * to reschedule after a device restart). Enqueues a one-time AutoBackupWorker
 * and immediately reschedules the alarm for the next midnight.
 *
 * Using AlarmManager.setExactAndAllowWhileIdle() means this fires even when
 * the device is in Doze mode — unlike WorkManager's PeriodicWorkRequest which
 * the OS can defer indefinitely during Doze.
 */
class MidnightBackupReceiver :
    BroadcastReceiver(),
    KoinComponent {
    private val settingsRepository: SettingsRepository by inject()

    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        when (intent.action) {
            ACTION_MIDNIGHT_BACKUP -> {
                triggerBackupAndReschedule(context)
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule the exact alarm after a device restart (alarms don't survive reboots)
                rescheduleIfEnabled(context)
            }
        }
    }

    private fun triggerBackupAndReschedule(context: Context) {
        WorkManager.getInstance(context).enqueueUniqueWork(
            AutoBackupWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<AutoBackupWorker>().build(),
        )
        // Always reschedule for the next midnight regardless of the backup outcome
        AutoBackupManager.scheduleExactMidnightAlarm(context)
    }

    private fun rescheduleIfEnabled(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val enabled =
                    settingsRepository.settings
                        .first()
                        .cloudBackupSettings.autoCloudBackupEnabled
                if (enabled) {
                    AutoBackupManager.scheduleExactMidnightAlarm(context)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val ACTION_MIDNIGHT_BACKUP = "com.apps.adrcotfas.goodtime.ACTION_MIDNIGHT_BACKUP"
    }
}
