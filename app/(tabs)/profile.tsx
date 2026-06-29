import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { initials, parseSkills } from "@/utils/profile";

const EXPERIENCE_OPTIONS = ["Fresher", "1-3 years", "4-6 years", "7-10 years", "10+ years"];

const sections = ["Contact", "Privacy", "About", "Guide"] as const;
type Section = typeof sections[number];

function ExperiencePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Experience</Text>
        <Pressable style={styles.pickerButton} onPress={() => setOpen(true)}>
          <Text style={[styles.pickerText, !value && { color: theme.mutedForeground }]}>{value || "Select experience level"}</Text>
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

export default function ProfileScreen() {
  const { profile, applications, updateCareerProfile, logout, isPremium, applicationsRemaining } = useApp();
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

  const openEdit = () => {
    setDraft({
      name: profile?.name || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      targetRole: profile?.targetRole || "",
      experience: profile?.experience || "",
      skills: profile?.skills.join(", ") || "",
    });
    setEditing(true);
  };

  const save = async () => {
    await updateCareerProfile({ ...draft, skills: parseSkills(draft.skills) });
    setEditing(false);
    Alert.alert("Saved", "Your career profile has been updated.");
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
      if (!base64) { Alert.alert("Photo not saved", "Could not read the selected photo."); return; }
      if (base64.length > 700_000) { Alert.alert("Photo too large", "Please choose a smaller image (under 500 KB)."); return; }
      setSavingPhoto(true);
      const mime = asset.mimeType || "image/jpeg";
      await updateCareerProfile({ photoUrl: `data:${mime};base64,${base64}` });
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
    try { await updateCareerProfile({ photoUrl: "" }); } finally { setSavingPhoto(false); }
  };

  const skills = profile?.skills || [];

  return (
    <Screen>
      <Row>
        <Pressable onPress={pickPhoto} style={styles.avatarWrapper}>
          {profile?.photoUrl
            ? <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
            : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text></View>}
          <View style={styles.avatarBadge}><Feather name="camera" size={14} color={theme.primaryForeground} /></View>
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Title small>{profile?.name || "Your Name"}</Title>
          <Body muted>{profile?.email}</Body>
          <Row style={{ justifyContent: "flex-start", gap: 8 }}>
            <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
            {!isPremium ? <Badge tone="muted">{applicationsRemaining}/10 applies left</Badge> : null}
          </Row>
        </View>
      </Row>

      <Card>
        <Row>
          <Title small>Profile photo</Title>
          <Button title={profile?.photoUrl ? "Change" : "Add photo"} icon="image" variant="secondary" onPress={pickPhoto} loading={savingPhoto} />
        </Row>
        {profile?.photoUrl ? <Button title="Remove photo" icon="trash-2" variant="ghost" onPress={removePhoto} /> : null}
      </Card>

      <Card>
        <Row>
          <Title small>Career profile</Title>
          <Button title={editing ? "Cancel" : "Edit"} icon={editing ? "x" : "edit-3"} variant="ghost" onPress={editing ? () => setEditing(false) : openEdit} />
        </Row>
        {editing ? (
          <>
            <Field label="Full name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Your full name" />
            <Field label="Phone" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
            <Field label="Location / City" value={draft.location} onChangeText={(location) => setDraft({ ...draft, location })} placeholder="e.g. Bengaluru, India" />
            <Field label="Target role" value={draft.targetRole} onChangeText={(targetRole) => setDraft({ ...draft, targetRole })} placeholder="e.g. Software Engineer" />
            <ExperiencePicker value={draft.experience} onChange={(experience) => setDraft({ ...draft, experience })} />
            <Field label="Skills (comma separated)" value={draft.skills} onChangeText={(skills) => setDraft({ ...draft, skills })} placeholder="React, Python, SQL..." multiline />
            <Button title="Save profile" icon="save" onPress={save} />
          </>
        ) : (
          <>
            <View style={styles.infoGrid}>
              <InfoRow label="Role" value={profile?.targetRole || "—"} />
              <InfoRow label="Experience" value={profile?.experience || "—"} />
              <InfoRow label="Location" value={profile?.location || "—"} />
              <InfoRow label="Phone" value={profile?.phone || "—"} />
            </View>
            {skills.length > 0 ? (
              <View>
                <Text style={styles.skillsLabel}>Skills</Text>
                <View style={styles.tags}>
                  {skills.map((skill) => (
                    <Badge key={skill} tone="muted">{skill}</Badge>
                  ))}
                </View>
              </View>
            ) : (
              <Body muted>No skills added yet. Edit profile or upload a resume.</Body>
            )}
          </>
        )}
      </Card>

      {profile?.education?.length ? (
        <Card>
          <Title small>Education</Title>
          {profile.education.map((entry, idx) => (
            <Row key={`${entry.degree}-${idx}`} style={{ justifyContent: "flex-start", gap: 10 }}>
              <View style={styles.eduIcon}><Feather name="book" size={14} color={theme.primary} /></View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: "Inter_600SemiBold" }}>{entry.degree}</Body>
                {entry.institution ? <Body muted>{entry.institution}</Body> : null}
                {entry.year ? <Body muted>{entry.year}</Body> : null}
              </View>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <Title small>Applications this month</Title>
        {applications.length ? (
          <>
            {applications.slice(0, 5).map((app) => (
              <Pressable key={app.id} onPress={() => Linking.openURL(app.url)} style={styles.appRow}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: "Inter_600SemiBold" }}>{app.title}</Body>
                  <Body muted>{app.company}</Body>
                </View>
                <Feather name="external-link" color={theme.primary} size={18} />
              </Pressable>
            ))}
            {applications.length > 5 ? <Body muted style={{ textAlign: "center" }}>+{applications.length - 5} more</Body> : null}
          </>
        ) : (
          <Body muted>No tracked applications yet.</Body>
        )}
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Title small>Premium · ₹499/month</Title>
            <Body muted>Unlock unlimited applications, Resume Skill Gap Analyzer, priority job matching, and advanced salary insights.</Body>
          </View>
          <Feather name="star" color={theme.warning} size={24} />
        </Row>
        {isPremium
          ? <Badge tone="accent">You are Premium</Badge>
          : <Button title="Request upgrade" icon="credit-card" onPress={() => Linking.openURL("mailto:support@careernavigator.ai?subject=Career%20Navigator%20AI%20Premium%20Upgrade")} />}
      </Card>

      <Card>
        <Title small>Support</Title>
        <View style={styles.sectionRow}>
          {sections.map((item) => (
            <Pressable key={item} onPress={() => setSection(item)} style={[styles.sectionTab, section === item && styles.sectionActive]}>
              <Text style={[styles.sectionText, section === item && styles.sectionTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <SupportContent section={section} />
      </Card>

      <Button title="Sign out" icon="log-out" variant="danger" onPress={() => logout()} />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
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
  infoGrid: { gap: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  infoLabel: { color: theme.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 },
  infoValue: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 14, flex: 1, textAlign: "right" },
  skillsLabel: { color: theme.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eduIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(108,99,255,0.14)", alignItems: "center", justifyContent: "center" },
  appRow: { flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  sectionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.secondary },
  sectionActive: { backgroundColor: theme.primary },
  sectionText: { color: theme.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 },
  sectionTextActive: { color: theme.primaryForeground },
});
