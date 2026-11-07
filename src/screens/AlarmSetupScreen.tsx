import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform, Alert, Modal, Picker } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAlarmStore } from '../store/alarmStore';
import { audioEngine } from '../services/AudioEngine';

type RouteParams = {
  alarm?: any;
};

export default function AlarmSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { addAlarm, updateAlarm } = useAlarmStore();
  const isEditing = !!route.params?.alarm;
  const editingAlarm = route.params?.alarm;

  const [formData, setFormData] = useState({
    time: editingAlarm?.time || '06:00',
    label: editingAlarm?.label || 'Alarm Bangun',
    days: editingAlarm?.days || [1, 2, 3, 4, 5],
    missionType: editingAlarm?.missionType || 'math',
    missionConfig: editingAlarm?.missionConfig || {},
    wakeUpCheckEnabled: editingAlarm?.wakeUpCheckEnabled ?? true,
    wakeUpCheckDelay: editingAlarm?.wakeUpCheckDelay || 5,
    wakeUpCheckRepeat: editingAlarm?.wakeUpCheckRepeat || 1,
    soundId: editingAlarm?.soundId || 'siren_fire',
    volume: editingAlarm?.volume || 100,
    progressiveCrescendo: editingAlarm?.progressiveCrescendo ?? true,
    antiCheatLevel: editingAlarm?.antiCheatLevel || 'standard',
    enabled: true,
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showMissionConfig, setShowMissionConfig] = useState(false);

  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const fullDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const missionTypes = [
    { value: 'barcode', label: '📷 Scan Barcode/QR', pro: true },
    { value: 'photo', label: '📸 Foto Objek', pro: true },
    { value: 'steps', label: '👟 Berjalan (Langkah)', pro: true },
    { value: 'squat', label: '🏋️ Squat', pro: true },
    { value: 'math', label: '🧮 Matematika', pro: false },
    { value: 'typing', label: '⌨️ Mengetik Teks', pro: false },
    { value: 'memory', label: '🧠 Puzzle Memori', pro: false },
    { value: 'shake', label: '📳 Goyang HP', pro: false },
  ];

  const sounds = audioEngine.getAllSounds();

  const handleSave = () => {
    if (formData.days.length === 0) {
      Alert.alert('Error', 'Pilih minimal 1 hari');
      return;
    }

    const missionConfig = { ...formData.missionConfig };
    if (formData.missionType === 'barcode' && !missionConfig.barcodeValue) {
      Alert.alert('Error', 'Masukkan nilai barcode/QR yang diharapkan');
      return;
    }
    if (formData.missionType === 'steps' && !missionConfig.stepCount) {
      Alert.alert('Error', 'Masukkan target jumlah langkah');
      return;
    }
    if (formData.missionType === 'squat' && !missionConfig.squatCount) {
      Alert.alert('Error', 'Masukkan target jumlah squat');
      return;
    }
    if (formData.missionType === 'math') {
      if (!missionConfig.mathDifficulty) missionConfig.mathDifficulty = 'medium';
      if (!missionConfig.mathQuestionCount) missionConfig.mathQuestionCount = 3;
    }
    if (formData.missionType === 'shake' && !missionConfig.shakeCount) {
      missionConfig.shakeCount = 50;
    }

    const alarmData = {
      time: formData.time,
      label: formData.label,
      days: formData.days,
      missionType: formData.missionType,
      missionConfig,
      wakeUpCheckEnabled: formData.wakeUpCheckEnabled,
      wakeUpCheckDelay: formData.wakeUpCheckDelay,
      wakeUpCheckRepeat: formData.wakeUpCheckRepeat,
      soundId: formData.soundId,
      volume: formData.volume,
      progressiveCrescendo: formData.progressiveCrescendo,
      antiCheatLevel: formData.antiCheatLevel,
      enabled: formData.enabled,
    };

    if (isEditing) {
      updateAlarm(editingAlarm.id, alarmData);
    } else {
      addAlarm(alarmData);
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Alarm',
      'Yakin ingin menghapus alarm ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const toggleDay = (dayIndex: number) => {
    const newDays = formData.days.includes(dayIndex)
      ? formData.days.filter((d: number) => d !== dayIndex)
      : [...formData.days, dayIndex];
    setFormData(prev => ({ ...prev, days: newDays }));
  };

  const updateMissionConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      missionConfig: { ...prev.missionConfig, [key]: value },
    }));
  };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Alarm' : 'Alarm Baru'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Waktu Alarm</Text>
        <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.timeText}>{formData.time}</Text>
          <Text style={styles.timeSubtext}>Tekan untuk ubah waktu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Label Alarm</Text>
        <TextInput
          style={styles.input}
          value={formData.label}
          onChangeText={(text) => setFormData(prev => ({ ...prev, label: text }))}
          placeholder="Contoh: Bangun Olahraga, Jam Kerja, dll"
          maxLength={30}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Hari Berulang</Text>
        <View style={styles.daysContainer}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                formData.days.includes(index) && styles.dayButtonActive,
              ]}
              onPress={() => toggleDay(index)}
            >
              <Text style={[
                styles.dayText,
                formData.days.includes(index) && styles.dayTextActive,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Jenis Misi Bangun</Text>
        <View style={styles.missionList}>
          {missionTypes.map((mission) => (
            <TouchableOpacity
              key={mission.value}
              style={[
                styles.missionItem,
                formData.missionType === mission.value && styles.missionItemActive,
              ]}
              onPress={() => {
                setFormData(prev => ({ ...prev, missionType: mission.value, missionConfig: {} }));
                setShowMissionConfig(true);
              }}
            >
              <Text style={[
                styles.missionItemText,
                formData.missionType === mission.value && styles.missionItemTextActive,
              ]}>
                {mission.label}
              </Text>
              {mission.pro && (
                <Text style={styles.proBadge}>PRO</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showMissionConfig && (
        <MissionConfigModal
          missionType={formData.missionType}
          config={formData.missionConfig}
          onUpdate={updateMissionConfig}
          onClose={() => setShowMissionConfig(false)}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Suara Alarm</Text>
        <TouchableOpacity style={styles.soundButton} onPress={() => setShowSoundPicker(true)}>
          <View style={styles.soundButtonContent}>
            <Text style={styles.soundName}>
              {sounds.find(s => s.id === formData.soundId)?.name || formData.soundId}
            </Text>
            <Text style={styles.soundCategory}>{sounds.find(s => s.id === formData.soundId)?.category}</Text>
          </View>
          <Text style={styles.soundPreview}>🔊 Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Wake-Up Check</Text>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Aktifkan Verifikasi 5 Menit</Text>
            <Text style={styles.toggleSubtext}>Muncul pop-up konfirmasi sudah bangun 5 menit setelah misi selesai</Text>
          </View>
          <Switch
            value={formData.wakeUpCheckEnabled}
            onValueChange={(v) => setFormData(prev => ({ ...prev, wakeUpCheckEnabled: v }))}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor={formData.wakeUpCheckEnabled ? '#FFF' : '#888'}
          />
        </View>
        
        {formData.wakeUpCheckEnabled && (
          <View style={styles.wakeupConfig}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Jeda Verifikasi</Text>
              <Picker
                selectedValue={formData.wakeUpCheckDelay}
                onValueChange={(v: any) => setFormData(prev => ({ ...prev, wakeUpCheckDelay: parseInt(v) }))}
                style={styles.picker}
                mode="dropdown"
              >
                {[1, 2, 3, 5, 10, 15].map(m => (
                  <Picker.Item key={m} label={`${m} menit`} value={m} />
                ))}
              </Picker>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Ulangi Verifikasi</Text>
              <Picker
                selectedValue={formData.wakeUpCheckRepeat}
                onValueChange={(v: any) => setFormData(prev => ({ ...prev, wakeUpCheckRepeat: parseInt(v) }))}
                style={styles.picker}
                mode="dropdown"
              >
                {[1, 2, 3].map(r => (
                  <Picker.Item key={r} label={`${r}x`} value={r} />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Level Anti-Cheat</Text>
        <View style={styles.radioGroup}>
          {['standard', 'hardcore'].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.radioItem,
                formData.antiCheatLevel === level && styles.radioItemActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, antiCheatLevel: level as any }))}
            >
              <Text style={[
                styles.radioText,
                formData.antiCheatLevel === level && styles.radioTextActive,
              ]}>
                {level === 'standard' ? 'Standar (Kunci Volume)' : 'Hardcore (Blokir Power Off, Force Close, Uninstall)'}
              </Text>
              <View style={[
                styles.radioDot,
                formData.antiCheatLevel === level && styles.radioDotActive,
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Progressive Crescendo</Text>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Naikkan Volume Bertahap</Text>
            <Text style={styles.toggleSubtext}>Volume naik dari 30% ke 100% dalam 30 detik</Text>
          </View>
          <Switch
            value={formData.progressiveCrescendo}
            onValueChange={(v) => setFormData(prev => ({ ...prev, progressiveCrescendo: v }))}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor={formData.progressiveCrescendo ? '#FFF' : '#888'}
          />
        </View>
      </View>

      {isEditing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Hapus Alarm</Text>
        </TouchableOpacity>
      )}
    </ScrollView>

    <Modal visible={showTimePicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Waktu</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timePickerContainer}>
            <Picker
              selectedValue={formData.time.split(':')[0]}
              onValueChange={(v: any) => setFormData(prev => ({ ...prev, time: `${v.padStart(2, '0')}:${prev.time.split(':')[1]}` }))}
              style={styles.timePicker}
              mode="dialog"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString().padStart(2, '0')} />
              ))}
            </Picker>
            <Text style={styles.timeSeparator}>:</Text>
            <Picker
              selectedValue={formData.time.split(':')[1]}
              onValueChange={(v: any) => setFormData(prev => ({ ...prev, time: `${prev.time.split(':')[0]}:${v.padStart(2, '0')}` }))}
              style={styles.timePicker}
              mode="dialog"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString().padStart(2, '0')} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity style={styles.modalConfirm} onPress={() => setShowTimePicker(false)}>
            <Text style={styles.modalConfirmText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal visible={showSoundPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Suara Alarm</Text>
            <TouchableOpacity onPress={() => setShowSoundPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.soundList}>
            {sounds.map(sound => (
              <TouchableOpacity
                key={sound.id}
                style={[
                  styles.soundItem,
                  formData.soundId === sound.id && styles.soundItemActive,
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, soundId: sound.id }));
                  setShowSoundPicker(false);
                  audioEngine.playAlarm(sound.id);
                }}
              >
                <View style={styles.soundItemInfo}>
                  <Text style={styles.soundItemName}>{sound.name}</Text>
                  <Text style={styles.soundItemCategory}>{sound.category} {sound.isExtreme && '• Ekstrem'}</Text>
                </View>
                {formData.soundId === sound.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

function MissionConfigModal({ missionType, config, onUpdate, onClose }: any) {
  const renderConfig = () => {
    switch (missionType) {
      case 'barcode':
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Scan Barcode</Text>
            <TextInput
              style={styles.input}
              value={config.barcodeValue || ''}
              onChangeText={(v) => onUpdate('barcodeValue', v)}
              placeholder="Masukkan nilai barcode/QR (contoh: 8991234567890)"
              keyboardType="default"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Letakkan barcode ini di kamar mandi / meja makan untuk memaksa bangun</Text>
          </View>
        );
      case 'steps':
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Berjalan</Text>
            <TextInput
              style={styles.input}
              value={config.stepCount?.toString() || '30'}
              onChangeText={(v) => onUpdate('stepCount', parseInt(v) || 30)}
              placeholder="Target langkah (30-100)"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>HP akan menghitung langkah via sensor pedometer</Text>
          </View>
        );
      case 'squat':
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Squat</Text>
            <TextInput
              style={styles.input}
              value={config.squatCount?.toString() || '10'}
              onChangeText={(v) => onUpdate('squatCount', parseInt(v) || 10)}
              placeholder="Target squat (5-30)"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Sensor accelerometer mendeteksi gerakan squat</Text>
          </View>
        );
      case 'math':
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Matematika</Text>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Kesulitan</Text>
              <Picker
                selectedValue={config.mathDifficulty || 'medium'}
                onValueChange={(v: any) => onUpdate('mathDifficulty', v)}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item label="Mudah (1-20)" value="easy" />
                <Picker.Item label="Sedang (10-50)" value="medium" />
                <Picker.Item label="Sulit (20-100)" value="hard" />
              </Picker>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Jumlah Soal</Text>
              <Picker
                selectedValue={config.mathQuestionCount?.toString() || '3'}
                onValueChange={(v: any) => onUpdate('mathQuestionCount', parseInt(v))}
                style={styles.picker}
                mode="dropdown"
              >
                {[1, 2, 3, 5, 10].map(n => (
                  <Picker.Item key={n} label={`${n} soal`} value={n.toString()} />
                ))}
              </Picker>
            </View>
          </View>
        );
      case 'shake':
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Goyang</Text>
            <TextInput
              style={styles.input}
              value={config.shakeCount?.toString() || '50'}
              onChangeText={(v) => onUpdate('shakeCount', parseInt(v) || 50)}
              placeholder="Target goyangan (20-200)"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Goyangkan HP dengan kencang hingga target tercapai</Text>
          </View>
        );
      default:
        return (
          <View>
            <Text style={styles.modalTitle}>Konfigurasi Misi</Text>
            <Text style={styles.helperText}>Misi ini tidak memerlukan konfigurasi tambahan</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.modalContent}>
      {renderConfig()}
      <TouchableOpacity style={styles.modalConfirm} onPress={onClose}>
        <Text style={styles.modalConfirmText}>Selesai</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#FFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#FF0033',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  timeSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  dayButtonActive: {
    backgroundColor: '#FF0033',
    borderColor: '#FF0033',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  dayTextActive: {
    color: '#FFF',
  },
  missionList: {
    gap: 8,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  missionItemActive: {
    borderColor: '#FF0033',
    backgroundColor: '#1A0008',
  },
  missionItemText: {
    fontSize: 16,
    color: '#FFF',
  },
  missionItemTextActive: {
    color: '#FF0033',
  },
  proBadge: {
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  soundButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333',
  },
  soundButtonContent: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    color: '#FFF',
  },
  soundCategory: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  soundPreview: {
    fontSize: 14,
    color: '#FF0033',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFF',
    flex: 1,
  },
  toggleSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  wakeupConfig: {
    marginTop: 12,
    gap: 12,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configLabel: {
    fontSize: 14,
    color: '#CCC',
  },
  picker: {
    backgroundColor: '#222',
    borderRadius: 8,
    color: '#FFF',
    width: 120,
  },
  radioGroup: {
    gap: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  radioItemActive: {
    borderColor: '#FF0033',
    backgroundColor: '#1A0008',
  },
  radioText: {
    fontSize: 14,
    color: '#CCC',
    flex: 1,
  },
  radioTextActive: {
    color: '#FF0033',
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
  },
  radioDotActive: {
    borderColor: '#FF0033',
    backgroundColor: '#FF0033',
  },
  deleteButton: {
    marginTop: 24,
    backgroundColor: '#330000',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  deleteText: {
    color: '#FF4444',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalClose: {
    fontSize: 24,
    color: '#888',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  timePicker: {
    width: 100,
    height: 150,
    backgroundColor: '#222',
    borderRadius: 10,
    color: '#FFF',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalConfirm: {
    backgroundColor: '#FF0033',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  soundList: {
    maxHeight: 400,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  soundItemActive: {
    borderWidth: 2,
    borderColor: '#FF0033',
  },
  soundItemInfo: {
    flex: 1,
  },
  soundItemName: {
    fontSize: 16,
    color: '#FFF',
  },
  soundItemCategory: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#FF0033',
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
});