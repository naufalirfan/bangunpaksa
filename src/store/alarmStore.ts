import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKVStorage } from '@/utils/mmkvStorage';

export interface Alarm {
  id: string;
  time: string;
  days: number[];
  enabled: boolean;
  label: string;
  missionType: 'barcode' | 'photo' | 'steps' | 'squat' | 'math' | 'typing' | 'memory' | 'shake';
  missionConfig: {
    barcodeValue?: string;
    photoReference?: string;
    stepCount?: number;
    squatCount?: number;
    mathDifficulty?: 'easy' | 'medium' | 'hard';
    mathQuestionCount?: number;
    typingText?: string;
    shakeCount?: number;
  };
  wakeUpCheckEnabled: boolean;
  wakeUpCheckDelay: number;
  wakeUpCheckRepeat: number;
  soundId: string;
  soundCategory: 'siren' | 'psychological' | 'custom' | 'tts';
  volume: number;
  progressiveCrescendo: boolean;
  antiCheatLevel: 'standard' | 'hardcore';
  streak: number;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  language: 'id' | 'en';
  vibrationEnabled: boolean;
  flashlightEnabled: boolean;
  batteryOptimizationDismissed: boolean;
  accessibilityPermissionGranted: boolean;
  overlayPermissionGranted: boolean;
  exactAlarmPermissionGranted: boolean;
  notificationPermissionGranted: boolean;
  proSubscriptionActive: boolean;
  proSubscriptionExpiry?: string;
  dailyStreakGoal: number;
  autoBackupEnabled: boolean;
  onboardingCompleted: boolean;
  
  // Audio defaults
  defaultNotificationSound?: string;
  defaultSnoozeDuration: number;
  maxSnoozeCount: number;
  autoDismissEnabled: boolean;
  autoDismissDuration: number;
  progressiveCrescendoDefault: boolean;
  volumeBoosterEnabled: boolean;
  smartMuteDuration: number;
  pitchEscalationEnabled: boolean;
  
  // Anti-cheat defaults
  antiCheatLevelDefault: 'standard' | 'hardcore';
  lockVolumeHardware: boolean;
  blockPowerMenu: boolean;
  blockForceClose: boolean;
  rebootDetection: boolean;
  screenPinningEnabled: boolean;
  
  // Wake-up check defaults
  wakeUpCheckDefaultEnabled: boolean;
  wakeUpCheckDefaultDelay: number;
  wakeUpCheckDefaultRepeat: number;
}

export interface Stats {
  totalAlarmsTriggered: number;
  successfulWakeUps: number;
  failedWakeUps: number;
  currentStreak: number;
  longestStreak: number;
  averageResponseTime: number;
  totalSnoozeAttempts: number;
  weeklyData: Array<{
    date: string;
    success: boolean;
    responseTime: number;
    missionType: string;
  }>;
  monthlyData: Array<{
    month: string;
    successRate: number;
    avgResponseTime: number;
  }>;
}

interface AlarmStore {
  alarms: Alarm[];
  settings: Settings;
  stats: Stats;
  activeAlarm: Alarm | null;
  isAlarmRinging: boolean;
  missionProgress: {
    currentStep: number;
    totalSteps: number;
    completed: boolean;
    startTime: number;
  } | null;
  
  // Alarm actions
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt' | 'streak'>) => string;
  updateAlarm: (id: string, updates: Partial<Alarm>) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  setActiveAlarm: (alarm: Alarm | null) => void;
  setAlarmRinging: (ringing: boolean) => void;
  
  // Mission actions
  startMission: (totalSteps: number) => void;
  completeMissionStep: () => void;
  resetMission: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
  
  // Stats actions
  recordWakeUp: (success: boolean, responseTime: number, missionType: string) => void;
  resetStats: () => void;
  
  // Helpers
  getEnabledAlarms: () => Alarm[];
  getNextAlarm: () => Alarm | null;
  
  // Data management
  exportData: () => Promise<{ alarms: Alarm[]; settings: Settings; stats: Stats }>;
  importData: (json: string) => Promise<void>;
  clearAllAlarms: () => void;
  
