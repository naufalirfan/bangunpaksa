import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '../store/alarmStore';
import { audioEngine } from '../services/AudioEngine';
import { antiCheat } from '../services/AntiCheat';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, updateSettings, exportData, importData, clearAllAlarms } = useAlarmStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [batteryOptimization, setBatteryOptimization] = useState(false);
  const [exportedData, setExportedData] = useState('');

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    const info = {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      isDevice: Device.isDevice,
      deviceYearClass: Device.deviceYearClass,
    };
    setDeviceInfo(info);

    const batteryOpt = await Battery.getBatteryOptimizationStatus();
    setBatteryOptimization(batteryOpt);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      setExportedData(JSON.stringify(data, null, 2));
      setShowExport(true);
    } catch (e) {
      Alert.alert('Error', 'Gagal ekspor data');
    }
  };

  const handleImport = async () => {
    try {
      await importData(importText);
      setShowImport(false);
      setImportText('');
      Alert.alert('Sukses', 'Data berhasil diimpor');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Format data tidak valid');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Hapus Semua Alarm',
      'Ini akan menghapus SEMUA alarm dan pengaturan. Tindakan ini tidak bisa dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus Semua', style: 'destructive', onPress: () => {
          clearAllAlarms();
          Alert.alert('Selesai', 'Semua data telah dihapus');
        }},
      ]
    );
  };

  const openBatteryOptimization = async () => {
    Alert.alert(
      'Optimasi Baterai',
      'Untuk alarm yang andal, matikan optimasi baterai untuk aplikasi ini di Pengaturan > Baterai > Optimasi Baterai.',
      [{ text: 'OK' }]
    );
  };

  const getPickerItem = (label: string, value: string | number) => (
    <Picker.Item key={value} label={label} value={value} />
  );

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Pengaturan Umum</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Tema</Text>
            <Text style={styles.settingDesc}>Gelap (default)</Text>
          </View>
          <Text style={styles.comingSoon}>Segera</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Bahasa</Text>
            <Text style={styles.settingDesc}>Indonesia</Text>
          </View>
          <Text style={styles.comingSoon}>Segera</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifikasi Default</Text>
            <Text style={styles.settingDesc}>{settings.defaultNotificationSound || 'Sistem'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SoundPicker')}>
            <Text style={styles.changeText}>Ubah</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Snooze Default</Text>
            <Text style={styles.settingDesc}>{settings.defaultSnoozeDuration} menit</Text>
          </View>
          <Picker
            selectedValue={settings.defaultSnoozeDuration.toString()}
            onValueChange={(v: any) => updateSettings({ defaultSnoozeDuration: parseInt(v) })}
            style={styles.picker}
            mode="dropdown"
          >
            {[1, 2, 3, 5, 10, 15].map(m => getPickerItem(`${m} menit`, m))}
          </Picker>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Max Snooze</Text>
            <Text style={styles.settingDesc}>{settings.maxSnoozeCount}x</Text>
          </View>
          <Picker
            selectedValue={settings.maxSnoozeCount.toString()}
            onValueChange={(v: any) => updateSettings({ maxSnoozeCount: parseInt(v) })}
            style={styles.picker}
            mode="dropdown"
          >
            {[1, 2, 3, 5, 10].map(m => getPickerItem(`${m}x`, m))}
          </Picker>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-dismiss</Text>
            <Text style={styles.settingDesc}>Matikan alarm otomatis setelah durasi</Text>
          </View>
          <Switch
            value={settings.autoDismissEnabled}
            onValueChange={(v) => updateSettings({ autoDismissEnabled: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        {settings.autoDismissEnabled && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Durasi Auto-dismiss</Text>
              <Text style={styles.settingDesc}>{settings.autoDismissDuration} menit</Text>
            </View>
            <Picker
              selectedValue={settings.autoDismissDuration.toString()}
              onValueChange={(v: any) => updateSettings({ autoDismissDuration: parseInt(v) })}
              style={styles.picker}
              mode="dropdown"
            >
              {[5, 10, 15, 30, 60].map(m => getPickerItem(`${m} menit`, m))}
            </Picker>
          </View>
        )}
      </View>

      {/* Audio Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔊 Pengaturan Audio</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Progressive Crescendo Default</Text>
            <Text style={styles.settingDesc}>Naikkan volume bertahap</Text>
          </View>
          <Switch
            value={settings.progressiveCrescendoDefault}
            onValueChange={(v) => updateSettings({ progressiveCrescendoDefault: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Volume Booster</Text>
            <Text style={styles.settingDesc}>Gain tambahan +6dB untuk alarm keras</Text>
          </View>
          <Switch
            value={settings.volumeBoosterEnabled}
            onValueChange={(v) => updateSettings({ volumeBoosterEnabled: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Smart Mute Duration</Text>
            <Text style={styles.settingDesc}>{settings.smartMuteDuration} detik hening di awal</Text>
          </View>
          <Picker
            selectedValue={settings.smartMuteDuration.toString()}
            onValueChange={(v: any) => updateSettings({ smartMuteDuration: parseInt(v) })}
            style={styles.picker}
            mode="dropdown"
          >
            {[5, 10, 15, 20, 30].map(m => getPickerItem(`${m} detik`, m))}
          </Picker>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Pitch Escalation</Text>
            <Text style={styles.settingDesc}>Naikkan pitch setelah 60 detik</Text>
          </View>
          <Switch
            value={settings.pitchEscalationEnabled}
            onValueChange={(v) => updateSettings({ pitchEscalationEnabled: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      {/* Anti-Cheat Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ Anti-Cheat & Keamanan</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Anti-Cheat Level Default</Text>
            <Text style={styles.settingDesc}>{settings.antiCheatLevelDefault === 'hardcore' ? 'Hardcore' : 'Standar'}</Text>
          </View>
          <Picker
            selectedValue={settings.antiCheatLevelDefault}
            onValueChange={(v: any) => updateSettings({ antiCheatLevelDefault: v })}
            style={styles.picker}
            mode="dropdown"
          >
            {getPickerItem('Standar (Kunci Volume)', 'standard')}
            {getPickerItem('Hardcore (Blokir Power/Force Close/Uninstall)', 'hardcore')}
          </Picker>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Kunci Volume Hardware</Text>
            <Text style={styles.settingDesc}>Blokir tombol volume fisik saat alarm</Text>
          </View>
          <Switch
            value={settings.lockVolumeHardware}
            onValueChange={(v) => updateSettings({ lockVolumeHardware: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Blokir Power Menu</Text>
            <Text style={styles.settingDesc}>Overlay tombol power off saat alarm</Text>
          </View>
          <Switch
            value={settings.blockPowerMenu}
            onValueChange={(v) => updateSettings({ blockPowerMenu: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Blokir Force Close</Text>
            <Text style={styles.settingDesc}>Mencegah force close via recent apps</Text>
          </View>
          <Switch
            value={settings.blockForceClose}
            onValueChange={(v) => updateSettings({ blockForceClose: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Deteksi Reboot</Text>
            <Text style={styles.settingDesc}>Auto-restart alarm setelah reboot</Text>
          </View>
          <Switch
            value={settings.rebootDetection}
            onValueChange={(v) => updateSettings({ rebootDetection: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Screen Pinning</Text>
            <Text style={styles.settingDesc}>Kunci layar ke alarm (Android 9+)</Text>
          </View>
          <Switch
            value={settings.screenPinningEnabled}
            onValueChange={(v) => updateSettings({ screenPinningEnabled: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={openBatteryOptimization}>
          <Text style={styles.actionButtonText}>⚡ Buka Pengaturan Optimasi Baterai</Text>
        </TouchableOpacity>
      </View>

      {/* Wake-Up Check Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Wake-Up Check</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Default Enabled</Text>
            <Text style={styles.settingDesc}>Aktifkan wake-up check untuk alarm baru</Text>
          </View>
          <Switch
            value={settings.wakeUpCheckDefaultEnabled}
            onValueChange={(v) => updateSettings({ wakeUpCheckDefaultEnabled: v })}
            trackColor={{ false: '#333', true: '#FF0033' }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Default Delay</Text>
            <Text style={styles.settingDesc}>{settings.wakeUpCheckDefaultDelay} menit</Text>
          </View>
          <Picker
            selectedValue={settings.wakeUpCheckDefaultDelay.toString()}
            onValueChange={(v: any) => updateSettings({ wakeUpCheckDefaultDelay: parseInt(v) })}
            style={styles.picker}
            mode="dropdown"
          >
            {[1, 2, 3, 5, 10, 15].map(m => getPickerItem(`${m} menit`, m))}
          </Picker>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Default Repeats</Text>
            <Text style={styles.settingDesc}>{settings.wakeUpCheckDefaultRepeat}x</Text>
          </View>
          <Picker
            selectedValue={settings.wakeUpCheckDefaultRepeat.toString()}
            onValueChange={(v: any) => updateSettings({ wakeUpCheckDefaultRepeat: parseInt(v) })}
            style={styles.picker}
            mode="dropdown"
          >
            {[1, 2, 3].map(r => getPickerItem(`${r}x`, r))}
          </Picker>
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 Manajemen Data</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Text style={styles.actionButtonText}>📤 Ekspor Data (Backup)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowImport(true)}>
          <Text style={styles.actionButtonText}>📥 Impor Data (Restore)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearAll}>
          <Text style={styles.actionButtonText}>🗑️ Hapus Semua Data</Text>
        </TouchableOpacity>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Info Perangkat</Text>
        
        {Object.entries(deviceInfo).map(([key, value]) => (
          <View key={key} style={styles.deviceInfoRow}>
            <Text style={styles.deviceInfoLabel}>{key}</Text>
            <Text style={styles.deviceInfoValue}>{value}</Text>
          </View>
        ))}
        
        <View style={styles.deviceInfoRow}>
          <Text style={styles.deviceInfoLabel}>Battery Optimization</Text>
          <Text style={styles.deviceInfoValue}>{batteryOptimization ? 'Aktif' : 'Nonaktif'}</Text>
        </View>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>BangunPaksa v1.0.0</Text>
        <Text style={styles.versionSubtext}>Build: Android • Expo Bare</Text>
      </View>
    </ScrollView>

    {/* Export Modal */}
    <Modal visible={showExport} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Data Ekspor</Text>
            <TouchableOpacity onPress={() => setShowExport(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalText}>Salin JSON di bawah untuk backup:</Text>
          <ScrollView style={styles.exportScroll}>
            <Text style={styles.exportText} selectable>{exportedData}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalConfirm} onPress={() => setShowExport(false)}>
            <Text style={styles.modalConfirmText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Import Modal */}
    <Modal visible={showImport} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Impor Data</Text>
            <TouchableOpacity onPress={() => setShowImport(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalText}>Tempel JSON backup di sini:</Text>
          <TextInput
            style={styles.importInput}
            value={importText}
            onChangeText={setImportText}
            placeholder='{"alarms":[],"settings":{}}'
            multiline
            maxLength={50000}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowImport(false)}>
              <Text style={styles.modalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={handleImport}>
              <Text style={styles.modalConfirmText}>Impor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#888',
  },
  comingSoon: {
    fontSize: 13,
    color: '#666',
  },
  changeText: {
    fontSize: 14,
    color: '#FF0033',
    fontWeight: '600',
  },
  picker: {
    backgroundColor: '#222',
    borderRadius: 8,
    color: '#FFF',
    width: 120,
    minWidth: 100,
  },
  actionButton: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#330000',
    borderColor: '#FF4444',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#CCC',
    fontWeight: '600',
  },
  deviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  deviceInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  deviceInfoValue: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'monospace',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  versionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  modalText: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 12,
  },
  exportScroll: {
    maxHeight: 300,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  exportText: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
  },
  importInput: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 150,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#FF0033',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '600',
  },
});