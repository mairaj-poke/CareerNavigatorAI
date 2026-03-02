import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { Input, Btn, Card, SkillPill, TagRow } from '../components';
import { INDUSTRIES, WORK_TYPES, YEARS_EXP } from '../utils/constants';
import { analyzeResume } from '../api/claude';

const PickerRow = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.lbl}>{label}</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={{ color: selected?.value ? Colors.text : Colors.muted, fontSize: 14 }}>
          {selected?.label || 'Select...'}
        </Text>
        <Text style={{ color: Colors.muted }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropItem, opt.value === value && styles.dropItemActive]}
                onPress={() => { onChange(opt.value); setOpen(false); }}
              >
                <Text style={{ color: opt.value === value ? Colors.accent2 : Colors.text, fontSize: 13 }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', location: '', experience: '',
    role: '', industry: '', salaryMin: '', salaryMax: '',
  });
  const [resumeState, setResumeState] = useState('idle'); // idle|parsing|done|error
  const [resumeData, setResumeData] = useState(null);
  const [fileName, setFileName] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const step1Valid = form.name.trim() && form.email.trim() && form.role.trim();

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setFileName(file.name);
      setResumeState('parsing');

      let text = '';
      try {
        text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      } catch {
        // Binary file (PDF) - read as base64 then extract printable chars
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        text = Buffer.from ? Buffer.from(b64, 'base64').toString('ascii') : atob(b64);
        // Keep only printable ASCII
        text = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
      }

      if (text.trim().length < 20) {
        text = `Resume for ${file.name}. Professional seeking opportunities in technology.`;
      }

      const parsed = await analyzeResume(text);
      setResumeData(parsed);
      setResumeState('done');

      // Auto-fill form fields from resume
      if (parsed.name && !form.name) set('name', parsed.name);
      if (parsed.email && !form.email) set('email', parsed.email);
      if (parsed.location && !form.location) set('location', parsed.location);
      if (parsed.currentRole && !form.role) set('role', parsed.currentRole);
    } catch (e) {
      console.error('Resume pick error:', e);
      setResumeState('error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>Career Navigator AI</Text>
        <Text style={styles.brandSub}>Powered by Claude · Real Jobs</Text>
        <View style={styles.steps}>
          {[1, 2].map(s => (
            <View key={s} style={[styles.stepBar, s <= step ? styles.stepActive : styles.stepInactive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          {step === 1 ? 'Step 1 — Your Profile' : 'Step 2 — Upload Resume'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View>
            <Input label="Full Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="Alex Johnson" />
            <Input label="Email *" value={form.email} onChangeText={v => set('email', v)} placeholder="alex@email.com" keyboardType="email-address" />
            <Input label="Location" value={form.location} onChangeText={v => set('location', v)} placeholder="San Francisco, CA" />
            <PickerRow label="Years of Experience" options={YEARS_EXP} value={form.experience} onChange={v => set('experience', v)} />
            <Input label="Target Job Role *" value={form.role} onChangeText={v => set('role', v)} placeholder="e.g. Senior Frontend Engineer" />
            <PickerRow label="Preferred Industry" options={INDUSTRIES} value={form.industry} onChange={v => set('industry', v)} />
            <Text style={styles.lbl}>Expected Salary Range (USD/yr)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input value={form.salaryMin} onChangeText={v => set('salaryMin', v)} placeholder="Min – $80,000" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input value={form.salaryMax} onChangeText={v => set('salaryMax', v)} placeholder="Max – $200,000" keyboardType="numeric" />
              </View>
            </View>

            <Btn
              label="Continue →"
              onPress={() => setStep(2)}
              disabled={!step1Valid}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            {/* Upload Zone */}
            <TouchableOpacity
              style={[
                styles.uploadZone,
                resumeState === 'done' && styles.uploadDone,
                resumeState === 'parsing' && styles.uploadParsing,
              ]}
              onPress={resumeState !== 'parsing' ? pickResume : undefined}
              activeOpacity={0.8}
            >
              {resumeState === 'idle' && (
                <>
                  <Text style={styles.uploadIcon}>📄</Text>
                  <Text style={styles.uploadTitle}>Tap to upload resume</Text>
                  <Text style={styles.uploadSub}>PDF, DOCX or TXT · Max 10 MB</Text>
                </>
              )}
              {resumeState === 'parsing' && (
                <>
                  <ActivityIndicator size="large" color={Colors.accent} />
                  <Text style={[styles.uploadTitle, { color: Colors.accent2 }]}>
                    AI is analyzing your resume…
                  </Text>
                  <Text style={styles.uploadSub}>Extracting skills, experience & more</Text>
                </>
              )}
              {resumeState === 'done' && (
                <>
                  <Text style={styles.uploadIcon}>✅</Text>
                  <Text style={[styles.uploadTitle, { color: Colors.ok }]}>Resume analyzed!</Text>
                  <Text style={styles.uploadSub}>{fileName}</Text>
                  <Text style={[styles.uploadSub, { color: Colors.accent2, marginTop: 4 }]}>
                    Tap to replace
                  </Text>
                </>
              )}
              {resumeState === 'error' && (
                <>
                  <Text style={styles.uploadIcon}>⚠️</Text>
                  <Text style={[styles.uploadTitle, { color: Colors.err }]}>Analysis failed</Text>
                  <Text style={styles.uploadSub}>Tap to try again</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Extracted Data Preview */}
            {resumeData && (
              <Card style={[styles.extractedCard, { borderColor: 'rgba(52,211,153,0.25)' }]}>
                <Text style={styles.extractedLabel}>EXTRACTED FROM RESUME</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  {resumeData.name && (
                    <View>
                      <Text style={styles.extractedKey}>Name</Text>
                      <Text style={styles.extractedVal}>{resumeData.name}</Text>
                    </View>
                  )}
                  {resumeData.currentRole && (
                    <View>
                      <Text style={styles.extractedKey}>Role</Text>
                      <Text style={styles.extractedVal}>{resumeData.currentRole}</Text>
                    </View>
                  )}
                  {resumeData.yearsExperience > 0 && (
                    <View>
                      <Text style={styles.extractedKey}>Experience</Text>
                      <Text style={styles.extractedVal}>{resumeData.yearsExperience} yrs</Text>
                    </View>
                  )}
                </View>
                <TagRow>
                  {(resumeData.skills || []).slice(0, 10).map(s => (
                    <SkillPill key={s} label={s} type="ok" />
                  ))}
                  {(resumeData.skills || []).length > 10 && (
                    <SkillPill label={`+${resumeData.skills.length - 10} more`} type="grey" />
                  )}
                </TagRow>
              </Card>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Btn label="← Back" onPress={() => setStep(1)} variant="ghost" style={{ flex: 1 }} />
              <Btn
                label={resumeData ? '🚀 Find My Matches' : 'Skip & Continue →'}
                onPress={() => onComplete({ ...form, resumeData })}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent2,
    marginBottom: 2,
  },
  brandSub: { fontSize: 11, color: Colors.muted, marginBottom: 16 },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stepBar: { height: 3, flex: 1, borderRadius: 2 },
  stepActive: { backgroundColor: Colors.accent },
  stepInactive: { backgroundColor: Colors.border },
  stepLabel: { fontSize: 12, color: Colors.muted },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
  lbl: {
    fontSize: 11, fontWeight: '500', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  picker: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  dropdown: {
    backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border2,
    borderRadius: Radius.md,
    marginBottom: 10,
  },
  dropItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropItemActive: { backgroundColor: 'rgba(108,99,255,0.15)' },
  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 40, alignItems: 'center', marginBottom: 16,
  },
  uploadDone: { borderColor: 'rgba(52,211,153,0.5)', backgroundColor: 'rgba(52,211,153,0.05)' },
  uploadParsing: { borderColor: Colors.accent, backgroundColor: 'rgba(108,99,255,0.06)' },
  uploadIcon: { fontSize: 40, marginBottom: 12 },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  uploadSub: { fontSize: 12, color: Colors.muted },
  extractedCard: { padding: 16, marginBottom: 16 },
  extractedLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  extractedKey: { fontSize: 11, color: Colors.muted },
  extractedVal: { fontSize: 13, fontWeight: '500', color: Colors.text },
});