  // Statistics
  getStatistics: (period: 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    totalAlarms: number;
    successfulWakeUps: number;
    successRate: number;
    avgWakeUpTime: number;
    currentStreak: number;
    longestStreak: number;
    missionBreakdown: Record<string, { total: number; success: number }>;
    wakeUpCheckTotal: number;
    wakeUpCheckSuccess: number;
    wakeUpCheckTimeout: number;
    avgWakeUpCheckTime: number;
  };
}

const defaultSettings: Settings = {
  theme: 'dark',
  language: 'id',
  vibrationEnabled: true,
  flashlightEnabled: true,
  batteryOptimizationDismissed: false,
  accessibilityPermissionGranted: false,
  overlayPermissionGranted: false,
  exactAlarmPermissionGranted: false,
  notificationPermissionGranted: false,
  proSubscriptionActive: false,
  dailyStreakGoal: 7,
  autoBackupEnabled: true,
  onboardingCompleted: false,
  
  // Audio defaults
  defaultNotificationSound: undefined,
  defaultSnoozeDuration: 5,
  maxSnoozeCount: 3,
  autoDismissEnabled: false,
  autoDismissDuration: 30,
  progressiveCrescendoDefault: true,
  volumeBoosterEnabled: true,
  smartMuteDuration: 15,
  pitchEscalationEnabled: true,
  
  // Anti-cheat defaults
  antiCheatLevelDefault: 'standard',
  lockVolumeHardware: true,
  blockPowerMenu: true,
  blockForceClose: true,
  rebootDetection: true,
  screenPinningEnabled: true,
  
  // Wake-up check defaults
  wakeUpCheckDefaultEnabled: true,
  wakeUpCheckDefaultDelay: 5,
  wakeUpCheckDefaultRepeat: 1,
};

const defaultStats: Stats = {
  totalAlarmsTriggered: 0,
  successfulWakeUps: 0,
  failedWakeUps: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageResponseTime: 0,
  totalSnoozeAttempts: 0,
  weeklyData: [],
  monthlyData: [],
};

const mmkvStorage = new MMKVStorage();

