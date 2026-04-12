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
import co.touchlab.kermit.Logger
import co.touchlab.kermit.StaticConfig
import com.apps.adrcotfas.goodtime.data.settings.AppSettings
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.util.Calendar
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for [AutoBackupManager].
 *
 * Coverage:
 *  - [AutoBackupManager.calculateNextMidnightMillis] – pure Calendar math
 *  - [AutoBackupManager.scheduleExactMidnightAlarm] – AlarmManager interaction
 *  - [AutoBackupManager.cancelMidnightAlarm]         – AlarmManager interaction
 *  - Flow observation init path (enabled → schedule, disabled → cancel)
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [33])
class AutoBackupManagerTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var context: Context
    private lateinit var fakeSettings: TestFakeSettingsRepository

    @Before
    fun setUp() {
        // Replace Main dispatcher so AutoBackupManager's CoroutineScope(Dispatchers.Main)
        // runs eagerly inside our test.
        Dispatchers.setMain(testDispatcher)
        context = RuntimeEnvironment.getApplication()
        fakeSettings =
            TestFakeSettingsRepository(
                AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = false)),
            )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        AutoBackupManager.cancelMidnightAlarm(context)
    }

    // ── calculateNextMidnightMillis ───────────────────────────────────────────

    @Test
    fun `calculateNextMidnightMillis returns a timestamp strictly in the future`() {
        val result = AutoBackupManager.calculateNextMidnightMillis()
        assertTrue(result > System.currentTimeMillis(), "Expected midnight to be in the future")
    }

    @Test
    fun `calculateNextMidnightMillis returns exactly midnight (hour, minute, second, ms all zero)`() {
        val result = AutoBackupManager.calculateNextMidnightMillis()
        val cal = Calendar.getInstance().apply { timeInMillis = result }
        assertEquals(0, cal.get(Calendar.HOUR_OF_DAY), "Hour should be 0")
        assertEquals(0, cal.get(Calendar.MINUTE), "Minute should be 0")
        assertEquals(0, cal.get(Calendar.SECOND), "Second should be 0")
        assertEquals(0, cal.get(Calendar.MILLISECOND), "Millisecond should be 0")
    }

    @Test
    fun `calculateNextMidnightMillis returns the next calendar day`() {
        val result = AutoBackupManager.calculateNextMidnightMillis()
        val resultCal = Calendar.getInstance().apply { timeInMillis = result }
        val tomorrowCal = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }

        assertEquals(tomorrowCal.get(Calendar.DAY_OF_MONTH), resultCal.get(Calendar.DAY_OF_MONTH))
        assertEquals(tomorrowCal.get(Calendar.MONTH), resultCal.get(Calendar.MONTH))
        assertEquals(tomorrowCal.get(Calendar.YEAR), resultCal.get(Calendar.YEAR))
    }

    // ── scheduleExactMidnightAlarm ────────────────────────────────────────────

    @Test
    fun `scheduleExactMidnightAlarm registers an alarm in AlarmManager`() {
        AutoBackupManager.scheduleExactMidnightAlarm(context)

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertFalse(scheduled.isEmpty(), "AlarmManager should have at least one alarm after scheduling")
    }

    @Test
    fun `scheduleExactMidnightAlarm sets trigger time close to next midnight`() {
        AutoBackupManager.scheduleExactMidnightAlarm(context)

        val alarm =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
                .first()
        val expected = AutoBackupManager.calculateNextMidnightMillis()
        // Allow up to 1 second of drift between the two calculateNextMidnightMillis() calls
        assertTrue(
            kotlin.math.abs(alarm.triggerAtTime - expected) < 1_000L,
            "Alarm trigger time should match the next midnight within 1 s",
        )
    }

    @Test
    fun `calling scheduleExactMidnightAlarm twice does not double-register the alarm`() {
        AutoBackupManager.scheduleExactMidnightAlarm(context)
        AutoBackupManager.scheduleExactMidnightAlarm(context)

        val count =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms.size
        // FLAG_UPDATE_CURRENT reuses the same PendingIntent, so Robolectric sees only one entry
        assertEquals(1, count, "Duplicate schedule should reuse the same alarm slot")
    }

    // ── cancelMidnightAlarm ───────────────────────────────────────────────────

    @Test
    fun `cancelMidnightAlarm removes a previously scheduled alarm`() {
        AutoBackupManager.scheduleExactMidnightAlarm(context)
        AutoBackupManager.cancelMidnightAlarm(context)

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertTrue(scheduled.isEmpty(), "AlarmManager should have no alarms after cancellation")
    }

    @Test
    fun `cancelMidnightAlarm is a no-op when no alarm was previously scheduled`() {
        // Must not throw
        AutoBackupManager.cancelMidnightAlarm(context)

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertTrue(scheduled.isEmpty())
    }

    // ── Flow observation ──────────────────────────────────────────────────────

    @Test
    fun `AutoBackupManager with backup initially disabled does not schedule an alarm`() {
        AutoBackupManager(context, fakeSettings, Logger(StaticConfig()))

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertTrue(
            scheduled.isEmpty(),
            "No alarm should be scheduled when auto-backup starts disabled",
        )
    }

    @Test
    fun `enabling auto backup schedules an alarm`() {
        AutoBackupManager(context, fakeSettings, Logger(StaticConfig()))

        fakeSettings.emit(
            AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = true)),
        )

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertFalse(scheduled.isEmpty(), "Enabling auto-backup should schedule the midnight alarm")
    }

    @Test
    fun `disabling auto backup after it was enabled cancels the alarm`() {
        // Start with backup enabled so the alarm is scheduled on construction
        fakeSettings.emit(
            AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = true)),
        )
        AutoBackupManager(context, fakeSettings, Logger(StaticConfig()))

        // Now disable backup – the flow collector should cancel the alarm
        fakeSettings.emit(
            AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = false)),
        )

        val scheduled =
            shadowOf(context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .scheduledAlarms
        assertTrue(scheduled.isEmpty(), "Disabling auto-backup should cancel the midnight alarm")
    }
}
