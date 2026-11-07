import { Platform, NativeModules } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Accelerometer, Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

const { MissionModule, SensorModule } = NativeModules;

export type MissionType = 'barcode' | 'photo' | 'steps' | 'squat' | 'math' | 'typing' | 'memory' | 'shake';

export interface MissionConfig {
  type: MissionType;
  barcodeValue?: string;
  photoReference?: string;
  stepCount?: number;
  squatCount?: number;
  mathDifficulty?: 'easy' | 'medium' | 'hard';
  mathQuestionCount?: number;
  typingText?: string;
  shakeCount?: number;
}

export interface MissionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MathQuestion {
  question: string;
  answer: number;
  options: number[];
}

export interface MemoryPuzzle {
  sequence: number[];
  userInput: number[];
  currentIndex: number;
}

class MissionManager {
  private activeMission: MissionConfig | null = null;
  private missionStartTime: number = 0;
  private stepCount = 0;
  private squatCount = 0;
  private shakeCount = 0;
  private pedometerSubscription: any = null;
  private accelerometerSubscription: any = null;
  private mathQuestions: MathQuestion[] = [];
  private currentMathIndex = 0;
  private typingTarget = '';
  private typingCurrent = '';
  private memoryPuzzle: MemoryPuzzle | null = null;
  private barcodeSubscription: any = null;
  private photoReferenceUri: string | null = null;

