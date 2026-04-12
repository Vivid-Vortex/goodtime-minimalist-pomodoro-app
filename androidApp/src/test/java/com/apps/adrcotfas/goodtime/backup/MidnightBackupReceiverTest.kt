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
import android.app.Application
import android.content.Context
import android.content.Intent
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import com.apps.adrcotfas.goodtime.data.settings.AppSettings
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for [MidnightBackupReceiver].
 *
 * Coverage:
 *  - ACTION_MIDNIGHT_BACKUP → enqueues AutoBackupWorker + reschedules alarm
 *  - BOOT_COMPLETED + backup enabled → reschedules alarm
 *  - BOOT_COMPLETED + backup disabled → no alarm scheduled
 */
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [33])
class MidnightBackupReceiverTest {
    private lateinit var context: Context
    private lateinit var fakeSettings: TestFakeSettingsRepository

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        fakeSettings = TestFakeSettingsRepository()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        startKoin {
            modules(
                module {
                    single<SettingsRepository> { fakeSettings }
                },
            )
        }
    }

    @After
    fun tearDown() {
        stopKoin()
        AutoBackupManager.cancelMidnightAlarm(context)
    }

    // ── ACTION_MIDNIGHT_BACKUP ────────────────────────────────────────────────

    @Test
    fun `midnight broadcast enqueues AutoBackupWorker`() {
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))

        val workInfos =
            WorkManager
                .getInstance(context)
                .getWorkInfosForUniqueWork(AutoBackupWorker.WORK_NAME)
                .get()
        assertFalse(workInfos.isEmpty(), "AutoBackupWorker should be enqueued after midnight broadcast")
    }

    @Test
    fun `midnight broadcast reschedules the alarm for the next midnight`() {
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertFalse(scheduled.isEmpty(), "A new midnight alarm should be scheduled after the broadcast fires")
    }

    // ── BOOT_COMPLETED ────────────────────────────────────────────────────────

    @Test
    fun `boot-completed with backup enabled reschedules the midnight alarm`() {
        fakeSettings.emit(
            AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = true)),
        )
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))

        // goAsync() launches a coroutine on Dispatchers.IO; give it time to finish.
        Thread.sleep(300)

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertFalse(
            scheduled.isEmpty(),
            "Alarm should be rescheduled on boot when auto-backup is enabled",
        )
    }

    @Test
    fun `boot-completed with backup disabled does not schedule an alarm`() {
        fakeSettings.emit(
            AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = false)),
        )
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))

        Thread.sleep(300)

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertTrue(
            scheduled.isEmpty(),
            "No alarm should be scheduled on boot when auto-backup is disabled",
        )
    }

    // ── Constant ──────────────────────────────────────────────────────────────

    @Test
    fun `ACTION_MIDNIGHT_BACKUP constant matches manifest declaration`() {
        assertEquals(
            "com.apps.adrcotfas.goodtime.ACTION_MIDNIGHT_BACKUP",
            MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP,
        )
    }
}
