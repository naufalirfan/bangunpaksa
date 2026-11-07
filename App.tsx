import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAlarmStore } from './src/store/alarmStore';
import { alarmScheduler } from './src/services/AlarmScheduler';
import { audioEngine } from './src/services/AudioEngine';
import { missionManager } from './src/services/MissionManager';
import { antiCheat } from './src/services/AntiCheat';
import { wakeUpCheck } from './src/services/WakeUpCheck';

import HomeScreen from './src/screens/HomeScreen';
import AlarmSetupScreen from './src/screens/AlarmSetupScreen';
import AlarmRingingScreen from './src/screens/AlarmRingingScreen';
import MissionCameraScreen from './src/screens/MissionCameraScreen';
import MissionCognitiveScreen from './src/screens/MissionCognitiveScreen';
import MissionPhysicalScreen from './src/screens/MissionPhysicalScreen';
import WakeUpCheckScreen from './src/screens/WakeUpCheckScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StatsScreen from './src/screens/StatsScreen';
import SoundPickerScreen from './src/screens/SoundPickerScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Home: '⏰', Stats: '📊', Settings: '⚙️' };
  return <Text style={{ fontSize: focused ? 24 : 22, opacity: focused ? 1 : 0.5 }}>{icons[label]}</Text>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF0033',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Alarm' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Statistik' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Pengaturan' }} />
    </Tab.Navigator>
  );
}

function RootStack() {
  const onboardingCompleted = useAlarmStore((s) => s.settings.onboardingCompleted);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
      initialRouteName={onboardingCompleted ? 'Main' : 'Onboarding'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AlarmSetup" component={AlarmSetupScreen} />
      <Stack.Screen name="AlarmRinging" component={AlarmRingingScreen} />
      <Stack.Screen name="MissionCamera" component={MissionCameraScreen} />
      <Stack.Screen name="MissionCognitive" component={MissionCognitiveScreen} />
      <Stack.Screen name="MissionPhysical" component={MissionPhysicalScreen} />
      <Stack.Screen name="WakeUpCheck" component={WakeUpCheckScreen} />
      <Stack.Screen name="SoundPicker" component={SoundPickerScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await audioEngine.initialize();
        await missionManager.initialize();
        await antiCheat.initialize();
        await wakeUpCheck.initialize();
        await alarmScheduler.initialize();
        await alarmScheduler.rescheduleAll();
      } catch (e) {
        console.error('App initialization failed:', e);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});