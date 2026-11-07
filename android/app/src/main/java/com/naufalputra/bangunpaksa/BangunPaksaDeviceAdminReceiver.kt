package com.naufalputra.bangunpaksa

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BangunPaksaDeviceAdminReceiver - device admin for:
 * - Preventing app uninstall during alarm
 * - Lock screen policies
 * - Disabling camera/mic if needed
 * Requires: android:permission="android.permission.BIND_DEVICE_ADMIN"
 */
class BangunPaksaDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context?, intent: Intent?) {
        super.onEnabled(context, intent)
        Log.d("BangunPaksa", "Device admin enabled")
        AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_UNFINISHED, mapOf("deviceAdmin" to "enabled"))
    }

    override fun onDisabled(context: Context?, intent: Intent?) {
        super.onDisabled(context, intent)
        Log.d("BangunPaksa", "Device admin disabled")
        AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_UNFINISHED, mapOf("deviceAdmin" to "disabled"))
    }

    override fun onLockTaskModeEntering(context: Context?, intent: Intent?, pkg: String?) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.d("BangunPaksa", "Lock task mode entering: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context?, intent: Intent?) {
        super.onLockTaskModeExiting(context, intent)
        Log.d("BangunPaksa", "Lock task mode exiting")
    }

    override fun onReceive(context: Context?, intent: Intent?): CharSequence? {
        return super.onReceive(context, intent)
    }
}