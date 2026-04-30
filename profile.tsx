import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { initials, parseSkills } from "@/utils/profile";

const sections = ["Contact", "Privacy", "About", "Guide"] as const;
type Section = typeof sections[number];

export default function ProfileScreen() {
  const { profile, applications, updateCareerProfile, logout, isPremium, upgradePlan } = useApp();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("Contact");

  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    location: "",
    targetRole: "",
    experience: "",
    skills: "",
  });

  // ✅ Sync draft when profile loads
  useEffect(() => {
    if (profile) {
      setDraft({
        name: profile.name || "",
        phone: profile.phone || "",
        location: profile.location || "",
        targetRole: profile.targetRole || "",
        experience: profile.experience || "",
        skills: profile.skills?.join(", ") || "",
      });
    }
  }, [profile]);

  const save = async () => {
    try {
      if (!draft.name.trim()) {
        Alert.alert("Name required");
        return;
      }

      setSaving(true);

      await updateCareerProfile({
        ...draft,
        skills: parseSkills(draft.skills).slice(0, 15),
      });

      setEditing(false);
      Alert.alert("Profile saved");
    } catch {
      Alert.alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const openLink = async (url?: string) => {
    if (!url) {
      Alert.alert("Invalid link");
      return;
    }

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Cannot open link");
    }
  };

  return (
    <Screen>
      {/* HEADER */}
      <Row>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials(profile?.name || "", profile?.email || "")}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Title small>{profile?.name}</Title>
          <Body muted>{profile?.email}</Body>

          <Badge tone={isPremium ? "accent" : "primary"}>
            {isPremium ? "Premium" : "Free plan"}
          </Badge>
        </View>
      </Row>

      {/* PROFILE */}
      <Card>
        <Row>
          <Title small>Career profile</Title>
          <Button
            title={editing ? "Cancel" : "Edit"}
            icon={editing ? "x" : "edit-3"}
            variant="ghost"
            onPress={() => setEditing(!editing)}
          />
        </Row>

        {editing ? (
          <>
            <Field label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <Field label="Phone" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} />
            <Field label="Location" value={draft.location} onChangeText={(location) => setDraft({ ...draft, location })} />
            <Field label="Target role" value={draft.targetRole} onChangeText={(targetRole) => setDraft({ ...draft, targetRole })} />
            <Field label="Experience" value={draft.experience} onChangeText={(experience) => setDraft({ ...draft, experience })} />
            <Field label="Skills" value={draft.skills} onChangeText={(skills) => setDraft({ ...draft, skills })} multiline />

            <Button
              title={saving ? "Saving..." : "Save profile"}
              icon="save"
              onPress={save}
            />
          </>
        ) : (
          <>
            <Info label="Role" value={profile?.targetRole || ""} />
            <Info label="Experience" value={profile?.experience || ""} />
            <Info label="Location" value={profile?.location || ""} />

            <View style={styles.tags}>
              {(profile?.skills || []).map((skill) => (
                <Badge key={skill} tone="muted">{skill}</Badge>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* APPLICATIONS */}
      <Card>
        <Title small>Applications</Title>

        {applications.length ? (
          applications.slice(0, 5).map((app) => (
            <Pressable
              key={app.id}
              onPress={() => openLink(app.url)}
              style={styles.appRow}
            >
              <View style={{ flex: 1 }}>
                <Body>{app.title}</Body>
                <Body muted>{app.company}</Body>
              </View>
              <Feather name="external-link" color={theme.primary} size={18} />
            </Pressable>
          ))
        ) : (
          <Body muted>No tracked applications yet.</Body>
        )}
      </Card>

      {/* PREMIUM */}
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Title small>Premium · ₹499/month</Title>
            <Body muted>
              Unlock unlimited analyses, job matches, AI coaching, interview prep, and more.
            </Body>
          </View>
          <Feather name="star" color={theme.warning} size={24} />
        </Row>

        <Button
          title={isPremium ? "You're Premium" : "Upgrade to Premium"}
          icon={isPremium ? "check-circle" : "credit-card"}
          disabled={isPremium}
          onPress={
            isPremium
              ? undefined
              : () =>
                  Alert.alert(
                    "Upgrade to Premium",
                    "Unlock all features.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Upgrade", onPress: upgradePlan },
                    ]
                  )
          }
        />
      </Card>

      {/* SUPPORT */}
      <Card>
        <Title small>Support</Title>

        <View style={styles.sectionRow}>
          {sections.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSection(item)}
              style={[styles.sectionTab, section === item && styles.sectionActive]}
            >
              <Text style={[styles.sectionText, section === item && styles.sectionTextActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <SupportContent section={section} />
      </Card>

      {/* LOGOUT */}
      <Button
        title="Sign out"
        icon="log-out"
        variant="danger"
        onPress={() =>
          Alert.alert("Sign out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: logout },
          ])
        }
      />
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <Body muted>{label}</Body>
      <Body style={{ fontFamily: "Inter_700Bold" }}>{value}</Body>
    </Row>
  );
}

function SupportContent({ section }: { section: Section }) {
  if (section === "Contact")
    return (
      <>
        <Body muted>Need help? Reach out to support.</Body>
        <Button
          title="Email support"
          icon="mail"
          variant="secondary"
          onPress={() =>
            Linking.openURL(
              "mailto:support@careernavigator.ai?subject=Support"
            )
          }
        />
      </>
    );

  if (section === "Privacy")
    return (
      <Body muted>
        Your data is stored securely in Firebase. Resume data is only used inside the app.
      </Body>
    );

  if (section === "About")
    return (
      <Body muted>
        Career Navigator AI helps job seekers manage careers, resumes, and applications.
      </Body>
    );

  return (
    <Body muted>
      1. Create profile → 2. Upload resume → 3. Analyze → 4. Apply → 5. Use AI Coach
    </Body>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.primaryForeground,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  appRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  sectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTab: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.secondary,
  },
  sectionActive: {
    backgroundColor: theme.primary,
  },
  sectionText: {
    color: theme.mutedForeground,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  sectionTextActive: {
    color: theme.primaryForeground,
  },
});