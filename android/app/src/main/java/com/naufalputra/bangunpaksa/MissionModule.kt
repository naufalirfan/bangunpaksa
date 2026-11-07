package com.naufalputra.bangunpaksa

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * MissionModule - barcode validation, photo reference comparison.
 * Real barcode detection and photo similarity are done on JS side (ML Kit / TensorFlow Lite);
 * this module only provides the bridge for native calls if needed later.
 * ponytail: add ML Kit barcode scanning native for offline speed; upgrade path = add ML Kit dependency + native scanner.
 */
class MissionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MissionModule"

    @ReactMethod
    fun validateBarcode(expected: String, scanned: String, promise: Promise) {
        // Case-insensitive, trim whitespace
        promise.resolve(expected.trim().equals(scanned.trim(), ignoreCase = true))
    }

    @ReactMethod
    fun comparePhotoReference(referencePath: String, capturedPath: String, threshold: Double, promise: Promise) {
        // Placeholder: always true. Real impl = perceptual hash / SSIM via OpenCV or ML Kit.
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}