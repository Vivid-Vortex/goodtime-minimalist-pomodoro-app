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
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TimerProfileUiState(
    val isLoading: Boolean = true,
    val isPro: Boolean = true,
    val tmpLabel: Label = Label.defaultLabel(),
    val defaultLabel: Label = Label.defaultLabel(), // this does not change after initialization
    val timerProfiles: List<TimerProfile> = emptyList(),
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
                settingsRepository.settings.distinctUntilChanged { old, new ->
                    old.isPro == new.isPro
                },
                repo.selectDefaultLabel().filterNotNull(),
                repo.selectAllTimerProfiles(),
            ) { settings, defaultLabel, profiles ->
                Triple(settings, defaultLabel, profiles)
            }.collect { (settings, defaultLabel, profiles) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isPro = settings.isPro,
                        tmpLabel = if (!it.isLoading) it.tmpLabel else defaultLabel, // keep tmpLabel if already set
                        defaultLabel = defaultLabel,
                        timerProfiles = profiles,
                    )
                }
            }
        }
    }

    fun saveChanges(label: Label) {
        viewModelScope.launch {
            repo.updateDefaultLabel(label)
            // Section 15: Also update the timer profile if it's a named profile
            label.timerProfile.name?.let { profileName ->
                repo.updateTimerProfile(label.timerProfile)
            }
            _uiState.update {
                it.copy(defaultLabel = label)
            }
        }
    }

    fun updateTmpLabel(
        newLabel: Label,
        resetProfile: Boolean = true,
    ) {
        _uiState.update {
            it.copy(
                tmpLabel =
                    if (resetProfile) {
                        newLabel.copy(
                            timerProfile =
                                newLabel.timerProfile.copy(
                                    name = null,
                                ),
                        )
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
                                timerProfile =
                                    it.tmpLabel.timerProfile.copy(
                                        name = null,
                                    ),
                            ),
                    )
                }
            }
            repo.deleteTimerProfile(name)
            firestoreHandler?.deleteProfileFromCloud(name)?.fold(
                onSuccess = {
                    co.touchlab.kermit.Logger
                        .d { "Deleted profile '$name' from Firestore" }
                },
                onFailure = { error ->
                    co.touchlab.kermit.Logger
                        .e { "Failed to delete profile '$name' from Firestore: ${error.message}" }
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
            // Update tmpLabel if it was using the renamed profile
            if (_uiState.value.tmpLabel.timerProfile.name == oldName) {
                _uiState.update {
                    it.copy(
                        tmpLabel =
                            it.tmpLabel.copy(
                                timerProfile =
                                    it.tmpLabel.timerProfile.copy(
                                        name = newName,
                                    ),
                            ),
                    )
                }
            }
        }
    }

    fun updateTimerProfile(profile: TimerProfile) {
        viewModelScope.launch {
            repo.updateTimerProfile(profile)
        }
    }

    fun saveProfilesToCloud() {
        viewModelScope.launch {
            val profiles = _uiState.value.timerProfiles
            firestoreHandler?.saveProfilesToCloud(profiles)?.fold(
                onSuccess = {
                    co.touchlab.kermit.Logger
                        .d { "Successfully saved ${profiles.size} profiles to Firestore" }
                },
                onFailure = { error ->
                    co.touchlab.kermit.Logger
                        .e { "Failed to save profiles to Firestore: ${error.message}" }
                },
            )
        }
    }

    fun loadProfilesFromCloud() {
        viewModelScope.launch {
            firestoreHandler?.loadProfilesFromCloud()?.fold(
                onSuccess = { cloudProfiles ->
                    co.touchlab.kermit.Logger
                        .d { "Successfully loaded ${cloudProfiles.size} profiles from Firestore" }
                    // Merge cloud profiles with local profiles
                    cloudProfiles.forEach { profile ->
                        profile.name?.let { name ->
                            repo.insertTimerProfile(profile)
                        }
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
