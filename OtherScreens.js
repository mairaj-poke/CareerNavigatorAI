import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth, db } from "../../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, Radius, Typography } from '../theme';
import {
  Card, Badge, SkillPill, Btn, EmptyState, NoResumePrompt,
  BackButton, Divider, TagRow, ProgressBar, Input, SectionHeader,
} from '../components';
import { JobCard, JobDetailModal } from '../components/JobCard';
import { analyzeResume, analyzeMatch } from '../api/claude';

// ── Saved Jobs Screen ─────────────────────────────────────────────────────
export function SavedJobsScreen({ savedJobs, matchCache, resumeData, onUnsave, onResumeNeeded, navigation }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <SectionHeader
          title="Saved Jobs"
          subtitle={`${savedJobs.length} saved job${savedJobs.length !== 1 ? 's' : ''}`}
          right={savedJobs.length > 0 && <Badge label={String(savedJobs.length)} variant="violet" />}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {savedJobs.length === 0 ? (
          <EmptyState
            icon="◈"
            title="No saved jobs yet"
            subtitle="Tap ☆ on any job card to save it here. Saved jobs stay even after you refresh."
          />
        ) : (
          savedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              matchData={matchCache[job.id]}
              resumeData={resumeData}
              onDetail={(j, m) => { setSelectedJob(j); setSelectedMatch(m || null); setModalVisible(true); }}
              saved={true}
              onSave={() => onUnsave(job.id)}
              onUploadResume={onResumeNeeded}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <JobDetailModal
        job={selectedJob} matchData={selectedMatch} resumeData={resumeData}
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedJob(null); setSelectedMatch(null); }}
        onSave={(job) => onUnsave(job.id)}
        saved={true}
      />
    </View>
  );
}