  async initialize(): Promise<void> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Camera permission not granted');
    }
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  }

  startMission(config: MissionConfig): MissionResult {
    this.activeMission = config;
    this.missionStartTime = Date.now();
    this.resetCounters();

    switch (config.type) {
      case 'barcode':
        return this.startBarcodeMission(config);
      case 'photo':
        return this.startPhotoMission(config);
      case 'steps':
        return this.startStepsMission(config);
      case 'squat':
        return this.startSquatMission(config);
      case 'math':
        return this.startMathMission(config);
      case 'typing':
        return this.startTypingMission(config);
      case 'memory':
        return this.startMemoryMission(config);
      case 'shake':
        return this.startShakeMission(config);
      default:
        return { success: false, error: 'Unknown mission type' };
    }
  }

  private resetCounters(): void {
    this.stepCount = 0;
    this.squatCount = 0;
    this.shakeCount = 0;
    this.currentMathIndex = 0;
    this.typingCurrent = '';
    this.memoryPuzzle = null;
  }

  private async startBarcodeMission(config: MissionConfig): Promise<MissionResult> {
    if (!config.barcodeValue) {
      return { success: false, error: 'Barcode value not configured' };
    }
    return { success: true, data: { barcodeValue: config.barcodeValue } };
  }

  async validateBarcode(scannedValue: string): Promise<MissionResult> {
    if (!this.activeMission || this.activeMission.type !== 'barcode') {
      return { success: false, error: 'No active barcode mission' };
    }

    const expected = this.activeMission.barcodeValue?.trim().toLowerCase();
    const scanned = scannedValue.trim().toLowerCase();

    if (expected === scanned) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true, data: { scannedValue } };
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return { success: false, error: 'Barcode tidak cocok' };
  }

  private async startPhotoMission(config: MissionConfig): Promise<MissionResult> {
    if (!config.photoReference) {
      return { success: false, error: 'Photo reference not configured' };
    }

    this.photoReferenceUri = config.photoReference;
    return { success: true, data: { referenceUri: config.photoReference } };
  }

  async validatePhoto(capturedUri: string): Promise<MissionResult> {
    if (!this.activeMission || this.activeMission.type !== 'photo') {
      return { success: false, error: 'No active photo mission' };
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return { success: true, data: { capturedUri } };
  }

  private async startStepsMission(config: MissionConfig): Promise<MissionResult> {
    const target = config.stepCount || 30;
    
    try {
      const initial = await Pedometer.getStepCountAsync();
      this.stepCount = initial.steps || 0;

      this.pedometerSubscription = Pedometer.watchStepCount((result) => {
        this.stepCount = result.steps;
      });

      return { success: true, data: { target, current: 0 } };
    } catch (e) {
      return { success: false, error: 'Pedometer not available' };
    }
  }

  getStepsProgress(): { current: number; target: number; completed: boolean } {
    if (!this.activeMission || this.activeMission.type !== 'steps') {
      return { current: 0, target: 0, completed: false };
    }

    const target = this.activeMission.stepCount || 30;
    const current = Math.max(0, this.stepCount);
    return { current, target, completed: current >= target };
  }

  private async startSquatMission(config: MissionConfig): Promise<MissionResult> {
    const target = config.squatCount || 10;
    this.squatCount = 0;
    let inSquat = false;

    this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
      if (y < -0.5 && !inSquat) {
        inSquat = true;
      } else if (y > 0.5 && inSquat) {
        inSquat = false;
        this.squatCount++;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    });

    return { success: true, data: { target, current: 0 } };
  }

  getSquatProgress(): { current: number; target: number; completed: boolean } {
    if (!this.activeMission || this.activeMission.type !== 'squat') {
      return { current: 0, target: 0, completed: false };
    }

    const target = this.activeMission.squatCount || 10;
    return { current: this.squatCount, target, completed: this.squatCount >= target };
  }

  private startMathMission(config: MissionConfig): MissionResult {
    const count = config.mathQuestionCount || 3;
    const difficulty = config.mathDifficulty || 'medium';
    this.mathQuestions = this.generateMathQuestions(count, difficulty);
    this.currentMathIndex = 0;

    return { 
      success: true, 
      data: { 
        questions: this.mathQuestions,
        currentIndex: 0,
        total: count 
      } 
    };
  }

  private generateMathQuestions(count: number, difficulty: 'easy' | 'medium' | 'hard'): MathQuestion[] {
    const questions: MathQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      let a: number, b: number, answer: number;
      const ops = ['+', '-', '*'];
      
      switch (difficulty) {
        case 'easy':
          a = Math.floor(Math.random() * 20) + 1;
          b = Math.floor(Math.random() * 20) + 1;
          break;
        case 'medium':
          a = Math.floor(Math.random() * 50) + 10;
          b = Math.floor(Math.random() * 50) + 10;
          ops.push('/');
          break;
        case 'hard':
          a = Math.floor(Math.random() * 100) + 20;
          b = Math.floor(Math.random() * 100) + 20;
          ops.push('/');
          break;
      }

      const op = ops[Math.floor(Math.random() * ops.length)];
      
      switch (op) {
              case '+': answer = a + b; break;
              case '-': answer = a - b; break;
              case '*': answer = a * b; break;
              case '/':
                // For division, ensure clean division: a = answer * b, so answer = a / b
                answer = Math.floor(Math.random() * 20) + 1; // The result
                a = answer * b; // Make dividend
                break;
              default: answer = a + b;
            }

      const question = `${a} ${op} ${b} = ?`;
      const options = this.generateOptions(answer);
      
      questions.push({ question, answer, options });
    }
    
    return questions;
  }

  private generateOptions(correct: number): number[] {
    const options = new Set<number>();
    options.add(correct);
    
    while (options.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      if (offset !== 0) options.add(correct + offset);
    }
    
    return Array.from(options).sort(() => Math.random() - 0.5);
  }

  getCurrentMathQuestion(): MathQuestion | null {
    if (this.currentMathIndex >= this.mathQuestions.length) return null;
    return this.mathQuestions[this.currentMathIndex];
  }

  submitMathAnswer(answer: number): MissionResult {
    const question = this.getCurrentMathQuestion();
    if (!question) return { success: false, error: 'No active question' };

    if (answer === question.answer) {
      this.currentMathIndex++;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (this.currentMathIndex >= this.mathQuestions.length) {
        return { success: true, data: { completed: true } };
      }
      
      return { 
        success: true, 
        data: { 
          completed: false,
          nextQuestion: this.getCurrentMathQuestion(),
          progress: this.currentMathIndex,
          total: this.mathQuestions.length
        } 
      };
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return { success: false, error: 'Jawaban salah' };
  }

  private startTypingMission(config: MissionConfig): MissionResult {
    const texts = [
      'Bangun pagi adalah kunci kesuksesan',
      'Setiap hari adalah kesempatan baru',
      'Disiplin mengalahkan motivasi',
      'Konsistensi menciptakan kebiasaan',
      'Mimpi tidak akan bekerja kecuali kamu bekerja',
      'Hari ini lebih baik dari kemarin',
      'Bangun sekarang, menyesal nanti',
      'Waktu tidak menunggu siapa pun',
    ];
    
    this.typingTarget = config.typingText || texts[Math.floor(Math.random() * texts.length)];
    this.typingCurrent = '';

    return { 
      success: true, 
      data: { 
        targetText: this.typingTarget,
        currentText: '',
        progress: 0
      } 
    };
  }

  updateTypingInput(input: string): MissionResult {
    this.typingCurrent = input;
    const progress = Math.min(input.length / this.typingTarget.length, 1);

    if (input === this.typingTarget) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true, data: { completed: true } };
    }

    return { success: true, data: { completed: false, progress, currentText: input } };
  }

  private startMemoryMission(config: MissionConfig): MissionResult {
    const length = 5;
    const sequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
    
    this.memoryPuzzle = {
      sequence,
      userInput: [],
      currentIndex: 0,
    };

    return { 
      success: true, 
      data: { 
        sequence: [...sequence],
        currentIndex: 0,
        phase: 'display'
      } 
    };
  }

  submitMemoryInput(input: number): MissionResult {
    if (!this.memoryPuzzle) return { success: false, error: 'No active memory mission' };

    const { sequence, userInput, currentIndex } = this.memoryPuzzle;
    const expected = sequence[currentIndex];

    if (input === expected) {
      this.memoryPuzzle.userInput.push(input);
      this.memoryPuzzle.currentIndex++;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (this.memoryPuzzle.currentIndex >= sequence.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return { success: true, data: { completed: true } };
      }

      return { 
        success: true, 
        data: { 
          completed: false,
          progress: this.memoryPuzzle.currentIndex,
          total: sequence.length,
          phase: 'input'
        } 
      };
    }

    this.memoryPuzzle.userInput = [];
    this.memoryPuzzle.currentIndex = 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return { success: false, error: 'Urutan salah, coba lagi dari awal', data: { phase: 'display', sequence } };
  }

  private async startShakeMission(config: MissionConfig): Promise<MissionResult> {
    const target = config.shakeCount || 50;
    this.shakeCount = 0;
    let lastShakeTime = 0;

    this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      
      if (acceleration > 25 && now - lastShakeTime > 100) {
        this.shakeCount++;
        lastShakeTime = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    });

    return { success: true, data: { target, current: 0 } };
  }

  getShakeProgress(): { current: number; target: number; completed: boolean } {
    if (!this.activeMission || this.activeMission.type !== 'shake') {
      return { current: 0, target: 0, completed: false };
    }

    const target = this.activeMission.shakeCount || 50;
    return { current: this.shakeCount, target, completed: this.shakeCount >= target };
  }

  startEmergencyMission(type: 'shake' | 'typing'): MissionResult {
    if (type === 'shake') {
      return this.startShakeMission({ type: 'shake', shakeCount: 200 });
    } else {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(30);
      return this.startTypingMission({ type: 'typing', typingText: longText });
    }
  }

  getActiveMission(): MissionConfig | null {
    return this.activeMission;
  }

  getMissionProgress(): { 
    type: MissionType | null; 
    current: number; 
    target: number; 
    completed: boolean;
    elapsedMs: number;
  } {
    if (!this.activeMission) {
      return { type: null, current: 0, target: 0, completed: false, elapsedMs: 0 };
    }

    let current = 0, target = 0, completed = false;

    switch (this.activeMission.type) {
      case 'steps':
        const s = this.getStepsProgress();
        current = s.current; target = s.target; completed = s.completed;
        break;
      case 'squat':
        const sq = this.getSquatProgress();
        current = sq.current; target = sq.target; completed = sq.completed;
        break;
      case 'math':
        current = this.currentMathIndex; target = this.mathQuestions.length; completed = current >= target;
        break;
      case 'typing':
        current = this.typingCurrent.length; target = this.typingTarget.length; completed = current >= target;
        break;
      case 'memory':
        current = this.memoryPuzzle?.currentIndex || 0; target = this.memoryPuzzle?.sequence.length || 0; completed = current >= target;
        break;
      case 'shake':
        const sh = this.getShakeProgress();
        current = sh.current; target = sh.target; completed = sh.completed;
        break;
      case 'barcode':
      case 'photo':
        completed = false;
        break;
    }

    return {
      type: this.activeMission.type,
      current,
      target,
      completed,
      elapsedMs: Date.now() - this.missionStartTime,
    };
  }

  stopMission(): void {
    this.activeMission = null;
    this.resetCounters();
    
    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
      this.pedometerSubscription = null;
    }
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    if (this.barcodeSubscription) {
      this.barcodeSubscription.remove();
      this.barcodeSubscription = null;
    }
  }

  isMissionActive(): boolean {
    return this.activeMission !== null;
  }
}

export const missionManager = new MissionManager();