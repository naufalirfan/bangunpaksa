package com.naufalputra.bangunpaksa

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BangunPaksaPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            AudioEngineModule(reactContext),
            AlarmModule(reactContext),
            AntiCheatModule(reactContext),
            MissionModule(reactContext),
            SensorModule(reactContext),
            WakeUpCheckModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}