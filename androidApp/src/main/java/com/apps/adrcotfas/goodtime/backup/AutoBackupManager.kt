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

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
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

/**
 * Manager for scheduling and canceling midnight cloud backup.
 * Uses AlarmManager.setExactAndAllowWhileIdle() so the alarm fires even
 * when the device is in Doze mode. No network constraint — Firestore
 * queues writes offline and syncs automatically when connectivity resumes.
 */
class AutoBackupManager(
    private val context: Context,
    private val settingsRepository: SettingsRepository,
    private val logger: Logger,
) {
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
            scheduleExactMidnightAlarm(context)
            val minutesUntilMidnight = (calculateNextMidnightMillis() - System.currentTimeMillis()) / 60_000
            logger.i { "Midnight backup scheduled via exact alarm ($minutesUntilMidnight min away)" }
        } else {
            cancelMidnightAlarm(context)
            logger.i { "Midnight backup alarm canceled" }
        }
    }

    companion object {
        private const val REQUEST_CODE = 1200

        fun scheduleExactMidnightAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                calculateNextMidnightMillis(),
                buildPendingIntent(context),
            )
        }

        fun cancelMidnightAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(buildPendingIntent(context))
        }

        /** Returns the epoch-millis timestamp of the next 00:00:00. */
        fun calculateNextMidnightMillis(): Long {
            val midnight =
                Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, 1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
            return midnight.timeInMillis
        }

        private fun buildPendingIntent(context: Context): PendingIntent {
            val intent =
                Intent(context, MidnightBackupReceiver::class.java).apply {
                    action = MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP
                }
            return PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
    }
}
