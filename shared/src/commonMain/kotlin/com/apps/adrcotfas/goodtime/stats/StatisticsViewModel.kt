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
import com.apps.adrcotfas.goodtime.data.local.CloudCacheDao
import com.apps.adrcotfas.goodtime.data.local.LocalCloudHistoryEntry
import com.apps.adrcotfas.goodtime.data.local.LocalCloudTimelineEntry
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
    private val backupViewModel: com.apps.adrcotfas.goodtime.data.local.backup.BackupViewModel,
    private val cloudCacheDao: CloudCacheDao,
) : ViewModel() {
    private val _uiState = MutableStateFlow(StatisticsUiState())
    val uiState =
        _uiState
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), StatisticsUiState())

    init {
        loadData()
    }

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

        // Section 13: Statistics should use cloud data only, not local data
        viewModelScope.launch {
            co.touchlab.kermit.Logger
                .d { "Overview flow: Starting to collect cloudAggregatedData" }
            uiState
                .map { state ->
                    co.touchlab.kermit.Logger
                        .d { "Overview flow: Mapping state, cloudAggregatedData size=${state.cloudAggregatedData.size}" }
                    Pair(state.selectedLabels, state.cloudAggregatedData)
                }
                // Section 13: Remove distinctUntilChanged to ensure flow always triggers
                .collect { (selectedLabels, cloudAggregatedData) ->
                    co.touchlab.kermit.Logger
                        .d {
                            "Overview flow: Collected cloudAggregatedData size=${cloudAggregatedData.size}, selectedLabels=${selectedLabels.size}"
                        }
                    _uiState.update { it.copy(isLoading = true) }

                    val data =
                        withContext(Dispatchers.Default) {
                            // Section 13: Return empty statistics if no cloud data
                            if (cloudAggregatedData.isEmpty()) {
                                co.touchlab.kermit.Logger
                                    .d { "Overview flow: No cloud data, returning empty StatisticsData" }
                                return@withContext StatisticsData()
                            }

                            // Convert cloud aggregated data to AggregatedSession format
                            val cloudAggregatedSessions =
                                cloudAggregatedData.map { (key, duration) ->
                                    val parts = key.split("_", limit = 2)
                                    val timestamp = parts[0].toLongOrNull() ?: 0L
                                    val label = if (parts.size > 1) parts[1] else ""
                                    AggregatedSession(
                                        date = timestamp,
                                        label = label,
                                        totalDuration = duration,
                                    )
                                }

                            co.touchlab.kermit.Logger
                                .d { "Overview flow: Cloud aggregated sessions=${cloudAggregatedSessions.size}" }

                            // Filter aggregated sessions by selected labels
                            val filteredSessions =
                                if (selectedLabels.isEmpty()) {
                                    cloudAggregatedSessions
                                } else {
                                    cloudAggregatedSessions.filter { it.label in selectedLabels }
                                }

                            co.touchlab.kermit.Logger
                                .d { "Overview flow: Filtered sessions=${filteredSessions.size}" }

                            // Convert aggregated sessions to Session format for statistics computation
                            val sessions =
                                filteredSessions.map { aggSession ->
                                    Session(
                                        id = aggSession.date + aggSession.label.hashCode(),
                                        timestamp = aggSession.date,
                                        duration = aggSession.totalDuration,
                                        interruptions = 0,
                                        label = aggSession.label,
                                        notes = "",
                                        isWork = true,
                                        isArchived = false,
                                        deviceName = "",
                                    )
                                }

                            co.touchlab.kermit.Logger
                                .d { "Overview flow: Computing statistics from ${sessions.size} sessions (CLOUD DATA ONLY)" }

                            computeStatisticsData(
                                sessions = sessions,
                                firstDayOfWeek = uiState.value.firstDayOfWeek,
                                secondOfDay = uiState.value.workDayStart,
                            )
                        }

                    co.touchlab.kermit.Logger
                        .d { "Overview flow: Setting statisticsData - workTotal=${data.overviewData.workTotal}" }
                    _uiState.update { it.copy(statisticsData = data, isLoading = false) }
                }
        }

        // Timeline: Combine cloud data + unsynced local sessions
        viewModelScope.launch {
            localDataRepo.selectAllSessions().collect { allSessions ->
                // Always recompute Timeline when local sessions change
                // This ensures Timeline is always up-to-date
                computeTimelineData(allSessions)
            }
        }

        // Observe cloud data refresh events from BackupViewModel (after "Save to cloud")
        viewModelScope.launch {
            backupViewModel.cloudDataRefreshEvents.collect { result ->
                if (result is com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncResult.CloudData) {
                    co.touchlab.kermit.Logger
                        .d { "Received cloud refresh event: ${result.aggregatedData.size} entries" }

                    _uiState.update {
                        it.copy(
                            cloudAggregatedData = result.aggregatedData,
                            cloudAppHistorySessions = result.appHistorySessions,
                        )
                    }
                    co.touchlab.kermit.Logger
                        .d { "Updated cloudAggregatedData in state: ${_uiState.value.cloudAggregatedData.size} entries" }
                    persistCloudCache(result.aggregatedData, result.appHistorySessions)

                    // Always trigger recomputation with current sessions
                    val allSessions = localDataRepo.selectAllSessions().first()
                    computeTimelineData(allSessions)
                }
            }
        }

        // Load persisted cloud cache so data survives app restarts
        viewModelScope.launch {
            try {
                val timelineEntries = cloudCacheDao.getTimelineEntries()
                val historyEntries = cloudCacheDao.getHistoryEntries()
                if (timelineEntries.isNotEmpty()) {
                    val cloudAggregatedData = timelineEntries.associate { it.key to it.duration }
                    val cloudAppHistorySessions =
                        historyEntries.map { entry ->
                            com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession(
                                id = entry.id,
                                timestamp = entry.timestamp,
                                duration = entry.duration,
                                label = entry.label,
                                notes = entry.notes,
                                deviceName = entry.deviceName,
                                syncedAt = entry.syncedAt,
                            )
                        }
                    _uiState.update {
                        it.copy(
                            cloudAggregatedData = cloudAggregatedData,
                            cloudAppHistorySessions = cloudAppHistorySessions,
                        )
                    }
                    co.touchlab.kermit.Logger
                        .d { "Loaded ${timelineEntries.size} timeline + ${historyEntries.size} history entries from local cache" }
                }
            } catch (e: Exception) {
                co.touchlab.kermit.Logger
                    .e { "Failed to load cloud cache: ${e.message}" }
            }
        }
    }

    private fun persistCloudCache(
        aggregatedData: Map<String, Long>,
        appHistorySessions: List<com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession>,
    ) {
        viewModelScope.launch {
            try {
                cloudCacheDao.clearTimelineEntries()
                cloudCacheDao.upsertTimelineEntries(
                    aggregatedData.map { (key, duration) -> LocalCloudTimelineEntry(key, duration) },
                )
                cloudCacheDao.clearHistoryEntries()
                cloudCacheDao.upsertHistoryEntries(
                    appHistorySessions.map { s ->
                        LocalCloudHistoryEntry(
                            id = s.id,
                            timestamp = s.timestamp,
                            duration = s.duration,
                            label = s.label,
                            notes = s.notes,
                            deviceName = s.deviceName,
                            syncedAt = s.syncedAt,
                        )
                    },
                )
                co.touchlab.kermit.Logger
                    .d { "Persisted ${aggregatedData.size} timeline + ${appHistorySessions.size} history entries to local cache" }
            } catch (e: Exception) {
                co.touchlab.kermit.Logger
                    .e { "Failed to persist cloud cache: ${e.message}" }
            }
        }
    }

    private fun computeTimelineData(allSessions: List<Session>) {
        co.touchlab.kermit.Logger
            .d { "computeTimelineData: allSessions size=${allSessions.size}" }

        // Section 11: Filter sessions that are already added to Timeline
        val sessionsNotAddedToTimeline =
            allSessions.filter {
                !it.notes.contains("added_to_timeline:", ignoreCase = true)
            }

        val sessionsAlreadyInTimeline =
            allSessions.filter {
                it.notes.contains("added_to_timeline:", ignoreCase = true)
            }

        co.touchlab.kermit.Logger
            .d { "New sessions to add: ${sessionsNotAddedToTimeline.size}, Already in Timeline: ${sessionsAlreadyInTimeline.size}" }

        // Compute Timeline from sessions already marked
        val existingTimeline =
            sessionsAlreadyInTimeline
                .groupBy { session ->
                    val normalizedDate = (session.timestamp / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000)
                    Pair(normalizedDate, session.label)
                }.mapValues { (_, sessions) ->
                    sessions.sumOf { it.duration }
                }

        // Add new sessions to Timeline
        val newSessionsAggregate =
            sessionsNotAddedToTimeline
                .groupBy { session ->
                    val normalizedDate = (session.timestamp / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000)
                    Pair(normalizedDate, session.label)
                }.mapValues { (_, sessions) ->
                    sessions.sumOf { it.duration }
                }

        // Merge existing Timeline + new sessions
        val mergedTimeline = mutableMapOf<Pair<Long, String>, Long>()
        existingTimeline.forEach { (key, duration) ->
            mergedTimeline[key] = duration
        }
        newSessionsAggregate.forEach { (key, duration) ->
            val currentValue = mergedTimeline[key] ?: 0
            mergedTimeline[key] = currentValue + duration
        }

        // Convert to AggregatedSession list
        val timeline =
            mergedTimeline
                .map { (key, duration) ->
                    val (timestamp, label) = key
                    AggregatedSession(
                        date = timestamp,
                        label = label,
                        totalDuration = duration,
                    )
                }.sortedByDescending { it.date }

        co.touchlab.kermit.Logger
            .d { "computeTimelineData: Timeline entries=${timeline.size}" }

        _uiState.update { it.copy(aggregatedSessions = timeline) }

        // Section 13: Don't mark sessions as "added to timeline" in Local Data section
        // Only cloud sync should mark sessions as "synced to cloud"
        // The timeline is just for display/aggregation purposes
    }

    private suspend fun markSessionsAsAddedToTimeline(sessions: List<Session>) {
        sessions.forEach { session ->
            try {
                val timestamp =
                    kotlinx.datetime.Clock.System
                        .now()
                        .toEpochMilliseconds()
                val newNotes = "${session.notes} [added_to_timeline:$timestamp]"
                val updatedSession = session.copy(notes = newNotes)
                localDataRepo.updateSession(session.id, updatedSession)
                co.touchlab.kermit.Logger
                    .d { "Marked session ${session.id} as added to Timeline" }
            } catch (e: Exception) {
                co.touchlab.kermit.Logger
                    .e { "Failed to mark session ${session.id}: ${e.message}" }
            }
        }
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
            co.touchlab.kermit.Logger
                .d { "refreshFromCloud() called" }
            // Only fetch data from cloud, don't auto-push
            // User must explicitly use "Save to cloud" button to push data
            val result = firestoreSyncHandler?.fetchFromCloud() ?: FirestoreSyncResult.Error("Firebase not available")

            // Store cloud data and trigger Timeline recomputation
            if (result is FirestoreSyncResult.CloudData) {
                co.touchlab.kermit.Logger
                    .d { "refreshFromCloud: Got CloudData with ${result.aggregatedData.size} entries" }
                _uiState.update {
                    it.copy(
                        cloudAggregatedData = result.aggregatedData,
                        cloudAppHistorySessions = result.appHistorySessions,
                    )
                }
                co.touchlab.kermit.Logger
                    .d { "refreshFromCloud: Updated state, cloudAggregatedData size=${_uiState.value.cloudAggregatedData.size}" }
                persistCloudCache(result.aggregatedData, result.appHistorySessions)
                // Trigger recomputation with current sessions
                val allSessions = localDataRepo.selectAllSessions().first()
                computeTimelineData(allSessions)
            } else {
                co.touchlab.kermit.Logger
                    .e { "refreshFromCloud: Failed - $result" }
            }
        }
    }

    // Section 13: Push local data to cloud (for Local Data section)
    fun pushToCloud() {
        viewModelScope.launch {
            co.touchlab.kermit.Logger
                .d { "pushToCloud() called" }
            val result = firestoreSyncHandler?.syncData() ?: FirestoreSyncResult.Error("Firebase not available")

            when (result) {
                is FirestoreSyncResult.Success -> {
                    co.touchlab.kermit.Logger
                        .d { "pushToCloud: Success" }
                }
                is FirestoreSyncResult.Error -> {
                    co.touchlab.kermit.Logger
                        .e { "pushToCloud: Failed - ${result.message}" }
                }
                else -> {
                    co.touchlab.kermit.Logger
                        .w { "pushToCloud: Unexpected result - $result" }
                }
            }
        }
    }
}
