import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '../store/alarmStore';
import { alarmScheduler } from '../services/AlarmScheduler';
import { antiCheat } from '../services/AntiCheat';
import { audioEngine } from '../services/AudioEngine';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { alarms, getEnabledAlarms, getNextAlarm, toggleAlarm, deleteAlarm, settings, updateSettings, activeAlarm, isAlarmRinging } = useAlarmStore();
  const [nextAlarmTime, setNextAlarmTime] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<{ overlay: boolean; accessibility: boolean; exactAlarm: boolean }>({
    overlay: false,
    accessibility: false,
    exactAlarm: false,
  });

  useEffect(() => {
    loadNextAlarm();
    checkPermissions();
    
    const interval = setInterval(loadNextAlarm, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNextAlarm = async () => {
    const time = await alarmScheduler.getNextAlarmTime();
    setNextAlarmTime(time);
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const perms = await antiCheat.checkPermissions();
      setPermissions(perms);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Terlewat';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}j ${minutes}m lagi`;
    return `${minutes}m lagi`;
  };

  const handlePermissionPress = async (type: 'overlay' | 'accessibility' | 'exactAlarm' | 'battery') => {
    await antiCheat.openPermissionSettings(type);
    setTimeout(checkPermissions, 1000);
  };

  const enabledAlarms = getEnabledAlarms();
  const nextAlarm = getNextAlarm();

  if (isAlarmRinging && activeAlarm) {
    // Don't render home screen when alarm is ringing
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BangunPaksa</Text>
        <Text style={styles.subtitle}>Alarm Anti-Snooze & Habit Builder</Text>
      </View>

      {/* Next Alarm Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alarm Berikutnya</Text>
        {nextAlarm ? (
          <View style={styles.nextAlarm}>
            <Text style={styles.nextAlarmTime}>{nextAlarm.time}</Text>
            <Text style={styles.nextAlarmLabel}>{nextAlarm.label}</Text>
            <Text style={styles.nextAlarmCountdown}>{nextAlarmTime ? formatTime(nextAlarmTime) : 'Menghitung...'}</Text>
            <View style={styles.nextAlarmMission}>
              <Text style={styles.missionBadge}>{getMissionLabel(nextAlarm.missionType)}</Text>
              <Text style={styles.missionBadge}>{nextAlarm.soundId}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noAlarm}>Belum ada alarm aktif</Text>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Streak Hari Ini" value={useAlarmStore.getState().stats.currentStreak} unit="hari" />
        <StatBox label="Total Alarm" value={enabledAlarms.length} unit="aktif" />
        <StatBox label="Sukses Rate" value={useAlarmStore.getState().stats.totalAlarmsTriggered > 0 
          ? Math.round((useAlarmStore.getState().stats.successfulWakeUps / useAlarmStore.getState().stats.totalAlarmsTriggered) * 100) 
          : 0} unit="%" />
      </View>

      {/* Alarm List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daftar Alarm</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AlarmSetup')}>
            <Text style={styles.addButtonText}>+ Tambah</Text>
          </TouchableOpacity>
        </View>
        
        {alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Belum ada alarm</Text>
            <Text style={styles.emptySubtext}>Tekan + Tambah untuk membuat alarm pertama</Text>
          </View>
        ) : (
          alarms.map((alarm) => (
            <AlarmItem 
              key={alarm.id} 
              alarm={alarm} 
              onToggle={() => toggleAlarm(alarm.id)}
              onEdit={() => navigation.navigate('AlarmSetup', { alarm })}
              onDelete={() => deleteAlarm(alarm.id)}
            />
          ))
        )}
      </View>

      {/* Permissions Status */}
      {Platform.OS === 'android' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Izin Sistem</Text>
          <PermissionRow 
            label="Overlay (Blokir Power Menu)" 
            granted={permissions.overlay}
            onPress={() => handlePermissionPress('overlay')}
          />
          <PermissionRow 
            label="Accessibility (Kunci Volume)" 
            granted={permissions.accessibility}
            onPress={() => handlePermissionPress('accessibility')}
          />
          <PermissionRow 
            label="Exact Alarm (Bangun dari Doze)" 
            granted={permissions.exactAlarm}
            onPress={() => handlePermissionPress('exactAlarm')}
          />
          <PermissionRow 
            label="Battery Optimization (Auto-start)" 
            granted={settings.batteryOptimizationDismissed}
            onPress={() => handlePermissionPress('battery')}
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.quickActions}>
          <QuickAction 
            label="Test Alarm" 
            icon="🔔"
            onPress={async () => {
              const testAlarm = alarms[0] || nextAlarm;
              if (testAlarm) {
                await audioEngine.playAlarm(testAlarm.soundId);
                navigation.navigate('AlarmRinging');
              }
            }}
          />
          <QuickAction 
            label="Statistik" 
            icon="📊"
            onPress={() => navigation.navigate('Stats')}
          />
          <QuickAction 
            label="Pengaturan" 
            icon="⚙️"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function AlarmItem({ alarm, onToggle, onEdit, onDelete }: any) {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayLabels = alarm.days.map((d: number) => days[d]).join(', ');

  return (
    <View style={styles.alarmItem}>
      <TouchableOpacity style={styles.alarmMain} onPress={onEdit} activeOpacity={0.8}>
        <View style={styles.alarmTimeContainer}>
          <Text style={styles.alarmTime}>{alarm.time}</Text>
          <Text style={styles.alarmLabel}>{alarm.label}</Text>
        </View>
        <View style={styles.alarmMeta}>
          <Text style={styles.alarmDays}>{dayLabels}</Text>
          <View style={styles.alarmBadges}>
            <Text style={styles.missionBadge}>{getMissionLabel(alarm.missionType)}</Text>
            {alarm.wakeUpCheckEnabled && <Text style={[styles.missionBadge, styles.wakeupBadge]}>✓ Check</Text>}
          </View>
        </View>
        <Switch
          value={alarm.enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: '#FF0033' }}
          thumbColor={alarm.enabled ? '#FFF' : '#888'}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteText}>Hapus</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatBox({ label, value, unit }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PermissionRow({ label, granted, onPress }: any) {
  return (
    <TouchableOpacity style={styles.permissionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.permissionDot, { backgroundColor: granted ? '#00C851' : '#FF4444' }]} />
      <Text style={styles.permissionLabel}>{label}</Text>
      <Text style={[styles.permissionStatus, { color: granted ? '#00C851' : '#FF4444' }]}>
        {granted ? 'Diberikan' : 'Dibutuhkan'}
      </Text>
    </TouchableOpacity>
  );
}

function QuickAction({ label, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function getMissionLabel(type: string): string {
  const labels: Record<string, string> = {
    barcode: '📷 Barcode',
    photo: '📸 Foto',
    steps: '👟 Langkah',
    squat: '🏋️ Squat',
    math: '🧮 Matematika',
    typing: '⌨️ Mengetik',
    memory: '🧠 Memori',
    shake: '📳 Goyang',
  };
  return labels[type] || type;
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
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  nextAlarm: {
    alignItems: 'center',
  },
  nextAlarmTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  nextAlarmLabel: {
    fontSize: 16,
    color: '#CCC',
    marginTop: 4,
  },
  nextAlarmCountdown: {
    fontSize: 14,
    color: '#FF0033',
    marginTop: 8,
    fontWeight: '600',
  },
  nextAlarmMission: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  missionBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 11,
    color: '#AAA',
  },
  wakeupBadge: {
    backgroundColor: '#00C851',
    color: '#000',
  },
  noAlarm: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statUnit: {
    fontSize: 12,
    color: '#888',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  addButton: {
    backgroundColor: '#FF0033',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
  },
  alarmItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  alarmMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  alarmTimeContainer: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  alarmLabel: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 2,
  },
  alarmMeta: {
    alignItems: 'flex-end',
    marginHorizontal: 16,
  },
  alarmDays: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  alarmBadges: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#111',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  permissionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  permissionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
  },
  permissionStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
});