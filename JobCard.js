import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, Linking, Alert, StyleSheet,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { Card, Badge, SkillPill, ScoreRing, Btn, TagRow, Divider } from './index';
import { WORK_TYPES } from '../utils/constants';

const workLabel = (wt) => WORK_TYPES.find(w => w.val === wt)?.label?.replace(/^[^ ]+ /, '') || wt || '';
const workBadge = (wt) => ({ remote: 'green', hybrid: 'blue', contract: 'amber', internship: 'violet', parttime: 'grey', onsite: 'grey' }[wt] || 'grey');

// ── Job Card ──────────────────────────────────────────────────────────────
export const JobCard = ({ job, matchData, resumeData, onDetail, saved, onSave, onUploadResume }) => {
  const hasResume = !!resumeData;
  const score = matchData?.score ?? null;

  const handleApply = () => {
    if (job.url && job.url !== '#') {
      Alert.alert(
        'Applying via Official Site',
        `You are about to visit ${job.company}'s official job posting.\n\nCareer Navigator AI is not affiliated with ${job.company}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Job Posting', onPress: () => Linking.openURL(job.url) },
        ]
      );
    } else {
      Alert.alert('URL Not Available', `Please search for "${job.title}" at ${job.company} on their website.`);
    }
  };

  return (
    <Card style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            {job.workType && (
              <Badge label={workLabel(job.workType)} variant={workBadge(job.workType)} />
            )}
          </View>
          <Text style={styles.jobCompany}>{job.company}</Text>
          <Text style={styles.jobLocation}>📍 {job.location}</Text>
          {job.postedDate && <Text style={styles.jobDate}>📅 {job.postedDate}</Text>}
        </View>
        {hasResume && score !== null ? (
          <ScoreRing score={score} size={62} />
        ) : hasResume ? (
          <View style={styles.scorePlaceholder}>
            <Text style={{ fontSize: 10, color: Colors.muted, textAlign: 'center' }}>{'AI\nAnalyzing'}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.scorePlaceholder} onPress={onUploadResume}>
            <Text style={{ fontSize: 10, color: Colors.accent2, textAlign: 'center' }}>{'AI\nScore'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badges */}
      <View style={styles.badgesRow}>
        {job.industry && <Badge label={job.industry.split('/')[0].trim()} variant="blue" style={styles.badgeMr} />}
        {job.experience && <Badge label={job.experience} variant="violet" style={styles.badgeMr} />}
        {job.salary ? <Badge label={job.salary} variant="amber" /> : <Badge label="Salary not listed" variant="grey" />}
      </View>

      {/* Skills section */}
      <View style={styles.skillsSection}>
        <Text style={styles.skillsLabel}>SKILLS MATCH</Text>
        {!hasResume ? (
          <View style={styles.uploadPrompt}>
            <Text style={styles.uploadPromptText}>Upload resume to see skill compatibility</Text>
            <TouchableOpacity onPress={onUploadResume} style={styles.uploadPromptBtn}>
              <Text style={{ fontSize: 11, color: Colors.accent2, fontWeight: '600' }}>Upload Resume</Text>
            </TouchableOpacity>
          </View>
        ) : matchData ? (
          <TagRow>
            {(matchData.matchedSkills || []).map(s => <SkillPill key={s} label={s} type="ok" />)}
            {(matchData.missingSkills || []).slice(0, 3).map(s => <SkillPill key={s} label={s} type="no" />)}
          </TagRow>
        ) : (
          <Text style={{ fontSize: 12, color: Colors.muted }}>Analyzing match with your resume…</Text>
        )}
      </View>

      {/* Why Fit */}
      {hasResume && matchData?.whyFit && (
        <Text style={styles.whyFit}>
          <Text style={{ color: Colors.accent2, fontWeight: '600' }}>Why this fits: </Text>
          {matchData.whyFit}
        </Text>
      )}

      {job.description && (
        <Text style={styles.description} numberOfLines={2}>{job.description}</Text>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Btn label="Apply Now ↗" onPress={handleApply} small style={{ flex: 1 }} />
        <Btn label="Details" onPress={() => onDetail(job, matchData)} variant="ghost" small style={{ flex: 1 }} />
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(job)}>
          <Text style={{ fontSize: 18, color: saved ? Colors.warn : Colors.muted }}>{saved ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

// ── Job Detail Modal ──────────────────────────────────────────────────────
export const JobDetailModal = ({ job, matchData, resumeData, visible, onClose, onSave, saved }) => {
  if (!job) return null;
  const wLabel = workLabel(job.workType);

  const handleApply = () => {
    if (job.url && job.url !== '#') {
      Linking.openURL(job.url);
    } else {
      Alert.alert('Visit Company Site', `Please visit ${job.companyUrl || job.company + '.com'} to apply.`);
    }
  };

  const handleCompanySite = () => {
    if (job.companyUrl) Linking.openURL(job.companyUrl);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        {/* Modal Header */}
        <View style={modalStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.title}>{job.title}</Text>
            <Text style={modalStyles.sub}>{job.company} · {job.location}</Text>
            {job.postedDate && <Text style={modalStyles.date}>Posted: {job.postedDate}</Text>}
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            {resumeData && matchData && <ScoreRing score={matchData.score} size={56} />}
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={{ color: Colors.text, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={modalStyles.scroll} showsVerticalScrollIndicator={false}>
          {/* Meta grid */}
          <View style={modalStyles.metaGrid}>
            {[
              ['💰 Salary', job.salary || 'Not listed', 'amber'],
              ['🏢 Size', job.companySize || 'N/A', 'blue'],
              ['🌐 Type', wLabel || 'N/A', 'violet'],
              ['🏭 Industry', (job.industry || 'N/A').split('/')[0].trim(), 'grey'],
            ].map(([label, val, variant]) => (
              <View key={label} style={modalStyles.metaItem}>
                <Text style={modalStyles.metaLabel}>{label}</Text>
                <Badge label={val} variant={variant} />
              </View>
            ))}
          </View>

          <Divider />

          {job.companyBio && (
            <>
              <Text style={modalStyles.sectionTitle}>Company Overview</Text>
              <Text style={modalStyles.bodyText}>{job.companyBio}</Text>
              {job.companyGrowth && <Text style={[modalStyles.bodyText, { color: Colors.ok, marginTop: 6 }]}>📈 {job.companyGrowth}</Text>}
              <Divider />
            </>
          )}

          {job.description && (
            <>
              <Text style={modalStyles.sectionTitle}>Role Description</Text>
              <Text style={modalStyles.bodyText}>{job.description}</Text>
              <Divider />
            </>
          )}

          {(job.requirements || []).length > 0 && (
            <>
              <Text style={modalStyles.sectionTitle}>Requirements</Text>
              {job.requirements.map((r, i) => (
                <View key={i} style={modalStyles.bulletRow}>
                  <Text style={{ color: Colors.accent2, marginRight: 8 }}>•</Text>
                  <Text style={[modalStyles.bodyText, { flex: 1 }]}>{r}</Text>
                </View>
              ))}
              <Divider />
            </>
          )}

          {resumeData && matchData ? (
            <>
              <Text style={modalStyles.sectionTitle}>Why This Fits You</Text>
              <Text style={[modalStyles.bodyText, { color: Colors.accent2 }]}>{matchData.whyFit}</Text>
              <Divider />

              <Text style={modalStyles.sectionTitle}>Skill Gap Analysis</Text>
              <TagRow>
                {(matchData.matchedSkills || []).map(s => <SkillPill key={s} label={`✓ ${s}`} type="ok" />)}
                {(matchData.missingSkills || []).map(s => <SkillPill key={s} label={`✗ ${s}`} type="no" />)}
              </TagRow>

              {(matchData.skillGaps || []).length > 0 && (
                <>
                  <Text style={[modalStyles.sectionTitle, { marginTop: 16 }]}>How to Close the Gaps</Text>
                  {matchData.skillGaps.map((g, i) => (
                    <View key={i} style={modalStyles.gapItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <SkillPill label={g.skill} type="no" />
                        <Badge label={g.importance} variant={g.importance === 'high' ? 'red' : g.importance === 'medium' ? 'amber' : 'grey'} />
                      </View>
                      <Text style={{ fontSize: 12, color: Colors.muted }}>📚 {g.learnPath}</Text>
                    </View>
                  ))}
                </>
              )}

              {(matchData.pros || []).length > 0 && (
                <>
                  <Divider />
                  <Text style={modalStyles.sectionTitle}>Pros of Joining</Text>
                  {matchData.pros.map((p, i) => (
                    <View key={i} style={modalStyles.bulletRow}>
                      <Text style={{ color: Colors.ok, marginRight: 8 }}>✓</Text>
                      <Text style={[modalStyles.bodyText, { flex: 1 }]}>{p}</Text>
                    </View>
                  ))}
                </>
              )}

              {(matchData.resumeSuggestions || []).length > 0 && (
                <>
                  <Divider />
                  <Text style={modalStyles.sectionTitle}>Resume Tips for This Job</Text>
                  {matchData.resumeSuggestions.map((s, i) => (
                    <View key={i} style={modalStyles.bulletRow}>
                      <Text style={{ color: Colors.warn, marginRight: 8 }}>→</Text>
                      <Text style={[modalStyles.bodyText, { flex: 1, color: Colors.muted }]}>{s}</Text>
                    </View>
                  ))}
                </>
              )}

              {matchData.salaryInsight && (
                <>
                  <Divider />
                  <Text style={modalStyles.sectionTitle}>Salary Insight</Text>
                  <Text style={modalStyles.bodyText}>{matchData.salaryInsight}</Text>
                </>
              )}
            </>
          ) : (
            <View style={modalStyles.noResumeBox}>
              <Text style={{ fontSize: 13, color: Colors.accent2, textAlign: 'center' }}>
                🎯 Upload your resume to see match score, skill gaps & personalized insights
              </Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={modalStyles.disclaimer}>
            <Text style={modalStyles.disclaimerText}>
              ⚠ Career Navigator AI is not affiliated with {job.company}. Tapping Apply Now opens their official job posting.
            </Text>
          </View>

          {/* Buttons */}
          <View style={modalStyles.btnRow}>
            <Btn label="Apply Now ↗" onPress={handleApply} style={{ flex: 1 }} />
            {job.companyUrl && (
              <Btn label="Company Site" onPress={handleCompanySite} variant="ghost" style={{ flex: 1 }} />
            )}
            <TouchableOpacity style={modalStyles.starBtn} onPress={() => onSave(job)}>
              <Text style={{ fontSize: 22, color: saved ? Colors.warn : Colors.muted }}>{saved ? '★' : '☆'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: { padding: 18, marginBottom: 14 },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  jobTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  jobCompany: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  jobLocation: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  jobDate: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  badgeMr: { marginRight: 2 },
  scorePlaceholder: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  skillsSection: { marginBottom: 12 },
  skillsLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 },
  uploadPrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, backgroundColor: 'rgba(108,99,255,0.07)',
    borderRadius: Radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(108,99,255,0.3)',
  },
  uploadPromptText: { fontSize: 12, color: Colors.muted, flex: 1 },
  uploadPromptBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.accent,
    borderRadius: Radius.sm,
  },
  whyFit: { fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 10 },
  description: { fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  saveBtn: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: Spacing.xl, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sub: { fontSize: 14, color: Colors.muted },
  date: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1, padding: Spacing.xl },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  metaItem: {
    flex: 1, minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 12,
  },
  metaLabel: { fontSize: 11, color: Colors.muted, marginBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  bodyText: { fontSize: 13, color: Colors.text, lineHeight: 20, opacity: 0.85 },
  bulletRow: { flexDirection: 'row', marginBottom: 7 },
  gapItem: { padding: 12, backgroundColor: 'rgba(248,113,113,0.06)', borderRadius: Radius.sm, borderWidth: 1, borderColor: 'rgba(248,113,113,0.15)', marginBottom: 8 },
  noResumeBox: {
    padding: 20, backgroundColor: 'rgba(108,99,255,0.07)',
    borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(108,99,255,0.3)',
    marginVertical: 16, alignItems: 'center',
  },
  disclaimer: {
    padding: 12, marginTop: 20,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', borderRadius: Radius.md,
  },
  disclaimerText: { fontSize: 12, color: Colors.err, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
  starBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
