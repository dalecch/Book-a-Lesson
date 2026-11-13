import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStore } from "../data/store";
import { demoAccounts } from "../domain/demo";
import { personName } from "../domain/format";
import type { Locale, Role } from "../domain/types";
import { useI18n } from "../i18n/use-i18n";
import { AppText, Button } from "../ui/components";
import { colors, space } from "../ui/theme";

export function homeHref(role: Role): "/tutor" | "/parent" | "/student" {
  switch (role) {
    case "tutor":
      return "/tutor";
    case "parent":
      return "/parent";
    case "student":
      return "/student";
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function Screen({ title, children, showDemo = true }: { title?: string; children: ReactNode; showDemo?: boolean }) {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <TopBar title={title} showDemo={showDemo} />
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function TopBar({ title, showDemo = true }: { title?: string; showDemo?: boolean }) {
  const { user, data, setLocale, locale } = useStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const unread = data.notifications.filter((item) => item.userId === user?.id && !item.read).length;
  return (
    <View style={styles.top}>
      <View style={styles.topRow}>
        <AppText weight="bold" style={styles.brand}>
          {t.appName}
        </AppText>
        <View style={styles.tools}>
          <View style={styles.langs}>
            {(["zh-Hant", "zh-Hans", "en"] as const).map((option) => (
              <Pressable key={option} accessibilityRole="button" onPress={() => setLocale(option)} style={[styles.lang, locale === option && styles.langOn]}>
                <AppText weight={locale === option ? "bold" : "regular"}>{languageName(t, option)}</AppText>
              </Pressable>
            ))}
          </View>
          {showDemo ? (
            <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.tool}>
              <AppText>{t.switchDemo}</AppText>
            </Pressable>
          ) : null}
          {user ? (
            <Pressable accessibilityRole="button" onPress={() => router.push("/inbox")} style={styles.tool}>
              <Ionicons name="notifications-outline" size={18} color={colors.ink} />
              {unread > 0 ? <AppText weight="bold">{unread}</AppText> : null}
            </Pressable>
          ) : null}
        </View>
      </View>
      {title ? (
        <AppText weight="bold" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <DemoSheet open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const { t, locale } = useI18n();
  const choose = (userId: string, role: Role) => {
    store.loginAs(userId);
    onClose();
    router.replace(homeHref(role));
  };
  return (
    <Modal animationType="slide" transparent visible={open} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <AppText weight="bold" style={styles.title}>
            {t.switchDemo}
          </AppText>
          {store.data.users.map((user) => (
            <Button
              key={user.id}
              kind="secondary"
              label={`${roleLabel(t, user.role)} · ${personName(locale, user)}`}
              onPress={() => choose(user.id, user.role)}
            />
          ))}
          <AppText style={styles.quiet}>{t.demoPassword(demoAccounts.password)}</AppText>
          {store.user ? <Button kind="ghost" label={t.logout} onPress={() => { store.logout(); onClose(); router.replace("/"); }} /> : null}
          <Button kind="ghost" label={t.back} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function languageName(t: ReturnType<typeof useI18n>["t"], option: Locale): string {
  switch (option) {
    case "zh-Hant":
      return t.languageHant;
    case "zh-Hans":
      return t.languageHans;
    case "en":
      return t.languageEn;
    default: {
      const exhaustive: never = option;
      return exhaustive;
    }
  }
}

export function roleLabel(t: ReturnType<typeof useI18n>["t"], role: Role): string {
  switch (role) {
    case "tutor":
      return t.demoTutor;
    case "parent":
      return t.demoParent;
    case "student":
      return t.demoStudent;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function BackButton() {
  const { t } = useI18n();
  return <Button kind="ghost" label={t.back} onPress={() => router.back()} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: space.md,
    gap: space.md,
    paddingBottom: 32,
  },
  top: { gap: space.sm },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  brand: { fontSize: 22 },
  title: { fontSize: 28, lineHeight: 36 },
  tools: { flexDirection: "row", alignItems: "center", gap: 8 },
  tool: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  langs: { flexDirection: "row", borderRadius: 999, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  lang: { minHeight: 36, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  langOn: { backgroundColor: colors.tealSoft },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(28, 25, 21, 0.35)" },
  sheet: {
    backgroundColor: colors.card,
    padding: space.lg,
    gap: space.sm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  quiet: { color: colors.inkSoft },
});
