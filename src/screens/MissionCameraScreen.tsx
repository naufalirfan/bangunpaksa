import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { missionManager } from '../services/MissionManager';
import { audioEngine } from '../services/AudioEngine';

type RouteParams = {
  missionType: 'barcode' | 'photo';
  emergency?: boolean;
};

export default function MissionCameraScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { missionType, emergency } = route.params;
  const { activeAlarm } = missionManager.getActiveMission() || {};
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(true);
  const [smartMuteTime, setSmartMuteTime] = useState(15);
  const cameraRef = useRef<CameraView>(null);
  const [smartMuteInterval, setSmartMuteInterval] = useState<any>(null);

  useEffect(() => {
    requestPermissions();
    startSmartMuteTimer();
    
    return () => {
      if (smartMuteInterval) clearInterval(smartMuteInterval);
    };
  }, []);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startSmartMuteTimer = () => {
    setSmartMuteTime(15);
    const interval = setInterval(() => {
      setSmartMuteTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Restore volume
          audioEngine.triggerSmartMute().catch(console.error);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setSmartMuteInterval(interval);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    const result = await missionManager.validateBarcode(data);
    if (result.success) {
      await completeMission();
    } else {
      Alert.alert('Barcode Salah', result.error || 'Barcode tidak cocok', [
        { text: 'Coba Lagi', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handlePhotoTaken = async (photo: any) => {
    if (scanned) return;
    setScanned(true);
    
    const result = await missionManager.validatePhoto(photo.uri);
    if (result.success) {
      await completeMission();
    } else {
      Alert.alert('Foto Gagal', result.error || 'Validasi foto gagal', [
        { text: 'Ambil Lagi', onPress: () => setScanned(false) },
      ]);
    }
  };

  const completeMission = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    missionManager.stopMission();
    
    if (activeAlarm?.wakeUpCheckEnabled) {
      navigation.navigate('WakeUpCheck');
    } else {
      navigation.navigate('Home');
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || scanned) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo) await handlePhotoTaken(photo);
    } catch (e) {
      console.error(e);
      setScanned(false);
    }
  };

  const handleEmergencyBypass = () => {
    Alert.alert(
      'Misi Darurat',
      emergency 
        ? 'Anda sudah dalam mode darurat. Lanjutkan dengan 200x goyang?'
        : 'Ganti ke misi darurat: 200x goyang HP dengan kekuatan penuh?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Lanjutkan', style: 'destructive', onPress: () => {
          navigation.navigate('MissionPhysical', { missionType: 'shake', emergency: true });
        }},
      ]
    );
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionText}>
            Aplikasi memerlukan akses kamera untuk misi {missionType === 'barcode' ? 'scan barcode' : 'foto objek'}.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Buka Pengaturan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={missionType === 'barcode' && !scanned ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
        }}
      >
        {/* Overlay UI */}
        <View style={styles.overlay}>
          {/* Smart Mute Timer */}
          <View style={styles.smartMuteBar}>
            <View style={[
              styles.smartMuteProgress,
              { width: `${(smartMuteTime / 15) * 100}%` },
            ]} />
            <Text style={styles.smartMuteText}>🔇 Hening sementara: {smartMuteTime} dtk</Text>
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinderFrame}>
              {missionType === 'barcode' && (
                <View style={styles.barcodeLine} />
              )}
              {missionType === 'photo' && (
                <Text style={styles.photoHint}>📸 Arahkan ke objek referensi</Text>
              )}
            </View>
            <Text style={styles.viewfinderHint}>
              {missionType === 'barcode' 
                ? 'Pindai barcode/QR yang ditentukan' 
                : 'Ambil foto objek yang sama dengan referensi'}
            </Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>
              {emergency ? 'MODE DARURAT' : `Misi: ${getMissionLabel(missionType)}`}
            </Text>
          </View>

          {/* Emergency Button */}
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyBypass}>
            <Text style={styles.emergencyText}>Ganti Misi Darurat (200x Shake)</Text>
          </TouchableOpacity>

          {/* Shutter (photo mission) */}
          {missionType === 'photo' && (
            <TouchableOpacity style={styles.shutterButton} onPress={capturePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          )}

          {/* Flash Toggle */}
          <TouchableOpacity style={styles.flashButton} onPress={() => setFlashOn(!flashOn)}>
            <Text style={styles.flashText}>{flashOn ? '🔦 Senter: ON' : '🔦 Senter: OFF'}</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#FF0033',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  smartMuteBar: {
    marginTop: 40,
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
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#FF0033',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,0,51,0.1)',
  },
  barcodeLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: '#FF0033',
    opacity: 0.8,
  },
  photoHint: {
    color: '#FFF',
    fontSize: 14,
  },
  viewfinderHint: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  progressIndicator: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  emergencyButton: {
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emergencyText: {
    fontSize: 13,
    color: '#FFD700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  shutterButton: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  flashButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
  },
  flashText: {
    fontSize: 14,
    color: '#FFF',
  },
});