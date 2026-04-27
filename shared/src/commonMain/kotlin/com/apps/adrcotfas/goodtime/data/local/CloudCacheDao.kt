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
package com.apps.adrcotfas.goodtime.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert

@Dao
interface CloudCacheDao {
    @Query("SELECT * FROM localCloudTimelineEntry")
    suspend fun getTimelineEntries(): List<LocalCloudTimelineEntry>

    @Upsert
    suspend fun upsertTimelineEntries(entries: List<LocalCloudTimelineEntry>)

    @Query("DELETE FROM localCloudTimelineEntry")
    suspend fun clearTimelineEntries()

    @Query("SELECT * FROM localCloudHistoryEntry ORDER BY timestamp DESC")
    suspend fun getHistoryEntries(): List<LocalCloudHistoryEntry>

    @Upsert
    suspend fun upsertHistoryEntries(entries: List<LocalCloudHistoryEntry>)

    @Query("DELETE FROM localCloudHistoryEntry")
    suspend fun clearHistoryEntries()
}
