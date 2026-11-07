import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Accelerometer, Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { missionManager } from '../services/MissionManager';
import { audioEngine } from '../services/AudioEngine';

type RouteParams = {
  missionType: 'steps' | 'squat' | 'shake';
  emergency?: boolean;
};

export default function MissionPhysicalScreen() {
  const navigation = useNavigation();
  const route = useNavigation<any>().getParam('missionType') as RouteParams['missionType'];
  const emergency = useNavigation<any>().getParam('emergency') as boolean;
  const missionType = route || 'shake';
  
  const [smartMuteTime, setSmartMuteTime] = useState(15);
  const [smartMuteInterval, setSmartMuteInterval] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, target: 0, completed: false });
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    startSmartMuteTimer();
    startMission();
    
    return () => {
      if (smartMuteInterval) clearInterval(smartMuteInterval);
      missionManager.stopMission();
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

  const startMission = () => {
    const result = missionManager.startMission({
      type: missionType,
      stepCount: 30,
      squatCount: 10,
      shakeCount: emergency ? 200 : 50,
    });

    if (!result.success) {
      Alert.alert('Error', result.error || 'Gagal memulai misi');
    }

    // Start progress monitoring
    const progressInterval = setInterval(() => {
      const p = missionManager.getMissionProgress();
      setProgress(p);
      if (p.completed) {
        clearInterval(progressInterval);
        completeMission();
      }
    }, 500);
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
        ? 'Anda sudah dalam mode darurat. Lanjutkan?'
        : 'Ganti ke misi darurat: 200x goyang HP dengan kekuatan penuh?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Lanjutkan', style: 'destructive', onPress: () => {
          navigation.navigate('MissionPhysical', { missionType: 'shake', emergency: true });
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Progress Card */}
        <View style={styles.missionCard}>
          <Text style={styles.missionTitle}>{getMissionLabel(missionType)}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${progress.target > 0 ? (progress.current / progress.target) * 100 : 0}%` },
              ]} />
            </View>
            <Text style={styles.progressText}>
              {progress.current} / {progress.target} {getProgressUnit(missionType)}
            </Text>
          </View>

          {missionType === 'shake' && (
            <View style={styles.shakeVisualizer}>
              <View style={[
                styles.shakeMeter,
                { height: Math.min(accelerometerData.x * accelerometerData.x + accelerometerData.y * accelerometerData.y + accelerometerData.z * accelerometerData.z, 100) },
              ]} />
              <Text style={styles.shakeIntensity}>
                Intensitas: {(accelerometerData.x * accelerometerData.x + accelerometerData.y * accelerometerData.y + accelerometerData.z * accelerometerData.z).toFixed(1)}
              </Text>
            </View>
          )}

          {missionType === 'squat' && (
            <View style={styles.squatGuide}>
              <Text style={styles.guideText}>🏋️ Turun sampai paha sejajar lutut, lalu naik</Text>
              <Text style={styles.guideText}>Sensor mendeteksi gerakan naik-turun otomatis</Text>
            </View>
          )}

          {missionType === 'steps' && (
            <View style={stepsGuide}>
              <Text style={styles.guideText}>👟 Berjalanlah di sekitar ruangan</Text>
              <Text style={styles.guideText}>Pedometer menghitung langkah secara otomatis</Text>
            </View>
          )}
        </View>

        {/* Real-time Sensor Data */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Data Sensor Real-time</Text>
          <View style={styles.sensorGrid}>
            <SensorItem label="X" value={accelerometerData.x.toFixed(2)} unit="m/s²" />
            <SensorItem label="Y" value={accelerometerData.y.toFixed(2)} unit="m/s²" />
            <SensorItem label="Z" value={accelerometerData.z.toFixed(2)} unit="m/s²" />
            <SensorItem label="Total" value={Math.sqrt(accelerometerData.x**2 + accelerometerData.y**2 + accelerometerData.z**2).toFixed(2)} unit="m/s²" />
          </View>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyBypass}>
          <Text style={styles.emergencyText}>
            {emergency ? 'MODE DARURAT AKTIF' : 'Ganti Misi Darurat (200x Shake)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SensorItem({ label, value, unit }: any) {
  return (
    <View style={styles.sensorItem}>
      <Text style={styles.sensorLabel}>{label}</Text>
      <Text style={styles.sensorValue}>{value}</Text>
      <Text style={styles.sensorUnit}>{unit}</Text>
    </View>
  );
}

function getMissionLabel(type: string): string {
  const labels: Record<string, string> = {
    barcode: 'Scan Barcode',
    photo: 'Foto Objek',
    steps: 'Berjalan (Langkah)',
    squat: 'Squat',
    math: 'Matematika',
    typing: 'Mengetik',
    memory: 'Memori',
    shake: 'Goyang HP',
  };
  return labels[type] || type;
}

function getProgressUnit(type: string): string {
  const units: Record<string, string> = {
    steps: 'langkah',
    squat: 'squat',
    shake: 'goyangan',
  };
  return units[type] || '';
}

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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  missionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#222',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0033',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  shakeVisualizer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 12,
    marginBottom: 16,
  },
  shakeMeter: {
    width: '80%',
    height: 20,
    backgroundColor: '#FF0033',
    borderRadius: 10,
    marginBottom: 8,
  },
  shakeIntensity: {
    fontSize: 14,
    color: '#AAA',
    fontFamily: 'monospace',
  },
  squatGuide: {
    alignItems: 'center',
    gap: 8,
  },
  guideText: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  sensorCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sensorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  sensorItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  sensorLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  sensorUnit: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  emergencyButton: {
    marginTop: 16,
    paddingVertical: 14,
  },
  emergencyText: {
    fontSize: 13,
    color: '#FFD700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

// Fix typo
const stepsGuide = {
  alignItems: 'center',
  gap: 8,
};