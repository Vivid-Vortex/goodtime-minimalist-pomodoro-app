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

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apps.adrcotfas.goodtime.data.settings.BackupSettings
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BackupUiState(
    val isLoading: Boolean = true,
    val isPro: Boolean = false,
    val isBackupInProgress: Boolean = false,
    val isCsvBackupInProgress: Boolean = false,
    val isJsonBackupInProgress: Boolean = false,
    val isRestoreInProgress: Boolean = false,
    val isSyncingWithFirestore: Boolean = false,
    val backupResult: Boolean? = null,
    val restoreResult: Boolean? = null,
    val firestoreSyncResult: Boolean? = null,
    val firestoreSyncError: String? = null,
    val backupSettings: BackupSettings = BackupSettings(),
    val cloudBackupSettings: CloudBackupSettings = CloudBackupSettings(),
)

expect class FirestoreSyncHandler {
    suspend fun syncData(): FirestoreSyncResult

    suspend fun fetchFromCloud(): FirestoreSyncResult
}

data class CloudAggregatedEntry(
    val timestamp: Long, // Start of day
    val label: String,
    val duration: Long, // Total minutes from cloud
)

data class CloudAppHistorySession(
    val id: Long,
    val timestamp: Long,
    val duration: Long,
    val label: String,
    val notes: String,
    val deviceName: String,
    val syncedAt: Long,
)

sealed class FirestoreSyncResult {
    object Success : FirestoreSyncResult()

    data class CloudData(
        val aggregatedData: Map<String, Long>, // Timeline: "timestamp_label" -> duration
        val appHistorySessions: List<CloudAppHistorySession> = emptyList(), // App History: raw sessions from all devices
    ) : FirestoreSyncResult()

    data class Error(
        val message: String,
    ) : FirestoreSyncResult()
}

class BackupViewModel(
    private val backupManager: BackupManager,
    private val settingsRepository: SettingsRepository,
    private val firestoreSyncHandler: FirestoreSyncHandler?,
    private val coroutineScope: CoroutineScope,
) : ViewModel() {
    private val _uiState = MutableStateFlow(BackupUiState())
    val uiState =
        _uiState
            .onStart { loadData() }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), BackupUiState())

    // Emit cloud data refresh events for StatisticsViewModel to observe
    private val _cloudDataRefreshEvents = MutableSharedFlow<FirestoreSyncResult>()
    val cloudDataRefreshEvents: SharedFlow<FirestoreSyncResult> = _cloudDataRefreshEvents.asSharedFlow()

    private fun loadData() {
        viewModelScope.launch {
            settingsRepository.settings
                .distinctUntilChanged { old, new ->
                    old.isPro == new.isPro &&
                        old.backupSettings == new.backupSettings &&
                        old.cloudBackupSettings == new.cloudBackupSettings
                }.collect { settings ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isPro = settings.isPro,
                            backupSettings = settings.backupSettings,
                            cloudBackupSettings = settings.cloudBackupSettings,
                        )
                    }
                }
        }
    }

    fun backup() {
        coroutineScope.launch {
            _uiState.update { it.copy(isBackupInProgress = true) }
            backupManager.backup { success ->
                _uiState.update {
                    it.copy(
                        backupResult = success,
                    )
                }
            }
        }
    }

    fun backupToCsv() {
        coroutineScope.launch {
            _uiState.update { it.copy(isCsvBackupInProgress = true) }
            backupManager.backupToCsv { success ->
                _uiState.update {
                    it.copy(
                        backupResult = success,
                    )
                }
            }
        }
    }

    fun backupToJson() {
        coroutineScope.launch {
            _uiState.update { it.copy(isJsonBackupInProgress = true) }
            backupManager.backupToJson { success ->
                _uiState.update {
                    it.copy(
                        backupResult = success,
                    )
                }
            }
        }
    }

    fun restore() {
        coroutineScope.launch {
            _uiState.update { it.copy(isRestoreInProgress = true) }
            backupManager.restore { success ->
                _uiState.update {
                    it.copy(
                        isRestoreInProgress = false,
                        restoreResult = success,
                    )
                }
            }
        }
    }

    fun syncWithFirestore() {
        coroutineScope.launch {
            _uiState.update { it.copy(isSyncingWithFirestore = true) }

            // IMPORTANT: Fetch cloud data FIRST to populate StatisticsViewModel state
            // This prevents Timeline from disappearing when sessions get marked as synced
            val existingCloudData = firestoreSyncHandler?.fetchFromCloud() ?: FirestoreSyncResult.Error("Firebase not available")
            if (existingCloudData is FirestoreSyncResult.CloudData) {
                _cloudDataRefreshEvents.emit(existingCloudData)
            }

            // Now sync new data to cloud (marks sessions as synced)
            val result = firestoreSyncHandler?.syncData() ?: FirestoreSyncResult.Error("Firebase not available")

            // Fetch again after sync to get the newly synced data
            if (result is FirestoreSyncResult.Success || result is FirestoreSyncResult.CloudData) {
                val fetchResult = firestoreSyncHandler?.fetchFromCloud() ?: FirestoreSyncResult.Error("Firebase not available")
                _cloudDataRefreshEvents.emit(fetchResult)
            }

            // IMPORTANT: Only set isSyncingWithFirestore = false AFTER final fetch
            // This keeps Timeline blocked during the entire sync process
            _uiState.update {
                it.copy(
                    isSyncingWithFirestore = false,
                    firestoreSyncResult = result is FirestoreSyncResult.Success || result is FirestoreSyncResult.CloudData,
                    firestoreSyncError =
                        if (result is FirestoreSyncResult.Error) {
                            result.message
                        } else {
                            null
                        },
                )
            }
        }
    }

    fun clearBackupError() = _uiState.update { it.copy(backupResult = null) }

    fun clearRestoreError() = _uiState.update { it.copy(restoreResult = null) }

    fun clearFirestoreSyncError() = _uiState.update { it.copy(firestoreSyncResult = null, firestoreSyncError = null) }

    fun clearProgress() =
        _uiState.update {
            it.copy(
                isBackupInProgress = false,
                isRestoreInProgress = false,
                isCsvBackupInProgress = false,
                isJsonBackupInProgress = false,
                isSyncingWithFirestore = false,
            )
        }

    fun setBackupSettings(settings: BackupSettings) {
        coroutineScope.launch {
            settingsRepository.setBackupSettings(settings)
        }
    }

    fun setCloudBackupSettings(settings: CloudBackupSettings) {
        coroutineScope.launch {
            settingsRepository.setCloudBackupSettings(settings)
        }
    }
}
