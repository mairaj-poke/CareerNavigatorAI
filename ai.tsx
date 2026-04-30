import { Feather } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Body,
  Card,
  EmptyState,
  Field,
  Row,
  Screen,
  Title,
  theme,
} from "@/components/ui";

import { useApp } from "@/context/AppContext";
import type { ChatMessage } from "@/types";
import { fetchWithRetry } from "@/utils/api";
import { createId } from "@/utils/profile";

const prompts = [
  "Improve my resume summary",
  "Which jobs fit me best?",
  "Create an interview plan",
];

const API_BASE =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  "";

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

    try {
      // start session only once
      if (!sessionStarted.current) {
        const allowed = await startAiSession();
        if (!allowed) {
          Alert.alert(
            "AI limit reached",
            "Upgrade to Premium for unlimited coaching."
          );
          return;
        }
        sessionStarted.current = true;
      }

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [userMessage, ...prev]);
      setInput("");
      setSending(true);

      // ❌ SAFE API CHECK
      if (!API_BASE) {
        Alert.alert(
          "Backend not configured",
          "Set EXPO_PUBLIC_API_BASE_URL"
        );
        return;
      }

      // reduce payload (cost optimization)
      const history = messages.slice(0, 6).reverse();

      const response = await fetchWithRetry(
        `${API_BASE.replace(/\/$/, "")}/api/ai-career`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            profile,
            history,
          }),
        }
      );

      if (!response || !response.ok) {
        throw new Error("AI service unavailable");
      }

      const data = await response.json();

      const assistant: ChatMessage = {
        id: createId(),
        role: "assistant",
        content:
          data?.reply ||
          "I couldn't generate a response. Try again.",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [assistant, ...prev]);
    } catch (err) {
      Alert.alert(
        "AI Error",
        err instanceof Error ? err.message : "Try again later"
      );
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
            <Body muted>
              {isPremium
                ? "Unlimited sessions"
                : `${aiSessionsRemaining} sessions left`}
            </Body>
          </View>
          <Feather name="zap" size={28} color={theme.accent} />
        </Row>

        <FlatList
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="Ask your career question"
              text="Get resume, job, and interview help instantly."
            />
          }
          contentContainerStyle={{
            paddingVertical: 12,
            gap: 10,
            flexGrow: 1,
          }}
        />

        <View style={styles.promptRow}>
          {prompts.map((p) => (
            <Pressable
              key={p}
              style={styles.prompt}
              onPress={() => send(p)}
            >
              <Text style={styles.promptText}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Row>
          <View style={{ flex: 1 }}>
            <Field
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
            />
          </View>

          <Pressable
            style={[styles.send, sending && { opacity: 0.5 }]}
            onPress={() => send()}
            disabled={sending}
          >
            <Feather
              name="send"
              size={20}
              color={theme.primaryForeground}
            />
          </Pressable>
        </Row>
      </Screen>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";

  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          mine && { color: theme.primaryForeground },
        ]}
      >
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prompt: {
    backgroundColor: theme.secondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.border,
  },
  promptText: {
    color: theme.foreground,
    fontSize: 12,
  },
  send: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: 22,
    padding: 14,
    marginVertical: 5,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.primary,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleText: {
    color: theme.foreground,
  },
});