import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { useAlarmStore } from '../store/alarmStore';

const { AntiCheatModule, AudioEngineModule } = NativeModules;
const antiCheatEmitter = AntiCheatModule ? new NativeEventEmitter(AntiCheatModule) : null;

export type AntiCheatLevel = 'standard' | 'hardcore';

export interface AntiCheatConfig {
  level: AntiCheatLevel;
  lockVolume: boolean;
  blockPowerMenu: boolean;
  blockForceClose: boolean;
  blockUninstall: boolean;
  blockReboot: boolean;
  screenPinning: boolean;
  deviceAdmin: boolean;
}

const defaultConfig: AntiCheatConfig = {
  level: 'standard',
  lockVolume: true,
  blockPowerMenu: true,
  blockForceClose: true,
  blockUninstall: false,
  blockReboot: true,
  screenPinning: true,
  deviceAdmin: false,
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

class AntiCheat {
  private config: AntiCheatConfig = defaultConfig;
  private isActive = false;
  private volumeObserver: any = null;
  private powerMenuOverlay: any = null;
  private rebootListener: any = null;
  private unfinishedAlarmKey = 'ringing_unfinished';

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const hasOverlay = await AntiCheatModule?.hasOverlayPermission?.();
    const hasAccessibility = await AntiCheatModule?.hasAccessibilityService?.();
    
    useAlarmStore.getState().updateSettings({
      overlayPermissionGranted: hasOverlay,
      accessibilityPermissionGranted: hasAccessibility,
    });

    this.setupSystemListeners();
  }

  private setupSystemListeners(): void {
    if (!AntiCheatModule || !antiCheatEmitter) return;

    antiCheatEmitter.addListener('volumeChange', (volume: any) => {
      if (this.isActive && this.config.lockVolume && Number(volume) < 100) {
        this.restoreMaxVolume();
      }
    });

    antiCheatEmitter.addListener('powerMenu', () => {
      if (this.isActive && this.config.blockPowerMenu) {
        this.blockPowerMenu();
      }
    });

    this.rebootListener = antiCheatEmitter.addListener('bootCompleted', () => {
      this.handleRebootRecovery();
    });

    AntiCheatModule.addVolumeChangeListener();
    AntiCheatModule.addPowerMenuListener();
    AntiCheatModule.addBootCompletedListener();
  }

  async activate(config?: Partial<AntiCheatConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isActive = true;

    if (Platform.OS !== 'android' || !AntiCheatModule) return;

    try {
      if (this.config.lockVolume) {
        await this.lockVolume();
      }

      if (this.config.blockPowerMenu) {
        await this.enablePowerMenuBlock();
      }

      if (this.config.screenPinning) {
        await AntiCheatModule.enableScreenPinning(true);
      }

      if (this.config.level === 'hardcore' && this.config.deviceAdmin) {
        await AntiCheatModule.requestDeviceAdmin();
      }

      await this.markUnfinishedAlarm();

    } catch (e) {
      console.error('AntiCheat activation failed:', e);
    }
  }

  async deactivate(): Promise<void> {
    this.isActive = false;

    if (Platform.OS !== 'android' || !AntiCheatModule) return;

    try {
      if (this.config.lockVolume) {
        await this.unlockVolume();
      }

      if (this.config.blockPowerMenu) {
        await this.disablePowerMenuBlock();
      }

      if (this.config.screenPinning) {
        await AntiCheatModule.enableScreenPinning(false);
      }

      await this.clearUnfinishedAlarm();

    } catch (e) {
      console.error('AntiCheat deactivation failed:', e);
    }
  }

  private async lockVolume(): Promise<void> {
    if (!AudioEngineModule) return;
    
    await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, 100);
    await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, 100);
    await AudioEngineModule.enableVolumeLock(true);
  }

  private async unlockVolume(): Promise<void> {
    if (!AudioEngineModule) return;
    
    await AudioEngineModule.enableVolumeLock(false);
  }

  private async restoreMaxVolume(): Promise<void> {
    if (!AudioEngineModule) return;
    
    await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, 100);
    await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, 100);
  }

  private async enablePowerMenuBlock(): Promise<void> {
    if (!AntiCheatModule) return;
    await AntiCheatModule.showPowerMenuOverlay(true);
  }

  private async disablePowerMenuBlock(): Promise<void> {
    if (!AntiCheatModule) return;
    await AntiCheatModule.showPowerMenuOverlay(false);
  }

  private async blockPowerMenu(): Promise<void> {
    if (AntiCheatModule) {
      await AntiCheatModule.dismissPowerMenu();
    }
  }

  private async markUnfinishedAlarm(): Promise<void> {
    if (!AntiCheatModule) return;
    await AntiCheatModule.setPersistentFlag(this.unfinishedAlarmKey, 'true');
  }

  private async clearUnfinishedAlarm(): Promise<void> {
    if (!AntiCheatModule) return;
    await AntiCheatModule.setPersistentFlag(this.unfinishedAlarmKey, 'false');
  }

  private async handleRebootRecovery(): Promise<void> {
    if (!AntiCheatModule) return;

    const wasUnfinished = await AntiCheatModule.getPersistentFlag(this.unfinishedAlarmKey);
    if (wasUnfinished === 'true') {
      const { audioEngine } = await import('./AudioEngine');
      const { activeAlarm } = useAlarmStore.getState();
      if (activeAlarm) {
        await audioEngine.playAlarm(activeAlarm.soundId, {
          initialVolume: 100,
          targetVolume: 100,
          crescendoDuration: 0,
        });
        
        await this.activate({ level: this.config.level });
      }
    }
  }

  async requestPermissions(): Promise<{ overlay: boolean; accessibility: boolean }> {
    if (Platform.OS !== 'android' || !AntiCheatModule) {
      return { overlay: false, accessibility: false };
    }

    const overlay = await AntiCheatModule.requestOverlayPermission();
    const accessibility = await AntiCheatModule.requestAccessibilityService();

    useAlarmStore.getState().updateSettings({
      overlayPermissionGranted: overlay,
      accessibilityPermissionGranted: accessibility,
    });

    return { overlay, accessibility };
  }

  async checkPermissions(): Promise<{ overlay: boolean; accessibility: boolean; exactAlarm: boolean }> {
    if (Platform.OS !== 'android' || !AntiCheatModule) {
      return { overlay: false, accessibility: false, exactAlarm: false };
    }

    const overlay = await AntiCheatModule.hasOverlayPermission();
    const accessibility = await AntiCheatModule.hasAccessibilityService();
    const exactAlarm = await AntiCheatModule.hasExactAlarmPermission();

    return { overlay, accessibility, exactAlarm };
  }

  async openPermissionSettings(type: 'overlay' | 'accessibility' | 'exactAlarm' | 'battery'): Promise<void> {
    if (Platform.OS !== 'android' || !AntiCheatModule) return;
    await AntiCheatModule.openSettings(type);
  }

  isActiveStatus(): boolean {
    return this.isActive;
  }

  getConfig(): AntiCheatConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AntiCheatConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const antiCheat = new AntiCheat();