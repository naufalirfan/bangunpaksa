package com.naufalputra.bangunpaksa

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import org.json.JSONObject

/**
 * AlarmModule - schedules exact alarms via AlarmManager and persists them
 * so BootReceiver can reschedule after reboot.
 */
class AlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val PREFS = "bangunpaksa_alarms"
        const val KEY_ALARMS = "scheduled_alarms"
        const val ACTION_ALARM = "com.naufalputra.bangunpaksa.ALARM_FIRE"
    }

    private val alarmManager: AlarmManager
        get() = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun getName(): String = "AlarmModule"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf(
        "CAN_SCHEDULE_EXACT" to canScheduleExact()
    )

    private fun canScheduleExact(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            alarmManager.canScheduleExactAlarms()
        else true

    private fun pendingIntentFor(id: String, flags: Int, optionsJson: String = "{}"): PendingIntent? {
        val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
            action = ACTION_ALARM
            putExtra("alarmId", id)
            putExtra("options", optionsJson)
        }
        return PendingIntent.getBroadcast(
            reactContext,
            id.hashCode(),
            intent,
            flags or PendingIntent.FLAG_IMMUTABLE
        )
    }

    @ReactMethod
    fun setExactAlarm(id: String, triggerTimestamp: Double, options: ReadableMap, promise: Promise) {
        try {
            val triggerAt = triggerTimestamp.toLong()

            // Persist options (label, mission, antiCheat) for the receiver.
            val opts = JSONObject()
            val it = options.keySetIterator()
            while (it.hasNextKey()) {
                val key = it.nextKey()
                when (options.getType(key)) {
                    ReadableType.String -> opts.put(key, options.getString(key))
                    ReadableType.Number -> opts.put(key, options.getDouble(key))
                    ReadableType.Boolean -> opts.put(key, options.getBoolean(key))
                    else -> opts.put(key, options.getString(key))
                }
            }
            persistAlarm(id, triggerAt, opts)

            val pi = pendingIntentFor(id, PendingIntent.FLAG_UPDATE_CURRENT, opts.toString())
                ?: return promise.reject("E_ALARM_SET", "PendingIntent null")

            if (canScheduleExact()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
            } else {
                // Fallback: inexact but still fires.
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_ALARM_SET", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(id: String, promise: Promise) {
        try {
            alarmManager.cancel(pendingIntentFor(id, PendingIntent.FLAG_NO_CREATE) ?: return promise.resolve(false))
            removePersisted(id)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_ALARM_CANCEL", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAllAlarms(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val all = prefs.getString(KEY_ALARMS, "{}") ?: "{}"
            val obj = JSONObject(all)
            val ids = obj.keys()
            while (ids.hasNext()) {
                val id = ids.next()
                pendingIntentFor(id, PendingIntent.FLAG_NO_CREATE)?.let { alarmManager.cancel(it) }
            }
            prefs.edit().putString(KEY_ALARMS, "{}").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_ALARM_CANCEL_ALL", e.message, e)
        }
    }

    @ReactMethod
    fun getScheduledAlarms(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = WritableNativeArray()
            val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
            val ids = obj.keys()
            while (ids.hasNext()) {
                val id = ids.next()
                val entry = obj.getJSONObject(id)
                val map = WritableNativeMap()
                map.putString("id", id)
                map.putDouble("triggerAt", entry.getLong("triggerAt").toDouble())
                map.putString("options", entry.optString("options", "{}"))
                arr.pushMap(map)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("E_ALARM_LIST", e.message, e)
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        promise.resolve(canScheduleExact())
    }

    @ReactMethod
    fun requestExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExact()) {
                val intent = Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
            }
            promise.resolve(canScheduleExact())
        } catch (e: Exception) {
            promise.reject("E_ALARM_PERM", e.message, e)
        }
    }

    private fun persistAlarm(id: String, triggerAt: Long, options: JSONObject) {
        val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
        val entry = JSONObject()
        entry.put("triggerAt", triggerAt)
        entry.put("options", options.toString())
        obj.put(id, entry)
        prefs.edit().putString(KEY_ALARMS, obj.toString()).apply()
    }

    private fun removePersisted(id: String) {
        val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val obj = JSONObject(prefs.getString(KEY_ALARMS, "{}") ?: "{}")
        obj.remove(id)
        prefs.edit().putString(KEY_ALARMS, obj.toString()).apply()
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
