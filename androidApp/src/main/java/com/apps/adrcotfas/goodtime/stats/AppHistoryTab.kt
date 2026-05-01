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

import android.os.Build
import android.util.Log
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.paging.compose.LazyPagingItems
import androidx.paging.compose.itemContentType
import androidx.paging.compose.itemKey
import com.apps.adrcotfas.goodtime.bl.AndroidTimeUtils.formatToPrettyDateAndTime
import com.apps.adrcotfas.goodtime.bl.LabelData
import com.apps.adrcotfas.goodtime.data.local.backup.CloudAppHistorySession
import com.apps.adrcotfas.goodtime.data.model.Label
import com.apps.adrcotfas.goodtime.data.model.Session
import com.apps.adrcotfas.goodtime.shared.R
import compose.icons.EvaIcons
import compose.icons.evaicons.Outline
import compose.icons.evaicons.outline.List
import com.apps.adrcotfas.goodtime.shared.R as SharedR

@Composable
fun AppHistoryTab(
    sessions: LazyPagingItems<Session>,
    cloudAppHistorySessions: List<CloudAppHistorySession>,
    isSelectAllEnabled: Boolean,
    selectedSessions: List<Long>,
    unselectedSessions: List<Long>,
    labels: List<LabelData>,
    onClick: (Session) -> Unit,
    onLongClick: (Session) -> Unit,
    listState: LazyListState,
) {
    // Get current device name
    val currentDeviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
    Log.d("AppHistoryTab", "Current device: '$currentDeviceName'")
    Log.d("AppHistoryTab", "Total cloud sessions: ${cloudAppHistorySessions.size}")
    cloudAppHistorySessions.forEach {
        Log.d("AppHistoryTab", "Cloud session device: '${it.deviceName}' - Match: ${it.deviceName == currentDeviceName}")
    }

    // Combined App History shows ALL cloud sessions from all devices
    val cloudSessions =
        cloudAppHistorySessions
            .sortedByDescending { it.timestamp }
            .map { cloudSession ->
                Session(
                    id = cloudSession.id,
                    timestamp = cloudSession.timestamp,
                    duration = cloudSession.duration,
                    interruptions = 0,
                    label = cloudSession.label,
                    notes = cloudSession.notes,
                    isWork = true,
                    isArchived = false,
                    deviceName = cloudSession.deviceName,
                )
            }

    val totalCount = cloudSessions.size + sessions.itemCount

    LaunchedEffect(totalCount) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect {
                listState.animateScrollToItem(0)
            }
    }

    if (totalCount == 0) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                modifier = Modifier.size(96.dp),
                imageVector = EvaIcons.Outline.List,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                contentDescription = stringResource(R.string.stats_no_items),
            )
            Text(
                text = stringResource(R.string.stats_no_items),
                style =
                    MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
            )
        }
        return
    }

    LazyColumn(
        modifier =
            Modifier
                .fillMaxSize(),
        state = listState,
    ) {
        // Display cloud sessions first
        items(
            count = cloudSessions.size,
            key = { index -> "cloud_${cloudSessions[index].id}" },
        ) { index ->
            val session = cloudSessions[index]
            val isSelected =
                selectedSessions.contains(session.id) ||
                    isSelectAllEnabled &&
                    !unselectedSessions.contains(session.id)

            val colorIndex =
                labels.firstOrNull { it.name == session.label }?.colorIndex
            colorIndex?.let {
                AppHistoryListItem(
                    modifier = Modifier.animateItem(),
                    session = session,
                    colorIndex = it,
                    isSelected = isSelected,
                    onClick = { onClick(session) },
                    onLongClick = { onLongClick(session) },
                    showDeviceBadge = true,
                    currentDeviceName = currentDeviceName,
                )
            }
        }

        // Then display local sessions
        items(
            count = sessions.itemCount,
            key = sessions.itemKey { "local_${it.id}" },
            contentType = sessions.itemContentType { "sessions" },
        ) { index ->
            val session = sessions[index]
            if (session != null) {
                val isSelected =
                    selectedSessions.contains(session.id) ||
                        isSelectAllEnabled &&
                        !unselectedSessions.contains(session.id)

                val colorIndex =
                    labels.firstOrNull { it.name == session.label }?.colorIndex
                colorIndex?.let {
                    AppHistoryListItem(
                        modifier = Modifier.animateItem(),
                        session = session,
                        colorIndex = it,
                        isSelected = isSelected,
                        onClick = { onClick(session) },
                        onLongClick = { onLongClick(session) },
                        showDeviceBadge = true, // Show device badge for all sessions
                        currentDeviceName = currentDeviceName,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppHistoryListItem(
    modifier: Modifier = Modifier,
    session: Session,
    isSelected: Boolean = false,
    colorIndex: Long,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    showDeviceBadge: Boolean = false,
    currentDeviceName: String = "",
) {
    // Check if session is from cloud (has deviceName from another device)
    val isFromOtherDevice = session.deviceName.isNotEmpty() && session.deviceName != currentDeviceName
    val isFromCloud = session.notes.contains("cloud_synced_at:", ignoreCase = true)
    // Section 11: Check if session has been added to Timeline
    val isAddedToTimeline = session.notes.contains("added_to_timeline:", ignoreCase = true)

    val containerColor =
        when {
            isSelected -> MaterialTheme.colorScheme.secondaryContainer
            isFromOtherDevice -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            isAddedToTimeline -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else -> MaterialTheme.colorScheme.surface
        }

    ListItem(
        modifier =
            modifier.combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick,
            ),
        colors = ListItemDefaults.colors(containerColor = containerColor),
        leadingContent = {
            Row(
                // TODO: check this on small screens/large fonts
                modifier = Modifier.widthIn(min = 64.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Start,
            ) {
                Image(
                    modifier = Modifier.size(12.dp),
                    painter =
                        painterResource(
                            if (session.isWork) {
                                SharedR.drawable.ic_status_goodtime
                            } else {
                                SharedR.drawable.ic_break
                            },
                        ),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant),
                    contentDescription = "session type",
                )
                Spacer(modifier = Modifier.size(4.dp))

                Text(
                    text = stringResource(R.string.main_min, session.duration),
                    maxLines = 1,
                    style =
                        MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                )
            }
        },
        headlineContent = {
            Column {
                val context = LocalContext.current
                val (date, time) = session.timestamp.formatToPrettyDateAndTime(context)
                // Timestamp
                Text(
                    text = "$date $time",
                    maxLines = 1,
                    style = MaterialTheme.typography.bodySmall,
                )
                // Device name below timestamp
                if (showDeviceBadge) {
                    val displayDeviceName =
                        if (session.deviceName.isEmpty()) currentDeviceName else session.deviceName
                    Text(
                        text = displayDeviceName,
                        style =
                            MaterialTheme.typography.labelSmall.copy(
                                color =
                                    if (isFromOtherDevice) {
                                        MaterialTheme.colorScheme.tertiary
                                    } else {
                                        MaterialTheme.colorScheme.primary
                                    },
                            ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                // Filter out the sync marker from notes display
                val displayNotes =
                    session.notes
                        .replace(Regex("\\[cloud_synced_at:\\d+\\]"), "")
                        .trim()
                if (displayNotes.isNotEmpty()) {
                    Text(
                        text = displayNotes,
                        maxLines = 1,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                MaterialTheme.colorScheme.onSurfaceVariant,
                                fontStyle = FontStyle.Italic,
                            ),
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        },
        trailingContent = {
            Row(modifier = Modifier.widthIn(max = 125.dp)) {
                if (session.label != Label.DEFAULT_LABEL_NAME) {
                    SmallLabelChip(name = session.label, colorIndex = colorIndex)
                }
            }
        },
    )
}
