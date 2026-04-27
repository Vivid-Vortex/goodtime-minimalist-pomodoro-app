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
import kotlinx.coroutines.flow.asStateFlow

/**
 * Minimal fake SettingsRepository used only by androidApp backup unit tests.
 * All methods not relevant to backup tests are no-ops.
 */
class TestFakeSettingsRepository(
    initialSettings: AppSettings = AppSettings(),
) : SettingsRepository {
    private val _settings = MutableStateFlow(initialSettings)
    override val settings: Flow<AppSettings> = _settings.asStateFlow()

    /** Directly overwrite the entire settings value (for test setup). */
    fun emit(newSettings: AppSettings) {
        _settings.value = newSettings
    }

    override suspend fun setCloudBackupSettings(cloudBackupSettings: CloudBackupSettings) {
        _settings.value = _settings.value.copy(cloudBackupSettings = cloudBackupSettings)
    }

    override suspend fun setBackupSettings(backupSettings: BackupSettings) {
        _settings.value = _settings.value.copy(backupSettings = backupSettings)
    }

    // ── Stubs (not exercised by backup tests) ─────────────────────────────────
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

    override suspend fun setLockedTimerProfile(name: String) {}

    override suspend fun clearLockedTimerProfile() {}
}
