package com.naufalputra.bangunpaksa

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * AlarmForegroundService - keeps alarm ringing alive, plays audio, shows persistent notification.
 * Audio playback is delegated to JS (Expo AV) via event bridge; this service only holds wake lock and notification.
 */
class AlarmForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "bangunpaksa_alarm"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_ALARM = "START_ALARM"
        const val ACTION_STOP_ALARM = "STOP_ALARM"
        const val ACTION_SNOOZE = "SNOOZE"
    }

    private var alarmId: String? = null
    private var notificationManager: NotificationManager? = null

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannel()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BangunPaksa Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alarm ringing notification"
                setSound(null, null)
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_START_ALARM -> {
                alarmId = intent.getStringExtra("alarmId")
                val options = intent.getStringExtra("options") ?: "{}"
                showNotification(options)
                // Emit event to JS via React Native bridge (handled by AlarmModule/AntiCheatModule event emitters)
                AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_UNFINISHED, mapOf("alarmId" to alarmId, "started" to true))
            }
            ACTION_STOP_ALARM -> {
                AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_UNFINISHED, mapOf("alarmId" to alarmId, "started" to false))
                stopSelf()
            }
            ACTION_SNOOZE -> {
                // Reschedule logic would go here; for now just stop
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun showNotification(optionsJson: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarmId", alarmId)
            putExtra("options", optionsJson)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Alarm BangunPaksa")
            .setContentText("Tap untuk mematikan alarm")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(true)
        notificationManager?.cancel(NOTIFICATION_ID)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}