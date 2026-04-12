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
package com.apps.adrcotfas.goodtime.backup

import android.app.Application
import android.content.Context
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import co.touchlab.kermit.Logger
import co.touchlab.kermit.StaticConfig
import com.apps.adrcotfas.goodtime.bl.DomainTimerData
import com.apps.adrcotfas.goodtime.bl.TimerManager
import com.apps.adrcotfas.goodtime.bl.TimerState
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncHandler
import com.apps.adrcotfas.goodtime.data.local.backup.FirestoreSyncResult
import com.apps.adrcotfas.goodtime.data.settings.AppSettings
import com.apps.adrcotfas.goodtime.data.settings.CloudBackupSettings
import com.apps.adrcotfas.goodtime.data.settings.SettingsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import kotlin.test.assertEquals

/**
 * Unit tests for [AutoBackupWorker].
 *
 * Coverage:
 *  - doWork() when auto-backup is disabled → [ListenableWorker.Result.failure]
 *  - doWork() when timer is inactive, sync succeeds → [ListenableWorker.Result.success]
 *  - doWork() when timer is active, sync succeeds → skip() called first, then success
 *  - doWork() when sync returns [FirestoreSyncResult.CloudData] → success
 *  - doWork() when sync returns [FirestoreSyncResult.Error] → [ListenableWorker.Result.retry]
 *  - doWork() when an exception is thrown → [ListenableWorker.Result.retry]
 */
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [33])
class AutoBackupWorkerTest {
    private lateinit var context: Context
    private lateinit var fakeSettings: TestFakeSettingsRepository
    private val testLogger = Logger(StaticConfig())
    private lateinit var mockFirestoreSyncHandler: FirestoreSyncHandler
    private lateinit var mockTimerManager: TimerManager

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        fakeSettings =
            TestFakeSettingsRepository(
                AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = true)),
            )
        mockFirestoreSyncHandler = mockk()
        mockTimerManager = mockk(relaxed = true)

        // Default: timer is idle (not active)
        every { mockTimerManager.timerData } returns MutableStateFlow(DomainTimerData())

        startKoin {
            modules(
                module {
                    single { mockFirestoreSyncHandler }
                    single { mockTimerManager }
                },
            )
        }
    }

    @After
    fun tearDown() {
        stopKoin()
    }

    /** Builds an [AutoBackupWorker] with the given [settingsRepo] injected via a custom factory. */
    private fun buildWorker(settingsRepo: SettingsRepository = fakeSettings): AutoBackupWorker =
        TestListenableWorkerBuilder<AutoBackupWorker>(context)
            .setWorkerFactory(
                object : WorkerFactory() {
                    override fun createWorker(
                        appContext: Context,
                        workerClassName: String,
                        workerParameters: WorkerParameters,
                    ): ListenableWorker = AutoBackupWorker(appContext, settingsRepo, testLogger, workerParameters)
                },
            ).build()

    // ── backup disabled ───────────────────────────────────────────────────────

    @Test
    fun `doWork returns failure when auto-backup is disabled`() =
        runTest {
            fakeSettings.emit(
                AppSettings(cloudBackupSettings = CloudBackupSettings(autoCloudBackupEnabled = false)),
            )
            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.failure(), result)
        }

    // ── backup enabled, timer inactive ───────────────────────────────────────

    @Test
    fun `doWork returns success when sync succeeds and timer is not active`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success
            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.success(), result)
        }

    @Test
    fun `doWork does not call skip() when timer is not active`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success
            buildWorker().doWork()
            verify(exactly = 0) { mockTimerManager.skip() }
        }

    // ── backup enabled, timer active ─────────────────────────────────────────

    @Test
    fun `doWork calls skip() when timer is running before syncing`() =
        runTest {
            every { mockTimerManager.timerData } returns
                MutableStateFlow(DomainTimerData(state = TimerState.RUNNING))
            every { mockTimerManager.skip() } just runs
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success

            buildWorker().doWork()

            verify(exactly = 1) { mockTimerManager.skip() }
        }

    @Test
    fun `doWork calls skip() when timer is paused before syncing`() =
        runTest {
            every { mockTimerManager.timerData } returns
                MutableStateFlow(DomainTimerData(state = TimerState.PAUSED))
            every { mockTimerManager.skip() } just runs
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success

            buildWorker().doWork()

            verify(exactly = 1) { mockTimerManager.skip() }
        }

    @Test
    fun `doWork returns success after skipping active timer and sync succeeds`() =
        runTest {
            every { mockTimerManager.timerData } returns
                MutableStateFlow(DomainTimerData(state = TimerState.RUNNING))
            every { mockTimerManager.skip() } just runs
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success

            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.success(), result)
        }

    // ── sync result variants ──────────────────────────────────────────────────

    @Test
    fun `doWork returns success when sync returns CloudData`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } returns
                FirestoreSyncResult.CloudData(emptyMap())

            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.success(), result)
        }

    @Test
    fun `doWork returns retry when sync returns Error`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } returns
                FirestoreSyncResult.Error("network failure")

            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.retry(), result)
        }

    @Test
    fun `doWork returns retry when sync throws an unexpected exception`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } throws RuntimeException("boom")

            val result = buildWorker().doWork()
            assertEquals(ListenableWorker.Result.retry(), result)
        }

    // ── syncData is called exactly once per invocation ────────────────────────

    @Test
    fun `doWork calls syncData exactly once`() =
        runTest {
            coEvery { mockFirestoreSyncHandler.syncData() } returns FirestoreSyncResult.Success
            buildWorker().doWork()
            coVerify(exactly = 1) { mockFirestoreSyncHandler.syncData() }
        }

    // ── WORK_NAME constant ────────────────────────────────────────────────────

    @Test
    fun `WORK_NAME constant is stable`() {
        assertEquals("auto_cloud_backup_work", AutoBackupWorker.WORK_NAME)
    }
}
