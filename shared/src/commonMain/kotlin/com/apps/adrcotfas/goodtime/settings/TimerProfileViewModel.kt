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
package com.apps.adrcotfas.goodtime.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apps.adrcotfas.goodtime.data.local.LocalDataRepository
import com.apps.adrcotfas.goodtime.data.local.backup.TimerProfileFirestoreHandler
import com.apps.adrcotfas.goodtime.data.model.Label
import com.apps.adrcotfas.goodtime.data.model.TimerProfile
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TimerProfileUiState(
    val isLoading: Boolean = true,
    val isPro: Boolean = true,
    val tmpLabel: Label = Label.defaultLabel(),
    val defaultLabel: Label = Label.defaultLabel(),
    val timerProfiles: List<TimerProfile> = emptyList(),
    /** Name of the profile that will be applied on the next timer reset. Null = no lock. */
    val lockedProfileName: String? = null,
    /** True when the last cloud save attempt failed — user should retry explicitly. */
    val hasPendingCloudSave: Boolean = false,
)

class TimerProfileViewModel(
    private val repo: LocalDataRepository,
    private val settingsRepository: SettingsRepository,
    private val firestoreHandler: TimerProfileFirestoreHandler? = null,
) : ViewModel() {
    private val _uiState = MutableStateFlow(TimerProfileUiState())
    val uiState =
        _uiState
            .onStart {
                loadData()
            }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TimerProfileUiState())

    private fun loadData() {
        viewModelScope.launch {
            combine(
                settingsRepository.settings.map { it.isPro to it.lockedTimerProfileName },
                repo.selectDefaultLabel().filterNotNull(),
                repo.selectAllTimerProfiles(),
            ) { (isPro, lockedName), defaultLabel, profiles ->
                Triple(Triple(isPro, lockedName, defaultLabel), profiles, Unit)
            }.collect { (inner, profiles, _) ->
                val (isPro, lockedName, defaultLabel) = inner
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isPro = isPro,
                        tmpLabel = if (!it.isLoading) it.tmpLabel else defaultLabel,
                        defaultLabel = defaultLabel,
                        timerProfiles = profiles,
                        lockedProfileName = lockedName.ifEmpty { null },
                    )
                }
            }
        }
    }

    /**
     * Immediately applies a named profile selection locally (no cloud save).
     * This updates the DB so TimerManager picks up the new duration right away.
     */
    fun selectProfile(label: Label) {
        viewModelScope.launch {
            repo.updateDefaultLabel(label)
            _uiState.update { it.copy(defaultLabel = label, tmpLabel = label) }
        }
    }

    fun saveChanges(label: Label) {
        viewModelScope.launch {
            repo.updateDefaultLabel(label)
            label.timerProfile.name?.let {
                repo.updateTimerProfile(label.timerProfile)
            }
            _uiState.update { it.copy(defaultLabel = label, tmpLabel = label) }
            // Attempt cloud save after every local save; track failure for retry button
            attemptCloudSave()
        }
    }

    private suspend fun attemptCloudSave() {
        val profiles = _uiState.value.timerProfiles
        if (firestoreHandler == null || profiles.isEmpty()) return
        firestoreHandler.saveProfilesToCloud(profiles).fold(
            onSuccess = {
                _uiState.update { it.copy(hasPendingCloudSave = false) }
                co.touchlab.kermit.Logger
                    .d { "Profiles saved to Firestore" }
            },
            onFailure = { error ->
                _uiState.update { it.copy(hasPendingCloudSave = true) }
                co.touchlab.kermit.Logger
                    .e { "Cloud save failed: ${error.message}" }
            },
        )
    }

    fun updateTmpLabel(
        newLabel: Label,
        resetProfile: Boolean = true,
    ) {
        _uiState.update {
            it.copy(
                tmpLabel =
                    if (resetProfile) {
                        newLabel.copy(timerProfile = newLabel.timerProfile.copy(name = null))
                    } else {
                        newLabel
                    },
            )
        }
    }

    fun createTimerProfile(timerProfile: TimerProfile) {
        viewModelScope.launch {
            repo.insertTimerProfileAndSetDefault(timerProfile)
        }
    }

    fun deleteTimerProfile(name: String) {
        viewModelScope.launch {
            if (_uiState.value.tmpLabel.timerProfile.name == name) {
                _uiState.update {
                    it.copy(
                        tmpLabel =
                            it.tmpLabel.copy(
                                timerProfile = it.tmpLabel.timerProfile.copy(name = null),
                            ),
                    )
                }
            }
            // If locked profile is deleted, clear the lock too
            if (_uiState.value.lockedProfileName == name) {
                settingsRepository.clearLockedTimerProfile()
            }
            repo.deleteTimerProfile(name)
            firestoreHandler?.deleteProfileFromCloud(name)?.fold(
                onSuccess = {
                    co.touchlab.kermit.Logger
                        .d { "Deleted profile '$name' from Firestore" }
                },
                onFailure = { error ->
                    co.touchlab.kermit.Logger
                        .e { "Failed to delete '$name' from Firestore: ${error.message}" }
                },
            )
        }
    }

    fun renameTimerProfile(
        oldName: String,
        newName: String,
    ) {
        viewModelScope.launch {
            repo.renameTimerProfile(oldName, newName)
            if (_uiState.value.tmpLabel.timerProfile.name == oldName) {
                _uiState.update {
                    it.copy(
                        tmpLabel =
                            it.tmpLabel.copy(
                                timerProfile = it.tmpLabel.timerProfile.copy(name = newName),
                            ),
                    )
                }
            }
            // Update locked profile name if it was renamed
            if (_uiState.value.lockedProfileName == oldName) {
                settingsRepository.setLockedTimerProfile(newName)
            }
        }
    }

    fun updateTimerProfile(profile: TimerProfile) {
        viewModelScope.launch {
            repo.updateTimerProfile(profile)
        }
    }

    fun lockProfile(name: String) {
        viewModelScope.launch {
            settingsRepository.setLockedTimerProfile(name)
        }
    }

    fun unlockProfile() {
        viewModelScope.launch {
            settingsRepository.clearLockedTimerProfile()
        }
    }

    fun saveProfilesToCloud() {
        viewModelScope.launch {
            attemptCloudSave()
        }
    }

    fun loadProfilesFromCloud() {
        viewModelScope.launch {
            firestoreHandler?.loadProfilesFromCloud()?.fold(
                onSuccess = { cloudProfiles ->
                    co.touchlab.kermit.Logger
                        .d { "Loaded ${cloudProfiles.size} profiles from Firestore" }
                    cloudProfiles.forEach { profile ->
                        profile.name?.let { repo.insertTimerProfile(profile) }
                    }
                },
                onFailure = { error ->
                    co.touchlab.kermit.Logger
                        .e { "Failed to load profiles from Firestore: ${error.message}" }
                },
            )
        }
    }
}
