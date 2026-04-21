import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { PropsWithChildren } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";

const c = colors.dark;

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottom = Platform.OS === "web" ? 34 : insets.bottom;
  const Container: any = scroll ? require("react-native").ScrollView : View;
  return (
    <Container
      style={styles.screen}
      contentContainerStyle={scroll ? [styles.screenContent, { paddingTop: top + 18, paddingBottom: bottom + 118 }] : undefined}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {!scroll ? <View style={[styles.screenContent, { paddingTop: top + 18, paddingBottom: bottom + 100, flex: 1 }]}>{children}</View> : children}
    </Container>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Title({ children, small = false }: PropsWithChildren<{ small?: boolean }>) {
  return <Text style={small ? styles.titleSmall : styles.title}>{children}</Text>;
}

export function Body({ children, muted = false, style }: PropsWithChildren<{ muted?: boolean; style?: any }>) {
  return <Text style={[styles.body, muted && styles.muted, style]}>{children}</Text>;
}

export function Badge({ children, tone = "primary" }: PropsWithChildren<{ tone?: "primary" | "accent" | "danger" | "muted" }>) {
  const bg = tone === "accent" ? "rgba(67,233,123,0.14)" : tone === "danger" ? "rgba(255,101,132,0.14)" : tone === "muted" ? c.muted : "rgba(108,99,255,0.16)";
  const color = tone === "accent" ? c.accent : tone === "danger" ? c.destructive : tone === "muted" ? c.mutedForeground : c.primary;
  return <Text style={[styles.badge, { backgroundColor: bg, color }]}>{children}</Text>;
}

export function Button({ title, onPress, icon, variant = "primary", disabled, loading }: { title: string; onPress: () => void; icon?: keyof typeof Feather.glyphMap; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; loading?: boolean }) {
  const bg = variant === "primary" ? c.primary : variant === "danger" ? c.destructive : variant === "secondary" ? c.secondary : "transparent";
  const textColor = variant === "ghost" ? c.primary : c.primaryForeground;
  return (
    <Pressable
      onPress={() => {
        if (!disabled && !loading) {
          Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.78 : 1, borderColor: variant === "ghost" ? c.border : bg }]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : icon ? <Feather name={icon} size={18} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={c.mutedForeground}
        style={[styles.input, props.multiline && styles.inputTall, props.style]}
      />
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: keyof typeof Feather.glyphMap; title: string; text: string; action?: React.ReactNode }) {
  return (
    <Card style={styles.empty}>
      <View style={styles.iconCircle}><Feather name={icon} size={26} color={c.primary} /></View>
      <Title small>{title}</Title>
      <Body muted style={{ textAlign: "center" }}>{text}</Body>
      {action}
    </Card>
  );
}

export const theme = c;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  screenContent: { paddingHorizontal: 18, gap: 16 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius + 4, padding: 18, gap: 12, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: c.foreground, fontSize: 30, lineHeight: 35, fontFamily: "Inter_700Bold" },
  titleSmall: { color: c.foreground, fontSize: 19, lineHeight: 24, fontFamily: "Inter_700Bold" },
  body: { color: c.foreground, fontSize: 15, lineHeight: 21, fontFamily: "Inter_400Regular" },
  muted: { color: c.mutedForeground },
  button: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, flexDirection: "row", gap: 8, borderWidth: 1 },
  buttonText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  input: { minHeight: 52, borderRadius: 16, backgroundColor: c.input, borderWidth: 1, borderColor: c.border, color: c.foreground, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  inputTall: { minHeight: 116, paddingTop: 14, textAlignVertical: "top" },
  label: { color: c.mutedForeground, fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  badge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  iconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(108,99,255,0.14)", alignItems: "center", justifyContent: "center" },
});
