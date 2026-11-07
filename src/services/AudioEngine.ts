import { Audio } from 'expo-av';
import { Platform, NativeModules } from 'react-native';
import * as Haptics from 'expo-haptics';

const { AudioEngineModule } = NativeModules;

export interface SoundProfile {
  id: string;
  name: string;
  category: 'siren' | 'psychological' | 'custom' | 'tts';
  uri: string;
  frequencyRange?: [number, number];
  isExtreme: boolean;
  gainDb?: number;
}

export interface AudioConfig {
  initialVolume: number;
  targetVolume: number;
  crescendoDuration: number;
  crescendoStepInterval: number;
  crescendoStepSize: number;
  hardLockVolume: number;
  boosterGainDb: number;
  smartMuteDuration: number;
  pitchEscalationEnabled: boolean;
  pitchEscalationStartDelay: number;
  pitchEscalationMaxMultiplier: number;
  tempoEscalationEnabled: boolean;
  tempoEscalationMaxMultiplier: number;
  binauralHapticSync: boolean;
}

const defaultConfig: AudioConfig = {
  initialVolume: 30,
  targetVolume: 100,
  crescendoDuration: 30,
  crescendoStepInterval: 3,
  crescendoStepSize: 10,
  hardLockVolume: 100,
  boosterGainDb: 6,
  smartMuteDuration: 15,
  pitchEscalationEnabled: true,
  pitchEscalationStartDelay: 60,
  pitchEscalationMaxMultiplier: 1.5,
  tempoEscalationEnabled: true,
  tempoEscalationMaxMultiplier: 1.5,
  binauralHapticSync: true,
};

const psychoacousticSounds: SoundProfile[] = [
  { id: 'siren_fire', name: 'Sirine Pemadam', category: 'siren', uri: 'sounds/siren_fire.mp3', frequencyRange: [2000, 4000], isExtreme: true },
  { id: 'siren_school', name: 'Bel Sekolah Kuno', category: 'siren', uri: 'sounds/siren_school.mp3', frequencyRange: [2000, 3500], isExtreme: true },
  { id: 'siren_submarine', name: 'Alarm Kapal Selam', category: 'siren', uri: 'sounds/siren_submarine.mp3', frequencyRange: [1500, 3000], isExtreme: true },
  { id: 'sawtooth_2k_4k', name: 'Gelombang Sawtooth 2-4kHz', category: 'siren', uri: 'sounds/sawtooth_2k_4k.mp3', frequencyRange: [2000, 4000], isExtreme: true },
  { id: 'door_knock', name: 'Ketukan Pintu Keras', category: 'psychological', uri: 'sounds/door_knock.mp3', isExtreme: true },
  { id: 'bee_buzz', name: 'Suara Lebah Dekat Telinga', category: 'psychological', uri: 'sounds/bee_buzz.mp3', isExtreme: true },
  { id: 'water_leak', name: 'Air Keran Meluber', category: 'psychological', uri: 'sounds/water_leak.mp3', isExtreme: true },
  { id: 'baby_cry', name: 'Tangisan Bayi', category: 'psychological', uri: 'sounds/baby_cry.mp3', isExtreme: true },
  { id: 'glass_break', name: 'Kaca Pecah', category: 'psychological', uri: 'sounds/glass_break.mp3', isExtreme: true },
  { id: 'emergency_alert', name: 'Darurat Siaga', category: 'psychological', uri: 'sounds/emergency_alert.mp3', isExtreme: true },
];

type TimeoutHandle = ReturnType<typeof setTimeout>;
type IntervalHandle = ReturnType<typeof setInterval>;

class AudioEngine {
  private sound: Audio.Sound | null = null;
  private config: AudioConfig = defaultConfig;
  private currentSoundId: string | null = null;
  private volumeInterval: IntervalHandle | null = null;
  private pitchInterval: IntervalHandle | null = null;
  private tempoInterval: IntervalHandle | null = null;
  private hapticInterval: IntervalHandle | null = null;
  private startTime: number = 0;
  private isPlaying = false;
  private isSmartMuted = false;
  private smartMuteTimeout: TimeoutHandle | null = null;
  private volumeLocked = false;
  private lastPlayedSoundIds: string[] = [];

