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
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.apps.adrcotfas.goodtime.bl.DomainTimerData
import com.apps.adrcotfas.goodtime.bl.TimeProvider
import com.apps.adrcotfas.goodtime.bl.TimeUtils.formatMilliseconds
import com.apps.adrcotfas.goodtime.bl.TimerManager
import com.apps.adrcotfas.goodtime.bl.TimerState
import com.apps.adrcotfas.goodtime.bl.TimerType
import com.apps.adrcotfas.goodtime.bl.getBaseTime
import com.apps.adrcotfas.goodtime.data.model.Label
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
    private lateinit var widgetBg: GradientDrawable
    private lateinit var timerText: TextView
    private lateinit var labelText: TextView
    private lateinit var btnPlayPause: TextView
    private lateinit var btnSkip: TextView
    private lateinit var btnAddMin: TextView
    private lateinit var btnStop: TextView
    private lateinit var params: WindowManager.LayoutParams
    private lateinit var prefs: SharedPreferences

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var tickJob: Job? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private var downTime = 0L

    companion object {
        private const val PREFS_NAME = "widget_prefs"
        private const val KEY_ALPHA = "widget_alpha"
        private const val DEFAULT_ALPHA = 185

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
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        buildAndAttachWidget()
        startObserving()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        runCatching { windowManager.removeView(widgetView) }
    }

    private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    private val softViolet = Color.argb(220, 200, 160, 255)
    private val dimWhite = Color.argb(200, 230, 230, 240)
    private val dimRed = Color.argb(200, 255, 100, 100)
    private val dimGreen = Color.argb(200, 120, 220, 160)

    private fun buildAndAttachWidget() {
        val alpha = prefs.getInt(KEY_ALPHA, DEFAULT_ALPHA)

        widgetBg =
            GradientDrawable().apply {
                setColor(Color.argb(alpha, 8, 4, 22))
                cornerRadius = dp(20).toFloat()
            }

        labelText =
            TextView(this).apply {
                setTextColor(softViolet)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                typeface = Typeface.DEFAULT_BOLD
                letterSpacing = 0.08f
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(8), 0, dp(4), 0)
                text = ""
            }

        timerText =
            TextView(this).apply {
                setTextColor(dimWhite)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.MONOSPACE
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 0, dp(4), 0)
                text = "--:--"
            }

        btnPlayPause = makeIconBtn("▶", dimGreen) { handlePlayPause() }
        btnSkip = makeIconBtn("⏭", softViolet) { handleSkip() }
        btnAddMin = makeIconBtn("+1", dimWhite) { handleAddMinute() }
        btnStop = makeIconBtn("■", dimRed) { handleStop() }

        val infoRow =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(labelText, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(36)))
                addView(timerText, LinearLayout.LayoutParams(0, dp(36), 1f))
            }

        val btnRow =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(btnPlayPause, LinearLayout.LayoutParams(dp(28), dp(28)))
                addView(btnSkip, LinearLayout.LayoutParams(dp(28), dp(28)))
                addView(btnAddMin, LinearLayout.LayoutParams(dp(28), dp(28)))
                addView(btnStop, LinearLayout.LayoutParams(dp(28), dp(28)))
                setPadding(0, 0, dp(4), 0)
            }

        val row =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(infoRow, LinearLayout.LayoutParams(0, dp(36), 1f))
                addView(btnRow, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(36)))
            }

        widgetView =
            FrameLayout(this).apply {
                background = widgetBg
                elevation = dp(8).toFloat()
                addView(row, FrameLayout.LayoutParams(dp(260), dp(36)))
            }

        params =
            WindowManager
                .LayoutParams(
                    dp(260),
                    dp(36),
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

    private fun makeIconBtn(
        label: String,
        color: Int,
        onClick: () -> Unit,
    ): TextView =
        TextView(this).apply {
            text = label
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            gravity = Gravity.CENTER
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
        }

    @Suppress("ClickableViewAccessibility")
    private fun onTouch(
        @Suppress("UNUSED_PARAMETER") view: View,
        event: MotionEvent,
    ): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                initialX = params.x
                initialY = params.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                isDragging = false
                downTime = System.currentTimeMillis()
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
                val held = System.currentTimeMillis() - downTime
                if (!isDragging) {
                    if (held > 600L) showTransparencySlider() else handleTap()
                }
                isDragging = false
            }
        }
        return true
    }

    /** Long-press on the widget body opens a floating transparency slider. */
    private fun showTransparencySlider() {
        val currentAlpha = prefs.getInt(KEY_ALPHA, DEFAULT_ALPHA)

        val seekBar =
            SeekBar(this).apply {
                max = 255
                progress = currentAlpha
                setPadding(dp(8), dp(8), dp(8), dp(8))
            }

        val sliderBg =
            GradientDrawable().apply {
                setColor(Color.argb(220, 8, 4, 22))
                cornerRadius = dp(12).toFloat()
            }

        val container =
            FrameLayout(this).apply {
                background = sliderBg
                addView(seekBar, FrameLayout.LayoutParams(dp(200), dp(52)))
            }

        val sliderParams =
            WindowManager
                .LayoutParams(
                    dp(220),
                    dp(60),
                    params.type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT,
                ).apply {
                    gravity = Gravity.TOP or Gravity.END
                    x = params.x
                    y = params.y + dp(40)
                }

        windowManager.addView(container, sliderParams)

        seekBar.setOnSeekBarChangeListener(
            object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(
                    sb: SeekBar?,
                    progress: Int,
                    fromUser: Boolean,
                ) {
                    if (fromUser) {
                        val a = progress.coerceIn(20, 255)
                        prefs.edit().putInt(KEY_ALPHA, a).apply()
                        widgetBg.setColor(Color.argb(a, 8, 4, 22))
                    }
                }

                override fun onStartTrackingTouch(sb: SeekBar?) {}

                override fun onStopTrackingTouch(sb: SeekBar?) {
                    serviceScope.launch {
                        delay(1200)
                        runCatching { windowManager.removeView(container) }
                    }
                }
            },
        )
    }

    private fun handleTap() {
        if (timerManager.timerData.value.state == TimerState.RESET) timerManager.start()
    }

    private fun handlePlayPause() {
        when (timerManager.timerData.value.state) {
            TimerState.RESET -> timerManager.start()
            TimerState.RUNNING -> timerManager.toggle()
            TimerState.PAUSED -> timerManager.toggle()
            else -> {}
        }
    }

    private fun handleSkip() {
        val state = timerManager.timerData.value.state
        if (state == TimerState.RUNNING || state == TimerState.PAUSED) timerManager.skip()
    }

    private fun handleAddMinute() {
        val state = timerManager.timerData.value.state
        if (state == TimerState.RUNNING || state == TimerState.PAUSED) timerManager.addOneMinute()
    }

    private fun handleStop() {
        if (timerManager.timerData.value.state != TimerState.RESET) {
            timerManager.reset(updateWorkTime = false)
        }
    }

    private fun startObserving() {
        serviceScope.launch {
            timerManager.timerData
                .distinctUntilChangedBy { it.state }
                .collect { data ->
                    tickJob?.cancel()
                    when (data.state) {
                        TimerState.RUNNING -> startTicking()
                        else -> updateDisplay(data)
                    }
                }
        }
    }

    private fun startTicking() {
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
        timerText.text = max(baseTime, 0).formatMilliseconds()

        val name = data.getLabelName()
        labelText.text = if (name == Label.DEFAULT_LABEL_NAME || name.isBlank()) "" else name.take(5)

        val isRunning = data.state == TimerState.RUNNING
        val isActive = data.state != TimerState.RESET

        btnPlayPause.text = if (isRunning) "⏸" else "▶"
        btnPlayPause.setTextColor(if (isRunning) dimRed else dimGreen)

        val isFocus = data.type == TimerType.FOCUS
        btnSkip.text = if (isFocus) "⏭B" else "⏭F"

        val visibility = if (isActive) View.VISIBLE else View.GONE
        btnSkip.visibility = visibility
        btnAddMin.visibility = visibility
        btnStop.visibility = visibility
    }
}
