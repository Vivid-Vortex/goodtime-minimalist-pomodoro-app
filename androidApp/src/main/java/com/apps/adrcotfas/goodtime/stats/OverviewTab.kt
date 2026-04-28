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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.apps.adrcotfas.goodtime.bl.AndroidTimeUtils.localizedMonthNamesFull
import com.apps.adrcotfas.goodtime.common.Time.currentDateTime
import com.apps.adrcotfas.goodtime.common.isoWeekNumber
import com.apps.adrcotfas.goodtime.data.settings.OverviewDurationType
import com.apps.adrcotfas.goodtime.data.settings.OverviewType
import com.apps.adrcotfas.goodtime.data.settings.StatisticsSettings
import com.apps.adrcotfas.goodtime.shared.R
import com.apps.adrcotfas.goodtime.stats.history.HistorySection
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.minus
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OverviewTab(
    firstDayOfWeek: DayOfWeek,
    workDayStart: Int,
    statisticsSettings: StatisticsSettings,
    statisticsData: StatisticsData,
    onChangeOverviewType: (OverviewType) -> Unit,
    onChangeOverviewDurationType: (OverviewDurationType) -> Unit,
    onChangePieChartOverviewType: (OverviewDurationType) -> Unit,
    historyChartViewModel: StatisticsHistoryViewModel,
    earliestCloudDate: Long? = null,
    lastSyncTime: Long? = null,
    hasCloudData: Boolean = true,
    onRefreshFromCloud: () -> Unit = {},
) {
    val locale = androidx.compose.ui.text.intl.Locale.current
    val javaLocale = remember(locale) { Locale.forLanguageTag(locale.toLanguageTag()) }

    val currentDateTime = remember { currentDateTime() }
    val uiState by historyChartViewModel.uiState.collectAsStateWithLifecycle()

    Column(
        Modifier
            .padding(top = 8.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        // Last sync banner
        if (lastSyncTime != null) {
            val syncLabel =
                remember(lastSyncTime) {
                    val sdf = SimpleDateFormat("MMM d, HH:mm", javaLocale)
                    "Last synced: ${sdf.format(Date(lastSyncTime))}"
                }
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                Text(
                    text = syncLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (!hasCloudData) {
            // Empty state
            Column(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = "No cloud data yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Pull the latest data from Firestore to see your statistics.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                Button(onClick = onRefreshFromCloud) {
                    Text("Refresh from cloud")
                }
            }
        } else {
            val sinceLabel =
                remember(earliestCloudDate, javaLocale) {
                    if (earliestCloudDate != null) {
                        val sdf = SimpleDateFormat("MMM d, yyyy", javaLocale)
                        "Since ${sdf.format(Date(earliestCloudDate))}"
                    } else {
                        "Total"
                    }
                }

            val today = currentDateTime.date
            val todayLabel =
                remember(today, javaLocale) {
                    SimpleDateFormat("MMM d", javaLocale).format(
                        Date(
                            today.toEpochDays().toLong() * 86400000L,
                        ),
                    )
                }

            val weekStart =
                remember(today, firstDayOfWeek) {
                    var d = today
                    while (d.dayOfWeek != firstDayOfWeek) {
                        d = d.minus(DatePeriod(days = 1))
                    }
                    d
                }
            val weekLabel =
                remember(weekStart, today, javaLocale) {
                    val sdf = SimpleDateFormat("MMM d", javaLocale)
                    val s = sdf.format(Date(weekStart.toEpochDays().toLong() * 86400000L))
                    val e = sdf.format(Date(today.toEpochDays().toLong() * 86400000L))
                    "W${today.isoWeekNumber()} · $s–$e"
                }
            val monthLabel = localizedMonthNamesFull(javaLocale)[currentDateTime.month.ordinal]

            val typeNames =
                mapOf(
                    OverviewDurationType.TODAY to stringResource(R.string.stats_today),
                    OverviewDurationType.THIS_WEEK to weekLabel,
                    OverviewDurationType.THIS_MONTH to monthLabel,
                    OverviewDurationType.TOTAL to sinceLabel,
                )

            OverviewSection(
                statisticsData.overviewData,
                typeNames,
                statisticsSettings.overviewType,
                onChangeOverviewType,
            )

            HistorySection(historyChartViewModel)

            ProductiveTimeSection(
                statisticsData.productiveHoursOfTheDay,
                workDayStart,
            )

            HeatmapSection(
                firstDayOfWeek,
                data = statisticsData.heatmapData,
            )

            if (uiState.selectedLabels.size > 1) {
                PieChartSection(
                    statisticsData.overviewData,
                    statisticsSettings.pieChartViewType,
                    onChangePieChartOverviewType,
                    typeNames = typeNames,
                    selectedLabels = uiState.selectedLabels,
                )
            }

            WorkBreakRatioSection(
                statisticsData.overviewData,
                statisticsSettings.overviewDurationType,
                onChangeOverviewDurationType,
                typeNames = typeNames,
            )
        } // end else hasCloudData
    }
}
