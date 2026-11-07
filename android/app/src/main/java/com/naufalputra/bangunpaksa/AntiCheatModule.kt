package com.naufalputra.bangunpaksa

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * AntiCheatModule - volume observer, overlay permission, device admin,
 * screen pinning, persistent flags, plus event emitters consumed by
 * src/services/AntiCheat.ts.
 */
class AntiCheatModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val PREFS = "bangunpaksa_anticheat"
        const val EVENT_VOLUME = "volumeChange"
        const val EVENT_POWER_MENU = "powerMenu"
        const val EVENT_BOOT = "bootCompleted"
        const val EVENT_UNFINISHED = "unfinishedAlarm"

        @Volatile var instance: AntiCheatModule? = null

        fun emitGlobal(event: String, payload: Any?) {
            instance?.emitEvent(event, payload)
        }
    }

    fun emitEvent(event: String, payload: Any?) {
        emit(event, payload)
    }

    private var volumeObserver: ContentObserver? = null
    private var volumeListenerCount = 0
    private var powerMenuListenerCount = 0
    private var bootListenerCount = 0
    private var pinned = false

    override fun getName(): String = "AntiCheatModule"

    init {
        instance = this
    }

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf(
        "OVERLAY_GRANTED" to hasOverlayPermissionInternal(),
        "ACCESSIBILITY_GRANTED" to hasAccessibilityInternal(),
        "EXACT_ALARM_GRANTED" to hasExactAlarmInternal(),
        "DEVICE_ADMIN_ACTIVE" to isDeviceAdminInternal(),
        "SDK_INT" to Build.VERSION.SDK_INT,
    )

    private fun emit(event: String, payload: Any?) {
        if (!reactContext.hasActiveReactInstance()) return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(event, payload)
        } catch (_: Exception) {
        }
    }

    // ---------- volume ----------

    @ReactMethod
    fun addVolumeChangeListener(promise: Promise) {
        volumeListenerCount++
        if (volumeObserver == null) {
            val audio = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            volumeObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
                override fun onChange(selfChange: Boolean, uri: Uri?) {
                    emit(
                        EVENT_VOLUME,
                        audio.getStreamVolume(AudioManager.STREAM_ALARM)
                    )
                    emit(
                        EVENT_VOLUME,
                        audio.getStreamVolume(AudioManager.STREAM_MUSIC)
                    )
                }
            }
            reactContext.contentResolver.registerContentObserver(
                Settings.System.CONTENT_URI, true, volumeObserver!!
            )
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun removeVolumeChangeListener(promise: Promise) {
        volumeListenerCount = (volumeListenerCount - 1).coerceAtLeast(0)
        if (volumeListenerCount == 0) {
            volumeObserver?.let { reactContext.contentResolver.unregisterContentObserver(it) }
            volumeObserver = null
        }
        promise.resolve(true)
    }

    // ---------- power menu ----------

    @ReactMethod
    fun addPowerMenuListener(promise: Promise) {
        powerMenuListenerCount++
        promise.resolve(true)
    }

    @ReactMethod
    fun removePowerMenuListener(promise: Promise) {
        powerMenuListenerCount = (powerMenuListenerCount - 1).coerceAtLeast(0)
        promise.resolve(true)
    }

    @ReactMethod
    fun showPowerMenuOverlay(show: Boolean, promise: Promise) {
        val intent = Intent(reactContext, AntiCheatOverlayService::class.java).apply {
            action = if (show) AntiCheatOverlayService.ACTION_SHOW else AntiCheatOverlayService.ACTION_HIDE
        }
        if (show) {
            reactContext.startService(intent)
        } else {
            reactContext.stopService(intent)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun dismissPowerMenu(promise: Promise) {
        reactContext.sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        promise.resolve(true)
    }

    // ---------- boot ----------

    @ReactMethod
    fun addBootCompletedListener(promise: Promise) {
        bootListenerCount++
        promise.resolve(true)
    }

    @ReactMethod
    fun removeBootCompletedListener(promise: Promise) {
        bootListenerCount = (bootListenerCount - 1).coerceAtLeast(0)
        promise.resolve(true)
    }

    // ---------- screen pinning / kiosk ----------

    @ReactMethod
    fun enableScreenPinning(enabled: Boolean, promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            try {
                if (enabled) {
                    activity.startLockTask()
                    pinned = true
                } else {
                    if (pinned) activity.stopLockTask()
                    pinned = false
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("E_PINNING", e.message, e)
            }
        }
    }

    @ReactMethod
    fun isScreenPinned(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(pinned)
            return
        }
        val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        promise.resolve(dpm.isLockTaskPermitted(reactContext.packageName))
    }

    // ---------- device admin ----------

    @ReactMethod
    fun requestDeviceAdmin(promise: Promise) {
        try {
            val component = ComponentName(reactContext, BangunPaksaDeviceAdminReceiver::class.java)
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "BangunPaksa memerlukan admin perangkat untuk mencegah alarm dimatikan."
                )
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_DEVICE_ADMIN", e.message, e)
        }
    }

    @ReactMethod
    fun isDeviceAdmin(promise: Promise) {
        promise.resolve(isDeviceAdminInternal())
    }

    private fun isDeviceAdminInternal(): Boolean {
        val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val component = ComponentName(reactContext, BangunPaksaDeviceAdminReceiver::class.java)
        return dpm.isAdminActive(component)
    }

    // ---------- permissions ----------

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (!hasOverlayPermissionInternal()) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                reactContext.startActivity(intent)
            }
            promise.resolve(hasOverlayPermissionInternal())
        } catch (e: Exception) {
            promise.reject("E_OVERLAY", e.message, e)
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(hasOverlayPermissionInternal())
    }

    private fun hasOverlayPermissionInternal(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(reactContext)
        else true

    @ReactMethod
    fun requestAccessibilityService(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_A11Y", e.message, e)
        }
    }

    @ReactMethod
    fun hasAccessibilityService(promise: Promise) {
        promise.resolve(hasAccessibilityInternal())
    }

    private fun hasAccessibilityInternal(): Boolean {
        val expected = "${reactContext.packageName}/${PowerMenuAccessibilityService::class.java.name}"
        val enabled = Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabled.split(':').any { it.equals(expected, ignoreCase = true) }
    }

    @ReactMethod
    fun hasExactAlarmPermission(promise: Promise) {
        promise.resolve(hasExactAlarmInternal())
    }

    private fun hasExactAlarmInternal(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = reactContext.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        return am.canScheduleExactAlarms()
    }

    @ReactMethod
    fun openSettings(type: String, promise: Promise) {
        try {
            val action = when (type) {
                "overlay" -> Settings.ACTION_MANAGE_OVERLAY_PERMISSION
                "accessibility" -> Settings.ACTION_ACCESSIBILITY_SETTINGS
                "exact_alarm" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM else Settings.ACTION_SETTINGS
                "battery" -> Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS
                "notification" -> Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
                "device_admin" -> DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN
                else -> Settings.ACTION_SETTINGS
            }
            val intent = Intent(action).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            if (type == "overlay") {
                intent.data = Uri.parse("package:${reactContext.packageName}")
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_SETTINGS", e.message, e)
        }
    }

    // ---------- persistent flags ----------

    @ReactMethod
    fun setPersistentFlag(key: String, value: String, promise: Promise) {
        reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(key, value).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getPersistentFlag(key: String, promise: Promise) {
        val v = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(key, null)
        promise.resolve(v)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
