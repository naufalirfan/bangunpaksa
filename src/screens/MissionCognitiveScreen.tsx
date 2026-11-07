import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { missionManager } from '../services/MissionManager';
import { audioEngine } from '../services/AudioEngine';

type RouteParams = {
  missionType: 'math' | 'typing' | 'memory';
  emergency?: boolean;
};

export default function MissionCognitiveScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { missionType, emergency } = route.params;
  const [smartMuteTime, setSmartMuteTime] = useState(15);
  const [smartMuteInterval, setSmartMuteInterval] = useState<any>(null);
  const [completed, setCompleted] = useState(false);

  // Math
  const [mathQuestions, setMathQuestions] = useState<any[]>([]);
  const [currentMathIndex, setCurrentMathIndex] = useState(0);
  const [selectedMathAnswer, setSelectedMathAnswer] = useState<number | null>(null);
  const [mathError, setMathError] = useState(false);

  // Typing
  const [typingTarget, setTypingTarget] = useState('');
  const [typingCurrent, setTypingCurrent] = useState('');
  const [typingError, setTypingError] = useState(false);

  // Memory
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryUserInput, setMemoryUserInput] = useState<number[]>([]);
  const [memoryPhase, setMemoryPhase] = useState<'display' | 'input'>('display');
  const [memoryError, setMemoryError] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);

  useEffect(() => {
    startSmartMuteTimer();
    initializeMission();
    
    return () => {
      if (smartMuteInterval) clearInterval(smartMuteInterval);
    };
  }, []);

  const startSmartMuteTimer = () => {
    setSmartMuteTime(15);
    const interval = setInterval(() => {
      setSmartMuteTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          audioEngine.triggerSmartMute().catch(console.error);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setSmartMuteInterval(interval);
  };

  const initializeMission = () => {
    const result = missionManager.startMission({
      type: missionType,
      mathDifficulty: 'medium',
      mathQuestionCount: 3,
    });

    if (result.success && result.data) {
      if (missionType === 'math') {
        setMathQuestions(result.data.questions);
      } else if (missionType === 'typing') {
        setTypingTarget(result.data.targetText);
      } else if (missionType === 'memory') {
        setMemorySequence(result.data.sequence);
        startMemoryDisplay();
      }
    }
  };

  const startMemoryDisplay = () => {
    setMemoryPhase('display');
    setDisplayIndex(0);
    const interval = setInterval(() => {
      setDisplayIndex(prev => {
        if (prev >= memorySequence.length - 1) {
          clearInterval(interval);
          setMemoryPhase('input');
          setMemoryUserInput([]);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleMathAnswer = (answer: number) => {
    setSelectedMathAnswer(answer);
    const result = missionManager.submitMathAnswer(answer);
    
    if (result.success) {
      if (result.data?.completed) {
        completeMission();
      } else {
        setCurrentMathIndex(prev => prev + 1);
        setSelectedMathAnswer(null);
        setMathError(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      setMathError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTypingChange = (text: string) => {
    setTypingCurrent(text);
    setTypingError(false);
    
    const result = missionManager.updateTypingInput(text);
    if (result.success && result.data?.completed) {
      completeMission();
    }
  };

  const handleMemoryInput = (num: number) => {
    if (memoryPhase !== 'input') return;
    
    const newInput = [...memoryUserInput, num];
    setMemoryUserInput(newInput);
    
    const result = missionManager.submitMemoryInput(num);
    
    if (result.success) {
      if (result.data?.completed) {
        completeMission();
      }
      setMemoryError(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setMemoryError(true);
      setMemoryUserInput([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (result.data?.phase === 'display') {
        setMemoryPhase('display');
        setDisplayIndex(0);
        startMemoryDisplay();
      }
    }
  };

  const completeMission = async () => {
    setCompleted(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    missionManager.stopMission();
    
    const { activeAlarm } = missionManager.getActiveMission() || {};
    if (activeAlarm?.wakeUpCheckEnabled) {
      navigation.navigate('WakeUpCheck');
    } else {
      navigation.navigate('Home');
    }
  };

  const handleEmergencyBypass = () => {
    Alert.alert(
      'Misi Darurat',
      emergency 
        ? 'Anda sudah dalam mode darurat. Lanjutkan dengan mengetik 300 kata?'
        : 'Ganti ke misi darurat: mengetik ulang 5 paragraf (300 kata) tanpa copy-paste?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Lanjutkan', style: 'destructive', onPress: () => {
          navigation.navigate('MissionCognitive', { missionType: 'typing', emergency: true });
        }},
      ]
    );
  };

  if (completed) return null;

  return (
    <View style={styles.container}>
      {/* Smart Mute Timer */}
      <View style={styles.smartMuteBar}>
        <View style={[
          styles.smartMuteProgress,
          { width: `${(smartMuteTime / 15) * 100}%` },
        ]} />
        <Text style={styles.smartMuteText}>🔇 Hening sementara: {smartMuteTime} dtk</Text>
      </View>

      {/* Mission Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {missionType === 'math' && <MathMission />}
        {missionType === 'typing' && <TypingMission />}
        {missionType === 'memory' && <MemoryMission />}

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyBypass}>
          <Text style={styles.emergencyText}>
            {emergency ? 'Mode Darurat Aktif' : 'Ganti Misi Darurat (300 Kata Mengetik)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MathMission() {
  const { mathQuestions, currentMathIndex, selectedMathAnswer, mathError } = useMissionCognitiveState();
  const question = mathQuestions[currentMathIndex];
  
  if (!question) return null;

  return (
    <View style={styles.missionCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Soal {currentMathIndex + 1} dari {mathQuestions.length}</Text>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${((currentMathIndex + 1) / mathQuestions.length) * 100}%` },
          ]} />
        </View>
      </View>

      <Text style={styles.questionText}>{question.question}</Text>
      {mathError && <Text style={styles.errorText}>Jawaban salah! Coba lagi.</Text>}

      <View style={styles.optionsGrid}>
        {question.options.map((option: number, idx: number) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.optionButton,
              selectedMathAnswer === option && styles.optionButtonSelected,
            ]}
            onPress={() => handleMathAnswer(option)}
            disabled={!!selectedMathAnswer}
          >
            <Text style={[
              styles.optionText,
              selectedMathAnswer === option && styles.optionTextSelected,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TypingMission() {
  const { typingTarget, typingCurrent, typingError } = useMissionCognitiveState();
  const progress = Math.min(typingCurrent.length / typingTarget.length, 1);

  return (
    <View style={styles.missionCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Ketik ulang teks di bawah</Text>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
          ]} />
        </View>
      </View>

      <View style={styles.targetTextContainer}>
        <Text style={styles.targetText}>{typingTarget}</Text>
      </View>

      <TextInput
        style={[
          styles.typingInput,
          typingError && styles.typingInputError,
        ]}
        value={typingCurrent}
        onChangeText={handleTypingChange}
        placeholder="Ketik di sini..."
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        maxLength={typingTarget.length}
      />

      <Text style={styles.typingProgress}>
        {typingCurrent.length} / {typingTarget.length} karakter
      </Text>
      {typingError && <Text style={styles.errorText}>Teks tidak cocok! Periksa kembali.</Text>}
    </View>
  );
}

function MemoryMission() {
  const { memorySequence, memoryUserInput, memoryPhase, memoryError, displayIndex } = useMissionCognitiveState();
  
  if (memoryPhase === 'display') {
    return (
      <View style={styles.missionCard}>
        <Text style={styles.memoryPhaseText}>Hafal Urutan Angka</Text>
        <View style={styles.memoryDisplay}>
          {memorySequence.map((num, idx) => (
            <View
              key={idx}
              style={[
                styles.memoryNumber,
                idx <= displayIndex && styles.memoryNumberVisible,
                idx === displayIndex && styles.memoryNumberCurrent,
              ]}
            >
              <Text style={styles.memoryNumberText}>{num}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.memoryHint}>
          {displayIndex < memorySequence.length - 1 
            ? `Menampilkan angka ke-${displayIndex + 1}...` 
            : 'Sekarang giliran Anda mengetik!'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.missionCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Ketik Ulang Urutan</Text>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${(memoryUserInput.length / memorySequence.length) * 100}%` },
          ]} />
        </View>
      </View>

      <View style={styles.memoryInputDisplay}>
        {memorySequence.map((num, idx) => (
          <View
            key={idx}
            style={[
              styles.memoryNumber,
              idx < memoryUserInput.length && styles.memoryNumberFilled,
              idx === memoryUserInput.length && styles.memoryNumberCurrent,
            ]}
          >
            <Text style={styles.memoryNumberText}>
              {idx < memoryUserInput.length ? memoryUserInput[idx] : '?'}
            </Text>
          </View>
        ))}
      </View>

      {memoryError && <Text style={styles.errorText}>Urutan salah! Mulai dari awal.</Text>}

      <View style={styles.numpad}>
        {[1,2,3,4,5,6,7,8,9,0].map(num => (
          <TouchableOpacity
            key={num}
            style={styles.numpadButton}
            onPress={() => handleMemoryInput(num)}
          >
            <Text style={styles.numpadText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.numpadButton, styles.numpadDelete]}
          onPress={() => {
            const { memoryUserInput, setMemoryUserInput } = useMissionCognitiveState();
            setMemoryUserInput(memoryUserInput.slice(0, -1));
          }}
        >
          <Text style={styles.numpadText}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Hook to access mission state (simplified for inline components)
function useMissionCognitiveState() {
  // This would normally use a context or global state
  // For now, we'll use the missionManager directly
  return {
    mathQuestions: missionManager.getActiveMission()?.missionConfig?.questions || [],
    currentMathIndex: 0,
    selectedMathAnswer: null,
    mathError: false,
    typingTarget: '',
    typingCurrent: '',
    typingError: false,
    memorySequence: [],
    memoryUserInput: [],
    memoryPhase: 'display' as const,
    memoryError: false,
    displayIndex: 0,
  };
}

// The actual components need access to the parent state
// This is a limitation of inline components - in production, use proper state management

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  smartMuteBar: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  smartMuteProgress: {
    height: 4,
    backgroundColor: '#FF0033',
    borderRadius: 2,
  },
  smartMuteText: {
    fontSize: 13,
    color: '#CCC',
    textAlign: 'center',
    marginTop: 8,
  },
  missionCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressHeader: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0033',
    borderRadius: 3,
  },
  questionText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionButton: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  optionButtonSelected: {
    backgroundColor: '#FF0033',
    borderColor: '#FF0033',
  },
  optionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  targetTextContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  targetText: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
  },
  typingInput: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFF',
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typingInputError: {
    borderColor: '#FF4444',
  },
  typingProgress: {
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
    marginTop: 8,
  },
  memoryPhaseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  memoryDisplay: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  memoryNumber: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
    opacity: 0.3,
  },
  memoryNumberVisible: {
    opacity: 1,
    backgroundColor: '#FF0033',
    borderColor: '#FF0033',
  },
  memoryNumberCurrent: {
    transform: [{ scale: 1.1 }],
  },
  memoryNumberFilled: {
    backgroundColor: '#00C851',
    borderColor: '#00C851',
  },
  memoryNumberText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memoryHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  memoryInputDisplay: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  numpadButton: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  numpadDelete: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  numpadText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  emergencyButton: {
    marginTop: 24,
    paddingVertical: 14,
  },
  emergencyText: {
    fontSize: 13,
    color: '#FFD700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});