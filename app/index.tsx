import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { parseSkills } from "@/utils/profile";

export default function AuthScreen() {
  const { authUser, loading, signIn, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("India");
  const [targetRole, setTargetRole] = useState("Software Developer");
  const [experience, setExperience] = useState("0-2 years");
  const [skills, setSkills] = useState("JavaScript, React Native, Communication");

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>;
  if (authUser) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    try {
      setBusy(true);
      if (!email.trim() || !password) throw new Error("Enter your email and password.");
      if (mode === "login") {
        await signIn(email, password);
      } else {
        if (!name.trim()) throw new Error("Enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await register({ name, email, password, phone, location, targetRole, experience, skills: parseSkills(skills) });
      }
    } catch (err) {
      Alert.alert(mode === "login" ? "Sign in failed" : "Registration failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.heroIcon}><Feather name="navigation" size={34} color={theme.accent} /></View>
      <View style={{ gap: 8 }}>
        <Badge tone="accent">AI career guidance for serious job seekers</Badge>
        <Title>Career Navigator AI</Title>
        <Body muted>Find real roles, match jobs against your resume, track applications, and get AI coaching from one mobile app.</Body>
      </View>

      <Card>
        <Row>
          <Pressable onPress={() => setMode("login")} style={[styles.segment, mode === "login" && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>Login</Text>
          </Pressable>
          <Pressable onPress={() => setMode("register")} style={[styles.segment, mode === "register" && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>Register</Text>
          </Pressable>
        </Row>
        {mode === "register" ? <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {mode === "register" ? (
          <>
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Location" value={location} onChangeText={setLocation} />
            <Field label="Target role" value={targetRole} onChangeText={setTargetRole} />
            <Field label="Experience" value={experience} onChangeText={setExperience} />
            <Field label="Skills" value={skills} onChangeText={setSkills} multiline />
          </>
        ) : null}
        <Button title={mode === "login" ? "Sign in" : "Create account"} icon="arrow-right" onPress={submit} loading={busy} />
        <Button title="Google sign-in setup pending" icon="chrome" variant="secondary" onPress={() => Alert.alert("Google sign-in", "Email/password login is ready. Google sign-in needs Firebase OAuth SHA keys configured before release.")} />
      </Card>

      <Row style={styles.featureRow}>
        <Feature icon="briefcase" text="Live Jobs" />
        <Feature icon="target" text="Resume Match" />
        <Feature icon="message-circle" text="AI Coach" />
      </Row>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return <View style={styles.feature}><Feather name={icon} color={theme.primary} size={18} /><Text style={styles.featureText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" },
  heroIcon: { width: 72, height: 72, borderRadius: 26, backgroundColor: "rgba(108,99,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  segment: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  segmentActive: { backgroundColor: theme.primary },
  segmentText: { color: theme.mutedForeground, fontFamily: "Inter_700Bold" },
  segmentTextActive: { color: theme.primaryForeground },
  featureRow: { alignItems: "stretch" },
  feature: { flex: 1, backgroundColor: theme.secondary, borderRadius: 18, padding: 12, gap: 8 },
  featureText: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 12 },
});
