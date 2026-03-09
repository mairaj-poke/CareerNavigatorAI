import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SignupScreen from "./src/screens/SignupScreen";
import { Colors } from './src/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MatchesScreen from './src/screens/MatchesScreen';

import {
SavedJobsScreen,
ResumeInsightsScreen,
SkillGapScreen,
AnalyticsScreen,
SettingsScreen,
} from './src/screens/OtherScreens';

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

const TABS = [
{ key: 'matches', label: 'Matches', icon: 'search', iconOff: 'search-outline' },
{ key: 'saved', label: 'Saved', icon: 'bookmark', iconOff: 'bookmark-outline' },
{ key: 'resume', label: 'Resume', icon: 'document-text', iconOff: 'document-text-outline' },
{ key: 'skillgap', label: 'Skills', icon: 'bar-chart', iconOff: 'bar-chart-outline' },
{ key: 'analytics', label: 'Analytics', icon: 'analytics', iconOff: 'analytics-outline' },
{ key: 'settings', label: 'Settings', icon: 'settings', iconOff: 'settings-outline' },
];

function TabBar({ activeTab, setTab, savedCount }) {

const insets = useSafeAreaInsets();

return (

<View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
{TABS.map(t => {

const on = activeTab === t.key;

return (

<TouchableOpacity key={t.key} style={tb.item} onPress={() => setTab(t.key)} activeOpacity={0.7}>

<View style={{ position: 'relative' }}>

<Ionicons name={on ? t.icon : t.iconOff} size={22} color={on ? Colors.accent2 : Colors.muted} />

{t.key === 'saved' && savedCount > 0 && ( <View style={tb.badge}> <Text style={tb.badgeTxt}>{savedCount > 9 ? '9+' : savedCount}</Text> </View>
)}

</View>

<Text style={[tb.label, on && tb.labelOn]}>{t.label}</Text>

</TouchableOpacity>

);

})} </View>

);

}

const tb = StyleSheet.create({

bar: {
flexDirection: 'row',
backgroundColor: '#0d0d1a',
borderTopWidth: 1,
borderTopColor: 'rgba(255,255,255,0.08)',
paddingTop: 10,
},

item: { flex: 1, alignItems: 'center', gap: 3 },

label: { fontSize: 10, color: Colors.muted },

labelOn: { color: Colors.accent2, fontWeight: '600' },

badge: {
position: 'absolute',
top: -5,
right: -8,
backgroundColor: Colors.accent,
borderRadius: 8,
minWidth: 16,
height: 16,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: 2,
},

badgeTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

});

export default function App() {

const [isSignedUp, setIsSignedUp] = useState(false);
const [user, setUser] = useState(null);
const [resumeData, setResumeData] = useState(null);
const [savedJobs, setSavedJobs] = useState([]);
const [allJobs, setAllJobs] = useState([]);
const [matchCache, setMatchCache] = useState({});
const [activeTab, setActiveTab] = useState('matches');

useEffect(() => {

const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {

if (firebaseUser) {
setIsSignedUp(true);
}

});

return unsubscribe;

}, []);

const handleComplete = useCallback(async (profile) => {

setUser(profile);

if (profile.resumeData) {
setResumeData(profile.resumeData);
}

try {

if (!auth.currentUser) return;

const uid = auth.currentUser.uid;

await setDoc(doc(db, "users", uid), {
...profile,
resumeData: profile.resumeData || null,
createdAt: new Date()
});

} catch (error) {

console.log("Error saving user profile:", error);

}

}, []);

const handleSave = useCallback((job) => {

setSavedJobs(s =>
s.find(j => j.id === job.id)
? s.filter(j => j.id !== job.id)
: [...s, job]
);

}, []);

const handleResumeUpdate = useCallback((data) => {

setResumeData(data);

}, []);

const handleLogout = useCallback(async () => {

try {
await signOut(auth);
} catch (error) {
console.log("Logout error:", error);
}

setUser(null);
setResumeData(null);
setSavedJobs([]);
setAllJobs([]);
setMatchCache({});
setActiveTab('matches');
setIsSignedUp(false);

}, []);

if (!isSignedUp) {

return (

<SafeAreaProvider>
<SafeAreaView style={{ flex: 1 }}>
<SignupScreen onSignup={() => setIsSignedUp(true)} />
</SafeAreaView>
</SafeAreaProvider>

);

}

if (!user) {

return (

<> <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

<SafeAreaProvider>
<SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
<OnboardingScreen onComplete={handleComplete} />
</SafeAreaView>
</SafeAreaProvider>

</>

);

}

const goToSettings = () => setActiveTab('settings');

const renderScreen = () => {

switch (activeTab) {

case 'matches':

return (

<MatchesScreen
profile={user}
resumeData={resumeData}
savedJobs={savedJobs}
onSave={handleSave}
onResumeNeeded={goToSettings}
onJobsLoaded={setAllJobs}
onMatchCacheUpdate={setMatchCache}
/>

);

case 'saved':

return (

<SavedJobsScreen
savedJobs={savedJobs}
matchCache={matchCache}
resumeData={resumeData}
onUnsave={id => setSavedJobs(s => s.filter(j => j.id !== id))}
onResumeNeeded={goToSettings}
/>

);

case 'resume':

return (

<ResumeInsightsScreen
resumeData={resumeData}
onUploadResume={goToSettings}
/>

);

case 'skillgap':

return (

<SkillGapScreen
resumeData={resumeData}
matchCache={matchCache}
jobs={allJobs}
onUploadResume={goToSettings}
/>

);

case 'analytics':

return (

<AnalyticsScreen
jobs={allJobs}
matchCache={matchCache}
savedCount={savedJobs.length}
/>

);

case 'settings':

return (

<SettingsScreen
user={user}
resumeData={resumeData}
onResumeUpdate={handleResumeUpdate}
onLogout={handleLogout}
/>

);

default:
return null;

}

};

return (

<>

<StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

<SafeAreaProvider>

<SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top']}>

<View style={styles.topBar}>

<View>

<Text style={styles.topTitle}>Career Navigator AI</Text>

<Text style={styles.topSub}>
{resumeData
? `Resume loaded · ${(resumeData.skills || []).length} skills`
: `Hi, ${user.name?.split(' ')[0] || 'there'} 👋`}
</Text>

</View>

<TouchableOpacity style={styles.avatarBtn} onPress={goToSettings} activeOpacity={0.7}>
<Text style={styles.avatarTxt}>
{(user.name || 'U').charAt(0).toUpperCase()}
</Text>
</TouchableOpacity>

</View>

<View style={{ flex: 1 }}>
{renderScreen()} </View>

<TabBar
activeTab={activeTab}
setTab={setActiveTab}
savedCount={savedJobs.length}
/>

</SafeAreaView>

</SafeAreaProvider>

</>

);

}

const styles = StyleSheet.create({

topBar: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingHorizontal: 20,
paddingVertical: 12,
borderBottomWidth: 1,
borderBottomColor: 'rgba(255,255,255,0.08)',
backgroundColor: Colors.bg,
},

topTitle: {
fontSize: 16,
fontWeight: '700',
color: '#a78bfa',
},

topSub: {
fontSize: 11,
color: Colors.muted,
marginTop: 1,
},

avatarBtn: {
width: 36,
height: 36,
borderRadius: 18,
backgroundColor: 'rgba(108,99,255,0.25)',
borderWidth: 1,
borderColor: 'rgba(108,99,255,0.5)',
alignItems: 'center',
justifyContent: 'center',
},

avatarTxt: {
fontSize: 15,
fontWeight: '700',
color: '#a78bfa',
},

});
