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

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.apps.adrcotfas.goodtime.bl.AndroidTimeUtils.formatToPrettyDate
import com.apps.adrcotfas.goodtime.bl.LabelData
import com.apps.adrcotfas.goodtime.shared.R
import compose.icons.EvaIcons
import compose.icons.evaicons.Outline
import compose.icons.evaicons.outline.List

@Composable
fun AggregatedTimelineTab(
    aggregatedSessions: List<AggregatedSession>,
    labels: List<LabelData>,
) {
    if (aggregatedSessions.isEmpty()) {
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

    // Group by date
    val groupedByDate =
        aggregatedSessions
            .groupBy { it.date }
            .toSortedMap(reverseOrder()) // Most recent first

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
    ) {
        groupedByDate.forEach { (date, sessionsForDate) ->
            // Date header
            item(key = "header_$date") {
                val context = LocalContext.current
                Text(
                    text = date.formatToPrettyDate(context),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            // Sessions for this date
            items(
                items = sessionsForDate,
                key = { "${it.date}_${it.label}" },
            ) { session ->
                val colorIndex = labels.firstOrNull { it.name == session.label }?.colorIndex

                colorIndex?.let {
                    AggregatedListItem(
                        session = session,
                        colorIndex = it,
                    )
                }
            }
        }
    }
}

@Composable
fun AggregatedListItem(
    session: AggregatedSession,
    colorIndex: Long,
) {
    ListItem(
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
        leadingContent = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Start,
            ) {
                Text(
                    text = stringResource(R.string.main_min, session.totalDuration),
                    style =
                        MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold,
                        ),
                )
            }
        },
        headlineContent = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SmallLabelChip(name = session.label, colorIndex = colorIndex)
            }
        },
    )
}
