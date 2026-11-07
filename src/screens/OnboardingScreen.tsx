import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useAlarmStore } from '../store/alarmStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Selamat Datang di BangunPaksa',
    subtitle: 'Alarm yang memaksa Anda benar-benar bangun',
    illustration: '💪',
    color: '#FF0033',
  },
  {
    id: 'missions',
    title: 'Misi Bangun Cerdas',
    subtitle: 'Pilih dari 8 jenis misi: barcode, foto, langkah, squat, matematika, mengetik, memori, goyang',
    illustration: '🎯',
    color: '#FF8800',
  },
  {
    id: 'anti-cheat',
    title: 'Anti-Cheat Hardcore',
    subtitle: 'Kunci volume, blokir power menu, force close, deteksi reboot, screen pinning — tidak bisa di-cheat',
    illustration: '🛡️',
    color: '#00C851',
  },
  {
    id: 'wakeup-check',
    title: 'Wake-Up Check',
    subtitle: 'Verifikasi zig-zag 5 menit setelah misi. Timeout = alarm restart volume 100% + hardcore mode',
    illustration: '⏰',
    color: '#33B5E5',
  },
  {
    id: 'audio',
    title: 'Audio Psikoakustik & Crescendo',
    subtitle: 'Sirine darurat, suara psikologis, binaural beats, volume naik bertahap, pitch/tempo escalation',
    illustration: '🔊',
    color: '#AA66CC',
  },
  {
    id: 'permissions',
    title: 'Izin yang Diperlukan',
    subtitle: 'Kamera, mikrofon, sensor gerak, overlay, alarm exact, battery optimization off — untuk fungsi penuh',
    illustration: '🔐',
    color: '#FF4444',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { settings, updateSettings } = useAlarmStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [animValue] = useState(new Animated.Value(0));
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    updateSettings({ onboardingCompleted: true });
    navigation.navigate('Home');
  };

  const skipOnboarding = () => {
    updateSettings({ onboardingCompleted: true });
    navigation.navigate('Home');
  };

  const current = ONBOARDING_STEPS[currentStep];
  const progress = (currentStep + 1) / ONBOARDING_STEPS.length;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: `${progress * 100}%`,
              backgroundColor: current.color,
            },
          ]}
        />
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Lewati</Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={[styles.card, { borderColor: current.color }]}>
          <View style={styles.illustrationContainer}>
            <Text style={styles.illustration}>{current.illustration}</Text>
          </View>
          
          <Text style={[styles.title, { color: current.color }]}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>

          {currentStep === ONBOARDING_STEPS.length - 1 && (
            <TouchableOpacity style={[styles.startButton, { backgroundColor: current.color }]} onPress={completeOnboarding}>
              <Text style={styles.startButtonText}>Mulai Gunakan BangunPaksa</Text>
            </TouchableOpacity>
          )}

          {currentStep < ONBOARDING_STEPS.length - 1 && (
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: current.color }]} onPress={nextStep}>
              <Text style={styles.nextButtonText}>Lanjut</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Indicators */}
        <View style={styles.indicators}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.indicatorActive,
                { backgroundColor: index === currentStep ? current.color : '#333' },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      {/* Permission Prompt at End */}
      {showPermissionPrompt && (
        <PermissionPrompt onComplete={() => setShowPermissionPrompt(false)} />
      )}
    </View>
  );
}

function PermissionPrompt({ onComplete }: any) {
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    motion: false,
    overlay: false,
    exactAlarm: false,
    batteryOptimization: false,
  });

  const requestAllPermissions = async () => {
    // In real app, request each permission
    // For now, just mark all as granted
    setPermissions({
      camera: true,
      microphone: true,
      motion: true,
      overlay: true,
      exactAlarm: true,
      batteryOptimization: true,
    });
    
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const permissionItems = [
    { key: 'camera', label: 'Kamera', desc: 'Scan barcode & foto objek', icon: '📷' },
    { key: 'microphone', label: 'Mikrofon', desc: 'TTS briefing (opsional)', icon: '🎤' },
    { key: 'motion', label: 'Sensor Gerak', desc: 'Deteksi squat, langkah, goyang', icon: '📳' },
    { key: 'overlay', label: 'Overlay', desc: 'Blokir power menu & force close', icon: '🛡️' },
    { key: 'exactAlarm', label: 'Exact Alarm', desc: 'Alarm tepat waktu di background', icon: '⏰' },
    { key: 'batteryOptimization', label: 'Battery Opt.', desc: 'Matikan optimasi untuk alarm andal', icon: '🔋' },
  ];

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>🔐 Izin yang Diperlukan</Text>
        <Text style={styles.modalDesc}>BangunPaksa memerlukan izin berikut untuk berfungsi penuh:</Text>
        
        <View style={styles.permissionList}>
          {permissionItems.map(item => (
            <View key={item.key} style={styles.permissionItem}>
              <Text style={styles.permissionIcon}>{item.icon}</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionLabel}>{item.label}</Text>
                <Text style={styles.permissionDesc}>{item.desc}</Text>
              </View>
              <View style={[
                styles.permissionStatus,
                permissions[item.key as keyof typeof permissions] && styles.permissionStatusGranted,
              ]}>
                <Text style={[
                  styles.permissionStatusText,
                  permissions[item.key as keyof typeof permissions] && styles.permissionStatusTextGranted,
                ]}>
                  {permissions[item.key as keyof typeof permissions] ? '✓ Diberikan' : '⏳ Menunggu'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.modalButton} onPress={requestAllPermissions}>
          <Text style={styles.modalButtonText}>Minta Semua Izin Sekarang</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onComplete}>
          <Text style={styles.modalButtonSecondaryText}>Nanti Saja (Beberapa Fitur Terbatas)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#222',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 0,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 24,
    paddingTop: 100,
    paddingBottom: 100,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 32,
    borderWidth: 2,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF003320',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  illustration: {
    fontSize: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  startButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#333',
  },
  indicatorActive: {
    width: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionList: {
    gap: 12,
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  permissionIcon: {
    fontSize: 24,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  permissionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  permissionStatusGranted: {
    backgroundColor: '#00C85120',
  },
  permissionStatusText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  permissionStatusTextGranted: {
    color: '#00C851',
  },
  modalButton: {
    backgroundColor: '#FF0033',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: '#AAA',
    fontWeight: '600',
  },
});