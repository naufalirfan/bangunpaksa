package com.naufalputra.bangunpaksa

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.app.AlarmManager
import android.app.PendingIntent
import org.json.JSONObject

/**
 * BootReceiver - reschedules all persisted alarms after device reboot.
 * Reads from SharedPreferences (AlarmModule.PREFS) and re-registers exact alarms.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED &&
            intent?.action != Intent.ACTION_LOCKED_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences(AlarmModule.PREFS, Context.MODE_PRIVATE)
        val json = prefs.getString(AlarmModule.KEY_ALARMS, "{}") ?: "{}"
        try {
            val obj = JSONObject(json)
            val ids = obj.keys()
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                alarmManager.canScheduleExactAlarms() else true

            while (ids.hasNext()) {
                val id = ids.next()
                val entry = obj.getJSONObject(id)
                val triggerAt = entry.getLong("triggerAt")
                if (triggerAt <= System.currentTimeMillis()) continue // Skip past alarms

                val pi = PendingIntent.getBroadcast(
                    context,
                    id.hashCode(),
                    Intent(context, AlarmReceiver::class.java).apply {
                        action = AlarmReceiver.ACTION_ALARM
                        putExtra("alarmId", id)
                        putExtra("options", entry.optString("options", "{}"))
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (canExact) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    }
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Emit boot event for AntiCheatModule listeners
        AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_BOOT, null)
    }
}