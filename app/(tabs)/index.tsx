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
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
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
        location: (parsed as any).location || "",
        targetRole: (parsed as any).targetRole || "",
        skills: parsed.skills,
        education: parsed.education,
        experience: parsed.experience,
      });
      const found: string[] = [];
      if (parsed.name) found.push(`Name: ${parsed.name}`);
      if (parsed.skills.length) found.push(`${parsed.skills.length} skills`);
      if (parsed.experience) found.push(parsed.experience);
      if (parsed.education.length) found.push(`${parsed.education.length} education entries`);
      Alert.alert(
        "Resume uploaded",
        `Profile updated automatically.\n\n${found.length ? `Detected: ${found.join(" · ")}` : "Check your profile to review extracted info."}`,
      );
    } catch (err) {
      Alert.alert("Resume not processed", err instanceof Error ? err.message : "Please try a different file.");
    } finally {
      setWorking(false);
    }
  };

  const profileCompleteness = (() => {
    let score = 0;
    if (profile?.resumeText) score += 35;
    if (profile?.skills?.length) score += 20;
    if (profile?.targetRole) score += 15;
    if (profile?.experience) score += 10;
    if (profile?.location) score += 10;
    if (profile?.phone) score += 5;
    if (profile?.education?.length) score += 5;
    return Math.min(score, 100);
  })();

  const skills = profile?.skills || [];
  const topSkills = skills.slice(0, 6);

  return (
    <Screen>
      <Row>
        <View style={{ gap: 6, flex: 1 }}>
          <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
          <Title>Hi, {profile?.name?.split(" ")[0] || "there"}</Title>
          <Body muted>{profile?.targetRole || "Complete your profile"} {profile?.experience ? `· ${profile.experience}` : ""}</Body>
        </View>
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text>
          </View>
        )}
      </Row>

      <Card style={styles.readinessCard}>
        <Row>
          <View style={{ flex: 1, gap: 4 }}>
            <Body muted style={{ fontSize: 12 }}>CAREER READINESS</Body>
            <Title small>{profileCompleteness}% Complete</Title>
            {profile?.resumeFileName ? (
              <View style={styles.fileTag}>
                <Feather name="file-text" size={12} color={theme.accent} />
                <Text style={styles.fileTagText}>{profile.resumeFileName}</Text>
              </View>
            ) : (
              <Body muted>Upload your resume to start</Body>
            )}
          </View>
          <View style={[styles.readinessCircle, { borderColor: profileCompleteness >= 70 ? theme.accent : theme.warning }]}>
            <Text style={[styles.readinessScore, { color: profileCompleteness >= 70 ? theme.accent : theme.warning }]}>{profileCompleteness}</Text>
            <Text style={styles.readinessPct}>%</Text>
          </View>
        </Row>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${profileCompleteness}%`, backgroundColor: profileCompleteness >= 70 ? theme.accent : theme.warning }]} />
        </View>
        <Button
          title={profile?.resumeText ? "Replace resume" : "Upload resume"}
          icon="upload"
          onPress={pickResume}
          loading={working}
        />
      </Card>

      <Row style={styles.statsRow}>
        <StatCard label="Applies left" value={isPremium ? "∞" : String(applicationsRemaining)} icon="send" color={applicationsRemaining > 3 ? theme.accent : theme.warning} />
        <StatCard label="Tracked" value={String(applications.length)} icon="bookmark" color={theme.primary} />
        <StatCard label="Skills" value={String(skills.length)} icon="zap" color={theme.accent} />
      </Row>

      {profile?.resumeText ? (
        <Card>
          <Row>
            <Title small>Resume insights</Title>
            <Badge tone="accent">Active</Badge>
          </Row>

          {profile.location ? (
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}><Feather name="map-pin" size={14} color={theme.primary} /></View>
              <Body muted>{profile.location}</Body>
            </View>
          ) : null}

          {profile.experience ? (
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}><Feather name="clock" size={14} color={theme.primary} /></View>
              <Body muted>{profile.experience}</Body>
            </View>
          ) : null}

          {profile.education?.length ? (
            <View style={styles.insightRow}>
              <View style={styles.insightIcon}><Feather name="book" size={14} color={theme.primary} /></View>
              <Body muted>{profile.education[0].degree}{profile.education[0].institution ? ` · ${profile.education[0].institution}` : ""}</Body>
            </View>
          ) : null}

          {topSkills.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Body muted style={{ fontSize: 12 }}>TOP SKILLS</Body>
              <View style={styles.tags}>
                {topSkills.map((skill) => <Badge key={skill} tone="muted">{skill}</Badge>)}
                {skills.length > 6 ? <Badge tone="primary">+{skills.length - 6} more</Badge> : null}
              </View>
            </View>
          ) : null}

          <Button title="Edit profile details" icon="edit-3" variant="secondary" onPress={() => router.push("/(tabs)/profile")} />
        </Card>
      ) : (
        <EmptyState
          icon="file-text"
          title="Upload your resume to start"
          text="Choose a PDF or DOCX. The app will extract your name, contact, skills, education, experience, and location automatically."
          action={<Button title="Upload resume" icon="upload" onPress={pickResume} loading={working} />}
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

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card style={styles.stat}>
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Body muted style={{ fontSize: 11, textAlign: "center" }}>{label}</Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 58, height: 58, borderRadius: 22, backgroundColor: theme.secondary },
  avatarText: { color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 18 },
  readinessCard: { backgroundColor: "#131836" },
  readinessCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 1 },
  readinessScore: { fontFamily: "Inter_700Bold", fontSize: 20 },
  readinessPct: { color: theme.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, alignSelf: "flex-end", paddingBottom: 2 },
  fileTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  fileTagText: { color: theme.accent, fontFamily: "Inter_500Medium", fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: theme.input, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  statsRow: { alignItems: "stretch", gap: 10 },
  stat: { flex: 1, gap: 6, alignItems: "center", paddingVertical: 16 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  insightRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  insightIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(108,99,255,0.12)", alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
