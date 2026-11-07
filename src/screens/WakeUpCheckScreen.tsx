import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { wakeUpCheck } from '../services/WakeUpCheck';
import { audioEngine } from '../services/AudioEngine';
import { antiCheat } from '../services/AntiCheat';
import { useAlarmStore } from '../store/alarmStore';

export default function WakeUpCheckScreen() {
  const navigation = useNavigation();
  const { recordWakeUp, activeAlarm } = useAlarmStore();
  const [countdown, setCountdown] = useState(60);
  const [zigzagProgress, setZigzagProgress] = useState(0);
  const [zigzagDirection, setZigzagDirection] = useState(1);
  const [showZigzag, setShowZigzag] = useState(false);
  const [completed, setCompleted] = useState(false);
  const countdownRef = useRef<any>(null);
  const panRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startCountdown();
    
    // Start zigzag after a moment
    setTimeout(() => setShowZigzag(true), 1000);
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = async () => {
    if (completed) return;
    await restartAlarm();
  };

  const restartAlarm = async () => {
    await antiCheat.activate({ level: 'hardcore' });
    if (activeAlarm) {
      await audioEngine.playAlarm(activeAlarm.soundId, {
        initialVolume: 100,
        targetVolume: 100,
        crescendoDuration: 0,
      });
    }
    navigation.navigate('AlarmRinging');
  };

  const handlePanResponder = (dx: number) => {
    const newProgress = zigzagProgress + dx * 0.01 * zigzagDirection;
    const clamped = Math.max(0, Math.min(1, newProgress));
    setZigzagProgress(clamped);
    
    if (clamped >= 1) {
      handleZigzagComplete();
    } else if (clamped <= 0 && zigzagDirection === -1) {
      setZigzagDirection(1);
    }
  };

  const handleZigzagComplete = async () => {
    setCompleted(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearInterval(countdownRef.current!);
    
    const { currentRepeat, repeatCount } = getWakeUpState();
    if (currentRepeat >= repeatCount) {
      recordWakeUp(true, 60 - countdown, 'wake_up_check');
      navigation.navigate('Home');
    } else {
      // Next repeat
      setTimeout(() => {
        setZigzagProgress(0);
        setZigzagDirection(1);
        setCountdown(60);
        startCountdown();
      }, 1000);
    }
  };

  const getWakeUpState = () => {
    return {
      currentRepeat: 1,
      repeatCount: activeAlarm?.wakeUpCheckRepeat || 1,
    };
  };

  const handleEmergencyBypass = () => {
    Alert.alert(
      'Tidak Bisa Bangun?',
      'Alarm akan berbunyi lagi dengan volume maksimal. Yakin ingin melewatkan verifikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Restart Alarm', style: 'destructive', onPress: restartAlarm },
      ]
    );
  };

  if (completed) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⏰ Wake-Up Check</Text>
        <Text style={styles.subtitle}>
          {getWakeUpState().currentRepeat} / {getWakeUpState().repeatCount}
        </Text>
      </View>

      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>Konfirmasi dalam</Text>
        <Animated.Text style={styles.countdownText}>
          {countdown}s
        </Animated.Text>
      </View>

      {showZigzag && (
        <View style={styles.zigzagContainer}>
          <Text style={styles.zigzagLabel}>Geser jari mengikuti pola zig-zag</Text>
          
          <View style={styles.zigzagTrack}>
            <View style={styles.zigzagPath}>
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.zigzagPoint,
                    {
                      left: `${(i / 7) * 100}%`,
                      top: i % 2 === 0 ? '10%' : '90%',
                    },
                  ]}
                />
              ))}
            </View>
            
            <Animated.View
              style={[
                styles.zigzagThumb,
                {
                  left: `${zigzagProgress * 100}%`,
                  top: zigzagDirection === 1 
                    ? `${10 + zigzagProgress * 80}%` 
                    : `${90 - zigzagProgress * 80}%`,
                },
              ]}
            >
              <View style={styles.thumbInner} />
            </Animated.View>
          </View>

          <View style={styles.zigzagProgressBar}>
            <View style={[
              styles.zigzagProgressFill,
              { width: `${zigzagProgress * 100}%` },
            ]} />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyBypass}>
        <Text style={styles.emergencyText}>Tidak bisa bangun? Restart alarm</Text>
      </TouchableOpacity>

      <View style={styles.antiCheatNotice}>
        <Text style={styles.noticeText}>⚠️ Jika waktu habis, alarm restart volume 100% + Anti-Cheat Hardcore</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  countdownLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FF0033',
    fontFamily: 'monospace',
  },
  zigzagContainer: {
    marginBottom: 40,
  },
  zigzagLabel: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  zigzagTrack: {
    height: 120,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    overflow: 'hidden',
  },
  zigzagPath: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  zigzagPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0033',
    opacity: 0.5,
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
  zigzagThumb: {
    position: 'absolute',
    width: 48,
    height: 48,
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  thumbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#FF0033',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  zigzagProgressBar: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  zigzagProgressFill: {
    height: '100%',
    backgroundColor: '#FF0033',
    borderRadius: 3,
  },
  emergencyButton: {
    marginTop: 24,
    paddingVertical: 16,
  },
  emergencyText: {
    fontSize: 14,
    color: '#FFD700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  antiCheatNotice: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#330000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  noticeText: {
    fontSize: 13,
    color: '#FF8888',
    textAlign: 'center',
  },
});