export const useAlarmStore = create<AlarmStore>()(
  persist(
    (set, get) => ({
      alarms: [],
      settings: defaultSettings,
      stats: defaultStats,
      activeAlarm: null,
      isAlarmRinging: false,
      missionProgress: null,

      addAlarm: (alarmData) => {
        const id = `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const newAlarm: Alarm = {
          ...alarmData,
          id,
          streak: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ alarms: [...state.alarms, newAlarm] }));
        return id;
      },

      updateAlarm: (id, updates) =>
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
          ),
        })),

      deleteAlarm: (id) =>
        set((state) => ({
          alarms: state.alarms.filter((a) => a.id !== id),
        })),

      toggleAlarm: (id) =>
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled, updatedAt: new Date().toISOString() } : a
          ),
        })),

      setActiveAlarm: (alarm) => set({ activeAlarm: alarm }),
      setAlarmRinging: (ringing) => set({ isAlarmRinging: ringing }),

      startMission: (totalSteps) =>
        set({
          missionProgress: {
            currentStep: 0,
            totalSteps,
            completed: false,
            startTime: Date.now(),
          },
        }),

      completeMissionStep: () =>
        set((state) => {
          if (!state.missionProgress) return state;
          const nextStep = state.missionProgress.currentStep + 1;
          return {
            missionProgress: {
              ...state.missionProgress,
              currentStep: nextStep,
              completed: nextStep >= state.missionProgress.totalSteps,
            },
          };
        }),

      resetMission: () => set({ missionProgress: null }),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      recordWakeUp: (success, responseTime, missionType) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const thisMonth = new Date().toISOString().slice(0, 7);
          
          const newWeeklyData = [
            ...state.stats.weeklyData.filter((d) => d.date >= weekAgo),
            { date: today, success, responseTime, missionType },
          ];
          
          const monthlySuccess = newWeeklyData.filter((d) => d.success).length / newWeeklyData.length;
          const monthlyAvgTime = newWeeklyData.reduce((sum, d) => sum + d.responseTime, 0) / newWeeklyData.length;
          
          const newMonthlyData = [
            ...state.stats.monthlyData.filter((d) => d.month !== thisMonth),
            { month: thisMonth, successRate: monthlySuccess, avgResponseTime: monthlyAvgTime },
          ].slice(-12);

          const newStreak = success ? state.stats.currentStreak + 1 : 0;
          const newLongestStreak = Math.max(state.stats.longestStreak, newStreak);
          const newTotal = state.stats.totalAlarmsTriggered + 1;
          const newSuccessful = state.stats.successfulWakeUps + (success ? 1 : 0);
          const newFailed = state.stats.failedWakeUps + (success ? 0 : 1);
          const newAvgTime = (state.stats.averageResponseTime * state.stats.totalAlarmsTriggered + responseTime) / newTotal;

          return {
            stats: {
              ...state.stats,
              totalAlarmsTriggered: newTotal,
              successfulWakeUps: newSuccessful,
              failedWakeUps: newFailed,
              currentStreak: newStreak,
              longestStreak: newLongestStreak,
              averageResponseTime: newAvgTime,
              weeklyData: newWeeklyData,
              monthlyData: newMonthlyData,
            },
          };
        }),

      resetStats: () => set({ stats: defaultStats }),

      getEnabledAlarms: () => get().alarms.filter((a) => a.enabled),
      getNextAlarm: () => {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const enabled = get().alarms.filter((a) => a.enabled);
        if (enabled.length === 0) return null;
        
        let nextAlarm: Alarm | null = null;
        let minDiff = Infinity;
        
        for (const alarm of enabled) {
          const [hours, minutes] = alarm.time.split(':').map(Number);
          const alarmTime = hours * 60 + minutes;
          
          for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const checkDay = (currentDay + dayOffset) % 7;
            if (!alarm.days.includes(checkDay)) continue;
            
            let diff = (dayOffset * 24 * 60) + (alarmTime - currentTime);
            if (dayOffset === 0 && diff <= 0) continue;
            
            if (diff < minDiff) {
              minDiff = diff;
              nextAlarm = alarm;
            }
          }
        }
        
        return nextAlarm;
      },

      exportData: async () => {
        const state = get();
        return {
          alarms: state.alarms,
          settings: state.settings,
          stats: state.stats,
        };
      },

      importData: async (json: string) => {
        try {
          const data = JSON.parse(json);
          if (data.alarms && data.settings && data.stats) {
            set({
              alarms: data.alarms,
              settings: { ...defaultSettings, ...data.settings },
              stats: { ...defaultStats, ...data.stats },
            });
          } else {
            throw new Error('Format data tidak valid');
          }
        } catch (e) {
          throw new Error('Gagal parse JSON backup');
        }
      },

      clearAllAlarms: () => set({
        alarms: [],
        settings: defaultSettings,
        stats: defaultStats,
      }),

      getStatistics: (period) => {
        const state = get();
        const stats = state.stats;
        
        let filteredWeekly = stats.weeklyData;
        const now = new Date();
        
        if (period === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredWeekly = stats.weeklyData.filter((d) => d.date >= weekAgo);
        } else if (period === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredWeekly = stats.weeklyData.filter((d) => d.date >= monthAgo);
        } else if (period === 'quarter') {
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredWeekly = stats.weeklyData.filter((d) => d.date >= quarterAgo);
        } else if (period === 'year') {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredWeekly = stats.weeklyData.filter((d) => d.date >= yearAgo);
        }
        
        const totalAlarms = filteredWeekly.length;
        const successfulWakeUps = filteredWeekly.filter((d) => d.success).length;
        const successRate = totalAlarms > 0 ? (successfulWakeUps / totalAlarms) * 100 : 0;
        const avgWakeUpTime = totalAlarms > 0
          ? filteredWeekly.reduce((sum, d) => sum + d.responseTime, 0) / totalAlarms
          : 0;
        
        const missionBreakdown: Record<string, { total: number; success: number }> = {};
        for (const d of filteredWeekly) {
          if (!missionBreakdown[d.missionType]) {
            missionBreakdown[d.missionType] = { total: 0, success: 0 };
          }
          missionBreakdown[d.missionType].total++;
          if (d.success) missionBreakdown[d.missionType].success++;
        }
        
        return {
          totalAlarms,
          successfulWakeUps,
          successRate,
          avgWakeUpTime,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          missionBreakdown,
          wakeUpCheckTotal: 0,
          wakeUpCheckSuccess: 0,
          wakeUpCheckTimeout: 0,
          avgWakeUpCheckTime: 0,
        };
      },
    }),
    {
      name: 'alarm-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        alarms: state.alarms,
        settings: state.settings,
        stats: state.stats,
      }),
    }
  )
);