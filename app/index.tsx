import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { parseSkills } from "@/utils/profile";

const EXPERIENCE_OPTIONS = ["Fresher", "1-3 years", "4-6 years", "7-10 years", "10+ years"];

function ExperiencePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Experience</Text>
        <Pressable style={styles.pickerButton} onPress={() => setOpen(true)}>
          <Text style={[styles.pickerText, !value && { color: theme.mutedForeground }]}>
            {value || "Select experience level"}
          </Text>
          <Feather name="chevron-down" size={18} color={theme.mutedForeground} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Experience Level</Text>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
                onPress={() => { onChange(opt); setOpen(false); }}
              >
                <Text style={[styles.pickerOptionText, value === opt && styles.pickerOptionTextActive]}>{opt}</Text>
                {value === opt ? <Feather name="check" size={16} color={theme.primary} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function AuthScreen() {
  const { authUser, loading, signIn, register } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Body muted style={{ marginTop: 12 }}>Loading your session...</Body>
      </View>
    );
  }

  if (authUser) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) throw new Error("Enter email and password.");
      if (mode === "login") {
        await signIn(cleanEmail, password);
      } else {
        const cleanName = name.trim();
        if (!cleanName) throw new Error("Enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const parsedSkills = parseSkills(skills || "");
        await register({
          name: cleanName,
          email: cleanEmail,
          password,
          phone: phone.trim(),
          location: location.trim(),
          targetRole: targetRole.trim(),
          experience,
          skills: Array.isArray(parsedSkills) ? parsedSkills : [],
        });
      }
    } catch (err) {
      const { Alert } = require("react-native");
      Alert.alert(
        mode === "login" ? "Sign in failed" : "Registration failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.heroIcon}>
        <Feather name="navigation" size={34} color={theme.accent} />
      </View>

      <View style={{ gap: 8 }}>
        <Badge tone="accent">AI career guidance for Indian job seekers</Badge>
        <Title>Career Navigator AI</Title>
        <Body muted>Find real roles, match jobs, track applications, and get AI coaching.</Body>
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

        {mode === "register" && (
          <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your full name" />
        )}

        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@email.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder={mode === "register" ? "Min 6 characters" : "Your password"} />

        {mode === "register" && (
          <>
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 XXXXX XXXXX" />
            <Field label="Location / City (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Bengaluru, India" />
            <Field label="Target role (optional)" value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Software Engineer" />
            <ExperiencePicker value={experience} onChange={setExperience} />
            <Field label="Skills (optional, comma separated)" value={skills} onChangeText={setSkills} multiline placeholder="e.g. React, Python, SQL" />
            <Body muted style={{ fontSize: 12 }}>You can also fill these by uploading your resume after signing up.</Body>
          </>
        )}

        <Button title={mode === "login" ? "Sign in" : "Create account"} icon="arrow-right" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" },
  heroIcon: { width: 72, height: 72, borderRadius: 26, backgroundColor: "rgba(108,99,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  segment: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  segmentActive: { backgroundColor: theme.primary },
  segmentText: { color: theme.mutedForeground, fontFamily: "Inter_600SemiBold" },
  segmentTextActive: { color: theme.primaryForeground, fontFamily: "Inter_700Bold" },
  label: { color: theme.mutedForeground, fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  pickerButton: { minHeight: 52, borderRadius: 16, backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerText: { color: theme.foreground, fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 6 },
  pickerTitle: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 8 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: theme.secondary },
  pickerOptionActive: { backgroundColor: "rgba(108,99,255,0.16)", borderWidth: 1, borderColor: theme.primary },
  pickerOptionText: { color: theme.foreground, fontFamily: "Inter_500Medium", fontSize: 15 },
  pickerOptionTextActive: { color: theme.primary, fontFamily: "Inter_700Bold" },
});
