import { Feather } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import type { ChatMessage } from "@/types";
import { fetchWithRetry } from "@/utils/api";
import { createId } from "@/utils/profile";

const prompts = ["Improve my resume summary", "Which jobs fit me best?", "Create an interview plan"];

export default function AiScreen() {
  const { profile, startAiSession, aiSessionsRemaining, isPremium } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionStarted = useRef(false);
  const inFlight = useRef(false);
  const visibleMessages = useMemo(() => [...messages].reverse(), [messages]);

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    if (!sessionStarted.current) {
      const allowed = await startAiSession();
      if (!allowed) {
        Alert.alert("AI limit reached", "Free accounts include 2 AI coach sessions. Upgrade to Premium to unlock unlimited coaching, interview prep, and cover letters.");
        inFlight.current = false;
        return;
      }
      sessionStarted.current = true;
    }
    const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((prev) => [userMessage, ...prev]);
    setInput("");
    setSending(true);
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!apiBase) throw new Error("Set EXPO_PUBLIC_API_BASE_URL to your deployed backend URL for AI Coach.");
      const response = await fetchWithRetry(`${apiBase.replace(/\/$/, "")}/api/ai-career`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, profile, history: [userMessage, ...messages].slice(0, 8).reverse() }),
      });
      if (!response.ok) throw new Error("AI coach is not available right now.");
      const data = await response.json();
      const assistant: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: String(data.reply || "I could not create a useful answer. Please try again."),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [assistant, ...prev]);
    } catch (err) {
      Alert.alert("AI request failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSending(false);
      inFlight.current = false;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen scroll={false}>
        <Row>
          <View style={{ flex: 1, gap: 6 }}>
            <Badge tone="primary">Career Assistant</Badge>
            <Title>AI Coach</Title>
            <Body muted>{isPremium ? "Unlimited sessions" : `${aiSessionsRemaining} free sessions remaining`}</Body>
          </View>
          <Feather name="zap" size={28} color={theme.accent} />
        </Row>
        <Row style={{ alignItems: "stretch" }}>
          <LockedFeature title="Interview Prep" icon="mic" unlocked={isPremium} />
          <LockedFeature title="Cover Letter" icon="file-text" unlocked={isPremium} />
        </Row>
        <FlatList
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={<EmptyState icon="message-circle" title="Ask your career question" text="Your coach uses your saved profile, target role, skills, resume summary, and recent chat context." />}
          contentContainerStyle={{ paddingVertical: 12, gap: 10, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.promptRow}>
          {prompts.map((prompt) => (
            <Pressable key={prompt} style={styles.prompt} onPress={() => send(prompt)}>
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
        <Row>
          <View style={{ flex: 1 }}><Field value={input} onChangeText={setInput} placeholder="Ask for resume, jobs, salary, interviews" /></View>
          <Pressable style={[styles.send, sending && { opacity: 0.5 }]} onPress={() => send()} disabled={sending}>
            <Feather name="send" size={20} color={theme.primaryForeground} />
          </Pressable>
        </Row>
      </Screen>
    </View>
  );
}

function LockedFeature({ title, icon, unlocked }: { title: string; icon: keyof typeof Feather.glyphMap; unlocked: boolean }) {
  return (
    <Card style={styles.locked}>
      <Feather name={unlocked ? icon : "lock"} size={20} color={unlocked ? theme.accent : theme.warning} />
      <Body style={{ fontFamily: "Inter_700Bold" }}>{title}</Body>
      <Body muted style={{ fontSize: 12 }}>{unlocked ? "Unlocked" : "Premium"}</Body>
    </Card>
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
  locked: { flex: 1, padding: 14 },
  promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prompt: { backgroundColor: theme.secondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.border },
  promptText: { color: theme.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  send: { width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "86%", borderRadius: 22, padding: 14, marginVertical: 5 },
  userBubble: { alignSelf: "flex-end", backgroundColor: theme.primary },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  bubbleText: { color: theme.foreground, fontFamily: "Inter_500Medium", lineHeight: 21 },
});
