import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { useAlarmStore } from '../store/alarmStore';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const { AlarmModule, AudioEngineModule, AntiCheatModule } = NativeModules;

export interface ScheduledAlarm {
  id: string;
  time: string;
  days: number[];
  missionType: string;
  soundId: string;
  label: string;
}

class AlarmScheduler {
  private static instance: AlarmScheduler;
  private initialized = false;
  private taskName = 'bangunpaksa-alarm-check';

  static getInstance(): AlarmScheduler {
    if (!AlarmScheduler.instance) {
      AlarmScheduler.instance = new AlarmScheduler();
    }
    return AlarmScheduler.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (Platform.OS === 'android') {
      try {
        await AlarmModule?.requestExactAlarmPermission?.();
      } catch (e) {
        console.warn('Exact alarm permission request failed:', e);
      }
    }

    await this.registerBackgroundTask();
    this.initialized = true;
  }

  private async registerBackgroundTask(): Promise<void> {
    TaskManager.defineTask(this.taskName, async () => {
      const { getNextAlarm } = useAlarmStore.getState();
      const nextAlarm = getNextAlarm();
      
      if (nextAlarm) {
        await this.scheduleAlarm({
          id: nextAlarm.id,
          time: nextAlarm.time,
          days: nextAlarm.days,
          missionType: nextAlarm.missionType,
          soundId: nextAlarm.soundId,
          label: nextAlarm.label,
        });
      }
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    });

    await BackgroundFetch.registerTaskAsync(this.taskName, {
      minimumInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  async scheduleAlarm(alarm: ScheduledAlarm): Promise<void> {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    let daysToAdd = 0;
    while (!alarm.days.includes((now.getDay() + daysToAdd) % 7)) {
      daysToAdd++;
      if (daysToAdd > 7) break;
    }
    triggerDate.setDate(triggerDate.getDate() + daysToAdd);

    const triggerTimestamp = triggerDate.getTime();

    if (Platform.OS === 'android' && AlarmModule) {
      await AlarmModule.setExactAlarm(alarm.id, triggerTimestamp, {
        missionType: alarm.missionType,
        soundId: alarm.soundId,
        label: alarm.label,
      });
    } else {
      await this.scheduleIOSNotification(alarm, triggerDate);
    }
  }

  private async scheduleIOSNotification(alarm: ScheduledAlarm, triggerDate: Date): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'BangunPaksa',
        body: `Waktunya bangun! ${alarm.label}`,
        sound: 'alarm_default',
        categoryIdentifier: 'ALARM_CATEGORY',
        data: { alarmId: alarm.id, missionType: alarm.missionType },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        repeats: false,
      } as Notifications.DateTriggerInput,
    });
  }

  async cancelAlarm(alarmId: string): Promise<void> {
    if (Platform.OS === 'android' && AlarmModule) {
      await AlarmModule.cancelAlarm(alarmId);
    } else {
      await Notifications.cancelScheduledNotificationAsync(alarmId);
    }
  }

  async cancelAllAlarms(): Promise<void> {
    if (Platform.OS === 'android' && AlarmModule) {
      await AlarmModule.cancelAllAlarms();
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  async rescheduleAll(): Promise<void> {
    await this.cancelAllAlarms();
    const { getEnabledAlarms } = useAlarmStore.getState();
    const alarms = getEnabledAlarms();
    
    for (const alarm of alarms) {
      await this.scheduleAlarm({
        id: alarm.id,
        time: alarm.time,
        days: alarm.days,
        missionType: alarm.missionType,
        soundId: alarm.soundId,
        label: alarm.label,
      });
    }
  }

  async getNextAlarmTime(): Promise<number | null> {
    const { getNextAlarm } = useAlarmStore.getState();
    const alarm = getNextAlarm();
    if (!alarm) return null;

    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    let daysToAdd = 0;
    while (!alarm.days.includes((now.getDay() + daysToAdd) % 7)) {
      daysToAdd++;
      if (daysToAdd > 7) break;
    }
    triggerDate.setDate(triggerDate.getDate() + daysToAdd);

    return triggerDate.getTime();
  }
}

export const alarmScheduler = AlarmScheduler.getInstance();