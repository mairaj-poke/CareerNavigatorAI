import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { parseResumeFile } from "@/services/resume";
import { initials } from "@/utils/profile";

export default function DashboardScreen() {
  const { profile, applications, applicationsRemaining, applyResumeData, isPremium } = useApp();
  const [working, setWorking] = useState(false);

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const file = (asset as any).file as File | undefined;
      setWorking(true);
      const parsed = await parseResumeFile(asset.uri, asset.name, asset.mimeType || "", file);
      await applyResumeData({
        resumeText: parsed.text,
        resumeFileName: parsed.fileName,
        name: parsed.name,
        phone: parsed.phone,
        skills: parsed.skills,
        education: parsed.education,
        experience: parsed.experience,
      });
      const found: string[] = [];
      if (parsed.skills.length) found.push(`${parsed.skills.length} skills`);
      if (parsed.experience) found.push(parsed.experience);
      if (parsed.education.length) found.push(`${parsed.education.length} education entries`);
      Alert.alert("Resume uploaded", `Profile updated automatically.${found.length ? `\n\nFound: ${found.join(" · ")}` : ""}`);
    } catch (err) {
      Alert.alert("Resume not processed", err instanceof Error ? err.message : "Please try a different file.");
    } finally {
      setWorking(false);
    }
  };

  const goJobs = () => router.push("/(tabs)/jobs");

  return (
    <Screen>
      <Row>
        <View style={{ gap: 6, flex: 1 }}>
          <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
          <Title>Hi, {profile?.name?.split(" ")[0] || "there"}</Title>
          <Body muted>{profile?.targetRole} · {profile?.experience}</Body>
        </View>
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text></View>
        )}
      </Row>

      <Card style={styles.gradientCard}>
        <Row>
          <View style={{ flex: 1, gap: 6 }}>
            <Body muted>Career readiness</Body>
            <Title small>{profile?.resumeText ? "Resume saved · matching is active" : "Upload your resume to start matching"}</Title>
            {profile?.resumeFileName ? <Body muted>File: {profile.resumeFileName}</Body> : null}
          </View>
          <Feather name={profile?.resumeText ? "check-circle" : "upload-cloud"} size={30} color={profile?.resumeText ? theme.accent : theme.warning} />
        </Row>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: profile?.resumeText ? "92%" : "32%" }]} /></View>
        <Button title={profile?.resumeText ? "Replace resume" : "Upload resume"} icon="upload" onPress={pickResume} loading={working} />
      </Card>

      <Row style={styles.statsRow}>
        <Stat label="Applications left" value={isPremium ? "∞" : String(applicationsRemaining)} icon="send" />
        <Stat label="Tracked" value={String(applications.length)} icon="bookmark" />
      </Row>

      {profile?.resumeText ? (
        <Card>
          <Title small>Resume snapshot</Title>
          <Body muted numberOfLines={4}>{profile.resumeText.slice(0, 600)}</Body>
          <View style={styles.tags}>{profile.skills.slice(0, 6).map((skill) => <Badge key={skill} tone="muted">{skill}</Badge>)}</View>
          <Button title="Edit profile details" icon="edit-3" variant="secondary" onPress={() => router.push("/(tabs)/profile")} />
        </Card>
      ) : (
        <EmptyState
          icon="file-text"
          title="Upload your resume to start"
          text="Choose a PDF or DOCX. The app will extract your name, contact, skills, education, and experience automatically."
          action={<Button title="Upload resume" icon="upload" onPress={pickResume} loading={working} />}
        />
      )}

      <Card>
        <Title small>Quick actions</Title>
        <Button title="Find matching jobs" icon="briefcase" onPress={goJobs} disabled={!profile?.resumeText} />
        <Button title="Ask AI coach" icon="message-circle" variant="secondary" onPress={() => router.push("/(tabs)/ai")} />
        <Button title="Salary insights" icon="trending-up" variant="secondary" onPress={() => router.push("/(tabs)/salary")} />
      </Card>
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof import("@expo/vector-icons/Feather").default.glyphMap }) {
  return <Card style={styles.stat}><Feather name={icon} size={22} color={theme.primary} /><Text style={styles.statValue}>{value}</Text><Body muted style={{ fontSize: 12 }}>{label}</Body></Card>;
}

const styles = StyleSheet.create({
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 58, height: 58, borderRadius: 22, backgroundColor: theme.secondary },
  avatarText: { color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 18 },
  gradientCard: { backgroundColor: "#202151" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: theme.input, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.accent, borderRadius: 999 },
  statsRow: { alignItems: "stretch" },
  stat: { flex: 1, gap: 8 },
  statValue: { color: theme.foreground, fontSize: 26, fontFamily: "Inter_700Bold" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
