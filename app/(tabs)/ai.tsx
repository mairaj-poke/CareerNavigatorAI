import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, EmptyState, Field, Row, Screen, Title, theme } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { answerQuestion, welcomeMessage } from "@/services/chatbot";
import type { ChatMessage } from "@/types";
import { createId } from "@/utils/profile";

export default function AiScreen() {
  const { profile } = useApp();
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
            <Body muted>Rule-based assistant for jobs, resume, skills, interviews, and salary.</Body>
          </View>
          <Feather name="zap" size={28} color={theme.accent} />
        </Row>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={<EmptyState icon="message-circle" title="Ask your career question" text="The coach uses your saved profile, target role, skills, and resume summary." />}
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
            <Field value={input} onChangeText={setInput} placeholder="Ask about jobs, resume, skills, interview, salary" returnKeyType="send" onSubmitEditing={() => send()} />
          </View>
          <Pressable style={styles.send} onPress={() => send()}><Feather name="send" size={20} color={theme.primaryForeground} /></Pressable>
        </Row>
      </Screen>
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
  promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prompt: { backgroundColor: theme.secondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.border },
  promptText: { color: theme.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  send: { width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "86%", borderRadius: 22, padding: 14, marginVertical: 5 },
  userBubble: { alignSelf: "flex-end", backgroundColor: theme.primary },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  bubbleText: { color: theme.foreground, fontFamily: "Inter_500Medium", lineHeight: 21 },
});
