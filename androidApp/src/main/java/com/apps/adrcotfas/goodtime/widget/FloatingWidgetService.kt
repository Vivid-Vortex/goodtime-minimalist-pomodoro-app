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
package com.apps.adrcotfas.goodtime.widget

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.apps.adrcotfas.goodtime.bl.DomainTimerData
import com.apps.adrcotfas.goodtime.bl.TimeProvider
import com.apps.adrcotfas.goodtime.bl.TimeUtils.formatMilliseconds
import com.apps.adrcotfas.goodtime.bl.TimerManager
import com.apps.adrcotfas.goodtime.bl.TimerState
import com.apps.adrcotfas.goodtime.bl.getBaseTime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject
import kotlin.math.abs
import kotlin.math.max

class FloatingWidgetService : Service() {
    private val timerManager: TimerManager by inject()
    private val timeProvider: TimeProvider by inject()

    private lateinit var windowManager: WindowManager
    private lateinit var widgetView: View
    private lateinit var timerText: TextView
    private lateinit var actionIcon: ImageView
    private lateinit var params: WindowManager.LayoutParams

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var tickJob: Job? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, FloatingWidgetService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, FloatingWidgetService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        buildAndAttachWidget()
        startObserving()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        runCatching { windowManager.removeView(widgetView) }
    }

    private fun buildAndAttachWidget() {
        val dp = { v: Int -> TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt() }

        // Background pill
        val bg =
            GradientDrawable().apply {
                setColor(Color.argb(220, 10, 5, 28)) // very dark indigo
                cornerRadius = dp(24).toFloat()
            }

        // Timer label
        timerText =
            TextView(this).apply {
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                letterSpacing = 0.04f
                setPadding(dp(10), 0, dp(6), 0)
                text = "-- : --"
            }

        // Action icon (play / pause)
        actionIcon =
            ImageView(this).apply {
                setColorFilter(Color.argb(220, 200, 160, 255)) // soft violet
                setPadding(0, 0, dp(10), 0)
            }
        updateActionIcon(isRunning = false)

        // Row layout
        val row =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(timerText, LinearLayout.LayoutParams(0, dp(40), 1f))
                addView(actionIcon, LinearLayout.LayoutParams(dp(26), dp(26)))
            }

        // Root frame
        widgetView =
            FrameLayout(this).apply {
                background = bg
                elevation = dp(8).toFloat()
                addView(row, FrameLayout.LayoutParams(dp(130), dp(40)))
            }

        params =
            WindowManager
                .LayoutParams(
                    dp(130),
                    dp(40),
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    },
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT,
                ).apply {
                    gravity = Gravity.TOP or Gravity.END
                    x = 24
                    y = 350
                }

        widgetView.setOnTouchListener(::onTouch)

        windowManager.addView(widgetView, params)
    }

    @Suppress("ClickableViewAccessibility")
    private fun onTouch(
        view: View,
        event: MotionEvent,
    ): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                initialX = params.x
                initialY = params.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                isDragging = false
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - initialTouchX
                val dy = event.rawY - initialTouchY
                if (!isDragging && (abs(dx) > 6 || abs(dy) > 6)) isDragging = true
                if (isDragging) {
                    params.x = max(0, initialX - dx.toInt())
                    params.y = max(0, initialY + dy.toInt())
                    runCatching { windowManager.updateViewLayout(widgetView, params) }
                }
            }
            MotionEvent.ACTION_UP -> {
                if (!isDragging) {
                    handleTap()
                }
                isDragging = false
            }
        }
        return true
    }

    private fun handleTap() {
        val state = timerManager.timerData.value.state
        when (state) {
            TimerState.RESET -> timerManager.start()
            TimerState.RUNNING -> timerManager.toggle()
            TimerState.PAUSED -> timerManager.toggle()
            TimerState.FINISHED -> stop(this)
            else -> {}
        }
    }

    private fun startObserving() {
        serviceScope.launch {
            timerManager.timerData
                .distinctUntilChangedBy { it.state }
                .collect { data ->
                    tickJob?.cancel()
                    when (data.state) {
                        TimerState.RUNNING -> startTicking(data)
                        else -> {
                            updateDisplay(data)
                        }
                    }
                }
        }
    }

    private fun startTicking(initialData: DomainTimerData) {
        tickJob =
            serviceScope.launch {
                while (true) {
                    updateDisplay(timerManager.timerData.value)
                    delay(1000)
                }
            }
    }

    private fun updateDisplay(data: DomainTimerData) {
        val baseTime = data.getBaseTime(timeProvider)
        val displayMs = max(baseTime, 0)
        timerText.text = displayMs.formatMilliseconds()
        updateActionIcon(data.state == TimerState.RUNNING)
    }

    private fun updateActionIcon(isRunning: Boolean) {
        val res =
            if (isRunning) {
                android.R.drawable.ic_media_pause
            } else {
                android.R.drawable.ic_media_play
            }
        actionIcon.setImageResource(res)
    }
}
