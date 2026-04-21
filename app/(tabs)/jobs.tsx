import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const enabled = !!profile?.resumeText.trim();
  const jobsQuery = useQuery({ queryKey: ["jobs", profile?.uid, activeSearch, profile?.resumeText], queryFn: () => fetchJobs(profile, activeSearch), enabled });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingJob) setConfirmVisible(true);
    });
    return () => sub.remove();
  }, [pendingJob]);

  const openJob = async (job: Job) => {
    if (!isPremium && applicationsRemaining <= 0) {
      Alert.alert("Application limit reached", "Free accounts can track 10 applications. Upgrade to Premium to continue without limits.");
      return;
    }
    setPendingJob(job);
    setDetailJob(null);
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
        <EmptyState icon="lock" title="Add resume first" text="Upload your resume from the Home screen so the app can match real jobs against your skills, experience, and target role." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen scroll={false}>
        <Title>Matching Jobs</Title>
        <Body muted>Live listings filtered against your search and resume.</Body>
        <Row>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Try Financial Analyst, Digital Marketing, React" returnKeyType="search" onSubmitEditing={() => setActiveSearch(search.trim() || profile?.targetRole || "")} /></View>
          <Pressable style={styles.searchButton} onPress={() => setActiveSearch(search.trim() || profile?.targetRole || "")}><Feather name="search" color={theme.primaryForeground} size={22} /></Pressable>
        </Row>
        {jobsQuery.isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : null}
        {jobsQuery.error ? <EmptyState icon="alert-circle" title="Could not load jobs" text={jobsQuery.error instanceof Error ? jobsQuery.error.message : "Please try again."} action={<Button title="Retry" icon="refresh-cw" onPress={() => jobsQuery.refetch()} />} /> : null}
        {!jobsQuery.isLoading && !jobsQuery.error ? (
          <FlatList
            data={jobsQuery.data || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <JobCard job={item} onView={() => setDetailJob(item)} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={<RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={() => jobsQuery.refetch()} tintColor={theme.primary} />}
            ListEmptyComponent={<EmptyState icon="search" title="No matching jobs" text="Try a different role or skill keyword." />}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 118 }}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </Screen>

      <Modal visible={!!detailJob} transparent animationType="slide" onRequestClose={() => setDetailJob(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <Row>
              <View style={{ flex: 1, gap: 6 }}>
                <Badge tone={detailJob && detailJob.matchScore >= 75 ? "accent" : "primary"}>{detailJob?.matchScore || 0}% match</Badge>
                <Title small>{detailJob?.title}</Title>
                <Body muted>{detailJob?.company} · {detailJob?.location}</Body>
              </View>
              <Pressable onPress={() => setDetailJob(null)} hitSlop={12}><Feather name="x" size={24} color={theme.foreground} /></Pressable>
            </Row>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <Row><Body muted>Type</Body><Body>{detailJob?.type}</Body></Row>
                <Row><Body muted>Salary</Body><Body>{detailJob?.salary}</Body></Row>
                <Row><Body muted>Source</Body><Body>{detailJob?.source}</Body></Row>
                <View style={styles.tags}>{detailJob?.tags.slice(0, 6).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}</View>
                <Title small>Why it matches</Title>
                {detailJob?.matchReasons.map((reason) => <Row key={reason} style={{ justifyContent: "flex-start" }}><Feather name="check" size={15} color={theme.accent} /><Body muted style={{ flex: 1 }}>{reason}</Body></Row>)}
                <Title small>Description</Title>
                <Body muted>{detailJob?.description || "No description provided by the employer."}</Body>
              </View>
            </ScrollView>
            <Button title="Apply on official site" icon="external-link" onPress={() => detailJob && openJob(detailJob)} disabled={!isPremium && applicationsRemaining <= 0} />
            <Button title="Close" icon="x" variant="ghost" onPress={() => setDetailJob(null)} />
          </View>
        </View>
      </Modal>

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

function JobCard({ job, onView }: { job: Job; onView: () => void }) {
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
      <Body muted numberOfLines={2}>{job.description.slice(0, 180)}</Body>
      <View style={styles.tags}>{job.tags.slice(0, 4).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}</View>
      <Button title="View more" icon="chevron-right" variant="secondary" onPress={onView} />
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
  detailSheet: { width: "100%", backgroundColor: theme.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: theme.border },
});
