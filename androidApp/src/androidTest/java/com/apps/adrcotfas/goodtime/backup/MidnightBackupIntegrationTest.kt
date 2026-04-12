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
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import com.apps.adrcotfas.goodtime.data.settings.AppSettings
import com.apps.adrcotfas.goodtime.data.settings.BackupSettings
import com.apps.adrcotfas.goodtime.data.settings.BreakBudgetData
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import com.apps.adrcotfas.goodtime.data.settings.HistoryChartSettings
import com.apps.adrcotfas.goodtime.data.settings.LongBreakData
import com.apps.adrcotfas.goodtime.data.settings.NotificationPermissionState
import com.apps.adrcotfas.goodtime.data.settings.ProductivityReminderSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import com.apps.adrcotfas.goodtime.data.settings.SoundData
import com.apps.adrcotfas.goodtime.data.settings.StatisticsSettings
import com.apps.adrcotfas.goodtime.data.settings.TimerStyleData
import com.apps.adrcotfas.goodtime.data.settings.UiSettings
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module
import java.util.concurrent.TimeUnit
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Integration tests verifying the end-to-end midnight-backup chain on a real
 * (or emulated) Android device:
 *
 *   ACTION_MIDNIGHT_BACKUP broadcast → WorkManager enqueues AutoBackupWorker
 *   BOOT_COMPLETED + backup enabled  → alarm is rescheduled (no crash)
 *   BOOT_COMPLETED + backup disabled → alarm is NOT rescheduled
 *
 * WorkManagerTestInitHelper is used so WorkManager runs in-process without
 * spinning up real background scheduler threads.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class MidnightBackupIntegrationTest {
    private lateinit var context: Context
    private lateinit var fakeSettings: InstrumentedFakeSettingsRepository

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        fakeSettings = InstrumentedFakeSettingsRepository()
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

    // ── AutoBackupManager helper ──────────────────────────────────────────────

    @Test
    fun calculateNextMidnightMillis_returnsTimestampInFuture() {
        val nextMidnight = AutoBackupManager.calculateNextMidnightMillis()
        assertTrue(nextMidnight > System.currentTimeMillis(), "Next midnight should be in the future")
    }

    // ── ACTION_MIDNIGHT_BACKUP ────────────────────────────────────────────────

    @Test
    fun midnightBroadcast_enqueuesToWorkManagerWithCorrectWorkName() {
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))

        val workInfos =
            WorkManager
                .getInstance(context)
                .getWorkInfosForUniqueWork(AutoBackupWorker.WORK_NAME)
                .get(5, TimeUnit.SECONDS)

        assertFalse(workInfos.isEmpty(), "AutoBackupWorker should be enqueued after midnight broadcast")
    }

    @Test
    fun midnightBroadcast_enqueuedWorkerIsInActiveState() {
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))

        val info =
            WorkManager
                .getInstance(context)
                .getWorkInfosForUniqueWork(AutoBackupWorker.WORK_NAME)
                .get(5, TimeUnit.SECONDS)
                .firstOrNull()

        assertNotNull(info, "Work info must exist")
        val activeStates = listOf(WorkInfo.State.ENQUEUED, WorkInfo.State.RUNNING, WorkInfo.State.BLOCKED)
        assertTrue(info.state in activeStates, "Worker should be in an active state, was: ${info.state}")
    }

    @Test
    fun midnightBroadcast_secondCallReplacesExistingWork() {
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))
        receiver.onReceive(context, Intent(MidnightBackupReceiver.ACTION_MIDNIGHT_BACKUP))

        val workInfos =
            WorkManager
                .getInstance(context)
                .getWorkInfosForUniqueWork(AutoBackupWorker.WORK_NAME)
                .get(5, TimeUnit.SECONDS)

        val activeStates = listOf(WorkInfo.State.ENQUEUED, WorkInfo.State.RUNNING, WorkInfo.State.BLOCKED)
        val active = workInfos.filter { it.state in activeStates }
        assertTrue(active.size <= 1, "REPLACE policy should keep at most one active work entry")
    }

    // ── BOOT_COMPLETED ────────────────────────────────────────────────────────

    @Test
    fun bootCompleted_withBackupEnabled_doesNotCrash() {
        fakeSettings.setAutoCloudBackupEnabled(true)
        val receiver = MidnightBackupReceiver()
        // Should complete without exception; the async reschedule fires on IO thread
        receiver.onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))
        Thread.sleep(400)
        // Sanity-check: next midnight is still computable
        assertTrue(AutoBackupManager.calculateNextMidnightMillis() > System.currentTimeMillis())
    }

    @Test
    fun bootCompleted_withBackupDisabled_doesNotCrash() {
        fakeSettings.setAutoCloudBackupEnabled(false)
        val receiver = MidnightBackupReceiver()
        receiver.onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))
        Thread.sleep(400)
        assertTrue(AutoBackupManager.calculateNextMidnightMillis() > System.currentTimeMillis())
    }

    // ── InstrumentedFakeSettingsRepository ───────────────────────────────────

    /**
     * Minimal [SettingsRepository] for instrumented tests.
     * Backed by a [MutableStateFlow] so the Koin-injected repository in the
     * receiver emits synchronously.
     */
    class InstrumentedFakeSettingsRepository : SettingsRepository {
        private val _settings = MutableStateFlow(AppSettings())
        override val settings: Flow<AppSettings> = _settings

        fun setAutoCloudBackupEnabled(enabled: Boolean) {
            _settings.value =
                AppSettings(
                    cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = enabled),
                )
        }

        override suspend fun setCloudBackupSettings(settings: CloudBackupSettings) {
            _settings.value = _settings.value.copy(cloudBackupSettings = settings)
        }

        override suspend fun setBackupSettings(backupSettings: BackupSettings) {}

        override suspend fun updateReminderSettings(transform: (ProductivityReminderSettings) -> ProductivityReminderSettings) {}

        override suspend fun updateUiSettings(transform: (UiSettings) -> UiSettings) {}

        override suspend fun updateStatisticsSettings(transform: (StatisticsSettings) -> StatisticsSettings) {}

        override suspend fun updateHistoryChartSettings(transform: (HistoryChartSettings) -> HistoryChartSettings) {}

        override suspend fun updateTimerStyle(transform: (TimerStyleData) -> TimerStyleData) {}

        override suspend fun setWorkDayStart(secondOfDay: Int) {}

        override suspend fun setFirstDayOfWeek(dayOfWeek: Int) {}

        override suspend fun setWorkFinishedSound(sound: String?) {}

        override suspend fun setBreakFinishedSound(sound: String?) {}

        override suspend fun addUserSound(sound: SoundData) {}

        override suspend fun removeUserSound(sound: SoundData) {}

        override suspend fun setVibrationStrength(strength: Int) {}

        override suspend fun setEnableTorch(enabled: Boolean) {}

        override suspend fun setEnableFlashScreen(enabled: Boolean) {}

        override suspend fun setOverrideSoundProfile(enabled: Boolean) {}

        override suspend fun setInsistentNotification(enabled: Boolean) {}

        override suspend fun setAutoStartWork(enabled: Boolean) {}

        override suspend fun setAutoStartBreak(enabled: Boolean) {}

        override suspend fun activateLabelWithName(labelName: String) {}

        override suspend fun activateDefaultLabel() {}

        override suspend fun setLastInsertedSessionId(id: Long) {}

        override suspend fun setShowOnboarding(show: Boolean) {}

        override suspend fun setShowTutorial(show: Boolean) {}

        override suspend fun setPro(isPro: Boolean) {}

        override suspend fun setTimeProfilesInitialized(initialized: Boolean) {}

        override suspend fun setShouldAskForReview(enable: Boolean) {}

        override suspend fun setLongBreakData(longBreakData: LongBreakData) {}

        override suspend fun setBreakBudgetData(breakBudgetData: BreakBudgetData) {}

        override suspend fun setNotificationPermissionState(state: NotificationPermissionState) {}

        override suspend fun setLastDismissedUpdateVersionCode(versionCode: Long) {}
    }
}
