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
package com.apps.adrcotfas.goodtime.fakes

import com.apps.adrcotfas.goodtime.data.local.CloudCacheDao
import com.apps.adrcotfas.goodtime.data.local.LocalCloudHistoryEntry
import com.apps.adrcotfas.goodtime.data.local.LocalCloudTimelineEntry

class FakeCloudCacheDao : CloudCacheDao {
    private val timelineEntries = mutableListOf<LocalCloudTimelineEntry>()
    private val historyEntries = mutableListOf<LocalCloudHistoryEntry>()

    override suspend fun getTimelineEntries(): List<LocalCloudTimelineEntry> = timelineEntries.toList()

    override suspend fun upsertTimelineEntries(entries: List<LocalCloudTimelineEntry>) {
        entries.forEach { entry ->
            timelineEntries.removeAll { it.key == entry.key }
            timelineEntries.add(entry)
        }
    }

    override suspend fun clearTimelineEntries() {
        timelineEntries.clear()
    }

    override suspend fun getHistoryEntries(): List<LocalCloudHistoryEntry> = historyEntries.toList()

    override suspend fun upsertHistoryEntries(entries: List<LocalCloudHistoryEntry>) {
        entries.forEach { entry ->
            historyEntries.removeAll { it.id == entry.id }
            historyEntries.add(entry)
        }
    }

    override suspend fun clearHistoryEntries() {
        historyEntries.clear()
    }
}
