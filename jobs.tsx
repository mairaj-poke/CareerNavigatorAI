import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, FlatList, Linking, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { fetchJobs } from "@/services/jobs";
import type { Job } from "@/types";

export default function JobsScreen() {
  const { profile, applicationsRemaining, isPremium, recordApplication } = useApp();
  const [search, setSearch] = useState(profile?.targetRole || "");
  const [activeSearch, setActiveSearch] = useState(profile?.targetRole || "");
  const [pendingJob, setPendingJob] = useState<Job | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const enabled = !!profile?.resumeText.trim();
  const jobsQuery = useQuery({
    queryKey: ["jobs", profile?.uid, activeSearch, profile?.resumeText],
    queryFn: () => fetchJobs(profile, activeSearch, isPremium),
    enabled,
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingJob) setConfirmVisible(true);
    });
    return () => sub.remove();
  }, [pendingJob]);

  const openJob = async (job: Job) => {
    if (!isPremium && applicationsRemaining <= 0) {
      Alert.alert("Application limit reached", "Free accounts can track 10 applications. Upgrade to Premium to continue applying without limits.");
      return;
    }
    setPendingJob(job);
    const supported = await Linking.canOpenURL(job.url);
    if (!supported) {
      setPendingJob(null);
      Alert.alert("Job link unavailable", "This listing did not provide an app-openable URL.");
      return;
    }
    await Linking.openURL(job.url);
    setTimeout(() => setConfirmVisible(true), 700);
  };

  const markApplied = async () => {
    if (!pendingJob) return;
    await recordApplication({ jobId: pendingJob.id, title: pendingJob.title, company: pendingJob.company, url: pendingJob.url });
    setConfirmVisible(false);
    setPendingJob(null);
    Alert.alert("Application tracked", "Your application was saved to your profile.");
  };

  if (!enabled) {
    return (
      <Screen>
        <Title>Matching Jobs</Title>
        <EmptyState icon="lock" title="Add resume first" text="To avoid irrelevant listings, jobs stay hidden until your resume or detailed skills summary is saved on the Home screen." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen scroll={false}>
        <Title>Matching Jobs</Title>
        <Body muted>Live listings are filtered against your resume, skills, and target role.</Body>
        <Row>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search role, skill, company" /></View>
          <Pressable style={styles.searchButton} onPress={() => setActiveSearch(search)}>
            <Feather name="search" color={theme.primaryForeground} size={22} />
          </Pressable>
        </Row>
        {jobsQuery.isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : null}
        {jobsQuery.error ? (
          <EmptyState
            icon="alert-circle"
            title="Could not load jobs"
            text={jobsQuery.error instanceof Error ? jobsQuery.error.message : "Please try again."}
            action={<Button title="Retry" icon="refresh-cw" onPress={() => jobsQuery.refetch()} />}
          />
        ) : null}
        {!jobsQuery.isLoading && !jobsQuery.error ? (
          <FlatList
            data={jobsQuery.data || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <JobCard job={item} onApply={() => openJob(item)} disabled={!isPremium && applicationsRemaining <= 0} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={<RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={() => jobsQuery.refetch()} tintColor={theme.primary} />}
            ListEmptyComponent={<EmptyState icon="search" title="No matching jobs" text="Try a broader role or skill. The app only shows listings that match your profile." />}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 118 }}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </Screen>
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Title small>Did you apply?</Title>
            <Body muted>{pendingJob ? `${pendingJob.title} at ${pendingJob.company}` : "Confirm your application."}</Body>
            <Button title="Yes, save application" icon="check" onPress={markApplied} />
            <Button title="Not yet" icon="x" variant="secondary" onPress={() => { setConfirmVisible(false); setPendingJob(null); }} />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function JobCard({ job, onApply, disabled }: { job: Job; onApply: () => void; disabled: boolean }) {
  return (
    <Card>
      <Row>
        <View style={{ flex: 1, gap: 6 }}>
          <Badge tone={job.matchScore >= 75 ? "accent" : "primary"}>{job.matchScore}% match</Badge>
          <Title small>{job.title}</Title>
          <Body muted>{job.company} · {job.location}</Body>
        </View>
        <View style={styles.scoreCircle}><Text style={styles.scoreText}>{job.matchScore}</Text></View>
      </Row>
      <Body muted numberOfLines={3}>{job.description}</Body>
      <View style={styles.tags}>{job.tags.slice(0, 4).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}</View>
      {job.matchedSkills?.length ? (
        <Row style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 6 }}>
          <Feather name="check-circle" size={14} color={theme.accent} />
          <Body muted>Matched: {job.matchedSkills.slice(0, 4).join(", ")}</Body>
        </Row>
      ) : null}
      {job.missingSkills?.length ? (
        <Row style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 6 }}>
          <Feather name="alert-circle" size={14} color={theme.warning} />
          <Body muted>Missing: {job.missingSkills.slice(0, 3).join(", ")}</Body>
        </Row>
      ) : null}
      <Button title="Apply on job site" icon="external-link" onPress={onApply} disabled={disabled} />
    </Card>
  );
}

const styles = StyleSheet.create({
  searchButton: { width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  scoreCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(67,233,123,0.14)", alignItems: "center", justifyContent: "center" },
  scoreText: { color: theme.accent, fontFamily: "Inter_700Bold", fontSize: 18 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%" },
});
