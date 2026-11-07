package com.naufalputra.bangunpaksa

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import com.facebook.react.bridge.*

/**
 * WakeUpCheckModule - haptic feedback, zigzag slider validation.
 * Zigzag validation is done on JS side (touch tracking); this only provides haptics.
 */
class WakeUpCheckModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val vibrator: android.os.Vibrator
        get() = reactContext.getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator

    override fun getName(): String = "WakeUpCheckModule"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf(
        "HAS_VIBRATOR" to vibrator.hasVibrator(),
        "HAS_AMPLITUDE_CONTROL" to (
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O &&
                vibrator.hasAmplitudeControl()
            )
    )

    @ReactMethod
    fun vibrate(pattern: ReadableArray, repeat: Int, promise: Promise) {
        try {
            val longPattern = LongArray(pattern.size())
            for (i in 0 until pattern.size()) {
                longPattern[i] = pattern.getDouble(i).toLong()
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(longPattern, repeat))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(longPattern, repeat)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_VIBRATE", e.message, e)
        }
    }

    @ReactMethod
    fun cancelVibrate(promise: Promise) {
        vibrator.cancel()
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}