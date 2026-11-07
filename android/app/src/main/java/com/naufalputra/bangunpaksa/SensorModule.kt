package com.naufalputra.bangunpaksa

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * SensorModule - accelerometer, step counter, shake detection.
 * Emits events consumed by src/services/MissionManager.ts and MissionPhysicalScreen.tsx.
 */
class SensorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager: SensorManager
        get() = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

    private var accelerometer: Sensor? = null
    private var stepCounter: Sensor? = null
    private var stepDetector: Sensor? = null
    private var listenersActive = false

    companion object {
        const val EVENT_ACCELEROMETER = "accelerometerData"
        const val EVENT_STEP = "stepCount"
        const val EVENT_SHAKE = "shakeDetected"
    }

    override fun getName(): String = "SensorModule"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf(
        "HAS_ACCELEROMETER" to sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null,
        "HAS_STEP_COUNTER" to sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null,
        "HAS_STEP_DETECTOR" to sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null,
    )

    @ReactMethod
    fun startAccelerometer(intervalMs: Int, promise: Promise) {
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (accelerometer == null) {
            promise.reject("E_NO_SENSOR", "Accelerometer not available")
            return
        }
        val delay = when {
            intervalMs <= 5 -> SensorManager.SENSOR_DELAY_FASTEST
            intervalMs <= 20 -> SensorManager.SENSOR_DELAY_GAME
            intervalMs <= 60 -> SensorManager.SENSOR_DELAY_UI
            else -> SensorManager.SENSOR_DELAY_NORMAL
        }
        sensorManager.registerListener(this, accelerometer!!, delay)
        listenersActive = true
        promise.resolve(true)
    }

    @ReactMethod
    fun stopAccelerometer(promise: Promise) {
        if (accelerometer != null) {
            sensorManager.unregisterListener(this, accelerometer)
            accelerometer = null
        }
        listenersActive = false
        promise.resolve(true)
    }

    @ReactMethod
    fun startStepCounter(promise: Promise) {
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        if (stepCounter == null || stepDetector == null) {
            promise.reject("E_NO_SENSOR", "Step sensors not available")
            return
        }
        sensorManager.registerListener(this, stepCounter!!, SensorManager.SENSOR_DELAY_NORMAL)
        sensorManager.registerListener(this, stepDetector!!, SensorManager.SENSOR_DELAY_NORMAL)
        promise.resolve(true)
    }

    @ReactMethod
    fun stopStepCounter(promise: Promise) {
        stepCounter?.let { sensorManager.unregisterListener(this, it) }
        stepDetector?.let { sensorManager.unregisterListener(this, it) }
        stepCounter = null
        stepDetector = null
        promise.resolve(true)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!listenersActive || event == null) return
        val emitter = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java) ?: return
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                val payload = mapOf(
                    "x" to event.values[0],
                    "y" to event.values[1],
                    "z" to event.values[2],
                    "timestamp" to event.timestamp
                )
                emitter.emit(EVENT_ACCELEROMETER, payload)
                // Simple shake detection: magnitude > 15 m/s²
                val mag = Math.sqrt(event.values[0]*event.values[0] + event.values[1]*event.values[1] + event.values[2]*event.values[2])
                if (mag > 15.0) {
                    emitter.emit(EVENT_SHAKE, mapOf("magnitude" to mag, "timestamp" to event.timestamp))
                }
            }
            Sensor.TYPE_STEP_COUNTER -> {
                emitter.emit(EVENT_STEP, mapOf("steps" to event.values[0].toInt(), "timestamp" to event.timestamp))
            }
            Sensor.TYPE_STEP_DETECTOR -> {
                if (event.values[0] == 1.0f) {
                    emitter.emit(EVENT_STEP, mapOf("steps" to 1, "timestamp" to event.timestamp, "detector" to true))
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    override fun invalidate() {
        accelerometer?.let { sensorManager.unregisterListener(this, it) }
        accelerometer = null
        stepCounter?.let { sensorManager.unregisterListener(this, it) }
        stepDetector?.let { sensorManager.unregisterListener(this, it) }
        stepCounter = null
        stepDetector = null
        listenersActive = false
        super.invalidate()
    }
}