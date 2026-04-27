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
package com.apps.adrcotfas.goodtime.bl

import android.app.Application
import android.content.Intent
import co.touchlab.kermit.Logger
import co.touchlab.kermit.StaticConfig
import com.apps.adrcotfas.goodtime.bl.notifications.NotificationArchManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Verifies that notification action intents sent to [TimerService] route to the
 * correct [TimerManager] method.
 *
 * The test uses Robolectric to run the Service lifecycle in a JVM environment,
 * and MockK to assert that each notification action calls exactly one TimerManager
 * function without touching any real UI or Bluetooth/Notification system calls.
 */
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [33])
class TimerServiceNotificationActionsTest {
    private lateinit var timerManager: TimerManager
    private lateinit var notificationManager: NotificationArchManager

    @Before
    fun setUp() {
        timerManager = mockk(relaxed = true)
        notificationManager = mockk(relaxed = true)

        every { timerManager.timerData } returns MutableStateFlow(DomainTimerData())

        startKoin {
            modules(
                module {
                    single { timerManager }
                    single { notificationManager }
                    single { Logger(StaticConfig()) }
                },
            )
        }
    }

    @After
    fun tearDown() {
        stopKoin()
    }

    private fun fireAction(action: TimerService.Companion.Action) {
        val controller = Robolectric.buildService(TimerService::class.java)
        val service = controller.create().get()
        val intent =
            Intent(service, TimerService::class.java).apply { this.action = action.name }
        service.onStartCommand(intent, 0, 0)
    }

    @Test
    fun `Toggle action calls timerManager toggle`() {
        fireAction(TimerService.Companion.Action.Toggle)
        verify(exactly = 1) { timerManager.toggle() }
    }

    @Test
    fun `AddOneMinute action calls timerManager addOneMinute`() {
        fireAction(TimerService.Companion.Action.AddOneMinute)
        verify(exactly = 1) { timerManager.addOneMinute() }
    }

    @Test
    fun `Skip action calls timerManager next with MANUAL_SKIP`() {
        fireAction(TimerService.Companion.Action.Skip)
        verify(exactly = 1) { timerManager.next(finishActionType = FinishActionType.MANUAL_SKIP) }
    }

    @Test
    fun `Next action calls timerManager next with MANUAL_NEXT`() {
        fireAction(TimerService.Companion.Action.Next)
        verify(exactly = 1) { timerManager.next(finishActionType = FinishActionType.MANUAL_NEXT) }
    }

    @Test
    fun `DoReset action calls timerManager reset`() {
        fireAction(TimerService.Companion.Action.DoReset)
        verify(exactly = 1) { timerManager.reset() }
    }

    @Test
    fun `null intent returns START_NOT_STICKY and calls no timerManager methods`() {
        val controller = Robolectric.buildService(TimerService::class.java)
        val service = controller.create().get()
        val result = service.onStartCommand(null, 0, 0)
        assert(result == android.app.Service.START_NOT_STICKY)
        verify(exactly = 0) { timerManager.toggle() }
        verify(exactly = 0) { timerManager.reset() }
    }
}
