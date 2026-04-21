import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";

function TabIcon({ name, color }: { name: keyof typeof Feather.glyphMap; color: string }) {
  return <Feather name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const { authUser, loading } = useApp();
  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>;
  if (!authUser) return <Redirect href="/" />;
  const isWeb = Platform.OS === "web";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarLabelStyle: { fontFamily: "Inter_700Bold", fontSize: 11 },
        tabBarStyle: {
          position: "absolute",
          height: isWeb ? 84 : 76,
          paddingTop: 8,
          paddingBottom: isWeb ? 30 : 14,
          marginHorizontal: 14,
          marginBottom: isWeb ? 0 : 8,
          borderRadius: 28,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(26,26,53,0.96)",
          overflow: "hidden",
        },
        tabBarBackground: () => Platform.OS === "ios" ? <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} /> : null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ color }) => <TabIcon name="briefcase" color={color} /> }} />
      <Tabs.Screen name="ai" options={{ title: "AI", tabBarIcon: ({ color }) => <TabIcon name="message-circle" color={color} /> }} />
      <Tabs.Screen name="salary" options={{ title: "Salary", tabBarIcon: ({ color }) => <TabIcon name="trending-up" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background } });
