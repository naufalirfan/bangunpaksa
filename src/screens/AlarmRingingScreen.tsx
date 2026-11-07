import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '../store/alarmStore';
import { audioEngine } from '../services/AudioEngine';
import { missionManager } from '../services/MissionManager';
import { antiCheat } from '../services/AntiCheat';
import { wakeUpCheck } from '../services/WakeUpCheck';
import * as Haptics from 'expo-haptics';

export default function AlarmRingingScreen() {
  const navigation = useNavigation();
  const { activeAlarm, setAlarmRinging, setActiveAlarm, settings } = useAlarmStore();
  const [animationValue] = useState(new Animated.Value(0));
  const [strobeValue] = useState(new Animated.Value(0));
  const [showMissionButton, setShowMissionButton] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!activeAlarm) {
      navigation.goBack();
      return;
    }

    // Start alarm
    const startAlarm = async () => {
      await antiCheat.activate({ level: activeAlarm.antiCheatLevel as any });
      
      await audioEngine.playAlarm(activeAlarm.soundId, {
        initialVolume: activeAlarm.progressiveCrescendo ? 30 : 100,
        targetVolume: 100,
        crescendoDuration: activeAlarm.progressiveCrescendo ? 30 : 0,
        smartMuteDuration: 15,
      });

      // Start strobe animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(strobeValue, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(strobeValue, { toValue: 0, duration: 250, useNativeDriver: true }),
        ])
      ).start();

      // Countdown before showing mission button (anti-muscle memory)
      const countdownInterval = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(countdownInterval);
            setShowMissionButton(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    };

    startAlarm();

    return () => {
      animationValue.stopAnimation();
      strobeValue.stopAnimation();
    };
  }, [activeAlarm]);

  const handleStartMission = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await audioEngine.triggerSmartMute();
    
    // Start mission based on type
    const result = missionManager.startMission({
      type: activeAlarm!.missionType,
      ...activeAlarm!.missionConfig,
    });

    if (result.success) {
      if (['barcode', 'photo'].includes(activeAlarm!.missionType)) {
        navigation.navigate('MissionCamera', { missionType: activeAlarm!.missionType });
      } else if (['math', 'typing', 'memory'].includes(activeAlarm!.missionType)) {
        navigation.navigate('MissionCognitive', { missionType: activeAlarm!.missionType });
      } else {
        navigation.navigate('MissionPhysical', { missionType: activeAlarm!.missionType });
      }
    }
  };

  const handleEmergencyBypass = async () => {
    Alert.alert(
      'Misi Darurat',
      'Ini akan mengganti misi dengan tugas yang sangat sulit (200x goyang atau mengetik 300 kata). Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Saya Bangun', style: 'destructive', onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const emergencyResult = missionManager.startEmergencyMission('shake');
          if (emergencyResult.success) {
            navigation.navigate('MissionPhysical', { missionType: 'shake', emergency: true });
          }
        }},
      ]
    );
  };

  if (!activeAlarm) return null;

  const bgColors = ['#FF0033', '#CCFF00', '#000000'];
  const bgColor = strobeValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: bgColors,
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Status Bar Area */}
      <View style={styles.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.timeText}>{activeAlarm.time}</Text>
        <Text style={styles.alarmLabel}>{activeAlarm.label}</Text>
        {activeAlarm.streak > 0 && (
          <Text style={styles.streakText}>🔥 Jaga {activeAlarm.streak} Hari Streak Bangun Pagi!</Text>
        )}
      </View>

      {/* Center Animation */}
      <View style={styles.centerContainer}>
        <Animated.View style={[
          styles.waveContainer,
          { opacity: animationValue },
        ]}>
          <Text style={styles.waveText}>🌊</Text>
        </Animated.View>
        
        <View style={styles.calendarTicker}>
          <Text style={styles.calendarText}>Hari ini: Kosong • Cuaca: 28°C • Rapat: Tidak ada</Text>
        </View>
      </View>

      {/* Countdown / Mission Button */}
      <View style={styles.footer}>
        {showMissionButton ? (
          <TouchableOpacity style={styles.missionButton} onPress={handleStartMission} activeOpacity={0.9}>
            <Text style={styles.missionButtonText}>
              MULAI MISI: {getMissionLabel(activeAlarm.missionType).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.countdownText}>Tombol muncul dalam {countdown} detik...</Text>
        )}
        
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyBypass}>
          <Text style={styles.emergencyText}>Ganti Misi Darurat (200x Shake)</Text>
        </TouchableOpacity>
      </View>

      {/* Anti-cheat indicator */}
      <View style={styles.antiCheatIndicator}>
        <Text style={styles.antiCheatText}>🔒 Anti-Cheat Aktif • Volume Terkunci 100%</Text>
      </View>
    </View>
  );
}

function getMissionLabel(type: string): string {
  const labels: Record<string, string> = {
    barcode: 'Scan Barcode',
    photo: 'Foto Objek',
    steps: 'Berjalan',
    squat: 'Squat',
    math: 'Matematika',
    typing: 'Mengetik',
    memory: 'Memori',
    shake: 'Goyang',
  };
  return labels[type] || type;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  statusBar: {
    height: 40,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
    letterSpacing: -2,
  },
  alarmLabel: {
    fontSize: 18,
    color: '#CCC',
    marginTop: 8,
  },
  streakText: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  waveContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,0,51,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  waveText: {
    fontSize: 48,
  },
  calendarTicker: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calendarText: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  missionButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FF0033',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  missionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  countdownText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  emergencyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emergencyText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
  },
  antiCheatIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  antiCheatText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
});