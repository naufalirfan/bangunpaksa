package com.naufalputra.bangunpaksa

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout

/**
 * AntiCheatOverlayService - draws a transparent overlay over system dialogs (power menu)
 * to intercept touches and prevent dismissal of alarm.
 * Requires: SYSTEM_ALERT_WINDOW permission.
 */
class AntiCheatOverlayService : Service() {

    companion object {
        const val ACTION_SHOW = "SHOW_OVERLAY"
        const val ACTION_HIDE = "HIDE_OVERLAY"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY
        when (action) {
            ACTION_SHOW -> showOverlay()
            ACTION_HIDE -> hideOverlay()
        }
        return START_STICKY
    }

    private fun showOverlay() {
        if (overlayView != null) return

        val params = WindowManager.LayoutParams().apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                type = WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
            }
            format = PixelFormat.TRANSLUCENT
            flags = intArrayOf(
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
            ).reduce(Int::or)
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
            gravity = Gravity.TOP or Gravity.START
        }

        overlayView = FrameLayout(this).apply {
            setBackgroundColor(0x00000000) // Transparent
            setOnTouchListener { _, event ->
                // Intercept touches on power menu area (top of screen)
                if (event.action == MotionEvent.ACTION_DOWN && event.rawY < 200) {
                    true // Consume touch
                } else {
                    false
                }
            }
        }

        try {
            windowManager?.addView(overlayView!!, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hideOverlay() {
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
            overlayView = null
        }
    }

    override fun onDestroy() {
        hideOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}