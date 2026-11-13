import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from "react-native";

import { useStore } from "../data/store";
import type { Locale } from "../domain/types";
import { colors, space } from "./theme";
import { useFontFamilies } from "./fonts";

function fontFamilyFor(locale: Locale, weight: "regular" | "bold", fonts: ReturnType<typeof useFontFamilies>): string | undefined {
  switch (locale) {
    case "zh-Hans":
      return weight === "bold" ? fonts.hansBold : fonts.hansRegular;
    case "en":
    case "zh-Hant":
      return weight === "bold" ? fonts.bold : fonts.regular;
    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export function AppText({
  weight = "regular",
  style,
  ...props
}: TextProps & { weight?: "regular" | "bold" }) {
  const fonts = useFontFamilies();
  const { locale } = useStore();
  return <Text {...props} style={[{ color: colors.ink, fontFamily: fontFamilyFor(locale, weight, fonts), fontSize: 16 }, style]} />;
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === "primary" && styles.primary,
        kind === "secondary" && styles.secondary,
        kind === "danger" && styles.danger,
        kind === "ghost" && styles.ghost,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <AppText
        weight="bold"
        style={{
          color: kind === "primary" || kind === "danger" ? colors.white : colors.tealDark,
          textAlign: "center",
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "teal" | "amber" | "red" | "green" }) {
  return (
    <View
      style={[
        styles.pill,
        tone === "teal" && { backgroundColor: colors.tealSoft },
        tone === "amber" && { backgroundColor: colors.amberSoft },
        tone === "red" && { backgroundColor: colors.redSoft },
        tone === "green" && { backgroundColor: colors.greenSoft },
      ]}
    >
      <AppText style={styles.pillText}>{label}</AppText>
    </View>
  );
}

export function Field({
  label,
  ...input
}: { label: string } & TextInputProps) {
  const fonts = useFontFamilies();
  const { locale } = useStore();
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        placeholderTextColor={colors.inkSoft}
        {...input}
        style={[styles.input, { fontFamily: fontFamilyFor(locale, "regular", fonts), color: colors.ink }, input.style]}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, selected && styles.segmentOn]}
          >
            <AppText weight={selected ? "bold" : "regular"} style={{ color: selected ? colors.tealDark : colors.inkSoft, textAlign: "center" }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "red" | "teal" }) {
  return (
    <View
      style={[
        styles.banner,
        tone === "amber" && { backgroundColor: colors.amberSoft },
        tone === "red" && { backgroundColor: colors.redSoft },
        tone === "teal" && { backgroundColor: colors.tealSoft },
      ]}
    >
      <AppText>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.tealSoft },
  danger: { backgroundColor: colors.red },
  ghost: { backgroundColor: "transparent" },
  pressed: { opacity: 0.72 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.paper,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 13 },
  field: { gap: 6 },
  label: { color: colors.inkSoft, fontSize: 13 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  segment: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentItem: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  segmentOn: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  banner: {
    borderRadius: 14,
    padding: space.md,
  },
});