// ── Resume Insights Screen ────────────────────────────────────────────────
export function ResumeInsightsScreen({ resumeData, onUploadResume }) {
  const scores = [
    { label: 'ATS Score', val: '87/100', color: Colors.ok, note: 'Strong keyword density' },
    { label: 'Readability', val: '91/100', color: Colors.ok, note: 'Clear formatting' },
    { label: 'Keyword Match', val: '74/100', color: Colors.warn, note: 'Add more industry terms' },
    { label: 'Impact Score', val: '68/100', color: Colors.warn, note: 'Strengthen metrics' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <SectionHeader title="Resume Insights" subtitle="AI-powered resume analysis" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!resumeData ? (
          <NoResumePrompt onUpload={onUploadResume} />
        ) : (
          <>
            {/* Score cards */}
            <View style={styles.scoreGrid}>
              {scores.map(s => (
                <Card key={s.label} style={styles.scoreCard}>
                  <Text style={styles.smallLabel}>{s.label}</Text>
                  <Text style={[styles.scoreVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.scoreNote}>{s.note}</Text>
                </Card>
              ))}
            </View>

            {/* Profile card */}
            <Card style={styles.section}>
              <Text style={styles.secTitle}>{resumeData.name || 'Your Profile'}</Text>
              {resumeData.currentRole && (
                <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 4 }}>
                  {resumeData.currentRole} · {resumeData.yearsExperience || 0} years experience
                </Text>
              )}
              {resumeData.education && (
                <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: 10 }}>🎓 {resumeData.education}</Text>
              )}
              {resumeData.summary && (
                <Text style={{ fontSize: 13, lineHeight: 20, opacity: 0.85, marginBottom: 14 }}>{resumeData.summary}</Text>
              )}

              {(resumeData.skills || []).length > 0 && (
                <>
                  <Text style={styles.smallLabel}>Skills ({resumeData.skills.length})</Text>
                  <TagRow>
                    {resumeData.skills.map(s => <SkillPill key={s} label={s} type="ok" />)}
                  </TagRow>
                </>
              )}

              {(resumeData.tools || []).length > 0 && (
                <>
                  <Text style={[styles.smallLabel, { marginTop: 14 }]}>Tools & Technologies ({resumeData.tools.length})</Text>
                  <TagRow>
                    {resumeData.tools.map(t => <SkillPill key={t} label={t} type="grey" />)}
                  </TagRow>
                </>
              )}

              {(resumeData.certifications || []).length > 0 && (
                <>
                  <Text style={[styles.smallLabel, { marginTop: 14 }]}>Certifications</Text>
                  <TagRow>
                    {resumeData.certifications.map(c => <SkillPill key={c} label={c} type="grey" />)}
                  </TagRow>
                </>
              )}

              {(resumeData.languages || []).length > 0 && (
                <>
                  <Text style={[styles.smallLabel, { marginTop: 14 }]}>Languages</Text>
                  <TagRow>
                    {resumeData.languages.map(l => <SkillPill key={l} label={l} type="grey" />)}
                  </TagRow>
                </>
              )}
            </Card>

            {/* Job history */}
            {(resumeData.jobHistory || []).length > 0 && (
              <Card style={styles.section}>
                <Text style={styles.secTitle}>Work History</Text>
                {resumeData.jobHistory.map((j, i) => (
                  <View key={i} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }}>{j.title}</Text>
                    <Text style={{ fontSize: 13, color: Colors.muted }}>{j.company} · {j.duration}</Text>
                    {i < resumeData.jobHistory.length - 1 && <Divider style={{ marginTop: 12, marginBottom: 0 }} />}
                  </View>
                ))}
              </Card>
            )}

            {/* Improvement tips */}
            <Card style={styles.section}>
              <Text style={styles.secTitle}>AI Improvement Suggestions</Text>
              {[
                "Add quantifiable achievements (e.g., 'improved load time by 40%')",
                'Include more industry-specific keywords for better ATS scores',
                'List certifications in a dedicated section',
                'Strengthen your summary with target role-specific keywords',
                'Add links to portfolio, GitHub, or relevant projects',
              ].map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <Text style={{ color: Colors.accent2, marginRight: 8 }}>→</Text>
                  <Text style={{ fontSize: 13, color: Colors.muted, flex: 1, lineHeight: 20 }}>{tip}</Text>
                </View>
              ))}
            </Card>
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Skill Gap Screen ──────────────────────────────────────────────────────
export function SkillGapScreen({ resumeData, matchCache, jobs, onUploadResume }) {
  const allGaps = {};
  jobs.forEach(j => {
    const m = matchCache[j.id];
    if (m?.skillGaps) m.skillGaps.forEach(g => {
      if (!allGaps[g.skill]) allGaps[g.skill] = { ...g, count: 0, jobs: [] };
      allGaps[g.skill].count++;
      allGaps[g.skill].jobs.push(j.title);
    });
  });
  const gaps = Object.values(allGaps).sort((a, b) => {
    const ord = { high: 3, medium: 2, low: 1 };
    return (ord[b.importance] || 0) - (ord[a.importance] || 0) || b.count - a.count;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <SectionHeader title="Skill Gap Report" subtitle="Skills to learn to increase your match scores" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!resumeData ? (
          <NoResumePrompt onUpload={onUploadResume} />
        ) : gaps.length === 0 ? (
          <EmptyState icon="🎉" title="No skill gaps found!" subtitle="You match well with your target roles. Keep exploring more jobs to refine your report." />
        ) : (
          <>
            {gaps.map((g, i) => (
              <Card key={g.skill} style={styles.gapCard}>
                <View style={styles.gapTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                    <SkillPill label={g.skill} type="no" />
                    <Badge label={`Missing in ${g.count} job${g.count > 1 ? 's' : ''}`} variant="grey" />
                  </View>
                  <Badge
                    label={g.importance}
                    variant={g.importance === 'high' ? 'red' : g.importance === 'medium' ? 'amber' : 'grey'}
                  />
                </View>
                <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: 10 }}>
                  Required by: {g.jobs.slice(0, 3).join(', ')}{g.jobs.length > 3 ? ` +${g.jobs.length - 3} more` : ''}
                </Text>
                <View style={styles.learnPath}>
                  <Text style={{ fontSize: 13, color: Colors.text, lineHeight: 20 }}>📚 {g.learnPath}</Text>
                </View>
              </Card>
            ))}

            {/* Pro upsell */}
            <Card style={[styles.section, { borderColor: 'rgba(108,99,255,0.35)' }]}>
              <Text style={styles.secTitle}>🔒 Personalized 12-Week Learning Plan</Text>
              <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 16, lineHeight: 20 }}>
                AI-generated roadmap to close all skill gaps with curated resources and weekly milestones.
              </Text>
              <Btn label="Upgrade to Pro" variant="outline" />
            </Card>
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Analytics Screen ──────────────────────────────────────────────────────
export function AnalyticsScreen({ jobs, matchCache, savedCount }) {
  const scores = Object.values(matchCache).map(m => m.score).filter(Boolean);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const industryMap = {};
  jobs.forEach(j => {
    const m = matchCache[j.id];
    if (m?.score && j.industry) {
      const key = j.industry.split('/')[0].trim();
      if (!industryMap[key]) industryMap[key] = [];
      industryMap[key].push(m.score);
    }
  });
  const industries = Object.entries(industryMap)
    .map(([k, v]) => ({ label: k, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 6);

  const trend = [72, 75, 79, 77, 82, avg || 85];
  const maxT = Math.max(...trend, 1);

  const statCards = [
    { label: 'Avg Match Score', val: avg ? `${avg}%` : '–', color: Colors.ok },
    { label: 'Jobs Analyzed', val: String(jobs.length), color: Colors.accent2 },
    { label: 'Saved Jobs', val: String(savedCount), color: Colors.warn },
    { label: 'Top Industry', val: industries[0]?.label || '–', color: Colors.accent3, small: true },
  ];

  const tracker = [
    { label: 'Saved', n: savedCount, color: Colors.accent2 },
    { label: 'Applied', n: 0, color: Colors.accent3 },
    { label: 'Interview', n: 0, color: Colors.warn },
    { label: 'Offer', n: 0, color: Colors.ok },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <SectionHeader title="Analytics" subtitle="Your job search insights" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          {statCards.map(s => (
            <Card key={s.label} style={styles.statCard}>
              <Text style={styles.smallLabel}>{s.label}</Text>
              <Text style={[styles.statVal, { color: s.color, fontSize: s.small ? 18 : 26 }]}>{s.val}</Text>
            </Card>
          ))}
        </View>

        {/* Industry bars */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>Industry Match Scores</Text>
          {industries.length > 0 ? industries.map(({ label, avg: a }) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, color: Colors.text }}>{label}</Text>
                <Text style={{ fontSize: 12, color: a >= 88 ? Colors.ok : a >= 72 ? Colors.warn : Colors.err, fontWeight: '600' }}>{a}%</Text>
              </View>
              <ProgressBar value={a} color={a >= 88 ? Colors.ok : a >= 72 ? Colors.warn : Colors.err} />
            </View>
          )) : (
            <Text style={{ fontSize: 13, color: Colors.muted }}>Upload resume and search jobs to see industry scores</Text>
          )}
        </Card>

        {/* Trend chart */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>Match Score Trend</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 8 }}>
            {trend.map((v, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: '100%', backgroundColor: Colors.accent,
                  height: (v / maxT) * 64, borderRadius: 4,
                  opacity: i === trend.length - 1 ? 1 : 0.6 + i * 0.06,
                }} />
                <Text style={{ fontSize: 10, color: Colors.muted }}>W{i + 1}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Application tracker */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>Application Tracker</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {tracker.map(t => (
              <View key={t.label} style={styles.trackerItem}>
                <Text style={[styles.trackerNum, { color: t.color }]}>{t.n}</Text>
                <Text style={styles.trackerLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Settings Screen ───────────────────────────────────────────────────────
export function SettingsScreen({ user, resumeData, onResumeUpdate, onLogout }) {
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(!!resumeData);
  const [fileName, setFileName] = useState('');

 const pickResume = async () => {
  try {

    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    setFileName(file.name);
    setUploading(true);

    // ── Upload file to Firebase Storage ──
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const uid = auth.currentUser.uid;

    const storageRef = ref(storage, `resumes/${uid}-${Date.now()}`);

    await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(storageRef);

    // Save resume URL to Firestore
    await updateDoc(doc(db, "users", uid), {
      resumeURL: downloadURL,
      resumeFileName: file.name,
      updatedAt: new Date()
    });

    // ── Extract text for AI analysis ──
    let text = "";

    try {
      text = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8
      });
    } catch {
      const b64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      text = atob ? atob(b64) : "";
      text = text.replace(/[^\x20-\x7E\n\r]/g, " ");
    }

    if (text.trim().length < 20) {
      text = `Resume for ${file.name}. Professional seeking opportunities.`;
    }

    // ── AI Resume Analysis ──
    const parsed = await analyzeResume(text);

    onResumeUpdate(parsed, text);

    setUploadDone(true);

    Alert.alert("Success", "Resume uploaded and analyzed successfully!");

  } catch (error) {

    console.log("Resume upload error:", error);

    Alert.alert("Upload Failed", "Could not upload or analyze resume.");

  } finally {
    setUploading(false);
  }
};

  return (
    <View style={styles.screen}>
      <View style={styles.pageHeader}>
        <SectionHeader title="Settings" subtitle="Manage your profile and preferences" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>Your Profile</Text>
          <Input label="Full Name" value={user.name || ''} onChangeText={() => {}} placeholder="Alex Johnson" />
          <Input label="Email" value={user.email || ''} onChangeText={() => {}} placeholder="alex@email.com" keyboardType="email-address" />
          <Input label="Location" value={user.location || ''} onChangeText={() => {}} placeholder="San Francisco, CA" />
          <Input label="Target Role" value={user.role || ''} onChangeText={() => {}} placeholder="Senior Frontend Engineer" />
          <Btn label="Save Changes" />
        </Card>

        {/* Resume */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>Resume</Text>
          <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 14, lineHeight: 20 }}>
            {resumeData
              ? 'Your resume has been analyzed. Upload a new one to update your profile.'
              : 'Upload your resume to unlock AI-powered job matching and skill analysis.'}
          </Text>

          {uploadDone && resumeData ? (
            <View style={styles.resumeLoaded}>
              <Text style={{ fontSize: 20, marginRight: 10 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ok }}>Resume analyzed</Text>
                {fileName && <Text style={{ fontSize: 12, color: Colors.muted }}>{fileName}</Text>}
              </View>
              <TouchableOpacity onPress={pickResume} style={styles.replaceBtn}>
                <Text style={{ fontSize: 12, color: Colors.accent2 }}>Replace</Text>
              </TouchableOpacity>
            </View>
          ) : uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={{ fontSize: 13, color: Colors.accent2, marginLeft: 10 }}>Analyzing resume with AI…</Text>
            </View>
          ) : (
            <Btn label="📄 Upload Resume" onPress={pickResume} />
          )}

          {resumeData && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.smallLabel}>Detected Skills</Text>
              <TagRow>
                {(resumeData.skills || []).slice(0, 12).map(s => <SkillPill key={s} label={s} type="ok" />)}
                {(resumeData.skills || []).length > 12 && <SkillPill label={`+${resumeData.skills.length - 12} more`} type="grey" />}
              </TagRow>
            </View>
          )}
        </Card>

        {/* Pro upsell */}
        <Card style={[styles.section, { borderColor: 'rgba(108,99,255,0.35)' }]}>
          <Text style={styles.secTitle}>Career Navigator Pro ✨</Text>
          <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 16, lineHeight: 20 }}>
            Unlimited AI matches · Resume rewrite · 12-week learning plans · Priority support
          </Text>
          <Btn label="Upgrade — $29/month" />
        </Card>

        {/* App info */}
        <Card style={styles.section}>
          <Text style={styles.secTitle}>About</Text>
          <View style={{ gap: 8 }}>
            {[
              ['App Version', '1.0.0'],
              ['AI Engine', 'Claude Sonnet 4'],
              ['Job Sources', 'LinkedIn, Indeed, Greenhouse, Lever'],
              ['Built with', 'Expo + React Native'],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: Colors.muted }}>{k}</Text>
                <Text style={{ fontSize: 13, color: Colors.text }}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Btn label="Log Out" onPress={onLogout} variant="ghost" style={{ marginBottom: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  pageHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  smallLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  section: { padding: Spacing.lg, marginBottom: 14 },
  secTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  scoreCard: { padding: 16, flex: 1, minWidth: '45%' },
  scoreVal: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  scoreNote: { fontSize: 11, color: Colors.muted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { padding: 16, flex: 1, minWidth: '45%' },
  statVal: { fontSize: 26, fontWeight: '700', marginTop: 4 },
  gapCard: { padding: 18, marginBottom: 12 },
  gapTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  learnPath: {
    padding: 10, backgroundColor: 'rgba(108,99,255,0.08)',
    borderRadius: Radius.sm, borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
  },
  trackerItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 12, alignItems: 'center',
  },
  trackerNum: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  trackerLabel: { fontSize: 12, color: Colors.muted },
  resumeLoaded: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  replaceBtn: {
    padding: 6, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.accent,
  },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(108,99,255,0.07)', borderRadius: Radius.md },
});
