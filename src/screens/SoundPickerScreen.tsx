import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { audioEngine } from '../services/AudioEngine';

export default function SoundPickerScreen() {
  const navigation = useNavigation();
  const [sounds, setSounds] = useState<any[]>([]);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  useEffect(() => {
    const allSounds = audioEngine.getAllSounds();
    setSounds(allSounds);
    
    // Set currently selected as default
    const current = audioEngine.getCurrentSoundId?.();
    if (current) setSelectedSound(current);
    else if (allSounds.length > 0) setSelectedSound(allSounds[0].id);
  }, []);

  const handlePlay = async (soundId: string) => {
    if (playingSound === soundId) {
      await audioEngine.stopAlarm();
      setPlayingSound(null);
      return;
    }
    
    setPlayingSound(soundId);
    try {
      await audioEngine.playAlarm(soundId, { initialVolume: 80, targetVolume: 80, crescendoDuration: 0 });
    } catch (e) {
      console.error('Play error:', e);
    }
    setPlayingSound(null);
  };

  const handleSelect = (soundId: string) => {
    setSelectedSound(soundId);
    audioEngine.setCurrentSound?.(soundId);
  };

  const handleSave = () => {
    if (selectedSound) {
      audioEngine.setCurrentSound(selectedSound);
      navigation.goBack();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Sistem': '#33B5E5',
      'Alam': '#00C851',
      'Mekanik': '#FF8800',
      'Ekstrem': '#FF0033',
      'Binaural': '#AA66CC',
    };
    return colors[category] || '#888';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Suara Alarm</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {sounds.map(sound => (
          <TouchableOpacity
            key={sound.id}
            style={[
              styles.soundItem,
              selectedSound === sound.id && styles.soundItemSelected,
              playingSound === sound.id && styles.soundItemPlaying,
            ]}
            onPress={() => handleSelect(sound.id)}
          >
            <View style={styles.soundMain}>
              <View style={[
                styles.categoryDot,
                { backgroundColor: getCategoryColor(sound.category) },
              ]} />
              <View style={styles.soundInfo}>
                <Text style={styles.soundName}>{sound.name}</Text>
                <Text style={styles.soundCategory}>{sound.category}{sound.isExtreme ? ' • Ekstrem' : ''}</Text>
              </View>
            </View>
            <View style={styles.soundActions}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  playingSound === sound.id && styles.playButtonPlaying,
                ]}
                onPress={() => handlePlay(sound.id)}
              >
                <Text style={styles.playButtonText}>
                  {playingSound === soundId ? '⏹' : '▶'}
                </Text>
              </TouchableOpacity>
              {selectedSound === sound.id && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  soundItemSelected: {
    borderColor: '#FF0033',
    backgroundColor: '#1A0008',
  },
  soundItemPlaying: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1A00',
  },
  soundMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  soundCategory: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  playButtonPlaying: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  playButtonText: {
    fontSize: 18,
    color: '#FFF',
  },
  checkmark: {
    fontSize: 20,
    color: '#FF0033',
    fontWeight: 'bold',
  },
});