  async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: 1, // DoNotMix
      interruptionModeAndroid: 1, // DoNotMix
    });

    await this.preloadSounds();
  }

  private async preloadSounds(): Promise<void> {
    for (const sound of psychoacousticSounds) {
      try {
        const { sound: loadedSound } = await Audio.Sound.createAsync(
          { uri: sound.uri },
          { shouldPlay: false, isLooping: true, volume: 0 }
        );
        await loadedSound.unloadAsync();
      } catch (e) {
        console.warn(`Failed to preload ${sound.id}:`, e);
      }
    }
  }

  async playAlarm(soundId: string, config?: Partial<AudioConfig>): Promise<void> {
    this.stopAlarm();
    this.config = { ...defaultConfig, ...config };
    this.currentSoundId = soundId;
    this.startTime = Date.now();
    this.isPlaying = true;
    this.volumeLocked = true;

    const soundProfile = psychoacousticSounds.find((s) => s.id === soundId);
    if (!soundProfile) {
      console.error(`Sound not found: ${soundId}`);
      return;
    }

    this.lastPlayedSoundIds.push(soundId);
    if (this.lastPlayedSoundIds.length > 7) this.lastPlayedSoundIds.shift();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundProfile.uri },
        {
          shouldPlay: true,
          isLooping: true,
          volume: this.config.initialVolume / 100,
          rate: 1.0,
        }
      );

      this.sound = sound;

      if (Platform.OS === 'android' && AudioEngineModule) {
        await AudioEngineModule.setSpeakerphoneOn(true);
        await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, this.config.initialVolume);
        await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, this.config.initialVolume);
      }

      this.startCrescendo();

      if (this.config.pitchEscalationEnabled || this.config.tempoEscalationEnabled) {
        this.startEscalation();
      }

      if (this.config.binauralHapticSync) {
        this.startHapticSync(soundProfile.frequencyRange?.[0] || 2000);
      }

    } catch (e) {
      console.error('Failed to play alarm:', e);
      this.isPlaying = false;
    }
  }

  private startCrescendo(): void {
    if (this.volumeInterval) clearInterval(this.volumeInterval);

    const steps = Math.ceil(this.config.crescendoDuration / this.config.crescendoStepInterval);
    const volumePerStep = (this.config.targetVolume - this.config.initialVolume) / steps;
    let currentStep = 0;
    let currentVolume = this.config.initialVolume;

    this.volumeInterval = setInterval(async () => {
      if (!this.isPlaying || this.isSmartMuted) return;

      currentStep++;
      currentVolume = Math.min(this.config.initialVolume + volumePerStep * currentStep, this.config.targetVolume);

      if (this.sound) {
        await this.sound.setVolumeAsync(currentVolume / 100);
      }

      if (Platform.OS === 'android' && AudioEngineModule) {
        await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, Math.round(currentVolume));
        await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, Math.round(currentVolume));
      }

      if (currentStep >= steps) {
        this.hardLockVolume();
        if (this.volumeInterval) {
          clearInterval(this.volumeInterval);
          this.volumeInterval = null;
        }
      }
    }, this.config.crescendoStepInterval * 1000);
  }

  private async hardLockVolume(): Promise<void> {
    this.volumeLocked = true;
    
    if (this.sound) {
      await this.sound.setVolumeAsync(this.config.hardLockVolume / 100);
    }

    if (Platform.OS === 'android' && AudioEngineModule) {
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, this.config.hardLockVolume);
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, this.config.hardLockVolume);
      await AudioEngineModule.enableVolumeLock(true);
      await AudioEngineModule.applyAudioBooster(this.config.boosterGainDb);
    }
  }

  private startEscalation(): void {
    const escalationStart = this.config.pitchEscalationStartDelay * 1000;
    const escalationDuration = 30000;
    const startTime = this.startTime + escalationStart;

    const checkAndEscalate = () => {
      if (!this.isPlaying) return;

      const elapsed = Date.now() - startTime;
      if (elapsed < 0) return;

      const progress = Math.min(elapsed / escalationDuration, 1);
      
      if (this.config.pitchEscalationEnabled && this.sound) {
        const pitchMultiplier = 1 + (this.config.pitchEscalationMaxMultiplier - 1) * progress;
        this.sound.setRateAsync(pitchMultiplier, true).catch(console.error);
      }

      if (this.config.tempoEscalationEnabled && this.sound) {
        const tempoMultiplier = 1 + (this.config.tempoEscalationMaxMultiplier - 1) * progress;
        this.sound.setRateAsync(tempoMultiplier, true).catch(console.error);
      }

      if (progress < 1) {
        setTimeout(checkAndEscalate, 1000);
      }
    };

    setTimeout(checkAndEscalate, escalationStart);
  }

  private startHapticSync(baseFrequency: number): void {
    if (this.hapticInterval) clearInterval(this.hapticInterval);

    const intervalMs = Math.max(50, 1000 / (baseFrequency / 100));

    this.hapticInterval = setInterval(async () => {
      if (!this.isPlaying || this.isSmartMuted) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, intervalMs);
  }

  async triggerSmartMute(): Promise<void> {
    if (!this.isPlaying || this.isSmartMuted) return;

    this.isSmartMuted = true;

    if (this.sound) {
      await this.sound.setVolumeAsync(0);
    }

    if (Platform.OS === 'android' && AudioEngineModule) {
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, 0);
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, 0);
    }

    this.smartMuteTimeout = setTimeout(() => {
      this.restoreFromSmartMute();
    }, this.config.smartMuteDuration * 1000);
  }

  private async restoreFromSmartMute(): Promise<void> {
    this.isSmartMuted = false;

    const targetVolume = this.volumeLocked ? this.config.hardLockVolume : this.config.targetVolume;

    if (this.sound) {
      await this.sound.setVolumeAsync(targetVolume / 100);
    }

    if (Platform.OS === 'android' && AudioEngineModule) {
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_ALARM, targetVolume);
      await AudioEngineModule.setStreamVolume(AudioEngineModule.STREAM_MUSIC, targetVolume);
    }
  }

  async stopAlarm(): Promise<void> {
    this.isPlaying = false;
    this.volumeLocked = false;
    this.isSmartMuted = false;

    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.pitchInterval) {
      clearInterval(this.pitchInterval);
      this.pitchInterval = null;
    }
    if (this.tempoInterval) {
      clearInterval(this.tempoInterval);
      this.tempoInterval = null;
    }
    if (this.hapticInterval) {
      clearInterval(this.hapticInterval);
      this.hapticInterval = null;
    }
    if (this.smartMuteTimeout) {
      clearTimeout(this.smartMuteTimeout);
      this.smartMuteTimeout = null;
    }

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        console.warn('Error unloading sound:', e);
      }
      this.sound = null;
    }

    if (Platform.OS === 'android' && AudioEngineModule) {
      await AudioEngineModule.enableVolumeLock(false);
      await AudioEngineModule.applyAudioBooster(0);
    }

    this.currentSoundId = null;
  }

  async interceptVolumeDown(): Promise<void> {
    if (this.volumeLocked && this.isPlaying && !this.isSmartMuted) {
      await this.hardLockVolume();
    }
  }

  getRandomSound(excludeExtreme = false): SoundProfile {
    const available = psychoacousticSounds.filter(
      (s) => !this.lastPlayedSoundIds.includes(s.id) && (!excludeExtreme || !s.isExtreme)
    );
    
    if (available.length === 0) {
      const fallback = psychoacousticSounds.filter((s) => s.id !== this.lastPlayedSoundIds[this.lastPlayedSoundIds.length - 1]);
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    
    return available[Math.floor(Math.random() * available.length)];
  }

  getSoundsByCategory(category: SoundProfile['category']): SoundProfile[] {
    return psychoacousticSounds.filter((s) => s.category === category);
  }

  getAllSounds(): SoundProfile[] {
    return psychoacousticSounds;
  }

  isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentSoundId(): string | null {
    return this.currentSoundId;
  }

  setCurrentSound(soundId: string): void {
    this.currentSoundId = soundId;
  }

  async playTTSBriefing(text: string): Promise<void> {
    console.log('TTS Briefing:', text);
  }

  updateConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }
}

export const audioEngine = new AudioEngine();