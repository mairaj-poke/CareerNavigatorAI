import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { fetchJobs } from "@/services/jobs";
import type { Job, JobFilters } from "@/types";

const JOB_TYPES = ["All", "Full-time", "Part-time", "Contract", "Internship", "Freelance"];
const WORK_MODES = ["All", "Remote", "Hybrid"];
const EXPERIENCE_OPTS = ["All", "Fresher", "1-3 years", "4-6 years", "7-10 years", "10+ years"];

const DEFAULT_FILTERS: JobFilters = {
  jobType: "All",
  experience: "All",
  workMode: "All",
  includeInternational: false,
};

export default function JobsScreen() {
  const { profile, applicationsRemaining, isPremium, recordApplication } = useApp();
  const [search, setSearch] = useState(profile?.targetRole || "");
  const [activeSearch, setActiveSearch] = useState(profile?.targetRole || "");
  const [pendingJob, setPendingJob] = useState<Job | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<JobFilters>(DEFAULT_FILTERS);

  const enabled = !!profile?.resumeText.trim();

  const jobsQuery = useQuery({
    queryKey: ["jobs", profile?.uid, activeSearch, profile?.resumeText, activeFilters],
    queryFn: () => fetchJobs(profile, activeSearch, activeFilters),
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  const activeFilterCount = [
    activeFilters.jobType !== "All",
    activeFilters.workMode !== "All",
    activeFilters.experience !== "All",
    activeFilters.includeInternational,
  ].filter(Boolean).length;

  const openJob = async (job: Job) => {
    if (!isPremium && applicationsRemaining <= 0) {
      Alert.alert("Monthly limit reached", "Free accounts get 10 job applications per month. Your credits reset next month. Upgrade to Premium for unlimited applies.");
      return;
    }
    setPendingJob(job);
    setDetailJob(null);
    const supported = await Linking.canOpenURL(job.url);
    if (!supported) {
      setPendingJob(null);
      Alert.alert("Job link unavailable", "This listing did not provide an openable URL.");
      return;
    }
    await Linking.openURL(job.url);
    setTimeout(() => setConfirmVisible(true), 800);
  };

  const markApplied = async () => {
    if (!pendingJob) return;
    await recordApplication({ jobId: pendingJob.id, title: pendingJob.title, company: pendingJob.company, url: pendingJob.url });
    setConfirmVisible(false);
    setPendingJob(null);
    Alert.alert("Application tracked", "Saved to your profile. Credits deducted: 1");
  };

  const applyFilters = () => {
    setActiveFilters({ ...filters });
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
    setFilterVisible(false);
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
        <View style={{ gap: 6 }}>
          <Title>Matching Jobs</Title>
          <Body muted>India-focused listings filtered by your profile and search.</Body>
        </View>

        <Row>
          <View style={{ flex: 1 }}>
            <Field
              value={search}
              onChangeText={setSearch}
              placeholder="e.g. React Developer, Data Analyst..."
              returnKeyType="search"
              onSubmitEditing={() => setActiveSearch(search.trim() || profile?.targetRole || "")}
            />
          </View>
          <Pressable style={styles.iconBtn} onPress={() => setActiveSearch(search.trim() || profile?.targetRole || "")}>
            <Feather name="search" color={theme.primaryForeground} size={20} />
          </Pressable>
          <Pressable style={[styles.iconBtn, styles.filterBtn]} onPress={() => setFilterVisible(true)}>
            <Feather name="sliders" color={activeFilterCount > 0 ? theme.accent : theme.foreground} size={20} />
            {activeFilterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
          </Pressable>
        </Row>

        {!isPremium ? (
          <View style={styles.creditsBar}>
            <Feather name="send" size={14} color={applicationsRemaining > 3 ? theme.accent : theme.warning} />
            <Text style={[styles.creditsText, applicationsRemaining <= 3 && { color: theme.warning }]}>
              {applicationsRemaining > 0 ? `${applicationsRemaining} applies remaining this month` : "Monthly apply limit reached"}
            </Text>
          </View>
        ) : null}

        {!activeFilters.includeInternational ? (
          <View style={styles.indiaTag}>
            <Feather name="map-pin" size={12} color={theme.primary} />
            <Text style={styles.indiaTagText}>Showing India & Remote jobs</Text>
            <Pressable onPress={() => { setFilters({ ...filters, includeInternational: true }); setActiveFilters({ ...activeFilters, includeInternational: true }); }}>
              <Text style={styles.indiaTagLink}>Show all</Text>
            </Pressable>
          </View>
        ) : null}

        {jobsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Body muted>Finding best matches for you...</Body>
          </View>
        ) : null}

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
            renderItem={({ item }) => <JobCard job={item} onView={() => setDetailJob(item)} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={<RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={() => jobsQuery.refetch()} tintColor={theme.primary} />}
            ListEmptyComponent={<EmptyState icon="search" title="No matching jobs" text="Try a different role, skill keyword, or enable international jobs in filters." />}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </Screen>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterVisible(false)}>
          <View style={styles.filterSheet}>
            <Row>
              <Title small>Filters</Title>
              <Pressable onPress={() => setFilterVisible(false)} hitSlop={12}><Feather name="x" size={22} color={theme.foreground} /></Pressable>
            </Row>

            <FilterSection label="Job Type">
              <View style={styles.chipRow}>
                {JOB_TYPES.map((t) => (
                  <Pressable key={t} style={[styles.chip, filters.jobType === t && styles.chipActive]} onPress={() => setFilters({ ...filters, jobType: t })}>
                    <Text style={[styles.chipText, filters.jobType === t && styles.chipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </FilterSection>

            <FilterSection label="Work Mode">
              <View style={styles.chipRow}>
                {WORK_MODES.map((m) => (
                  <Pressable key={m} style={[styles.chip, filters.workMode === m && styles.chipActive]} onPress={() => setFilters({ ...filters, workMode: m })}>
                    <Text style={[styles.chipText, filters.workMode === m && styles.chipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </FilterSection>

            <FilterSection label="Experience Level">
              <View style={styles.chipRow}>
                {EXPERIENCE_OPTS.map((e) => (
                  <Pressable key={e} style={[styles.chip, filters.experience === e && styles.chipActive]} onPress={() => setFilters({ ...filters, experience: e })}>
                    <Text style={[styles.chipText, filters.experience === e && styles.chipTextActive]}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </FilterSection>

            <FilterSection label="Location">
              <Pressable style={[styles.toggleRow]} onPress={() => setFilters({ ...filters, includeInternational: !filters.includeInternational })}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.toggleLabel}>Include International Jobs</Text>
                  <Text style={styles.toggleSub}>Off = India & Remote only</Text>
                </View>
                <View style={[styles.toggle, filters.includeInternational && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, filters.includeInternational && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            </FilterSection>

            <Row>
              <View style={{ flex: 1 }}><Button title="Reset" icon="rotate-ccw" variant="secondary" onPress={resetFilters} /></View>
              <View style={{ flex: 2 }}><Button title="Apply filters" icon="check" onPress={applyFilters} /></View>
            </Row>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!detailJob} transparent animationType="slide" onRequestClose={() => setDetailJob(null)}>
        <View style={styles.backdrop}>
          <View style={styles.detailSheet}>
            <Row>
              <View style={{ flex: 1, gap: 6 }}>
                <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                  <Badge tone={detailJob && detailJob.matchScore >= 75 ? "accent" : "primary"}>{detailJob?.matchScore || 0}% match</Badge>
                  {detailJob?.isIndia ? <Badge tone="accent">India</Badge> : null}
                </Row>
                <Title small>{detailJob?.title}</Title>
                <Body muted>{detailJob?.company} · {detailJob?.location}</Body>
              </View>
              <Pressable onPress={() => setDetailJob(null)} hitSlop={12}><Feather name="x" size={24} color={theme.foreground} /></Pressable>
            </Row>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                <View style={styles.detailMeta}>
                  <MetaItem icon="briefcase" label={detailJob?.type || "Full-time"} />
                  <MetaItem icon="dollar-sign" label={detailJob?.salary || "Not listed"} />
                  <MetaItem icon="globe" label={detailJob?.source || ""} />
                </View>

                {detailJob?.tags && detailJob.tags.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.detailSectionTitle}>Skills & Tags</Text>
                    <View style={styles.tags}>
                      {detailJob.tags.slice(0, 10).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}
                    </View>
                  </View>
                ) : null}

                <View style={{ gap: 8 }}>
                  <Text style={styles.detailSectionTitle}>Why it matches</Text>
                  {detailJob?.matchReasons.map((reason) => (
                    <Row key={reason} style={{ justifyContent: "flex-start", gap: 8 }}>
                      <View style={styles.checkIcon}><Feather name="check" size={12} color={theme.accent} /></View>
                      <Body muted style={{ flex: 1 }}>{reason}</Body>
                    </Row>
                  ))}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Body muted>{detailJob?.description?.slice(0, 1200) || "No description provided."}</Body>
                </View>
              </View>
            </ScrollView>

            <Button
              title={!isPremium && applicationsRemaining <= 0 ? "Monthly limit reached" : "Apply on official site"}
              icon="external-link"
              onPress={() => detailJob && openJob(detailJob)}
              disabled={!isPremium && applicationsRemaining <= 0}
            />
            <Button title="Close" icon="x" variant="ghost" onPress={() => setDetailJob(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={[styles.backdrop, { justifyContent: "center" }]}>
          <Card style={styles.confirmCard}>
            <View style={styles.confirmIcon}><Feather name="check-circle" size={28} color={theme.accent} /></View>
            <Title small>Did you apply?</Title>
            <Body muted>{pendingJob ? `${pendingJob.title} at ${pendingJob.company}` : "Confirm your application."}</Body>
            <Button title="Yes, track this application" icon="check" onPress={markApplied} />
            <Button title="Not yet" icon="x" variant="secondary" onPress={() => { setConfirmVisible(false); setPendingJob(null); }} />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.filterSectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function MetaItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={13} color={theme.primary} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function JobCard({ job, onView }: { job: Job; onView: () => void }) {
  const scoreColor = job.matchScore >= 75 ? theme.accent : job.matchScore >= 50 ? theme.primary : theme.mutedForeground;
  return (
    <Card>
      <Row style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Row style={{ justifyContent: "flex-start", gap: 6, flexWrap: "wrap" }}>
            <Badge tone={job.matchScore >= 75 ? "accent" : "primary"}>{job.matchScore}% match</Badge>
            {job.isIndia ? <Badge tone="muted">India</Badge> : null}
          </Row>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobCompany}>{job.company}</Text>
          <View style={styles.jobMetaRow}>
            <Feather name="map-pin" size={11} color={theme.mutedForeground} />
            <Text style={styles.jobMeta}>{job.location}</Text>
            <Text style={styles.jobMetaDot}>·</Text>
            <Feather name="briefcase" size={11} color={theme.mutedForeground} />
            <Text style={styles.jobMeta}>{job.type}</Text>
          </View>
        </View>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{job.matchScore}</Text>
        </View>
      </Row>

      {job.description ? (
        <Body muted numberOfLines={2}>{job.description.slice(0, 200)}</Body>
      ) : null}

      {job.tags.length > 0 ? (
        <View style={styles.tags}>
          {job.tags.slice(0, 5).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}
        </View>
      ) : null}

      <Button title="View details" icon="chevron-right" variant="secondary" onPress={onView} />
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  filterBtn: { backgroundColor: theme.secondary, borderWidth: 1, borderColor: theme.border, position: "relative" },
  filterBadge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  filterBadgeText: { color: "#000", fontSize: 10, fontFamily: "Inter_700Bold" },
  creditsBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.secondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.border },
  creditsText: { color: theme.foreground, fontFamily: "Inter_500Medium", fontSize: 13 },
  indiaTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  indiaTagText: { color: theme.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  indiaTagLink: { color: theme.primary, fontSize: 12, fontFamily: "Inter_700Bold" },
  loadingContainer: { alignItems: "center", gap: 12, paddingVertical: 32 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  filterSheet: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 20, borderWidth: 1, borderColor: theme.border },
  filterSectionLabel: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.secondary, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: "rgba(108,99,255,0.18)", borderColor: theme.primary },
  chipText: { color: theme.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  chipTextActive: { color: theme.primary },
  toggleRow: { flexDirection: "row", alignItems: "center", backgroundColor: theme.secondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 12, borderWidth: 1, borderColor: theme.border },
  toggleLabel: { color: theme.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  toggleSub: { color: theme.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: theme.border, justifyContent: "center", paddingHorizontal: 2 },
  toggleOn: { backgroundColor: theme.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.foreground, alignSelf: "flex-start" },
  toggleThumbOn: { alignSelf: "flex-end", backgroundColor: theme.primaryForeground },
  detailSheet: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 16, borderWidth: 1, borderColor: theme.border, maxHeight: "88%" },
  detailSectionTitle: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 14 },
  detailMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  metaText: { color: theme.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(67,233,123,0.14)", alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  confirmCard: { marginHorizontal: 20, alignItems: "center", gap: 12 },
  confirmIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(67,233,123,0.14)", alignItems: "center", justifyContent: "center" },
  jobTitle: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 21 },
  jobCompany: { color: theme.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 },
  jobMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  jobMeta: { color: theme.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 },
  jobMetaDot: { color: theme.border, fontSize: 12 },
  scoreCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  scoreText: { fontFamily: "Inter_700Bold", fontSize: 17 },
});
