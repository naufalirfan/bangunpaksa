package com.naufalputra.bangunpaksa

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * AlarmReceiver - receives exact alarm broadcasts, starts foreground service for alarm ringing.
 */
class AlarmReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_ALARM = "com.naufalputra.bangunpaksa.ALARM_FIRE"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ACTION_ALARM) return
        val alarmId = intent.getStringExtra("alarmId") ?: return
        val optionsJson = intent.getStringExtra("options") ?: "{}"

        val serviceIntent = Intent(context, AlarmForegroundService::class.java).apply {
            action = AlarmForegroundService.ACTION_START_ALARM
            putExtra("alarmId", alarmId)
            putExtra("options", optionsJson)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
        Log.d("BangunPaksa", "AlarmReceiver: started service for $alarmId")
    }
}