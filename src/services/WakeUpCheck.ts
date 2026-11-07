import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useAlarmStore } from '../store/alarmStore';
import { audioEngine } from './AudioEngine';
import { antiCheat } from './AntiCheat';

const { WakeUpCheckModule } = NativeModules;

export interface WakeUpCheckConfig {
  enabled: boolean;
  delayMinutes: number;
  repeatCount: number;
  timeoutSeconds: number;
  requireZigzagSlider: boolean;
}

const defaultConfig: WakeUpCheckConfig = {
  enabled: true,
  delayMinutes: 5,
  repeatCount: 1,
  timeoutSeconds: 60,
  requireZigzagSlider: true,
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

class WakeUpCheck {
  private config: WakeUpCheckConfig = defaultConfig;
  private isActive = false;
  private currentRepeat = 0;
  private checkTimeout: TimeoutHandle | null = null;
  private zigzagProgress = 0;
  private zigzagDirection = 1;
  private lastZigzagTime = 0;

  async initialize(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('WAKE_UP_CHECK', [
      {
        identifier: 'CONFIRM_AWAKE',
        buttonTitle: 'Sudah Bangun',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_WAKEUP',
        buttonTitle: 'Masih Ngantuk',
        options: { isDestructive: true },
      },
    ]);
  }

  async start(config?: Partial<WakeUpCheckConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isActive = true;
    this.currentRepeat = 0;
    this.zigzagProgress = 0;
    this.zigzagDirection = 1;

    if (!this.config.enabled) return;

    this.scheduleNextCheck();
  }

  private scheduleNextCheck(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    const delayMs = this.config.delayMinutes * 60 * 1000;

    this.checkTimeout = setTimeout(async () => {
      await this.triggerWakeUpCheck();
    }, delayMs);
  }

  private async triggerWakeUpCheck(): Promise<void> {
    if (!this.isActive) return;

    this.currentRepeat++;
    
    await this.showWakeUpNotification();
    
    this.startResponseTimeout();
  }

  private async showWakeUpNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Wake-Up Check',
        body: `Apakah kamu sudah bangun sepenuhnya? (Cek ${this.currentRepeat}/${this.config.repeatCount})`,
        categoryIdentifier: 'WAKE_UP_CHECK',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'wake_up_check', repeat: this.currentRepeat },
      },
      trigger: null,
    });
  }

  private startResponseTimeout(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    this.checkTimeout = setTimeout(async () => {
      await this.handleTimeout();
    }, this.config.timeoutSeconds * 1000);
  }

  private async handleTimeout(): Promise<void> {
    if (!this.isActive) return;

    await this.restartAlarm();
  }

  private async restartAlarm(): Promise<void> {
    await antiCheat.activate({ level: 'hardcore' });
    
    const { activeAlarm } = useAlarmStore.getState();
    if (activeAlarm) {
      await audioEngine.playAlarm(activeAlarm.soundId, {
        initialVolume: 100,
        targetVolume: 100,
        crescendoDuration: 0,
      });
    }

    this.currentRepeat = 0;
    this.scheduleNextCheck();
  }

  updateZigzagProgress(progress: number): { completed: boolean; progress: number } {
    this.zigzagProgress = Math.max(0, Math.min(1, progress));
    
    const now = Date.now();
    if (now - this.lastZigzagTime < 50) {
      this.zigzagProgress = Math.max(0, this.zigzagProgress - 0.1);
    }
    this.lastZigzagTime = now;

    const completed = this.zigzagProgress >= 1.0;
    
    if (completed) {
      this.onZigzagComplete();
    }

    return { completed, progress: this.zigzagProgress };
  }

  private async onZigzagComplete(): Promise<void> {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }

    if (this.currentRepeat >= this.config.repeatCount) {
      await this.complete();
    } else {
      this.zigzagProgress = 0;
      this.scheduleNextCheck();
    }
  }

  private async complete(): Promise<void> {
    this.isActive = false;
    
    const { recordWakeUp } = useAlarmStore.getState();
    const responseTime = this.config.delayMinutes * 60;
    recordWakeUp(true, responseTime, 'wake_up_check');

    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
  }

  async handleNotificationAction(actionId: string): Promise<void> {
    if (actionId === 'CONFIRM_AWAKE') {
      await this.onZigzagComplete();
    } else if (actionId === 'SNOOZE_WAKEUP') {
      await this.restartAlarm();
    }
  }

  async triggerNow(): Promise<void> {
    await this.triggerWakeUpCheck();
  }

  stop(): void {
    this.isActive = false;
    this.currentRepeat = 0;
    this.zigzagProgress = 0;

    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
  }

  isActiveStatus(): boolean {
    return this.isActive;
  }

  getCurrentRepeat(): number {
    return this.currentRepeat;
  }

  getConfig(): WakeUpCheckConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<WakeUpCheckConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const wakeUpCheck = new WakeUpCheck();