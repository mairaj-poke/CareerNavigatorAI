import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from './src/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import {
  SavedJobsScreen,
  ResumeInsightsScreen,
  SkillGapScreen,
  AnalyticsScreen,
  SettingsScreen,
} from './src/screens/OtherScreens';

const Tab = createBottomTabNavigator();

// ── Shared State Context passed via screens ───────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [matchCache, setMatchCache] = useState({});
  const [allJobs, setAllJobs] = useState([]);

  const handleSave = (job) => {
    setSavedJobs(s =>
      s.find(j => j.id === job.id)
        ? s.filter(j => j.id !== job.id)
        : [...s, job]
    );
  };

  const handleResumeUpdate = (data, text) => {
    setResumeData(data);
  };

  const handleComplete = (profile) => {
    setUser(profile);
    if (profile.resumeData) {
      setResumeData(profile.resumeData);
    }
  };

  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
            <OnboardingScreen onComplete={handleComplete} />
          </SafeAreaView>
        </SafeAreaProvider>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: Colors.accent,
              background: Colors.bg,
              card: Colors.surface,
              text: Colors.text,
              border: Colors.border,
              notification: Colors.accent,
            },
          }}
        >
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: Colors.surface,
                borderTopColor: Colors.border,
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 85 : 65,
                paddingBottom: Platform.OS === 'ios' ? 25 : 10,
                paddingTop: 10,
              },
              tabBarActiveTintColor: Colors.accent2,
              tabBarInactiveTintColor: Colors.muted,
              tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
              tabBarIcon: ({ focused, color, size }) => {
                const icons = {
                  Matches: focused ? 'search' : 'search-outline',
                  Saved: focused ? 'bookmark' : 'bookmark-outline',
                  Resume: focused ? 'document-text' : 'document-text-outline',
                  'Skill Gap': focused ? 'bar-chart' : 'bar-chart-outline',
                  Analytics: focused ? 'analytics' : 'analytics-outline',
                  Settings: focused ? 'settings' : 'settings-outline',
                };
                return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Matches">
              {() => (
                <MatchesScreen
                  profile={user}
                  resumeData={resumeData}
                  savedJobs={savedJobs}
                  onSave={handleSave}
                  onJobsLoaded={setAllJobs}
                  onMatchCacheUpdate={(cache) => setMatchCache(prev => ({ ...prev, ...cache }))}
                  onResumeNeeded={() => {}}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Saved" options={{ tabBarBadge: savedJobs.length > 0 ? savedJobs.length : undefined }}>
              {() => (
                <SavedJobsScreen
                  savedJobs={savedJobs}
                  matchCache={matchCache}
                  resumeData={resumeData}
                  onUnsave={(id) => setSavedJobs(s => s.filter(j => j.id !== id))}
                  onResumeNeeded={() => {}}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Resume">
              {() => (
                <ResumeInsightsScreen
                  resumeData={resumeData}
                  onUploadResume={() => {}}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Skill Gap">
              {() => (
                <SkillGapScreen
                  resumeData={resumeData}
                  matchCache={matchCache}
                  jobs={allJobs}
                  onUploadResume={() => {}}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Analytics">
              {() => (
                <AnalyticsScreen
                  jobs={allJobs}
                  matchCache={matchCache}
                  savedCount={savedJobs.length}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Settings">
              {() => (
                <SettingsScreen
                  user={user}
                  resumeData={resumeData}
                  onResumeUpdate={handleResumeUpdate}
                  onLogout={() => { setUser(null); setResumeData(null); setSavedJobs([]); setMatchCache({}); setAllJobs([]); }}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </>
  );
}
