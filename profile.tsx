import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { initials, parseSkills } from "@/utils/profile";

const sections = ["Contact", "Privacy", "About", "Guide"] as const;

type Section = typeof sections[number];

export default function ProfileScreen() {
  const { profile, applications, updateCareerProfile, logout, isPremium, upgradePlan } = useApp();
  const [editing, setEditing] = useState(false);
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

  return (
    <Screen>
      <Row>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name || "", profile?.email || "")}</Text></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Title small>{profile?.name}</Title>
          <Body muted>{profile?.email}</Body>
          <Badge tone={isPremium ? "accent" : "primary"}>{isPremium ? "Premium" : "Free plan"}</Badge>
        </View>
      </Row>

      <Card>
        <Row>
          <Title small>Career profile</Title>
          <Button title={editing ? "Cancel" : "Edit"} icon={editing ? "x" : "edit-3"} variant="ghost" onPress={() => setEditing(!editing)} />
        </Row>
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
            <View style={styles.tags}>{profile?.skills.map((skill) => <Badge key={skill} tone="muted">{skill}</Badge>)}</View>
          </>
        )}
      </Card>

      <Card>
        <Title small>Applications</Title>
        {applications.length
          ? applications.slice(0, 5).map((app) => (
              <Pressable key={app.id} onPress={() => Linking.openURL(app.url)} style={styles.appRow}>
                <View style={{ flex: 1 }}>
                  <Body>{app.title}</Body>
                  <Body muted>{app.company}</Body>
                </View>
                <Feather name="external-link" color={theme.primary} size={18} />
              </Pressable>
            ))
          : <Body muted>No tracked applications yet.</Body>}
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Title small>Premium · ₹499/month</Title>
            <Body muted>Unlock unlimited analyses, up to 20 job matches, unlimited AI coaching, interview prep, cover letters, and advanced salary insights.</Body>
          </View>
          <Feather name="star" color={theme.warning} size={24} />
        </Row>
        <Button
          title={isPremium ? "Premium active" : "Upgrade to Premium"}
          icon={isPremium ? "check-circle" : "credit-card"}
          disabled={isPremium}
          onPress={isPremium ? undefined : () =>
            Alert.alert(
              "Upgrade to Premium",
              "Unlock unlimited analyses, up to 20 job matches, unlimited AI coaching, interview prep, and cover letters.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Upgrade", onPress: upgradePlan },
              ]
            )
          }
        />
      </Card>

      <Card>
        <Title small>Support</Title>
        <View style={styles.sectionRow}>
          {sections.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSection(item)}
              style={[styles.sectionTab, section === item && styles.sectionActive]}
            >
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

function Info({ label, value }: { label: string; value: string }) {
  return <Row><Body muted>{label}</Body><Body style={{ fontFamily: "Inter_700Bold" }}>{value}</Body></Row>;
}

function SupportContent({ section }: { section: Section }) {
  if (section === "Contact") return <><Body muted>Need help with login, job matching, applications, or premium access?</Body><Button title="Email support" icon="mail" variant="secondary" onPress={() => Linking.openURL("mailto:support@careernavigator.ai?subject=Career%20Navigator%20AI%20Support")} /></>;
  if (section === "Privacy") return <Body muted>Your profile is stored in your Firebase account. Resume text is used only for job matching and AI coaching inside this app. Application tracking stays local on your device.</Body>;
  if (section === "About") return <Body muted>Career Navigator AI helps Indian job seekers organize their career search with real job listings, resume matching, AI guidance, salary insights, and application tracking.</Body>;
  return <Body muted>1. Create your profile. 2. Add resume text. 3. Review match reasons before applying. 4. Confirm applications after returning from the job site. 5. Use AI Coach for resume, interview, and salary questions.</Body>;
}

const styles = StyleSheet.create({
  avatar: { width: 70, height: 70, borderRadius: 26, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  appRow: { flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  sectionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.secondary },
  sectionActive: { backgroundColor: theme.primary },
  sectionText: { color: theme.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 },
  sectionTextActive: { color: theme.primaryForeground },
});
