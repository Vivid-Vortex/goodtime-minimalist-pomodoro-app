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
package com.apps.adrcotfas.goodtime.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.map
import com.apps.adrcotfas.goodtime.bl.LabelData
import com.apps.adrcotfas.goodtime.bl.TimeProvider
import com.apps.adrcotfas.goodtime.data.local.LocalDataRepository
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncHandler
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncResult
import com.apps.adrcotfas.goodtime.data.model.Label
import com.apps.adrcotfas.goodtime.data.model.Session
import com.apps.adrcotfas.goodtime.data.model.getLabelData
import com.apps.adrcotfas.goodtime.data.model.toExternal
import com.apps.adrcotfas.goodtime.data.settings.OverviewDurationType
import com.apps.adrcotfas.goodtime.data.settings.OverviewType
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import com.apps.adrcotfas.goodtime.data.settings.StatisticsSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.datetime.DayOfWeek

data class AggregatedSession(
    val date: Long, // normalized date (start of day)
    val label: String,
    val totalDuration: Long, // total minutes for this label on this date
)

data class StatisticsUiState(
    val isLoading: Boolean = true,
    val isPro: Boolean = false,
    val labels: List<LabelData> = emptyList(),
    val selectedLabels: List<String> = emptyList(),
    // Selection UI related fields
    val selectedSessions: List<Long> = emptyList(),
    val unselectedSessions: List<Long> = emptyList(), // for the case with select all active
    val selectedSessionsCountWhenAllSelected: Int = 0,
    val isSelectAllEnabled: Boolean = false,
    val selectedLabelToBulkEdit: String? = null,
    // Add/Edit session related fields
    val sessionToEdit: Session? = null, // this does not change after initialization
    val newSession: Session = Session.default(),
    val showAddSession: Boolean = false,
    val canSave: Boolean = true,
    // Overview Tab related fields
    val firstDayOfWeek: DayOfWeek = DayOfWeek.MONDAY,
    val workDayStart: Int = 0,
    val statisticsSettings: StatisticsSettings = StatisticsSettings(),
    val statisticsData: StatisticsData = StatisticsData(),
    val aggregatedSessions: List<AggregatedSession> = emptyList(),
    val cloudAggregatedData: Map<String, Long> = emptyMap(), // Cloud totals: "timestamp_label" -> duration
    // Cloud app history sessions from all devices
    val cloudAppHistorySessions: List<com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession> = emptyList(),
) {
    val showSelectionUi: Boolean
        get() = selectedSessions.isNotEmpty() || isSelectAllEnabled

    val selectionCount: Int
        get() =
            if (isSelectAllEnabled) {
                selectedSessionsCountWhenAllSelected - unselectedSessions.size
            } else {
                selectedSessions.size
            }
}

