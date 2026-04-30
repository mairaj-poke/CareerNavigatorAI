import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Field,
  Row,
  Screen,
  Title,
  theme,
} from "@/components/ui";

import { useApp } from "@/context/AppContext";
import { fetchWithRetry } from "@/utils/api";
import { getCache, setCache } from "@/utils/cache";
import { initials } from "@/utils/profile";

// ✅ SAFE ENV ACCESS
const API_BASE =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  "";

export default function DashboardScreen() {
  const {
    profile,
    applicationsRemaining,
    aiSessionsRemaining,
    analysesRemaining,
    saveResumeText,
    saveResumeData,
    recordAnalysis,
    isPremium,
  } = useApp();

  const [resumeDraft, setResumeDraft] = useState(profile?.resumeText || "");
  const [saving, setSaving] = useState(false);
  const analyzeInFlight = useRef(false);

  const createResumeSummaryFromFile = (fileName: string) => {
    const role = profile?.targetRole || "Career seeker";
    const experience = profile?.experience || "Experience not specified";
    const location = profile?.location || "India";
    const skills = profile?.skills?.length
      ? profile.skills.join(", ")
      : "Skills not specified";

    return `Resume file uploaded: ${fileName}

Career profile used for matching:
Target role: ${role}
Experience: ${experience}
Location: ${location}
Skills: ${skills}`;
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const resumeContent = createResumeSummaryFromFile(asset.name);

      setResumeDraft(resumeContent);

      Alert.alert("Resume ready", "Tap Analyze Resume to process it.");
    } catch {
      Alert.alert("Upload failed", "Please try again.");
    }
  };

  const saveResume = async (text = resumeDraft) => {
    try {
      if (!text.trim()) throw new Error("Resume empty");

      setSaving(true);
      await saveResumeText(text.trim());

      Alert.alert("Saved", "Resume saved successfully");
    } catch {
      Alert.alert("Error", "Could not save resume");
    } finally {
      setSaving(false);
    }
  };

  const simpleHash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++)
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  };

  const analyzeResume = async () => {
    if (analyzeInFlight.current) return;
    analyzeInFlight.current = true;

    try {
      const text = resumeDraft.trim();
      if (!text) throw new Error("No resume");

      const allowed = await recordAnalysis();
      if (!allowed) {
        Alert.alert("Limit reached");
        return;
      }

      setSaving(true);

      const hash = simpleHash(text);

      if (profile?.resumeHash === hash && profile?.resumeData) {
        await saveResumeText(text);
        return;
      }

      await saveResumeText(text);

      if (!API_BASE) {
        Alert.alert("Backend not configured");
        return;
      }

      const res = await fetchWithRetry(
        `${API_BASE}/api/analyze-resume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: text,
            plan: profile?.plan,
            analysesUsedToday: profile?.analysesUsedToday,
            analysesDate: profile?.analysesDate,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (data?.resumeData) {
          await saveResumeData(data.resumeData, hash);

          // 🔥 OFFLINE CACHE SAVE
          await setCache("resumeData", data.resumeData);
        }
      }
    } catch (err) {
      // 🔥 OFFLINE FALLBACK
      const cached = await getCache("resumeData");

      if (cached) {
        await saveResumeData(cached, "offline");

        Alert.alert(
          "Offline Mode",
          "Loaded saved resume data"
        );

        return;
      }

      Alert.alert("Error", "Resume processing failed");
    } finally {
      setSaving(false);
      analyzeInFlight.current = false;
    }
  };

  return (
    <Screen>
      <Row>
        <View style={{ gap: 6, flex: 1 }}>
          <Badge tone={isPremium ? "accent" : "primary"}>
            {isPremium ? "Premium" : "Free plan"}
          </Badge>

          <Title>
            Hi, {profile?.name?.split(" ")[0] || "there"}
          </Title>

          <Body muted>
            {profile?.targetRole} · {profile?.experience}
          </Body>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials(profile?.name || "", profile?.email || "")}
          </Text>
        </View>
      </Row>

      <Card style={styles.gradientCard}>
        <Row>
          <View style={{ flex: 1 }}>
            <Body muted>Career readiness</Body>
            <Title small>
              {profile?.resumeText ? "Resume active" : "Upload resume"}
            </Title>
          </View>

          <Feather
            name={profile?.resumeText ? "check-circle" : "upload-cloud"}
            size={30}
            color={theme.accent}
          />
        </Row>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: profile?.resumeText ? "88%" : "30%" },
            ]}
          />
        </View>

        <Button title="Upload resume" icon="upload" onPress={pickResume} />

        <Button
          title="Analyze Resume"
          icon="cpu"
          onPress={analyzeResume}
          loading={saving}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.primaryForeground,
    fontSize: 18,
  },
  gradientCard: { backgroundColor: "#202151" },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.input,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.accent,
  },
});