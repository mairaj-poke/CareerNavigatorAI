import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { fetchWithRetry } from "@/utils/api";
import { initials } from "@/utils/profile";

export default function DashboardScreen() {
  const {
    profile,
    applications,
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
    const skills = profile?.skills?.length ? profile.skills.join(", ") : "Skills not specified";
    return `Resume file uploaded: ${fileName}\n\nCareer profile used for matching:\nTarget role: ${role}\nExperience: ${experience}\nLocation: ${location}\nSkills: ${skills}\n\nThe app will use this uploaded resume file together with your saved career profile for job matching. You can optionally add more resume details here later to improve matching accuracy.`;
  };

  // Step 1: pick file, store locally only — NO API call
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
      const file = (asset as any).file as File | undefined;
      let resumeContent = createResumeSummaryFromFile(asset.name);
      if (Platform.OS === "web" && file && file.type === "text/plain") {
        const text = await file.text();
        if (text.trim().length > 20) resumeContent = `Resume file uploaded: ${asset.name}\n\n${text.trim()}`;
      }
      setResumeDraft(resumeContent);
      Alert.alert("Resume ready", "Review the details below, then tap \"Analyze Resume\" to save and activate job matching.");
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Please choose the file again.");
    }
  };

  const saveResume = async (text = resumeDraft) => {
    try {
      if (!text.trim() || text.trim().length < 20) throw new Error("Add resume details or upload a resume file first.");
      setSaving(true);
      await saveResumeText(text.trim());
      Alert.alert("Resume saved", "Job recommendations are now filtered by your profile.");
    } catch (err) {
      Alert.alert("Resume not saved", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const simpleHash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  };

  // Step 2: user-triggered — saves text then calls AI analysis
  const analyzeResume = async () => {
    if (analyzeInFlight.current) return;
    analyzeInFlight.current = true;
    try {
      const text = resumeDraft.trim();
      if (!text || text.length < 20) throw new Error("Upload a resume file first.");

      // Enforce daily analysis limit
      const allowed = await recordAnalysis();
      if (!allowed) {
        Alert.alert("Daily limit reached", "Free accounts can analyze 3 resumes per day. Upgrade to Premium for unlimited analyses.");
        return;
      }

      setSaving(true);

      const hash = simpleHash(text);
      // Cache hit — same resume already processed, skip API call
      if (profile?.resumeHash === hash && profile?.resumeData) {
        await saveResumeText(text);
        Alert.alert("Resume saved", "Your resume has been saved and job matching is now active.");
        return;
      }

      // Save raw text first so it is never lost even if analysis fails
      await saveResumeText(text);

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        const res = await fetchWithRetry(`${backendUrl}/api/analyze-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: text,
            plan: profile?.plan,
            analysesUsedToday: profile?.analysesUsedToday,
            analysesDate: profile?.analysesDate,
          }),
        });
        if (res.ok) {
          const { resumeData } = await res.json();
          if (resumeData) await saveResumeData(resumeData, hash);
        }
      }

      Alert.alert("Resume saved", "Your resume has been saved and job matching is now active.");
    } catch (err) {
      Alert.alert("Resume not saved", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
      analyzeInFlight.current = false;
    }
  };

  return (
    <Screen>
      <Row>
        <View style={{ gap: 6, flex: 1 }}>
          <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
          <Title>Hi, {profile?.name?.split(" ")[0] || "there"}</Title>
          <Body muted>{profile?.targetRole} · {profile?.experience}</Body>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text></View>
      </Row>

      <Card style={styles.gradientCard}>
        <Row>
          <View style={{ flex: 1, gap: 6 }}>
            <Body muted>Career readiness</Body>
            <Title small>{profile?.resumeText ? "Resume uploaded and matching is active" : "Upload your resume to unlock jobs"}</Title>
          </View>
          <Feather name={profile?.resumeText ? "check-circle" : "upload-cloud"} size={30} color={profile?.resumeText ? theme.accent : theme.warning} />
        </Row>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: profile?.resumeText ? "88%" : "38%" }]} /></View>
        <Button title={profile?.resumeText ? "Replace resume" : "Upload resume"} icon="upload" onPress={pickResume} />
        {resumeDraft && resumeDraft !== (profile?.resumeText || "") && (
          <>
            {!isPremium && (
              <Body muted style={{ textAlign: "center" }}>
                {analysesRemaining} analysis {analysesRemaining === 1 ? "credit" : "credits"} left today
              </Body>
            )}
            <Button
              title="Analyze Resume"
              icon="cpu"
              onPress={analyzeResume}
              loading={saving}
              disabled={!isPremium && analysesRemaining <= 0}
            />
          </>
        )}
      </Card>

      <Row style={styles.statsRow}>
        <Stat label="Applications left" value={isPremium ? "∞" : String(applicationsRemaining)} icon="send" />
        <Stat label="AI sessions left" value={isPremium ? "∞" : String(aiSessionsRemaining)} icon="message-circle" />
      </Row>

      {profile?.resumeText ? (
        <Card>
          <Title small>Resume profile</Title>
          <Body muted numberOfLines={3}>{profile.resumeText}</Body>
          <Field label="Optional: add more resume details" value={resumeDraft} onChangeText={setResumeDraft} multiline />
          <Button title="Save details" icon="save" onPress={() => saveResume()} loading={saving} variant="secondary" />
        </Card>
      ) : (
        <EmptyState
          icon="file-text"
          title="Upload resume to start matching"
          text="Choose a PDF, DOCX, or TXT resume. The app will save it immediately and use your profile details for matching."
          action={<Button title="Upload resume" icon="upload" onPress={pickResume} />}
        />
      )}

      <Card>
        <Title small>Quick actions</Title>
        <Button title="Find matching jobs" icon="briefcase" onPress={() => router.push("/(tabs)/jobs")} disabled={!profile?.resumeText} />
        <Button title="Ask AI coach" icon="message-circle" variant="secondary" onPress={() => router.push("/(tabs)/ai")} />
        <Button title="Salary insights" icon="trending-up" variant="secondary" onPress={() => router.push("/(tabs)/salary")} />
      </Card>
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return <Card style={styles.stat}><Feather name={icon} size={22} color={theme.primary} /><Text style={styles.statValue}>{value}</Text><Body muted style={{ fontSize: 12 }}>{label}</Body></Card>;
}

const styles = StyleSheet.create({
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 18 },
  gradientCard: { backgroundColor: "#202151" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: theme.input, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.accent, borderRadius: 999 },
  statsRow: { alignItems: "stretch" },
  stat: { flex: 1, gap: 8 },
  statValue: { color: theme.foreground, fontSize: 26, fontFamily: "Inter_700Bold" },
});