class StatisticsViewModel(
    private val localDataRepo: LocalDataRepository,
    private val settingsRepository: SettingsRepository,
    private val timeProvider: TimeProvider,
    private val firestoreSyncHandler: FirestoreSyncHandler?,
) : ViewModel() {
    private val _uiState = MutableStateFlow(StatisticsUiState())
    val uiState =
        _uiState
            .onStart { loadData() }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), StatisticsUiState())

    val pagedSessions: Flow<PagingData<Session>> =
        uiState
            .distinctUntilChanged { old, new ->
                old.selectedLabels == new.selectedLabels &&
                    old.statisticsSettings.showBreaks == new.statisticsSettings.showBreaks
            }.flatMapLatest {
                selectSessionsForTimelinePaged(it.selectedLabels, it.statisticsSettings.showBreaks)
            }

    private fun selectSessionsForTimelinePaged(
        labels: List<String>,
        showBreaks: Boolean,
    ): Flow<PagingData<Session>> =
        Pager(PagingConfig(pageSize = 50, prefetchDistance = 50)) {
            localDataRepo.selectSessionsForTimelinePaged(labels, showBreaks = showBreaks)
        }.flow.map { value ->
            value.map {
                it.toExternal()
            }
        }

    private fun loadData() {
        viewModelScope.launch {
            val settings = settingsRepository.settings.first()
            _uiState.update {
                it.copy(
                    isPro = settings.isPro,
                    workDayStart = settings.workdayStart,
                    firstDayOfWeek = DayOfWeek(settings.firstDayOfWeek),
                )
            }

            settingsRepository.settings
                .map { it.statisticsSettings }
                .distinctUntilChanged()
                .flatMapLatest { statisticsSettings ->
                    _uiState.update { it.copy(statisticsSettings = statisticsSettings) }
                    if (statisticsSettings.showArchived) {
                        localDataRepo.selectAllLabels()
                    } else {
                        localDataRepo.selectLabelsByArchived(isArchived = false)
                    }
                }.collect { labels ->
                    _uiState.update {
                        it.copy(
                            labels = labels.map { label -> label.getLabelData() },
                            selectedLabels = labels.map { label -> label.name },
                        )
                    }
                }
        }

        viewModelScope.launch {
            uiState
                .map { it.selectedLabels }
                .distinctUntilChanged()
                .flatMapLatest { selectedLabels ->
                    _uiState.update { it.copy(isLoading = true) }
                    localDataRepo
                        .selectSessionsByLabels(selectedLabels)
                        .map { sessions ->
                            withContext(Dispatchers.Default) {
                                computeStatisticsData(
                                    sessions = sessions,
                                    firstDayOfWeek = uiState.value.firstDayOfWeek,
                                    secondOfDay = uiState.value.workDayStart,
                                )
                            }
                        }
                }.collect { data ->
                    _uiState.update { it.copy(statisticsData = data, isLoading = false) }
                }
        }

        // Timeline: Combine cloud data + unsynced local sessions
        viewModelScope.launch {
            localDataRepo.selectAllSessions().collect { allSessions ->
                computeTimelineData(allSessions)
            }
        }

        // DO NOT auto-fetch on initialization
        // User must manually press refresh button or "Save to cloud"
    }

    private fun computeTimelineData(allSessions: List<Session>) {
        val cloudData = _uiState.value.cloudAggregatedData

        // Get unsynced local sessions only (those without cloud sync marker)
        val unsyncedSessions =
            allSessions.filter {
                !it.notes.contains("cloud_synced_at:", ignoreCase = true)
            }

        // Aggregate unsynced sessions by date and label
        val unsyncedAggregated =
            unsyncedSessions
                .groupBy { session ->
                    val normalizedDate = (session.timestamp / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000)
                    Pair(normalizedDate, session.label)
                }.mapValues { (_, sessions) ->
                    sessions.sumOf { it.duration }
                }

        // Merge cloud + unsynced local
        val mergedData = mutableMapOf<Pair<Long, String>, Long>()

        // Add cloud data
        cloudData.forEach { (key, duration) ->
            val parts = key.split("_")
            val timestamp = parts[0].toLong()
            val label = parts.drop(1).joinToString("_")
            mergedData[Pair(timestamp, label)] = duration
        }

        // Add unsynced local (on top of cloud)
        unsyncedAggregated.forEach { (key, duration) ->
            val currentValue = mergedData[key] ?: 0
            mergedData[key] = currentValue + duration
        }

        // Convert to AggregatedSession list
        val timeline =
            mergedData
                .map { (key, duration) ->
                    val (timestamp, label) = key
                    AggregatedSession(
                        date = timestamp,
                        label = label,
                        totalDuration = duration,
                    )
                }.sortedByDescending { it.date }

        _uiState.update { it.copy(aggregatedSessions = timeline) }
    }

    fun setSelectedLabels(selectedLabels: List<String>) {
        _uiState.update { it.copy(selectedLabels = selectedLabels) }
    }

    fun toggleSessionIsSelected(index: Long) {
        _uiState.update {
            if (it.isSelectAllEnabled) {
                val unselectedSessions = it.unselectedSessions.toMutableList()
                if (unselectedSessions.contains(index)) {
                    unselectedSessions.remove(index)
                } else {
                    unselectedSessions.add(index)
                }
                it.copy(
                    unselectedSessions = unselectedSessions,
                    isSelectAllEnabled = unselectedSessions.size != it.selectedSessionsCountWhenAllSelected,
                )
            } else {
                val selectedSessions = it.selectedSessions.toMutableList()
                if (selectedSessions.contains(index)) {
                    selectedSessions.remove(index)
                } else {
                    selectedSessions.add(index)
                }
                it.copy(selectedSessions = selectedSessions)
            }
        }
    }

    fun clearShowSelectionUi() {
        _uiState.update {
            it.copy(
                isSelectAllEnabled = false,
                selectedSessions = emptyList(),
                unselectedSessions = emptyList(),
                selectedSessionsCountWhenAllSelected = 0,
            )
        }
    }

    fun selectAllSessions(allSessionsCount: Int) {
        _uiState.update {
            it.copy(
                isSelectAllEnabled = true,
                selectedSessionsCountWhenAllSelected = allSessionsCount,
                selectedSessions = emptyList(),
                unselectedSessions = emptyList(),
            )
        }
    }

    fun deleteSelectedSessions() {
        viewModelScope.launch {
            if (uiState.value.isSelectAllEnabled) {
                localDataRepo.deleteSessionsExcept(
                    uiState.value.unselectedSessions,
                    uiState.value.selectedLabels,
                )
            } else {
                localDataRepo.deleteSessions(uiState.value.selectedSessions)
            }
        }
    }

    fun updateSessionToEdit(session: Session) {
        _uiState.update { state ->
            state.copy(newSession = session)
        }
    }

    fun setCanSave(isValid: Boolean) {
        _uiState.update { it.copy(canSave = isValid) }
    }

    fun saveSession() {
        viewModelScope.launch {
            val newSession = uiState.value.newSession
            val sessionToEditId = uiState.value.sessionToEdit?.id
            sessionToEditId?.let {
                localDataRepo.updateSession(newSession.id, newSession)
            } ?: localDataRepo.insertSession(newSession)
            settingsRepository.setShouldAskForReview(true)
        }
    }

    fun onAddEditSession(sessionToEdit: Session? = null) {
        val session = sessionToEdit ?: generateNewSession()
        _uiState.update {
            it.copy(
                sessionToEdit = sessionToEdit,
                newSession = session,
                showAddSession = true,
                canSave = sessionToEdit != null,
            )
        }
    }

    fun clearAddEditSession() {
        _uiState.update { it.copy(showAddSession = false) }
    }

    private fun generateNewSession(): Session =
        Session.create(
            duration = 0,
            timestamp = timeProvider.now(),
            interruptions = 0,
            label = Label.DEFAULT_LABEL_NAME,
            isWork = true,
        )

    fun setSelectedLabelToBulkEdit(label: String) {
        _uiState.update { it.copy(selectedLabelToBulkEdit = label) }
    }

    fun bulkEditLabel() {
        viewModelScope.launch {
            val label = uiState.value.selectedLabelToBulkEdit
            label?.let {
                if (uiState.value.isSelectAllEnabled) {
                    localDataRepo.updateSessionsLabelByIdsExcept(
                        label,
                        uiState.value.unselectedSessions,
                        uiState.value.selectedLabels,
                    )
                } else {
                    localDataRepo.updateSessionsLabelByIds(label, uiState.value.selectedSessions)
                }
            }
        }
    }

    fun setOverviewType(type: OverviewType) {
        viewModelScope.launch {
            settingsRepository.updateStatisticsSettings { it.copy(overviewType = type) }
        }
    }

    fun setOverviewDurationType(type: OverviewDurationType) {
        viewModelScope.launch {
            settingsRepository.updateStatisticsSettings { it.copy(overviewDurationType = type) }
        }
    }

    fun setPieChartViewType(type: OverviewDurationType) {
        viewModelScope.launch {
            settingsRepository.updateStatisticsSettings { it.copy(pieChartViewType = type) }
        }
    }

    fun setShouldAskForReview() = viewModelScope.launch { settingsRepository.setShouldAskForReview(true) }

    fun setShowBreaks(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepository.updateStatisticsSettings { it.copy(showBreaks = enabled) }
        }
    }

    fun setShowArchived(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepository.updateStatisticsSettings { it.copy(showArchived = enabled) }
        }
    }

    fun refreshFromCloud() {
        viewModelScope.launch {
            // Only fetch data from cloud, don't auto-push
            // User must explicitly use "Save to cloud" button to push data
            val result = firestoreSyncHandler?.fetchFromCloud() ?: FirestoreSyncResult.Error("Firebase not available")

            // Store cloud data and trigger Timeline recomputation
            if (result is FirestoreSyncResult.CloudData) {
                _uiState.update {
                    it.copy(
                        cloudAggregatedData = result.aggregatedData,
                        cloudAppHistorySessions = result.appHistorySessions,
                    )
                }
                // Trigger recomputation with current sessions
                val allSessions = localDataRepo.selectAllSessions().first()
                computeTimelineData(allSessions)
            }
        }
    }
}
