import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Platform, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius } from '../theme';
import { Card, Badge, Btn, EmptyState, LoadingCard } from '../components';
import { JobCard, JobDetailModal } from '../components/JobCard';
import { WORK_TYPES, INDUSTRIES, EXPERIENCE_LEVELS } from '../utils/constants';
import { searchJobs, analyzeMatch } from '../api/claude';

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.filterChip,
      active && styles.filterChipActive,
    ]}
    activeOpacity={0.7}
  >
    <Text style={{ fontSize: 12, color: active ? Colors.accent2 : Colors.muted, fontWeight: active ? '600' : '400' }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const PickerSheet = ({ label, options, value, onChange, visible, onDismiss }) => {
  if (!visible) return null;
  return (
    <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onDismiss}>
      <TouchableOpacity style={styles.sheet} activeOpacity={1}>
        <Text style={styles.sheetTitle}>{label}</Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetItem, opt.value === value && styles.sheetItemActive]}
              onPress={() => { onChange(opt.value); onDismiss(); }}
            >
              <Text style={{ fontSize: 14, color: opt.value === value ? Colors.accent2 : Colors.text }}>
                {opt.label}
              </Text>
              {opt.value === value && <Text style={{ color: Colors.accent2 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function MatchesScreen({ profile, resumeData, savedJobs, onSave, onResumeNeeded }) {
  const [jobs, setJobs] = useState([]);
  const [matchCache, setMatchCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ workType: '', industry: '', experience: '', location: '', minMatch: 0 });
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null); // 'workType' | 'industry' | 'experience'
  const searchTimer = useRef(null);

  const isSaved = (id) => savedJobs.some(j => j.id === id);

  const loadJobs = useCallback(async (extraFilters = {}) => {
    setLoading(true);
    setLoadMsg('Searching real job listings…');
    setJobs([]);
    setMatchCache({});
    try {
      const f = { ...filters, ...extraFilters };
      if (search.trim()) f.searchQuery = search.trim();
      const found = await searchJobs(profile, resumeData, f);
      setJobs(found);
      setLoadMsg(found.length > 0 ? `Found ${found.length} jobs${resumeData ? '. Analyzing matches…' : ''}` : 'No jobs found.');
      if (resumeData && found.length > 0) {
        found.forEach(async (job) => {
          try {
            const m = await analyzeMatch(job, resumeData);
            if (m) setMatchCache(c => ({ ...c, [job.id]: m }));
          } catch (e) { }
        });
      }
    } catch (e) {
      setLoadMsg('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, resumeData, filters, search]);

  useEffect(() => { loadJobs(); }, []);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadJobs({ searchQuery: text }), 900);
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const filtered = jobs.filter(j => {
    if (filters.workType && j.workType !== filters.workType) return false;
    if (filters.industry && !j.industry?.toLowerCase().includes(filters.industry.toLowerCase().split('/')[0].trim().toLowerCase())) return false;
    if (filters.experience && j.experience && !j.experience.toLowerCase().includes(filters.experience.toLowerCase())) return false;
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      const jloc = (j.location || '').toLowerCase();
      const isRemote = j.workType === 'remote' || j.workType === 'hybrid';
      if (!jloc.includes(loc) && !(isRemote && (loc.includes('remote') || loc.includes('anywhere')))) return false;
    }
    if (filters.minMatch > 0) {
      const score = matchCache[j.id]?.score ?? null;
      if (score !== null && score < filters.minMatch) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
    }
    return true;
  });

  const hasFilters = filters.workType || filters.industry || filters.experience || filters.location || filters.minMatch > 0;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Text style={{ color: Colors.muted, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Search jobs, companies, locations…"
            placeholderTextColor={Colors.muted}
            style={{ flex: 1, color: Colors.text, fontSize: 14 }}
            returnKeyType="search"
            onSubmitEditing={() => loadJobs()}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadJobs(); }}>
              <Text style={{ color: Colors.muted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadJobs()} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Quick filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 8 }}>
        <FilterChip label={filters.workType ? WORK_TYPES.find(w => w.value === filters.workType)?.label?.replace(/^.{2}/, '') : '🌐 Work Type'} active={!!filters.workType} onPress={() => setActiveSheet('workType')} />
        <FilterChip label={filters.industry ? filters.industry.split('/')[0].trim() : '🏭 Industry'} active={!!filters.industry} onPress={() => setActiveSheet('industry')} />
        <FilterChip label={filters.experience ? filters.experience : '👤 Level'} active={!!filters.experience} onPress={() => setActiveSheet('experience')} />
        {hasFilters && (
          <TouchableOpacity onPress={() => setFilters({ workType: '', industry: '', experience: '', location: '', minMatch: 0 })}
            style={[styles.filterChip, { borderColor: Colors.err }]}>
            <Text style={{ fontSize: 12, color: Colors.err }}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Min match slider (only when resume uploaded) */}
      {resumeData && (
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Min Match: {filters.minMatch}%</Text>
          <View style={styles.sliderBtns}>
            {[0, 50, 70, 80, 90].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setFilter('minMatch', v)}
                style={[styles.sliderBtn, filters.minMatch === v && styles.sliderBtnActive]}
              >
                <Text style={{ fontSize: 11, color: filters.minMatch === v ? Colors.accent2 : Colors.muted, fontWeight: filters.minMatch === v ? '600' : '400' }}>
                  {v === 0 ? 'All' : `${v}%+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Result count */}
      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          {loading ? loadMsg : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}${profile.role ? ` for ${profile.role}` : ''}`}
        </Text>
        {loading && <ActivityIndicator size="small" color={Colors.accent} />}
      </View>

      {/* Resume banner */}
      {!resumeData && (
        <TouchableOpacity style={styles.resumeBanner} onPress={onResumeNeeded} activeOpacity={0.85}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeBannerTitle}>🎯 Upload resume for AI match scores</Text>
            <Text style={styles.resumeBannerSub}>See how well you match each job</Text>
          </View>
          <Text style={{ color: Colors.accent2, fontSize: 12, fontWeight: '600' }}>Upload →</Text>
        </TouchableOpacity>
      )}

      {/* Jobs list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJobs().finally(() => setRefreshing(false)); }} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && jobs.length === 0 && (
          <LoadingCard message={loadMsg} />
        )}
        {!loading && jobs.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No jobs found"
            subtitle="Try adjusting your role, location, or filters"
            action={() => loadJobs()}
            actionLabel="Search Again"
          />
        )}
        {!loading && jobs.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🎯"
            title="No matches with current filters"
            subtitle={filters.minMatch > 0
              ? `No jobs have a score ≥ ${filters.minMatch}% yet. Lower the slider or wait for AI analysis.`
              : 'Try adjusting your filter settings'}
            action={() => setFilters({ workType: '', industry: '', experience: '', location: '', minMatch: 0 })}
            actionLabel="Clear Filters"
          />
        )}
        {filtered.map(job => (
          <JobCard
            key={job.id}
            job={job}
            matchData={matchCache[job.id]}
            resumeData={resumeData}
            onDetail={(j, m) => { setSelectedJob(j); setSelectedMatch(m || null); setModalVisible(true); }}
            saved={isSaved(job.id)}
            onSave={onSave}
            onUploadResume={onResumeNeeded}
          />
        ))}
      </ScrollView>

      {/* Picker Sheets */}
      <PickerSheet label="Work Type" options={WORK_TYPES} value={filters.workType}
        onChange={v => setFilter('workType', v)} visible={activeSheet === 'workType'} onDismiss={() => setActiveSheet(null)} />
      <PickerSheet label="Industry" options={INDUSTRIES} value={filters.industry}
        onChange={v => setFilter('industry', v)} visible={activeSheet === 'industry'} onDismiss={() => setActiveSheet(null)} />
      <PickerSheet label="Experience Level" options={EXPERIENCE_LEVELS} value={filters.experience}
        onChange={v => setFilter('experience', v)} visible={activeSheet === 'experience'} onDismiss={() => setActiveSheet(null)} />

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        matchData={selectedMatch}
        resumeData={resumeData}
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedJob(null); setSelectedMatch(null); }}
        onSave={onSave}
        saved={selectedJob ? isSaved(selectedJob.id) : false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 10 },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  refreshBtn: {
    width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: { flexGrow: 0, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { borderColor: Colors.accent, backgroundColor: 'rgba(108,99,255,0.15)' },
  sliderRow: {
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  sliderLabel: { fontSize: 12, color: Colors.muted, width: 100 },
  sliderBtns: { flexDirection: 'row', gap: 6, flex: 1 },
  sliderBtn: {
    flex: 1, paddingVertical: 6, alignItems: 'center',
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sliderBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(108,99,255,0.15)' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  resultText: { fontSize: 12, color: Colors.muted },
  resumeBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: 8,
    padding: 12, borderRadius: Radius.md,
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
  },
  resumeBannerTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  resumeBannerSub: { fontSize: 12, color: Colors.muted },
  list: { flex: 1 },
  sheetOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', zIndex: 100,
  },
  sheet: {
    backgroundColor: Colors.surface2,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.xl, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  sheetItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetItemActive: { backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: Radius.sm, paddingHorizontal: 8 },
});
