import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Body, Card, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";

const ranges: Record<string, [number, number]> = {
  developer: [5, 18],
  engineer: [6, 22],
  designer: [4, 15],
  analyst: [4, 14],
  manager: [10, 32],
  marketing: [4, 16],
  product: [8, 30],
  data: [7, 26],
};

export default function SalaryScreen() {
  const { profile, isPremium } = useApp();
  const insight = useMemo(() => {
    const role = (profile?.targetRole || "software developer").toLowerCase();
    const key = Object.keys(ranges).find((item) => role.includes(item)) || "developer";
    const [low, high] = ranges[key];
    const exp = profile?.experience || "0-2 years";
    const multiplier = exp.includes("5") || exp.includes("senior") ? 1.45 : exp.includes("3") ? 1.22 : 1;
    return { low: Math.round(low * multiplier), high: Math.round(high * multiplier), key };
  }, [profile]);

  return (
    <Screen>
      <Badge tone="accent">India market estimate</Badge>
      <Title>Salary Insights</Title>
      <Body muted>Understand fair pay ranges before applying or negotiating. Estimates are directional and based on role category, experience, and current India remote-market signals.</Body>
      <Card style={styles.hero}>
        <Body muted>{profile?.targetRole || "Target role"}</Body>
        <Text style={styles.salary}>₹{insight.low}L - ₹{insight.high}L</Text>
        <Body muted>Expected annual compensation range</Body>
      </Card>
      <Row style={{ alignItems: "stretch" }}>
        <Metric label="Entry" value={`₹${Math.max(3, insight.low - 2)}L`} />
        <Metric label="Market" value={`₹${Math.round((insight.low + insight.high) / 2)}L`} />
        <Metric label="Top" value={`₹${insight.high + 4}L`} />
      </Row>
      <Card>
        <Title small>Negotiation guidance</Title>
        <Tip icon="target" text="Use your resume match score and applied role keywords to anchor your pitch." />
        <Tip icon="trending-up" text="Ask for the full compensation band before sharing expected salary." />
        <Tip icon="shield" text="Keep a walk-away number based on your current offer pipeline." />
      </Card>
      <Card style={!isPremium && styles.locked}>
        <Row>
          <Feather name={isPremium ? "unlock" : "lock"} color={isPremium ? theme.accent : theme.warning} size={24} />
          <View style={{ flex: 1 }}>
            <Title small>Premium salary report</Title>
            <Body muted>Detailed company bands, role comparisons, and weekly market movement are available on Premium.</Body>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card style={styles.metric}><Body muted>{label}</Body><Text style={styles.metricValue}>{value}</Text></Card>;
}

function Tip({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return <Row style={{ justifyContent: "flex-start" }}><Feather name={icon} color={theme.primary} size={18} /><Body>{text}</Body></Row>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#202151", paddingVertical: 26 },
  salary: { color: theme.accent, fontFamily: "Inter_700Bold", fontSize: 38, letterSpacing: -1 },
  metric: { flex: 1, padding: 12 },
  metricValue: { color: theme.foreground, fontFamily: "Inter_700Bold", fontSize: 18 },
  locked: { opacity: 0.82 },
});
