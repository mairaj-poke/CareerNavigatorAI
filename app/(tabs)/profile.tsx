import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { initials, parseSkills } from "@/utils/profile";

const sections = ["Contact", "Privacy", "About", "Guide"] as const;

type Section = typeof sections[number];

export default function ProfileScreen() {
  const { profile, applications, updateCareerProfile, logout, isPremium } = useApp();
  const [editing, setEditing] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [section, setSection] = useState<Section>("Contact");
  const [draft, setDraft] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    targetRole: profile?.targetRole || "",
    experience: profile?.experience || "",
    skills: profile?.skills.join(", ") || "",
  });

  const save = async () => {
    await updateCareerProfile({ ...draft, skills: parseSkills(draft.skills) });
    setEditing(false);
    Alert.alert("Profile saved", "Your career profile has been updated.");
  };

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access to update your profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) {
        Alert.alert("Photo not saved", "Could not read the selected photo.");
        return;
      }
      if (base64.length > 700_000) {
        Alert.alert("Photo too large", "Please choose a smaller image (under 500 KB).");
        return;
      }
      setSavingPhoto(true);
      const mime = asset.mimeType || "image/jpeg";
      const photoUrl = `data:${mime};base64,${base64}`;
      await updateCareerProfile({ photoUrl });
      Alert.alert("Photo updated", "Your profile picture has been saved.");
    } catch (err) {
      Alert.alert("Photo not saved", err instanceof Error ? err.message : "Please try a different image.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const removePhoto = async () => {
    if (!profile?.photoUrl) return;
    setSavingPhoto(true);
    try {
      await updateCareerProfile({ photoUrl: "" });
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <Screen>
      <Row>
        <Pressable onPress={pickPhoto} style={styles.avatarWrapper}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text></View>
          )}
          <View style={styles.avatarBadge}><Feather name="camera" size={14} color={theme.primaryForeground} /></View>
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Title small>{profile?.name}</Title>
          <Body muted>{profile?.email}</Body>
          <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
        </View>
      </Row>

      <Card>
        <Row><Title small>Profile photo</Title><Button title={profile?.photoUrl ? "Change" : "Add photo"} icon="image" variant="secondary" onPress={pickPhoto} loading={savingPhoto} /></Row>
        {profile?.photoUrl ? <Button title="Remove photo" icon="trash-2" variant="ghost" onPress={removePhoto} /> : null}
      </Card>

      <Card>
        <Row><Title small>Career profile</Title><Button title={editing ? "Cancel" : "Edit"} icon={editing ? "x" : "edit-3"} variant="ghost" onPress={() => setEditing(!editing)} /></Row>
        {editing ? (
          <>
            <Field label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <Field label="Phone" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} />
            <Field label="Location" value={draft.location} onChangeText={(location) => setDraft({ ...draft, location })} />
            <Field label="Target role" value={draft.targetRole} onChangeText={(targetRole) => setDraft({ ...draft, targetRole })} />
            <Field label="Experience" value={draft.experience} onChangeText={(experience) => setDraft({ ...draft, experience })} />
            <Field label="Skills" value={draft.skills} onChangeText={(skills) => setDraft({ ...draft, skills })} multiline />
            <Button title="Save profile" icon="save" onPress={save} />
          </>
        ) : (
          <>
            <Info label="Role" value={profile?.targetRole || ""} />
            <Info label="Experience" value={profile?.experience || ""} />
            <Info label="Location" value={profile?.location || ""} />
            <Info label="Phone" value={profile?.phone || "—"} />
            <View style={styles.tags}>{profile?.skills.map((skill) => <Badge key={skill} tone="muted">{skill}</Badge>)}</View>
          </>
        )}
      </Card>

      {profile?.education?.length ? (
        <Card>
          <Title small>Education</Title>
          {profile.education.map((entry, idx) => (
            <Row key={`${entry.degree}-${idx}`} style={{ justifyContent: "flex-start" }}>
              <Feather name="book" size={16} color={theme.primary} />
              <Body style={{ flex: 1 }}>{entry.degree}{entry.institution ? ` · ${entry.institution}` : ""}</Body>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <Title small>Applications</Title>
        {applications.length ? applications.slice(0, 5).map((app) => <Pressable key={app.id} onPress={() => Linking.openURL(app.url)} style={styles.appRow}><View style={{ flex: 1 }}><Body>{app.title}</Body><Body muted>{app.company}</Body></View><Feather name="external-link" color={theme.primary} size={18} /></Pressable>) : <Body muted>No tracked applications yet.</Body>}
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Title small>Premium · ₹499/month</Title>
            <Body muted>Unlock unlimited applications, priority job matching, and advanced salary insights.</Body>
          </View>
          <Feather name="star" color={theme.warning} size={24} />
        </Row>
        {isPremium ? <Badge tone="accent">You are Premium</Badge> : <Button title="Request upgrade" icon="credit-card" onPress={() => Linking.openURL("mailto:support@careernavigator.ai?subject=Career%20Navigator%20AI%20Premium%20Upgrade")} />}
      </Card>

      <Card>
        <Title small>Support</Title>
        <View style={styles.sectionRow}>{sections.map((item) => <Pressable key={item} onPress={() => setSection(item)} style={[styles.sectionTab, section === item && styles.sectionActive]}><Text style={[styles.sectionText, section === item && styles.sectionTextActive]}>{item}</Text></Pressable>)}</View>
        <SupportContent section={section} />
      </Card>

      <Button title="Sign out" icon="log-out" variant="danger" onPress={() => logout()} />
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Row><Body muted>{label}</Body><Body style={{ fontFamily: "Inter_700Bold" }}>{value}</Body></Row>;
}

function SupportContent({ section }: { section: Section }) {
  if (section === "Contact") return <><Body muted>Need help with login, job matching, applications, or premium access?</Body><Button title="Email support" icon="mail" variant="secondary" onPress={() => Linking.openURL("mailto:support@careernavigator.ai?subject=Career%20Navigator%20AI%20Support")} /></>;
  if (section === "Privacy") return <Body muted>Your profile is stored in your Firebase account. Resume text is used only for job matching and AI coaching inside this app.</Body>;
  if (section === "About") return <Body muted>Career Navigator AI helps Indian job seekers organize their career search with real job listings, resume parsing, AI guidance, salary insights, and application tracking.</Body>;
  return <Body muted>1. Upload your resume. 2. Edit profile if needed. 3. Search jobs and use match scores. 4. Apply on official sites. 5. Use AI Coach for guidance.</Body>;
}

const styles = StyleSheet.create({
  avatarWrapper: { width: 78, height: 78, position: "relative" },
  avatar: { width: 78, height: 78, borderRadius: 28, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 78, height: 78, borderRadius: 28, backgroundColor: theme.secondary },
  avatarText: { color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 22 },
  avatarBadge: { position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.background },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  appRow: { flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  sectionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.secondary },
  sectionActive: { backgroundColor: theme.primary },
  sectionText: { color: theme.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 },
  sectionTextActive: { color: theme.primaryForeground },
});
