import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAlarmStore } from '../store/alarmStore';

export default function StatisticsScreen() {
  const { alarms, statistics, getStatistics } = useAlarmStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('week');
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = () => {
    const s = getStatistics(selectedPeriod);
    setStats(s);
    generateChartData(s);
  };

  const generateChartData = (s: any) => {
    // Generate mock chart data for the period
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        wakeUps: Math.floor(Math.random() * (s.totalAlarms ? s.totalAlarms / 4 : 1)) + 1,
        successRate: Math.random() * 40 + 60,
        avgWakeTime: 30 + Math.random() * 120,
      });
    }
    setChartData(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <Picker
          selectedValue={selectedPeriod}
          onValueChange={(v: any) => setSelectedPeriod(v)}
          style={styles.picker}
          mode="dropdown"
        >
          <Picker.Item label="Minggu Ini" value="week" />
          <Picker.Item label="Bulan Ini" value="month" />
          <Picker.Item label="3 Bulan" value="quarter" />
          <Picker.Item label="Tahun Ini" value="year" />
          <Picker.Item label="Semua Waktu" value="all" />
        </Picker>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <StatCard
          title="Total Alarm"
          value={stats?.totalAlarms || 0}
          icon="⏰"
          color="#FF0033"
        />
        <StatCard
          title="Berhasil Bangun"
          value={stats?.successfulWakeUps || 0}
          icon="✅"
          color="#00C851"
        />
        <StatCard
          title="Tingkat Keberhasilan"
          value={formatPercent(stats?.successRate || 0)}
          icon="📊"
          color="#FFD700"
        />
        <StatCard
          title="Rata-rata Waktu Bangun"
          value={formatTime(stats?.avgWakeUpTime || 0)}
          icon="⏱️"
          color="#33B5E5"
        />
      </View>

      {/* Mission Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Performa per Misi</Text>
        <View style={styles.missionStats}>
          {Object.entries(stats?.missionBreakdown || {}).map(([mission, data]: [string, any]) => (
            <MissionStatRow key={mission} mission={mission} data={data} />
          ))}
          {(stats?.missionBreakdown && Object.keys(stats.missionBreakdown).length === 0) && (
            <Text style={styles.noData}>Belum ada data misi</Text>
          )}
        </View>
      </View>

      {/* Wake-Up Check Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Wake-Up Check</Text>
        <View style={styles.wakeupStats}>
          <WakeupStatItem
            label="Verifikasi Berhasil"
            value={stats?.wakeUpCheckSuccess || 0}
            total={stats?.wakeUpCheckTotal || 0}
          />
          <WakeupStatItem
            label="Timeout (Auto-restart)"
            value={stats?.wakeUpCheckTimeout || 0}
            total={stats?.wakeUpCheckTotal || 0}
            isNegative
          />
          <WakeupStatItem
            label="Rata-rata Waktu Konfirmasi"
            value={formatTime(stats?.avgWakeUpCheckTime || 0)}
            total={1}
            isTime
          />
        </View>
      </View>

      {/* Streaks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Streak</Text>
        <View style={styles.streakContainer}>
          <StreakCard
            label="Streak Saat Ini"
            value={stats?.currentStreak || 0}
            unit="hari"
            color="#FF0033"
            icon="🔥"
          />
          <StreakCard
            label="Streak Terpanjang"
            value={stats?.longestStreak || 0}
            unit="hari"
            color="#FFD700"
            icon="🏆"
          />
        </View>
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Tren {selectedPeriod === 'week' ? 'Mingguan' : selectedPeriod === 'month' ? 'Bulanan' : 'Berkala'}</Text>
        <View style={styles.chartContainer}>
          {chartData.map((day, i) => (
            <ChartBar key={i} data={day} maxValue={Math.max(...chartData.map(d => d.wakeUps))} index={i} />
          ))}
        </View>
      </View>

      {/* Recent Alarms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Riwayat Terbaru</Text>
        <View style={styles.recentList}>
          {alarms.slice(0, 10).map(alarm => (
            <RecentAlarmRow key={alarm.id} alarm={alarm} />
          ))}
          {alarms.length === 0 && (
            <Text style={styles.noData}>Belum ada alarm</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );
}

function MissionStatRow({ mission, data }: any) {
  const missionLabels: Record<string, string> = {
    barcode: '📷 Barcode',
    photo: '📸 Foto',
    steps: '👟 Langkah',
    squat: '🏋️ Squat',
    math: '🧮 Matematika',
    typing: '⌨️ Mengetik',
    memory: '🧠 Memori',
    shake: '📳 Goyang',
  };

  const successRate = data.total > 0 ? (data.success / data.total) * 100 : 0;

  return (
    <View style={styles.missionStatRow}>
      <View style={styles.missionInfo}>
        <Text style={styles.missionName}>{missionLabels[mission] || mission}</Text>
        <Text style={styles.missionDetail}>
          {data.success} / {data.total} berhasil • {successRate.toFixed(0)}%
        </Text>
      </View>
      <View style={[
        styles.missionProgressBar,
        { width: `${Math.max(successRate, 5)}%` },
      ]} />
    </View>
  );
}

function WakeupStatItem({ label, value, total, isNegative, isTime }: any) {
  return (
    <View style={styles.wakeupStatItem}>
      <View style={styles.wakeupStatInfo}>
        <Text style={styles.wakeupStatLabel}>{label}</Text>
        {!isTime && total > 0 && (
          <Text style={styles.wakeupStatDetail}>
            {value} dari {total} ({(value / total * 100).toFixed(0)}%)
          </Text>
        )}
      </View>
      <Text style={[
        styles.wakeupStatValue,
        isNegative && styles.wakeupStatNegative,
      ]}>
        {isTime ? value : `${value} (${total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)`}
      </Text>
    </View>
  );
}

function StreakCard({ label, value, unit, color, icon }: any) {
  return (
    <View style={styles.streakCard}>
      <View style={[styles.streakIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.streakIconText}>{icon}</Text>
      </View>
      <View>
        <Text style={[styles.streakValue, { color }]}>{value} {unit}</Text>
        <Text style={styles.streakLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ChartBar({ data, maxValue, index }: any) {
  const height = maxValue > 0 ? (data.wakeUps / maxValue) * 100 : 0;
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  return (
    <View style={styles.chartBarWrapper}>
      <View style={styles.chartBar}>
        <View style={[
          styles.chartBarFill,
          { height: `${height}%` },
        ]} />
      </View>
      <Text style={styles.chartBarLabel}>{dayNames[index % 7]}</Text>
      <Text style={styles.chartBarValue}>{data.wakeUps}</Text>
    </View>
  );
}

function RecentAlarmRow({ alarm }: any) {
  const missionLabels: Record<string, string> = {
    barcode: '📷 Barcode',
    photo: '📸 Foto',
    steps: '👟 Langkah',
    squat: '🏋️ Squat',
    math: '🧮 Matematika',
    typing: '⌨️ Mengetik',
    memory: '🧠 Memori',
    shake: '📳 Goyang',
  };

  return (
    <View style={styles.recentRow}>
      <View style={styles.recentInfo}>
        <Text style={styles.recentTime}>{alarm.time}</Text>
        <Text style={styles.recentLabel}>{alarm.label}</Text>
      </View>
      <View style={styles.recentMeta}>
        <Text style={styles.recentMission}>{missionLabels[alarm.missionType] || alarm.missionType}</Text>
        <Text style={[
          styles.recentStatus,
          alarm.enabled ? styles.statusActive : styles.statusInactive,
        ]}>
          {alarm.enabled ? 'Aktif' : 'Nonaktif'}
        </Text>
      </View>
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
    paddingBottom: 40,
  },
  periodSelector: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  picker: {
    backgroundColor: '#111',
    borderRadius: 8,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: {
    fontSize: 24,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  missionStats: {
    gap: 12,
  },
  missionStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionInfo: {
    flex: 1,
  },
  missionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  missionDetail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  missionProgressBar: {
    height: 6,
    backgroundColor: '#FF0033',
    borderRadius: 3,
    minWidth: 20,
    maxWidth: 100,
  },
  wakeupStats: {
    gap: 12,
  },
  wakeupStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 16,
  },
  wakeupStatInfo: {
    flex: 1,
  },
  wakeupStatLabel: {
    fontSize: 14,
    color: '#CCC',
  },
  wakeupStatDetail: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  wakeupStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  wakeupStatNegative: {
    color: '#FF4444',
  },
  streakContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  streakIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakIconText: {
    fontSize: 28,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  streakLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingVertical: 16,
    gap: 4,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#FF0033',
    borderRadius: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 8,
  },
  chartBarValue: {
    fontSize: 10,
    color: '#FF0033',
    fontWeight: '600',
  },
  recentList: {
    gap: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 14,
  },
  recentInfo: {
    flex: 1,
  },
  recentTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  recentLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  recentMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recentMission: {
    fontSize: 12,
    color: '#AAA',
  },
  recentStatus: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#00C85120',
    color: '#00C851',
  },
  statusInactive: {
    backgroundColor: '#88820',
    color: '#888',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: 24,
    fontSize: 14,
  },
});