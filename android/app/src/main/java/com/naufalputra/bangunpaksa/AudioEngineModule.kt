package com.naufalputra.bangunpaksa

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.*

/**
 * AudioEngineModule - stream volume control, hardware volume lock, audio booster.
 * Audio booster is implemented as a no-op flag on modern Android (no root);
 * the real loudness escalation is done on the JS side by raising stream volume
 * to max plus regenerating the tone. `ponytail:` real DSP gain needs AudioEffect
 * per-session; upgrade path = attach LoudnessEnhancer to the ExoPlayer audio session.
 */
class AudioEngineModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager
        get() = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private var volumeLocked = false
    private var boosterGainDb = 0

    override fun getName(): String = "AudioEngineModule"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf(
        "STREAM_ALARM" to AudioManager.STREAM_ALARM,
        "STREAM_MUSIC" to AudioManager.STREAM_MUSIC,
        "STREAM_RING" to AudioManager.STREAM_RING,
        "MAX_VOLUME" to audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM),
        "IS_VOLUME_LOCKED" to volumeLocked,
        "BOOSTER_GAIN_DB" to boosterGainDb,
    )

    @ReactMethod
    fun setStreamVolume(streamType: Int, volume: Int, promise: Promise) {
        try {
            val max = audioManager.getStreamMaxVolume(streamType)
            val clamped = volume.coerceIn(0, max)
            audioManager.setStreamVolume(streamType, clamped, 0)
            promise.resolve(clamped)
        } catch (e: Exception) {
            promise.reject("E_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun getStreamVolume(streamType: Int, promise: Promise) {
        try {
            promise.resolve(audioManager.getStreamVolume(streamType))
        } catch (e: Exception) {
            promise.reject("E_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun getStreamMaxVolume(streamType: Int, promise: Promise) {
        try {
            promise.resolve(audioManager.getStreamMaxVolume(streamType))
        } catch (e: Exception) {
            promise.reject("E_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun enableVolumeLock(enabled: Boolean, promise: Promise) {
        volumeLocked = enabled
        promise.resolve(enabled)
    }

    @ReactMethod
    fun isVolumeLocked(promise: Promise) {
        promise.resolve(volumeLocked)
    }

    @ReactMethod
    fun applyAudioBooster(gainDb: Int, promise: Promise) {
        boosterGainDb = gainDb.coerceIn(0, 20)
        promise.resolve(boosterGainDb)
    }

    @ReactMethod
    fun setSpeakerphoneOn(on: Boolean, promise: Promise) {
        try {
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = on
            promise.resolve(on)
        } catch (e: Exception) {
            promise.reject("E_SPEAKER", e.message, e)
        }
    }

    @ReactMethod
    fun setAlarmStreamMax(promise: Promise) {
        try {
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, max, 0)
            promise.resolve(max)
        } catch (e: Exception) {
            promise.reject("E_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter on the JS side; no-op.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter on the JS side; no-op.
    }
}
