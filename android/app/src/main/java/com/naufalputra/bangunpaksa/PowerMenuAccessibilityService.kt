package com.naufalputra.bangunpaksa

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

/**
 * PowerMenuAccessibilityService - detects and dismisses system power menu / long-press power dialog.
 * Requires: BIND_ACCESSIBILITY_SERVICE permission, enabled by user in Settings > Accessibility.
 */
class PowerMenuAccessibilityService : AccessibilityService() {

    companion object {
        const val POWER_MENU_DISMISSED = "power_menu_dismissed"
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        // Detect power menu / global actions dialog
        val className = event.className?.toString() ?: ""
        val packageName = event.packageName?.toString() ?: ""
        // Common power dialog classes/packages
        if (className.contains("GlobalActionsDialog") ||
            className.contains("PowerMenu") ||
            (packageName == "android" && className.contains("Dialog")) ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && className.contains("AlertDialog")) {
            // Dismiss by sending back key event or clicking "Cancel"
            performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
            // Emit event
            AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_POWER_MENU, mapOf("dismissed" to true))
        }
    }

    override fun onInterrupt() {}

    override fun onServiceConnected() {
        super.onServiceConnected()
        AntiCheatModule.emitGlobal(AntiCheatModule.EVENT_POWER_MENU, mapOf("serviceConnected" to true))
    }
}