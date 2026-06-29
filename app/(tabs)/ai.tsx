import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { answerQuestion, welcomeMessage } from "@/services/chatbot";
import type { ChatMessage } from "@/types";
import { createId } from "@/utils/profile";

type Tab = "chat" | "skillgap";

export default function AiScreen() {
  const { profile, isPremium } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    setMessages([welcomeMessage(profile)]);
  }, [profile?.uid]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: createId(), role: "user", content: text, createdAt: new Date().toISOString() };
    const reply = answerQuestion(text, profile);
    setMessages((prev) => [...prev, userMessage, reply]);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant"), [messages]);
  const suggestions = lastAssistant?.suggestions || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen scroll={false}>
        <Row>
          <View style={{ flex: 1, gap: 6 }}>
            <Badge tone="primary">Career Assistant</Badge>
            <Title>AI Coach</Title>
          </View>
          <Feather name="zap" size={28} color={theme.accent} />
        </Row>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, activeTab === "chat" && styles.tabActive]} onPress={() => setActiveTab("chat")}>
            <Feather name="message-circle" size={15} color={activeTab === "chat" ? theme.primaryForeground : theme.mutedForeground} />
            <Text style={[styles.tabText, activeTab === "chat" && styles.tabTextActive]}>AI Chat</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === "skillgap" && styles.tabActive]} onPress={() => setActiveTab("skillgap")}>
            <Feather name="target" size={15} color={activeTab === "skillgap" ? theme.primaryForeground : theme.mutedForeground} />
            <Text style={[styles.tabText, activeTab === "skillgap" && styles.tabTextActive]}>Skill Gap</Text>
            {!isPremium ? <View style={styles.premiumDot} /> : null}
          </Pressable>
        </View>

        {activeTab === "chat" ? (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              ListEmptyComponent={<EmptyState icon="message-circle" title="Ask your career question" text="The coach uses your saved profile, target role, skills, and resume." />}
              contentContainerStyle={{ paddingVertical: 12, gap: 10, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
            {suggestions.length ? (
              <View style={styles.promptRow}>
                {suggestions.map((prompt) => (
                  <Pressable key={prompt} style={styles.prompt} onPress={() => send(prompt)}>
                    <Text style={styles.promptText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Row>
              <View style={{ flex: 1 }}>
                <Field value={input} onChangeText={setInput} placeholder="Ask about jobs, resume, skills, interview, salary..." returnKeyType="send" onSubmitEditing={() => send()} />
              </View>
              <Pressable style={styles.send} onPress={() => send()}>
                <Feather name="send" size={20} color={theme.primaryForeground} />
              </Pressable>
            </Row>
          </>
        ) : (
          <SkillGapAnalyzer isPremium={isPremium} resumeText={profile?.resumeText || ""} resumeSkills={profile?.skills || []} />
        )}
      </Screen>
    </View>
  );
}

function SkillGapAnalyzer({ isPremium, resumeText, resumeSkills }: { isPremium: boolean; resumeText: string; resumeSkills: string[] }) {
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<{ missingSkills: string[]; matchedSkills: string[]; matchPercent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description to analyze.");
      return;
    }
    if (!resumeText) {
      setError("Please upload your resume first from the Home tab.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      if (!apiBase) throw new Error("API not configured. Set EXPO_PUBLIC_API_BASE_URL.");
      const response = await fetch(`${apiBase}/api/skill-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      if (!response.ok) throw new Error("Skill gap analysis failed. Please try again.");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={{ flex: 1, gap: 16 }}>
        <Card style={styles.premiumLock}>
          <View style={styles.lockIcon}><Feather name="lock" size={26} color={theme.warning} /></View>
          <Title small>Resume Skill Gap Analyzer</Title>
          <Body muted style={{ textAlign: "center" }}>
            Compare your resume skills against any job description. See exactly which skills you are missing and get actionable suggestions to improve your hiring chances.
          </Body>
          <View style={styles.featureList}>
            {["Identify missing skills instantly", "See your skill match %", "Know what to learn next", "Improve interview chances"].map((f) => (
              <Row key={f} style={{ justifyContent: "flex-start", gap: 8 }}>
                <View style={styles.checkIcon}><Feather name="check" size={12} color={theme.accent} /></View>
                <Body muted>{f}</Body>
              </Row>
            ))}
          </View>
          <Button title="Upgrade to Premium · ₹499/month" icon="star" onPress={() => {}} />
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <Body muted>Paste a job description to see which skills you are missing vs. your resume.</Body>

      <Field
        label="Job Description"
        value={jobDescription}
        onChangeText={setJobDescription}
        placeholder="Paste the full job description here..."
        multiline
        style={{ minHeight: 160 }}
      />

      {error ? <Body muted style={{ color: theme.destructive }}>{error}</Body> : null}

      <Button title={loading ? "Analyzing..." : "Analyze skill gap"} icon="target" onPress={analyze} loading={loading} disabled={loading} />

      {result ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Row>
              <Title small>Skill match</Title>
              <Badge tone={result.matchPercent >= 70 ? "accent" : result.matchPercent >= 40 ? "primary" : "danger"}>
                {result.matchPercent}%
              </Badge>
            </Row>
            <View style={styles.matchBar}>
              <View style={[styles.matchFill, {
                width: `${result.matchPercent}%`,
                backgroundColor: result.matchPercent >= 70 ? theme.accent : result.matchPercent >= 40 ? theme.primary : theme.destructive,
              }]} />
            </View>
          </Card>

          {result.matchedSkills.length > 0 ? (
            <Card>
              <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                <View style={styles.checkIcon}><Feather name="check" size={14} color={theme.accent} /></View>
                <Title small>Skills you have ({result.matchedSkills.length})</Title>
              </Row>
              <View style={styles.tags}>
                {result.matchedSkills.map((s) => <Badge key={s} tone="accent">{s}</Badge>)}
              </View>
            </Card>
          ) : null}

          {result.missingSkills.length > 0 ? (
            <Card>
              <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                <View style={styles.warnIcon}><Feather name="alert-circle" size={14} color={theme.warning} /></View>
                <Title small>Missing skills ({result.missingSkills.length})</Title>
              </Row>
              <Body muted>Focus on learning these to improve your chances:</Body>
              <View style={styles.tags}>
                {result.missingSkills.map((s) => <Badge key={s} tone="danger">{s}</Badge>)}
              </View>
            </Card>
          ) : (
            <Card>
              <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                <Feather name="award" size={20} color={theme.accent} />
                <Body>Your resume covers all detected skills for this role!</Body>
              </Row>
            </Card>
          )}
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  return (
    <View style={[styles.bubble, mine ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.bubbleText, mine && { color: theme.primaryForeground }]}>{message.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: "row", backgroundColor: theme.secondary, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: theme.border },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 13 },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 13 },
  tabTextActive: { color: theme.primaryForeground },
  premiumDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.warning },
  promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prompt: { backgroundColor: theme.secondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.border },
  promptText: { color: theme.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  send: { width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "86%", borderRadius: 22, padding: 14, marginVertical: 5 },
  userBubble: { alignSelf: "flex-end", backgroundColor: theme.primary },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  bubbleText: { color: theme.foreground, fontFamily: "Inter_500Medium", lineHeight: 21 },
  premiumLock: { alignItems: "center", gap: 14 },
  lockIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,193,7,0.14)", alignItems: "center", justifyContent: "center" },
  featureList: { width: "100%", gap: 8 },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(67,233,123,0.14)", alignItems: "center", justifyContent: "center" },
  warnIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,193,7,0.14)", alignItems: "center", justifyContent: "center" },
  matchBar: { height: 10, borderRadius: 999, backgroundColor: theme.input, overflow: "hidden" },
  matchFill: { height: "100%", borderRadius: 999 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
