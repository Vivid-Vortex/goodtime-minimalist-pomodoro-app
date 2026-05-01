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
package com.apps.adrcotfas.goodtime.main

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.apps.adrcotfas.goodtime.bl.AndroidTimeUtils.formatToPrettyDateAndTime
import com.apps.adrcotfas.goodtime.bl.LabelData
import com.apps.adrcotfas.goodtime.data.model.Label
import com.apps.adrcotfas.goodtime.data.model.Session
import com.apps.adrcotfas.goodtime.shared.R
import com.apps.adrcotfas.goodtime.stats.LabelChip
import com.apps.adrcotfas.goodtime.ui.common.BadgedBoxWithCount
import com.apps.adrcotfas.goodtime.ui.getLabelColor
import compose.icons.EvaIcons
import compose.icons.evaicons.Outline
import compose.icons.evaicons.outline.Menu2

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun BottomAppBar(
    modifier: Modifier,
    badgeItemCount: Int,
    hide: Boolean,
    labelData: LabelData,
    sessionCountToday: Int,
    todaySessions: List<Session> = emptyList(),
    onShowSheet: () -> Unit,
    onLabelClick: () -> Unit,
    onResetSessionCount: () -> Unit = {},
    onDeleteSession: (Long) -> Unit = {},
) {
    var showSessionListDialog by remember { mutableStateOf(false) }

    if (showSessionListDialog) {
        SessionListDialog(
            sessions = todaySessions,
            onDeleteSession = { id ->
                onDeleteSession(id)
            },
            onDeleteAll = {
                onResetSessionCount()
                showSessionListDialog = false
            },
            onDismiss = { showSessionListDialog = false },
        )
    }

    val haptic = LocalHapticFeedback.current
    AnimatedVisibility(
        modifier = modifier,
        visible = !hide,
        enter = fadeIn(),
        exit = fadeOut(),
    ) {
        val isDefaultLabel = labelData.name == Label.DEFAULT_LABEL_NAME
        val color = MaterialTheme.getLabelColor(labelData.colorIndex)

        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onShowSheet()
                },
            ) {
                BadgedBoxWithCount(count = badgeItemCount) {
                    Icon(
                        imageVector = EvaIcons.Outline.Menu2,
                        contentDescription = stringResource(R.string.main_open_app_menu),
                    )
                }
            }
            Spacer(modifier = Modifier.weight(1f))

            val onNavigateToSelectLabelDialog = {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onLabelClick()
            }

            if (isDefaultLabel) {
                IconButton(onClick = onNavigateToSelectLabelDialog) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Label,
                        contentDescription = stringResource(R.string.labels_title),
                        tint = color,
                    )
                }
            } else {
                Row(modifier = Modifier.padding(horizontal = 4.dp)) {
                    LabelChip(
                        name = labelData.name,
                        color = color,
                        selected = true,
                        showIcon = true,
                    ) { onNavigateToSelectLabelDialog() }
                }
            }
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .combinedClickable(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                showSessionListDialog = true
                            },
                            onLongClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                showSessionListDialog = true
                            },
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier =
                        Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(
                                MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f),
                            ),
                ) {
                    Text(
                        text = sessionCountToday.toString(),
                        style =
                            MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            ),
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
            }
        }
    }
}

@Composable
private fun SessionListDialog(
    sessions: List<Session>,
    onDeleteSession: (Long) -> Unit,
    onDeleteAll: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Today's Sessions (${sessions.size})") },
        text = {
            Column {
                if (sessions.isEmpty()) {
                    Text(
                        text = "No sessions recorded today.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 320.dp)) {
                        items(sessions, key = { it.id }) { session ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    val (date, time) = session.timestamp.formatToPrettyDateAndTime(context)
                                    Text(
                                        text = time,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        text = "${session.duration} min · ${session.label}",
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                }
                                IconButton(onClick = { onDeleteSession(session.id) }) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete session",
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (sessions.isNotEmpty()) {
                TextButton(
                    onClick = onDeleteAll,
                ) {
                    Text("Delete all", color = MaterialTheme.colorScheme.error)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        },
    )
}
