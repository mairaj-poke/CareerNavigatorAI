import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Score Ring ────────────────────────────────────────────────────────────
export const ScoreRing = ({ score, size = 64 }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 88 ? Colors.ok : score >= 72 ? Colors.warn : Colors.err;

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Svg width={size} height={size} viewBox="0 0 70 70" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <Circle
          cx="35" cy="35" r={r} fill="none" stroke={color}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
        <SvgText
          x="35" y="40" textAnchor="middle" fill={color}
          fontSize="13" fontWeight="700"
          style={{ transform: [{ rotate: '90deg' }] }}
        >
          {score}%
        </SvgText>
      </Svg>
      <Text style={{ fontSize: 10, color: Colors.muted }}>Match</Text>
    </View>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────
export const Card = ({ children, style, onPress }) => {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, style]}
    >
      {children}
    </Comp>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────
export const Badge = ({ label, variant = 'grey', style }) => {
  const variants = {
    blue: { bg: 'rgba(56,189,248,0.14)', color: Colors.accent3, border: 'rgba(56,189,248,0.25)' },
    violet: { bg: 'rgba(167,139,250,0.14)', color: Colors.accent2, border: 'rgba(167,139,250,0.25)' },
    green: { bg: 'rgba(52,211,153,0.14)', color: Colors.ok, border: 'rgba(52,211,153,0.25)' },
    amber: { bg: 'rgba(251,191,36,0.14)', color: Colors.warn, border: 'rgba(251,191,36,0.25)' },
    red: { bg: 'rgba(248,113,113,0.14)', color: Colors.err, border: 'rgba(248,113,113,0.25)' },
    grey: { bg: 'rgba(255,255,255,0.07)', color: Colors.muted, border: Colors.border },
  };
  const v = variants[variant] || variants.grey;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: v.color }}>{label}</Text>
    </View>
  );
};

// ── SkillPill ─────────────────────────────────────────────────────────────
export const SkillPill = ({ label, type = 'grey' }) => {
  const configs = {
    ok: { bg: 'rgba(52,211,153,0.12)', color: Colors.ok, border: 'rgba(52,211,153,0.28)' },
    no: { bg: 'rgba(248,113,113,0.1)', color: Colors.err, border: 'rgba(248,113,113,0.22)' },
    grey: { bg: 'rgba(255,255,255,0.07)', color: Colors.muted, border: Colors.border },
  };
  const c = configs[type] || configs.grey;
  return (
    <View style={[styles.skillPill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: c.color }}>{label}</Text>
    </View>
  );
};

// ── Button ────────────────────────────────────────────────────────────────
export const Btn = ({ label, onPress, variant = 'primary', icon, disabled, style, small }) => {
  const variants = {
    primary: { bg: null, gradient: true, textColor: Colors.white },
    ghost: { bg: 'rgba(255,255,255,0.05)', border: Colors.border, textColor: Colors.text },
    outline: { bg: 'transparent', border: Colors.accent, textColor: Colors.accent2 },
    danger: { bg: 'rgba(248,113,113,0.12)', border: Colors.err, textColor: Colors.err },
  };
  const v = variants[variant] || variants.primary;
  const pad = small ? { paddingHorizontal: 12, paddingVertical: 7 } : { paddingHorizontal: 18, paddingVertical: 10 };
  const fontSize = small ? 12 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        pad,
        v.gradient ? styles.btnGradient : { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        disabled ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      {icon && <Text style={{ fontSize: fontSize + 2, marginRight: 5 }}>{icon}</Text>}
      <Text style={{ fontSize, fontWeight: '600', color: v.textColor }}>{label}</Text>
    </TouchableOpacity>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────
export const Input = ({ label, value, onChangeText, placeholder, keyboardType, multiline, style, inputStyle }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }, inputStyle]}
    />
  </View>
);

// ── Section Header ────────────────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, right }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

// ── Loading State ─────────────────────────────────────────────────────────
export const LoadingCard = ({ message }) => (
  <Card style={{ padding: 40, alignItems: 'center', gap: 16 }}>
    <ActivityIndicator size="large" color={Colors.accent} />
    <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center' }}>{message}</Text>
  </Card>
);

// ── Empty State ───────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle, action, actionLabel }) => (
  <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
    <Text style={{ fontSize: 52, marginBottom: 14 }}>{icon}</Text>
    <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8, textAlign: 'center' }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>{subtitle}</Text>}
    {action && <Btn label={actionLabel || 'Action'} onPress={action} />}
  </View>
);

// ── Back Button ───────────────────────────────────────────────────────────
export const BackButton = ({ onPress, label = 'Back' }) => (
  <TouchableOpacity onPress={onPress} style={styles.backBtn} activeOpacity={0.7}>
    <Text style={styles.backBtnText}>← {label}</Text>
  </TouchableOpacity>
);

// ── No Resume Prompt ──────────────────────────────────────────────────────
export const NoResumePrompt = ({ onUpload }) => (
  <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
    <Text style={{ fontSize: 52, marginBottom: 14 }}>📋</Text>
    <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8, textAlign: 'center' }}>
      Upload your resume
    </Text>
    <Text style={{ fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
      AI will analyze your resume and show how well your skills match each job, plus personalized insights.
    </Text>
    <Btn label="📄 Upload Resume" onPress={onUpload} />
  </View>
);

// ── Divider ───────────────────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md }, style]} />
);

// ── Tag Row ───────────────────────────────────────────────────────────────
export const TagRow = ({ children }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
    {children}
  </View>
);

// ── Progress Bar ──────────────────────────────────────────────────────────
export const ProgressBar = ({ value, color, style }) => (
  <View style={[{ height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' }, style]}>
    <View style={{ height: '100%', width: `${value}%`, backgroundColor: color || Colors.accent, borderRadius: 3 }} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  skillPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    margin: 2,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  btnGradient: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: Typography.sm,
    color: Colors.muted,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  backBtnText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
});
