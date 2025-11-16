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
package com.apps.adrcotfas.goodtime.settings.timerdurations

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.apps.adrcotfas.goodtime.data.model.TimerProfile
import com.apps.adrcotfas.goodtime.shared.R
import com.apps.adrcotfas.goodtime.ui.common.ConfirmationDialog
import compose.icons.EvaIcons
import compose.icons.evaicons.Outline
import compose.icons.evaicons.outline.Edit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerProfileBottomSheet(
    profiles: List<TimerProfile>,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onDelete: (String) -> Unit,
    onRename: (String, String) -> Unit = { _, _ -> }, // Section 14: Add rename callback
) {
    var showDeleteConfirmationDialog by remember { mutableStateOf(false) }
    var profileToDelete by remember { mutableStateOf<TimerProfile?>(null) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var profileToRename by remember { mutableStateOf<TimerProfile?>(null) }

    if (showDeleteConfirmationDialog) {
        ConfirmationDialog(
            title = stringResource(R.string.settings_delete_profile),
            subtitle =
                stringResource(
                    id = R.string.settings_delete_profile_confirmation,
                    profileToDelete?.name ?: "",
                ),
            onConfirm = {
                profileToDelete?.name?.let { onDelete(it) }
                showDeleteConfirmationDialog = false
            },
            onDismiss = { showDeleteConfirmationDialog = false },
        )
    }

    // Section 14: Rename dialog
    if (showRenameDialog && profileToRename != null) {
        RenameTimerProfileDialog(
            currentName = profileToRename?.name ?: "",
            existingNames = profiles.mapNotNull { it.name },
            onConfirm = { newName ->
                profileToRename?.name?.let { oldName ->
                    onRename(oldName, newName)
                }
                showRenameDialog = false
            },
            onDismiss = { showRenameDialog = false },
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        LazyColumn(modifier = Modifier.animateContentSize()) {
            items(profiles) { profile ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(4.dp),
                ) {
                    Text(
                        text = profile.name ?: "",
                        modifier = Modifier.padding(start = 16.dp),
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    // Section 14: Edit/Rename button
                    IconButton(onClick = {
                        profileToRename = profile
                        showRenameDialog = true
                    }) {
                        Icon(
                            imageVector = EvaIcons.Outline.Edit,
                            contentDescription =
                                stringResource(
                                    id = R.string.main_edit,
                                ),
                        )
                    }
                    IconButton(onClick = {
                        profileToDelete = profile
                        showDeleteConfirmationDialog = true
                    }) {
                        Icon(
                            imageVector = Icons.Outlined.Delete,
                            contentDescription =
                                stringResource(
                                    id = R.string.labels_delete,
                                    profile.name ?: "",
                                ),
                        )
                    }
                }
            }
        }
    }
}

// Section 14: Rename Timer Profile Dialog
@Composable
fun RenameTimerProfileDialog(
    currentName: String,
    existingNames: List<String>,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var newName by remember { mutableStateOf(currentName) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_rename_profile)) },
        text = {
            androidx.compose.foundation.layout.Column {
                androidx.compose.material3.OutlinedTextField(
                    value = newName,
                    onValueChange = {
                        newName = it
                        errorMessage =
                            when {
                                it.isBlank() -> "Name cannot be empty"
                                it != currentName && existingNames.contains(it) ->
                                    "Profile with this name already exists"
                                else -> null
                            }
                    },
                    label = { Text("Profile Name") },
                    isError = errorMessage != null,
                    singleLine = true,
                )
                if (errorMessage != null) {
                    Text(
                        text = errorMessage ?: "",
                        color = androidx.compose.material3.MaterialTheme.colorScheme.error,
                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 16.dp, top = 4.dp),
                    )
                }
            }
        },
        confirmButton = {
            androidx.compose.material3.TextButton(
                onClick = {
                    if (newName.isNotBlank() && errorMessage == null) {
                        onConfirm(newName)
                    }
                },
                enabled = newName.isNotBlank() && errorMessage == null,
            ) {
                Text(stringResource(R.string.main_save))
            }
        },
        dismissButton = {
            androidx.compose.material3.TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.main_cancel))
            }
        },
    )
}
